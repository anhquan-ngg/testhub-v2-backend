import { GenerationExecutionService } from './generation-execution.service';
import { GenerationBatchRepository } from './generation-batch.repository';
import { QuestionGenerationService } from './question-generation.service';
import { DocumentGenerationService } from './document-generation.service';
import { QuestionGenerationException } from './question-generation.errors';
import { HttpStatus } from '@nestjs/common';
import { readContractFixture } from './fixtures/contract-fixture';

describe('Durable document generation phases', () => {
  const fixture = readContractFixture();
  let batch: Record<string, unknown>;
  let repo: {
    executionInput: jest.Mock;
    claim: jest.Mock;
    prepared: jest.Mock;
    failPreparation: jest.Mock;
    saveResult: jest.Mock;
    finish: jest.Mock;
    fail: jest.Mock;
  };
  let generation: { authorizeTarget: jest.Mock; generateDrafts: jest.Mock };
  let docs: { prepare: jest.Mock; generate: jest.Mock };
  let execution: GenerationExecutionService;
  beforeEach(() => {
    batch = {
      status: 'WAITING_SOURCE',
      created_at: new Date(),
      created_by: 'owner',
      source_mode: 'document',
      creator: { id: 'owner', role: 'LECTURER', status: 'ACTIVE' },
      requested_count: 1,
      question_format: fixture.command.question_format,
    };
    repo = {
      executionInput: jest
        .fn()
        .mockImplementation(() => Promise.resolve(batch)),
      claim: jest.fn().mockResolvedValue('execution'),
      prepared: jest.fn(),
      failPreparation: jest.fn(),
      saveResult: jest.fn(),
      finish: jest.fn(),
      fail: jest.fn(),
    };
    generation = {
      authorizeTarget: jest.fn().mockResolvedValue({ topic: { name: 'Data' } }),
      generateDrafts: jest.fn(),
    };
    docs = {
      prepare: jest.fn().mockResolvedValue({
        ready: false,
        stage: 'INDEXING',
        index: { id: 'index', profile_id: 'profile' },
      }),
      generate: jest.fn().mockResolvedValue({
        questions: fixture.internal_response.questions,
        provenance: [{ fixture: 'source' }],
      }),
    };
    execution = new GenerationExecutionService(
      repo as unknown as GenerationBatchRepository,
      generation as unknown as QuestionGenerationService,
      docs as unknown as DocumentGenerationService,
    );
  });
  it('prepares in the background without claiming or paying for an LLM attempt', async () => {
    await execution.process('batch');
    expect(repo.prepared).toHaveBeenCalledWith(
      'batch',
      'owner',
      expect.objectContaining({ ready: false, stage: 'INDEXING' }),
    );
    expect(repo.claim).not.toHaveBeenCalled();
    expect(docs.generate).not.toHaveBeenCalled();
  });
  it('bounds waiting time and fails OCR without creating an attempt', async () => {
    batch.created_at = new Date(0);
    await execution.process('batch');
    expect(repo.failPreparation).toHaveBeenLastCalledWith(
      'batch',
      'AI_SOURCE_TIMEOUT',
    );
    batch.created_at = new Date();
    docs.prepare.mockRejectedValue(
      new QuestionGenerationException(
        'AI_DOCUMENT_OCR_REQUIRED',
        HttpStatus.CONFLICT,
        'OCR',
      ),
    );
    await execution.process('batch');
    expect(repo.failPreparation).toHaveBeenLastCalledWith(
      'batch',
      'AI_DOCUMENT_OCR_REQUIRED',
    );
    expect(repo.claim).not.toHaveBeenCalled();
  });
  it('stores provenance with provider output and never falls back to pasted text', async () => {
    batch.status = 'QUEUED';
    await execution.process('batch');
    expect(generation.generateDrafts).not.toHaveBeenCalled();
    expect(docs.generate).toHaveBeenCalledTimes(1);
    expect(repo.saveResult).toHaveBeenCalledWith(
      'batch',
      'execution',
      fixture.internal_response.questions,
      [{ fixture: 'source' }],
    );
    expect(repo.finish).toHaveBeenCalledTimes(1);
  });
  it('does not issue another paid call after losing persistence', async () => {
    batch.status = 'QUEUED';
    repo.saveResult.mockRejectedValue(new Error('private'));
    await expect(execution.process('batch')).rejects.toThrow(
      'AI persistence deferred',
    );
    expect(docs.generate).toHaveBeenCalledTimes(1);
    expect(repo.fail).not.toHaveBeenCalled();
  });
});
