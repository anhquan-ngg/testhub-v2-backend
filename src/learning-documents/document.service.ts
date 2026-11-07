import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { S3Service } from '../s3/s3.service';
import { DocumentRepository } from './document.repository';
import { DocumentClient } from './document-client.service';
import {
  checkDuplicateSchema,
  createDocumentSchema,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_RESULT_MAX_BYTES,
  documentQuota,
  extractionSchema,
  ListDocumentsQuery,
  renameDocumentSchema,
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
    await this.requireQuota(ownerId, value.upload.size, true);
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
    await this.requireQuota(ownerId, parsed.data.size, false);
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
    const reused = await this.reuseExtraction(
      ownerId,
      documentId,
      version,
      key,
      hash,
    );
    if (reused) return reused;
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

  /**
   * Skip parsing/OCR when the same owner already extracted identical bytes with
   * the same options. The artifact is re-verified and copied to this version's own
   * key, so unique keys and per-version purge stay safe. Any problem returns null
   * and the normal queue path runs.
   */
  private async reuseExtraction(
    ownerId: string,
    documentId: string,
    version: {
      id: string;
      source_type: 'PDF' | 'PPTX';
      include_notes: boolean;
    },
    sourceKey: string,
    hash: string,
  ) {
    let artifactKey: string | null = null;
    try {
      const donor = await this.repository.reusable(
        ownerId,
        hash,
        version.source_type,
        version.include_notes,
        version.id,
      );
      if (
        !donor?.artifact_key ||
        !donor.artifact_sha256 ||
        !donor.parser_version
      )
        return null;
      const bytes = await this.storage.getBoundedObject(
        donor.artifact_key,
        DOCUMENT_RESULT_MAX_BYTES,
      );
      if (
        createHash('sha256').update(bytes).digest('hex') !==
        donor.artifact_sha256
      )
        return null;
      const parsed = extractionSchema.safeParse(
        JSON.parse(bytes.toString('utf8')),
      );
      if (
        !parsed.success ||
        parsed.data.source_sha256 !== hash ||
        parsed.data.parser_version !== donor.parser_version
      )
        return null;
      artifactKey = `learning-documents/${documentId}/${version.id}/extraction/reused-${randomUUID()}.json`;
      await this.storage.putBoundedObject(
        artifactKey,
        bytes,
        'application/json',
      );
      const changed = await this.repository.completeReused(
        ownerId,
        version.id,
        {
          source_key: sourceKey,
          source_sha256: hash,
          artifact_key: artifactKey,
          artifact_sha256: donor.artifact_sha256,
          parser_version: donor.parser_version,
          unit_count: donor.unit_count,
          warnings: donor.warnings as Prisma.InputJsonValue | null,
          status: donor.status === 'OCR_REQUIRED' ? 'OCR_REQUIRED' : 'EXTRACTED',
        },
      );
      if (!changed.count) {
        await this.storage.remove(artifactKey);
        return null;
      }
      return {
        document_id: documentId,
        version_id: version.id,
        status: donor.status === 'OCR_REQUIRED' ? 'OCR_REQUIRED' : 'EXTRACTED',
        reused_extraction: true,
      };
    } catch {
      if (artifactKey) await this.storage.remove(artifactKey);
      return null;
    }
  }

  /** Owner-scoped exact-bytes lookup so the UI can offer reuse before uploading. */
  async checkDuplicate(ownerId: string, input: unknown) {
    const parsed = checkDuplicateSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid file hash');
    const rows = await this.repository.duplicates(
      ownerId,
      parsed.data.sha256,
      parsed.data.source_type,
    );
    return {
      data: rows.map((row) => ({
        document_id: row.document.id,
        title: row.document.title,
        topic_id: row.document.topic_id,
        chapter_id: row.document.chapter_id,
        archived_at: row.document.archived_at,
        version_id: row.id,
        version: row.version,
        file_name: row.file_name,
        status: row.status,
        include_notes: row.include_notes,
        created_at: row.created_at,
      })),
    };
  }

  /** List metadata without disclosing storage keys or extraction bodies. */
  list(
    ownerId: string,
    page: number,
    limit: number,
    topicId?: string,
    filter: ListDocumentsQuery = { archived: 'false' },
  ) {
    this.pagination(page, limit);
    return this.repository.list(ownerId, page, limit, topicId, filter);
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

  /** Revoke future access/processing; stored bytes stay until the document is purged. */
  async revoke(ownerId: string, id: string): Promise<void> {
    if (!(await this.repository.revoke(ownerId, id)).count)
      throw new NotFoundException('Document unavailable');
  }

  /** Change the display title only; immutable versions are untouched. */
  async rename(ownerId: string, id: string, input: unknown) {
    const parsed = renameDocumentSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid title');
    if (!(await this.repository.rename(ownerId, id, parsed.data.title)).count)
      throw new NotFoundException('Document unavailable');
    return this.detail(ownerId, id);
  }

  /** Reversible hide that blocks new generation without touching indexes. */
  async archive(ownerId: string, id: string) {
    const current = await this.detail(ownerId, id);
    if (!current.archived_at) await this.repository.archive(ownerId, id);
    return this.detail(ownerId, id);
  }

  /** Restore an archived document; a no-op when it is already active. */
  async unarchive(ownerId: string, id: string) {
    const current = await this.detail(ownerId, id);
    if (current.archived_at) await this.repository.unarchive(ownerId, id);
    return this.detail(ownerId, id);
  }

  /**
   * Irreversibly delete stored bytes. Requires the document to be archived or
   * revoked and free of active plans/batches. Idempotent once purged.
   */
  async purge(ownerId: string, id: string): Promise<void> {
    const target = await this.repository.purgeTarget(ownerId, id);
    if (!target) throw new NotFoundException('Document unavailable');
    if (target.purged_at) return;
    if (!target.is_deleted && !target.archived_at)
      throw new ConflictException('Archive or revoke the document before purge');
    if (await this.repository.activeWork(id))
      throw new ConflictException('Document has active generation work');
    const keys = target.versions.flatMap((version) =>
      [version.upload_key, version.source_key, version.artifact_key].filter(
        (key): key is string => !!key,
      ),
    );
    for (const key of keys) await this.storage.remove(key);
    await this.repository.purge(id);
  }

  /** Paginated version history beyond the bounded summary. */
  async versions(ownerId: string, id: string, page: number, limit: number) {
    this.pagination(page, limit);
    await this.detail(ownerId, id);
    return this.repository.versions(ownerId, id, page, limit);
  }

  /** Recent plans and batches that used this document. */
  async history(ownerId: string, id: string, limit: number) {
    this.pagination(1, limit);
    await this.detail(ownerId, id);
    return this.repository.history(ownerId, id, limit);
  }

  /** Current usage against the per-lecturer library limits. */
  async quota(ownerId: string) {
    const limits = documentQuota();
    const used = await this.repository.quota(ownerId);
    return {
      documents: { used: used.documents, limit: limits.maxDocuments },
      bytes: { used: used.bytes, limit: limits.maxBytes },
    };
  }

  private async requireQuota(ownerId: string, size: number, newDocument: boolean) {
    const limits = documentQuota();
    const used = await this.repository.quota(ownerId);
    if (newDocument && used.documents + 1 > limits.maxDocuments)
      throw new ConflictException('Document library limit reached');
    if (used.bytes + size > limits.maxBytes)
      throw new ConflictException('Document storage quota exceeded');
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
