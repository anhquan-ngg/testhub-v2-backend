import { ApiProperty } from '@nestjs/swagger';
import {
  QuestionFormat,
  QuestionGenerationBatchStatus,
  QuestionGenerationItemStatus,
  QuestionType,
} from '@prisma/client';
import { GENERATION_QUESTION_TYPES } from '../question-generation.contract';
import { QuestionConfigDto } from './create-generation-batch.dto';

/** Accepted command resource, excluding internal queue/execution identifiers. */
export class AcceptedGenerationBatchDto {
  @ApiProperty({ format: 'uuid' }) batch_id: string;
  @ApiProperty({ enum: QuestionGenerationBatchStatus })
  status: QuestionGenerationBatchStatus;
  @ApiProperty() status_url: string;
}

/** Safe polling projection of an owned batch. */
export class GenerationBatchResponseDto {
  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'Source version metadata: file_name, version, document_id; never storage keys',
  })
  sourceVersion: object | null;
  @ApiProperty({ enum: ['text', 'document'] }) source_mode: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  source_version_id: string | null;
  @ApiProperty({ type: String, nullable: true }) preparation_stage:
    | string
    | null;
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) topic_id: string;
  @ApiProperty({ format: 'uuid', nullable: true }) chapter_id: string | null;
  @ApiProperty({ type: String, nullable: true }) plan_id: string | null;
  @ApiProperty({ type: Object, nullable: true }) plan_snapshot: object | null;
  @ApiProperty({ enum: QuestionGenerationBatchStatus })
  status: QuestionGenerationBatchStatus;
  @ApiProperty({
    enum: GENERATION_QUESTION_TYPES,
    deprecated: true,
    description: 'First question_configs row',
  })
  question_type: QuestionType;
  @ApiProperty({
    enum: QuestionFormat,
    deprecated: true,
    description: 'First question_configs row',
  })
  question_format: QuestionFormat;
  @ApiProperty({ type: [QuestionConfigDto] })
  question_configs: QuestionConfigDto[];
  @ApiProperty({ description: 'Total of question_configs counts' })
  requested_count: number;
  @ApiProperty() total_items: number;
  @ApiProperty({ type: String, nullable: true }) error_code: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) created_at: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  started_at: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  finished_at: Date | null;
}

class GeneratedOptionDto {
  @ApiProperty() text: string;
  @ApiProperty() isCorrect: boolean;
}

export class GeneratedQuestionDto {
  @ApiProperty() question_text: string;
  @ApiProperty({ type: [GeneratedOptionDto], minItems: 4, maxItems: 4 })
  options: GeneratedOptionDto[];
  @ApiProperty({
    enum: GENERATION_QUESTION_TYPES,
    description:
      'SINGLE_CHOICE has exactly one correct option; MULTIPLE_CHOICE has two or three',
  })
  question_type: QuestionType;
  @ApiProperty({ enum: QuestionFormat }) question_format: QuestionFormat;
  @ApiProperty({ type: String, nullable: true, example: null })
  correct_answer: null;
}

export class GenerationItemResponseDto {
  @ApiProperty({ type: String, nullable: true }) plan_item_id: string | null;
  @ApiProperty({ type: String, nullable: true }) target_chapter_id:
    | string
    | null;
  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'rag-generation.v1 provenance: profile_id, UNASSESSED quality, citations with exact source chunks and quotes; retained after edits',
  })
  provenance: object | null;
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() source_index: number;
  @ApiProperty() revision: number;
  @ApiProperty({ enum: QuestionGenerationItemStatus })
  status: QuestionGenerationItemStatus;
  @ApiProperty({ type: GeneratedQuestionDto }) data: GeneratedQuestionDto;
  @ApiProperty({ type: [String] }) errors: string[];
  @ApiProperty({ type: [String] }) warnings: string[];
  @ApiProperty({ type: String, nullable: true }) reviewed_by: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewed_at: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  committed_at: Date | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) question_id:
    | string
    | null;
}

export class GenerationBatchesResponseDto {
  @ApiProperty({ type: [GenerationBatchResponseDto] })
  data: GenerationBatchResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

/** Stable source-order pagination of staging items. */
export class GenerationItemsResponseDto {
  @ApiProperty({ type: [GenerationItemResponseDto] })
  data: GenerationItemResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
