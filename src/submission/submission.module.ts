import { Module } from '@nestjs/common';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { ExamReportService } from './exam-report.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { SubmissionRepository } from './submission.repository';
import { ExamRuntimeModule } from '@/exam-runtime/exam-runtime.module';
import { NotificationModule } from '@/notification/notification.module';
import { SubmissionRegradeController } from './submission-regrade.controller';
import { SubmissionRegradeService } from './submission-regrade.service';

@Module({
  imports: [PrismaModule, ExamRuntimeModule, NotificationModule],
  controllers: [
    SubmissionRegradeController,
    SubmissionController,
    PdfController,
  ],
  providers: [
    SubmissionRegradeService,
    SubmissionService,
    SubmissionRepository,
    PdfService,
    ExamReportService,
  ],
  exports: [SubmissionService, SubmissionRepository],
})
export class SubmissionModule {}
