import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { PdfService } from './pdf.service';
import { ExamReportService } from './exam-report.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { SubmissionService } from './submission.service';

@Controller('submission')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly examReportService: ExamReportService,
    private readonly submissionService: SubmissionService,
  ) {}

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = (req as any).user;

    // Check permissions: ADMIN, LECTURER, or Owner (Student)
    if (user.role !== 'ADMIN' && user.role !== 'LECTURER') {
      const ownerId = await this.submissionService.getSubmissionOwner(id);
      if (!ownerId || ownerId !== user.id) {
        throw new ForbiddenException(
          'Only admins, lecturers, and the submission owner can download PDFs',
        );
      }
    }

    const pdfBuffer = await this.pdfService.generateSubmissionPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Ketqua_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Get('exam/:examId/report-pdf')
  async downloadExamReport(
    @Param('examId') examId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = (req as any).user;

    // Only ADMIN and LECTURER can download PDFs
    if (user.role !== 'ADMIN' && user.role !== 'LECTURER') {
      throw new ForbiddenException(
        'Only admins and lecturers can download PDFs',
      );
    }

    const pdfBuffer =
      await this.examReportService.generateExamReportPdf(examId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Baocao_${examId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
