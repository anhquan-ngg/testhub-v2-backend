import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Requires the configured frontend origin for cookie-authenticated state changes. */
@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ method: string; headers: { origin?: string } }>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    const allowed = (this.config.get<string>('FRONTEND_URL') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new URL(value).origin);
    if (!req.headers.origin || !allowed.includes(req.headers.origin))
      throw new ForbiddenException('Invalid request origin');
    return true;
  }
}
