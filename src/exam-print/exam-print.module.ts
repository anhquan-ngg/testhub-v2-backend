import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { S3Module } from '@/s3/s3.module';
import { ExamRuntimeModule } from '@/exam-runtime/exam-runtime.module';
import { ExamPrintController } from './exam-print.controller';
import { ExamPrintService } from './exam-print.service';

@Module({
  imports: [PrismaModule, S3Module, ExamRuntimeModule],
  controllers: [ExamPrintController],
  providers: [ExamPrintService],
})
export class ExamPrintModule {}
