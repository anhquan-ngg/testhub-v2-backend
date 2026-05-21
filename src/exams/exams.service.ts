import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExamsRepository } from './exams.repository';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly examsRepository: ExamsRepository) {}

  async create(lecturerId: string, dto: CreateExamDto) {
    return this.examsRepository.create(lecturerId, dto);
  }

  async findAll(query: QueryExamDto) {
    return this.examsRepository.findMany(query);
  }

  async findOne(id: string) {
    const exam = await this.examsRepository.findById(id);
    if (!exam) {
      throw new NotFoundException(`Exam with id "${id}" not found`);
    }
    return exam;
  }

  async update(id: string, dto: UpdateExamDto) {
    await this.findOne(id);
    return this.examsRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.examsRepository.softDelete(id);
    return { message: 'Exam deleted successfully' };
  }

  // ── Question management ────────────────────────────────────────────────────

  async addQuestion(examId: string, questionId: string) {
    await this.findOne(examId);
    const existing = await this.examsRepository.findExamQuestion(examId, questionId);
    if (existing) {
      throw new ConflictException('Question already added to this exam');
    }
    return this.examsRepository.addQuestion(examId, questionId);
  }

  async removeQuestion(examId: string, questionId: string) {
    await this.findOne(examId);
    const existing = await this.examsRepository.findExamQuestion(examId, questionId);
    if (!existing) {
      throw new NotFoundException('Question not found in this exam');
    }
    await this.examsRepository.removeQuestion(examId, questionId);
    return { message: 'Question removed from exam successfully' };
  }
}
