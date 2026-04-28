import { Module } from '@nestjs/common';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { ExamReportService } from './exam-report.service';
import { S3Module } from '@/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [SubmissionController, PdfController],
  providers: [SubmissionService, PdfService, ExamReportService],
})
export class SubmissionModule {}
