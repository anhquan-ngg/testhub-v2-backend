import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error(
        'JWT_SECRET is not defined. Please set JWT_SECRET in your environment variables.',
      );
    }

    super({
      // Hàm tùy chỉnh để trích xuất token từ cookie hoặc header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Ưu tiên lấy từ cookie
          try {
            return request?.cookies?.testhub_token || null;
          } catch {
            return null;
          }
        },
        // Fallback: lấy từ Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    // Sử dụng PrismaService trực tiếp thay vì AuthService (REQUEST scope)
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        role: true,
        auth_provider: true,
        created_at: true,
        updated_at: true,
        // Không select password
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
