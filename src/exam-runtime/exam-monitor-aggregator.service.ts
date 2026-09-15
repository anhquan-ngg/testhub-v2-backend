import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import { EXAM_RUNTIME_EVENTS, MONITOR_TICK_MS } from './exam-runtime.constants';

type ProgressRow = { submission_id: string; total: number; answered: number };

/**
 * Coalesces "something changed" signals (a ping, an answer save, a
 * violation, a status flip) into at most one sparse EXAM_MONITOR_DELTA
 * broadcast per exam per tick. Without this, ~17 events/s of raw activity
 * (pings + answer saves for ~200 students) would each trigger a full
 * roster recompute broadcast to every lecturer tab watching that exam.
 *
 * Deliberately has no dependency on ExamRuntimeService — it rebuilds the
 * small "what changed" payload itself from Prisma directly, so marking
 * dirty (called from hot paths like ping/answer-save) never has to await
 * anything and can never form a dependency cycle.
 *
 * In-memory only: correct for the single-instance deployment this app
 * currently runs as. The day a second instance is added, the dirty set,
 * per-exam tick lock, and `seq` counter all need to move to Redis so
 * instances don't each emit their own (duplicate) delta — see the
 * monitoring design notes.
 */
@Injectable()
export class ExamMonitorAggregator implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExamMonitorAggregator.name);
  private readonly dirty = new Map<string, Set<string>>();
  private readonly seqByExam = new Map<string, number>();
  private readonly inFlight = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ExamRuntimeEventsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, MONITOR_TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** O(1), synchronous, no I/O — safe to call from any hot path. */
  markDirty(examId: string, submissionId: string): void {
    let set = this.dirty.get(examId);
    if (!set) {
      set = new Set();
      this.dirty.set(examId, set);
    }
    set.add(submissionId);
  }

  private async tick() {
    if (this.dirty.size === 0) return;

    // Skip any exam whose previous tick's emitDelta hasn't finished yet —
    // its dirty ids stay queued and get picked up once that call settles.
    // Other exams are unaffected.
    const entries = [...this.dirty.entries()].filter(
      ([examId]) => !this.inFlight.has(examId),
    );
    if (entries.length === 0) return;

    for (const [examId] of entries) {
      this.dirty.delete(examId);
      this.inFlight.add(examId);
    }

    await Promise.all(
      entries.map(([examId, ids]) =>
        this.emitDelta(examId, [...ids])
          .catch((error: any) => {
            this.logger.warn(
              `Monitor delta failed for exam ${examId}: ${error?.message ?? error}`,
            );
            // Don't lose these dirty markers on a transient failure — put
            // them back so the next tick retries.
            for (const id of ids) this.markDirty(examId, id);
          })
          .finally(() => {
            this.inFlight.delete(examId);
          }),
      ),
    );
  }

  private async emitDelta(examId: string, submissionIds: string[]) {
    if (submissionIds.length === 0) return;

    const [rows, activeCount, submittedCount] = await Promise.all([
      this.buildRows(submissionIds),
      this.prisma.examSession.count({
        where: {
          is_active: true,
          submission: {
            exam_id: examId,
            status: SubmissionStatus.IN_PROGRESS,
            is_deleted: false,
          },
        },
      }),
      this.prisma.submission.count({
        where: {
          exam_id: examId,
          status: SubmissionStatus.COMPLETED,
          is_deleted: false,
        },
      }),
    ]);

    const seq = (this.seqByExam.get(examId) ?? 0) + 1;
    this.seqByExam.set(examId, seq);

    this.events.emit(examId, EXAM_RUNTIME_EVENTS.MONITOR_DELTA, {
      seq,
      activeCount,
      submittedCount,
      rows,
    });
  }

  private async buildRows(submissionIds: string[]) {
    const [submissions, progress, violationCounts, latestViolations] =
      await Promise.all([
        this.prisma.submission.findMany({
          where: { id: { in: submissionIds } },
          select: {
            id: true,
            status: true,
            end_time: true,
            session: { select: { last_ping: true } },
          },
        }),
        this.prisma.$queryRaw<ProgressRow[]>`
          SELECT sq.submission_id,
                 COUNT(*)::int AS total,
                 COUNT(*) FILTER (
                   WHERE COALESCE(sq.answer, '') <> '' OR sq.options IS NOT NULL
                 )::int AS answered
          FROM "submission_questions" sq
          WHERE sq.submission_id = ANY(${submissionIds}::uuid[])
            AND sq.is_deleted = false
          GROUP BY sq.submission_id
        `,
        this.prisma.examViolation.groupBy({
          by: ['submission_id'],
          where: { submission_id: { in: submissionIds } },
          _count: { _all: true },
        }),
        this.prisma.examViolation.findMany({
          where: { submission_id: { in: submissionIds } },
          orderBy: { occurred_at: 'desc' },
          distinct: ['submission_id'],
          select: { submission_id: true, type: true, occurred_at: true },
        }),
      ]);

    const progressBy = new Map(progress.map((p) => [p.submission_id, p]));
    const countBy = new Map(
      violationCounts.map((v) => [v.submission_id, v._count._all]),
    );
    const latestBy = new Map(
      latestViolations.map((v) => [v.submission_id, v]),
    );

    return submissions.map((s) => {
      const p = progressBy.get(s.id);
      const latest = latestBy.get(s.id);
      return {
        submissionId: s.id,
        status: s.status,
        lastPing: s.session?.last_ping?.toISOString() ?? null,
        answered: p?.answered ?? 0,
        total: p?.total ?? 0,
        submittedAt: s.end_time?.toISOString() ?? null,
        violations: countBy.get(s.id) ?? 0,
        lastViolationType: latest?.type ?? null,
        lastViolationAt: latest?.occurred_at?.toISOString() ?? null,
      };
    });
  }
}
