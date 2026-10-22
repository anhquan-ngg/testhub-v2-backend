import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { S3Service } from './s3.service';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ListObjectDto, uploadURLDto, CheckFileDto } from './dto/req.dto';
import { BucketItemDto, UrlDto, CheckFileResponseDto } from './dto/res.dto';
import { posix } from 'node:path';

@ApiTags('S3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  private assertLegacyObject(path: string): void {
    // Learning document objects are reachable only through owner-scoped APIs.
    // SDK callers use exact S3 keys; decoding defensively also rejects encoded aliases.
    let decoded = path ?? '';
    for (let i = 0; i < 3; i++) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        break;
      }
    }
    const canonical = posix
      .normalize('/' + decoded.replaceAll('\\', '/'))
      .slice(1);
    if (
      canonical === 'learning-documents' ||
      canonical.startsWith('learning-documents/')
    )
      throw new ForbiddenException('Use the learning document API');
  }

  @Post('/create-upload-url')
  @ApiOperation({ summary: 'Tạo URL upload tạm thời cho S3' })
  @ApiBody({ type: uploadURLDto })
  @ApiResponse({
    status: 201,
    description: 'URL upload được tạo thành công',
    type: UrlDto,
  })
  createUploadUrl(@Body() uploadURLDto: uploadURLDto): Promise<UrlDto> {
    this.assertLegacyObject(uploadURLDto.path);
    return this.s3Service.createUploadUrl(uploadURLDto.path);
  }

  @Post('/check-file')
  @ApiOperation({
    summary: 'Kiểm tra file có tồn tại trên S3',
    description:
      'Kiểm tra xem file có tồn tại hay chưa. Nếu chưa tồn tại, trả về URL để upload',
  })
  @ApiBody({ type: CheckFileDto })
  @ApiResponse({
    status: 201,
    description: 'Kết quả kiểm tra file',
    type: CheckFileResponseDto,
  })
  checkFile(@Body() checkFileDto: CheckFileDto): Promise<CheckFileResponseDto> {
    this.assertLegacyObject(checkFileDto.filePath);
    return this.s3Service.checkFileAndGetUploadUrl(checkFileDto.filePath);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách object trong bucket' })
  @ApiQuery({
    name: 'path',
    required: false,
    type: String,
    description: 'Đường dẫn thư mục (prefix)',
  })
  @ApiQuery({
    name: 'startAfter',
    required: false,
    type: String,
    description: 'Bắt đầu sau object nào',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng tối đa object trả về',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách object',
    type: [BucketItemDto],
  })
  async findAll(
    @Query() listObjectDto: ListObjectDto,
  ): Promise<BucketItemDto[]> {
    this.assertLegacyObject(listObjectDto.path ?? '');
    const objects = (await this.s3Service.findAll(
      listObjectDto,
    )) as BucketItemDto[];
    return objects.filter(
      (object) => !(object.name ?? '').startsWith('learning-documents/'),
    );
  }

  @Get('/create-download-url')
  @ApiOperation({ summary: 'Tạo URL download tạm thời cho object' })
  @ApiQuery({
    name: 'objectName',
    required: true,
    type: String,
    description: 'Tên object cần lấy URL download',
  })
  @ApiResponse({
    status: 200,
    description: 'URL download được tạo thành công',
    type: UrlDto,
  })
  presignedGetObject(@Query('objectName') objectName: string): Promise<UrlDto> {
    this.assertLegacyObject(objectName);
    return this.s3Service.createDownloadUrl(objectName);
  }

  @Get('/view-file')
  @ApiOperation({ summary: 'Lấy URL để xem file (inline)' })
  @ApiQuery({
    name: 'objectName',
    required: true,
    type: String,
    description: 'Tên object cần xem',
  })
  @ApiResponse({
    status: 200,
    description: 'URL xem file được tạo thành công (hết hạn sau 1 ngày)',
    type: UrlDto,
  })
  viewFile(@Query('objectName') objectName: string): Promise<UrlDto> {
    this.assertLegacyObject(objectName);
    return this.s3Service.getViewUrl(objectName);
  }

  @Delete('/remove')
  @ApiOperation({ summary: 'Xóa object khỏi bucket' })
  async remove(@Query('objectName') objectName: string) {
    this.assertLegacyObject(objectName);
    await this.s3Service.remove(objectName);
    return {
      message: 'Object removed successfully',
      objectName,
    };
  }
}
