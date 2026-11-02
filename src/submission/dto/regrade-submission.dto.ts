import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegradeQuestionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  submission_question_id: string;

  @ApiProperty({
    minimum: 0,
    maximum: 1,
    description:
      'Normalized score, two decimals; equal question weights on a /10 total.',
  })
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(1)
  score: number;
}

export class SaveRegradeDraftDto {
  @ApiProperty({
    minimum: 0,
    description:
      '0 for the first draft, otherwise the currently displayed revision.',
  })
  @IsInt()
  @Min(0)
  expected_revision: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  expected_grade_revision: number;

  @ApiProperty({ type: [RegradeQuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: RegradeQuestionDto) => item.submission_question_id)
  @ValidateNested({ each: true })
  @Type(() => RegradeQuestionDto)
  scores: RegradeQuestionDto[];

  @ApiPropertyOptional({
    maxLength: 2000,
    default: '',
    description: 'Optional explanation; defaults to an empty string.',
  })
  @IsString()
  @MaxLength(2000)
  reason = '';
}

export class PublishRegradeDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  revision: number;
}
