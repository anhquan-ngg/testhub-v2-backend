import { BadRequestException } from '@nestjs/common';
import { ExamsService } from './exams.service';
import type { ExamsRepository } from './exams.repository';
import type { ExamRuntimeQueueService } from '@/exam-runtime/exam-runtime-queue.service';
import type { ExamRuntimeService } from '@/exam-runtime/exam-runtime.service';
import type { CreateExamDto } from './dto/create-exam.dto';

const typeRows = JSON.stringify([
  { question_type: 'SINGLE_CHOICE', question_format: 'KNOWLEDGE', quantity: 3 },
  {
    question_type: 'SINGLE_CHOICE',
    question_format: 'UNDERSTANDING',
    quantity: 3,
  },
]);

function build(
  current?: Record<string, unknown>,
  capacity: number[] = [10, 10],
  chapterCandidates: string[][] = [],
) {
  const repo = {
    create: jest.fn().mockImplementation((_id: string, dto: unknown) => dto),
    update: jest.fn().mockImplementation((_id: string, dto: unknown) => dto),
    findById: jest.fn().mockResolvedValue(current ?? null),
    validateChapterDistribution: jest.fn().mockResolvedValue(undefined),
  };
  const queue = { scheduleExam: jest.fn() };
  const runtime = {
    countTypeCapacity: jest.fn().mockResolvedValue(capacity),
    loadChapterCapacity: jest.fn().mockResolvedValue(chapterCandidates),
  };
  const service = new ExamsService(
    repo as unknown as ExamsRepository,
    queue as unknown as ExamRuntimeQueueService,
    runtime as unknown as ExamRuntimeService,
  );
  return { service, repo };
}

const base = { mode: 'BY_TYPE', topic_id: 't', distribution: typeRows };

describe('ExamsService distribution_delta', () => {
  it('rejects a positive delta for modes without distribution', async () => {
    const { service } = build();
    await expect(
      service.create('u', {
        mode: 'RANDOM_N',
        topic_id: 't',
        distribution_delta: 1,
      } as unknown as CreateExamDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps the stored delta when update omits it', async () => {
    const { service, repo } = build({ ...base, distribution_delta: 2 });
    await service.update('e', { title: 'x' } as never);
    expect(updateArg(repo)).not.toHaveProperty('distribution_delta');
  });

  it('resets the delta when the mode no longer supports it', async () => {
    const { service, repo } = build({ ...base, distribution_delta: 2 });
    await service.update('e', { mode: 'RANDOM_N' } as never);
    expect(updateArg(repo)).toMatchObject({
      distribution_delta: 0,
    });
  });

  it('turns the online flag off when the delta is set to 0', async () => {
    const { service, repo } = build({
      ...base,
      distribution_delta: 2,
      distribution_delta_online: true,
    });
    await service.update('e', { distribution_delta: 0 } as never);
    expect(updateArg(repo)).toMatchObject({
      distribution_delta: 0,
      distribution_delta_online: false,
    });
  });

  it('keeps the online flag when the delta stays positive', async () => {
    const { service, repo } = build({
      ...base,
      distribution_delta: 1,
      distribution_delta_online: true,
    });
    await service.update('e', { title: 'x' } as never);
    expect(updateArg(repo)).not.toHaveProperty('distribution_delta_online');
  });

  it('accepts a delta for BY_TYPE and rejects a malformed distribution', async () => {
    const { service, repo } = build();
    await service.create('u', {
      ...base,
      distribution_delta: 1,
    } as unknown as CreateExamDto);
    expect(repo.create).toHaveBeenCalled();
    await expect(
      service.create('u', {
        ...base,
        distribution: '[]',
        distribution_delta: 1,
      } as unknown as CreateExamDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function updateArg(repo: { update: jest.Mock }): Record<string, unknown> {
  return (repo.update.mock.calls as unknown[][])[0][1] as Record<
    string,
    unknown
  >;
}

describe('ExamsService.checkDistributionDelta', () => {
  it('returns a feasibility estimate for BY_TYPE', async () => {
    const { service } = build(undefined, [10, 10]);
    const result = await service.checkDistributionDelta({
      topic_id: 't',
      mode: 'BY_TYPE',
      distribution: typeRows,
      distribution_delta: 1,
    } as never);
    expect(result.baseline_feasible).toBe(true);
    expect(result.max_feasible_d).toBe(1);
  });

  it('warns when the bank has no spare questions', async () => {
    const { service } = build(undefined, [3, 3]);
    const result = await service.checkDistributionDelta({
      topic_id: 't',
      mode: 'BY_TYPE',
      distribution: typeRows,
      distribution_delta: 1,
    } as never);
    expect(result.warnings.map((w) => w.code)).toContain(
      'NO_FEASIBLE_VARIATION',
    );
  });

  it('returns a feasibility estimate for BY_CHAPTER', async () => {
    const chapterRows = ['1', '2'].map((n) => ({
      chapter_id: `00000000-0000-4000-8000-00000000000${n}`,
      quantity: 3,
    }));
    const pool = (p: string) =>
      Array.from({ length: 10 }, (_, i) => `${p}${i}`);
    const { service, repo } = build(undefined, [], [pool('a'), pool('b')]);
    const result = await service.checkDistributionDelta({
      topic_id: 't',
      mode: 'BY_CHAPTER',
      distribution: JSON.stringify(chapterRows),
      distribution_delta: 1,
    } as never);
    expect(repo.validateChapterDistribution).toHaveBeenCalled();
    expect(result.baseline_feasible).toBe(true);
    expect(result.max_feasible_d).toBe(1);
  });

  it('rejects unsupported modes', async () => {
    const { service } = build();
    await expect(
      service.checkDistributionDelta({
        topic_id: 't',
        mode: 'RANDOM_N',
        distribution: '[]',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
