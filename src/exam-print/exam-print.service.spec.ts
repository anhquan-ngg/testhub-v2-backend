import { ServiceUnavailableException } from '@nestjs/common';
import { ExamMode, UserRole } from '@prisma/client';
import JSZip from 'jszip';
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

  it('plans a delta quota per BY_TYPE variant and writes the summary', async () => {
    const distribution = JSON.stringify([
      {
        question_type: 'SINGLE_CHOICE',
        question_format: 'KNOWLEDGE',
        quantity: 4,
      },
      {
        question_type: 'SINGLE_CHOICE',
        question_format: 'UNDERSTANDING',
        quantity: 4,
      },
    ]);
    const prisma = {
      exam: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam',
          title: 'Exam',
          lecturer_id: 'owner',
          topic_id: 'topic',
          mode: ExamMode.BY_TYPE,
          distribution,
          distribution_delta: 1,
        }),
      },
      question: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const runtime = {
      countTypeCapacity: jest.fn().mockResolvedValue([20, 20]),
      selectQuestions: jest.fn().mockResolvedValue([]),
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
        Buffer.from('a'),
        Buffer.from('b'),
        Buffer.from('k'),
      ]);
    try {
      const { buffer } = await service.generateArchive('exam', 2, {
        id: 'owner',
        role: UserRole.LECTURER,
      });
      expect(runtime.selectQuestions).toHaveBeenCalledTimes(2);
      for (const call of runtime.selectQuestions.mock.calls as unknown[][]) {
        const rows = call[2] as Array<{ quantity: number }>;
        expect(rows.reduce((sum, row) => sum + row.quantity, 0)).toBe(8);
        expect(rows.map((row) => row.quantity)).not.toEqual([4, 4]);
      }
      const zip = await JSZip.loadAsync(buffer);
      const summary = JSON.parse(
        await zip.file('distribution-summary.json')!.async('string'),
      ) as { variants: Array<{ status: string; applied_d: number }> };
      expect(summary.variants).toHaveLength(2);
      expect(summary.variants.every((v) => v.status === 'applied')).toBe(true);
    } finally {
      render.mockRestore();
    }
  });

  it('falls back to the baseline quota when the planned one cannot be filled', async () => {
    const distribution = JSON.stringify([
      {
        question_type: 'SINGLE_CHOICE',
        question_format: 'KNOWLEDGE',
        quantity: 4,
      },
      {
        question_type: 'SINGLE_CHOICE',
        question_format: 'UNDERSTANDING',
        quantity: 4,
      },
    ]);
    const prisma = {
      exam: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam',
          title: 'Exam',
          lecturer_id: 'owner',
          topic_id: 'topic',
          mode: ExamMode.BY_TYPE,
          distribution,
          distribution_delta: 1,
        }),
      },
      question: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const runtime = {
      countTypeCapacity: jest.fn().mockResolvedValue([20, 20]),
      selectQuestions: jest
        .fn()
        .mockRejectedValueOnce(new Error('short'))
        .mockResolvedValue([]),
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
        Buffer.from('a'),
        Buffer.from('b'),
        Buffer.from('k'),
      ]);
    try {
      const { buffer } = await service.generateArchive('exam', 2, {
        id: 'owner',
        role: UserRole.LECTURER,
      });
      const zip = await JSZip.loadAsync(buffer);
      const summary = JSON.parse(
        await zip.file('distribution-summary.json')!.async('string'),
      ) as { variants: Array<{ status: string; reason?: string }> };
      expect(summary.variants.map((v) => v.reason)).toContain(
        'SELECTION_INSUFFICIENT',
      );
    } finally {
      render.mockRestore();
    }
  });
  it('plans BY_CHAPTER variants and each draw keeps the exact total', async () => {
    const ids = [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ];
    const distribution = JSON.stringify(
      ids.map((chapter_id) => ({ chapter_id, quantity: 4 })),
    );
    const pool = (p: string) =>
      Array.from({ length: 20 }, (_, i) => `${p}${i}`);
    const prisma = {
      exam: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam',
          title: 'Exam',
          lecturer_id: 'owner',
          topic_id: 'topic',
          mode: ExamMode.BY_CHAPTER,
          distribution,
          distribution_delta: 2,
        }),
      },
      question: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const runtime = {
      loadChapterCapacity: jest.fn().mockResolvedValue([pool('a'), pool('b')]),
      selectQuestions: jest.fn().mockResolvedValue([]),
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
        Buffer.from('a'),
        Buffer.from('b'),
        Buffer.from('k'),
      ]);
    try {
      const { buffer } = await service.generateArchive('exam', 2, {
        id: 'owner',
        role: UserRole.LECTURER,
      });
      expect(runtime.loadChapterCapacity).toHaveBeenCalledTimes(1);
      for (const call of runtime.selectQuestions.mock.calls as unknown[][]) {
        const rows = call[2] as Array<{ quantity: number }>;
        expect(rows.reduce((sum, row) => sum + row.quantity, 0)).toBe(8);
      }
      const zip = await JSZip.loadAsync(buffer);
      expect(zip.file('distribution-summary.json')).not.toBeNull();
    } finally {
      render.mockRestore();
    }
  });
});
