import {
  CreateKnowledgePlanDto,
  EditKnowledgePlanDto,
  PlanRevisionDto,
} from './dto/knowledge-plan.dto';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DocumentErrorFilter } from '../learning-documents/document.controller';
import { KnowledgePlanService } from './knowledge-plan.service';
import { GenerationBatchService } from './generation-batch.service';
import type { GenerationActor } from './question-generation.service';
type LecturerRequest = Request & { user: GenerationActor };

/** Lecturer-owned source plans; source processing and bank writes remain separate. */
@ApiTags('Question generation plans')
@ApiCookieAuth('access_token')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.LECTURER)
@UseFilters(DocumentErrorFilter)
@Controller('question-generation-plans')
export class KnowledgePlanController {
  constructor(
    private readonly plans: KnowledgePlanService,
    private readonly batches: GenerationBatchService,
  ) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Prepare a source-wide content map and proposed topic × cognitive matrix',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiBody({ type: CreateKnowledgePlanDto })
  @ApiResponse({
    status: 202,
    description: 'Durable plan with owner-scoped ID; no chapters created',
  })
  create(
    @Req() req: LecturerRequest,
    @Body() input: unknown,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.plans.create(req.user.id, input, key);
  }

  @Get()
  @ApiOperation({ summary: 'List owned resumable plans' })
  @ApiResponse({ status: 200, description: '{data,total,page,limit}' })
  list(
    @Req() req: LecturerRequest,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.plans.list(req.user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Read a plan, source evidence, proposed targets and current matches',
  })
  @ApiResponse({
    status: 200,
    description: 'Owner-scoped plan and chapter matches',
  })
  get(@Req() req: LecturerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.plans.get(req.user.id, id);
  }

  @ApiBody({ type: EditKnowledgePlanDto })
  @Patch(':id')
  @ApiOperation({
    summary:
      'Edit tree, objectives, source pages and cognitive counts at an expected revision',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved revision; still no bank changes',
  })
  edit(
    @Req() req: LecturerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.plans.edit(req.user.id, id, input);
  }

  @ApiBody({ type: PlanRevisionDto })
  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Freeze a matrix revision without creating bank chapters',
  })
  @ApiResponse({ status: 200, description: 'Approved plan' })
  approve(
    @Req() req: LecturerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.plans.approve(req.user.id, id, input);
  }

  @ApiBody({ type: PlanRevisionDto })
  @Post(':id/generate')
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Generate from one approved matrix; bank writes still require draft approval/commit',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({
    status: 202,
    description: '{batch_id,status,status_url}; immutable matrix snapshot',
  })
  async generate(
    @Req() req: LecturerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
    @Headers('idempotency-key') key?: string,
  ) {
    const { command, snapshot } = await this.plans.generation(
      req.user.id,
      id,
      input,
    );
    return this.batches.create(req.user, command, key, snapshot);
  }
}
