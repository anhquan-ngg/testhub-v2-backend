import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class SubmitExamDto {
  @IsNotEmpty()
  @IsUUID()
  submission_id: string;

  @IsNotEmpty()
  @IsDateString()
  start_time: string;

  @IsNotEmpty()
  @IsDateString()
  end_time: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  question_length: number;
}
