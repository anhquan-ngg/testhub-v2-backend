import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionFormat, QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ImportOptionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  key: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  text: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect: boolean;
}

export class UpdateQuestionImportItemDto {
  @ApiPropertyOptional({ description: 'Existing chapter of the topic' })
  @IsOptional()
  @IsUUID()
  chapter_id?: string;

  @ApiPropertyOptional({
    description:
      'Chapter name or "Parent > Child" path; takes precedence over chapter_id. Missing chapters are created on commit.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  chapter_name?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  question_text: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  question_type: QuestionType;

  @ApiProperty({ enum: QuestionFormat })
  @IsEnum(QuestionFormat)
  question_format: QuestionFormat;

  @ApiProperty({ type: [ImportOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportOptionDto)
  options: ImportOptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correct_answer?: string;
}
