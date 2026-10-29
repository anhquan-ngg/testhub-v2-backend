import { ConflictException } from '@nestjs/common';
import {
  Prisma,
  QuestionImportStatus,
  QuestionType,
  QuestionFormat,
} from '@prisma/client';
import { QuestionImportService } from './question-import.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { QuestionImportQueueService } from './question-import-queue.service';
import { DocxQuestionImportParser } from './parsers/docx-question-import.parser';
import { XlsxQuestionImportParser } from './parsers/xlsx-question-import.parser';
import { ExamsService } from '../exams/exams.service';

function setup() {
  let status: QuestionImportStatus = QuestionImportStatus.REVIEW_REQUIRED;
  const source = {
    id: 'import',
    created_by: 'owner',
    topic_id: 'topic',
    default_chapter_id: 'chapter',
    exam_id: null,
    source_s3_key: 'temp/source.docx',
    expires_at: new Date(Date.now() + 60_000),
  };
  const asset = {
    id: 'asset',
    order: 0,
    temp_s3_key: 'temp/selected.png',
    name: 'selected.png',
    size: 20,
  };
  const item = {
    id: 'item',
    chapter_id: 'chapter',
    fingerprint: 'fp',
    assets: [asset],
    data: {
      questionText: 'Question',
      questionType: QuestionType.SINGLE_CHOICE,
      questionFormat: QuestionFormat.KNOWLEDGE,
      options: [
        { key: 'A', text: 'Answer', isCorrect: true },
        { key: 'B', text: 'Other', isCorrect: false },
      ],
      correctAnswer: null,
    },
  };
  const tx = {
    topic: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    chapter: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'chapter', name: 'Chapter', parent_id: null, order: 0 },
        ]),
    },
    question: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    file: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    questionFiles: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    questionImportAsset: { update: jest.fn().mockResolvedValue({}) },
    questionImportItem: {
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    questionImport: {
      updateMany: jest.fn().mockImplementation(() => {
        if (status !== QuestionImportStatus.COMMITTING)
          return Promise.resolve({ count: 0 });
        status = QuestionImportStatus.COMPLETED;
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  const prisma = {
    topic: { findFirst: jest.fn().mockResolvedValue({ id: 'topic' }) },
    chapter: { findFirst: jest.fn().mockResolvedValue({ id: 'chapter' }) },
    questionImport: {
      findFirst: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ ...source, status })),
      updateMany: jest
        .fn()
        .mockImplementation(
          ({
            where,
            data,
          }: {
            where: { status: QuestionImportStatus };
            data: { status: QuestionImportStatus };
          }) => {
            if (where.status !== status) return Promise.resolve({ count: 0 });
            status = data.status;
            return Promise.resolve({ count: 1 });
          },
        ),
    },
    questionImportItem: { findMany: jest.fn().mockResolvedValue([item]) },
    questionImportAsset: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { temp_s3_key: 'temp/skipped.png' },
          { temp_s3_key: 'temp/invalid.png' },
          { temp_s3_key: 'temp/unselected.png' },
        ]),
    },
    $transaction: jest.fn(
      (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(tx as unknown as Prisma.TransactionClient),
    ),
  };
  const s3 = {
    copyObject: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    createStorageUrl: jest
      .fn()
      .mockReturnValue('https://storage.invalid/image.png'),
  };
  const service = new QuestionImportService(
    prisma as unknown as PrismaService,
    s3 as unknown as S3Service,
    {} as QuestionImportQueueService,
    {} as DocxQuestionImportParser,
    {} as XlsxQuestionImportParser,
    {} as ExamsService,
  );
  return {
    service,
    prisma,
    tx,
    s3,
    setStatus: (next: QuestionImportStatus) => {
      status = next;
    },
    getStatus: () => status,
  };
}

describe('QuestionImport commit state and cleanup', () => {
  it('conditionally completes and removes selected, skipped, invalid and unselected temp assets', async () => {
    const { service, prisma, tx, s3 } = setup();
    await service.commit('owner', 'import', { duplicate_policy: 'CREATE' });
    expect(tx.questionImport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'import', status: QuestionImportStatus.COMMITTING },
      }),
    );
    expect(prisma.questionImportAsset.findMany).toHaveBeenCalledWith({
      where: { item: { import_id: 'import' }, file_id: null },
      select: { temp_s3_key: true },
    });
    for (const key of [
      'temp/source.docx',
      'temp/selected.png',
      'temp/skipped.png',
      'temp/invalid.png',
      'temp/unselected.png',
    ]) {
      expect(s3.remove).toHaveBeenCalledWith(key);
    }
    expect(
      s3.remove.mock.calls
        .flat()
        .every((key: string) => key.startsWith('temp/')),
    ).toBe(true);
  });

  it('throws inside the transaction if the final COMMITTING claim is lost', async () => {
    const { service, prisma, tx, s3, setStatus, getStatus } = setup();
    tx.questionImport.updateMany.mockImplementation(() => {
      setStatus(QuestionImportStatus.CANCELLED);
      return Promise.resolve({ count: 0 });
    });
    await expect(
      service.commit('owner', 'import', { duplicate_policy: 'CREATE' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.question.createMany).toHaveBeenCalled();
    expect(getStatus()).toBe(QuestionImportStatus.CANCELLED);
    const lastWrite: unknown =
      prisma.questionImport.updateMany.mock.calls.at(-1);
    expect(lastWrite).toMatchObject([
      {
        where: { id: 'import', status: QuestionImportStatus.COMMITTING },
        data: { status: QuestionImportStatus.REVIEW_REQUIRED },
      },
    ]);
    expect(prisma.questionImportAsset.findMany).not.toHaveBeenCalled();
    expect(s3.remove).not.toHaveBeenCalledWith('temp/source.docx');
  });

  it('does not overwrite a state changed while S3 copying fails', async () => {
    const { service, s3, tx, setStatus, getStatus } = setup();
    s3.copyObject.mockImplementation(() => {
      setStatus(QuestionImportStatus.CANCELLED);
      return Promise.reject(new Error('copy failed'));
    });
    await expect(
      service.commit('owner', 'import', { duplicate_policy: 'CREATE' }),
    ).rejects.toThrow('copy failed');
    expect(getStatus()).toBe(QuestionImportStatus.CANCELLED);
    expect(tx.questionImport.updateMany).not.toHaveBeenCalled();
  });
});
