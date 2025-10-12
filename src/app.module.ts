import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { ZenStackModule } from '@zenstackhq/server/nestjs';
import { enhance } from '@zenstackhq/runtime';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // ZenStackModule.registerAsync({
    //   useFactory: (prisma: PrismaService, jwt: JwtService) => {
    //     return {
    //       getEnhancedPrisma: (req: any) => {
    //         const authHeader = req.headers['authorization'];
    //         if (!authHeader) return enhance(prisma, { user: undefined });

    //         const token = authHeader.split(' ')[1];
    //         try {
    //           const decoded = jwt.verify(token);
    //           return enhance(prisma, { user: decoded });
    //         } catch {
    //           return enhance(prisma, { user: undefined });
    //         }
    //       },
    //     };
    //   },
    //   inject: [PrismaService, JwtService],
    //   extraProviders: [PrismaService],
    // }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
