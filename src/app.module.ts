import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
// import { S3Module } from './s3/s3.module';
// import { SubmissionModule } from './submission/submission.module';
// import { NotificationModule } from './notification/notification.module';
import { EncryptionModule } from './encryption/encryption.module';
import { ModelModule } from './model/model.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EncryptionModule,
    AuthModule,
    PrismaModule,
    // S3Module,
    // SubmissionModule,
    // NotificationModule,
    ModelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
