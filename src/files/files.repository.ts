import { Injectable } from '@nestjs/common';
import { FileStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFileUploadDto } from './dto/create-file-upload.dto';
import { QueryFileDto } from './dto/query-file.dto';

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    uploadedBy: string,
    dto: CreateFileUploadDto,
    s3Key: string,
    storageUrl: string,
  ) {
    return this.prisma.file.create({
      data: {
        name: dto.name,
        url: storageUrl,
        s3_key: s3Key,
        type: dto.type,
        size: dto.size,
        entity_type: dto.entity_type,
        entity_id: dto.entity_id,
        uploaded_by: uploadedBy,
        status: FileStatus.PENDING,
      },
    });
  }

  async findMany(uploadedBy: string, query: QueryFileDto) {
    const { page = 1, limit = 10, type, status, entity_type, entity_id } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FileWhereInput = {
      uploaded_by: uploadedBy,
      status: status ?? { not: FileStatus.DELETED },
      ...(type && { type }),
      ...(entity_type && { entity_type }),
      ...(entity_id && { entity_id }),
    };

    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploaded_at: 'desc' },
      }),
      this.prisma.file.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  findById(id: string, uploadedBy: string) {
    return this.prisma.file.findFirst({
      where: {
        id,
        uploaded_by: uploadedBy,
        status: { not: FileStatus.DELETED },
      },
    });
  }

  markAvailable(id: string, uploadedBy: string) {
    return this.prisma.file.updateMany({
      where: {
        id,
        uploaded_by: uploadedBy,
        status: { not: FileStatus.DELETED },
      },
      data: { status: FileStatus.AVAILABLE },
    });
  }

  softDelete(id: string, uploadedBy: string) {
    return this.prisma.file.updateMany({
      where: {
        id,
        uploaded_by: uploadedBy,
        status: { not: FileStatus.DELETED },
      },
      data: { status: FileStatus.DELETED },
    });
  }
}
