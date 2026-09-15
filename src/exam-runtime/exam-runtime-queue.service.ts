import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EXAM_RUNTIME_JOBS,
  EXAM_RUNTIME_QUEUE,
  EXAM_SESSION_CLEANUP_MS,
  EXAM_STARTING_SOON_MINUTES,
} from './exam-runtime.constants';

type SchedulableExam = {
  id: string;
  exam_start_time: Date;
  exam_end_time: Date;
};

const JOB_ID_SEPARATOR = '__';

@Injectable()
export class ExamRuntimeQueueService implements OnModuleInit {
  private readonly logger = new Logger(ExamRuntimeQueueService.name);

  constructor(
    @InjectQueue(EXAM_RUNTIME_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      EXAM_RUNTIME_JOBS.CLEANUP_SESSIONS,
      { every: EXAM_SESSION_CLEANUP_MS },
      {
        name: EXAM_RUNTIME_JOBS.CLEANUP_SESSIONS,
        data: {},
        opts: { removeOnComplete: true, removeOnFail: 100 },
      },
    );
  }

  async scheduleExam(exam: SchedulableExam) {
    await this.removeExamJobs(exam.id);

    const startAt = new Date(exam.exam_start_time).getTime();
    const endAt = new Date(exam.exam_end_time).getTime();
    const notifyAt = startAt - EXAM_STARTING_SOON_MINUTES * 60 * 1000;

    await this.addDelayedExamJob(
      EXAM_RUNTIME_JOBS.STARTING_SOON,
      exam.id,
      notifyAt,
    );
    await this.addDelayedExamJob(EXAM_RUNTIME_JOBS.OPEN, exam.id, startAt);
    await this.addDelayedExamJob(EXAM_RUNTIME_JOBS.CLOSE, exam.id, endAt);
  }

  async removeExamJobs(examId: string) {
    await Promise.all([
      this.removeJob(this.buildJobId(EXAM_RUNTIME_JOBS.STARTING_SOON, examId)),
      this.removeJob(this.buildJobId(EXAM_RUNTIME_JOBS.OPEN, examId)),
      this.removeJob(this.buildJobId(EXAM_RUNTIME_JOBS.CLOSE, examId)),
    ]);
  }

  /** Idempotent: removes any previously scheduled auto-submit job for this
   * submission first, so it doubles as a reschedule when a lecturer grants
   * extra time to a student already in progress. */
  async scheduleAutoSubmit(submissionId: string, runAt: Date) {
    const jobId = this.buildJobId(
      EXAM_RUNTIME_JOBS.AUTO_SUBMIT_SUBMISSION,
      submissionId,
    );
    await this.removeJob(jobId);
    await this.queue.add(
      EXAM_RUNTIME_JOBS.AUTO_SUBMIT_SUBMISSION,
      { submissionId },
      {
        jobId,
        delay: Math.max(0, runAt.getTime() - Date.now()),
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  async enqueueGradeSubmission(submissionId: string) {
    await this.queue.add(
      EXAM_RUNTIME_JOBS.GRADE_SUBMISSION,
      { submissionId },
      {
        jobId: this.buildJobId(
          EXAM_RUNTIME_JOBS.GRADE_SUBMISSION,
          submissionId,
        ),
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  private async addDelayedExamJob(name: string, examId: string, runAt: number) {
    const delay = runAt - Date.now();
    if (delay < 0) return;
    await this.queue.add(
      name,
      { examId },
      {
        jobId: this.buildJobId(name, examId),
        delay,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  private async removeJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (job) {
      try {
        await job.remove();
      } catch (err: any) {
        this.logger.warn(
          `Could not remove job ${jobId}: ${err?.message ?? err}`,
        );
      }
    }
  }

  private buildJobId(name: string, id: string) {
    return `${name}${JOB_ID_SEPARATOR}${id}`;
  }
}
