import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { AuthSessionService } from '../auth/auth-session.service';
import type { SessionClaims } from '../auth/auth-session.service';
import { Server, Socket } from 'socket.io';
import { ExamRuntimeService } from './exam-runtime.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/exam-runtime',
})
export class ExamRuntimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ExamRuntimeGateway.name);

  constructor(
    private readonly runtimeService: ExamRuntimeService,
    private readonly sessions: AuthSessionService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const claims = await this.sessions.bindSocket(client);
      (client.data as { userId?: string }).userId = claims.sub;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('exam:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { submissionId?: string },
  ) {
    const userId = (client.data as { userId?: string }).userId;

    if (!userId || !payload?.submissionId) {
      client.emit('exam:heartbeat_error', {
        message: 'submissionId is required',
      });
      return;
    }

    try {
      const claims = (client.data as { sessionClaims: SessionClaims })
        .sessionClaims;
      await this.sessions.assertActive(claims);
      const result = await this.sessions.runStudentMutation(
        userId,
        claims.sid,
        () =>
          this.runtimeService.heartbeat(payload.submissionId as string, userId),
      );
      client.emit('exam:heartbeat_ack', result);
    } catch {
      client.emit('exam:heartbeat_error', {
        message: 'Heartbeat failed',
      });
    }
  }
}
