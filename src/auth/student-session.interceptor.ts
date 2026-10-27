import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, lastValueFrom, Observable } from 'rxjs';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class StudentSessionInterceptor implements NestInterceptor {
  constructor(private readonly sessions: AuthSessionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      user: { id: string; role: string; session_id: string };
    }>();
    // The legacy GET session endpoint also touches presence and prepares questions.
    const sessionRead =
      req.method === 'GET' &&
      req.path.startsWith('/submission/exams/') &&
      req.path.endsWith('/session');
    if (
      req.user.role !== 'STUDENT' ||
      (!sessionRead && ['GET', 'HEAD', 'OPTIONS'].includes(req.method))
    )
      return next.handle();
    return from(
      this.sessions.runStudentMutation(req.user.id, req.user.session_id, () =>
        lastValueFrom(next.handle()),
      ),
    );
  }
}
