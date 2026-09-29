import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  QUESTION_IMPORT_PARSE_JOB,
  QUESTION_IMPORT_CLEANUP_INTERVAL_MS,
  QUESTION_IMPORT_CLEANUP_JOB,
  QUESTION_IMPORT_QUEUE,
} from './question-import.constants';

@Injectable()
export class QuestionImportQueueService implements OnModuleInit {
  constructor(
    @InjectQueue(QUESTION_IMPORT_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      QUESTION_IMPORT_CLEANUP_JOB,
      { every: QUESTION_IMPORT_CLEANUP_INTERVAL_MS },
      {
        name: QUESTION_IMPORT_CLEANUP_JOB,
        data: {},
        opts: { removeOnComplete: true, removeOnFail: 100 },
      },
    );
  }

  async enqueue(importId: string) {
    await this.queue.add(
      QUESTION_IMPORT_PARSE_JOB,
      { importId },
      {
        jobId: `parse-${importId}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
