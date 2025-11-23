import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { ZenStackModule } from '@zenstackhq/server/nestjs';
import { enhance } from '@zenstackhq/runtime';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import type { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { MinioModule } from './minio/minio.module';

@Module({
  imports: [
    // ConfigModule phải được import đầu tiên để các module khác có thể sử dụng
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // AuthModule phải được import trước CrudModule để strategy được đăng ký
    AuthModule,

    PrismaModule,
    ZenStackModule.registerAsync({
      useFactory: (request: Request, prisma: PrismaService) => {
        console.log('=== ZenStack Current User Context ===');
        console.log(JSON.stringify(request?.user, null, 2));
        console.log('=====================================');
        return {
          getEnhancedPrisma: () =>
            enhance(prisma, { user: request.user }, { logPrismaQuery: true }),
        };
      },
      inject: [REQUEST, PrismaService],
      extraProviders: [PrismaService],
      global: true,
    }),
    MinioModule,
    // ZenStackModule.registerAsync({
    //   useFactory: (prisma: PrismaService) => ({
    //     getEnhancedPrisma: (req?: any) => {
    //       // build user context từ request (tuỳ auth)
    //       const user = req?.user ?? null;
    //       return enhance(prisma, { user });
    //     },
    //   }),
    //   inject: [PrismaService],
    //   extraProviders: [PrismaService],
    // }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
