import {
  Injectable,
  Logger,
  MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EXAM_RUNTIME_EVENTS } from './exam-runtime.constants';

export type ExamRuntimeEventPayload = {
  examId: string;
  type: (typeof EXAM_RUNTIME_EVENTS)[keyof typeof EXAM_RUNTIME_EVENTS];
  data: Record<string, unknown>;
};

const EXAM_RUNTIME_REDIS_CHANNEL = 'exam-runtime:events';

@Injectable()
export class ExamRuntimeEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExamRuntimeEventsService.name);
  private readonly events$ = new Subject<ExamRuntimeEventPayload>();
  private pubClient!: Redis;
  private subClient!: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const redisOptions = this.getRedisOptions();
    this.pubClient = new Redis(redisOptions);
    this.subClient = new Redis(redisOptions);

    this.subClient.on('message', (channel, message) => {
      if (channel === EXAM_RUNTIME_REDIS_CHANNEL) {
        try {
          const payload = JSON.parse(message) as ExamRuntimeEventPayload;
          this.events$.next(payload);
        } catch (err: any) {
          this.logger.warn(
            `Failed to parse Redis event message: ${err?.message ?? err}`,
          );
        }
      }
    });

    try {
      await this.subClient.subscribe(EXAM_RUNTIME_REDIS_CHANNEL);
    } catch (err: any) {
      this.logger.error(
        `Failed to subscribe to Redis channel ${EXAM_RUNTIME_REDIS_CHANNEL}: ${err?.message ?? err}`,
      );
      throw err;
    }
  }

  async onModuleDestroy() {
    try {
      await this.subClient?.quit();
      await this.pubClient?.quit();
    } catch {
      this.subClient?.disconnect();
      this.pubClient?.disconnect();
    }
  }

  /**
   * `types` is required (not defaulted) on purpose: without a whitelist, a
   * new *MONITOR_* event type would leak straight to every student
   * subscribed to that exam's SSE stream, since events are only keyed by
   * examId. Student and lecturer routes each pass their own type list.
   */
  stream(examId: string, types: readonly string[]): Observable<MessageEvent> {
    return this.events$.pipe(
      filter(
        (event) => event.examId === examId && types.includes(event.type),
      ),
      map((event) => ({
        type: event.type,
        data: event.data,
      })),
    );
  }

  emit(examId: string, type: ExamRuntimeEventPayload['type'], data = {}) {
    const payload: ExamRuntimeEventPayload = {
      examId,
      type,
      data: {
        examId,
        serverTime: new Date().toISOString(),
        ...data,
      },
    };

    const message = JSON.stringify(payload);
    if (this.pubClient) {
      this.pubClient
        .publish(EXAM_RUNTIME_REDIS_CHANNEL, message)
        .catch((err) => {
          this.logger.warn(
            `Failed to publish event to Redis, falling back to local: ${err?.message ?? err}`,
          );
          this.events$.next(payload);
        });
    } else {
      this.events$.next(payload);
    }
  }

  private getRedisOptions() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const redisPassword = this.config.get<string>('REDIS_PASSWORD');
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
}
