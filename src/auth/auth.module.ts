import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { OutlookStrategy } from './strategies/outlook.strategy';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthSessionModule } from './auth-session.module';
import { AuthOriginGuard } from './guards/auth-origin.guard';

@Module({
  imports: [
    PrismaModule,
    AuthSessionModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get<string>('JWT_ACCESS_SECRET'),
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthOriginGuard,
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    OutlookStrategy,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    OutlookStrategy,
    PassportModule,
  ],
})
export class AuthModule {}
