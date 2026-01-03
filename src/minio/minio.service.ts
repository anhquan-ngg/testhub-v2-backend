import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import { UrlDto } from './dto/res.dto';
import { ListObjectDto } from './dto/req.dto';
import { BucketItem } from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly minioClient: Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const s3Endpoint = this.configService.get('S3_ENDPOINT');
    const s3Region = this.configService.get('S3_REGION');
    const s3AccessKey = this.configService.get('S3_ACCESS_KEY');
    const s3SecretKey = this.configService.get('S3_SECRET_KEY');

    if (s3Endpoint && s3AccessKey && s3SecretKey) {
      // Configure for AWS S3 or S3-compatible service
      this.minioClient = new Client({
        endPoint: s3Endpoint,
        region: s3Region,
        useSSL: true,
        accessKey: s3AccessKey,
        secretKey: s3SecretKey,
      });
    } else {
      // Configure for Local MinIO
      this.minioClient = new Client({
        endPoint: this.configService.get('MINIO_ENDPOINT') || 'localhost',
        port: parseInt(this.configService.get('MINIO_PORT') || '9000', 10),
        useSSL: false,
        accessKey: this.configService.get('MINIO_ROOT_USER'),
        secretKey: this.configService.get('MINIO_ROOT_PASSWORD'),
      });
    }

    this.bucketName =
      this.configService.get('S3_BUCKET_NAME') ||
      this.configService.getOrThrow('MINIO_BUCKET_NAME');
  }

  async onModuleInit() {
    const isLocal = !this.configService.get('S3_ENDPOINT');

    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists && isLocal) {
        // Only attempt to create bucket and set policy automatically on local MinIO
        await this.minioClient.makeBucket(this.bucketName);
        await this.minioClient.setBucketPolicy(
          this.bucketName,
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  AWS: ['*'],
                },
                Action: ['s3:ListBucket'],
                Resource: [`arn:aws:s3:::${this.bucketName}`],
                Condition: {
                  StringEquals: {
                    's3:prefix': ['media', 'public'],
                  },
                },
              },
              {
                Effect: 'Allow',
                Principal: {
                  AWS: ['*'],
                },
                Action: ['s3:GetObject'],
                Resource: [
                  `arn:aws:s3:::${this.bucketName}/media*`,
                  `arn:aws:s3:::${this.bucketName}/public*`,
                ],
              },
            ],
          }),
        );
      }
    } catch (error) {
      console.warn(
        `MinioService: Could not verify/create bucket "${this.bucketName}". This is expected in production if permissions are restricted.`,
        error.message,
      );
    }
  }

  async createUploadUrl(filePath: string): Promise<UrlDto> {
    const url = await this.minioClient.presignedPutObject(
      this.bucketName,
      filePath,
      3600,
    );

    return { url };
  }

  async findAll({ path, limit, startAfter }: ListObjectDto) {
    console.log('=== MinIO Service findAll ===');
    console.log('Input params:', { path, limit, startAfter });
    console.log('Bucket name:', this.bucketName);

    const result = await this.listObjectsWithLimit(
      this.bucketName,
      path,
      limit,
      startAfter,
    );

    console.log('Result from listObjectsWithLimit:', result);
    console.log('Result length:', result?.length);
    console.log('============================');

    return result;
  }

  async createDownloadUrl(objectName: string): Promise<UrlDto> {
    const url = await this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      3600,
    );
    return { url };
  }

  async getViewUrl(objectName: string): Promise<UrlDto> {
    const url = await this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      24 * 60 * 60, // 1 day
      {
        'response-content-disposition': 'inline',
      },
    );
    return { url };
  }

  async remove(objectName: string) {
    this.minioClient.removeObject(this.bucketName, objectName);
  }

  async checkExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      if (error.code === 'NoSuchKey') return false;
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

  private listObjectsWithLimit(
    bucketName: string,
    prefix = '',
    limit = 10,
    startAfter: string | undefined,
    recursive = false,
  ) {
    console.log('=== listObjectsWithLimit ===');
    console.log('Parameters:', {
      bucketName,
      prefix,
      limit,
      startAfter,
      recursive,
    });

    const stream = this.minioClient.listObjectsV2(
      bucketName,
      prefix,
      recursive,
      startAfter,
    );
    let count = 0;

    return new Promise<BucketItem[]>((resolve, reject) => {
      const results: BucketItem[] = [];

      stream.on('data', (obj) => {
        console.log('Stream data received:', obj);
        if (count < limit) {
          results.push(obj);
          count += 1;
        } else {
          stream.destroy();
        }
      });

      stream.on('end', () => {
        console.log('Stream ended. Final results:', results);
        console.log('Total items found:', results.length);
        resolve(results);
      });

      stream.on('error', (err) => {
        console.error('Stream error:', err);
        reject(err);
      });
    });
  }
}
