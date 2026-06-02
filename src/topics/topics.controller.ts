import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { QueryTopicDto } from './dto/query-topic.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import type { Request } from 'express';

@ApiTags('Topics')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new topic' })
  @ApiResponse({ status: 201, description: 'Topic created successfully.' })
  create(@Body() dto: CreateTopicDto, @Req() req: Request) {
    return this.topicsService.create(req.user?.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all topics with pagination' })
  findAll(@Query() query: QueryTopicDto, @Req() req: Request) {
    const isAdmin = req.user?.role === 'ADMIN';
    return this.topicsService.findAll(query, isAdmin);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a topic by ID (includes root chapters)' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const isAdmin = req.user?.role === 'ADMIN';
    return this.topicsService.findOne(id, isAdmin);
  }

  // DEPRECATED: Update endpoint is not needed for now, as only the name can be updated and it is not a critical feature. We can reintroduce this endpoint in the future if needed.
  // @Patch(':id')
  // @ApiOperation({ summary: 'Update a topic' })
  // update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
  //   return this.topicsService.update(id, dto);
  // }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a topic' })
  remove(@Param('id') id: string) {
    return this.topicsService.remove(id);
  }
}
