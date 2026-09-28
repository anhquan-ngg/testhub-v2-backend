import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';
import {
  PRINT_VARIANT_COUNTS,
  type PrintVariantCount,
} from '../exam-print.types';

export class PrintExamDto {
  @ApiProperty({
    enum: PRINT_VARIANT_COUNTS,
    example: 4,
    description: 'Number of exam variants ("mã đề") to generate',
  })
  @Type(() => Number)
  @IsIn([...PRINT_VARIANT_COUNTS], {
    message: `variant_count must be one of ${PRINT_VARIANT_COUNTS.join(', ')}`,
  })
  variant_count: PrintVariantCount;
}
