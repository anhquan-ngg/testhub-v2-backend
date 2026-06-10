import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExamRegistrationDto } from './dto/create-exam-registration.dto';
import { QueryExamRegistrationDto } from './dto/query-exam-registration.dto';
import { UpdateExamRegistrationDto } from './dto/update-exam-registration.dto';
import { ExamRegistrationsRepository } from './exam-registrations.repository';

@Injectable()
export class ExamRegistrationsService {
  constructor(
    private readonly examRegistrationsRepository: ExamRegistrationsRepository,
  ) {}

  async create(dto: CreateExamRegistrationDto) {
    const studentId = await this.resolveStudentId(dto);
    await this.validateExamAndStudent(dto.exam_id, studentId);

    const existing =
      await this.examRegistrationsRepository.findByExamAndStudent(
        dto.exam_id,
        studentId,
      );

    if (existing && !existing.is_deleted) {
      throw new ConflictException(
        'Student is already registered for this exam',
      );
    }

    if (existing?.is_deleted) {
      return this.examRegistrationsRepository.restore(existing.id, dto.status);
    }

    return this.examRegistrationsRepository.create({
      ...dto,
      student_id: studentId,
    });
  }

  async findAll(query: QueryExamRegistrationDto) {
    return this.examRegistrationsRepository.findMany(query);
  }

  async findOne(id: string) {
    const registration = await this.examRegistrationsRepository.findById(id);
    if (!registration) {
      throw new NotFoundException(
        `Exam registration with id "${id}" not found`,
      );
    }
    return registration;
  }

  async update(id: string, dto: UpdateExamRegistrationDto) {
    const existing = await this.findOne(id);
    const examId = dto.exam_id ?? existing.exam_id;
    const studentId = dto.student_email
      ? await this.resolveStudentId(dto)
      : (dto.student_id ?? existing.student_id);

    if (dto.exam_id || dto.student_id || dto.student_email) {
      await this.validateExamAndStudent(examId, studentId);

      const duplicate =
        await this.examRegistrationsRepository.findByExamAndStudent(
          examId,
          studentId,
        );

      if (duplicate && duplicate.id !== id) {
        if (!duplicate.is_deleted) {
          throw new ConflictException(
            'Student is already registered for this exam',
          );
        }

        return this.examRegistrationsRepository.replaceWithRestoredRegistration(
          id,
          duplicate.id,
          dto.status,
        );
      }
    }

    return this.examRegistrationsRepository.update(id, {
      ...dto,
      student_id: studentId,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.examRegistrationsRepository.softDelete(id);
    return { message: 'Exam registration deleted successfully' };
  }

  private async validateExamAndStudent(examId: string, studentId: string) {
    const [exam, student] = await Promise.all([
      this.examRegistrationsRepository.findExamById(examId),
      this.examRegistrationsRepository.findStudentById(studentId),
    ]);

    if (!exam) {
      throw new BadRequestException('Exam does not exist');
    }

    if (!student) {
      throw new BadRequestException(
        'Student does not exist, is inactive, or is not a STUDENT user',
      );
    }
  }

  private async resolveStudentId(
    dto: Pick<CreateExamRegistrationDto, 'student_id' | 'student_email'>,
  ) {
    if (dto.student_id) {
      return dto.student_id;
    }

    if (!dto.student_email) {
      throw new BadRequestException('student_id or student_email is required');
    }

    const student = await this.examRegistrationsRepository.findStudentByEmail(
      dto.student_email,
    );

    if (!student) {
      throw new BadRequestException(
        'Student does not exist, is inactive, or is not a STUDENT user',
      );
    }

    return student.id;
  }
}
