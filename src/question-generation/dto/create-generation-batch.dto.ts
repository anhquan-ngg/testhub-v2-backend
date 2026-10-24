import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { QuestionFormat } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  MaxLength,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  GENERATION_QUESTION_TYPES,
  MAX_GENERATION_CONFIGS,
  MAX_GENERATION_QUESTIONS,
} from '../question-generation.contract';
import type { GenerationQuestionType } from '../question-generation.contract';

/** One requested row; the shared zod schema enforces the total question limit. */
export class QuestionConfigDto {
  @ApiProperty({ enum: GENERATION_QUESTION_TYPES })
  @IsIn(GENERATION_QUESTION_TYPES)
  question_type: GenerationQuestionType;

  @ApiProperty({ enum: QuestionFormat })
  @IsEnum(QuestionFormat)
  question_format: QuestionFormat;

  @ApiProperty({ minimum: 1, maximum: MAX_GENERATION_QUESTIONS })
  @IsInt()
  @Min(1)
  @Max(MAX_GENERATION_QUESTIONS)
  count: number;
}

export class TextGenerationSourceDto {
  @ApiProperty({ enum: ['text'] })
  @Equals('text')
  mode: string;

  @ApiProperty({
    minLength: 20,
    maxLength: 20_000,
    description:
      '20-20000 Unicode code points after trimming; enforced by the shared command schema',
  })
  @IsString()
  text: string;
}

export class DocumentGenerationSourceDto {
  @ApiProperty({ enum: ['document'] }) @Equals('document') mode: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() version_id: string;
  @ApiProperty({
    required: false,
    maxLength: 400,
    description: 'Optional knowledge focus, not source content',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  query?: string;
}

export class CreateGenerationBatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  topic_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  chapter_id: string;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(TextGenerationSourceDto) },
      { $ref: getSchemaPath(DocumentGenerationSourceDto) },
    ],
    discriminator: { propertyName: 'mode' },
  })
  @ValidateNested()
  @Type(() => TextGenerationSourceDto, {
    discriminator: {
      property: 'mode',
      subTypes: [
        { name: 'text', value: TextGenerationSourceDto },
        { name: 'document', value: DocumentGenerationSourceDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  source: TextGenerationSourceDto | DocumentGenerationSourceDto;

  @ApiProperty({
    type: [QuestionConfigDto],
    required: false,
    minItems: 1,
    maxItems: MAX_GENERATION_CONFIGS,
    description: `Ordered rows; questions are generated in this order. Total count is at most ${MAX_GENERATION_QUESTIONS}. Required unless the legacy question_type/question_format/count fields are sent.`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_GENERATION_CONFIGS)
  @ValidateNested({ each: true })
  @Type(() => QuestionConfigDto)
  question_configs?: QuestionConfigDto[];

  @ApiProperty({
    enum: ['SINGLE_CHOICE'],
    required: false,
    deprecated: true,
    description: 'Legacy single-row form; use question_configs',
  })
  @IsOptional()
  @Equals('SINGLE_CHOICE')
  question_type?: string;

  @ApiProperty({ enum: QuestionFormat, required: false, deprecated: true })
  @IsOptional()
  @IsEnum(QuestionFormat)
  question_format?: QuestionFormat;

  @ApiProperty({
    minimum: 1,
    maximum: MAX_GENERATION_QUESTIONS,
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_GENERATION_QUESTIONS)
  count?: number;

  @ApiProperty({ enum: ['vi'] })
  @Equals('vi')
  language: string;

  @ApiProperty({
    enum: [true],
    description:
      'Consent to send supplied text or document content and knowledge query to an external AI provider',
  })
  @Equals(true)
  external_processing_consent: boolean;
}
