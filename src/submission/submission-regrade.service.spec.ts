import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { SaveRegradeDraftDto } from './dto/regrade-submission.dto';
import { SubmissionRegradeService } from './submission-regrade.service';

function setup() {
  const id = randomUUID(),
    owner = randomUUID(),
    questionId = randomUUID();
  const body = {
    expected_revision: 0,
    expected_grade_revision: 0,
    reason: '',
    scores: [{ submission_question_id: questionId, score: 0.5 }],
  };
  const row = {
    id,
    student_id: randomUUID(),
    grading_revision: 0,
    total_score: new Prisma.Decimal(0),
    status: SubmissionStatus.COMPLETED as SubmissionStatus,
    exam: { title: 'Fixture' },
    questions: [
      { id: questionId, score: new Prisma.Decimal(0), is_correct: false },
    ],
    regradeDraft: null as null | {
      revision: number;
      base_grade_revision: number;
      scores: typeof body.scores;
      reason: string;
    },
    regradePublications: [] as Array<{ revision: number }>,
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id }]),
    submission: {
      findFirst: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue({}),
    },
    submissionQuestions: { update: jest.fn().mockResolvedValue({}) },
    submissionRegradeDraft: {
      upsert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    submissionRegradePublication: { create: jest.fn().mockResolvedValue({}) },
    notification: {
      create: jest.fn().mockResolvedValue({ recipient_id: row.student_id }),
    },
  };
  const prisma = {
    current: tx,
    $transaction: jest.fn((action: (value: typeof tx) => Promise<unknown>) =>
      action(tx),
    ),
  };
  const notifications = {
    emitSavedNotification: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SubmissionRegradeService(
    prisma as unknown as PrismaService,
    notifications as unknown as NotificationGateway,
  );
  return { id, owner, body, row, tx, prisma, notifications, service };
}

describe('Submission regrading portable validation and service guards', () => {
  it.each([NaN, Infinity, -Infinity, -0.01, 1.01, 0.123, '0.5', null])(
    'rejects invalid normalized score %s at the boundary',
    (score) => {
      const { body } = setup();
      const dto = plainToInstance(SaveRegradeDraftDto, {
        ...body,
        scores: [{ ...body.scores[0], score }],
      });
      expect(validateSync(dto).length).toBeGreaterThan(0);
    },
  );

  it.each([0, 0.1, 0.29, 0.5, 0.99, 1])(
    'accepts normalized two-decimal score %s',
    (score) => {
      const { body } = setup();
      const dto = plainToInstance(SaveRegradeDraftDto, {
        ...body,
        scores: [{ ...body.scores[0], score }],
      });
      expect(validateSync(dto)).toHaveLength(0);
    },
  );

  it('scopes reads to the owning lecturer and never leaks drafts through the submission object', async () => {
    const { service, id, owner, tx, row } = setup();
    row.regradeDraft = {
      revision: 1,
      base_grade_revision: 0,
      scores: [],
      reason: '',
    };
    const result = await service.getWorkspace(id, owner);
    expect(tx.submission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id,
          is_deleted: false,
          exam: { lecturer_id: owner, is_deleted: false },
        },
      }),
    );
    expect(result.submission).not.toHaveProperty('regradeDraft');
    expect(result.submission).not.toHaveProperty('regradePublications');
    expect(result.draft?.revision).toBe(1);
    tx.submission.findFirst.mockResolvedValueOnce(null);
    await expect(service.getWorkspace(id, owner)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects unowned, unfinished and empty submissions before saving', async () => {
    const { service, id, owner, body, tx, row } = setup();
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.saveDraft(id, owner, body)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    row.status = SubmissionStatus.IN_PROGRESS;
    await expect(service.saveDraft(id, owner, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    row.status = SubmissionStatus.COMPLETED;
    row.questions = [];
    await expect(service.saveDraft(id, owner, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.submissionRegradeDraft.upsert).not.toHaveBeenCalled();
  });

  it('rejects stale writes and incomplete or foreign question IDs even without HTTP validation', async () => {
    const { service, id, owner, body, tx } = setup();
    await expect(
      service.saveDraft(id, owner, { ...body, expected_revision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.saveDraft(id, owner, { ...body, expected_grade_revision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.saveDraft(id, owner, { ...body, scores: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveDraft(id, owner, {
        ...body,
        scores: [{ submission_question_id: randomUUID(), score: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.submission.update).not.toHaveBeenCalled();
  });

  it('only saves a private draft, without touching grades or notifications', async () => {
    const { service, id, owner, body, tx, notifications } = setup();
    await service.saveDraft(id, owner, body);
    expect(tx.submissionRegradeDraft.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          revision: 1,
          base_grade_revision: 0,
          scores: body.scores,
        }) as unknown,
      }),
    );
    expect(tx.submission.update).not.toHaveBeenCalled();
    expect(tx.submissionQuestions.update).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
    expect(notifications.emitSavedNotification).not.toHaveBeenCalled();
  });

  it.each([
    [0.9, 'EXCELLENT'],
    [0.7, 'GOOD'],
    [0.5, 'AVERAGE'],
    [0.49, 'POOR'],
  ] as const)(
    'publishes score %s using existing rating %s',
    async (score, rating) => {
      const { service, id, owner, body, tx, row, notifications } = setup();
      row.regradeDraft = {
        revision: 1,
        base_grade_revision: 0,
        scores: [{ ...body.scores[0], score }],
        reason: '',
      };
      await service.publish(id, owner, { revision: 1 });
      expect(tx.submission.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          total_score: score * 10,
          rating,
          grading_revision: { increment: 1 },
        },
      });
      expect(tx.submissionRegradePublication.create).toHaveBeenCalledTimes(1);
      expect(tx.notification.create).toHaveBeenCalledTimes(1);
      expect(notifications.emitSavedNotification).toHaveBeenCalledTimes(1);
    },
  );

  it('returns idempotently on a committed publication without writing or re-emitting', async () => {
    const { service, id, owner, tx, row, notifications } = setup();
    row.regradePublications = [{ revision: 1 }];
    await service.publish(id, owner, { revision: 1 });
    expect(tx.submission.update).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
    expect(notifications.emitSavedNotification).not.toHaveBeenCalled();
  });
});
