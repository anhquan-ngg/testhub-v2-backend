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
import { JwtGuard } from './guards/jwt.guard';
import type { Request as ExpressRequest } from 'express';
import type { Response } from 'express-serve-static-core';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleGuard } from './guards/google.guard';
import { OutlookGuard } from './guards/outlook.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // LOCAL
  @Post('signup')
  @ApiOperation({ summary: 'Signup a new user.' })
  @ApiResponse({ status: 201, description: 'Signup successfully.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
    const tokens = await this.authService.login(loginDto);

    this.setTokenCookies(response, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    return {
      message: 'Login successfully',
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token' })
  @ApiResponse({ status: 200, description: 'Refresh token successfully.' })
  @ApiResponse({ status: 401, description: 'Refresh token failed' })
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refresh((req.user as any).id);
    this.setTokenCookies(res, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    return { message: 'Refresh token thành công' };
  }

  @UseGuards(JwtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout((req.user as any).id);
    this.clearTokenCookies(res);
    return { message: 'Đăng xuất thành công' };
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@Req() req: ExpressRequest) {
    return (req as any).user;
  }

  // ── GOOGLE ───────────────────────────────────
  @UseGuards(GoogleGuard)
  @Get('google')
  googleLogin() {
    // Passport tự redirect sang Google, không cần body
  }

  @UseGuards(GoogleGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: ExpressRequest, @Res() res: Response) {
    const tokens = await this.authService.oauthLogin((req as any).user);
    this.setTokenCookies(res, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    res.redirect(this.config.get('FRONTEND_URL') ?? '/');
  }

  // ── OUTLOOK ──────────────────────────────────
  @UseGuards(OutlookGuard)
  @Get('outlook')
  outlookLogin() {}

  @UseGuards(OutlookGuard)
  @Get('outlook/callback')
  async outlookCallback(@Req() req: ExpressRequest, @Res() res: Response) {
    const tokens = await this.authService.oauthLogin((req as any).user);
    this.setTokenCookies(res, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    res.redirect(this.config.get('FRONTEND_URL') ?? '/');
  }

  // @UseGuards(JwtGuard)
  // @Get('me')
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Get current user information' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'User information retrieved successfully.',
  // })
  // @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  // getCurrentUser(@Req() req: any) {
  //   return req.user || null;
  // }

  @UseGuards(JwtGuard)
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

  // COOKIE HELPERS
  private setTokenCookies(
    res: Response,
    tokens: {
      access_token: string;
      refresh_token: string;
    },
  ) {
    const isProduction = this.config.get<string>('node_env') === 'production';

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh', // Only send this cookie to endpoint refresh
    });
  }

  private clearTokenCookies(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }
}
