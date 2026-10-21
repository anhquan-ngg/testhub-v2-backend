import { NestFactory } from '@nestjs/core';
import { QuestionGenerationWorkerModule } from './question-generation/question-generation.worker.module';

async function bootstrap(): Promise<void> {
  const worker = await NestFactory.createApplicationContext(
    QuestionGenerationWorkerModule,
  );
  worker.enableShutdownHooks();
}

void bootstrap().catch(() => {
  // Never print raw config, DB or Redis errors that could contain credentials.
  process.stderr.write(
    'AI generation worker startup failed; check configuration and migrations.\n',
  );
  process.exitCode = 1;
});
