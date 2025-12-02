import { IsNotEmpty, IsString } from 'class-validator';

export class StartExamDto {
  @IsNotEmpty()
  @IsString()
  examId: string;

  @IsNotEmpty()
  @IsString()
  studentId: string;
}
