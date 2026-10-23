import { RagRepository } from './rag.repository';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DocumentRepository } from './document.repository';
import { PrismaService } from '../prisma/prisma.service';

const databaseUrl = process.env.TESTHUB_AI_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

// Isolated schema in a disposable loopback *_test database, never the user's DB.
integration(
  'DocumentRepository PostgreSQL claims, revocation and immutable versions',
  () => {
    const schema = `doc_test_${randomUUID().replaceAll('-', '')}`;
    const owner = randomUUID(),
      foreign = randomUUID(),
      topic = randomUUID(),
      chapter = randomUUID(),
      doc = randomUUID(),
      versionId = randomUUID();
    let pool: Pool;
    let prisma: PrismaClient;
    let repository: DocumentRepository;
    beforeAll(async () => {
      if (
        !databaseUrl ||
        !['127.0.0.1', 'localhost'].includes(new URL(databaseUrl).hostname) ||
        !new URL(databaseUrl).pathname.endsWith('_test')
      )
        throw new Error('Use a disposable loopback *_test database');
      pool = new Pool({ connectionString: databaseUrl });
      const sql = execFileSync(
        process.execPath,
        [
          'node_modules/prisma/build/index.js',
          'migrate',
          'diff',
          '--from-empty',
          '--to-schema',
          'prisma/schema.prisma',
          '--script',
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      const connection = await pool.connect();
      try {
        // Identifier consists only of a fixed prefix and an internally generated UUID.
        await connection.query(`CREATE SCHEMA "${schema}"`);
        await connection.query(`SET search_path TO "${schema}"`);
        await connection.query(
          sql
            .replace('CREATE SCHEMA IF NOT EXISTS "public";', '')
            .replaceAll('"public".', `"${schema}".`),
        );
      } finally {
        connection.release();
      }
      prisma = new PrismaClient({
        adapter: new PrismaPg(
          {
            connectionString: databaseUrl,
            options: `-c search_path=${schema}`,
          },
          { schema },
        ),
      });
      repository = new DocumentRepository(prisma as PrismaService);
      await prisma.user.createMany({
        data: [
          {
            id: owner,
            full_name: 'Fixture owner',
            email: `${owner}@example.test`,
            role: UserRole.LECTURER,
          },
          {
            id: foreign,
            full_name: 'Other fixture',
            email: `${foreign}@example.test`,
            role: UserRole.LECTURER,
          },
        ],
      });
      await prisma.topic.create({
        data: { id: topic, created_by: owner, name: 'Fixture topic' },
      });
      await prisma.chapter.create({
        data: {
          id: chapter,
          topic_id: topic,
          name: 'Fixture chapter',
          order: 1,
        },
      });
      await repository.create({
        id: doc,
        ownerId: owner,
        title: 'Fixture document',
        topicId: topic,
        chapterId: chapter,
        version: {
          id: versionId,
          version: 1,
          file_name: 'text.pdf',
          source_type: 'PDF',
          mime_type: 'application/pdf',
          declared_size: 100,
          consented_at: new Date(),
          upload_key: `fixture/${versionId}`,
          upload_expires_at: new Date(Date.now() + 3600_000),
        },
      });
    }, 30000);
    afterAll(async () => {
      await prisma?.$disconnect();
      if (pool) {
        await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await pool.end();
      }
    });
    it('denies foreign readers and completion commands', async () => {
      expect(await repository.detail(foreign, doc)).toBeNull();
      expect(
        (
          await repository.complete(
            foreign,
            versionId,
            'source',
            'a'.repeat(64),
          )
        ).count,
      ).toBe(0);
      expect(
        (await repository.complete(owner, versionId, 'source', 'a'.repeat(64)))
          .count,
      ).toBe(1);
    });
    it('claims exactly once under duplicate deliveries and fences old executions', async () => {
      const first = randomUUID(),
        second = randomUUID();
      const claims = await Promise.all([
        repository.claim(versionId, first),
        repository.claim(versionId, second),
      ]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      const token = claims[0] ? first : second;
      expect(
        (
          await repository.finish(
            versionId,
            randomUUID(),
            { status: 'EXTRACTED' },
            owner,
          )
        ).count,
      ).toBe(0);
      expect(await repository.active(versionId, token, owner)).not.toBeNull();
      await prisma.learningDocumentVersion.update({
        where: { id: versionId },
        data: { lease_expires_at: new Date(0) },
      });
      await repository.recover();
      expect(
        (
          await prisma.learningDocumentVersion.findUniqueOrThrow({
            where: { id: versionId },
          })
        ).status,
      ).toBe('QUEUED');
      expect(
        (
          await repository.finish(
            versionId,
            token,
            { status: 'EXTRACTED' },
            owner,
          )
        ).count,
      ).toBe(0);
    });
    it('allocates unique version numbers under simultaneous uploads', async () => {
      const results = await Promise.all(
        [1, 2].map(() =>
          repository.addVersion(owner, doc, {
            version: 1,
            file_name: 'replacement.pdf',
            source_type: 'PDF',
            mime_type: 'application/pdf',
            declared_size: 100,
            consented_at: new Date(),
            upload_key: randomUUID(),
            upload_expires_at: new Date(Date.now() + 3600_000),
          }),
        ),
      );
      expect(results.every(Boolean)).toBe(true);
      const versions = await prisma.learningDocumentVersion.findMany({
        where: { document_id: doc },
        orderBy: { version: 'asc' },
      });
      expect(versions.map((v) => v.version)).toEqual([1, 2, 3]);
      expect(versions[0].source_sha256).toBe('a'.repeat(64));
    });
    it('replays unique indexes and fences duplicate/expired indexing steps', async () => {
      await prisma.learningDocumentVersion.update({
        where: { id: versionId },
        data: { status: 'EXTRACTED' },
      });
      const rag = new RagRepository(prisma as PrismaService, repository);
      const profile = {
        profile_id: 'c'.repeat(64),
        config: { model: 'fixture' },
      };
      expect(await rag.create(foreign, doc, versionId, profile)).toBeNull();
      const started = await Promise.all([
        rag.create(owner, doc, versionId, profile),
        rag.create(owner, doc, versionId, profile),
      ]);
      expect(started[0]?.id).toBe(started[1]?.id);
      const id = started[0]?.id;
      if (!id) throw new Error('Missing fixture index');
      const a = randomUUID(),
        b = randomUUID();
      const claims = await Promise.all([rag.claim(id, a), rag.claim(id, b)]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      const token = claims[0] ? a : b;
      expect(
        (await rag.finish(id, randomUUID(), owner, { status: 'READY' })).count,
      ).toBe(0);
      await prisma.learningDocumentIndex.update({
        where: { id },
        data: { lease_expires_at: new Date(0) },
      });
      await rag.recover();
      expect(
        (await rag.finish(id, token, owner, { status: 'READY' })).count,
      ).toBe(0);
      const next = randomUUID();
      expect(await rag.claim(id, next)).not.toBeNull();
      expect(
        (
          await rag.finish(id, next, owner, {
            status: 'READY',
            prepared: true,
            chunk_count: 1,
            completed_chunks: 1,
          })
        ).count,
      ).toBe(1);
      expect(await rag.detail(foreign, id)).toBeNull();
      await prisma.learningDocumentVersion.update({
        where: { id: versionId },
        data: { status: 'QUEUED' },
      });
    });
    it.each(['topic', 'chapter'] as const)(
      'blocks direct source deletion but allows a %s cascade in one statement',
      async (root) => {
        const sourceTopic = await prisma.topic.create({
          data: { created_by: owner, name: 'Cascade fixture' },
        });
        const sourceChapter = await prisma.chapter.create({
          data: { topic_id: sourceTopic.id, name: 'Cascade chapter', order: 1 },
        });
        const document = await prisma.learningDocument.create({
          data: {
            created_by: owner,
            topic_id: sourceTopic.id,
            chapter_id: sourceChapter.id,
            title: 'Cascade source',
            versions: {
              create: {
                version: 1,
                file_name: 'fixture.pdf',
                source_type: 'PDF',
                mime_type: 'application/pdf',
                declared_size: 100,
                consented_at: new Date(),
                upload_key: randomUUID(),
                upload_expires_at: new Date(Date.now() + 60_000),
              },
            },
          },
          include: { versions: true },
        });
        const version = document.versions[0];
        const index = await prisma.learningDocumentIndex.create({
          data: {
            version_id: version.id,
            owner_id: owner,
            profile_id: 'f'.repeat(64),
            profile: { model: 'fixture' },
          },
        });
        const batch = await prisma.questionGenerationBatch.create({
          data: {
            created_by: owner,
            topic_id: sourceTopic.id,
            chapter_id: sourceChapter.id,
            idempotency_key: randomUUID(),
            request_hash: 'a'.repeat(64),
            source_text: '',
            source_mode: 'document',
            source_version_id: version.id,
            source_index_id: index.id,
            question_format: 'KNOWLEDGE',
            requested_count: 1,
            consented_at: new Date(),
          },
        });
        await expect(
          prisma.learningDocumentIndex.delete({ where: { id: index.id } }),
        ).rejects.toMatchObject({ code: 'P2003' });
        await expect(
          prisma.learningDocumentVersion.delete({ where: { id: version.id } }),
        ).rejects.toMatchObject({ code: 'P2003' });
        if (root === 'topic')
          await prisma.topic.delete({ where: { id: sourceTopic.id } });
        else await prisma.chapter.delete({ where: { id: sourceChapter.id } });
        expect(
          await prisma.questionGenerationBatch.findUnique({
            where: { id: batch.id },
          }),
        ).toBeNull();
        expect(
          await prisma.learningDocumentVersion.findUnique({
            where: { id: version.id },
          }),
        ).toBeNull();
        expect(
          await prisma.learningDocumentIndex.findUnique({
            where: { id: index.id },
          }),
        ).toBeNull();
      },
    );
    it('blocks late results after topic ownership changes or document revocation', async () => {
      const token = randomUUID();
      expect(await repository.claim(versionId, token)).not.toBeNull();
      await prisma.topic.update({
        where: { id: topic },
        data: { created_by: foreign },
      });
      expect(await repository.active(versionId, token, owner)).toBeNull();
      expect(
        (
          await repository.finish(
            versionId,
            token,
            { status: 'EXTRACTED' },
            owner,
          )
        ).count,
      ).toBe(0);
      await prisma.topic.update({
        where: { id: topic },
        data: { created_by: owner },
      });
      await repository.revoke(owner, doc);
      expect(
        await prisma.learningDocumentIndex.count({
          where: {
            version_id: versionId,
            status: 'REVOKED',
            remote_revoked: false,
          },
        }),
      ).toBe(1);
      expect(await repository.active(versionId, token, owner)).toBeNull();
      expect(await repository.detail(owner, doc)).toBeNull();
    });
  },
);
