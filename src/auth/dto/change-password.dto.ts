import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Password123!' })
  @IsNotEmpty({ message: 'Password should not be empty ' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsNotEmpty({ message: 'New password should not be empty ' })
  @IsString()
  newPassword: string;
}
