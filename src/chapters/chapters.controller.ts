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
import { UserRole } from '@prisma/client';
import { ChaptersService, type ChapterActor } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { QueryChapterDto } from './dto/query-chapter.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { Request } from 'express';

/** JwtGuard guarantees an authenticated user on every route here. */
const toActor = (req: Request): ChapterActor => ({
  id: String(req.user?.id ?? ''),
  isAdmin: req.user?.role === UserRole.ADMIN,
});

@ApiTags('Chapters')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.LECTURER, UserRole.ADMIN)
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chapter' })
  @ApiResponse({ status: 201, description: 'Chapter created successfully.' })
  @ApiResponse({ status: 403, description: 'Topic belongs to another user.' })
  create(@Body() dto: CreateChapterDto, @Req() req: Request) {
    return this.chaptersService.create(dto, toActor(req));
  }

  @Get()
  @ApiOperation({
    summary: 'Get chapters with pagination and filters (topic_id, parent_id)',
  })
  findAll(@Query() query: QueryChapterDto, @Req() req: Request) {
    return this.chaptersService.findAll(query, toActor(req));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a chapter by ID (includes children, parent, topic)',
  })
  @ApiResponse({ status: 404, description: 'Chapter not found.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.chaptersService.findOne(id, toActor(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chapter' })
  @ApiResponse({ status: 404, description: 'Chapter not found.' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateChapterDto,
    @Req() req: Request,
  ) {
    return this.chaptersService.update(id, dto, toActor(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a chapter' })
  @ApiResponse({ status: 404, description: 'Chapter not found.' })
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.chaptersService.remove(id, toActor(req));
  }
}
