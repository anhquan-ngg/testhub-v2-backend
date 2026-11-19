import {
  startImportApplication,
  startImportDatabase,
} from './import-api.harness';

/** Start the disposable fixture and drain in-flight initialization before shutdown. */
export async function main() {
  const port = Number(process.argv[2] ?? 0);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('Fixture port must be an integer between 0 and 65535');
  }
  let database: Awaited<ReturnType<typeof startImportDatabase>> | undefined;
  let application:
    | Awaited<ReturnType<typeof startImportApplication>>
    | undefined;
  let stopRequested = false;
  let closing: Promise<void> | undefined;
  let finishInitialization!: () => void; // Assigned synchronously by the Promise constructor.
  const initialized = new Promise<void>((resolve) => {
    finishInitialization = resolve;
  });
  function close(): Promise<void> {
    stopRequested = true;
    closing ??= (async () => {
      await initialized;
      try {
        await application?.close();
      } finally {
        try {
          await database?.close();
        } finally {
          process.off('SIGINT', onSignal);
          process.off('SIGTERM', onSignal);
        }
      }
    })();
    return closing;
  }
  function onSignal() {
    void close().catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : 'Fixture shutdown failed',
      );
      process.exitCode = 1;
    });
  }
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    try {
      database = await startImportDatabase();
      if (!stopRequested) {
        application = await startImportApplication(
          database.prisma,
          true,
          close,
          port,
        );
      }
    } finally {
      finishInitialization();
    }
    if (stopRequested) {
      await close();
      return;
    }
    if (!database || !application)
      throw new Error('Fixture startup incomplete');
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
if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Fixture startup failed',
    );
    process.exitCode = 1;
  });
}
