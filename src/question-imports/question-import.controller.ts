import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CommitQuestionImportDto } from './dto/commit-question-import.dto';
import { CreateQuestionImportDto } from './dto/create-question-import.dto';
import { QueryQuestionImportItemsDto } from './dto/query-question-import-items.dto';
import { UpdateQuestionImportItemDto } from './dto/update-question-import-item.dto';
import { QuestionImportService } from './question-import.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@ApiTags('Question imports')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.LECTURER)
@Controller('question-imports')
export class QuestionImportController {
  constructor(private readonly service: QuestionImportService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an import and return a presigned upload URL',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateQuestionImportDto,
  ) {
    return this.service.create(req.user.id, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Confirm upload and enqueue parsing' })
  complete(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.complete(req.user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get import status and counters' })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.findOne(req.user.id, id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get parsed import rows for review' })
  findItems(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: QueryQuestionImportItemsDto,
  ) {
    return this.service.findItems(req.user.id, id, query);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Correct and revalidate one parsed row' })
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateQuestionImportItemDto,
  ) {
    return this.service.updateItem(req.user.id, id, itemId, dto);
  }

  @Post(':id/commit')
  @ApiOperation({
    summary:
      'Create selected questions and attach them to a MANUAL exam when requested',
  })
  commit(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CommitQuestionImportDto,
  ) {
    return this.service.commit(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel an unfinished import and remove temporary objects',
  })
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.cancel(req.user.id, id);
  }
}
