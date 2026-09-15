import { ExamViolationType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { CLIENT_REPORTABLE_VIOLATION_TYPES } from '../exam-runtime.constants';

export class ReportViolationDto {
  @IsEnum(ExamViolationType)
  @IsIn(CLIENT_REPORTABLE_VIOLATION_TYPES)
  type: ExamViolationType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6 * 60 * 60 * 1000)
  durationMs?: number;

  @IsOptional()
  @IsISO8601()
  clientTime?: string;
}
