import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionImportSourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { QUESTION_IMPORT_MAX_FILE_SIZE } from '../question-import.constants';

export class CreateQuestionImportDto {
  @ApiProperty()
  @IsUUID()
  topic_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  default_chapter_id?: string;

  @ApiPropertyOptional({
    description: 'MANUAL exam to attach imported questions to',
  })
  @IsOptional()
  @IsUUID()
  exam_id?: string;

  @ApiProperty({ enum: QuestionImportSourceType })
  @IsEnum(QuestionImportSourceType)
  source_type: QuestionImportSourceType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  file_name: string;

  @ApiProperty()
  @IsMimeType()
  mime_type: string;

  @ApiProperty({ maximum: QUESTION_IMPORT_MAX_FILE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(QUESTION_IMPORT_MAX_FILE_SIZE)
  size: number;
}
