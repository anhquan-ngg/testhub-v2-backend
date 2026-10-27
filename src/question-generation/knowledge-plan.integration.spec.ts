import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRepository } from '../learning-documents/document.repository';
import { KnowledgePlanRepository } from './knowledge-plan.repository';
import { GenerationBatchRepository } from './generation-batch.repository';
import { GenerationReviewRepository } from './generation-review.repository';
import { freezeMatrix, PlanMatrix } from './knowledge-plan.contract';
import { readContractFixture } from './fixtures/contract-fixture';
import { generationCommandSchema } from './question-generation.contract';

const url = process.env.TESTHUB_KNOWLEDGE_DATABASE_URL;
const integration = url ? describe : describe.skip;
integration('Knowledge plans: real PostgreSQL commit boundary', () => {
  const schema = `knowledge_${randomUUID().replaceAll('-', '')}`;
  let pool: Pool,
    prisma: PrismaClient,
    plans: KnowledgePlanRepository,
    review: GenerationReviewRepository;
  const owner = randomUUID(),
    foreign = randomUUID(),
    topic = randomUUID();
  let version: string;
  const nodes = Array.from({ length: 35 }, (_, index) => ({
    id: randomUUID(),
    name: `Depth ${index}`,
    parent_id: null as string | null,
    source_units: [{ kind: 'PAGE' as const, position: 1 }],
  }));
  nodes.forEach((node, index) => {
    node.parent_id = index ? nodes[index - 1].id : null;
  });
  const unused = { ...nodes[0], id: randomUUID(), name: 'Unused branch' };
  const matrix: PlanMatrix = {
    nodes: [...nodes, unused],
    rows: [
      {
        id: randomUUID(),
        node_id: nodes[34].id,
        objective: 'Explain stacks',
        question_type: 'SINGLE_CHOICE',
        source_units: nodes[0].source_units,
        counts: { KNOWLEDGE: 1, UNDERSTANDING: 0, APPLYING: 0, ADVANCED: 0 },
      },
    ],
  };
  beforeAll(async () => {
    if (
      !url ||
      !['localhost', '127.0.0.1'].includes(new URL(url).hostname) ||
      !new URL(url).pathname.endsWith('_test')
    )
      throw new Error('Dedicated loopback test DB required');
    pool = new Pool({ connectionString: url });
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
        '--config',
        'src/auth/testing/prisma-fixture.config.ts',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const connection = await pool.connect();
    try {
      await connection.query(`CREATE SCHEMA "${schema}"`);
      await connection.query(`SET search_path TO "${schema}"`);
      await connection.query(
        sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', ''),
      );
    } finally {
      connection.release();
    }
    prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
    const module = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        DocumentRepository,
        KnowledgePlanRepository,
        GenerationBatchRepository,
        GenerationReviewRepository,
      ],
    }).compile();
    plans = module.get(KnowledgePlanRepository);
    review = module.get(GenerationReviewRepository);
    await prisma.user.createMany({
      data: [owner, foreign].map((id) => ({
        id,
        email: `${id}@example.invalid`,
        full_name: 'Fixture lecturer',
        role: 'LECTURER',
      })),
    });
    await prisma.topic.create({
      data: { id: topic, created_by: owner, name: 'Structures' },
    });
    const document = await prisma.learningDocument.create({
      data: { created_by: owner, topic_id: topic, title: 'Book' },
    });
    const source = await prisma.learningDocumentVersion.create({
      data: {
        document_id: document.id,
        version: 1,
        file_name: 'book.pdf',
        source_type: 'PDF',
        mime_type: 'application/pdf',
        declared_size: 100,
        consented_at: new Date(),
        upload_key: randomUUID(),
        upload_expires_at: new Date(),
        status: 'EXTRACTED',
        source_sha256: 'a'.repeat(64),
      },
    });
    version = source.id;
  }, 60000);
  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });
  it('replays concurrent plan creation, rejects foreign access and stale approvals, and never creates chapters on approval', async () => {
    const input = {
      topic_id: topic,
      version_id: version,
      question_configs: [
        {
          question_type: 'SINGLE_CHOICE' as const,
          question_format: 'KNOWLEDGE' as const,
          count: 1,
        },
      ],
    };
    const [first, second] = await Promise.all([
      plans.create(owner, input, 'concurrent-plan-key', 'a'.repeat(64)),
      plans.create(owner, input, 'concurrent-plan-key', 'a'.repeat(64)),
    ]);
    expect(first.id).toBe(second.id);
    await expect(plans.get(foreign, first.id)).rejects.toThrow();
    await prisma.knowledgePlan.update({
      where: { id: first.id },
      data: { status: 'REVIEW_REQUIRED', matrix },
    });
    await plans.edit(owner, first.id, 1, matrix, true);
    await expect(
      plans.edit(owner, first.id, 1, matrix, true),
    ).rejects.toThrow();
    expect(await prisma.chapter.count()).toBe(0);
  });
  it('creates arbitrary-depth selected branches atomically; reuses chapters and handles concurrent commit/replay', async () => {
    const stored = await plans.create(
      owner,
      {
        topic_id: topic,
        version_id: version,
        question_configs: [
          {
            question_type: 'SINGLE_CHOICE',
            question_format: 'KNOWLEDGE',
            count: 1,
          },
        ],
      },
      randomUUID(),
      'b'.repeat(64),
    );
    const plan = freezeMatrix(stored.id, 1, matrix);
    const question = readContractFixture().internal_response.questions[0];
    const batch = await prisma.questionGenerationBatch.create({
      data: {
        created_by: owner,
        topic_id: topic,
        plan_id: stored.id,
        plan_snapshot: plan,
        idempotency_key: randomUUID(),
        request_hash: 'c'.repeat(64),
        source_text: '',
        source_mode: 'document',
        source_version_id: version,
        question_format: 'KNOWLEDGE',
        question_configs: [
          {
            question_type: 'SINGLE_CHOICE',
            question_format: 'KNOWLEDGE',
            count: 1,
          },
        ],
        requested_count: 1,
        consented_at: new Date(),
        status: 'REVIEW_REQUIRED',
      },
    });
    const item = await prisma.questionGenerationItem.create({
      data: {
        batch_id: batch.id,
        source_index: 1,
        plan_item_id: plan.items[0].id,
        original_data: question,
        data: question,
        errors: [],
        warnings: [],
        fingerprint: 'd'.repeat(64),
        status: 'VALID',
      },
    });
    const input = { items: [{ id: item.id, revision: 1 }] };
    await expect(review.commit(owner, batch.id, input)).rejects.toThrow();
    expect(await prisma.chapter.count()).toBe(0);
    const approved = await review.review(owner, batch.id, item.id, {
      revision: 1,
      decision: 'APPROVE',
    });
    input.items[0].revision = approved.revision;
    const [first, replay] = await Promise.all([
      review.commit(owner, batch.id, input),
      review.commit(owner, batch.id, input),
    ]);
    expect(first.questions).toEqual(replay.questions);
    expect(await prisma.chapter.count()).toBe(35);
    expect(
      await prisma.chapter.count({ where: { name: 'Unused branch' } }),
    ).toBe(0);
    const saved = await prisma.question.findUniqueOrThrow({
      where: { id: first.questions[0].question_id },
      include: { chapter: true },
    });
    expect(saved.chapter.name).toBe('Depth 34');
    expect(await prisma.question.count()).toBe(1);
    // A later batch resolves the same path without creating another tree.
    await prisma.questionGenerationBatch.update({
      where: { id: batch.id },
      data: { status: 'REVIEW_REQUIRED' },
    });
    const next = await prisma.questionGenerationItem.create({
      data: {
        batch_id: batch.id,
        source_index: 2,
        plan_item_id: plan.items[0].id,
        original_data: question,
        data: question,
        errors: [],
        warnings: [],
        fingerprint: 'e'.repeat(64),
        status: 'APPROVED',
        reviewed_by: owner,
        reviewed_at: new Date(),
      },
    });
    await review.commit(owner, batch.id, {
      items: [{ id: next.id, revision: 1 }],
    });
    expect(await prisma.chapter.count()).toBe(35);
    expect(await prisma.question.count()).toBe(2);
  }, 60000);
  it('pins approved source and cells through batch creation, result recovery and draft persistence', async () => {
    const stored = await plans.create(
      owner,
      {
        topic_id: topic,
        version_id: version,
        question_configs: [
          {
            question_type: 'SINGLE_CHOICE',
            question_format: 'KNOWLEDGE',
            count: 1,
          },
        ],
      },
      randomUUID(),
      'a'.repeat(64),
    );
    const snapshot = freezeMatrix(stored.id, 1, matrix);
    const sourceIndex = await prisma.learningDocumentIndex.create({
      data: {
        version_id: version,
        owner_id: owner,
        profile_id: 'f'.repeat(64),
        profile: {},
        status: 'READY',
      },
    });
    await prisma.knowledgePlan.update({
      where: { id: stored.id },
      data: {
        status: 'APPROVED',
        matrix,
        source_index_id: sourceIndex.id,
        source_profile_id: sourceIndex.profile_id,
        source_sha256: 'a'.repeat(64),
      },
    });
    const module = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        GenerationBatchRepository,
      ],
    }).compile();
    const batches = module.get(GenerationBatchRepository);
    const command = generationCommandSchema.parse({
      topic_id: topic,
      chapter_id: null,
      plan_id: stored.id,
      source: { mode: 'document', version_id: version, query: '' },
      question_configs: [
        {
          question_type: 'SINGLE_CHOICE',
          question_format: 'KNOWLEDGE',
          count: 1,
        },
      ],
      language: 'vi',
      external_processing_consent: true,
    });
    const batch = await batches.create({
      ownerId: owner,
      key: randomUUID(),
      hash: 'b'.repeat(64),
      command,
      plan: snapshot,
    });
    expect(batch.status).toBe('QUEUED');
    expect(batch.chapter_id).toBeNull();
    expect(batch.plan_snapshot).toEqual(snapshot);
    const execution = await batches.claim(batch.id);
    if (!execution) throw new Error('Fixture execution unavailable');
    const question = readContractFixture().internal_response.questions[0],
      text = 'Stack uses LIFO.';
    const provenance = {
      contract_version: 'rag-generation.v1' as const,
      quality_status: 'UNASSESSED' as const,
      profile_id: sourceIndex.profile_id,
      plan_item_id: snapshot.items[0].id,
      knowledge_title: 'Depth 34',
      objective: 'Explain stacks',
      citations: [
        {
          quote: text,
          chunk: {
            chunk_id: randomUUID(),
            ordinal: 0,
            kind: 'PAGE' as const,
            position: 1,
            start_offset: 0,
            end_offset: text.length,
            text,
            text_sha256: createHash('sha256').update(text).digest('hex'),
            index_id: sourceIndex.id,
            document_id: (
              await prisma.learningDocumentVersion.findUniqueOrThrow({
                where: { id: version },
              })
            ).document_id,
            version_id: version,
            source_sha256: 'a'.repeat(64),
            similarity: 1,
          },
        },
      ],
    };
    await expect(
      batches.finish(
        batch.id,
        execution,
        owner,
        [question],
        [{ ...provenance, plan_item_id: 'wrong-cell' }],
      ),
    ).rejects.toThrow('Plan item mismatch');
    await batches.saveResult(batch.id, execution, [question], [provenance]);
    await batches.finish(batch.id, execution, owner, [question], [provenance]);
    const drafts = await batches.items(owner, batch.id, 1, 20);
    expect(drafts.data[0].plan_item_id).toBe(snapshot.items[0].id);
    expect(drafts.data[0].provenance).toEqual(provenance);
    expect((await batches.findOwned(owner, batch.id))?.status).toBe(
      'REVIEW_REQUIRED',
    );
    expect(await batches.findOwned(foreign, batch.id)).toBeNull();
  });
  it('rolls back new ancestors and questions if a later target has ambiguous sibling matches', async () => {
    await prisma.chapter.createMany({
      data: [0, 1].map((order) => ({
        topic_id: topic,
        name: 'Ambiguous',
        order,
      })),
    });
    const first = { ...nodes[0], id: randomUUID(), name: 'Must roll back' },
      second = { ...nodes[0], id: randomUUID(), name: 'Ambiguous' };
    const proposal: PlanMatrix = {
      nodes: [first, second],
      rows: [first, second].map((node) => ({
        ...matrix.rows[0],
        id: randomUUID(),
        node_id: node.id,
        counts: { KNOWLEDGE: 1, UNDERSTANDING: 0, APPLYING: 0, ADVANCED: 0 },
      })),
    };
    const stored = await plans.create(
      owner,
      {
        topic_id: topic,
        version_id: version,
        question_configs: [
          {
            question_type: 'SINGLE_CHOICE',
            question_format: 'KNOWLEDGE',
            count: 2,
          },
        ],
      },
      randomUUID(),
      'a'.repeat(64),
    );
    const snapshot = freezeMatrix(stored.id, 1, proposal),
      question = readContractFixture().internal_response.questions[0];
    const batch = await prisma.questionGenerationBatch.create({
      data: {
        created_by: owner,
        topic_id: topic,
        plan_id: stored.id,
        plan_snapshot: snapshot,
        idempotency_key: randomUUID(),
        request_hash: 'c'.repeat(64),
        source_text: '',
        source_mode: 'document',
        source_version_id: version,
        question_format: 'KNOWLEDGE',
        question_configs: [
          {
            question_type: 'SINGLE_CHOICE',
            question_format: 'KNOWLEDGE',
            count: 2,
          },
        ],
        requested_count: 2,
        consented_at: new Date(),
        status: 'REVIEW_REQUIRED',
      },
    });
    const items: Array<{ id: string }> = [];
    for (const [index, cell] of snapshot.items.entries())
      items.push(
        await prisma.questionGenerationItem.create({
          data: {
            batch_id: batch.id,
            source_index: index + 1,
            plan_item_id: cell.id,
            original_data: question,
            data: question,
            errors: [],
            warnings: [],
            fingerprint: 'd'.repeat(64),
            status: 'APPROVED',
            reviewed_by: owner,
            reviewed_at: new Date(),
          },
        }),
      );
    await expect(
      review.commit(owner, batch.id, {
        items: items.map((item) => ({ id: item.id, revision: 1 })),
      }),
    ).rejects.toThrow('Ambiguous');
    expect(
      await prisma.chapter.count({ where: { name: 'Must roll back' } }),
    ).toBe(0);
    expect(await prisma.question.count()).toBe(2);
  });
});
