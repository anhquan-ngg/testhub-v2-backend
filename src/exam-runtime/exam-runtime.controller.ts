import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Sse,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { UserRole } from '@prisma/client';

type AuthRequest = { user: { id: string; role: UserRole; session_id: string } };

import { JwtGuard } from '@/auth/guards/jwt.guard';
import { from, interval, merge, Observable } from 'rxjs';
import { filter, map, mergeMap, takeUntil } from 'rxjs/operators';
import { ExamRuntimeService } from './exam-runtime.service';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import {
  EXAM_RUNTIME_EVENTS,
  MONITOR_EVENT_TYPES,
  STUDENT_EVENT_TYPES,
} from './exam-runtime.constants';
import { ReportViolationDto } from './dto/report-violation.dto';
import { ExtendTimeDto } from './dto/extend-time.dto';
import { StudentSessionInterceptor } from '@/auth/student-session.interceptor';
import { AuthSessionService } from '@/auth/auth-session.service';

@UseGuards(JwtGuard)
@UseInterceptors(StudentSessionInterceptor)
@Controller('exam-runtime')
export class ExamRuntimeController {
  constructor(
    private readonly runtimeService: ExamRuntimeService,
    private readonly eventsService: ExamRuntimeEventsService,
    private readonly sessions: AuthSessionService,
  ) {}

  @Get('exams/:examId/status')
  getStatus(@Param('examId') examId: string, @Req() req: AuthRequest) {
    return this.runtimeService.getExamStatus(examId, req.user.id);
  }

  @Sse('exams/:examId/events')
  events(
    @Param('examId') examId: string,
    @Req() req: AuthRequest,
  ): Observable<MessageEvent> {
    const initialStatus$ = from(
      this.runtimeService.getExamStatus(examId, req.user.id),
    ).pipe(
      map((status) => ({
        type: EXAM_RUNTIME_EVENTS.STATUS,
        data: status,
      })),
    );

    // Type whitelist matters here: events are keyed by examId only, so
    // without it a MONITOR_* type would leak straight to every student
    // subscribed to this exam's SSE stream (classmates' progress/violations).
    const eventStream$ = this.eventsService.stream(examId, STUDENT_EVENT_TYPES);

    const heartbeat$ = interval(30000).pipe(
      map(
        () =>
          ({
            type: 'heartbeat',
            data: {},
          }) as MessageEvent,
      ),
    );

    return merge(initialStatus$, eventStream$, heartbeat$).pipe(
      takeUntil(this.sessionEnded(req.user.id, req.user.session_id)),
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('submissions/:submissionId/ping')
  ping(
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Req() req: AuthRequest,
  ) {
    return this.runtimeService.heartbeat(submissionId, req.user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('submissions/:submissionId/violations')
  reportViolation(
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Body() dto: ReportViolationDto,
    @Req() req: AuthRequest,
  ) {
    return this.runtimeService.reportViolation(submissionId, req.user.id, {
      type: dto.type,
      durationMs: dto.durationMs,
      clientTime: dto.clientTime,
    });
  }

  @Get('monitor/exams/:examId/roster')
  getMonitorRoster(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Req() req: AuthRequest,
  ) {
    return this.runtimeService.getMonitorRoster(examId, req.user);
  }

  /** Lecturer/admin-only, authorized inside the service the same way as
   * the roster above. Explicit, separate from deleting a submission. */
  @HttpCode(HttpStatus.OK)
  @Post('monitor/exams/:examId/students/:studentId/grant-retry')
  grantRetry(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Req() req: AuthRequest,
  ) {
    return this.runtimeService.grantRetry(examId, studentId, req.user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('monitor/exams/:examId/students/:studentId/extend-time')
  extendTime(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: ExtendTimeDto,
    @Req() req: AuthRequest,
  ) {
    return this.runtimeService.extendTime(
      examId,
      studentId,
      req.user,
      dto.extraMinutes,
    );
  }

  /**
   * Lecturer/admin-only. Separate route (not a role branch inside the
   * student `events()` above) on purpose: different authorization
   * (`assertCanMonitorExam`, not `assertCanAccessExam`), a different
   * initial payload (the full roster snapshot vs. one student's own
   * status), and separate blast radius — a role-branch bug here would
   * risk leaking every classmate's progress to a student.
   */
  @Sse('monitor/exams/:examId/events')
  monitorEvents(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Req() req: AuthRequest,
  ): Observable<MessageEvent> {
    const snapshot$ = from(
      this.runtimeService.getMonitorRoster(examId, req.user),
    ).pipe(
      map((roster) => ({
        type: 'EXAM_MONITOR_SNAPSHOT',
        data: roster,
      })),
    );

    const deltaStream$ = this.eventsService.stream(examId, MONITOR_EVENT_TYPES);

    const heartbeat$ = interval(30000).pipe(
      map(
        () =>
          ({
            type: 'heartbeat',
            data: {},
          }) as MessageEvent,
      ),
    );

    return merge(snapshot$, deltaStream$, heartbeat$).pipe(
      takeUntil(this.sessionEnded(req.user.id, req.user.session_id)),
    );
  }

  private sessionEnded(userId: string, sessionId: string) {
    return interval(5000).pipe(
      mergeMap(async () => {
        try {
          await this.sessions.assertActive({
            sub: userId,
            sid: sessionId,
            token_use: 'access',
          });
          return false;
        } catch {
          return true;
        }
      }),
      filter(Boolean),
    );
  }
}
