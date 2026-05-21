import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileStatus, FileType } from '@prisma/client';

export class FileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  s3_key: string;

  @ApiProperty({ enum: FileType })
  type: FileType;

  @ApiPropertyOptional()
  size?: number;

  @ApiPropertyOptional()
  entity_type?: string;

  @ApiPropertyOptional()
  entity_id?: string;

  @ApiProperty()
  uploaded_by: string;

  @ApiProperty()
  uploaded_at: Date;

  @ApiProperty({ enum: FileStatus })
  status: FileStatus;
}

export class CreateFileUploadResponseDto {
  @ApiProperty({ type: FileResponseDto })
  file: FileResponseDto;

  @ApiProperty()
  uploadUrl: string;
}

export class FileUrlResponseDto {
  @ApiProperty()
  url: string;
}
