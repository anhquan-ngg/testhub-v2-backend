import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionFormat, QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class QuestionFileInputDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  order: number;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'uuid-of-chapter' })
  @IsUUID()
  chapter_id: string;

  @ApiProperty({ example: 'What is the time complexity of binary search?' })
  @IsString()
  @MinLength(1)
  question_text: string;

  @ApiPropertyOptional({
    example: '["O(1)","O(log n)","O(n)","O(n^2)"]',
    description: 'JSON string of options for choice questions',
  })
  @IsOptional()
  @IsString()
  options?: string;

  @ApiPropertyOptional({
    example: '["O(log n)"]',
    description: 'JSON string of correct answer(s)',
  })
  @IsOptional()
  @IsString()
  correct_answer?: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  question_type: QuestionType;

  @ApiProperty({ enum: QuestionFormat })
  @IsEnum(QuestionFormat)
  question_format: QuestionFormat;

  @ApiPropertyOptional({
    example: [
      { id: '550e8400-e29b-41d4-a716-446655440000', order: 1 },
      { id: 'f774b042-2c2b-41f6-b346-a63b22695b65', order: 2 },
    ],
    type: [QuestionFileInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionFileInputDto)
  @ArrayUnique((item: QuestionFileInputDto) => item.id)
  file_ids?: QuestionFileInputDto[];
}
