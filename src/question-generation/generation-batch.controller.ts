import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateGenerationBatchDto } from './dto/create-generation-batch.dto';
import {
  AcceptedGenerationBatchDto,
  GenerationBatchResponseDto,
  GenerationItemsResponseDto,
} from './dto/generation-batch-response.dto';
import { GenerationBatchService } from './generation-batch.service';
import type { GenerationActor } from './question-generation.service';
import { GenerationReviewService } from './generation-review.service';
import {
  GenerationBatchesResponseDto,
  GenerationItemResponseDto,
} from './dto/generation-batch-response.dto';
import {
  EditGenerationItemDto,
  ReviewGenerationItemDto,
  CommitGenerationItemsDto,
  CommitGenerationResponseDto,
} from './dto/review-generation-item.dto';

type AuthenticatedRequest = Request & { user: GenerationActor };

/** Lecturer-owned commands and polling resources for AI staging. */
@ApiTags('Question generation')
@ApiCookieAuth('access_token')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.LECTURER)
@Controller('question-generation-batches')
export class GenerationBatchController {
  constructor(
    private readonly service: GenerationBatchService,
    private readonly reviewService: GenerationReviewService,
  ) {}

  /** Resume an owned batch after navigation/reload without browser-local storage. */
  @Get()
  @ApiOperation({ summary: 'List owned question generation batches' })
  @ApiResponse({ status: 200, type: GenerationBatchesResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid pagination/topic UUID' })
  @ApiResponse({ status: 401, description: 'Login required' })
  @ApiResponse({ status: 403, description: 'Lecturer required' })
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('topic_id', new ParseUUIDPipe({ optional: true })) topicId?: string,
  ) {
    return this.service.list(req.user, page, limit, topicId);
  }

  /** Edit raw JSON through the strict shared schema; saves invalidate approval. */
  @Patch(':id/items/:itemId')
  @ApiOperation({
    summary: 'Edit a draft at an expected revision; approval is reset',
  })
  @ApiBody({ type: EditGenerationItemDto })
  @ApiResponse({ status: 200, type: GenerationItemResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid draft or revision' })
  @ApiResponse({ status: 401, description: 'Login required' })
  @ApiResponse({ status: 403, description: 'Lecturer required' })
  @ApiResponse({ status: 404, description: 'Batch/item unavailable' })
  @ApiResponse({ status: 409, description: 'Stale revision or not editable' })
  edit(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() input: unknown,
  ) {
    return this.reviewService.edit(req.user, id, itemId, input);
  }

  /** Approval is an explicit action distinct from structural VALID status. */
  @Post(':id/items/:itemId/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject one exact draft revision' })
  @ApiBody({ type: ReviewGenerationItemDto })
  @ApiResponse({ status: 200, type: GenerationItemResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid decision/revision' })
  @ApiResponse({ status: 401, description: 'Login required' })
  @ApiResponse({ status: 403, description: 'Lecturer required' })
  @ApiResponse({ status: 404, description: 'Batch/item unavailable' })
  @ApiResponse({ status: 409, description: 'Stale revision or invalid state' })
  review(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() input: unknown,
  ) {
    return this.reviewService.review(req.user, id, itemId, input);
  }

  /** Safe to replay the same item/revision selection after a lost response. */
  @Post(':id/commit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atomically commit selected approved drafts into the bank',
  })
  @ApiBody({ type: CommitGenerationItemsDto })
  @ApiResponse({ status: 200, type: CommitGenerationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid/duplicate selection' })
  @ApiResponse({ status: 401, description: 'Login required' })
  @ApiResponse({ status: 403, description: 'Lecturer required' })
  @ApiResponse({ status: 404, description: 'Batch/item unavailable' })
  @ApiResponse({
    status: 409,
    description: 'Revision changed or draft not approved',
  })
  commit(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.reviewService.commit(req.user, id, input);
  }

  /** Accept a durable command and return immediately without waiting for AI. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue text question generation for lecturer review',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      '16-128 letters/digits/._-; reuse the same key only for identical input',
  })
  @ApiBody({ type: CreateGenerationBatchDto })
  @ApiResponse({
    status: 202,
    type: AcceptedGenerationBatchDto,
    description: '{batch_id,status,status_url}; replay returns the same batch',
  })
  @ApiResponse({ status: 400, description: 'Invalid command, key or consent' })
  @ApiResponse({ status: 401, description: 'Login required' })
  @ApiResponse({ status: 403, description: 'Lecturer role required' })
  @ApiResponse({
    status: 404,
    description: 'Target unavailable to this lecturer',
  })
  @ApiResponse({
    status: 409,
    description: 'Key reused for different input or target changed',
  })
  @ApiResponse({ status: 503, description: 'AI feature disabled' })
  create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    // unknown prevents the global implicit-conversion/whitelist pipe from
    // mutating input before this strict per-route DTO pipe can inspect it.
    @Body(
      new ValidationPipe({
        expectedType: CreateGenerationBatchDto,
        transform: false,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    )
    input: unknown,
  ) {
    return this.service.create(req.user, input, key);
  }

  /** Return durable status/counters without exposing source text or internal jobs. */
  @Get(':id')
  @ApiOperation({ summary: 'Poll an owned generation batch' })
  @ApiResponse({
    status: 200,
    description: 'Batch status, counters and safe failure code',
    type: GenerationBatchResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Login required' })
  @ApiResponse({ status: 403, description: 'Lecturer role required' })
  @ApiResponse({ status: 404, description: 'Batch unavailable' })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(req.user, id);
  }

  /** Read persisted drafts in stable source order. */
  @Get(':id/items')
  @ApiOperation({ summary: 'List generated drafts awaiting review' })
  @ApiResponse({
    status: 200,
    description: '{data,total,page,limit}; no bank insertion',
    type: GenerationItemsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid pagination' })
  @ApiResponse({ status: 401, description: 'Login required' })
  @ApiResponse({ status: 403, description: 'Lecturer role required' })
  @ApiResponse({ status: 404, description: 'Batch unavailable' })
  items(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.service.items(req.user, id, page, limit);
  }
}
