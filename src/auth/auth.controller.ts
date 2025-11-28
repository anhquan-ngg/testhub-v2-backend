import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  getCurrentUser(@Req() req: any) {
    return req.user || null;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({
    status: 200,
    description: 'Update password successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.authService.changePassword(changePasswordDto, userId);
  }
}
