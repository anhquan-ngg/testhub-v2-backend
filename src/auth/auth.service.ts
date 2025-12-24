import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ENHANCED_PRISMA } from '@zenstackhq/server/nestjs';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  INTERNAL_PRISMA_CLIENT,
  POLICY_AWARE_PRISMA_CLIENT,
} from '@/prisma/prisma.module';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

type EnhancedPrismaClient = Omit<
  PrismaClient,
  | '$use'
  | '$on'
  | '$connect'
  | '$disconnect'
  | '$executeRaw'
  | '$queryRaw'
  | '$transaction'
  | '$extends'
>;

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    // @Inject(ENHANCED_PRISMA) private readonly prismaService: PrismaService,
    private readonly prismaService: PrismaService,

    // 1. Inject INTERNAL_PRISMA_CLIENT
    // Dùng cho các tác vụ hệ thống, không bị ràng buộc bởi policy.
    @Inject(INTERNAL_PRISMA_CLIENT)
    private readonly internalPrisma: EnhancedPrismaClient,

    // 2. Inject POLICY_AWARE_PRISMA_CLIENT
    // Client này là REQUEST-SCOPED, sẽ có context của user hiện tại.
    // NestJS sẽ tự động cung cấp instance đúng cho mỗi request.
    @Inject(POLICY_AWARE_PRISMA_CLIENT)
    private readonly policyAwarePrisma: EnhancedPrismaClient,

    private jwtService: JwtService,
  ) {}

  async validateOAuthTokenUser(payload: { token: string }): Promise<any> {
    const { token } = payload;

    if (!token) {
      this.logger.warn('validateOAuthUser: No token provided.');
      return null;
    }

    try {
      const decoded = await this.jwtService.verifyAsync(token);

      if (!decoded || !decoded.sub) {
        this.logger.warn(
          `validateOAuthUser: Invalide token payload for token: ${token}`,
        );
        return null;
      }

      const user = await this.internalPrisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) {
        this.logger.warn(
          `validateOAuthUser: User with ID ${decoded.sub} not found or inactive.`,
        );
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(
        `validateOAuthUser: Token validation error: ${error.message}`,
      );
      // Ném lỗi UnauthorizedException để NestJS có thể bắt và xử lý
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  async signup(signupDto: SignupDto): Promise<{ message: string }> {
    const existingUser = await this.internalPrisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }

    try {
      const user = await this.internalPrisma.user.create({
        data: {
          full_name: signupDto.full_name,
          email: signupDto.email,
          password: signupDto.password,
        },
      });
      console.log('User: ', user);
    } catch (error) {
      console.error('Signup unsuccessfully');
    }

    return {
      message: 'Signup successfully',
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ access_token: string; data: any }> {
    const user = await this.internalPrisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordMatch)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const payload = { sub: user.id, email: user.email, role: user.role };

    const userProfile = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
    };

    console.log('User login: ', user);
    return {
      access_token: await this.jwtService.signAsync(payload),
      data: userProfile,
    };
  }

  async googleLogin(loginDto: GoogleLoginDto) {
    let userProfile;

    if (loginDto.code) {
      // Exchange code for tokens
      try {
        const tokenResponse = await fetch(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code: loginDto.code || '',
              client_id: process.env.GOOGLE_CLIENT_ID || '',
              client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
              redirect_uri:
                process.env.GOOGLE_CALLBACK_URL ||
                'http://localhost:3000/auth/callback',
              grant_type: 'authorization_code',
            }),
          },
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          this.logger.error(
            `Google Token Exchange failed: ${JSON.stringify(tokenData)}`,
          );
          throw new UnauthorizedException(
            'Failed to exchange Google code for token.',
          );
        }

        // Use access_token to get user info
        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          },
        );

        if (!res.ok) {
          throw new UnauthorizedException('Invalid Google access token.');
        }

        userProfile = await res.json();
      } catch (error) {
        this.logger.error(`Google Login via Code failed: ${error.message}`);
        throw new UnauthorizedException('Google login failed.');
      }
    } else if (loginDto.accessToken) {
      // Legacy/Mobile flow using direct access token
      try {
        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: {
              Authorization: `Bearer ${loginDto.accessToken}`,
            },
          },
        );

        if (!res.ok) {
          throw new UnauthorizedException('Invalid Google access token.');
        }

        userProfile = await res.json();
      } catch (error) {
        this.logger.error(`Google Login via Token failed: ${error.message}`);
        throw new UnauthorizedException('Invalid Google access token.');
      }
    } else {
      throw new BadRequestException(
        'Either code or accessToken must be provided.',
      );
    }

    const { email, sub, name, picture } = userProfile;

    let user = await this.internalPrisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user if not exists
      user = await this.internalPrisma.user.create({
        data: {
          email,
          full_name: name,
          avatar_url: picture,
          auth_provider: 'google',
          provider_id: sub,
          password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Random password for OAuth users
        },
      });
    } else {
      // Update existing user with Google info if not already set
      if (user.auth_provider === 'local') {
        user = await this.internalPrisma.user.update({
          where: { id: user.id },
          data: {
            auth_provider: 'google',
            provider_id: sub,
            avatar_url: user.avatar_url || picture,
          },
        });
      }
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const userInfo = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      data: userInfo,
    };
  }

  async findUserById(userId: string) {
    return this.policyAwarePrisma.user.findUnique({
      where: { id: userId },
    });
  }

  async changePassword(changePasswordDto: ChangePasswordDto, userId: string) {
    if (!changePasswordDto.currentPassword || !changePasswordDto.newPassword) {
      throw new BadRequestException(
        'Current password or new password is empty',
      );
    }

    // Sử dụng internalPrisma để đảm bảo luôn lấy được user
    // không bị ràng buộc bởi access policy
    const user = await this.internalPrisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Kiểm tra mật khẩu hiện tại có đúng không
    const isPasswordMatch = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Kiểm tra mật khẩu mới có trùng với mật khẩu cũ không
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Cập nhật mật khẩu
    await this.internalPrisma.user.update({
      where: { id: userId },
      data: { password: changePasswordDto.newPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }
}
