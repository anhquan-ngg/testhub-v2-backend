import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AiQuestionClient } from './ai-question-client.service';
import {
  AI_HTTP_FETCH,
  AI_SERVICE_OPTIONS,
  readAiServiceOptions,
} from './ai-service.config';
import { QuestionGenerationRepository } from './question-generation.repository';
import { QuestionGenerationService } from './question-generation.service';
import { GenerationBatchRepository } from './generation-batch.repository';
import { GenerationBatchService } from './generation-batch.service';
import { GenerationBatchController } from './generation-batch.controller';
import { GenerationReviewRepository } from './generation-review.repository';
import { GenerationReviewService } from './generation-review.service';

/** Public batch API and persistence; queue execution lives in the worker module. */
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [GenerationBatchController],
  providers: [
    {
      provide: AI_SERVICE_OPTIONS,
      inject: [ConfigService],
      useFactory: readAiServiceOptions,
    },
    {
      provide: AI_HTTP_FETCH,
      useFactory:
        (): typeof fetch =>
        (
          input: string | URL | Request,
          init?: RequestInit,
        ): Promise<Response> =>
          globalThis.fetch(input, init),
    },
    AiQuestionClient,
    QuestionGenerationRepository,
    QuestionGenerationService,
    GenerationBatchRepository,
    GenerationBatchService,
    GenerationReviewRepository,
    GenerationReviewService,
  ],
  exports: [
    QuestionGenerationService,
    GenerationBatchRepository,
    AI_SERVICE_OPTIONS,
  ],
})
export class QuestionGenerationModule {}
