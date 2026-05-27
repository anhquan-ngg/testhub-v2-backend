import { Injectable, NotFoundException } from '@nestjs/common';
import { ChaptersRepository } from './chapters.repository';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { QueryChapterDto } from './dto/query-chapter.dto';

@Injectable()
export class ChaptersService {
  constructor(private readonly chaptersRepository: ChaptersRepository) {}

  async create(dto: CreateChapterDto, isAdmin = false) {
    return this.chaptersRepository.create(dto, isAdmin);
  }

  async findAll(query: QueryChapterDto, isAdmin = false) {
    return this.chaptersRepository.findMany(query, isAdmin);
  }

  async findOne(id: string, isAdmin = false) {
    const chapter = await this.chaptersRepository.findById(id, isAdmin);
    if (!chapter) {
      throw new NotFoundException(`Chapter with id "${id}" not found`);
    }
    return chapter;
  }

  async update(id: string, dto: UpdateChapterDto) {
    await this.findOne(id);
    return this.chaptersRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.chaptersRepository.softDelete(id);
    return { message: 'Chapter deleted successfully' };
  }
}
