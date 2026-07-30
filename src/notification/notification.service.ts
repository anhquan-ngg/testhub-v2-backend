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
        recipient_id: userId,
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
        recipient_id: userId,
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
        recipient_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });
  }

  async create(notification: NotificationCreateInput) {
    const data = { ...notification };
    const legacyUserId = (
      data.user as { connect?: { id?: string } } | undefined
    )?.connect?.id;

    if (legacyUserId && !data.recipient && !data.recipient_id) {
      data.recipient = { connect: { id: legacyUserId } };
      delete data.user;
    }

    return this.prismaUnsafe.notification.create({
      data,
    });
  }

  async getAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prismaUnsafe.notification.findMany({
        where: { recipient_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaUnsafe.notification.count({
        where: { recipient_id: userId },
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
  ): Promise<{
    registration: Record<string, any>;
    action: 'created' | 'restored' | 'approved' | 'unchanged';
  }> {
    const include = {
      student: { select: { id: true, full_name: true, email: true } },
      exam: { select: { id: true, title: true } },
    };
    const uniqueKey = { exam_id: examId, student_id: studentId };

    const existing = await this.prismaUnsafe.examRegistration.findUnique({
      where: { exam_id_student_id: uniqueKey },
      include,
    });

    if (existing) {
      if (existing.is_deleted) {
        const registration = await this.prismaUnsafe.examRegistration.update({
          where: { id: existing.id },
          data: { is_deleted: false, deleted_at: null, status },
          include,
        });
        return { registration, action: 'restored' };
      }

      if (status === 'APPROVED' && existing.status !== 'APPROVED') {
        const registration = await this.prismaUnsafe.examRegistration.update({
          where: { id: existing.id },
          data: { status: 'APPROVED' },
          include,
        });
        return { registration, action: 'approved' };
      }

      return { registration: existing, action: 'unchanged' };
    }

    // No existing row — attempt create, guard against concurrent inserts (P2002).
    try {
      const registration = await this.prismaUnsafe.examRegistration.create({
        data: {
          exam: { connect: { id: examId } },
          student: { connect: { id: studentId } },
          status,
        },
        include,
      });
      return { registration, action: 'created' };
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;

      // Lost the race — another request created the row concurrently.
      const raced = await this.prismaUnsafe.examRegistration.findUnique({
        where: { exam_id_student_id: uniqueKey },
        include,
      });

      if (raced?.is_deleted) {
        const registration = await this.prismaUnsafe.examRegistration.update({
          where: { id: raced.id },
          data: { is_deleted: false, deleted_at: null, status },
          include,
        });
        return { registration, action: 'restored' };
      }

      if (status === 'APPROVED' && raced && raced.status !== 'APPROVED') {
        const registration = await this.prismaUnsafe.examRegistration.update({
          where: { id: raced.id },
          data: { status: 'APPROVED' },
          include,
        });
        return { registration, action: 'approved' };
      }

      return { registration: raced, action: 'unchanged' };
    }
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
