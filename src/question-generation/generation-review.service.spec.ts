import { ConflictException, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { GenerationReviewRepository } from './generation-review.repository';
import { GenerationReviewService } from './generation-review.service';
import { readContractFixture } from './fixtures/contract-fixture';

const actor = {
  id: '33333333-3333-4333-8333-333333333333',
  role: UserRole.LECTURER,
};
const fixture = readContractFixture();
function setup() {
  const repository = {
    edit: jest.fn().mockResolvedValue({ revision: 2 }),
    review: jest.fn().mockResolvedValue({ revision: 2 }),
    commit: jest.fn().mockResolvedValue({ questions: [] }),
  };
  return {
    repository,
    service: new GenerationReviewService(
      repository as unknown as GenerationReviewRepository,
    ),
  };
}

describe('GenerationReviewService boundary', () => {
  it.each([UserRole.STUDENT, UserRole.ADMIN])(
    'denies %s without touching storage',
    (role) => {
      const { repository, service } = setup();
      expect(() =>
        service.review({ ...actor, role }, 'batch', 'item', {
          revision: 1,
          decision: 'APPROVE',
        }),
      ).toThrow('Lecturer required');
      expect(repository.review).not.toHaveBeenCalled();
    },
  );
  it.each([
    { revision: '1', decision: 'APPROVE' },
    { revision: 1, decision: 'APPROVE', reviewed_by: actor.id },
    { revision: 1, decision: 'COMMIT' },
  ])('rejects raw invalid review input %j', (input) => {
    const { repository, service } = setup();
    expect(() => service.review(actor, 'batch', 'item', input)).toThrow(
      'Invalid draft/review command',
    );
    expect(repository.review).not.toHaveBeenCalled();
  });
  it('refuses invalid or non-distinct answers before saving', () => {
    const { repository, service } = setup();
    const question = fixture.internal_response.questions[0];
    expect(() =>
      service.edit(actor, 'batch', 'item', {
        revision: 1,
        data: {
          ...question,
          options: question.options.map((option) => ({
            ...option,
            isCorrect: false,
          })),
        },
      }),
    ).toThrow('Invalid draft/review command');
    expect(repository.edit).not.toHaveBeenCalled();
  });
  it('forwards only the normalized edit and authenticated actor', async () => {
    const { repository, service } = setup();
    const question = fixture.internal_response.questions[0];
    await service.edit(actor, 'batch', 'item', {
      revision: 1,
      data: { ...question, question_text: `  ${question.question_text}  ` },
    });
    expect(repository.edit).toHaveBeenCalledWith(actor.id, 'batch', 'item', {
      revision: 1,
      data: question,
    });
  });
  it('preserves a real revision conflict', async () => {
    const { repository, service } = setup();
    repository.review.mockRejectedValue(new ConflictException('Draft changed'));
    await expect(
      service.review(actor, 'batch', 'item', {
        revision: 1,
        decision: 'APPROVE',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('sanitizes source-bearing database errors and does not retry an ambiguous commit', async () => {
    const { repository, service } = setup();
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    try {
      repository.commit.mockRejectedValue(
        new Error('private source/token/SQL'),
      );
      await expect(
        service.commit(actor, 'batch', {
          items: [{ id: fixture.command.topic_id, revision: 2 }],
        }),
      ).rejects.toMatchObject({ status: 503 });
      expect(repository.commit).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
    } finally {
      warn.mockRestore();
    }
  });
});
