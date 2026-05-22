import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { S3Module } from './s3/s3.module';
// import { SubmissionModule } from './submission/submission.module';
// import { NotificationModule } from './notification/notification.module';
import { EncryptionModule } from './encryption/encryption.module';
import { UsersModule } from './users/users.module';
import { TopicsModule } from './topics/topics.module';
import { ChaptersModule } from './chapters/chapters.module';
import { QuestionsModule } from './questions/questions.module';
import { ExamsModule } from './exams/exams.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EncryptionModule,
    AuthModule,
    PrismaModule,
    S3Module,
    // SubmissionModule,
    // NotificationModule,
    UsersModule,
    TopicsModule,
    ChaptersModule,
    QuestionsModule,
    ExamsModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
