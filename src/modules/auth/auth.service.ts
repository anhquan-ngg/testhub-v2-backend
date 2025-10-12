import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ENHANCED_PRISMA } from '@zenstackhq/server/nestjs';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import {
  INTERNAL_PRISMA_CLIENT,
  POLICY_AWARE_PRISMA_CLIENT,
} from '../prisma/prisma.module';
import { PrismaClient } from '@prisma/client';

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

@Injectable()
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
      role: user.role,
    };

    console.log('User login: ', user);
    return {
      access_token: await this.jwtService.signAsync(payload),
      data: userProfile,
    };
  }

  async findUserById(userId: string) {
    return this.policyAwarePrisma.user.findUnique({
      where: { id: userId },
    });
  }

  // async getUserById(userId: string) {
  //   const user = await this.policyAwarePrisma.user.findUnique({
  //     where: { id: userId },
  //   });

  //   if (!user) {
  //     throw new BadRequestException('User not found');
  //   }

  //   const userProfile = {
  //     id: user.id,
  //     email: user.email,
  //     full_name: user.full_name,
  //     role: user.role,
  //   };

  //   return { userProfile };
  // }
}
