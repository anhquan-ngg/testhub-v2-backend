import { IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  code?: string;
}
