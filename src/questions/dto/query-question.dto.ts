import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionFormat, QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryQuestionDto {
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

  @ApiPropertyOptional({ example: 'uuid-of-chapter' })
  @IsOptional()
  @IsUUID()
  chapter_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-lecturer' })
  @IsOptional()
  @IsUUID()
  lecturer_id?: string;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  question_type?: QuestionType;

  @ApiPropertyOptional({ enum: QuestionFormat })
  @IsOptional()
  @IsEnum(QuestionFormat)
  question_format?: QuestionFormat;

  @ApiPropertyOptional({ example: 'binary search' })
  @IsOptional()
  @IsString()
  search?: string;
}
