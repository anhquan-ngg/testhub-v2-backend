import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ListObjectDto, uploadURLDto, CheckFileDto } from './dto/req.dto';
import { BucketItemDto, UrlDto, CheckFileResponseDto } from './dto/res.dto';

@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post('/create-upload-url')
  @ApiOperation({ summary: 'Tạo URL upload tạm thời cho S3' })
  @ApiBody({ type: uploadURLDto })
  @ApiResponse({
    status: 201,
    description: 'URL upload được tạo thành công',
    type: UrlDto,
  })
  createUploadUrl(@Body() uploadURLDto: uploadURLDto): Promise<UrlDto> {
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
  findAll(@Query() listObjectDto: ListObjectDto): Promise<BucketItemDto[]> {
    return this.s3Service.findAll(listObjectDto);
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
    return this.s3Service.getViewUrl(objectName);
  }

  @Delete('/remove')
  @ApiOperation({ summary: 'Xóa object khỏi bucket' })
  async remove(@Query('objectName') objectName: string) {
    await this.s3Service.remove(objectName);
    return {
      message: 'Object removed successfully',
      objectName,
    };
  }
}
