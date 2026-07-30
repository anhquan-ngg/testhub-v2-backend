import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers?.authorization?.replace(
          /^Bearer\s+/i,
          '',
        ) ?? undefined);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      client.data.userId = payload.sub;
    } catch (err: any) {
      this.logger.warn(
        `WS /exam-runtime rejected client ${client.id}: ${err?.message ?? err}`,
      );
      client.disconnect();
    }
  }

  @SubscribeMessage('exam:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { submissionId?: string },
  ) {
    const userId = client.data.userId as string | undefined;

    if (!userId || !payload?.submissionId) {
      client.emit('exam:heartbeat_error', {
        message: 'submissionId is required',
      });
      return;
    }

    try {
      const result = await this.runtimeService.heartbeat(
        payload.submissionId,
        userId,
      );
      client.emit('exam:heartbeat_ack', result);
    } catch (error: any) {
      client.emit('exam:heartbeat_error', {
        message: error?.message ?? 'Heartbeat failed',
      });
    }
  }
}
