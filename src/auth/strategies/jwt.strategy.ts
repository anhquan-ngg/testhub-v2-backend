import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new Error(
        'JWT_ACCESS_SECRET is not defined. Please set JWT_ACCESS_SECRET in your environment variables.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.['access_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
        files: {
          where: {
            entity_type: 'users',
            entity_id: payload.sub,
            status: 'AVAILABLE',
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

    return { ...userWithoutFiles, avatar_url: files[0]?.url };
  }
}
