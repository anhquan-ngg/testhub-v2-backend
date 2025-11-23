import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class uploadURLDto {
  @ApiProperty({
    description: 'Đường dẫn (path) của file cần tạo URL upload',
    example: 'disasters/123e4567-e89b-12d3-a456-426614174000/image.jpg',
  })
  @IsString()
  path: string;
}

export class ListObjectDto {
  @ApiProperty({
    description: 'Đường dẫn thư mục (prefix)',
    required: false,
    example: 'disasters/123e4567-e89b-12d3-a456-426614174000/',
  })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiProperty({
    description: 'Bắt đầu sau object nào',
    required: false,
    example: 'disasters/123e4567-e89b-12d3-a456-426614174000/image.jpg',
  })
  @IsString()
  @IsOptional()
  startAfter?: string;

  @ApiProperty({
    description: 'Số lượng tối đa object trả về',
    default: 100,
    example: 50,
  })
  @IsNumber()
  @Type(() => Number)
  limit: number;
}

export class CheckFileDto {
  @ApiProperty({
    description: 'Đường dẫn (path) của file cần kiểm tra',
    example: 'disasters/123e4567-e89b-12d3-a456-426614174000/image.jpg',
  })
  @IsString()
  filePath: string;
}
