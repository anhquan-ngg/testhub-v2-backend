import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuestionsRepository } from './questions.repository';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly questionsRepository: QuestionsRepository) {}

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

  async update(id: string, dto: UpdateQuestionDto) {
    await this.findOne(id);
    return this.questionsRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.questionsRepository.softDelete(id);
    return { message: 'Question deleted successfully' };
  }
}
