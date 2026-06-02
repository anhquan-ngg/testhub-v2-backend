import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuestionsRepository } from './questions.repository';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly questionsRepository: QuestionsRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(userId: string, dto: CreateQuestionDto) {
    const chapter = await this.questionsRepository.findChapterById(
      dto.chapter_id,
    );
    if (!chapter) {
      throw new BadRequestException('Chapter does not exist');
    }

    if (dto.file_ids?.length) {
      const files = await this.questionsRepository.findActiveFilesByIds(
        dto.file_ids.map((file) => file.id),
        userId,
      );

      if (files.length !== dto.file_ids.length) {
        throw new BadRequestException(
          'All file_ids must exist, be ACTIVE, and belong to the current user',
        );
      }
    }

    return this.questionsRepository.create(userId, dto);
  }

  async findAll(query: QueryQuestionDto) {
    return this.questionsRepository.findMany(query);
  }

  async findOne(id: string) {
    const question = await this.questionsRepository.findById(id);
    if (!question) {
      throw new NotFoundException(`Question with id "${id}" not found`);
    }
    return question;
  }

  async update(userId: string, id: string, dto: UpdateQuestionDto) {
    const existingQuestion = await this.findOne(id);

    if (dto.chapter_id) {
      const chapter = await this.questionsRepository.findChapterById(
        dto.chapter_id,
      );
      if (!chapter) {
        throw new BadRequestException('Chapter does not exist');
      }
    }

    if (dto.file_ids?.length) {
      const files = await this.questionsRepository.findActiveFilesByIds(
        dto.file_ids.map((file) => file.id),
        userId,
      );

      if (files.length !== dto.file_ids.length) {
        throw new BadRequestException(
          'All file_ids must exist, be ACTIVE, and belong to the current user',
        );
      }
    }

    const s3KeysToRemove =
      dto.file_ids === undefined
        ? []
        : existingQuestion.files
            ?.filter(
              (item) =>
                !dto.file_ids?.some((file) => file.id === item.file_id),
            )
            .map((item) => item.file.s3_key)
            .filter((s3Key): s3Key is string => Boolean(s3Key)) ?? [];

    const updatedQuestion = await this.questionsRepository.update(
      userId,
      id,
      dto,
    );

    await Promise.all(
      s3KeysToRemove.map((s3Key) => this.s3Service.remove(s3Key)),
    );

    return updatedQuestion;
  }

  async remove(id: string) {
    const question = await this.findOne(id);
    const s3KeysToRemove =
      question.files
        ?.map((item) => item.file.s3_key)
        .filter((s3Key): s3Key is string => Boolean(s3Key)) ?? [];

    await this.questionsRepository.softDelete(id);

    await Promise.all(
      s3KeysToRemove.map((s3Key) => this.s3Service.remove(s3Key)),
    );

    return {
      message: 'Question and files deleted successfully',
      files: s3KeysToRemove.length,
    };
  }
}
