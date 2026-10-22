import { NestFactory } from '@nestjs/core';
import { DocumentWorkerModule } from './learning-documents/document.worker.module';

async function bootstrap(): Promise<void> {
  const worker =
    await NestFactory.createApplicationContext(DocumentWorkerModule);
  worker.enableShutdownHooks();
}
void bootstrap().catch(() => {
  process.stderr.write(
    'Document worker startup failed; check configuration and migrations.\n',
  );
  process.exitCode = 1;
});
