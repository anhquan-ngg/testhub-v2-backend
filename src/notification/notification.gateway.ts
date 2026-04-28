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
import { Prisma } from '../../generated/prisma-client';
import { NotificationService } from './notification.service';

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
  server: Server;

  constructor(private readonly notificationService: NotificationService) {}

  // Lifecycle methods
  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;
      const userRole = client.handshake.query.userRole as string;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Mỗi user join room riêng: "user:{userId}"
      client.join(`user:${userId}`);
      console.log(`User ${userId} connected [${client.id}] role=${userRole}`);

      // Admin users join a shared admin room for dashboard updates
      if (userRole === 'ADMIN') {
        client.join('room:admin');
        console.log(`Admin ${userId} joined room:admin`);
      }

      const unread = await this.notificationService.getUnread(userId);
      client.emit('notification:unread', unread);
    } catch (error) {
      console.error('Error in handleConnection:', error);
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
    await this.notificationService.markAsRead(notificationId);
    // Trả về unread count mới
    const userId = client.handshake.query.userId as string;
    const count = await this.notificationService.countUnread(userId);
    client.emit('notification:unread_count', count);
  }

  // Client đánh dấu đọc tất cả
  @SubscribeMessage('notification:mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    const userId = client.handshake.query.userId as string;
    await this.notificationService.markAllAsRead(userId);
    client.emit('notification:unread_count', 0);
  }

  // ─── Methods gọi từ các Service khác ─────────────────────────────────────

  // Gửi notification đến một user cụ thể
  async sendToUser(
    userId: string,
    notification: Prisma.NotificationCreateInput,
  ) {
    const saved = await this.notificationService.create(notification);
    this.server.to(`user:${userId}`).emit('notification:new', saved);
    const count = await this.notificationService.countUnread(userId);
    this.server.to(`user:${userId}`).emit('notification:unread_count', count);
    return saved;
  }

  // Broadcast đến tất cả user (thông báo hệ thống)
  async broadcast(notification: Prisma.NotificationCreateInput) {
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
