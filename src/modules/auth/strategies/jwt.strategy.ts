import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      // Hàm tùy chỉnh để trích xuất token từ cookie
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_tokn;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET, // Thay bằng secret key của bạn
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.authService.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    // Xóa password khỏi đối tượng user trả về
    return user;
  }
}
