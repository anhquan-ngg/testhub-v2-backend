import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateExamDto {
  @ApiProperty({ example: 'uuid-of-topic' })
  @IsUUID()
  topic_id: string;

  @ApiProperty({ example: 'Midterm Exam - Data Structures' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: '2025-06-01T08:00:00.000Z' })
  @IsDateString()
  exam_start_time: string;

  @ApiProperty({ example: '2025-06-01T10:00:00.000Z' })
  @IsDateString()
  exam_end_time: string;

  @ApiProperty({ example: 90, description: 'Duration in minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  practice?: boolean;

  @ApiPropertyOptional({ enum: ExamMode, default: ExamMode.MANUAL })
  @IsOptional()
  @IsEnum(ExamMode)
  mode?: ExamMode;

  @ApiPropertyOptional({
    example: 30,
    description: 'Number of random questions (RANDOM_N mode)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sample_size?: number;

  @ApiPropertyOptional({
    description:
      'JSON distribution. BY_CHAPTER: [{chapter_id: UUID, quantity: positive integer}]. Every chapter includes all active descendants, at any depth. Rows may overlap; selected question IDs are globally distinct. Existing JSON shape is unchanged.',
    example:
      '[{"chapter_id":"11111111-1111-4111-8111-111111111111","quantity":10}]',
  })
  @IsOptional()
  @IsString()
  distribution?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
