import { HttpStatus, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { AiQuestionClient } from './ai-question-client.service';
import { generationCommandSchema } from './question-generation.contract';
import type { GeneratedQuestion } from './question-generation.contract';
import { QuestionGenerationException } from './question-generation.errors';
import { QuestionGenerationRepository } from './question-generation.repository';

export type GenerationActor = { id: string; role: UserRole };
export type GeneratedDrafts = {
  topic_id: string;
  chapter_id: string;
  questions: GeneratedQuestion[];
};

const targetSchema = z.object({
  topic_id: z.string().uuid(),
  chapter_id: z.string().uuid(),
});

/** Authorized application boundary shared by batch creation and worker execution. */
@Injectable()
export class QuestionGenerationService {
  constructor(
    private readonly repository: QuestionGenerationRepository,
    private readonly client: AiQuestionClient,
  ) {}

  /** Validate untrusted commands without relying on implicit DTO coercion. */
  parseCommand(input: unknown) {
    const command = generationCommandSchema.safeParse(input);
    if (!command.success) {
      if (
        command.error.issues.some(
          (issue) => issue.path[0] === 'external_processing_consent',
        )
      ) {
        throw new QuestionGenerationException(
          'CONSENT_REQUIRED',
          HttpStatus.BAD_REQUEST,
          'Consent to external AI processing is required',
        );
      }
      throw this.invalidRequest();
    }
    return command.data;
  }

  /** Reusable target policy; call again before execution and later bank commit. */
  async authorizeTarget(
    actor: GenerationActor,
    target: { topic_id: string; chapter_id: string },
  ) {
    if (
      actor?.role !== UserRole.LECTURER ||
      !z.string().uuid().safeParse(actor?.id).success
    ) {
      throw new QuestionGenerationException(
        'AI_ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'AI question generation requires a lecturer',
      );
    }
    const parsed = targetSchema.safeParse(target);
    if (!parsed.success) throw this.invalidRequest();
    const owned = await this.repository.findOwnedTarget({
      ownerId: actor.id,
      topicId: parsed.data.topic_id,
      chapterId: parsed.data.chapter_id,
    });
    if (!owned) {
      throw new QuestionGenerationException(
        'AI_TARGET_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Question generation target was not found',
      );
    }
    return owned;
  }

  /** Authorize text disclosure and return validated drafts without persistence. */
  async generateDrafts(
    actor: GenerationActor,
    input: unknown,
  ): Promise<GeneratedDrafts> {
    const command = this.parseCommand(input);
    const owned = await this.authorizeTarget(actor, command);
    if (command.source.mode !== 'text') throw this.invalidRequest();
    const result = await this.client.generate({
      text: command.source.text,
      topic: Array.from(owned.topic.name.trim()).slice(0, 200).join('') || null,
      question_configs: command.question_configs,
    });
    // Ownership may be revoked while the external call is running.
    await this.authorizeTarget(actor, command);
    return {
      topic_id: owned.topic.id,
      chapter_id: owned.id,
      questions: result.questions,
    };
  }

  private invalidRequest(): QuestionGenerationException {
    return new QuestionGenerationException(
      'AI_REQUEST_INVALID',
      HttpStatus.BAD_REQUEST,
      'Invalid question generation command',
    );
  }
}
