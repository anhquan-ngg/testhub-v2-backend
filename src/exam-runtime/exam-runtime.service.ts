import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ExamMode,
  ExamViolationSource,
  ExamViolationType,
  NotificationType,
  RegistrationStatus,
  Prisma,
  SubmissionRating,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';
import {
  CLIENT_REPORTABLE_VIOLATION_TYPES,
  EXAM_ENTRY_WINDOW_MINUTES,
  EXAM_RUNTIME_EVENTS,
  EXAM_SESSION_TIMEOUT_MS,
  EXAM_SESSION_WARN_MS,
  EXTEND_TIME_MAX_MINUTES,
  EXTEND_TIME_MIN_MINUTES,
  VIOLATION_DEBOUNCE_MS,
  VIOLATION_MAX_PER_SUBMISSION,
} from './exam-runtime.constants';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import { ExamMonitorAggregator } from './exam-monitor-aggregator.service';
import { ExamRuntimeQueueService } from './exam-runtime-queue.service';
import { NotificationGateway } from '@/notification/notification.gateway';

type ProgressRow = { submission_id: string; total: number; answered: number };

export type PresenceState =
  | 'NOT_STARTED'
  | 'ABSENT'
  | 'ONLINE'
  | 'UNSTABLE'
  | 'OFFLINE'
  | 'SUBMITTED';

export type MonitorRosterRow = {
  student: { id: string; full_name: string; email: string };
  registered: boolean;
  submission_id: string | null;
  status: SubmissionStatus | null;
  attempt: number;
  started_at: string | null;
  submitted_at: string | null;
  last_ping: string | null;
  answered: number;
  total: number;
  violations: number;
  last_violation_type: ExamViolationType | null;
  last_violation_at: string | null;
  presence: PresenceState;
};

export type MonitorRosterResponse = {
  exam: {
    id: string;
    title: string;
    exam_start_time: string;
    exam_end_time: string;
    duration: number;
    practice: boolean;
    is_public: boolean;
    entry_deadline: string;
  };
  server_time: string;
  summary: {
    registered: number;
    not_started: number;
    online: number;
    unstable: number;
    offline: number;
    submitted: number;
    absent: number;
    total_violations: number;
  };
  rows: MonitorRosterRow[];
};

type ExamDistributionItem = {
  question_type: string;
  question_format: string;
  quantity: number;
};

type ExamChapterDistributionItem = {
  chapter_id: string;
  quantity: number;
};

type QuestionFileRow = {
  id: string;
  url: string;
  name: string;
  type: string;
  order: number;
};

type ExamQuestionRow = {
  id: string;
  question_text: string;
  options: unknown;
  question_type: string;
  question_format: string;
  files: QuestionFileRow[];
};

