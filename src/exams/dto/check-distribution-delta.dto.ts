import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamMode } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CheckDistributionDeltaDto {
  @ApiProperty({ example: 'uuid-of-topic' })
  @IsUUID()
  topic_id: string;

  @ApiProperty({ enum: ExamMode })
  @IsEnum(ExamMode)
  mode: ExamMode;

  @ApiProperty({
    description: 'JSON distribution, same contract as exam create.',
  })
  @IsString()
  distribution: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 2, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  distribution_delta?: number;
}
