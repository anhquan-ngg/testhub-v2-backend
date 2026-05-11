import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

type NotificationCreateInput = Record<string, unknown>;

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  private get prismaUnsafe(): Record<string, any> {
    return this.prisma as unknown as Record<string, any>;
  }

  async getUnread(userId: string) {
    return this.prismaUnsafe.notification.findMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async countUnread(userId: string) {
    return this.prismaUnsafe.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  async markAsRead(notificationId: string) {
    return this.prismaUnsafe.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        is_read: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prismaUnsafe.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });
  }

  async create(notification: NotificationCreateInput) {
    return this.prismaUnsafe.notification.create({
      data: notification,
    });
  }

  async getAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prismaUnsafe.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaUnsafe.notification.count({
        where: { user_id: userId },
      }),
    ]);
    return { items, total, page, limit };
  }

  async getDashboardMetrics() {
    const [usersCount, examsCount, questionsCount, submissionsCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.exam.count({
          where: {
            is_deleted: false,
          },
        }),
        this.prisma.question.count(),
        this.prisma.submission.count({
          where: { status: 'COMPLETED' },
        }),
      ]);
    return { usersCount, examsCount, questionsCount, submissionsCount };
  }

  // ─── Exam Registration Helpers ───────────────────────────────────────────

  async findExamWithLecturer(examId: string) {
    return this.prismaUnsafe.exam.findUnique({
      where: { id: examId },
      include: { lecturer: { select: { id: true, full_name: true } } },
    });
  }

  async findUser(userId: string) {
    return this.prismaUnsafe.user.findUnique({
      where: { id: userId },
      select: { id: true, full_name: true, email: true },
    });
  }

  async findExamRegistration(registrationId: string) {
    return this.prismaUnsafe.examRegistration.findUnique({
      where: { id: registrationId },
      include: {
        exam: {
          include: {
            lecturer: { select: { id: true, full_name: true } },
          },
        },
        student: { select: { id: true, full_name: true, email: true } },
      },
    });
  }

  async createExamRegistration(
    examId: string,
    studentId: string,
    status: 'PENDING' | 'APPROVED',
  ) {
    return this.prismaUnsafe.examRegistration.create({
      data: {
        exam: { connect: { id: examId } },
        student: { connect: { id: studentId } },
        status,
      },
      include: {
        student: { select: { id: true, full_name: true, email: true } },
        exam: { select: { id: true, title: true } },
      },
    });
  }

  async updateExamRegistrationStatus(
    registrationId: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    return this.prismaUnsafe.examRegistration.update({
      where: { id: registrationId },
      data: { status },
      include: {
        student: { select: { id: true, full_name: true, email: true } },
        exam: { select: { id: true, title: true } },
      },
    });
  }

  async findUserByEmail(email: string, role?: string) {
    return this.prismaUnsafe.user.findFirst({
      where: {
        email,
        ...(role ? { role: role as any } : {}),
      },
      select: { id: true, full_name: true, email: true },
    });
  }
}
