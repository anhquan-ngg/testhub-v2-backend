import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateFileUploadDto {
  @ApiProperty({ example: 'question-image.png' })
  @IsString()
  name: string;

  @ApiProperty({ enum: FileType })
  @IsEnum(FileType)
  type: FileType;

  @ApiPropertyOptional({ example: 204800 })
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({ example: 'question' })
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  entity_id?: string;
}
