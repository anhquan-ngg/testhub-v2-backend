import { ApiProperty } from '@nestjs/swagger';

export class BucketItemDto {
  @ApiProperty({ description: 'Tên của object' })
  name?: string;

  @ApiProperty({ description: 'Kích thước của object (bytes)' })
  size?: number;

  @ApiProperty({ description: 'ETag của object' })
  etag?: string;

  @ApiProperty({ description: 'Prefix của object (nếu là thư mục)' })
  prefix?: string;

  @ApiProperty({ description: 'Thời gian chỉnh sửa cuối cùng' })
  lastModified?: Date;
}

export class UrlDto {
  @ApiProperty({
    description: 'URL presigned để upload/download',
    example:
      'https://minio-server.example.com/bucket-name/object-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...',
  })
  url: string;
}

export class CheckFileResponseDto {
  @ApiProperty({
    description: 'File đã tồn tại hay chưa',
    example: true,
  })
  exists: boolean;

  @ApiProperty({
    description: 'URL để upload file (nếu file chưa tồn tại)',
    example:
      'https://minio-server.example.com/bucket-name/object-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...',
    required: false,
  })
  uploadUrl?: string;
}
