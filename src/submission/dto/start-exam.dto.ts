import { IsNotEmpty, IsUUID } from 'class-validator';

export class StartExamDto {
  @IsNotEmpty()
  @IsUUID()
  examId: string;

  @IsNotEmpty()
  @IsUUID()
  studentId: string;
}
