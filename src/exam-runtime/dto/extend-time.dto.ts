import { IsInt, Max, Min } from 'class-validator';
import {
  EXTEND_TIME_MAX_MINUTES,
  EXTEND_TIME_MIN_MINUTES,
} from '../exam-runtime.constants';

export class ExtendTimeDto {
  @IsInt()
  @Min(EXTEND_TIME_MIN_MINUTES)
  @Max(EXTEND_TIME_MAX_MINUTES)
  extraMinutes: number;
}
