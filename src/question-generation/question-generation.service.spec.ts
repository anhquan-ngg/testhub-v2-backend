import { UserRole, UserStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { AiQuestionClient } from './ai-question-client.service';
import { AI_HTTP_FETCH, AI_SERVICE_OPTIONS } from './ai-service.config';
import { readContractFixture } from './fixtures/contract-fixture';
import { QuestionGenerationModule } from './question-generation.module';
import { QuestionGenerationRepository } from './question-generation.repository';
import { QuestionGenerationService } from './question-generation.service';
import { PrismaService } from '../prisma/prisma.service';

const fixture = readContractFixture();
const actor = {
  id: '33333333-3333-4333-8333-333333333333',
  role: UserRole.LECTURER,
};
const owned = {
  id: fixture.command.chapter_id,
  topic: { id: fixture.command.topic_id, name: fixture.internal_request.topic },
};

function setup() {
  const repository = { findOwnedTarget: jest.fn().mockResolvedValue(owned) };
  const client = {
    generate: jest.fn().mockResolvedValue(fixture.internal_response),
  };
  const service = new QuestionGenerationService(
    repository as unknown as QuestionGenerationRepository,
    client as unknown as AiQuestionClient,
  );
  return { repository, client, service };
}

describe('QuestionGenerationService authorization', () => {
  it('uses the DB topic label, authorizes before and after disclosure, and returns drafts', async () => {
    const { service, repository, client } = setup();
    await expect(
      service.generateDrafts(actor, fixture.command),
    ).resolves.toEqual({
      topic_id: owned.topic.id,
      chapter_id: owned.id,
      questions: fixture.internal_response.questions,
    });
    expect(repository.findOwnedTarget).toHaveBeenCalledTimes(2);
    expect(repository.findOwnedTarget).toHaveBeenCalledWith({
      ownerId: actor.id,
      topicId: owned.topic.id,
      chapterId: owned.id,
    });
    expect(client.generate).toHaveBeenCalledWith(fixture.internal_request);
    expect(repository.findOwnedTarget.mock.invocationCallOrder[0]).toBeLessThan(
      client.generate.mock.invocationCallOrder[0],
    );
  });

  it.each([UserRole.STUDENT, UserRole.ADMIN])(
    'rejects %s before any DB/AI call',
    async (role) => {
      const { service, repository, client } = setup();
      await expect(
        service.generateDrafts({ ...actor, role }, fixture.command),
      ).rejects.toMatchObject({ code: 'AI_ROLE_FORBIDDEN' });
      expect(repository.findOwnedTarget).not.toHaveBeenCalled();
      expect(client.generate).not.toHaveBeenCalled();
    },
  );

  it('hides missing, foreign, deleted or mismatched targets', async () => {
    const { service, repository, client } = setup();
    repository.findOwnedTarget.mockResolvedValue(null);
    await expect(
      service.generateDrafts(actor, fixture.command),
    ).rejects.toMatchObject({ code: 'AI_TARGET_NOT_FOUND' });
    expect(client.generate).not.toHaveBeenCalled();
  });

  it('discards results when ownership is revoked during generation', async () => {
    const { service, repository } = setup();
    repository.findOwnedTarget
      .mockResolvedValueOnce(owned)
      .mockResolvedValueOnce(null);
    await expect(
      service.generateDrafts(actor, fixture.command),
    ).rejects.toMatchObject({ code: 'AI_TARGET_NOT_FOUND' });
  });

  it.each([false, undefined, 'true'])(
    'requires explicit consent (%s)',
    async (consent) => {
      const { service, repository, client } = setup();
      await expect(
        service.generateDrafts(actor, {
          ...fixture.command,
          external_processing_consent: consent,
        }),
      ).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });
      expect(repository.findOwnedTarget).not.toHaveBeenCalled();
      expect(client.generate).not.toHaveBeenCalled();
    },
  );

  it('rejects forged topic labels and ignores no extra command fields', async () => {
    const { service, client } = setup();
    await expect(
      service.generateDrafts(actor, { ...fixture.command, topic: 'forged' }),
    ).rejects.toMatchObject({ code: 'AI_REQUEST_INVALID' });
    expect(client.generate).not.toHaveBeenCalled();
  });

  it('encodes all ownership predicates in the Prisma read', async () => {
    const prisma = {
      chapter: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const repository = new QuestionGenerationRepository(
      prisma as unknown as PrismaService,
    );
    await repository.findOwnedTarget({
      ownerId: actor.id,
      topicId: owned.topic.id,
      chapterId: owned.id,
    });
    expect(prisma.chapter.findFirst).toHaveBeenCalledWith({
      where: {
        id: owned.id,
        topic_id: owned.topic.id,
        is_deleted: false,
        topic: {
          id: owned.topic.id,
          created_by: actor.id,
          is_deleted: false,
          creator: { role: UserRole.LECTURER, status: UserStatus.ACTIVE },
        },
      },
      select: { id: true, topic: { select: { id: true, name: true } } },
    });
  });

  it('wires through Nest DI with no external connections when disabled', async () => {
    const httpFetch = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const module = await Test.createTestingModule({
      imports: [QuestionGenerationModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ chapter: { findFirst: jest.fn().mockResolvedValue(owned) } })
      .overrideProvider(AI_SERVICE_OPTIONS)
      .useValue({ enabled: false })
      .overrideProvider(AI_HTTP_FETCH)
      .useValue(httpFetch)
      .compile();
    try {
      await expect(
        module
          .get(QuestionGenerationService)
          .generateDrafts(actor, fixture.command),
      ).rejects.toMatchObject({ code: 'AI_GENERATION_DISABLED' });
      expect(httpFetch).not.toHaveBeenCalled();
    } finally {
      await module.close();
    }
  });
});
