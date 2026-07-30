import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    if (request.path?.endsWith('/callback')) {
      return undefined;
    }

    return {
      prompt: 'select_account',
    };
  }
}
