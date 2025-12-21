import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitQuestionDto {
  @IsNotEmpty()
  @IsString()
  submission_id: string;

  @IsNotEmpty()
  @IsString()
  question_id: string;

  @IsOptional()
  @IsString()
  options?: string;

  @IsOptional()
  @IsString()
  answer?: string;
}
