import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionFormat, QuestionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({ example: 'uuid-of-chapter' })
  @IsUUID()
  chapter_id: string;

  @ApiProperty({ example: 'What is the time complexity of binary search?' })
  @IsString()
  @MinLength(1)
  question_text: string;

  @ApiPropertyOptional({ example: '["O(1)","O(log n)","O(n)","O(n^2)"]', description: 'JSON string of options for choice questions' })
  @IsOptional()
  @IsString()
  options?: string;

  @ApiPropertyOptional({ example: '["O(log n)"]', description: 'JSON string of correct answer(s)' })
  @IsOptional()
  @IsString()
  correct_answer?: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  question_type: QuestionType;

  @ApiProperty({ enum: QuestionFormat })
  @IsEnum(QuestionFormat)
  question_format: QuestionFormat;
}
