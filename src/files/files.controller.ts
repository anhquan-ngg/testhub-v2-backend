import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateFileUploadDto } from './dto/create-file-upload.dto';
import {
  CreateFileUploadResponseDto,
  FileResponseDto,
  FileUrlResponseDto,
} from './dto/file-response.dto';
import { QueryFileDto } from './dto/query-file.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Create a file record and presigned S3 upload URL' })
  @ApiResponse({ status: 201, type: CreateFileUploadResponseDto })
  createUploadUrl(@Req() req: any, @Body() dto: CreateFileUploadDto) {
    return this.filesService.createUploadUrl(req.user.id, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm file exists on S3 and mark it available' })
  @ApiResponse({ status: 201, type: FileResponseDto })
  confirmUploaded(@Req() req: any, @Param('id') id: string) {
    return this.filesService.confirmUploaded(req.user.id, id);
  }

  @Get()
  @ApiOperation({ summary: 'Get uploaded files with pagination and filters' })
  findAll(@Req() req: any, @Query() query: QueryFileDto) {
    return this.filesService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata by ID' })
  @ApiResponse({ status: 200, type: FileResponseDto })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.filesService.findOne(req.user.id, id);
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Create a temporary download URL for an available file' })
  @ApiResponse({ status: 200, type: FileUrlResponseDto })
  createDownloadUrl(@Req() req: any, @Param('id') id: string) {
    return this.filesService.createDownloadUrl(req.user.id, id);
  }

  @Get(':id/view-url')
  @ApiOperation({ summary: 'Create a temporary inline view URL for an available file' })
  @ApiResponse({ status: 200, type: FileUrlResponseDto })
  createViewUrl(@Req() req: any, @Param('id') id: string) {
    return this.filesService.createViewUrl(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a file record and remove the S3 object' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.filesService.remove(req.user.id, id);
  }
}
