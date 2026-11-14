import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CommitQuestionImportDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  item_ids?: string[];

  @ApiPropertyOptional({ enum: ['SKIP', 'CREATE'], default: 'SKIP' })
  @IsOptional()
  @IsIn(['SKIP', 'CREATE'])
  duplicate_policy: 'SKIP' | 'CREATE' = 'SKIP';
}
