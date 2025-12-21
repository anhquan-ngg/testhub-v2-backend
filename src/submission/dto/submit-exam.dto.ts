import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SubmitExamDto {
  @IsNotEmpty()
  @IsString()
  submission_id: string;

  @IsNotEmpty()
  @IsDate()
  start_time: Date;

  @IsNotEmpty()
  @IsString()
  end_time: string;

  @IsNotEmpty()
  @IsNumber()
  question_length: number;
}
