import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateChapterDto {
  @ApiProperty({ example: 'uuid-of-topic' })
  @IsUUID()
  topic_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-parent-chapter', description: 'Parent chapter ID for nested chapters' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({ example: 'Chapter 1: Introduction' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 1, description: 'Display order within parent/topic' })
  @IsInt()
  @Min(0)
  order: number;
}
