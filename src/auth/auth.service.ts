import {
  BadRequestException,
  ConflictException,
  Injectable,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { AuthSessionService } from './auth-session.service';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileStatus, FileType } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly sessions: AuthSessionService,
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
      const user = await this.prisma.user.create({
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
        },
      });
    } catch (error) {
      console.error('Signup unsuccessfully: ', error);
    }

    return {
      message: 'Signup successfully',
    };
  }

  // LOCAL LOGIN
  async login(loginDto: LoginDto, currentSessionId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.password || user.status === 'INACTIVE') {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordMatch)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    return this.sessions.login(user.id, currentSessionId);
  }

  // OAUTH LOGIN (Google / Outlook)
  async oauthLogin(
    oauthUser: {
      email: string;
      full_name: string;
      avatar: string | null;
      provider: string;
      provider_id: string;
    },
    currentSessionId?: string,
  ) {
    // 1. Find account OAuth if exists
    const account = await this.prisma.account.findFirst({
      where: {
        provider: oauthUser.provider,
        provider_id: oauthUser.provider_id,
      },
      include: { user: true },
    });

    if (account) {
      if (account.user.status === 'INACTIVE') {
        throw new UnauthorizedException('Account has been banned');
      }
      return this.sessions.login(account.user.id, currentSessionId);
    }

    // 2. If not exists -> Check email exists
    let user = await this.prisma.user.findFirst({
      where: { email: oauthUser.email },
    });

    if (!user) {
      // 3.a New user -> Create user + create account
      user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            full_name: oauthUser.full_name,
            email: oauthUser.email,
            password: null,
          },
        });

        if (oauthUser.avatar) {
          await tx.file.create({
            data: {
              name: `${oauthUser.provider}-avatar`,
              url: oauthUser.avatar,
              s3_key: null,
              type: FileType.IMAGE,
              size: null,
              entity_type: 'users',
              entity_id: createdUser.id,
              uploaded_by: createdUser.id,
              status: FileStatus.EXTERNAL,
            },
          });
        }

        return createdUser;
      });
    }
    // 3.b Existing user (local account) -> link OAuth account
    await this.prisma.account.create({
      data: {
        user_id: user.id,
        provider: oauthUser.provider,
        provider_id: oauthUser.provider_id,
        refresh_token_hash: null,
      },
    });

    return this.sessions.login(user.id, currentSessionId);
  }

  // CHANGE PASSWORD
  async changePassword(changePasswordDto: ChangePasswordDto, userId: string) {
    if (!changePasswordDto.currentPassword || !changePasswordDto.newPassword) {
      throw new BadRequestException(
        'Current password or new password is empty',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // User OAuth (Google,...) don't have a local password
    if (!user.password) {
      throw new BadRequestException(
        'This account does not use a password. Please login with your OAuth provider.',
      );
    }

    // Check password matching
    const isPasswordMatch = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if the new password is the same as the current password
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }
}
