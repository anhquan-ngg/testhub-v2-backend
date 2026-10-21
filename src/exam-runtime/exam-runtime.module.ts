import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';
import { ExamRuntimeController } from './exam-runtime.controller';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import { ExamMonitorAggregator } from './exam-monitor-aggregator.service';
import { ExamRuntimeGateway } from './exam-runtime.gateway';
import { ExamRuntimeProcessor } from './exam-runtime.processor';
import { ExamRuntimeQueueService } from './exam-runtime-queue.service';
import { ExamRuntimeService } from './exam-runtime.service';
import { EXAM_RUNTIME_QUEUE } from './exam-runtime.constants';

import { getRedisConnection } from '../common/redis-connection';

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
    ExamMonitorAggregator,
    ExamRuntimeGateway,
    ExamRuntimeProcessor,
    ExamRuntimeQueueService,
    ExamRuntimeService,
  ],
  exports: [ExamRuntimeQueueService, ExamRuntimeService, ExamMonitorAggregator],
})
export class ExamRuntimeModule {}
