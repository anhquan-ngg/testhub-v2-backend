import { parseChapterDistribution } from '../common/chapter-question-selection';
import { parseTypeDistribution } from '../common/question-distribution';
import {
  checkChapterDeltaFeasibility,
  checkTypeDeltaFeasibility,
  type DeltaFeasibility,
} from '../common/distribution-delta';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExamsRepository } from './exams.repository';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { ExamRuntimeQueueService } from '@/exam-runtime/exam-runtime-queue.service';
import { ExamRuntimeService } from '@/exam-runtime/exam-runtime.service';
import { CheckDistributionDeltaDto } from './dto/check-distribution-delta.dto';

@Injectable()
export class ExamsService {
  constructor(
    private readonly examsRepository: ExamsRepository,
    private readonly examRuntimeQueue: ExamRuntimeQueueService,
    private readonly examRuntime: ExamRuntimeService,
  ) {}

  async create(lecturerId: string, dto: CreateExamDto) {
    dto = await this.prepareDistribution(dto, null);
    const exam = await this.examsRepository.create(lecturerId, dto);
    await this.examRuntimeQueue.scheduleExam(exam);
    return exam;
  }

  /**
   * Validates the distribution contract and resolves `distribution_delta`.
   * Omitted fields keep the stored value on update; the delta is validated
   * against the effective (merged) mode and reset when the mode cannot use it.
   */
  private async prepareDistribution<T extends UpdateExamDto>(
    dto: T,
    current: {
      mode: string;
      topic_id: string;
      distribution: string | null;
      distribution_delta: number;
      distribution_delta_online?: boolean;
    } | null,
  ): Promise<T> {
    const mode = dto.mode ?? current?.mode;
    const topicId = dto.topic_id ?? current?.topic_id;
    const supportsDelta = mode === 'BY_TYPE' || mode === 'BY_CHAPTER';

    if (!supportsDelta) {
      if ((dto.distribution_delta ?? 0) > 0) {
        throw new BadRequestException(
          'distribution_delta is only supported for BY_TYPE and BY_CHAPTER exams',
        );
      }
      if (
        dto.distribution_delta !== undefined ||
        current?.distribution_delta ||
        current?.distribution_delta_online
      ) {
        dto = {
          ...dto,
          distribution_delta: 0,
          distribution_delta_online: false,
        };
      }
      return dto;
    }

    if (mode === 'BY_CHAPTER') {
      const distribution = JSON.stringify(
        parseChapterDistribution(dto.distribution ?? current?.distribution),
      );
      dto = { ...dto, distribution };
      await this.examsRepository.validateChapterDistribution(
        topicId as string,
        distribution,
      );
    } else if (
      !current ||
      dto.mode !== undefined ||
      dto.distribution !== undefined
    ) {
      parseTypeDistribution(dto.distribution ?? current?.distribution);
    }

    const effectiveDelta =
      dto.distribution_delta ?? current?.distribution_delta ?? 0;
    if (effectiveDelta === 0 && dto.distribution_delta_online !== false) {
      const wasOnline =
        dto.distribution_delta_online ?? current?.distribution_delta_online;
      if (wasOnline) {
        dto = { ...dto, distribution_delta_online: false };
      }
    }
    return dto;
  }

  /**
   * Configuration-time estimate of whether the requested delta can be applied
   * to the given distribution. Never blocks saving; only reports warnings.
   */
  async checkDistributionDelta(
    dto: CheckDistributionDeltaDto,
  ): Promise<DeltaFeasibility> {
    const delta = dto.distribution_delta ?? 0;
    if (dto.mode === 'BY_CHAPTER') {
      const rows = parseChapterDistribution(dto.distribution);
      await this.examsRepository.validateChapterDistribution(
        dto.topic_id,
        JSON.stringify(rows),
      );
      const candidates = await this.examRuntime.loadChapterCapacity(
        dto.topic_id,
        rows,
      );
      return checkChapterDeltaFeasibility({ rows, delta, candidates });
    }
    if (dto.mode !== 'BY_TYPE') {
      throw new BadRequestException(
        'Delta feasibility check supports BY_TYPE and BY_CHAPTER exams only',
      );
    }
    const rows = parseTypeDistribution(dto.distribution);
    const capacity = await this.examRuntime.countTypeCapacity(
      dto.topic_id,
      rows,
    );
    return checkTypeDeltaFeasibility({ rows, delta, capacity });
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
    const current = await this.findOne(id);
    dto = await this.prepareDistribution(dto, current);
    const exam = await this.examsRepository.update(id, dto);
    await this.examRuntimeQueue.scheduleExam(exam);
    return exam;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.examsRepository.softDelete(id);
    await this.examRuntimeQueue.removeExamJobs(id);
    return { message: 'Exam deleted successfully' };
  }

  // ── Question management ────────────────────────────────────────────────────

  /**
   * Attaches a question to an exam. Shared by the manual "pick questions"
   * flow and the Word/Excel import commit step, so both enforce the same
   * duplicate check. Pass `tx` to run as part of a caller's transaction; the
   * exam-existence check is skipped in that case since the caller (e.g.
   * QuestionImportService.commit) already validated it within its own scope
   * check moments earlier.
   */
  async addQuestion(
    examId: string,
    questionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    if (!tx) {
      await this.findOne(examId);
    }
    const existing = await this.examsRepository.findExamQuestion(
      examId,
      questionId,
      tx,
    );
    if (existing) {
      throw new ConflictException('Question already added to this exam');
    }
    return this.examsRepository.addQuestion(examId, questionId, tx);
  }

  async removeQuestion(examId: string, questionId: string) {
    await this.findOne(examId);
    const existing = await this.examsRepository.findExamQuestion(
      examId,
      questionId,
    );
    if (!existing) {
      throw new NotFoundException('Question not found in this exam');
    }
    await this.examsRepository.removeQuestion(examId, questionId);
    return { message: 'Question removed from exam successfully' };
  }
}
