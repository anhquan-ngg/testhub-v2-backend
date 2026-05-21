import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
  _Object,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UrlDto } from './dto/res.dto';
import { ListObjectDto } from './dto/req.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const s3Region = this.configService.get('AWS_REGION') || 'ap-southeast-1';
    const s3AccessKey = this.configService.get('AWS_ACCESS_KEY_ID');
    const s3SecretKey = this.configService.get('AWS_SECRET_ACCESS_KEY');

    this.s3Client = new S3Client({
      region: s3Region,
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
    });

    this.bucketName = this.configService.getOrThrow('AWS_S3_BUCKET_NAME');
  }

  async onModuleInit() {
    // Bucket is predefined and already exists in AWS as per user's choice.
  }

  async createUploadUrl(filePath: string): Promise<UrlDto> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return { url };
  }

  createStorageUrl(objectName: string): string {
    const encodedObjectName = objectName
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    return `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION') || 'ap-southeast-1'}.amazonaws.com/${encodedObjectName}`;
  }

  async findAll({ path, limit, startAfter }: ListObjectDto) {
    console.log('=== S3 Service findAll ===');
    console.log('Input params:', { path, limit, startAfter });
    console.log('Bucket name:', this.bucketName);

    const result = await this.listObjectsWithLimit(
      this.bucketName,
      path,
      limit,
      startAfter,
    );

    console.log('Result length:', result?.length);
    console.log('============================');

    return result;
  }

  async createDownloadUrl(objectName: string): Promise<UrlDto> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectName,
    });
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return { url };
  }

  async getViewUrl(objectName: string): Promise<UrlDto> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectName,
      ResponseContentDisposition: 'inline',
    });
    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 24 * 60 * 60, // 1 day
    });
    return { url };
  }

  async remove(objectName: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
      });
      await this.s3Client.send(command);
    } catch (error: any) {
      console.warn(
        `S3Service: Could not remove object "${objectName}":`,
        error.message,
      );
    }
  }

  async checkExists(objectName: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkFileAndGetUploadUrl(filePath: string) {
    const exists = await this.checkExists(filePath);

    if (exists) {
      return {
        exists: true,
      };
    }

    const uploadUrl = await this.createUploadUrl(filePath);
    return {
      exists: false,
      uploadUrl: uploadUrl.url,
    };
  }

  private async listObjectsWithLimit(
    bucketName: string,
    prefix = '',
    limit = 10,
    startAfter?: string,
  ) {
    console.log('=== listObjectsWithLimit ===');
    console.log('Parameters:', {
      bucketName,
      prefix,
      limit,
      startAfter,
    });

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: limit,
      StartAfter: startAfter,
    });

    const results: any[] = [];
    try {
      const response = await this.s3Client.send(command);
      if (response.Contents) {
        response.Contents.forEach((obj: _Object) => {
          results.push({
            name: obj.Key,
            size: obj.Size,
            etag: obj.ETag,
            lastModified: obj.LastModified,
          });
        });
      }
    } catch (err) {
      console.error('S3 list objects error:', err);
      throw err;
    }

    return results;
  }
}
