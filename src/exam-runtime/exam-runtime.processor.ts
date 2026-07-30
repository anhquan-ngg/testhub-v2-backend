import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  EXAM_RUNTIME_JOBS,
  EXAM_RUNTIME_QUEUE,
} from './exam-runtime.constants';
import { ExamRuntimeService } from './exam-runtime.service';

@Injectable()
@Processor(EXAM_RUNTIME_QUEUE)
export class ExamRuntimeProcessor extends WorkerHost {
  constructor(private readonly runtimeService: ExamRuntimeService) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case EXAM_RUNTIME_JOBS.STARTING_SOON:
        return this.runtimeService.notifyExamStartingSoon(job.data.examId);
      case EXAM_RUNTIME_JOBS.OPEN:
        return this.runtimeService.emitExamOpen(job.data.examId);
      case EXAM_RUNTIME_JOBS.CLOSE:
        return this.runtimeService.emitExamClosed(job.data.examId);
      case EXAM_RUNTIME_JOBS.AUTO_SUBMIT_SUBMISSION:
        return this.runtimeService.autoSubmitSubmission(job.data.submissionId);
      case EXAM_RUNTIME_JOBS.GRADE_SUBMISSION:
        return this.runtimeService.gradeSubmission(job.data.submissionId);
      case EXAM_RUNTIME_JOBS.CLEANUP_SESSIONS:
        return this.runtimeService.cleanupInactiveSessions();
      default:
        return undefined;
    }
  }
}
