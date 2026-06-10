import { Module } from '@nestjs/common';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { ExamReportService } from './exam-report.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { SubmissionRepository } from './submission.repository';

@Module({
  imports: [PrismaModule],
  controllers: [SubmissionController, PdfController],
  providers: [
    SubmissionService,
    SubmissionRepository,
    PdfService,
    ExamReportService,
  ],
  exports: [SubmissionService, SubmissionRepository],
})
export class SubmissionModule {}
