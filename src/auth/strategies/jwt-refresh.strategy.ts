// src/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../encryption/encryption.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not defined. Please set it in your environment variables.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      secretOrKey: secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string }) {
    const rawToken: string | undefined = req.cookies?.['refresh_token'];

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const account = await this.prisma.account.findFirst({
      where: { user_id: payload.sub, provider: 'local' },
    });

    if (!account?.refresh_token_hash) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    if (!account?.refresh_token_hash) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const isValid = this.encryption.compareHash(
      rawToken,
      account.refresh_token_hash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return { id: payload.sub };
  }
}