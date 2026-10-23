import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  CopyObjectCommand,
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
import { Readable } from 'node:stream';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly storageEndpoint: URL;

  constructor(private readonly configService: ConfigService) {
    const s3Region =
      this.configService.get<string>('AWS_REGION') || 'ap-southeast-1';
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
    // Resolve with the same SDK rules as presigning (including dotted buckets).
    this.storageEndpoint = this.s3Client.config.endpointProvider({
      Bucket: this.bucketName,
      Region: s3Region,
      UseFIPS: false,
      UseDualStack: false,
      ForcePathStyle: false,
    }).url;
  }

  async onModuleInit() {
    // Bucket is predefined and already exists in AWS as per user's choice.
  }

  async createUploadUrl(
    filePath: string,
    contentType?: string,
  ): Promise<UrlDto> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      ...(contentType ? { ContentType: contentType } : {}),
    });
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return { url };
  }

  async getObjectBuffer(
    objectName: string,
    maxBytes?: number,
  ): Promise<Buffer> {
    if (maxBytes !== undefined) {
      const head = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: objectName }),
      );
      if (
        typeof head.ContentLength === 'number' &&
        head.ContentLength > maxBytes
      ) {
        throw new Error(
          `S3 object "${objectName}" exceeds the allowed size limit`,
        );
      }
    }
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: objectName }),
    );
    if (!response.Body) {
      throw new Error(`S3 object "${objectName}" has no body`);
    }
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async putObject(objectName: string, body: Buffer, contentType: string) {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /** Bound document writes so expired executions cannot occupy worker slots indefinitely. */
  async putBoundedObject(
    objectName: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectName,
          Body: body,
          ContentType: contentType,
        }),
        { abortSignal: controller.signal },
      );
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }

  /** Bound actual streamed bytes and total download time, independent of HEAD metadata. */
  async getBoundedObject(
    objectName: string,
    maxBytes: number,
  ): Promise<Buffer> {
    const controller = new AbortController();
    let body: Readable | undefined;
    const timer = setTimeout(() => {
      controller.abort();
      body?.destroy(new Error('Storage download deadline exceeded'));
    }, 30_000);
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({ Bucket: this.bucketName, Key: objectName }),
        { abortSignal: controller.signal },
      );
      body = response.Body as Readable | undefined;
      if (!body || (response.ContentLength ?? 0) > maxBytes)
        throw new Error('Storage object missing or exceeds limit');
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of body) {
        const bytes = Buffer.from(chunk as Uint8Array);
        size += bytes.length;
        if (size > maxBytes) throw new Error('Storage object exceeds limit');
        chunks.push(bytes);
      }
      if (controller.signal.aborted)
        throw new Error('Storage download deadline exceeded');
      return Buffer.concat(chunks);
    } finally {
      clearTimeout(timer);
      body?.destroy();
      controller.abort();
    }
  }

  async copyObject(sourceName: string, destinationName: string) {
    const copySource = `${this.bucketName}/${sourceName}`
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: destinationName,
        CopySource: copySource,
      }),
    );
  }

  /** Hostname of the bucket, as used by storage URLs and presigned URLs. */
  getStorageHost(): string {
    return this.storageEndpoint.hostname;
  }

  createStorageUrl(objectName: string): string {
    const encodedObjectName = objectName
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    return `${this.storageEndpoint.href.replace(/\/$/, '')}/${encodedObjectName}`;
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
