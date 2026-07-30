import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { from, interval, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExamRuntimeService } from './exam-runtime.service';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import { EXAM_RUNTIME_EVENTS } from './exam-runtime.constants';

@UseGuards(JwtGuard)
@Controller('exam-runtime')
export class ExamRuntimeController {
  constructor(
    private readonly runtimeService: ExamRuntimeService,
    private readonly eventsService: ExamRuntimeEventsService,
  ) {}

  @Get('exams/:examId/status')
  getStatus(@Param('examId') examId: string, @Req() req: any) {
    return this.runtimeService.getExamStatus(examId, req.user.id);
  }

  @Sse('exams/:examId/events')
  events(
    @Param('examId') examId: string,
    @Req() req: any,
  ): Observable<MessageEvent> {
    const initialStatus$ = from(
      this.runtimeService.getExamStatus(examId, req.user.id),
    ).pipe(
      map((status) => ({
        type: EXAM_RUNTIME_EVENTS.STATUS,
        data: status,
      })),
    );

    const eventStream$ = this.eventsService.stream(examId);

    const heartbeat$ = interval(30000).pipe(
      map(
        () =>
          ({
            type: 'heartbeat',
            data: {},
          }) as MessageEvent,
      ),
    );

    return merge(initialStatus$, eventStream$, heartbeat$);
  }
}
