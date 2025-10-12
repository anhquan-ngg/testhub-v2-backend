import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { INTERNAL_PRISMA_CLIENT } from './../prisma/prisma.module';
import type { Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'Signup a new user.' })
  @ApiResponse({ status: 201, description: 'Signup successfully.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async signup(@Body() signupDto: SignupDto, @Req() req: any) {
    return this.authService.signup(signupDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({
    status: 200,
    description: 'Login successfully, returns JWT token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, data } = await this.authService.login(loginDto);

    response.cookie('testhub_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Chỉ gửi cookie qua HTTPS trong môi trường production
      sameSite: 'lax', // Giúp ngăn chặn CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie có hiệu lực trong 7 ngày
    });

    return {
      ...data,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Logout a user' })
  @ApiResponse({ status: 200, description: 'Logout successfully.' })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('testhub_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return { message: 'Logout successful' };
  }

  // @Get('me')
  // @ApiOperation({ summary: 'Get current user info' })
  // @ApiResponse({ status: 200, description: 'Returns current user info.' })
  // @ApiResponse({ status: 401, description: 'Unauthorized' })
  // async getMe(@Body() userId: string) {
  //   const user = await this.authService.getUserById(userId);
  //   console.log(user);
  //   return { user };
  // }
}
