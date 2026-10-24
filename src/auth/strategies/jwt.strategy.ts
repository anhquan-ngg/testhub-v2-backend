import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthSessionService, SessionClaims } from '../auth-session.service';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private readonly sessions: AuthSessionService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new Error(
        'JWT_ACCESS_SECRET is not defined. Please set JWT_ACCESS_SECRET in your environment variables.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token: unknown = request?.cookies?.access_token;
          return typeof token === 'string' ? token : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: SessionClaims) {
    await this.sessions.assertActive(payload);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        full_name: true,
        email: true,
        school: true,
        phone: true,
        address: true,
        role: true,
        status: true,
        files: {
          where: {
            entity_type: 'users',
            entity_id: payload.sub,
            status: {
              in: ['ACTIVE', 'EXTERNAL'],
            },
          },
          orderBy: { uploaded_at: 'desc' },
          take: 1,
          select: {
            url: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const { files, ...userWithoutFiles } = user;

    return {
      ...userWithoutFiles,
      avatar_url: files[0]?.url,
      session_id: payload.sid,
    };
  }
}
