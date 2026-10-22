import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DocumentErrorFilter } from './document.controller';
import { RagService } from './rag.service';
type Actor = Request & { user: { id: string } };
/** Lecturer-owned RAG operations. Browser never chooses an internal owner or profile. */
@ApiTags('Learning document indexes')
@ApiCookieAuth('access_token')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.LECTURER)
@UseFilters(DocumentErrorFilter)
@Controller('learning-documents')
export class RagController {
  constructor(private readonly service: RagService) {}
  /** Accept an index command; background worker owns paid calls. */
  @Post(':id/versions/:versionId/index')
  @HttpCode(202)
  @ApiOperation({ summary: 'Queue or replay an immutable document index' })
  @ApiResponse({
    status: 202,
    description: 'Index summary; poll document metadata',
  })
  start(
    @Req() req: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) version: string,
  ) {
    return this.service.start(req.user.id, id, version);
  }
  /** Resume failed checkpoints without resetting provider budget. */
  @Post('indexes/:indexId/retry')
  @HttpCode(202)
  @ApiOperation({ summary: 'Resume an owned failed index' })
  @ApiResponse({ status: 202, description: 'Index summary' })
  retry(@Req() req: Actor, @Param('indexId', ParseUUIDPipe) id: string) {
    return this.service.retry(req.user.id, id);
  }
  /** Return source candidates; similarity does not prove factual coverage. */
  @Post('retrieve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Retrieve from a fully authorized READY version set',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['version_ids', 'query'],
      properties: {
        version_ids: {
          type: 'array',
          minItems: 1,
          maxItems: 10,
          uniqueItems: true,
          items: { type: 'string', format: 'uuid' },
        },
        query: { type: 'string', maxLength: 1000 },
        top_k: { type: 'integer', minimum: 1, maximum: 8, default: 6 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Scoped source chunks, offsets, hashes, similarity and UNASSESSED quality',
  })
  retrieve(@Req() req: Actor, @Body() body: unknown) {
    return this.service.retrieve(req.user.id, body);
  }
}
