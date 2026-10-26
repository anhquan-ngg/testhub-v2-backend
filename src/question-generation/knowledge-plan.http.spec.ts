import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RagClient } from '../learning-documents/rag-client.service';

const base = process.env.TESTHUB_PLAN_SIM_URL;
(base ? describe : describe.skip)(
  'Plan dependency: real RagClient HTTP against Postman simulation',
  () => {
    let client: RagClient;
    const owner = randomUUID(),
      index = randomUUID(),
      profile = 'f'.repeat(64);
    beforeAll(() => {
      if (!base || !['localhost', '127.0.0.1'].includes(new URL(base).hostname))
        throw new Error('Loopback simulation required');
      client = new RagClient(
        new ConfigService({
          AI_QUESTION_GENERATION_ENABLED: 'true',
          AI_RAG_ENABLED: 'true',
          AI_SERVICE_BASE_URL: base,
          AI_SERVICE_INTERNAL_TOKEN: 'postman-local-fixture-token-1234567890',
          AI_SERVICE_TIMEOUT_MS: '30000',
        }),
      );
    });
    it('validates a source-wide outline over the real internal JSON client', async () => {
      const result = await client.outline({
        owner_id: owner,
        index_id: index,
        profile_id: profile,
        title: 'Stacks',
      });
      expect(result.nodes[0].name).toBe('Stacks');
    });
    it('forwards each cell and validates ordered type/level/evidence over HTTP', async () => {
      const configs = [
        {
          question_type: 'SINGLE_CHOICE' as const,
          question_format: 'KNOWLEDGE' as const,
          count: 1,
        },
        {
          question_type: 'MULTIPLE_CHOICE' as const,
          question_format: 'APPLYING' as const,
          count: 1,
        },
      ];
      const result = await client.generate({
        owner_id: owner,
        index_ids: [index],
        profile_id: profile,
        query: 'Structures',
        top_k: 8,
        question_configs: configs,
        plan_items: configs.map((config, i) => ({
          ...config,
          id: `cell-${i}`,
          knowledge_title: i ? 'Queues' : 'Stacks',
          objective: 'Explain ordering',
          source_units: [{ kind: 'PAGE', position: i + 1 }],
        })),
      });
      expect(result.questions.map((question) => question.plan_item_id)).toEqual(
        ['cell-0', 'cell-1'],
      );
      expect(result.questions[1].citations[0].chunk.position).toBe(2);
    });
    it('preserves sanitized retryability for a dependency outage', async () => {
      await expect(
        client.outline({
          owner_id: owner,
          index_id: index,
          profile_id: profile,
          title: 'fixture-unavailable',
        }),
      ).rejects.toMatchObject({
        code: 'RAG_STORAGE_UNAVAILABLE',
        retryable: true,
      });
    });
  },
);
