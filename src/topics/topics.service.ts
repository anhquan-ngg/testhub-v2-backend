import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicsRepository } from './topics.repository';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { QueryTopicDto } from './dto/query-topic.dto';

@Injectable()
export class TopicsService {
  constructor(private readonly topicsRepository: TopicsRepository) {}

  async create(dto: CreateTopicDto) {
    return this.topicsRepository.create(dto);
  }

  async findAll(query: QueryTopicDto, isAdmin = false) {
    return this.topicsRepository.findMany(query, isAdmin);
  }

  async findOne(id: string, isAdmin = false) {
    const topic = await this.topicsRepository.findById(id, isAdmin);
    if (!topic) {
      throw new NotFoundException(`Topic with id "${id}" not found`);
    }
    return topic;
  }

  async update(id: string, dto: UpdateTopicDto) {
    await this.findOne(id);
    return this.topicsRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.topicsRepository.softDelete(id);
    return { message: 'Topic deleted successfully' };
  }
}
