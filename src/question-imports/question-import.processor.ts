import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUESTION_IMPORT_PARSE_JOB,
  QUESTION_IMPORT_CLEANUP_JOB,
  QUESTION_IMPORT_QUEUE,
} from './question-import.constants';
import { QuestionImportService } from './question-import.service';

@Injectable()
@Processor(QUESTION_IMPORT_QUEUE)
export class QuestionImportProcessor extends WorkerHost {
  constructor(private readonly service: QuestionImportService) {
    super();
  }

  async process(job: Job<{ importId: string }>) {
    if (job.name === QUESTION_IMPORT_PARSE_JOB) {
      return this.service.processImport(job.data.importId);
    }
    if (job.name === QUESTION_IMPORT_CLEANUP_JOB) {
      return this.service.cleanupExpired();
    }
    return undefined;
  }
}
