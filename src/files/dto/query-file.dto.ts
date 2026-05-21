import { ApiPropertyOptional } from '@nestjs/swagger';
import { FileStatus, FileType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryFileDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: FileType })
  @IsOptional()
  @IsEnum(FileType)
  type?: FileType;

  @ApiPropertyOptional({ enum: FileStatus })
  @IsOptional()
  @IsEnum(FileStatus)
  status?: FileStatus;

  @ApiPropertyOptional({ example: 'question' })
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  entity_id?: string;
}
