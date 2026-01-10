import { Module } from '@nestjs/common';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { ExamReportService } from './exam-report.service';

@Module({
  controllers: [SubmissionController, PdfController],
  providers: [SubmissionService, PdfService, ExamReportService],
})
export class SubmissionModule {}
