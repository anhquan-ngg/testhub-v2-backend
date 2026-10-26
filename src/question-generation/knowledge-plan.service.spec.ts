import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { KnowledgePlanService } from './knowledge-plan.service';
import { KnowledgePlanRepository } from './knowledge-plan.repository';
import { DocumentRepository } from '../learning-documents/document.repository';
import { DocumentGenerationService } from './document-generation.service';
import { RagClient } from '../learning-documents/rag-client.service';
import type { ContentMap, PlanMatrix } from './knowledge-plan.contract';

describe('Knowledge plan source preparation and explicit confirmation', () => {
  const owner = randomUUID(),
    id = randomUUID(),
    topic = randomUUID(),
    version = randomUUID(),
    document = randomUUID(),
    index = randomUUID(),
    profile = 'f'.repeat(64);
  const units = [
    { kind: 'PAGE' as const, position: 1 },
    { kind: 'PAGE' as const, position: 2 },
  ];
  const map: ContentMap = {
    contract_version: 'knowledge-outline.v1',
    index_id: index,
    document_id: document,
    version_id: version,
    source_sha256: 'a'.repeat(64),
    source_units: units,
    warnings: ['REVIEW_CONTENT_MAP'],
    nodes: units.map((unit, i) => ({
      id: randomUUID(),
      parent_id: null,
      name: `Topic ${i}`,
      source_units: [unit],
      origin: 'HEADING',
      evidence: `Chapter ${i}`,
    })),
  };
  let service: KnowledgePlanService;
  let plan: {
    id: string;
    created_by: string;
    topic_id: string;
    source_version_id: string;
    created_at: Date;
    status: string;
    revision: number;
    question_configs: object[];
    content_map: ContentMap | null;
    matrix: PlanMatrix | null;
  };
  const repository = {
    due: jest.fn(),
    claim: jest.fn(),
    finish: jest.fn(),
    owned: jest.fn(),
    get: jest.fn(),
    matches: jest.fn(),
    edit: jest.fn(),
    create: jest.fn(),
  };
  const documents = { source: jest.fn() },
    sources = { prepare: jest.fn() },
    client = { enabled: true, outline: jest.fn() };
  beforeEach(async () => {
    jest.resetAllMocks();
    client.enabled = true;
    plan = {
      id,
      created_by: owner,
      topic_id: topic,
      source_version_id: version,
      created_at: new Date(),
      status: 'WAITING_SOURCE',
      revision: 1,
      question_configs: [
        {
          question_type: 'SINGLE_CHOICE',
          question_format: 'KNOWLEDGE',
          count: 3,
        },
      ],
      content_map: null,
      matrix: null,
    };
    repository.due.mockResolvedValue([{ id, created_by: owner }]);
    repository.claim.mockResolvedValue(randomUUID());
    repository.owned.mockImplementation(() => Promise.resolve(plan));
    repository.get.mockImplementation(() => Promise.resolve(plan));
    repository.matches.mockResolvedValue([]);
    repository.finish.mockImplementation(
      (_id, _token, _owner, data: object) => {
        Object.assign(plan, data);
        return Promise.resolve({ count: 1 });
      },
    );
    repository.edit.mockImplementation(
      (_owner, _id, _revision, matrix: PlanMatrix, approve = false) => {
        plan.matrix = matrix;
        plan.status = approve ? 'APPROVED' : 'REVIEW_REQUIRED';
        plan.revision++;
        return Promise.resolve(plan);
      },
    );
    documents.source.mockResolvedValue({
      id: version,
      document_id: document,
      source_sha256: 'a'.repeat(64),
      document: { topic_id: topic, chapter_id: null, title: 'Book' },
    });
    sources.prepare.mockResolvedValue({
      ready: true,
      stage: 'READY',
      index: { id: index, profile_id: profile },
    });
    client.outline.mockResolvedValue(map);
    const module = await Test.createTestingModule({
      providers: [
        KnowledgePlanService,
        { provide: KnowledgePlanRepository, useValue: repository },
        { provide: DocumentRepository, useValue: documents },
        { provide: DocumentGenerationService, useValue: sources },
        { provide: RagClient, useValue: client },
      ],
    }).compile();
    service = module.get(KnowledgePlanService);
  });
  it('creates a source-wide editable proposal and pins source identity before any generation', async () => {
    await service.prepareDue();
    expect(plan.status).toBe('REVIEW_REQUIRED');
    expect(plan.content_map?.source_units).toEqual(units);
    expect(plan.matrix?.nodes).toHaveLength(2);
    expect(
      plan.matrix?.rows.reduce((sum, row) => sum + row.counts.KNOWLEDGE, 0),
    ).toBe(3);
    expect(client.outline).toHaveBeenCalledWith({
      owner_id: owner,
      index_id: index,
      profile_id: profile,
      title: 'Book',
    });
    expect(repository.finish).toHaveBeenCalledWith(
      id,
      expect.any(String),
      owner,
      expect.objectContaining({
        source_index_id: index,
        source_profile_id: profile,
        source_sha256: 'a'.repeat(64),
      }),
    );
    expect(repository.edit).not.toHaveBeenCalled();
  });
  it('rejects missing consent, raw string revisions, cycles and sources outside the document', async () => {
    await expect(
      service.create(
        owner,
        {
          topic_id: topic,
          version_id: version,
          question_configs: plan.question_configs,
          external_processing_consent: false,
        },
        randomUUID(),
      ),
    ).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
    await service.prepareDue();
    await expect(
      service.approve(owner, id, { revision: '1' }),
    ).rejects.toThrow();
    const matrix = structuredClone(plan.matrix);
    if (!matrix) throw new Error('Fixture matrix missing');
    matrix.nodes[0].parent_id = matrix.nodes[0].id;
    await expect(
      service.edit(owner, id, { revision: 1, matrix }),
    ).rejects.toThrow();
    matrix.nodes[0].parent_id = null;
    matrix.nodes[0].source_units = [{ kind: 'PAGE', position: 99 }];
    matrix.rows[0].source_units = matrix.nodes[0].source_units;
    await expect(
      service.edit(owner, id, { revision: 1, matrix }),
    ).rejects.toThrow();
    expect(repository.edit).not.toHaveBeenCalled();
  });
  it('requires confirmation then freezes the saved revision without bank chapter IDs', async () => {
    await service.prepareDue();
    await expect(
      service.generation(owner, id, { revision: 1 }),
    ).rejects.toThrow();
    const approved = await service.approve(owner, id, { revision: 1 });
    expect(approved.status).toBe('APPROVED');
    const result = await service.generation(owner, id, { revision: 2 });
    expect(result.command.chapter_id).toBeNull();
    expect(result.command.plan_id).toBe(id);
    expect(
      result.snapshot.items.every((item) =>
        map.nodes.some((node) => node.id === item.node_id),
      ),
    ).toBe(true);
    await expect(
      service.generation(owner, id, { revision: 1 }),
    ).rejects.toThrow();
    if (plan.matrix) plan.matrix.nodes[0].name = 'Later change';
    expect(result.snapshot.nodes[0].name).toBe('Topic 0');
    expect(repository.edit).toHaveBeenCalledTimes(1);
  });
  it('defers retryable source failures and fails an outline for a different immutable version', async () => {
    sources.prepare.mockRejectedValueOnce(
      new ServiceUnavailableException('Temporary dependency outage'),
    );
    await service.prepareDue();
    expect(plan.status).toBe('WAITING_SOURCE');
    client.outline.mockResolvedValue({ ...map, version_id: randomUUID() });
    await service.prepareDue();
    expect(plan.status).toBe('FAILED');
    expect(plan.matrix).toBeNull();
  });
});
