import {
  startImportApplication,
  startImportDatabase,
} from './import-api.harness';

async function main() {
  const port = Number(process.argv[2] ?? 0);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('Fixture port must be an integer between 0 and 65535');
  }
  const database = await startImportDatabase();
  let application:
    | Awaited<ReturnType<typeof startImportApplication>>
    | undefined;
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    try {
      await application?.close();
    } finally {
      await database.close();
    }
  }
  try {
    application = await startImportApplication(
      database.prisma,
      true,
      close,
      port,
    );
    process.once('SIGINT', () => {
      void close();
    });
    process.once('SIGTERM', () => {
      void close();
    });
    console.log(
      JSON.stringify({
        baseUrl: application.baseUrl,
        userId: application.owner,
        topicId: application.topic.id,
        chapterId: application.chapter.id,
        container: database.name,
        shutdownUrl: `${application.baseUrl}/__fixture/shutdown`,
        boundaries:
          'Synthetic auth; in-memory S3 and synchronous queue; real PostgreSQL/controllers/services/parsers',
      }),
    );
  } catch (error) {
    await close();
    throw error;
  }
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Fixture startup failed',
  );
  process.exitCode = 1;
});
