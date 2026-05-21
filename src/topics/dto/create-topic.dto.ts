import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateTopicDto {
  @ApiProperty({ example: 'Data Structures and Algorithms' })
  @IsString()
  @MinLength(1)
  name: string;
}
