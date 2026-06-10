import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RegistrationStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamRegistrationDto } from './dto/create-exam-registration.dto';
import { QueryExamRegistrationDto } from './dto/query-exam-registration.dto';
import { UpdateExamRegistrationDto } from './dto/update-exam-registration.dto';

@Injectable()
export class ExamRegistrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    exam: {
      select: {
        id: true,
        title: true,
        exam_start_time: true,
        exam_end_time: true,
      },
    },
    student: {
      select: {
        id: true,
        full_name: true,
        email: true,
      },
    },
  } satisfies Prisma.ExamRegistrationInclude;

  async create(dto: CreateExamRegistrationDto) {
    return this.prisma.examRegistration.create({
      data: {
        exam_id: dto.exam_id,
        student_id: dto.student_id!,
        ...(dto.status && { status: dto.status }),
      },
      include: this.include,
    });
  }

  async restore(id: string, status?: RegistrationStatus) {
    return this.prisma.examRegistration.update({
      where: { id },
      data: {
        is_deleted: false,
        deleted_at: null,
        status: status ?? RegistrationStatus.PENDING,
      },
      include: this.include,
    });
  }

  async replaceWithRestoredRegistration(
    currentId: string,
    deletedRegistrationId: string,
    status?: RegistrationStatus,
  ) {
    const [, restoredRegistration] = await this.prisma.$transaction([
      this.prisma.examRegistration.update({
        where: { id: currentId },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
        },
      }),
      this.prisma.examRegistration.update({
        where: { id: deletedRegistrationId },
        data: {
          is_deleted: false,
          deleted_at: null,
          status: status ?? RegistrationStatus.PENDING,
        },
        include: this.include,
      }),
    ]);

    return restoredRegistration;
  }

  async findMany(query: QueryExamRegistrationDto) {
    const { page = 1, limit = 10, exam_id, student_id, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExamRegistrationWhereInput = {
      is_deleted: false,
      ...(exam_id && { exam_id }),
      ...(student_id && { student_id }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.examRegistration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.include,
      }),
      this.prisma.examRegistration.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.examRegistration.findFirst({
      where: { id, is_deleted: false },
      include: this.include,
    });
  }

  async findByExamAndStudent(examId: string, studentId: string) {
    return this.prisma.examRegistration.findUnique({
      where: {
        exam_id_student_id: {
          exam_id: examId,
          student_id: studentId,
        },
      },
      include: this.include,
    });
  }

  async findExamById(id: string) {
    return this.prisma.exam.findFirst({
      where: { id, is_deleted: false },
      select: { id: true },
    });
  }

  async findStudentById(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
  }

  async findStudentByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
  }

  async update(id: string, dto: UpdateExamRegistrationDto) {
    return this.prisma.examRegistration.update({
      where: { id },
      data: {
        ...(dto.exam_id && { exam_id: dto.exam_id }),
        ...(dto.student_id && { student_id: dto.student_id }),
        ...(dto.status && { status: dto.status }),
      },
      include: this.include,
    });
  }

  async softDelete(id: string) {
    return this.prisma.examRegistration.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
      include: this.include,
    });
  }
}
