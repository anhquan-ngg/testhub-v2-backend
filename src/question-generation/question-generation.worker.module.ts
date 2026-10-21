import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QuestionGenerationModule } from './question-generation.module';
import { GenerationExecutionService } from './generation-execution.service';
import { GenerationDispatcher } from './generation-dispatcher.service';
import { GenerationProcessor } from './generation.processor';
import { AI_GENERATION_QUEUE } from './question-generation.constants';
import { getRedisConnection } from '../common/redis-connection';

/** Separate process: AI queues do not consume exam API/runtime process slots. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QuestionGenerationModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          ...getRedisConnection(config),
          connectTimeout: 5_000,
          commandTimeout: 10_000,
          enableOfflineQueue: false,
          // BullMQ blocking connections require null; producer commands remain
          // bounded by commandTimeout and admission checks in the dispatcher.
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({ name: AI_GENERATION_QUEUE }),
  ],
  providers: [
    GenerationExecutionService,
    GenerationDispatcher,
    GenerationProcessor,
  ],
})
export class QuestionGenerationWorkerModule {}
