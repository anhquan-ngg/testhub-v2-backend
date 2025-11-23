import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { MinioService } from './minio.service';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ListObjectDto, uploadURLDto, CheckFileDto } from './dto/req.dto';
import { BucketItemDto, UrlDto, CheckFileResponseDto } from './dto/res.dto';

@Controller('minio')
export class MinioController {
  constructor(private readonly minioService: MinioService) {}

  @Post('/create-upload-url')
  @ApiOperation({ summary: 'Tạo URL upload tạm thời cho MinIO' })
  @ApiBody({ type: uploadURLDto })
  @ApiResponse({
    status: 201,
    description: 'URL upload được tạo thành công',
    type: UrlDto,
  })
  createUploadUrl(@Body() uploadURLDto: uploadURLDto): Promise<UrlDto> {
    return this.minioService.createUploadUrl(uploadURLDto.path);
  }

  @Post('/check-file')
  @ApiOperation({
    summary: 'Kiểm tra file có tồn tại trên MinIO',
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
    return this.minioService.checkFileAndGetUploadUrl(checkFileDto.filePath);
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
  findAll(@Query() listObjectDto: ListObjectDto): Promise<BucketItemDto[]> {
    return this.minioService.findAll(listObjectDto);
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
    return this.minioService.createDownloadUrl(objectName);
  }

  @Delete('/remove')
  @ApiOperation({ summary: 'Xóa object khỏi bucket' })
  async remove(@Query('objectName') objectName: string) {
    await this.minioService.remove(objectName);
    return {
      message: 'Object removed successfully',
      objectName,
    };
  }
}
