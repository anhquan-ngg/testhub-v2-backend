import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import type { Server } from 'node:http';
import { GenerationBatchController } from './generation-batch.controller';
import { GenerationBatchService } from './generation-batch.service';
import { GenerationBatchRepository } from './generation-batch.repository';
import { GenerationReviewService } from './generation-review.service';
import { QuestionGenerationService } from './question-generation.service';
import { QuestionGenerationRepository } from './question-generation.repository';
import { AiQuestionClient } from './ai-question-client.service';
import { DocumentGenerationService } from './document-generation.service';
import { AI_SERVICE_OPTIONS } from './ai-service.config';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { readContractFixture } from './fixtures/contract-fixture';
import { QuestionGenerationException } from './question-generation.errors';
import { HttpStatus } from '@nestjs/common';

describe('Document generation public contract', () => {
  let app: INestApplication;
  const fixture = readContractFixture();
  const owner = '33333333-3333-4333-8333-333333333333';
  const command = {
    ...fixture.command,
    source: {
      mode: 'document',
      version_id: '44444444-4444-4444-8444-444444444444',
      query: 'Stack',
    },
  };
  const batches = { create: jest.fn() };
  const docs = { authorize: jest.fn() };
  const targets = { findOwnedTarget: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GenerationBatchController],
      providers: [
        GenerationBatchService,
        QuestionGenerationService,
        { provide: GenerationBatchRepository, useValue: batches },
        { provide: GenerationReviewService, useValue: {} },
        { provide: DocumentGenerationService, useValue: docs },
        { provide: QuestionGenerationRepository, useValue: targets },
        { provide: AiQuestionClient, useValue: {} },
        { provide: AI_SERVICE_OPTIONS, useValue: { enabled: true } },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context
            .switchToHttp()
            .getRequest<{ user: unknown; headers: Record<string, string> }>();
          req.user = { id: owner, role: req.headers['x-role'] ?? 'LECTURER' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    targets.findOwnedTarget.mockResolvedValue({
      id: command.chapter_id,
      topic: { id: command.topic_id, name: 'Data' },
    });
    docs.authorize.mockResolvedValue({});
    batches.create.mockResolvedValue({ id: 'batch', status: 'WAITING_SOURCE' });
  });
  it('accepts an immutable version command through DTO and Zod validation', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/question-generation-batches')
      .set('Idempotency-Key', 'document-command-fixture')
      .send(command)
      .expect(202);
    expect(response.body).toMatchObject({ status: 'WAITING_SOURCE' });
    expect(docs.authorize).toHaveBeenCalledWith(owner, command);
    expect(batches.create).toHaveBeenCalledWith(
      expect.objectContaining({ command, ownerId: owner }),
    );
  });
  it('accepts ordered mixed rows and normalizes the legacy single-row form', async () => {
    const questionConfigs = [
      {
        question_type: 'MULTIPLE_CHOICE',
        question_format: 'APPLYING',
        count: 2,
      },
      {
        question_type: 'SINGLE_CHOICE',
        question_format: 'KNOWLEDGE',
        count: 3,
      },
    ];
    const { question_configs: legacyConfigs, ...legacy } = command;
    for (const [input, expected] of [
      [
        { ...command, question_configs: questionConfigs },
        { ...command, question_configs: questionConfigs },
      ],
      [{ ...legacy, ...legacyConfigs[0] }, command],
    ] as const) {
      batches.create.mockClear();
      await request(app.getHttpServer() as Server)
        .post('/question-generation-batches')
        .set('Idempotency-Key', 'document-command-fixture')
        .send(input)
        .expect(202);
      expect(batches.create).toHaveBeenCalledWith(
        expect.objectContaining({ command: expected }),
      );
    }
  });
  it('rejects unknown source keys, coerced numbers and missing consent before disclosure', async () => {
    const [config] = command.question_configs;
    for (const input of [
      { ...command, source: { ...command.source, object_key: 'foreign' } },
      { ...command, count: '1' },
      { ...command, question_configs: [{ ...config, count: '1' }] },
      { ...command, question_configs: [{ ...config, essay: true }] },
      { ...command, question_configs: [{ ...config, question_type: 'ESSAY' }] },
      { ...command, question_configs: [{ ...config, count: 21 }] },
      { ...command, external_processing_consent: false },
      { ...command, source: { mode: 'document', version_id: 'invalid' } },
    ])
      await request(app.getHttpServer() as Server)
        .post('/question-generation-batches')
        .set('Idempotency-Key', 'document-command-fixture')
        .send(input)
        .expect(400);
    expect(docs.authorize).not.toHaveBeenCalled();
    expect(batches.create).not.toHaveBeenCalled();
  });
  it('denies foreign document access and student requests', async () => {
    docs.authorize.mockRejectedValue(
      new QuestionGenerationException(
        'AI_DOCUMENT_SOURCE_INVALID',
        HttpStatus.CONFLICT,
        'Unavailable source',
      ),
    );
    await request(app.getHttpServer() as Server)
      .post('/question-generation-batches')
      .set('Idempotency-Key', 'document-command-fixture')
      .send(command)
      .expect(409);
    await request(app.getHttpServer() as Server)
      .post('/question-generation-batches')
      .set('x-role', 'STUDENT')
      .set('Idempotency-Key', 'document-command-fixture')
      .send(command)
      .expect(403);
    expect(batches.create).not.toHaveBeenCalled();
  });
  it('publishes both source shapes in Swagger', () => {
    const schema = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    expect(schema.components?.schemas).toHaveProperty(
      'DocumentGenerationSourceDto',
    );
    expect(schema.components?.schemas).toHaveProperty(
      'TextGenerationSourceDto',
    );
  });
});
