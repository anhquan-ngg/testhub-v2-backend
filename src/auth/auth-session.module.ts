import { Global, Module } from '@nestjs/common';
import { AuthSessionService } from './auth-session.service';
import { StudentSessionInterceptor } from './student-session.interceptor';

@Global()
@Module({
  providers: [AuthSessionService, StudentSessionInterceptor],
  exports: [AuthSessionService, StudentSessionInterceptor],
})
export class AuthSessionModule {}
