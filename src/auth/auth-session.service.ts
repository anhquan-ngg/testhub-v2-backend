import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthSession, Prisma, UserRole } from '@prisma/client';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { sessionDuration } from './session-duration';
import type { Socket } from 'socket.io';

type SessionUser = { id: string; email: string; role: UserRole };
export type SessionClaims = {
  sub: string;
  sid: string;
  token_use: 'access' | 'refresh' | 'transfer';
  exp?: number;
  role?: string;
};
export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
  refreshMaxAge: number;
};
export type LoginSessionResult =
  | { tokens: SessionTokens }
  | { transferToken: string; approvalRequired: boolean };

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) {}

  private async lock(tx: Prisma.TransactionClient, userId: string) {
    // Every student exam mutation and session transition takes this same row lock.
    const users = await tx.$queryRaw<
      SessionUser[]
    >`SELECT id, email, role FROM users WHERE id = ${userId}::uuid AND status = 'ACTIVE' FOR NO KEY UPDATE`;
    if (!users[0]) throw new UnauthorizedException('Account is not active');
    return users[0];
  }

  private activeExams(tx: Prisma.TransactionClient, userId: string) {
    return tx.submission.findMany({
      where: { student_id: userId, status: 'IN_PROGRESS', is_deleted: false },
      select: { exam_id: true, exam: { select: { lecturer_id: true } } },
    });
  }

  private matches(token: string, hash: string | null) {
    if (!hash) return false;
    const actual = Buffer.from(this.encryption.hashToken(token));
    const expected = Buffer.from(hash);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private refreshToken(
    session: Pick<
      AuthSession,
      'id' | 'refresh_jti' | 'refresh_issued_at' | 'expires_at'
    >,
    user: SessionUser,
    tokenUse: 'refresh' | 'transfer' = 'refresh',
  ) {
    return this.jwt.signAsync(
      {
        sub: user.id,
        sid: session.id,
        token_use: tokenUse,
        jti: session.refresh_jti,
        iat: session.refresh_issued_at,
        exp: Math.floor(session.expires_at.getTime() / 1000),
      },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
    );
  }

  private async tokens(
    session: AuthSession,
    user: SessionUser,
  ): Promise<SessionTokens> {
    const remaining = Math.max(
      0,
      Math.floor((session.expires_at.getTime() - Date.now()) / 1000),
    );
    const accessSeconds = Math.min(
      sessionDuration(this.config, 'JWT_ACCESS_EXPIRES', '15m'),
      remaining,
    );
    if (accessSeconds <= 0) throw new UnauthorizedException('Session expired');
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        sid: session.id,
        token_use: 'access',
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessSeconds,
      },
    );
    return {
      accessToken,
      refreshToken: await this.refreshToken(session, user),
      accessMaxAge: accessSeconds * 1000,
      refreshMaxAge: remaining * 1000,
    };
  }

  /** Creates a session or a credential-authenticated transfer request without revoking the old session. */
  async login(
    userId: string,
    currentSessionId?: string,
  ): Promise<LoginSessionResult> {
    return this.prisma.$transaction(async (tx) => {
      const user = await this.lock(tx, userId);
      const now = new Date();
      // Resume only a cryptographically verified, active session from this browser.
      const own = currentSessionId
        ? await tx.authSession.findFirst({
            where: {
              id: currentSessionId,
              user_id: userId,
              status: 'ACTIVE',
              expires_at: { gt: now },
            },
          })
        : null;
      if (own) return { tokens: await this.tokens(own, user) };
      const previous = await tx.authSession.findUnique({
        where: { student_slot: userId },
      });
      const exams =
        user.role === 'STUDENT' ? await this.activeExams(tx, userId) : [];
      const pending =
        user.role === 'STUDENT' &&
        ((previous && previous.expires_at > now) || exams.length > 0);
      if (previous && previous.expires_at <= now) {
        await tx.authSession.update({
          where: { id: previous.id },
          data: { status: 'REVOKED', student_slot: null, revoked_at: now },
        });
      }
      const session = {
        id: randomUUID(),
        user_id: userId,
        status: pending ? 'PENDING' : 'ACTIVE',
        student_slot: user.role === 'STUDENT' && !pending ? userId : null,
        expires_at: new Date(
          now.getTime() +
            (pending
              ? 600
              : sessionDuration(this.config, 'JWT_REFRESH_EXPIRES', '7d')) *
              1000,
        ),
        refresh_jti: randomUUID(),
        refresh_issued_at: Math.floor(now.getTime() / 1000),
        previous_session_id:
          previous && previous.expires_at > now ? previous.id : null,
        approval_required: exams.length > 0,
      };
      // Bound credential-authenticated pending requests per user.
      await tx.authSession.updateMany({
        where: { user_id: userId, status: 'PENDING' },
        data: { status: 'REVOKED', revoked_at: now },
      });
      const token = await this.refreshToken(
        session,
        user,
        pending ? 'transfer' : 'refresh',
      );
      const created = await tx.authSession.create({
        data: {
          ...session,
          refresh_token_hash: this.encryption.hashToken(token),
        },
      });
      return pending
        ? { transferToken: token, approvalRequired: session.approval_required }
        : { tokens: await this.tokens(created, user) };
    });
  }

  /** Validates access claims against an active, unexpired database session. */
  async assertActive(
    payload: SessionClaims,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    if (!payload?.sid || payload.token_use !== 'access')
      throw new UnauthorizedException('Login required');
    const session = await tx.authSession.findFirst({
      where: {
        id: payload.sid,
        user_id: payload.sub,
        status: 'ACTIVE',
        expires_at: { gt: new Date() },
        user: { status: 'ACTIVE' },
      },
      include: { user: { select: { role: true } } },
    });
    if (
      !session ||
      (session.user.role === 'STUDENT' && session.student_slot !== payload.sub)
    )
      throw new UnauthorizedException('Session revoked');
    return session;
  }

  /** Authenticates access cookies/tokens for realtime transports. */
  async authenticate(token: string): Promise<SessionClaims> {
    const payload = await this.jwt.verifyAsync<SessionClaims>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
    const session = await this.assertActive(payload);
    return { ...payload, role: session.user.role };
  }

  /** Authenticates a realtime connection and disconnects sessions revoked elsewhere. */
  async bindSocket(client: Socket) {
    const cookie = client.handshake.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('access_token='))
      ?.slice('access_token='.length);
    const token: unknown = client.handshake.auth?.token ?? cookie;
    if (typeof token !== 'string') throw new UnauthorizedException();
    const claims = await this.authenticate(token);
    if (client.disconnected) throw new UnauthorizedException();
    (client.data as { sessionClaims?: SessionClaims }).sessionClaims = claims;
    const timer = setInterval(() => {
      void this.assertActive(claims).catch(() => client.disconnect(true));
    }, 5000);
    timer.unref();
    client.once('disconnect', () => clearInterval(timer));
    return claims;
  }

  /** Serializes a student mutation with transfers and uses one transaction for all its database writes. */
  async runStudentMutation<T>(
    userId: string,
    sessionId: string,
    action: () => Promise<T>,
  ): Promise<T> {
    let transaction: Prisma.TransactionClient | undefined;
    let result: T;
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          transaction = tx;
          await this.lock(tx, userId);
          await this.assertActive(
            { sub: userId, sid: sessionId, token_use: 'access' },
            tx,
          );
          return this.prisma.withTransaction(tx, action);
        },
        { timeout: 30000 },
      );
    } catch (error) {
      if (transaction) await this.prisma.finishEffects(transaction, false);
      throw error;
    }
    if (transaction) await this.prisma.finishEffects(transaction, true);
    return result;
  }

  /** Rotates refresh tokens; parallel requests in the grace window reuse the exact successor. */
  async refresh(
    payload: SessionClaims,
    rawToken: string,
  ): Promise<SessionTokens> {
    if (!payload.sid || payload.token_use !== 'refresh')
      throw new UnauthorizedException('Invalid refresh token');
    return this.prisma.$transaction(async (tx) => {
      const user = await this.lock(tx, payload.sub);
      const now = new Date();
      let session = await tx.authSession.findFirst({
        where: {
          id: payload.sid,
          user_id: payload.sub,
          status: 'ACTIVE',
          expires_at: { gt: now },
        },
      });
      if (
        !session ||
        (user.role === 'STUDENT' && session.student_slot !== user.id)
      )
        throw new UnauthorizedException('Session revoked');
      const current = this.matches(rawToken, session.refresh_token_hash);
      const inGrace =
        session.previous_valid_until && session.previous_valid_until > now;
      if (
        !current &&
        !(inGrace && this.matches(rawToken, session.previous_refresh_hash))
      )
        throw new UnauthorizedException('Invalid refresh token');
      if (current && !inGrace) {
        const grace = Number(
          this.config.get('AUTH_REFRESH_GRACE_SECONDS') ?? 10,
        );
        if (!Number.isInteger(grace) || grace < 1 || grace > 30)
          throw new Error('AUTH_REFRESH_GRACE_SECONDS must be 1..30');
        const updated = {
          ...session,
          refresh_jti: randomUUID(),
          refresh_issued_at: Math.floor(now.getTime() / 1000),
        };
        const next = await this.refreshToken(updated, user);
        session = await tx.authSession.update({
          where: { id: session.id },
          data: {
            refresh_jti: updated.refresh_jti,
            refresh_issued_at: updated.refresh_issued_at,
            previous_refresh_hash: session.refresh_token_hash,
            previous_valid_until: new Date(now.getTime() + grace * 1000),
            refresh_token_hash: this.encryption.hashToken(next),
          },
        });
      }
      return this.tokens(session, user);
    });
  }

  /** Revokes only the caller's browser session. */
  async logout(userId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId);
      await tx.authSession.updateMany({
        where: { id: sessionId, user_id: userId, status: 'ACTIVE' },
        data: { status: 'REVOKED', student_slot: null, revoked_at: new Date() },
      });
    });
  }

  private async transfer(
    raw: string,
    tx: Prisma.TransactionClient,
    allowCompleted = false,
  ) {
    let claims: SessionClaims;
    try {
      claims = await this.jwt.verifyAsync<SessionClaims>(raw, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Transfer expired');
    }
    if (claims.token_use !== 'transfer' || !claims.sid)
      throw new UnauthorizedException('Invalid transfer');
    const request = await tx.authSession.findFirst({
      where: {
        id: claims.sid,
        user_id: claims.sub,
        status: allowCompleted ? { in: ['PENDING', 'ACTIVE'] } : 'PENDING',
        expires_at: { gt: new Date() },
        user: { role: 'STUDENT', status: 'ACTIVE' },
      },
    });
    if (
      !request ||
      !this.matches(
        raw,
        request.status === 'ACTIVE'
          ? request.transfer_token_hash
          : request.refresh_token_hash,
      )
    )
      throw new UnauthorizedException('Transfer expired');
    return request;
  }

  /** Returns only the pending browser's confirmation state, never tokens or account details. */
  async transferStatus(raw: string) {
    const request = await this.transfer(raw, this.prisma, true);
    const exams = await this.activeExams(this.prisma, request.user_id);
    return {
      status:
        request.status === 'ACTIVE' || request.approved_by
          ? 'APPROVED'
          : 'PENDING',
      approvalRequired: exams.length > 0,
      expiresAt: request.expires_at.toISOString(),
    };
  }

  private async authorizeApproval(
    tx: Prisma.TransactionClient,
    userId: string,
    actorId: string,
  ) {
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    const exams = await this.activeExams(tx, userId);
    if (
      !actor ||
      actor.status !== 'ACTIVE' ||
      !['ADMIN', 'LECTURER'].includes(actor.role) ||
      (actor.role === 'LECTURER' &&
        (exams.length === 0 ||
          exams.some((exam) => exam.exam.lecturer_id !== actorId)))
    ) {
      throw new ForbiddenException(
        'Only the responsible lecturer or admin can approve',
      );
    }
  }

  /** Confirms a browser switch; an ongoing exam always requires valid staff approval. */
  async completeTransfer(raw: string): Promise<SessionTokens> {
    const candidate = await this.transfer(raw, this.prisma, true);
    return this.prisma.$transaction(async (tx) => {
      const user = await this.lock(tx, candidate.user_id);
      const request = await this.transfer(raw, tx, true);
      // A lost HTTP response must not require a second approval or revoke another session.
      if (request.status === 'ACTIVE' && request.student_slot === user.id)
        return this.tokens(request, user);
      const current = await tx.authSession.findUnique({
        where: { student_slot: user.id },
      });
      if ((current?.id ?? null) !== request.previous_session_id)
        throw new ConflictException('Transfer is stale; sign in again');
      const exams = await this.activeExams(tx, user.id);
      if (exams.length > 0) {
        if (!request.approved_by)
          throw new ForbiddenException('Exam transfer requires staff approval');
        await this.authorizeApproval(tx, user.id, request.approved_by);
      }
      await tx.authSession.updateMany({
        where: { user_id: user.id, status: 'ACTIVE' },
        data: { status: 'REVOKED', student_slot: null, revoked_at: new Date() },
      });
      const values = {
        ...request,
        status: 'ACTIVE',
        student_slot: user.id,
        expires_at: new Date(
          Date.now() +
            sessionDuration(this.config, 'JWT_REFRESH_EXPIRES', '7d') * 1000,
        ),
        refresh_jti: randomUUID(),
        refresh_issued_at: Math.floor(Date.now() / 1000),
      };
      const token = await this.refreshToken(values, user);
      const active = await tx.authSession.update({
        where: { id: request.id },
        data: {
          status: values.status,
          student_slot: values.student_slot,
          expires_at: values.expires_at,
          refresh_jti: values.refresh_jti,
          refresh_issued_at: values.refresh_issued_at,
          refresh_token_hash: this.encryption.hashToken(token),
          transfer_token_hash: request.refresh_token_hash,
        },
      });
      return this.tokens(active, user);
    });
  }

  /** Lists pending requests visible to the responsible lecturer or an admin. */
  async pendingTransfers(actorId: string, examId?: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (
      !actor ||
      actor.status !== 'ACTIVE' ||
      !['ADMIN', 'LECTURER'].includes(actor.role)
    )
      throw new ForbiddenException();
    return this.prisma.authSession.findMany({
      where: {
        status: 'PENDING',
        expires_at: { gt: new Date() },
        user: {
          submissions: {
            some: {
              status: 'IN_PROGRESS',
              is_deleted: false,
              ...(examId ? { exam_id: examId } : {}),
              ...(actor.role === 'LECTURER'
                ? { exam: { lecturer_id: actorId } }
                : {}),
            },
          },
        },
      },
      select: {
        id: true,
        created_at: true,
        expires_at: true,
        approved_at: true,
        user: { select: { id: true, full_name: true } },
      },
      orderBy: { created_at: 'asc' },
      take: 50,
    });
  }

  /** Records scoped staff approval; only the requesting browser can consume it. */
  async approveTransfer(id: string, actorId: string) {
    const candidate = await this.prisma.authSession.findUnique({
      where: { id },
    });
    if (!candidate) throw new ForbiddenException();
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, candidate.user_id);
      await this.authorizeApproval(tx, candidate.user_id, actorId);
      const result = await tx.authSession.updateMany({
        where: { id, status: 'PENDING', expires_at: { gt: new Date() } },
        data: { approved_by: actorId, approved_at: new Date() },
      });
      if (!result.count) throw new ConflictException('Transfer expired');
      return { message: 'Transfer approved' };
    });
  }
}
