import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { SessionClaims } from '../auth-session.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        const token: unknown = req?.cookies?.refresh_token;
        return typeof token === 'string' ? token : null;
      },
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: SessionClaims) {
    const token: unknown = req.cookies?.refresh_token;
    if (
      !payload.sid ||
      payload.token_use !== 'refresh' ||
      typeof token !== 'string'
    )
      throw new UnauthorizedException();
    return {
      id: payload.sub,
      session_id: payload.sid,
      refresh_claims: payload,
      refresh_token: token,
    };
  }
}
