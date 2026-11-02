import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationService } from './notification.service';
import { AuthSessionService } from '../auth/auth-session.service';
import type { SessionClaims } from '../auth/auth-session.service';

type NotificationCreateInput = Record<string, unknown>;

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly sessions: AuthSessionService,
  ) {}

  // Lifecycle methods
  async handleConnection(client: Socket) {
    try {
      const claims = await this.sessions.bindSocket(client);
      const userId = claims.sub;
      (client.data as { userId?: string }).userId = userId;
      await client.join('user:' + userId);
      if (claims.role === 'ADMIN') await client.join('room:admin');

      const unread = await this.notificationService.getUnread(userId);
      client.emit('notification:unread', unread);
    } catch (error) {
      void error;
      client.emit('connect_error', {
        message: 'Internal server error during connection',
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // ─── Events từ client ─────────────────────────────────────────────────────

  // Client đánh dấu đã đọc một notification
  @SubscribeMessage('notification:mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() notificationId: string,
  ) {
    const claims = (client.data as { sessionClaims: SessionClaims })
      .sessionClaims;
    await this.sessions.assertActive(claims);
    await this.notificationService.markAsRead(notificationId, claims.sub);
    // Trả về unread count mới
    const userId = claims.sub;
    const count = await this.notificationService.countUnread(userId);
    client.emit('notification:unread_count', count);
  }

  // Client đánh dấu đọc tất cả
  @SubscribeMessage('notification:mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    const claims = (client.data as { sessionClaims: SessionClaims })
      .sessionClaims;
    await this.sessions.assertActive(claims);
    const userId = claims.sub;
    await this.notificationService.markAllAsRead(userId);
    client.emit('notification:unread_count', 0);
  }

  // ─── Methods gọi từ các Service khác ─────────────────────────────────────

  // Gửi notification đến một user cụ thể
  async sendToUser(userId: string, notification: NotificationCreateInput) {
    const saved = await this.notificationService.create(notification);
    this.server.to(`user:${userId}`).emit('notification:new', saved);
    const count = await this.notificationService.countUnread(userId);
    this.server.to(`user:${userId}`).emit('notification:unread_count', count);
    return saved;
  }

  /** Emits an already committed notification without creating a duplicate DB row. */
  async emitSavedNotification(
    notification: { recipient_id: string } & Record<string, unknown>,
  ) {
    const userId = notification.recipient_id;
    this.server.to(`user:${userId}`).emit('notification:new', notification);
    const count: unknown = await this.notificationService.countUnread(userId);
    this.server.to(`user:${userId}`).emit('notification:unread_count', count);
  }

  // Broadcast đến tất cả user (thông báo hệ thống)
  async broadcast(notification: NotificationCreateInput) {
    this.server.emit('notification:broadcast', notification);
  }

  // Gửi exam event đến một user cụ thể (dùng cho real-time UI updates)
  emitExamEvent(userId: string, event: string, payload: Record<string, any>) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  // Cập nhật dashboard metrics realtime cho tất cả admin
  pushAdminDashboardUpdate(metrics: Record<string, any>) {
    this.server.to('room:admin').emit('dashboard:update', metrics);
  }
}
