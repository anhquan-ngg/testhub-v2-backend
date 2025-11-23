import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Benjamin White' })
  @IsNotEmpty({ message: 'Fullname should not be empty' })
  @IsString()
  full_name: string;

  @ApiProperty({ example: 'ben@example.com' })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Email must be an email' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsNotEmpty({ message: 'Password should not be empty ' })
  @IsString()
  password: string;
}
