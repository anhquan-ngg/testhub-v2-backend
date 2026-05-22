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

  @ApiPropertyOptional({ example: 30, description: 'Number of random questions (RANDOM_N mode)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sample_size?: number;

  @ApiPropertyOptional({ example: '{"KNOWLEDGE":10,"UNDERSTANDING":10,"APPLYING":5,"ADVANCED":5}' })
  @IsOptional()
  @IsString()
  distribution?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
