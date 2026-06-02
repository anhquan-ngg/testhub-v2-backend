import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { QueryChapterDto } from './dto/query-chapter.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import type { Request } from 'express';

@ApiTags('Chapters')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chapter' })
  @ApiResponse({ status: 201, description: 'Chapter created successfully.' })
  create(@Body() dto: CreateChapterDto, @Req() req: Request) {
    const isAdmin = req.user?.role === 'ADMIN';
    return this.chaptersService.create(dto, isAdmin);
  }

  @Get()
  @ApiOperation({
    summary: 'Get chapters with pagination and filters (topic_id, parent_id)',
  })
  findAll(@Query() query: QueryChapterDto, @Req() req: Request) {
    const isAdmin = req.user?.role === 'ADMIN';
    return this.chaptersService.findAll(query, isAdmin);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a chapter by ID (includes children, parent, topic)',
  })
  @ApiResponse({ status: 404, description: 'Chapter not found.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const isAdmin = req.user?.role === 'ADMIN';
    return this.chaptersService.findOne(id, isAdmin);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chapter' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.chaptersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a chapter' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.chaptersService.remove(id);
  }
}
