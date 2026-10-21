import { ApiProperty } from '@nestjs/swagger';
import {
  Allow,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GeneratedQuestionDto } from './generation-batch-response.dto';

export class EditGenerationItemDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  revision: number;
  @ApiProperty({ type: GeneratedQuestionDto })
  @Allow()
  data: GeneratedQuestionDto;
}
export class ReviewGenerationItemDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  revision: number;
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  decision: string;
}
class CommitGenerationItemRefDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() id: string;
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  revision: number;
}
export class CommitGenerationItemsDto {
  @ApiProperty({
    type: [CommitGenerationItemRefDto],
    minItems: 1,
    maxItems: 20,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CommitGenerationItemRefDto)
  items: CommitGenerationItemRefDto[];
}
class CommittedGenerationQuestionDto {
  @ApiProperty({ format: 'uuid' }) item_id: string;
  @ApiProperty({ format: 'uuid' }) question_id: string;
}
export class CommitGenerationResponseDto {
  @ApiProperty({ format: 'uuid' }) batch_id: string;
  @ApiProperty({ enum: ['REVIEW_REQUIRED', 'COMPLETED'] }) status: string;
  @ApiProperty({ type: [CommittedGenerationQuestionDto] })
  questions: CommittedGenerationQuestionDto[];
}