@Injectable()
export class ExamRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(ExamRuntimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ExamRuntimeEventsService,
    private readonly queue: ExamRuntimeQueueService,
    private readonly notificationGateway: NotificationGateway,
    private readonly monitor: ExamMonitorAggregator,
  ) {}

  async onModuleInit() {
    try {
      const upcomingExams = await this.prisma.exam.findMany({
        where: {
          is_deleted: false,
          exam_end_time: { gt: new Date() },
        },
        select: {
          id: true,
          exam_start_time: true,
          exam_end_time: true,
        },
      });

      await Promise.all(
        upcomingExams.map((exam) => this.queue.scheduleExam(exam)),
      );
    } catch (error: any) {
      this.logger.warn(
        `Failed to bootstrap exam schedules: ${error?.message ?? error}`,
      );
    }
  }

  async getSession(examId: string, studentId: string) {
    const submission = await this.findInProgressSubmission(examId, studentId);
    const status = await this.getExamStatus(examId, studentId);
    if (!submission) {
      return {
        data: {
          ...status,
          hasActiveSubmission: false,
        },
      };
    }

    return {
      data: {
        ...status,
        hasActiveSubmission: true,
        ...(await this.ensureSessionQuestions(submission.id, examId)),
        ...(await this.formatSubmissionExam(submission.id)),
      },
    };
  }

  async getExamStatus(examId: string, studentId: string) {
    const exam = await this.findExam(examId);
    await this.assertCanAccessExam(exam, studentId);

    const activeSubmission = await this.findInProgressSubmission(
      examId,
      studentId,
    );
    const now = new Date();
    const startTime = new Date(exam.exam_start_time);
    const endTime = new Date(exam.exam_end_time);
    const entryDeadline = new Date(
      startTime.getTime() + EXAM_ENTRY_WINDOW_MINUTES * 60 * 1000,
    );
    const activeCount = await this.getActiveCount(examId);
    const isOpen = now >= startTime && now <= endTime;
    const canStart =
      !!activeSubmission ||
      (now >= startTime && now <= entryDeadline && now <= endTime);

    return {
      examId,
      serverTime: now.toISOString(),
      isOpen,
      canStart,
      reason: this.getStartBlockReason(now, startTime, entryDeadline, endTime),
      entryDeadline: entryDeadline.toISOString(),
      activeCount,
    };
  }

  async startExam(examId: string, studentId: string) {
    const exam = await this.findExam(examId);
    await this.assertCanAccessExam(exam, studentId);

    const existing = await this.findInProgressSubmission(examId, studentId);
    if (existing) {
      await this.ensureSubmissionQuestions(existing.id, exam);
      await this.touchSession(existing.id);
      return { data: await this.formatSubmissionExam(existing.id) };
    }

    const retryGrant = await this.assertRetakeAllowed(exam, studentId);

    // A lecturer only grants a retry once the student's original attempt
    // ran into (or past) the entry window / exam_end_time — enforcing the
    // normal window here would make every granted retry immediately
    // rejected by the very check it exists to bypass.
    if (!retryGrant) {
      this.assertWithinStartWindow(exam);
    }
    const now = new Date();
    const autoSubmitAt = retryGrant
      // exam_end_time is no longer a meaningful cap once a retry has been
      // explicitly granted after it — the student gets one full fresh
      // duration from whenever they actually start.
      ? new Date(now.getTime() + exam.duration * 60 * 1000)
      : new Date(
          Math.min(
            now.getTime() + exam.duration * 60 * 1000,
            new Date(exam.exam_end_time).getTime(),
          ),
        );

    try {
      const submission = await this.prisma.$transaction(async (tx) => {
        const createdSubmission = await tx.submission.create({
          data: {
            exam_id: exam.id,
            student_id: studentId,
            start_time: now,
            status: SubmissionStatus.IN_PROGRESS,
            auto_submit_at: autoSubmitAt,
          },
        });

        await this.ensureSubmissionQuestions(createdSubmission.id, exam, tx);

        await tx.examSession.upsert({
          where: { submission_id: createdSubmission.id },
          create: {
            submission_id: createdSubmission.id,
            entered_at: now,
            last_ping: now,
            is_active: true,
          },
          update: {
            last_ping: now,
            is_active: true,
          },
        });

        if (retryGrant) {
          await tx.examRetryGrant.update({
            where: { id: retryGrant.id },
            data: { consumed_at: now },
          });
        }

        return createdSubmission;
      });

      await this.queue.scheduleAutoSubmit(submission.id, autoSubmitAt);
      await this.emitActiveCount(exam.id);
      this.monitor.markDirty(exam.id, submission.id);

      return { data: await this.formatSubmissionExam(submission.id) };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const racedSubmission = await this.findInProgressSubmission(
          examId,
          studentId,
        );
        if (racedSubmission) {
          await this.ensureSubmissionQuestions(racedSubmission.id, exam);
          await this.touchSession(racedSubmission.id);
          return { data: await this.formatSubmissionExam(racedSubmission.id) };
        }
      }
      throw error;
    }
  }

  async heartbeat(submissionId: string, studentId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        student_id: studentId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      select: {
        id: true,
        exam_id: true,
        auto_submit_at: true,
        session: { select: { is_active: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Active submission not found');
    }

    // Only emit ACTIVE_COUNT on the false -> true transition. Emitting on
    // every ping (as before) means 200 students pinging every 20s each
    // trigger a COUNT(*)-with-join + a Redis publish fanned out to every
    // subscriber — the fix would make the presence feature strictly worse
    // than the bug it replaces.
    const wasInactive = !submission.session?.is_active;
    const session = await this.touchSession(submission.id);

    this.monitor.markDirty(submission.exam_id, submissionId);
    if (wasInactive) {
      await this.emitActiveCount(submission.exam_id);
    }

    return {
      ok: true,
      submissionId,
      lastPing: session.last_ping.toISOString(),
      serverTime: new Date().toISOString(),
      // Carried on every ping so an open exam tab picks up a lecturer's
      // "extend time" grant without needing its own push channel.
      autoSubmitAt: submission.auto_submit_at?.toISOString() ?? null,
    };
  }

  /**
   * Records one proctoring signal reported by the student's own browser.
   * CONNECTION_LOST is rejected here — it is only ever created server-side
   * by `cleanupInactiveSessions`, the one signal a client cannot suppress
   * without also making itself genuinely unreachable.
   */
  async reportViolation(
    submissionId: string,
    studentId: string,
    input: {
      type: ExamViolationType;
      durationMs?: number;
      clientTime?: string;
    },
  ): Promise<{ accepted: boolean; reason?: string }> {
    if (!CLIENT_REPORTABLE_VIOLATION_TYPES.includes(input.type)) {
      throw new BadRequestException('This violation type cannot be self-reported');
    }

    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        student_id: studentId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      select: {
        id: true,
        exam_id: true,
        exam: { select: { exam_end_time: true, practice: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Active submission not found');
    }

    if (new Date() > new Date(submission.exam.exam_end_time)) {
      return { accepted: false, reason: 'EXAM_CLOSED' };
    }

    // Practice runs are not proctored — drop silently, no row, no signal.
    if (submission.exam.practice) {
      return { accepted: false, reason: 'NOT_PROCTORED' };
    }

    const debounceMs = VIOLATION_DEBOUNCE_MS[input.type];
    if (debounceMs > 0) {
      const recent = await this.prisma.examViolation.findFirst({
        where: {
          submission_id: submissionId,
          type: input.type,
          occurred_at: { gt: new Date(Date.now() - debounceMs) },
        },
        select: { id: true },
      });
      if (recent) {
        return { accepted: false, reason: 'DEBOUNCED' };
      }
    }

    const existingCount = await this.prisma.examViolation.count({
      where: { submission_id: submissionId },
    });
    if (existingCount >= VIOLATION_MAX_PER_SUBMISSION) {
      return { accepted: false, reason: 'BUDGET_EXCEEDED' };
    }

    await this.recordViolation(submission.exam_id, submissionId, studentId, {
      type: input.type,
      source: ExamViolationSource.CLIENT,
      durationMs: input.durationMs,
      clientTime: input.clientTime ? new Date(input.clientTime) : undefined,
    });

    return { accepted: true };
  }

  private async recordViolation(
    examId: string,
    submissionId: string,
    studentId: string,
    input: {
      type: ExamViolationType;
      source: ExamViolationSource;
      durationMs?: number;
      clientTime?: Date;
    },
  ) {
    const violation = await this.prisma.examViolation.create({
      data: {
        exam_id: examId,
        submission_id: submissionId,
        student_id: studentId,
        type: input.type,
        source: input.source,
        duration_ms: input.durationMs,
        client_time: input.clientTime,
      },
    });

    const violationCount = await this.prisma.examViolation.count({
      where: { submission_id: submissionId },
    });

    this.monitor.markDirty(examId, submissionId);
    this.events.emit(examId, EXAM_RUNTIME_EVENTS.MONITOR_VIOLATION, {
      submissionId,
      studentId,
      type: violation.type,
      source: violation.source,
      occurredAt: violation.occurred_at.toISOString(),
      violationCount,
    });

    return violation;
  }

  /** Lecturer/admin authorization for the monitoring endpoints — a sibling
   * to `assertCanAccessExam` (student-centric), never modifying it. */
  async assertCanMonitorExam(
    exam: { id: string; lecturer_id: string },
    user: { id: string; role: UserRole },
  ) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.LECTURER && exam.lecturer_id === user.id) {
      return;
    }
    throw new ForbiddenException('Not allowed to monitor this exam');
  }

  private async findExamForLecturerAction(
    examId: string,
    user: { id: string; role: UserRole },
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, is_deleted: false },
      select: { id: true, title: true, lecturer_id: true, practice: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    await this.assertCanMonitorExam(exam, user);
    return exam;
  }

  /** Lecturer action, explicit and separate from deleting a submission: lets
   * one student who already has a COMPLETED submission on this official
   * exam start one more attempt. Covers the "connection lost until the
   * exam ended" case, where the student was auto-submitted and never got
   * to finish. Idempotent — re-clicking while an unconsumed grant already
   * exists just returns it instead of stacking extra attempts. */
  async grantRetry(
    examId: string,
    studentId: string,
    user: { id: string; role: UserRole },
  ) {
    const exam = await this.findExamForLecturerAction(examId, user);

    if (exam.practice) {
      throw new BadRequestException('Practice exams do not need a retry grant');
    }

    const existing = await this.findUsableRetryGrant(examId, studentId);
    if (existing) {
      return { data: existing };
    }

    const grant = await this.prisma.examRetryGrant.create({
      data: { exam_id: examId, student_id: studentId, granted_by: user.id },
    });

    try {
      await this.notificationGateway.sendToUser(studentId, {
        recipient_id: studentId,
        type: NotificationType.INFO,
        title: 'Được phép làm lại bài thi',
        content: `Giảng viên đã cho phép bạn làm lại bài thi "${exam.title}".`,
        target_id: examId,
        target_type: 'EXAM',
        link: `/exam/${examId}`,
      });
    } catch (error: any) {
      this.logger.warn(
        `Failed to notify retry grant for exam ${examId}/student ${studentId}: ${error?.message ?? error}`,
      );
    }

    return { data: grant };
  }

  /** Lecturer action, explicit and separate from deleting a submission:
   * pushes back one student's auto-submit deadline for their current
   * IN_PROGRESS attempt. Covers the "connection lost for a while, then
   * reconnected" case — the deadline may be pushed past the exam's own
   * end time on purpose, since that is exactly the situation being
   * compensated for. */
  async extendTime(
    examId: string,
    studentId: string,
    user: { id: string; role: UserRole },
    extraMinutes: number,
  ) {
    if (
      !Number.isFinite(extraMinutes) ||
      extraMinutes < EXTEND_TIME_MIN_MINUTES ||
      extraMinutes > EXTEND_TIME_MAX_MINUTES
    ) {
      throw new BadRequestException(
        `extraMinutes must be between ${EXTEND_TIME_MIN_MINUTES} and ${EXTEND_TIME_MAX_MINUTES}`,
      );
    }

    const exam = await this.findExamForLecturerAction(examId, user);
    if (exam.practice) {
      throw new BadRequestException('Practice exams cannot be extended');
    }

    const submission = await this.prisma.submission.findFirst({
      where: {
        exam_id: examId,
        student_id: studentId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      orderBy: { created_at: 'desc' },
      select: { id: true, auto_submit_at: true },
    });

    if (!submission) {
      throw new NotFoundException(
        'This student has no in-progress attempt to extend',
      );
    }

    const base = submission.auto_submit_at ?? new Date();
    const newDeadline = new Date(base.getTime() + extraMinutes * 60 * 1000);

    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { auto_submit_at: newDeadline },
    });

    await this.queue.scheduleAutoSubmit(submission.id, newDeadline);
    this.monitor.markDirty(examId, submission.id);

    return {
      data: {
        submissionId: submission.id,
        auto_submit_at: newDeadline.toISOString(),
      },
    };
  }

  async getMonitorRoster(
    examId: string,
    user: { id: string; role: UserRole },
  ): Promise<MonitorRosterResponse> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, is_deleted: false },
      select: {
        id: true,
        title: true,
        lecturer_id: true,
        practice: true,
        is_public: true,
        exam_start_time: true,
        exam_end_time: true,
        duration: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    await this.assertCanMonitorExam(exam, user);

    const now = new Date();
    const entryDeadline = new Date(
      new Date(exam.exam_start_time).getTime() +
        EXAM_ENTRY_WINDOW_MINUTES * 60 * 1000,
    );

    const [registrations, submissions] = await Promise.all([
      this.prisma.examRegistration.findMany({
        where: {
          exam_id: examId,
          is_deleted: false,
          status: RegistrationStatus.APPROVED,
        },
        select: {
          student_id: true,
          student: { select: { id: true, full_name: true, email: true } },
        },
        orderBy: { student: { full_name: 'asc' } },
      }),
      this.prisma.submission.findMany({
        where: { exam_id: examId, is_deleted: false },
        select: {
          id: true,
          student_id: true,
          status: true,
          start_time: true,
          end_time: true,
          created_at: true,
          student: { select: { id: true, full_name: true, email: true } },
          session: { select: { last_ping: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const submissionIds = submissions.map((s) => s.id);

    const [progress, violationCounts, latestViolations] = await Promise.all([
      submissionIds.length
        ? this.prisma.$queryRaw<ProgressRow[]>`
            SELECT sq.submission_id,
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (
                     WHERE COALESCE(sq.answer, '') <> '' OR sq.options IS NOT NULL
                   )::int AS answered
            FROM "submission_questions" sq
            WHERE sq.submission_id = ANY(${submissionIds}::uuid[])
              AND sq.is_deleted = false
            GROUP BY sq.submission_id
          `
        : Promise.resolve([] as ProgressRow[]),
      submissionIds.length
        ? this.prisma.examViolation.groupBy({
            by: ['submission_id'],
            where: { submission_id: { in: submissionIds } },
            _count: { _all: true },
          })
        : Promise.resolve(
            [] as Array<{ submission_id: string; _count: { _all: number } }>,
          ),
      submissionIds.length
        ? this.prisma.examViolation.findMany({
            where: { submission_id: { in: submissionIds } },
            orderBy: { occurred_at: 'desc' },
            distinct: ['submission_id'],
            select: { submission_id: true, type: true, occurred_at: true },
          })
        : Promise.resolve(
            [] as Array<{
              submission_id: string;
              type: ExamViolationType;
              occurred_at: Date;
            }>,
          ),
    ]);

    const progressBy = new Map(progress.map((p) => [p.submission_id, p]));
    const violationCountBy = new Map(
      violationCounts.map((v) => [v.submission_id, v._count._all]),
    );
    const latestViolationBy = new Map(
      latestViolations.map((v) => [v.submission_id, v]),
    );

    const latestByStudent = new Map<string, (typeof submissions)[number]>();
    const attemptCount = new Map<string, number>();
    for (const submission of submissions) {
      attemptCount.set(
        submission.student_id,
        (attemptCount.get(submission.student_id) ?? 0) + 1,
      );
      if (!latestByStudent.has(submission.student_id)) {
        latestByStudent.set(submission.student_id, submission);
      }
    }

    const studentIds = new Set<string>([
      ...registrations.map((r) => r.student_id),
      ...submissions.map((s) => s.student_id),
    ]);
    const studentInfoById = new Map<
      string,
      { id: string; full_name: string; email: string }
    >();
    for (const r of registrations) studentInfoById.set(r.student_id, r.student);
    for (const s of submissions) studentInfoById.set(s.student_id, s.student);

    const summary = {
      registered: registrations.length,
      not_started: 0,
      online: 0,
      unstable: 0,
      offline: 0,
      submitted: 0,
      absent: 0,
      total_violations: 0,
    };

    const rows: MonitorRosterRow[] = [...studentIds].map((studentId) => {
      const student = studentInfoById.get(studentId)!;
      const registered = registrations.some(
        (r) => r.student_id === studentId,
      );
      const latestSubmission = latestByStudent.get(studentId) ?? null;
      const violations = latestSubmission
        ? (violationCountBy.get(latestSubmission.id) ?? 0)
        : 0;
      const latestViolation = latestSubmission
        ? latestViolationBy.get(latestSubmission.id)
        : undefined;
      const progressRow = latestSubmission
        ? progressBy.get(latestSubmission.id)
        : undefined;
      const lastPing = latestSubmission?.session?.last_ping ?? null;

      const presence = this.derivePresence({
        status: latestSubmission?.status ?? null,
        lastPing,
        fallbackStart: latestSubmission?.start_time ?? null,
        now,
        entryDeadline,
      });

      summary.total_violations += violations;
      switch (presence) {
        case 'NOT_STARTED':
          summary.not_started += 1;
          break;
        case 'ONLINE':
          summary.online += 1;
          break;
        case 'UNSTABLE':
          summary.unstable += 1;
          break;
        case 'OFFLINE':
          summary.offline += 1;
          break;
        case 'SUBMITTED':
          summary.submitted += 1;
          break;
        case 'ABSENT':
          summary.absent += 1;
          break;
      }

      return {
        student,
        registered,
        submission_id: latestSubmission?.id ?? null,
        status: latestSubmission?.status ?? null,
        attempt: attemptCount.get(studentId) ?? 0,
        started_at: latestSubmission?.start_time?.toISOString() ?? null,
        submitted_at: latestSubmission?.end_time?.toISOString() ?? null,
        last_ping: lastPing?.toISOString() ?? null,
        answered: progressRow?.answered ?? 0,
        total: progressRow?.total ?? 0,
        violations,
        last_violation_type: latestViolation?.type ?? null,
        last_violation_at: latestViolation?.occurred_at.toISOString() ?? null,
        presence,
      };
    });

    rows.sort((a, b) => a.student.full_name.localeCompare(b.student.full_name));

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        exam_start_time: exam.exam_start_time.toISOString(),
        exam_end_time: exam.exam_end_time.toISOString(),
        duration: exam.duration,
        practice: exam.practice,
        is_public: exam.is_public,
        entry_deadline: entryDeadline.toISOString(),
      },
      server_time: now.toISOString(),
      summary,
      rows,
    };
  }

  /** Presence is always derived from `last_ping` age, never read from the
   * `ExamSession.is_active` flag — that flag is only recomputed by the 30s
   * cleanup job, so if Redis/BullMQ ever stalls, derived presence stays
   * correct while the flag would freeze stale. */
  private derivePresence(input: {
    status: SubmissionStatus | null;
    lastPing: Date | null;
    fallbackStart: Date | null;
    now: Date;
    entryDeadline: Date;
  }): PresenceState {
    if (!input.status) {
      return input.now > input.entryDeadline ? 'ABSENT' : 'NOT_STARTED';
    }
    if (input.status !== SubmissionStatus.IN_PROGRESS) {
      return 'SUBMITTED';
    }
    const anchor = input.lastPing ?? input.fallbackStart ?? input.now;
    const age = input.now.getTime() - anchor.getTime();
    if (age <= EXAM_SESSION_WARN_MS) return 'ONLINE';
    if (age <= EXAM_SESSION_TIMEOUT_MS) return 'UNSTABLE';
    return 'OFFLINE';
  }

  async completeSubmission(
    submissionId: string,
    endTime = new Date(),
    startTime?: Date,
    studentId?: string,
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        is_deleted: false,
        ...(studentId ? { student_id: studentId } : {}),
      },
      select: {
        id: true,
        exam_id: true,
        status: true,
        start_time: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== SubmissionStatus.COMPLETED) {
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.COMPLETED,
          end_time: endTime,
          ...(submission.start_time
            ? {}
            : { start_time: startTime ?? endTime }),
        },
      });
    }

    await this.prisma.examSession.updateMany({
      where: { submission_id: submissionId },
      data: { is_active: false, last_ping: endTime },
    });

    await this.queue.enqueueGradeSubmission(submissionId);
    await this.emitActiveCount(submission.exam_id);
    this.monitor.markDirty(submission.exam_id, submissionId);

    return { data: { submission_id: submissionId } };
  }

  async autoSubmitSubmission(submissionId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      select: { id: true },
    });

    if (!submission) {
      return;
    }

    await this.completeSubmission(submissionId, new Date());
  }

  async gradeSubmission(submissionId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, is_deleted: false },
      include: {
        exam: { select: { title: true } },
        questions: { select: { score: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const questionCount = submission.questions.length;
    const totalScore =
      questionCount > 0
        ? (submission.questions.reduce(
            (total, question) =>
              total + (question.score ? Number(question.score) : 0),
            0,
          ) *
            10) /
          questionCount
        : 0;
    const roundedScore = Math.round(totalScore * 100) / 100;
    const rating = this.getRating(roundedScore);

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        total_score: roundedScore,
        rating,
      },
    });

    try {
      await this.notificationGateway.sendToUser(submission.student_id, {
        recipient_id: submission.student_id,
        type: NotificationType.SUCCESS,
        title: 'Bài thi đã được chấm',
        content: `Bài thi "${submission.exam.title}" đã có kết quả.`,
        target_id: submissionId,
        target_type: 'SUBMISSION',
        link: `/result/${submissionId}`,
      });
    } catch (notifyError: any) {
      this.logger.warn(
        `Failed to send grade notification for submission ${submissionId}: ${notifyError?.message ?? notifyError}`,
      );
    }
  }

  async notifyExamStartingSoon(examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, is_deleted: false },
      include: {
        registrations: {
          where: {
            is_deleted: false,
            status: RegistrationStatus.APPROVED,
          },
          select: { student_id: true },
        },
      },
    });

    if (!exam) {
      return;
    }

    await Promise.all(
      exam.registrations.map((registration) =>
        this.notificationGateway.sendToUser(registration.student_id, {
          recipient_id: registration.student_id,
          type: NotificationType.INFO,
          title: 'Bài thi sắp bắt đầu',
          content: `Bài thi "${exam.title}" sẽ bắt đầu sau 15 phút.`,
          target_id: exam.id,
          target_type: 'EXAM',
          link: `/exam/${exam.id}`,
        }),
      ),
    );
  }

  async emitExamOpen(examId: string) {
    const activeCount = await this.getActiveCount(examId);
    this.events.emit(examId, EXAM_RUNTIME_EVENTS.OPEN, { activeCount });
  }

  async emitExamClosed(examId: string) {
    const activeCount = await this.getActiveCount(examId);
    this.events.emit(examId, EXAM_RUNTIME_EVENTS.CLOSED, { activeCount });
  }

  async cleanupInactiveSessions() {
    const staleBefore = new Date(Date.now() - EXAM_SESSION_TIMEOUT_MS);
    const sessions = await this.prisma.examSession.findMany({
      where: {
        is_active: true,
        last_ping: { lt: staleBefore },
      },
      select: {
        submission_id: true,
        submission: {
          select: { exam_id: true, student_id: true, status: true },
        },
      },
    });

    if (sessions.length > 0) {
      // Scoped to the exact sessions just fetched, not re-run against the
      // same time predicate — a session that crosses the stale threshold
      // between the findMany above and this updateMany would otherwise get
      // deactivated here without the matching CONNECTION_LOST violation or
      // emitActiveCount below, since those only iterate `sessions`.
      await this.prisma.examSession.updateMany({
        where: {
          submission_id: { in: sessions.map((s) => s.submission_id) },
          is_active: true,
          last_ping: { lt: staleBefore },
        },
        data: { is_active: false },
      });
    }

    const examIds = [...new Set(sessions.map((s) => s.submission.exam_id))];
    await Promise.all(examIds.map((examId) => this.emitActiveCount(examId)));

    // CONNECTION_LOST is the one tamper-resistant proctoring signal: a
    // student cannot forge presence without keeping the page reachable,
    // and cannot suppress the absence of a ping. Emitted only here, on the
    // true -> false transition, at most once per offline stretch.
    await Promise.all(
      sessions
        .filter((s) => s.submission.status === SubmissionStatus.IN_PROGRESS)
        .map((s) =>
          this.recordViolation(
            s.submission.exam_id,
            s.submission_id,
            s.submission.student_id,
            {
              type: ExamViolationType.CONNECTION_LOST,
              source: ExamViolationSource.SERVER,
            },
          ).catch((error: any) => {
            this.logger.warn(
              `Failed to record CONNECTION_LOST for submission ${s.submission_id}: ${error?.message ?? error}`,
            );
          }),
        ),
    );

    // Safety net: a scheduled AUTO_SUBMIT job lives only in Redis. If it
    // was ever lost (e.g. a Redis flush mid-exam), an IN_PROGRESS
    // submission whose exam has already ended would otherwise haunt the
    // roster as a permanently-OFFLINE ghost row forever.
    const overdue = await this.prisma.submission.findMany({
      where: {
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
        OR: [
          // Normal case: this submission's own (possibly extended) deadline
          // has passed.
          { auto_submit_at: { lt: new Date() } },
          // Legacy rows created before auto_submit_at existed, or any other
          // way it ended up unset — fall back to the exam's hard end time.
          {
            auto_submit_at: null,
            exam: { exam_end_time: { lt: new Date() } },
          },
        ],
      },
      select: { id: true },
      take: 200,
    });
    await Promise.all(
      overdue.map((s) =>
        this.autoSubmitSubmission(s.id).catch((error: any) => {
          this.logger.warn(
            `Overdue auto-submit safety net failed for submission ${s.id}: ${error?.message ?? error}`,
          );
        }),
      ),
    );
  }

  async emitActiveCount(examId: string) {
    const activeCount = await this.getActiveCount(examId);
    this.events.emit(examId, EXAM_RUNTIME_EVENTS.ACTIVE_COUNT, {
      activeCount,
    });
  }

  async getActiveCount(examId: string) {
    return this.prisma.examSession.count({
      where: {
        is_active: true,
        submission: {
          exam_id: examId,
          status: SubmissionStatus.IN_PROGRESS,
          is_deleted: false,
        },
      },
    });
  }

  private async findExam(examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        is_deleted: false,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  private async findInProgressSubmission(examId: string, studentId: string) {
    return this.prisma.submission.findFirst({
      where: {
        exam_id: examId,
        student_id: studentId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
  }

  private async assertCanAccessExam(
    exam: { id: string; practice: boolean; is_public: boolean },
    studentId: string,
  ) {
    if (exam.practice || exam.is_public) {
      return;
    }

    const registration = await this.prisma.examRegistration.findFirst({
      where: {
        exam_id: exam.id,
        student_id: studentId,
        is_deleted: false,
        status: RegistrationStatus.APPROVED,
      },
      select: { id: true },
    });

    if (!registration) {
      throw new ForbiddenException('Student is not approved for this exam');
    }
  }

  /** Official (non-practice) exams block re-entry once a student has a
   * COMPLETED submission — manual or auto-submitted-on-timeout count the
   * same. An unconsumed `ExamRetryGrant` (lecturer-issued, via
   * `grantRetry`) is the only way past this, and it is one-shot: the
   * caller must consume it in the same transaction that creates the new
   * submission. Practice exams are never blocked. */
  private async assertRetakeAllowed(
    exam: { id: string; practice: boolean },
    studentId: string,
  ) {
    if (exam.practice) {
      return null;
    }

    const priorCompleted = await this.prisma.submission.findFirst({
      where: {
        exam_id: exam.id,
        student_id: studentId,
        status: SubmissionStatus.COMPLETED,
        is_deleted: false,
      },
      select: { id: true },
    });

    if (!priorCompleted) {
      return null;
    }

    const grant = await this.findUsableRetryGrant(exam.id, studentId);
    if (!grant) {
      throw new ForbiddenException(
        'This exam has already been completed and cannot be retaken',
      );
    }

    return grant;
  }

  private async findUsableRetryGrant(examId: string, studentId: string) {
    return this.prisma.examRetryGrant.findFirst({
      where: { exam_id: examId, student_id: studentId, consumed_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  private assertWithinStartWindow(exam: {
    exam_start_time: Date;
    exam_end_time: Date;
  }) {
    const now = new Date();
    const startTime = new Date(exam.exam_start_time);
    const endTime = new Date(exam.exam_end_time);
    const entryDeadline = new Date(
      startTime.getTime() + EXAM_ENTRY_WINDOW_MINUTES * 60 * 1000,
    );

    if (now < startTime) {
      throw new BadRequestException('Exam has not started yet');
    }

    if (now > endTime) {
      throw new BadRequestException('Exam is closed');
    }

    if (now > entryDeadline) {
      throw new BadRequestException('Exam entry window is closed');
    }
  }

  private getStartBlockReason(
    now: Date,
    startTime: Date,
    entryDeadline: Date,
    endTime: Date,
  ) {
    if (now < startTime) return 'NOT_STARTED';
    if (now > endTime) return 'EXAM_CLOSED';
    if (now > entryDeadline) return 'ENTRY_WINDOW_CLOSED';
    return null;
  }

  private async touchSession(submissionId: string) {
    const now = new Date();
    return this.prisma.examSession.upsert({
      where: { submission_id: submissionId },
      create: {
        submission_id: submissionId,
        entered_at: now,
        last_ping: now,
        is_active: true,
      },
      update: {
        last_ping: now,
        is_active: true,
      },
    });
  }

  private async formatSubmissionExam(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: true,
        session: true,
        questions: {
          orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
          include: {
            question: {
              select: {
                id: true,
                question_text: true,
                options: true,
                question_type: true,
                question_format: true,
                files: {
                  orderBy: { order: 'asc' },
                  select: {
                    order: true,
                    file: {
                      select: { id: true, url: true, name: true, type: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const exam = submission.exam;
    return {
      id: exam.id,
      title: exam.title,
      duration: exam.duration,
      exam_start_time: exam.exam_start_time,
      exam_end_time: exam.exam_end_time,
      practice: exam.practice,
      mode: exam.mode,
      is_public: exam.is_public,
      questions: submission.questions.map((item) => ({
        ...item.question,
        files: (item.question as any).files?.map((qf: any) => ({
          ...qf.file,
          order: qf.order,
        })) ?? [],
        submitted_answer: item.answer ?? null,
        submitted_options: item.options ?? null,
        answered: item.answer != null || item.options != null,
      })),
      submissionId: submission.id,
      entered_at: submission.session?.entered_at ?? submission.start_time,
      last_ping: submission.session?.last_ping,
      time_limit_seconds: exam.duration * 60,
      auto_submit_at: submission.auto_submit_at,
    };
  }

  private async selectQuestions(examData: {
    id: string;
    topic_id: string;
    mode: ExamMode;
    sample_size: number | null;
    distribution: string | null;
  }) {
    let questions: ExamQuestionRow[] = [];

    if (examData.mode === ExamMode.MANUAL) {
      const examQuestions = await this.prisma.examQuestions.findMany({
        where: {
          exam_id: examData.id,
          is_deleted: false,
          question: { is_deleted: false },
        },
        include: {
          question: {
            select: {
              id: true,
              question_text: true,
              options: true,
              question_type: true,
              question_format: true,
              files: {
                orderBy: { order: 'asc' },
                select: {
                  order: true,
                  file: {
                    select: { id: true, url: true, name: true, type: true },
                  },
                },
              },
            },
          },
        },
      });
      questions = examQuestions.map((eq) => ({
        ...(eq.question as any),
        files: (eq.question as any).files?.map((qf: any) => ({
          ...qf.file,
          order: qf.order,
        })) ?? [],
      })) as ExamQuestionRow[];
    } else if (examData.mode === ExamMode.RANDOM_N) {
      const questionIdsRows = await this.prisma.question.findMany({
        where: {
          is_deleted: false,
          chapter: {
            topic_id: examData.topic_id,
            is_deleted: false,
          },
        },
        select: {
          id: true,
        },
      });
      const questionIds = questionIdsRows.map((q) => q.id);

      const sampleSize = examData.sample_size
        ? Number(examData.sample_size)
        : questionIds.length;
      const shuffled = [...questionIds];
      const n = shuffled.length;
      const limit = Math.min(sampleSize, n);
      for (let i = 0; i < limit; i++) {
        const j = i + Math.floor(Math.random() * (n - i));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }
      const selectedIds = shuffled.slice(0, limit);

      if (selectedIds.length > 0) {
        const questionRows = await this.prisma.question.findMany({
          where: {
            id: { in: selectedIds },
          },
          select: {
            id: true,
            question_text: true,
            options: true,
            question_type: true,
            question_format: true,
            files: {
              orderBy: { order: 'asc' },
              select: {
                order: true,
                file: {
                  select: { id: true, url: true, name: true, type: true },
                },
              },
            },
          },
        });
        questions = questionRows.map((q) => ({
          ...q,
          files: (q.files ?? []).map((qf) => ({ ...qf.file, order: qf.order })),
        })) as ExamQuestionRow[];
      }
      this.assertEnoughQuestions(
        questions.length,
        examData.sample_size,
        'RANDOM_N',
      );
    } else if (examData.mode === ExamMode.BY_TYPE) {
      let parsedDistribution: ExamDistributionItem[];
      try {
        parsedDistribution = examData.distribution
          ? (JSON.parse(examData.distribution) as ExamDistributionItem[])
          : [];
      } catch {
        throw new BadRequestException(
          'Exam distribution data is malformed (BY_TYPE)',
        );
      }
      const byTypeResults = await Promise.all(
        parsedDistribution.map((distribution) =>
          this.prisma.$queryRaw<ExamQuestionRow[]>`
            SELECT
              q.id,
              q.question_text,
              q.options,
              q.question_type,
              q.question_format
            FROM "questions" AS q
            INNER JOIN "chapters" AS c ON c.id = q.chapter_id
            WHERE c.topic_id = ${examData.topic_id}
              AND c.is_deleted = false
              AND q.is_deleted = false
              AND q.question_type::text = ${distribution.question_type}
              AND q.question_format::text = ${distribution.question_format}
            ORDER BY RANDOM()
            LIMIT ${distribution.quantity}
          `,
        ),
      );
      const flatByType = byTypeResults.flat();
      for (let i = 0; i < parsedDistribution.length; i++) {
        this.assertEnoughQuestions(
          byTypeResults[i].length,
          parsedDistribution[i].quantity,
          `BY_TYPE (${parsedDistribution[i].question_type}/${parsedDistribution[i].question_format})`,
        );
      }
      const enrichedByType = await this.enrichQuestionsWithFiles(flatByType);
      questions.push(...enrichedByType);
    } else if (examData.mode === ExamMode.BY_CHAPTER) {
      let parsedDistribution: ExamChapterDistributionItem[];
      try {
        parsedDistribution = examData.distribution
          ? (JSON.parse(
              examData.distribution,
            ) as ExamChapterDistributionItem[])
          : [];
      } catch {
        throw new BadRequestException(
          'Exam distribution data is malformed (BY_CHAPTER)',
        );
      }
      const byChapterResults = await Promise.all(
        parsedDistribution.map((distribution) =>
          this.prisma.$queryRaw<ExamQuestionRow[]>`
            SELECT
              q.id,
              q.question_text,
              q.options,
              q.question_type,
              q.question_format
            FROM "questions" AS q
            INNER JOIN "chapters" AS c ON c.id = q.chapter_id
            WHERE c.topic_id = ${examData.topic_id}
              AND c.is_deleted = false
              AND q.is_deleted = false
              AND (
                q.chapter_id = ${distribution.chapter_id}
                OR c.parent_id = ${distribution.chapter_id}
              )
            ORDER BY RANDOM()
            LIMIT ${distribution.quantity}
          `,
        ),
      );
      const flatByChapter = byChapterResults.flat();
      for (let i = 0; i < parsedDistribution.length; i++) {
        this.assertEnoughQuestions(
          byChapterResults[i].length,
          parsedDistribution[i].quantity,
          `BY_CHAPTER (${parsedDistribution[i].chapter_id})`,
        );
      }
      const enrichedByChapter =
        await this.enrichQuestionsWithFiles(flatByChapter);
      questions.push(...enrichedByChapter);
    }

    if (questions.length === 0) {
      throw new BadRequestException('No questions available for this exam');
    }

    return questions;
  }

  private async enrichQuestionsWithFiles(
    rows: ExamQuestionRow[],
  ): Promise<ExamQuestionRow[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((q) => q.id);
    const withFiles = await this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        files: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            file: {
              select: { id: true, url: true, name: true, type: true },
            },
          },
        },
      },
    });
    const filesById = new Map(
      withFiles.map((q) => [
        q.id,
        q.files.map((qf) => ({ ...qf.file, order: qf.order })),
      ]),
    );
    return rows.map((q) => ({ ...q, files: filesById.get(q.id) ?? [] }));
  }

  private async ensureSubmissionQuestions(
    submissionId: string,
    examData: {
      id: string;
      topic_id: string;
      mode: ExamMode;
      sample_size: number | null;
      distribution: string | null;
    },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const existingCount = await db.submissionQuestions.count({
      where: { submission_id: submissionId },
    });

    if (existingCount > 0) {
      return;
    }

    const questions = await this.selectQuestions(examData);
    const orderedQuestions = this.shuffleArray(questions);

    await db.submissionQuestions.createMany({
      data: orderedQuestions.map((question, index) => ({
        submission_id: submissionId,
        question_id: question.id,
        order: index,
      })),
      skipDuplicates: true,
    });
  }

  private shuffleArray<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async ensureSessionQuestions(submissionId: string, examId: string) {
    const exam = await this.findExam(examId);
    await this.ensureSubmissionQuestions(submissionId, exam);
    return {};
  }

  private assertEnoughQuestions(
    found: number,
    required: number | null | undefined,
    context: string,
  ) {
    const requiredCount = Number(required ?? 0);

    if (requiredCount <= 0 || found >= requiredCount) {
      return;
    }

    throw new BadRequestException(
      `Not enough questions available for ${context}. Required: ${requiredCount}, Found: ${found}`,
    );
  }

  private getRating(score: number): SubmissionRating {
    if (score >= 9) return SubmissionRating.EXCELLENT;
    if (score >= 7) return SubmissionRating.GOOD;
    if (score >= 5) return SubmissionRating.AVERAGE;
    return SubmissionRating.POOR;
  }
}
