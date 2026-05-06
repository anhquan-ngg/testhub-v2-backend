import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { EncryptionService } from '@/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private encryption: EncryptionService,
  ) {}

  // SIGN UP
  async signup(signupDto: SignupDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 12);

    try {
      const user =await this.prisma.user.create({
        data: {
          full_name: signupDto.full_name,
          email: signupDto.email,
          password: hashedPassword,
        },
      });

      await this.prisma.account.create({
        data: {
          user_id: user.id,
          provider: 'local',
          
        }
      })
    } catch (error) {
      console.error('Signup unsuccessfully: ', error);
    }

    return {
      message: 'Signup successfully',
    };
  }

  // LOCAL LOGIN 
  async login(
    loginDto: LoginDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.password || user.status === "INACTIVE") {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordMatch)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    return this.generateAndSaveTokens(user);
  }

  // OAUTH LOGIN (Google / Outlook)
  async oauthLogin(oauthUser: {
    email: string;
    full_name: string; 
    provider: string;
    provider_id: string;
  }) {
    // 1. Find account OAuth if exists
    let account = await this.prisma.account.findFirst({
      where: {
        provider: oauthUser.provider,
        provider_id: oauthUser.provider_id,
      },
      include: { user: true },
    })

    if (account){
      if (account.user.status === 'INACTIVE'){
        throw new UnauthorizedException('Account has been banned');
      }
      return this.generateAndSaveTokens(account.user);
    }
    
    // 2. If not exists -> Check email exists
    let user = await this.prisma.user.findFirst({
      where: { email: oauthUser.email }
    })

    if (!user){
      // 3.a New user -> Create user + create account
      user = await this.prisma.user.create({
        data: {
          full_name: oauthUser.full_name,
          email: oauthUser.email,
          password: null,
        }
      })
    }
    // 3.b Existing user (local account) -> link OAuth account
    await this.prisma.account.create({
      data: {
        user_id: user.id,
        provider: oauthUser.provider,
        provider_id: oauthUser.provider_id,
        refresh_token_hash: null,
      },
    })

    return this.generateAndSaveTokens(user);
  }

  // REFRESH TOKEN
  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status === 'INACTIVE') {
      throw new UnauthorizedException();
    }

    return this.generateAndSaveTokens(user);
  }

  // LOGOUT
  async logout(userId: string) {
    await this.prisma.account.updateMany({
      where: { user_id: userId, provider: 'local' },
      data: { refresh_token_hash: null },
    });
  }

  // CHANGE PASSWORD
  async changePassword(changePasswordDto: ChangePasswordDto, userId: string) {
    if (!changePasswordDto.currentPassword || !changePasswordDto.newPassword) {
      throw new BadRequestException(
        'Current password or new password is empty',
      );
    }

    // Sử dụng internalPrisma để đảm bảo luôn lấy được user
    // không bị ràng buộc bởi access policy
        const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // User OAuth (Google,...) không có password local
    if (!user.password) {
      throw new BadRequestException('This account does not use a password. Please login with your OAuth provider.');
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
        await this.prisma.user.update({
      where: { id: userId },
      data: { password: changePasswordDto.newPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  // HELPER: GENERATE TOKENS AND SAVE HASHED REFRESH TOKEN
  async generateAndSaveTokens(user: {
    id: string;
    email: string;
    role: string;
  }){
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES'),
      }),
    ])

    const hash = this.encryption.hashToken(refreshToken);
    await this.prisma.account.updateMany({
      where: { user_id: user.id, provider: 'local' },
      data: { refresh_token_hash: hash },
    })

    return { accessToken, refreshToken };
  }

  async saveLocalRefreshToken(
    userId: string, 
    rawRefreshToken: string
  ) {
    const hash = this.encryption.hashToken(rawRefreshToken);

    await this.prisma.account.upsert({
      where: { user_id_provider: {user_id: userId, provider: 'local' } },
      update: { refresh_token_hash: hash },
      create: {
        user_id: userId,
      provider: 'local',
        refresh_token_hash: hash
      },
    });
  }

  async validateLocalRefreshToken(
    userId: string,
    rawRefreshToken: string
  ): Promise<boolean> {
    const account = await this.prisma.account.findUnique({
      where: { user_id_provider: {user_id: userId, provider: 'local' } },
    });

    if (!account || !account.refresh_token_hash) {
      return false;
    }
    
    const hash = this.encryption.hashToken(rawRefreshToken);

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(account.refresh_token_hash));
  }

  // async validateOAuthTokenUser(payload: { token: string }): Promise<any> {
  //   const { token } = payload;

  //   if (!token) {
  //     this.logger.warn('validateOAuthUser: No token provided.');
  //     return null;
  //   }

  //   try {
  //     const decoded = await this.jwtService.verifyAsync(token);

  //     if (!decoded || !decoded.sub) {
  //       this.logger.warn(
  //         `validateOAuthUser: Invalide token payload for token: ${token}`,
  //       );
  //       return null;
  //     }

  //     const user = await this.prisma.user.findUnique({
  //       where: { id: decoded.sub },
  //     });

  //     if (!user) {
  //       this.logger.warn(
  //         `validateOAuthUser: User with ID ${decoded.sub} not found or inactive.`,
  //       );
  //       return null;
  //     }

  //     return user;
  //   } catch (error) {
  //     const errorMessage =
  //       error instanceof Error ? error.message : String(error);
  //     this.logger.error(
  //       `validateOAuthUser: Token validation error: ${errorMessage}`,
  //     );
  //     // Ném lỗi UnauthorizedException để NestJS có thể bắt và xử lý
  //     throw new UnauthorizedException('Invalid or expired token.');
  //   }
  // }

  // async googleLogin(loginDto: GoogleLoginDto) {
  //   let userProfile;

  //   if (loginDto.code) {
  //     // Exchange code for tokens
  //     try {
  //       const tokenResponse = await fetch(
  //         'https://oauth2.googleapis.com/token',
  //         {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/x-www-form-urlencoded',
  //           },
  //           body: new URLSearchParams({
  //             code: loginDto.code || '',
  //             client_id: process.env.GOOGLE_CLIENT_ID || '',
  //             client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
  //             redirect_uri:
  //               process.env.GOOGLE_CALLBACK_URL ||
  //               'http://localhost:3000/auth/callback',
  //             grant_type: 'authorization_code',
  //           }),
  //         },
  //       );

  //       const tokenData = await tokenResponse.json();

  //       if (!tokenResponse.ok) {
  //         this.logger.error(
  //           `Google Token Exchange failed: ${JSON.stringify(tokenData)}`,
  //         );
  //         throw new UnauthorizedException(
  //           'Failed to exchange Google code for token.',
  //         );
  //       }

  //       // Use access_token to get user info
  //       const res = await fetch(
  //         'https://www.googleapis.com/oauth2/v3/userinfo',
  //         {
  //           headers: {
  //             Authorization: `Bearer ${tokenData.access_token}`,
  //           },
  //         },
  //       );

  //       if (!res.ok) {
  //         throw new UnauthorizedException('Invalid Google access token.');
  //       }

  //       userProfile = await res.json();
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : String(error);
  //       this.logger.error(`Google Login via Code failed: ${errorMessage}`);
  //       throw new UnauthorizedException('Google login failed.');
  //     }
  //   } else if (loginDto.accessToken) {
  //     // Legacy/Mobile flow using direct access token
  //     try {
  //       const res = await fetch(
  //         'https://www.googleapis.com/oauth2/v3/userinfo',
  //         {
  //           headers: {
  //             Authorization: `Bearer ${loginDto.accessToken}`,
  //           },
  //         },
  //       );

  //       if (!res.ok) {
  //         throw new UnauthorizedException('Invalid Google access token.');
  //       }

  //       userProfile = await res.json();
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : String(error);
  //       this.logger.error(`Google Login via Token failed: ${errorMessage}`);
  //       throw new UnauthorizedException('Invalid Google access token.');
  //     }
  //   } else {
  //     throw new BadRequestException(
  //       'Either code or accessToken must be provided.',
  //     );
  //   }

  //   const { email, sub, name, picture } = userProfile;

  //       let user = await this.prisma.user.findUnique({
  //     where: { email },
  //   });

  //   if (!user) {
  //     // Create new user if not exists
  //         user = await this.prisma.user.create({
  //       data: {
  //         email,
  //         full_name: name,
  //         avatar_url: picture,
  //         auth_provider: 'google',
  //         provider_id: sub,
  //         password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Random password for OAuth users
  //       },
  //     });
  //   } else {
  //     // Update existing user with Google info if not already set
  //     if (user.auth_provider === 'local') {
  //           user = await this.prisma.user.update({
  //         where: { id: user.id },
  //         data: {
  //           auth_provider: 'google',
  //           provider_id: sub,
  //           avatar_url: user.avatar_url || picture,
  //         },
  //       });
  //     }
  //   }

  //   const payload = { sub: user.id, email: user.email, role: user.role };
  //   const userInfo = {
  //     id: user.id,
  //     email: user.email,
  //     full_name: user.full_name,
  //     avatar_url: user.avatar_url,
  //     role: user.role,
  //   };

  //   return {
  //     access_token: await this.jwtService.signAsync(payload),
  //     data: userInfo,
  //   };
  // }

  // async findUserById(userId: string) {
  //   return this.prisma.user.findUnique({
  //     where: { id: userId },
  //   });
  // }
}


