import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';
import { ExamRuntimeController } from './exam-runtime.controller';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import { ExamRuntimeGateway } from './exam-runtime.gateway';
import { ExamRuntimeProcessor } from './exam-runtime.processor';
import { ExamRuntimeQueueService } from './exam-runtime-queue.service';
import { ExamRuntimeService } from './exam-runtime.service';
import { EXAM_RUNTIME_QUEUE } from './exam-runtime.constants';

function getRedisConnection(config: ConfigService) {
  const redisUrl = config.get<string>('REDIS_URL');
  const redisPassword = config.get<string>('REDIS_PASSWORD');
  if (!redisUrl) {
    return {
      host: '127.0.0.1',
      port: 6379,
      password: redisPassword || undefined,
    };
  }

  const parsed = new URL(redisUrl);
  const db = parsed.pathname ? Number(parsed.pathname.replace('/', '')) : 0;
  const tls = parsed.protocol === 'rediss:' ? {} : undefined;

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password
      ? decodeURIComponent(parsed.password)
      : redisPassword || undefined,
    db: Number.isNaN(db) ? 0 : db,
    ...(tls !== undefined ? { tls } : {}),
  };
}

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NotificationModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: getRedisConnection(config),
      }),
    }),
    BullModule.registerQueue({
      name: EXAM_RUNTIME_QUEUE,
    }),
  ],
  controllers: [ExamRuntimeController],
  providers: [
    ExamRuntimeEventsService,
    ExamRuntimeGateway,
    ExamRuntimeProcessor,
    ExamRuntimeQueueService,
    ExamRuntimeService,
  ],
  exports: [ExamRuntimeQueueService, ExamRuntimeService],
})
export class ExamRuntimeModule {}
