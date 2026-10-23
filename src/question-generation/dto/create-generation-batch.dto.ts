import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { QuestionFormat } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  Equals,
  IsEnum,
  IsInt,
  IsOptional,
  MaxLength,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

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

  @ApiProperty({ enum: ['SINGLE_CHOICE'] })
  @Equals('SINGLE_CHOICE')
  question_type: string;

  @ApiProperty({ enum: QuestionFormat })
  @IsEnum(QuestionFormat)
  question_format: QuestionFormat;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  count: number;

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
