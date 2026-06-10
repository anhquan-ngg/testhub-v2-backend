import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionRating, SubmissionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'uuid-of-exam' })
  @IsUUID()
  exam_id: string;

  @ApiProperty({ example: 'uuid-of-student' })
  @IsUUID()
  student_id: string;

  @ApiPropertyOptional({ example: 8.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total_score?: number;

  @ApiPropertyOptional({ enum: SubmissionRating })
  @IsOptional()
  @IsEnum(SubmissionRating)
  rating?: SubmissionRating;

  @ApiPropertyOptional({ example: '2026-06-04T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  start_time?: string;

  @ApiPropertyOptional({ example: '2026-06-04T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  end_time?: string;

  @ApiPropertyOptional({ enum: SubmissionStatus })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;
}
