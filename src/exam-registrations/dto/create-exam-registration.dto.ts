import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateExamRegistrationDto {
  @ApiProperty({ example: 'uuid-of-exam' })
  @IsUUID()
  exam_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-student' })
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsOptional()
  @IsEmail()
  student_email?: string;

  @ApiPropertyOptional({ enum: RegistrationStatus })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;
}
