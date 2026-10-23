import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { S3Service } from '../s3/s3.service';
import { DocumentRepository } from './document.repository';
import { DocumentClient } from './document-client.service';
import {
  createDocumentSchema,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_RESULT_MAX_BYTES,
  extractionSchema,
  UploadDocument,
  uploadDocumentSchema,
} from './document.contract';

/** Owner-scoped document intake, immutable versions and paginated extraction preview. */
@Injectable()
export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: S3Service,
    private readonly client: DocumentClient,
  ) {}

  /** Create business metadata and a quarantined presigned upload. */
  async create(ownerId: string, input: unknown) {
    this.requireEnabled();
    const parsed = createDocumentSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid document metadata or consent');
    const value = parsed.data;
    if (
      !(await this.repository.target(ownerId, value.topic_id, value.chapter_id))
    )
      throw new NotFoundException('Target unavailable');
    const id = randomUUID();
    const version = this.newVersion(id, value.upload);
    const signed = await this.storage.createUploadUrl(
      version.upload_key,
      value.upload.mime_type,
    );
    await this.repository.create({
      id,
      ownerId,
      title: value.title,
      topicId: value.topic_id,
      chapterId: value.chapter_id,
      version,
    });
    return {
      document_id: id,
      version_id: version.id,
      upload_url: signed.url,
      upload_expires_at: version.upload_expires_at,
      max_bytes: DOCUMENT_MAX_BYTES,
    };
  }

  /** Append a replacement upload without mutating prior source versions. */
  async addVersion(ownerId: string, id: string, input: unknown) {
    this.requireEnabled();
    const parsed = uploadDocumentSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid document upload or consent');
    await this.detail(ownerId, id);
    const version = this.newVersion(id, parsed.data);
    const signed = await this.storage.createUploadUrl(
      version.upload_key,
      parsed.data.mime_type,
    );
    if (!(await this.repository.addVersion(ownerId, id, version)))
      throw new NotFoundException('Document unavailable');
    return {
      document_id: id,
      version_id: version.id,
      upload_url: signed.url,
      upload_expires_at: version.upload_expires_at,
      max_bytes: DOCUMENT_MAX_BYTES,
    };
  }

  private newVersion(documentId: string, upload: UploadDocument) {
    const id = randomUUID();
    return {
      id,
      version: 1,
      file_name: upload.file_name,
      source_type: upload.source_type,
      mime_type: upload.mime_type,
      declared_size: upload.size,
      include_notes: upload.include_notes,
      consented_at: new Date(),
      upload_key: `learning-documents/${documentId}/${id}/upload`,
      upload_expires_at: new Date(Date.now() + 3600_000),
    };
  }

  /** Validate actual uploaded bytes, freeze the source, then durably queue extraction. */
  async complete(ownerId: string, documentId: string, versionId: string) {
    const version = await this.version(ownerId, documentId, versionId);
    if (version.status !== 'UPLOADING')
      return {
        document_id: documentId,
        version_id: versionId,
        status: version.status,
      };
    this.requireEnabled();
    if (version.upload_expires_at <= new Date())
      throw new ConflictException('Upload expired; create a new version');
    let bytes: Buffer;
    try {
      bytes = await this.storage.getBoundedObject(
        version.upload_key,
        DOCUMENT_MAX_BYTES,
      );
    } catch {
      throw new ConflictException(
        'Upload incomplete, unavailable or too large',
      );
    }
    if (bytes.length !== version.declared_size)
      throw new ConflictException('Upload size does not match');
    if (
      version.source_type === 'PDF'
        ? !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))
        : !bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    )
      throw new BadRequestException(
        'Document bytes do not match the declared type',
      );
    const hash = createHash('sha256').update(bytes).digest('hex');
    const key = `learning-documents/${documentId}/${versionId}/source/${hash}`;
    await this.storage.putBoundedObject(key, bytes, version.mime_type);
    const changed = await this.repository.complete(
      ownerId,
      versionId,
      key,
      hash,
    );
    if (!changed.count) {
      const current = await this.version(ownerId, documentId, versionId);
      if (current.status === 'UPLOADING' || current.source_sha256 !== hash)
        throw new ConflictException('Upload changed or expired');
      return {
        document_id: documentId,
        version_id: versionId,
        status: current.status,
      };
    }
    return {
      document_id: documentId,
      version_id: versionId,
      status: 'QUEUED' as const,
    };
  }

  /** List metadata without disclosing storage keys or extraction bodies. */
  list(ownerId: string, page: number, limit: number, topicId?: string) {
    this.pagination(page, limit);
    return this.repository.list(ownerId, page, limit, topicId);
  }

  /** Return accessible metadata and version history. */
  async detail(ownerId: string, id: string) {
    const result = await this.repository.detail(ownerId, id);
    if (!result) throw new NotFoundException('Document unavailable');
    return result;
  }

  private async version(ownerId: string, id: string, versionId: string) {
    const version = await this.repository.version(ownerId, id, versionId);
    if (!version) throw new NotFoundException('Document version unavailable');
    return version;
  }

  /** Read checked source spans with a final ownership check after object I/O. */
  async content(
    ownerId: string,
    id: string,
    versionId: string,
    page: number,
    limit: number,
  ) {
    this.pagination(page, limit);
    const version = await this.version(ownerId, id, versionId);
    if (
      !version.artifact_key ||
      !['EXTRACTED', 'OCR_REQUIRED'].includes(version.status)
    )
      throw new ConflictException('Extraction is not available');
    const bytes = await this.storage.getBoundedObject(
      version.artifact_key,
      DOCUMENT_RESULT_MAX_BYTES,
    );
    if (
      createHash('sha256').update(bytes).digest('hex') !==
      version.artifact_sha256
    )
      throw new ServiceUnavailableException('Extraction storage unavailable');
    const result = extractionSchema.parse(JSON.parse(bytes.toString('utf8')));
    await this.version(ownerId, id, versionId);
    return {
      document_id: id,
      version_id: versionId,
      status: version.status,
      unit_count: result.unit_count,
      warnings: result.warnings,
      data: result.spans.slice((page - 1) * limit, page * limit),
      total: result.spans.length,
      page,
      limit,
    };
  }

  /** Revoke future access/processing; retain artifacts until a retention policy is configured. */
  async revoke(ownerId: string, id: string): Promise<void> {
    if (!(await this.repository.revoke(ownerId, id)).count)
      throw new NotFoundException('Document unavailable');
  }

  private requireEnabled() {
    if (!this.client.enabled)
      throw new ServiceUnavailableException('Document processing is disabled');
  }
  private pagination(page: number, limit: number) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new BadRequestException('Invalid pagination');
  }
}
