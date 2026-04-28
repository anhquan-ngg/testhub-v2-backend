import { INTERNAL_PRISMA_CLIENT } from '@/prisma/prisma.constants';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../../generated/prisma-client';

type EnhancedPrismaClient = Omit<
  PrismaClient,
  '$use' | '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

@Injectable()
export class NotificationService {
  constructor(
    @Inject(INTERNAL_PRISMA_CLIENT)
    private readonly internalPrisma: EnhancedPrismaClient,
  ) {}

  async getUnread(userId: string) {
    return this.internalPrisma.notification.findMany({
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
    return this.internalPrisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  async markAsRead(notificationId: string) {
    return this.internalPrisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        is_read: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.internalPrisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });
  }

  async create(notification: Prisma.NotificationCreateInput) {
    return this.internalPrisma.notification.create({
      data: notification,
    });
  }

  async getAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.internalPrisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.internalPrisma.notification.count({
        where: { user_id: userId },
      }),
    ]);
    return { items, total, page, limit };
  }

  async getDashboardMetrics() {
    const [usersCount, examsCount, questionsCount, submissionsCount] =
      await Promise.all([
        this.internalPrisma.user.count(),
        this.internalPrisma.exam.count(),
        this.internalPrisma.question.count(),
        this.internalPrisma.submission.count({
          where: { status: 'COMPLETED' },
        }),
      ]);
    return { usersCount, examsCount, questionsCount, submissionsCount };
  }

  // ─── Exam Registration Helpers ───────────────────────────────────────────

  async findExamWithLecturer(examId: string) {
    return this.internalPrisma.exam.findUnique({
      where: { id: examId },
      include: { lecturer: { select: { id: true, full_name: true } } },
    });
  }

  async findUser(userId: string) {
    return this.internalPrisma.user.findUnique({
      where: { id: userId },
      select: { id: true, full_name: true, email: true },
    });
  }

  async findExamRegistration(registrationId: string) {
    return this.internalPrisma.examRegistration.findUnique({
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
    return this.internalPrisma.examRegistration.create({
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
    return this.internalPrisma.examRegistration.update({
      where: { id: registrationId },
      data: { status },
      include: {
        student: { select: { id: true, full_name: true, email: true } },
        exam: { select: { id: true, title: true } },
      },
    });
  }

  async findUserByEmail(email: string, role?: string) {
    return this.internalPrisma.user.findFirst({
      where: {
        email,
        ...(role ? { role: role as any } : {}),
      },
      select: { id: true, full_name: true, email: true },
    });
  }
}
