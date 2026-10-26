import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuestionConfigDto } from './create-generation-batch.dto';

export class PlanSourceUnitDto {
  @ApiProperty({ enum: ['PAGE', 'SLIDE', 'NOTES'] })
  @IsIn(['PAGE', 'SLIDE', 'NOTES'])
  kind: string;
  @ApiProperty({ minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  position: number;
}
export class PlanNodeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() id: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parent_id: string | null;
  @ApiProperty({ maxLength: 200 }) @IsString() @MaxLength(200) name: string;
  @ApiProperty({ type: [PlanSourceUnitDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => PlanSourceUnitDto)
  source_units: PlanSourceUnitDto[];
}
export class MatrixRowDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() id: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() node_id: string;
  @ApiProperty({ maxLength: 400 })
  @IsString()
  @MaxLength(400)
  objective: string;
  @ApiProperty({ enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'] })
  @IsIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE'])
  question_type: string;
  @ApiProperty({ type: [PlanSourceUnitDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => PlanSourceUnitDto)
  source_units: PlanSourceUnitDto[];
  @ApiProperty({
    type: Object,
    example: { KNOWLEDGE: 1, UNDERSTANDING: 1, APPLYING: 0, ADVANCED: 0 },
    description:
      'Strict four integer counts, 0..20; total matrix <=20. Validated by the shared Zod contract.',
  })
  @IsObject()
  counts: Record<string, number>;
}
export class PlanMatrixDto {
  @ApiProperty({ type: [PlanNodeDto], maxItems: 1000 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => PlanNodeDto)
  nodes: PlanNodeDto[];
  @ApiProperty({ type: [MatrixRowDto], maxItems: 20 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MatrixRowDto)
  rows: MatrixRowDto[];
}
export class PlanRevisionDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) revision: number;
}
export class EditKnowledgePlanDto extends PlanRevisionDto {
  @ApiProperty({ type: PlanMatrixDto })
  @ValidateNested()
  @Type(() => PlanMatrixDto)
  matrix: PlanMatrixDto;
}
export class CreateKnowledgePlanDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() topic_id: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() version_id: string;
  @ApiProperty({ type: [QuestionConfigDto], maxItems: 20 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuestionConfigDto)
  question_configs: QuestionConfigDto[];
  @ApiProperty({ enum: [true] })
  @Equals(true)
  external_processing_consent: boolean;
}
