import { Injectable, NotFoundException } from '@nestjs/common';
import { QuestionsRepository } from './questions.repository';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly questionsRepository: QuestionsRepository) {}

  async create(dto: CreateQuestionDto) {
    return this.questionsRepository.create(dto);
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
