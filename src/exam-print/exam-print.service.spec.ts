import { ServiceUnavailableException } from '@nestjs/common';
import { ExamMode, UserRole } from '@prisma/client';
import { ExamPrintService } from './exam-print.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExamRuntimeService } from '../exam-runtime/exam-runtime.service';
import { S3Service } from '../s3/s3.service';

describe('ExamPrintService admission', () => {
  it('admits two, queues four before preparation, and rejects overflow', async () => {
    const prisma = {
      exam: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam',
          title: 'Exam',
          lecturer_id: 'owner',
          mode: ExamMode.MANUAL,
        }),
      },
      question: { findMany: jest.fn().mockResolvedValue([]) },
    };
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const runtime = {
      selectQuestions: jest.fn(async () => {
        await gate;
        return [];
      }),
    };
    const service = new ExamPrintService(
      prisma as unknown as PrismaService,
      runtime as unknown as ExamRuntimeService,
      {} as S3Service,
    );
    const render = jest
      .spyOn(
        service as unknown as { renderPdfs(): Promise<Buffer[]> },
        'renderPdfs',
      )
      .mockResolvedValue([
        Buffer.from('pdf1'),
        Buffer.from('pdf2'),
        Buffer.from('answer'),
      ]);
    const user = { id: 'owner', role: UserRole.LECTURER };
    const active = Array.from({ length: 6 }, () =>
      service.generateArchive('exam', 2, user),
    );
    try {
      await expect(
        service.generateArchive('exam', 2, user),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(runtime.selectQuestions).toHaveBeenCalledTimes(2);
      expect(prisma.question.findMany).not.toHaveBeenCalled();
    } finally {
      release();
      await Promise.all(active);
      render.mockRestore();
    }
  });

  it('releases admission after rendering failure', async () => {
    const prisma = {
      exam: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam',
          title: 'Exam',
          lecturer_id: 'owner',
          mode: ExamMode.MANUAL,
        }),
      },
      question: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const runtime = { selectQuestions: jest.fn().mockResolvedValue([]) };
    const service = new ExamPrintService(
      prisma as unknown as PrismaService,
      runtime as unknown as ExamRuntimeService,
      {} as S3Service,
    );
    const render = jest
      .spyOn(
        service as unknown as { renderPdfs(): Promise<Buffer[]> },
        'renderPdfs',
      )
      .mockRejectedValue(new Error('render failed'));
    try {
      for (let i = 0; i < 8; i++) {
        await expect(
          service.generateArchive('exam', 2, {
            id: 'owner',
            role: UserRole.LECTURER,
          }),
        ).rejects.toThrow('render failed');
      }
    } finally {
      render.mockRestore();
    }
  });
});
