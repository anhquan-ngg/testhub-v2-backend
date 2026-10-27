import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Response } from 'express-serve-static-core';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import type {
  LoginSessionResult,
  SessionClaims,
  SessionTokens,
} from './auth-session.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SessionTransferQueryDto } from './dto/session-transfer-query.dto';
import { JwtGuard } from './guards/jwt.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleGuard } from './guards/google.guard';
import { OutlookGuard } from './guards/outlook.guard';
import { AuthOriginGuard } from './guards/auth-origin.guard';

type AuthRequest = Request & {
  user: {
    id: string;
    session_id: string;
    refresh_claims: SessionClaims;
    refresh_token: string;
  };
};
type OAuthUser = Parameters<AuthService['oauthLogin']>[0];

@ApiTags('Authentication')
@UseGuards(AuthOriginGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly sessions: AuthSessionService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'Signup a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login or request an explicit student session transfer',
  })
  @ApiResponse({ status: 200, description: 'Session cookies set' })
  @ApiResponse({
    status: 409,
    description:
      'SESSION_TRANSFER_REQUIRED; transfer cookie set, previous session retained',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto,
      await this.currentSession(req),
    );
    this.noStore(res);
    if ('tokens' in result) {
      this.setTokenCookies(res, result.tokens);
      return { message: 'Login successfully' };
    }
    this.setTransferCookie(res, result.transferToken);
    res.status(HttpStatus.CONFLICT);
    return {
      statusCode: 409,
      error: 'Conflict',
      code: 'SESSION_TRANSFER_REQUIRED',
      message: 'Confirm session transfer',
      approvalRequired: result.approvalRequired,
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh the same browser session' })
  @ApiResponse({ status: 200, description: 'Session cookies renewed' })
  @ApiResponse({ status: 401, description: 'Session expired or revoked' })
  async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.sessions.refresh(
      req.user.refresh_claims,
      req.user.refresh_token,
    );
    this.setTokenCookies(res, tokens);
    return { message: 'Session refreshed' };
  }

  @UseGuards(JwtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke only the current browser session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.sessions.logout(req.user.id, req.user.session_id);
    this.clearTokenCookies(res);
    return { message: 'Logged out' };
  }

  @UseGuards(JwtGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  me(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.noStore(res);
    const user = { ...req.user };
    delete user.session_id;
    return user;
  }

  @Get('session-transfer')
  @ApiOperation({
    summary: 'Read pending transfer using the requesting browser cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'PENDING or APPROVED, approvalRequired, expiresAt',
  })
  @ApiResponse({ status: 401, description: 'Transfer expired' })
  transferStatus(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.noStore(res);
    return this.sessions.transferStatus(this.transferToken(req));
  }

  @Post('session-transfer/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm transfer, requiring scoped staff approval during an exam',
  })
  @ApiResponse({
    status: 200,
    description: 'New session active; previous access revoked',
  })
  @ApiResponse({
    status: 403,
    description: 'Exam transfer requires staff approval',
  })
  @ApiResponse({ status: 409, description: 'Stale transfer, sign in again' })
  async completeTransfer(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setTokenCookies(
      res,
      await this.sessions.completeTransfer(this.transferToken(req)),
    );
    res.clearCookie(
      'transfer_token',
      this.cookieOptions('/auth/session-transfer'),
    );
    return { message: 'Session transferred' };
  }

  @UseGuards(JwtGuard)
  @Get('session-transfers')
  @ApiOperation({
    summary: 'List pending student transfers for a responsible lecturer/admin',
  })
  @ApiResponse({ status: 200, description: 'Up to 50 scoped pending requests' })
  @ApiResponse({ status: 403, description: 'Staff required' })
  transfers(
    @Query() query: SessionTransferQueryDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.noStore(res);
    return this.sessions.pendingTransfers(req.user.id, query.examId);
  }

  @UseGuards(JwtGuard)
  @Post('session-transfers/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve transfer as responsible lecturer/admin' })
  @ApiResponse({
    status: 200,
    description: 'Approval recorded; target browser may confirm',
  })
  @ApiResponse({ status: 403, description: 'Outside actor scope' })
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.sessions.approveTransfer(id, req.user.id);
  }

  @UseGuards(GoogleGuard)
  @Get('google')
  googleLogin() {}

  @UseGuards(GoogleGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.oauthLogin(
      req.user as unknown as OAuthUser,
      await this.currentSession(req),
    );
    this.oauthResponse(res, result);
  }

  @UseGuards(OutlookGuard)
  @Get('outlook')
  outlookLogin() {}

  @UseGuards(OutlookGuard)
  @Get('outlook/callback')
  async outlookCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.oauthLogin(
      req.user as unknown as OAuthUser,
      await this.currentSession(req),
    );
    this.oauthResponse(res, result);
  }

  @UseGuards(JwtGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: AuthRequest) {
    return this.authService.changePassword(dto, req.user.id);
  }

  private async currentSession(req: Request): Promise<string | undefined> {
    const token: unknown = req.cookies?.access_token;
    if (typeof token !== 'string') return undefined;
    try {
      return (await this.sessions.authenticate(token)).sid;
    } catch {
      return undefined;
    }
  }

  private transferToken(req: Request): string {
    const token: unknown = req.cookies?.transfer_token;
    if (typeof token !== 'string')
      throw new UnauthorizedException('Transfer expired');
    return token;
  }

  private oauthResponse(res: Response, result: LoginSessionResult) {
    const frontend = this.config
      .getOrThrow<string>('FRONTEND_URL')
      .split(',')[0]
      .replace(/\/$/, '');
    if ('tokens' in result) {
      this.setTokenCookies(res, result.tokens);
      res.redirect(frontend);
    } else {
      this.setTransferCookie(res, result.transferToken);
      res.redirect(frontend + '/auth/session-transfer');
    }
  }

  private noStore(res: Response) {
    res.setHeader('Cache-Control', 'no-store');
  }
  private cookieOptions(path = '/') {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path,
    };
  }
  private setTransferCookie(res: Response, token: string) {
    this.noStore(res);
    res.cookie('transfer_token', token, {
      ...this.cookieOptions('/auth/session-transfer'),
      maxAge: 600000,
    });
  }
  private setTokenCookies(res: Response, tokens: SessionTokens) {
    this.noStore(res);
    res.cookie('access_token', tokens.accessToken, {
      ...this.cookieOptions(),
      maxAge: tokens.accessMaxAge,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...this.cookieOptions('/auth/refresh'),
      maxAge: tokens.refreshMaxAge,
    });
  }
  private clearTokenCookies(res: Response) {
    this.noStore(res);
    res.clearCookie('access_token', this.cookieOptions());
    res.clearCookie('refresh_token', this.cookieOptions('/auth/refresh'));
    res.clearCookie(
      'transfer_token',
      this.cookieOptions('/auth/session-transfer'),
    );
  }
}
