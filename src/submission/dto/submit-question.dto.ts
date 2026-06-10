import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitQuestionDto {
  @IsNotEmpty()
  @IsUUID()
  submission_id: string;

  @IsNotEmpty()
  @IsUUID()
  question_id: string;

  @IsOptional()
  @IsString()
  options?: string;

  @IsOptional()
  @IsString()
  answer?: string;
}
