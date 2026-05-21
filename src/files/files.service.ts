import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileStatus } from '@prisma/client';
import { S3Service } from '../s3/s3.service';
import { CreateFileUploadDto } from './dto/create-file-upload.dto';
import { QueryFileDto } from './dto/query-file.dto';
import { FilesRepository } from './files.repository';

@Injectable()
export class FilesService {
  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly s3Service: S3Service,
  ) {}

  async createUploadUrl(uploadedBy: string, dto: CreateFileUploadDto) {
    const s3Key = this.buildS3Key(uploadedBy, dto);
    const storageUrl = this.s3Service.createStorageUrl(s3Key);
    const file = await this.filesRepository.create(
      uploadedBy,
      dto,
      s3Key,
      storageUrl,
    );
    const { url: uploadUrl } = await this.s3Service.createUploadUrl(s3Key);

    return { file, uploadUrl };
  }

  findAll(uploadedBy: string, query: QueryFileDto) {
    return this.filesRepository.findMany(uploadedBy, query);
  }

  async findOne(uploadedBy: string, id: string) {
    const file = await this.filesRepository.findById(id, uploadedBy);
    if (!file) {
      throw new NotFoundException(`File with id "${id}" not found`);
    }
    return file;
  }

  async confirmUploaded(uploadedBy: string, id: string) {
    const file = await this.findOne(uploadedBy, id);
    const exists = await this.s3Service.checkExists(file.s3_key);

    if (!exists) {
      throw new BadRequestException('File does not exist on S3 yet');
    }

    await this.filesRepository.markAvailable(id, uploadedBy);
    return this.findOne(uploadedBy, id);
  }

  async createDownloadUrl(uploadedBy: string, id: string) {
    const file = await this.findAvailableFile(uploadedBy, id);
    return this.s3Service.createDownloadUrl(file.s3_key);
  }

  async createViewUrl(uploadedBy: string, id: string) {
    const file = await this.findAvailableFile(uploadedBy, id);
    return this.s3Service.getViewUrl(file.s3_key);
  }

  async remove(uploadedBy: string, id: string) {
    const file = await this.findOne(uploadedBy, id);
    await this.filesRepository.softDelete(id, uploadedBy);
    try {
      await this.s3Service.remove(file.s3_key);
    } catch (error) {
      // Revert soft-delete if S3 removal fails, keeping consistency
      await this.filesRepository.markAvailable(id, uploadedBy);
      throw error;
    }

    return { message: 'File deleted successfully' };
  }

  private async findAvailableFile(uploadedBy: string, id: string) {
    const file = await this.findOne(uploadedBy, id);

    if (file.status !== FileStatus.AVAILABLE) {
      throw new BadRequestException('File is not available yet');
    }

    return file;
  }

  private buildS3Key(uploadedBy: string, dto: CreateFileUploadDto) {
    const entityType = this.sanitizePathPart(dto.entity_type ?? 'temporary');
    const entityId = this.sanitizePathPart(dto.entity_id ?? 'unassigned');
    const fileName = this.sanitizeFileName(dto.name);

    return `files/${uploadedBy}/${entityType}/${entityId}/${randomUUID()}-${fileName}`;
  }

  private sanitizeFileName(fileName: string) {
    return fileName
      .trim()
      .replace(/[/\\]/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-');
  }

  private sanitizePathPart(value: string) {
    return value
      .trim()
      .replace(/[/\\]/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-');
  }
}
