import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express-serve-static-core';
import { PdfService } from './pdf.service';
import { ExamReportService } from './exam-report.service';
import { JwtGuard } from '@/auth/guards/jwt.guard';

import { SubmissionService } from './submission.service';

@Controller('submission')
@UseGuards(JwtGuard)
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
    const user = (req as Request & { user?: { id: string; role: string } })
      .user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // ADMIN: any submission; LECTURER: only submissions of exams they own;
    // anyone else: only their own submission.
    const access = await this.pdfService.getSubmissionAccessInfo(id);
    const isStaff = user.role === 'ADMIN' || user.role === 'LECTURER';
    if (user.role === 'LECTURER' && access.lecturerId !== user.id) {
      throw new ForbiddenException(
        'Lecturers can only download submissions of their own exams',
      );
    }
    if (!isStaff && access.studentId !== user.id) {
      throw new ForbiddenException(
        'Only admins, the exam lecturer, and the submission owner can download PDFs',
      );
    }

    // Students only see the per-question breakdown for practice exams,
    // matching the web result page.
    const pdfBuffer = await this.pdfService.generateSubmissionPdf(id, {
      showQuestions: isStaff || access.practice,
      staffView: isStaff,
    });

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

  @Get('exam/:examId/pdf')
  async downloadExamPdf(
    @Param('examId') examId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = (req as any).user;

    // Anyone with authenticated access to this route can download the blank exam (assuming they reached the exam page)
    const pdfBuffer = await this.pdfService.generateBlankExamPdf(examId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Dethi_${examId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
