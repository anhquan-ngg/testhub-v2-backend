import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  HttpCode,
  HttpException,
  Logger,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
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
import type { Request } from 'express';
import type { Response } from 'express-serve-static-core';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DocumentService } from './document.service';

type LecturerRequest = Request & { user: { id: string } };

/** Prevent storage/ORM exceptions from leaking document data or infrastructure details. */
@Catch()
export class DocumentErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DocumentErrorFilter.name);
  /** Return safe known HTTP errors and sanitize all infrastructure exceptions. */
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      /^P\d{4}$/.test(error.code)
        ? error.code
        : undefined;
    this.logger.warn({
      event: 'document_storage_unavailable',
      ...(code ? { prisma_code: code } : {}),
    });
    response.status(503).json({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Document storage unavailable',
    });
  }
}

const uploadProperties: Record<string, SchemaObject> = {
  file_name: { type: 'string', maxLength: 200 },
  source_type: { type: 'string', enum: ['PDF', 'PPTX'] },
  mime_type: { type: 'string' },
  size: { type: 'integer', minimum: 1, maximum: 20971520 },
  include_notes: { type: 'boolean', default: false },
  consent: { type: 'boolean', enum: [true] },
};
const uploadBody: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['file_name', 'source_type', 'mime_type', 'size', 'consent'],
  properties: uploadProperties,
};

/** Authenticated lecturer-owned resources; internal keys never enter public metadata. */
@ApiTags('Learning documents')
@ApiCookieAuth('access_token')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.LECTURER)
@UseFilters(DocumentErrorFilter)
@Controller('learning-documents')
export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  /** Validate strict raw types despite implicit conversion in the global pipe. */
  @Post()
  @ApiOperation({ summary: 'Create a PDF/PPTX document and presigned upload' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'topic_id', 'chapter_id', 'upload'],
      properties: {
        title: { type: 'string', maxLength: 200 },
        topic_id: { type: 'string', format: 'uuid' },
        chapter_id: { type: 'string', format: 'uuid' },
        upload: uploadBody,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'document_id, version_id, upload_url, upload_expires_at, max_bytes',
  })
  create(@Req() req: LecturerRequest, @Body() body: unknown) {
    return this.service.create(req.user.id, body);
  }

  /** List documents and the latest 50 immutable version summaries. */
  @Get()
  @ApiOperation({ summary: 'List owned learning documents' })
  @ApiResponse({
    status: 200,
    description: '{data,total,page,limit}; metadata only',
  })
  list(
    @Req() req: LecturerRequest,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('topic_id', new ParseUUIDPipe({ optional: true })) topic?: string,
  ) {
    return this.service.list(req.user.id, page, limit, topic);
  }

  /** Poll metadata without fetching source content. */
  @Get(':id')
  @ApiOperation({ summary: 'Read an owned document and extraction status' })
  @ApiResponse({
    status: 200,
    description: 'Document metadata and version summaries',
  })
  detail(@Req() req: LecturerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(req.user.id, id);
  }

  /** Upload a replacement source while retaining the previous source version. */
  @Post(':id/versions')
  @ApiOperation({ summary: 'Create an immutable document version' })
  @ApiBody({ schema: uploadBody })
  @ApiResponse({ status: 201, description: 'Version ID and presigned upload' })
  addVersion(
    @Req() req: LecturerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.service.addVersion(req.user.id, id, body);
  }

  /** A durable queued state survives a Redis outage after upload confirmation. */
  @Post(':id/versions/:versionId/complete')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Freeze uploaded bytes and queue extraction; safe to replay',
  })
  @ApiResponse({
    status: 202,
    description: 'Document/version IDs and current status',
  })
  complete(
    @Req() req: LecturerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) version: string,
  ) {
    return this.service.complete(req.user.id, id, version);
  }

  /** Preview plain text by original page/slide, including explicitly opted-in notes. */
  @Get(':id/versions/:versionId/content')
  @ApiOperation({ summary: 'Read paginated extracted source spans' })
  @ApiResponse({
    status: 200,
    description:
      '{data:[{kind,position,text}],total,page,limit,unit_count,warnings}',
  })
  content(
    @Req() req: LecturerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) version: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.service.content(req.user.id, id, version, page, limit);
  }

  /** Access revocation does not silently promise physical object purging. */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke document access and future processing' })
  @ApiResponse({
    status: 204,
    description: 'Access revoked; retention policy controls physical deletion',
  })
  revoke(@Req() req: LecturerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.revoke(req.user.id, id);
  }
}
