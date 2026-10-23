import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { S3Service } from '../s3/s3.service';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentRepository } from './document.repository';
import { DocumentClient } from './document-client.service';

describe('Learning document HTTP validation, role and safe failures', () => {
  let app: INestApplication;
  const repository = { target: jest.fn(), create: jest.fn() };
  const storage = {
    createUploadUrl: jest
      .fn()
      .mockResolvedValue({ url: 'http://storage.invalid/test-only-upload' }),
  };
  const command = {
    title: 'Lecture',
    topic_id: '11111111-1111-4111-8111-111111111111',
    chapter_id: '22222222-2222-4222-8222-222222222222',
    upload: {
      file_name: 'lecture.pdf',
      source_type: 'PDF',
      mime_type: 'application/pdf',
      size: 200,
      consent: true,
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DocumentController, RagController],
      providers: [
        DocumentService,
        {
          provide: RagService,
          useValue: { start: jest.fn(), retry: jest.fn(), retrieve: jest.fn() },
        },
        { provide: DocumentRepository, useValue: repository },
        { provide: S3Service, useValue: storage },
        { provide: DocumentClient, useValue: { enabled: true } },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context
            .switchToHttp()
            .getRequest<{ user: unknown; headers: Record<string, string> }>();
          req.user = {
            id: 'owner',
            role: req.headers['x-test-role'] ?? UserRole.LECTURER,
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
  beforeEach(() => {
    jest.clearAllMocks();
    repository.target.mockResolvedValue({ id: command.chapter_id });
    repository.create.mockResolvedValue({ id: 'document' });
  });
  afterAll(async () => {
    await app?.close();
  });
  it('rejects students before creating a document', async () => {
    await request(app.getHttpServer() as Server)
      .post('/learning-documents')
      .set('x-test-role', UserRole.STUDENT)
      .send(command)
      .expect(403);
    expect(repository.target).not.toHaveBeenCalled();
  });
  it('does not coerce consent or size through the global transformation pipe', async () => {
    for (const patch of [
      { consent: 'true' },
      { size: '200' },
      { consent: false },
    ])
      await request(app.getHttpServer() as Server)
        .post('/learning-documents')
        .send({ ...command, upload: { ...command.upload, ...patch } })
        .expect(400);
    await request(app.getHttpServer() as Server)
      .post('/learning-documents')
      .send({ ...command, object_key: 'attacker' })
      .expect(400);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('checks owner target and returns a reserved upload without private source keys', async () => {
    repository.target.mockResolvedValueOnce(null);
    await request(app.getHttpServer() as Server)
      .post('/learning-documents')
      .send(command)
      .expect(404);
    const result = await request(app.getHttpServer() as Server)
      .post('/learning-documents')
      .send(command)
      .expect(201);
    expect(result.body).toMatchObject({
      max_bytes: 20971520,
      upload_url: 'http://storage.invalid/test-only-upload',
    });
    expect(JSON.stringify(result.body)).not.toContain('source_key');
  });
  it('sanitizes database/storage exceptions', async () => {
    repository.create.mockRejectedValueOnce(
      new Error('private-connection-and-source-value'),
    );
    const result = await request(app.getHttpServer() as Server)
      .post('/learning-documents')
      .send(command)
      .expect(503);
    expect(JSON.stringify(result.body)).not.toContain(
      'private-connection-and-source-value',
    );
  });
  it('exposes the intended routes/body in generated Swagger', () => {
    const spec = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    expect(spec.paths['/learning-documents']?.post?.requestBody).toBeDefined();
    expect(
      spec.paths['/learning-documents/{id}/versions/{versionId}/complete']?.post
        ?.responses['202'],
    ).toBeDefined();
    expect(
      spec.paths['/learning-documents/{id}/versions/{versionId}/content']?.get,
    ).toBeDefined();
  });
  it('guards every RAG route against student access', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    for (const path of [
      `/learning-documents/${id}/versions/${id}/index`,
      `/learning-documents/indexes/${id}/retry`,
      '/learning-documents/retrieve',
    ])
      await request(app.getHttpServer() as Server)
        .post(path)
        .set('x-test-role', UserRole.STUDENT)
        .send({})
        .expect(403);
  });
});
