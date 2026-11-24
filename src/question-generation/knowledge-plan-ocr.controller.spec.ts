import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import type { Server } from 'node:http';
import request from 'supertest';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { DocumentClient } from '../learning-documents/document-client.service';
import { DocumentController } from '../learning-documents/document.controller';
import { DocumentRepository } from '../learning-documents/document.repository';
import { DocumentService } from '../learning-documents/document.service';
import { RagClient } from '../learning-documents/rag-client.service';
import { S3Service } from '../s3/s3.service';
import { DocumentGenerationService } from './document-generation.service';
import { GenerationBatchService } from './generation-batch.service';
import { KnowledgePlanController } from './knowledge-plan.controller';
import { KnowledgePlanRepository } from './knowledge-plan.repository';
import { KnowledgePlanService } from './knowledge-plan.service';

const owner = '11111111-1111-4111-8111-111111111111';
const plan = '22222222-2222-4222-8222-222222222222';
const child = '33333333-3333-4333-8333-333333333333';

describe('Explicit plan OCR HTTP contracts (mocked infrastructure)', () => {
  let app: INestApplication;
  const documents = { requestPlanOcr: jest.fn(), versionDetail: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [KnowledgePlanController, DocumentController],
      providers: [
        KnowledgePlanService,
        DocumentService,
        { provide: DocumentRepository, useValue: documents },
        { provide: KnowledgePlanRepository, useValue: {} },
        { provide: DocumentGenerationService, useValue: {} },
        { provide: GenerationBatchService, useValue: {} },
        { provide: S3Service, useValue: {} },
        { provide: DocumentClient, useValue: { enabled: true } },
        { provide: RagClient, useValue: { enabled: true } },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context
            .switchToHttp()
            .getRequest<{ headers: Record<string, string>; user: unknown }>();
          if (req.headers['x-anonymous']) throw new UnauthorizedException();
          req.user = {
            id: owner,
            role: req.headers['x-role'] ?? UserRole.LECTURER,
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
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
    documents.requestPlanOcr.mockResolvedValue({ version_id: child });
    documents.versionDetail.mockResolvedValue({
      id: child,
      document_id: plan,
      status: 'QUEUED',
      quality: null,
      ocr_request: {
        origin_plan_id: plan,
        origin_revision: 2,
        parent_version_id: owner,
        positions: [1],
        pages: [{ position: 1, status: 'PENDING' }],
        deliveries: 0,
        status: 'PENDING',
      },
    });
  });
  it('requires authentication and lecturer role before initial OCR or explicit retry', async () => {
    for (const suffix of ['ocr', 'ocr/retry']) {
      await request(app.getHttpServer() as Server)
        .post(`/question-generation-plans/${plan}/${suffix}`)
        .set('x-anonymous', 'true')
        .send({ revision: 2, consent: true })
        .expect(401);
      await request(app.getHttpServer() as Server)
        .post(`/question-generation-plans/${plan}/${suffix}`)
        .set('x-role', UserRole.STUDENT)
        .send({ revision: 2, consent: true })
        .expect(403);
    }
    expect(documents.requestPlanOcr).not.toHaveBeenCalled();
  });
  it('preserves strict raw consent/revision and rejects client-supplied positions, keys or source IDs', async () => {
    for (const body of [
      { revision: '2', consent: true },
      { revision: 2, consent: 'true' },
      { revision: 2, consent: false },
      { revision: 2 },
      { revision: 2, consent: true, positions: [1] },
      { revision: 2, consent: true, source_key: 'private' },
      { revision: 2, consent: true, version_id: child },
    ]) {
      await request(app.getHttpServer() as Server)
        .post(`/question-generation-plans/${plan}/ocr`)
        .send(body)
        .expect(400);
    }
    await request(app.getHttpServer() as Server)
      .post('/question-generation-plans/not-a-uuid/ocr')
      .send({ revision: 2, consent: true })
      .expect(400);
    expect(documents.requestPlanOcr).not.toHaveBeenCalled();
  });
  it('returns a stable recovery version on canonical and compatibility routes without generating a plan or batch', async () => {
    for (const prefix of ['question-generation-plans', 'knowledge-plans']) {
      const response = await request(app.getHttpServer() as Server)
        .post(`/${prefix}/${plan}/ocr`)
        .send({ revision: 2, consent: true })
        .expect(202);
      expect(response.body).toEqual({ version_id: child });
    }
    expect(documents.requestPlanOcr).toHaveBeenLastCalledWith(owner, plan, 2);
  });
  it('requires a specific failed version and fresh explicit consent for the immutable retry', async () => {
    await request(app.getHttpServer() as Server)
      .post(`/question-generation-plans/${plan}/ocr/retry`)
      .send({ revision: 2, consent: true })
      .expect(400);
    const response = await request(app.getHttpServer() as Server)
      .post(`/question-generation-plans/${plan}/ocr/retry`)
      .send({ revision: 2, consent: true, version_id: child })
      .expect(202);
    expect(response.body).toEqual({ version_id: child });
    expect(documents.requestPlanOcr).toHaveBeenCalledWith(
      owner,
      plan,
      2,
      child,
    );
  });
  it('polls safe owned metadata without invoking either paid action and returns 404 outside owner scope', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get(`/learning-documents/versions/${child}`)
      .expect(200);
    expect(response.body).toMatchObject({
      id: child,
      document_id: plan,
      status: 'QUEUED',
      ocr_request: { status: 'PENDING' },
    });
    expect(documents.versionDetail).toHaveBeenCalledWith(owner, child);
    expect(documents.requestPlanOcr).not.toHaveBeenCalled();
    documents.versionDetail.mockResolvedValueOnce(null);
    await request(app.getHttpServer() as Server)
      .get(`/learning-documents/versions/${child}`)
      .expect(404);
  });
});
