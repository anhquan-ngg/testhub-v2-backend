import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExamMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class QueryExamDto {
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

  @ApiPropertyOptional({ example: 'uuid-of-topic' })
  @IsOptional()
  @IsUUID()
  topic_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-lecturer' })
  @IsOptional()
  @IsUUID()
  lecturer_id?: string;

  @ApiPropertyOptional({ enum: ExamMode })
  @IsOptional()
  @IsEnum(ExamMode)
  mode?: ExamMode;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  practice?: boolean;

  @ApiPropertyOptional({ example: 'Midterm' })
  @IsOptional()
  @IsString()
  search?: string;
}
