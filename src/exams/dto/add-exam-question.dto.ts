import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddExamQuestionDto {
  @ApiProperty({ example: 'uuid-of-question' })
  @IsUUID()
  question_id: string;
}
