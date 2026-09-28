import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ExamMode,
  FileStatus,
  FileType,
  Prisma,
  QuestionFormat,
  QuestionImportItemStatus,
  QuestionImportSourceType,
  QuestionImportStatus,
  QuestionType,
} from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import * as path from 'node:path';
import sharp from 'sharp';
import { assertOfficeFileSignature } from '../common/utils/office-file-signature.util';
import { ExamsService } from '../exams/exams.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CommitQuestionImportDto } from './dto/commit-question-import.dto';
import { CreateQuestionImportDto } from './dto/create-question-import.dto';
import { QueryQuestionImportItemsDto } from './dto/query-question-import-items.dto';
import { UpdateQuestionImportItemDto } from './dto/update-question-import-item.dto';
import {
  QUESTION_IMPORT_MAX_FILE_SIZE,
  QUESTION_IMPORT_MIME_TYPES,
  QUESTION_IMPORT_TTL_HOURS,
} from './question-import.constants';
import { QuestionImportQueueService } from './question-import-queue.service';
import {
  ImportOption,
  ImportQuestionData,
  ParsedImportQuestion,
} from './question-import.types';
import {
  CHAPTER_PATH_SEPARATOR,
  ChapterTree,
  chapterPathKey,
  parseChapterPath,
} from './chapter-path.resolver';
import { DocxQuestionImportParser } from './parsers/docx-question-import.parser';
import { XlsxQuestionImportParser } from './parsers/xlsx-question-import.parser';

type ValidationResult = {
  data: ImportQuestionData;
  chapterId: string | null;
  errors: string[];
  warnings: string[];
  fingerprint: string | null;
};

@Injectable()
export class QuestionImportService {
  private readonly logger = new Logger(QuestionImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly queue: QuestionImportQueueService,
    private readonly docxParser: DocxQuestionImportParser,
    private readonly xlsxParser: XlsxQuestionImportParser,
    private readonly examsService: ExamsService,
  ) {}

  async create(userId: string, dto: CreateQuestionImportDto) {
    await this.assertScope(
      userId,
      dto.topic_id,
      dto.default_chapter_id,
      dto.exam_id,
    );
    this.assertSource(dto);

    const id = randomUUID();
    const extension =
      dto.source_type === QuestionImportSourceType.DOCX ? 'docx' : 'xlsx';
    const sourceKey = `question-imports/${userId}/${id}/source.${extension}`;
    const expiresAt = new Date(
      Date.now() + QUESTION_IMPORT_TTL_HOURS * 60 * 60 * 1000,
    );
    const questionImport = await this.prisma.questionImport.create({
      data: {
        id,
        created_by: userId,
        topic_id: dto.topic_id,
        default_chapter_id: dto.default_chapter_id,
        exam_id: dto.exam_id,
        source_type: dto.source_type,
        source_name: path.posix.basename(dto.file_name.replace(/\\/g, '/')),
        source_mime_type: dto.mime_type,
        source_size: dto.size,
        source_s3_key: sourceKey,
        expires_at: expiresAt,
      },
    });
    const upload = await this.s3.createUploadUrl(sourceKey, dto.mime_type);
    const { source_s3_key: sourceKeyToOmit, ...safeImport } = questionImport;
    void sourceKeyToOmit;
    return { import: safeImport, upload_url: upload.url };
  }

  async complete(userId: string, importId: string) {
    const questionImport = await this.findOwned(userId, importId);
    if (questionImport.status !== QuestionImportStatus.UPLOADING) {
      throw new ConflictException('Import is not waiting for upload');
    }
    if (!(await this.s3.checkExists(questionImport.source_s3_key))) {
      throw new BadRequestException('Uploaded source file was not found');
    }
    await this.prisma.questionImport.update({
      where: { id: importId },
      data: { status: QuestionImportStatus.QUEUED, error_message: null },
    });
    try {
      await this.queue.enqueue(importId);
    } catch (error) {
      await this.prisma.questionImport.update({
        where: { id: importId },
        data: {
          status: QuestionImportStatus.FAILED,
          error_message: 'Could not enqueue import processing',
        },
      });
      throw error;
    }
    return { id: importId, status: QuestionImportStatus.QUEUED };
  }

  async findOne(userId: string, importId: string) {
    const questionImport = await this.findOwned(userId, importId, {
      topic: { select: { id: true, name: true } },
      defaultChapter: { select: { id: true, name: true } },
      exam: { select: { id: true, title: true, mode: true } },
    });
    const { source_s3_key: sourceKeyToOmit, ...safeImport } = questionImport;
    void sourceKeyToOmit;
    return safeImport;
  }

  async findItems(
    userId: string,
    importId: string,
    query: QueryQuestionImportItemsDto,
  ) {
    await this.findOwned(userId, importId);
    const skip = (query.page - 1) * query.limit;
    const where = { import_id: importId };
    const [rows, total] = await Promise.all([
      this.prisma.questionImportItem.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { source_index: 'asc' },
        include: {
          chapter: { select: { id: true, name: true } },
          assets: {
            select: {
              id: true,
              name: true,
              mime_type: true,
              size: true,
              order: true,
              temp_s3_key: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.questionImportItem.count({ where }),
    ]);
    const data = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        assets: await Promise.all(
          row.assets.map(async ({ temp_s3_key, ...asset }) => ({
            ...asset,
            view_url: (await this.s3.getViewUrl(temp_s3_key)).url,
          })),
        ),
      })),
    );
    return { data, total, page: query.page, limit: query.limit };
  }

  async updateItem(
    userId: string,
    importId: string,
    itemId: string,
    dto: UpdateQuestionImportItemDto,
  ) {
    const questionImport = await this.findOwned(userId, importId);
    if (questionImport.status !== QuestionImportStatus.REVIEW_REQUIRED) {
      throw new ConflictException('Import is not available for review');
    }
    const existing = await this.prisma.questionImportItem.findFirst({
      where: { id: itemId, import_id: importId },
      include: { assets: true },
    });
    if (!existing) throw new NotFoundException('Import item not found');

    const validation = this.validateQuestion(
      {
        sourceIndex: existing.source_index,
        sourceCode: existing.source_code ?? undefined,
        chapterName: dto.chapter_name,
        chapterId: dto.chapter_id,
        questionText: dto.question_text,
        questionType: dto.question_type,
        questionFormat: dto.question_format,
        options: dto.options,
        correctAnswer: dto.correct_answer,
        assets: [],
        parserWarnings: [],
      },
      questionImport.default_chapter_id,
      await this.loadChapterTree(questionImport.topic_id, userId),
    );
    const removedImageErrors = Array.isArray(existing.errors)
      ? existing.errors.filter(
          (error): error is string =>
            typeof error === 'string' && error.startsWith('Ảnh '),
        )
      : [];
    validation.warnings.push(
      ...removedImageErrors.map(
        (error) => `${error}. Ảnh này đã bị loại khỏi câu hỏi`,
      ),
    );
    const status = validation.errors.length
      ? QuestionImportItemStatus.INVALID
      : QuestionImportItemStatus.VALID;
    const updated = await this.prisma.questionImportItem.update({
      where: { id: itemId },
      data: {
        chapter_id: validation.chapterId,
        data: validation.data as unknown as Prisma.InputJsonValue,
        errors: validation.errors,
        warnings: validation.warnings,
        fingerprint: validation.fingerprint,
        status,
      },
      include: {
        chapter: { select: { id: true, name: true } },
        assets: { orderBy: { order: 'asc' } },
      },
    });
    await this.refreshCounts(importId);
    return {
      ...updated,
      assets: await Promise.all(
        updated.assets.map(async ({ temp_s3_key, ...asset }) => ({
          ...asset,
          view_url: (await this.s3.getViewUrl(temp_s3_key)).url,
        })),
      ),
    };
  }

  async commit(userId: string, importId: string, dto: CommitQuestionImportDto) {
    const questionImport = await this.findOwned(userId, importId);
    if (questionImport.status !== QuestionImportStatus.REVIEW_REQUIRED) {
      throw new ConflictException('Import is not ready to commit');
    }
    await this.assertScope(
      userId,
      questionImport.topic_id,
      questionImport.default_chapter_id ?? undefined,
      questionImport.exam_id ?? undefined,
    );

    const claimed = await this.prisma.questionImport.updateMany({
      where: { id: importId, status: QuestionImportStatus.REVIEW_REQUIRED },
      data: { status: QuestionImportStatus.COMMITTING, error_message: null },
    });
    if (!claimed.count)
      throw new ConflictException('Import is already being committed');

    const copiedKeys: string[] = [];
    let committed = false;
    try {
      const requestedIds = dto.item_ids?.length ? dto.item_ids : undefined;
      const items = await this.prisma.questionImportItem.findMany({
        where: {
          import_id: importId,
          status: QuestionImportItemStatus.VALID,
          ...(requestedIds ? { id: { in: requestedIds } } : {}),
        },
        include: { assets: { orderBy: { order: 'asc' } } },
        orderBy: { source_index: 'asc' },
      });
      if (!items.length)
        throw new BadRequestException('No valid items selected');
      if (requestedIds && items.length !== new Set(requestedIds).size) {
        throw new BadRequestException(
          'Selection contains missing or invalid items',
        );
      }

      const existingFingerprints =
        dto.duplicate_policy === 'SKIP'
          ? await this.loadExistingFingerprints(
              items.map((item) => item.chapter_id).filter(Boolean) as string[],
            )
          : new Set<string>();
      const skipped = [] as typeof items;
      const itemsToCreate = [] as typeof items;
      const seenFingerprints = new Set(existingFingerprints);
      for (const item of items) {
        if (dto.duplicate_policy === 'SKIP') {
          if (item.fingerprint && seenFingerprints.has(item.fingerprint)) {
            skipped.push(item);
            continue;
          }
          if (item.fingerprint) seenFingerprints.add(item.fingerprint);
        }
        itemsToCreate.push(item);
      }

      const prepared = [] as Array<{
        item: (typeof items)[number];
        questionId: string;
        files: Array<{
          id: string;
          key: string;
          name: string;
          size: number;
          order: number;
        }>;
      }>;
      for (const item of itemsToCreate) {
        const questionId = randomUUID();
        const files = [] as Array<{
          id: string;
          key: string;
          name: string;
          size: number;
          order: number;
        }>;
        for (const asset of item.assets) {
          const fileId = randomUUID();
          const key = `questions/${userId}/${questionId}/${fileId}.png`;
          await this.s3.copyObject(asset.temp_s3_key, key);
          copiedKeys.push(key);
          files.push({
            id: fileId,
            key,
            name: asset.name,
            size: asset.size,
            order: asset.order,
          });
        }
        prepared.push({ item, questionId, files });
      }

      await this.prisma.$transaction(
        async (tx) => {
          if (skipped.length) {
            await tx.questionImportItem.updateMany({
              where: { id: { in: skipped.map((item) => item.id) } },
              data: { status: QuestionImportItemStatus.SKIPPED },
            });
          }

          if (prepared.length) {
            const chapterIds = await this.materializeChapters(
              tx,
              questionImport.topic_id,
              userId,
              prepared.map((entry) => entry.item),
            );
            await tx.question.createMany({
              data: prepared.map((entry) => {
                const data = entry.item.data as unknown as ImportQuestionData;
                return {
                  id: entry.questionId,
                  chapter_id: chapterIds.get(entry.item.id) as string,
                  question_text: data.questionText,
                  question_type: data.questionType,
                  question_format: data.questionFormat,
                  options:
                    data.questionType === QuestionType.ESSAY
                      ? null
                      : JSON.stringify(
                          data.options.map(({ text, isCorrect }) => ({
                            text,
                            isCorrect,
                          })),
                        ),
                  correct_answer:
                    data.questionType === QuestionType.ESSAY
                      ? data.correctAnswer
                      : null,
                };
              }),
            });

            const allFiles = prepared.flatMap((entry) =>
              entry.files.map((file) => ({ entry, file })),
            );
            if (allFiles.length) {
              await tx.file.createMany({
                data: allFiles.map(({ entry, file }) => ({
                  id: file.id,
                  name: file.name,
                  url: this.s3.createStorageUrl(file.key),
                  s3_key: file.key,
                  type: FileType.IMAGE,
                  size: file.size,
                  entity_type: 'questions',
                  entity_id: entry.questionId,
                  uploaded_by: userId,
                  status: FileStatus.ACTIVE,
                })),
              });
              await tx.questionFiles.createMany({
                data: allFiles.map(({ entry, file }) => ({
                  question_id: entry.questionId,
                  file_id: file.id,
                  order: file.order,
                })),
              });
              for (const { entry, file } of allFiles) {
                const asset = entry.item.assets.find(
                  (candidate) => candidate.order === file.order,
                );
                if (asset) {
                  await tx.questionImportAsset.update({
                    where: { id: asset.id },
                    data: { file_id: file.id },
                  });
                }
              }
            }

            if (questionImport.exam_id) {
              for (const entry of prepared) {
                await this.examsService.addQuestion(
                  questionImport.exam_id,
                  entry.questionId,
                  tx,
                );
              }
            }

            for (const entry of prepared) {
              await tx.questionImportItem.update({
                where: { id: entry.item.id },
                data: {
                  status: QuestionImportItemStatus.COMMITTED,
                  question_id: entry.questionId,
                  chapter_id: chapterIds.get(entry.item.id),
                },
              });
            }
          }

          await tx.questionImport.update({
            where: { id: importId },
            data: {
              status: QuestionImportStatus.COMPLETED,
              committed_items: prepared.length,
              skipped_items: skipped.length,
              committed_at: new Date(),
            },
          });
        },
        { maxWait: 10_000, timeout: 120_000 },
      );
      committed = true;

      // Best-effort: the questions are already committed, so a failed delete
      // only leaves a temp object behind (the expiry cleanup job and bucket
      // lifecycle catch it) and must not fail the request.
      const cleanupKeys = [
        questionImport.source_s3_key,
        ...prepared.flatMap((entry) =>
          entry.item.assets.map((asset) => asset.temp_s3_key),
        ),
      ];
      const cleanup = await Promise.allSettled(
        cleanupKeys.map((key) => this.s3.remove(key)),
      );
      cleanup.forEach((outcome, index) => {
        if (outcome.status === 'rejected') {
          this.logger.warn(
            `Import ${importId}: could not remove temp object ${cleanupKeys[index]}: ${this.errorMessage(outcome.reason)}`,
          );
        }
      });
      return this.findOne(userId, importId);
    } catch (error) {
      if (committed) {
        throw error;
      }
      await Promise.all(copiedKeys.map((key) => this.s3.remove(key)));
      await this.prisma.questionImport.update({
        where: { id: importId },
        data: {
          status: QuestionImportStatus.REVIEW_REQUIRED,
          error_message: this.errorMessage(error),
        },
      });
      throw error;
    }
  }

  async cancel(userId: string, importId: string) {
    const questionImport = await this.findOwned(userId, importId);
    if (
      questionImport.status === QuestionImportStatus.COMPLETED ||
      questionImport.status === QuestionImportStatus.COMMITTING
    ) {
      throw new ConflictException('Import can no longer be cancelled');
    }
    const cancelled = await this.prisma.questionImport.updateMany({
      where: {
        id: importId,
        status: {
          notIn: [
            QuestionImportStatus.COMPLETED,
            QuestionImportStatus.COMMITTING,
            QuestionImportStatus.CANCELLED,
          ],
        },
      },
      data: { status: QuestionImportStatus.CANCELLED },
    });
    if (!cancelled.count) {
      throw new ConflictException('Import can no longer be cancelled');
    }
    const assets = await this.prisma.questionImportAsset.findMany({
      where: { item: { import_id: importId } },
      select: { temp_s3_key: true },
    });
    await Promise.all([
      this.s3.remove(questionImport.source_s3_key),
      ...assets.map((asset) => this.s3.remove(asset.temp_s3_key)),
    ]);
    return { id: importId, status: QuestionImportStatus.CANCELLED };
  }

  async processImport(importId: string) {
    const questionImport = await this.prisma.questionImport.findUnique({
      where: { id: importId },
    });
    if (
      !questionImport ||
      questionImport.status !== QuestionImportStatus.QUEUED
    )
      return;
    const claimed = await this.prisma.questionImport.updateMany({
      where: {
        id: importId,
        status: QuestionImportStatus.QUEUED,
      },
      data: { status: QuestionImportStatus.PARSING, error_message: null },
    });
    if (!claimed.count) return;

    try {
      const buffer = await this.s3.getObjectBuffer(
        questionImport.source_s3_key,
        QUESTION_IMPORT_MAX_FILE_SIZE,
      );
      if (buffer.length > QUESTION_IMPORT_MAX_FILE_SIZE) {
        throw new BadRequestException('Source file exceeds the 20 MB limit');
      }
      if (buffer.length !== questionImport.source_size) {
        throw new BadRequestException(
          'Uploaded file size does not match the request',
        );
      }
      assertOfficeFileSignature(buffer, questionImport.source_type);
      const parsed =
        questionImport.source_type === QuestionImportSourceType.DOCX
          ? await this.docxParser.parse(buffer)
          : await this.xlsxParser.parse(buffer);
      if (!parsed.length)
        throw new BadRequestException('No questions found in the template');
      if (parsed.length > 1000)
        throw new BadRequestException(
          'A single import supports at most 1000 questions',
        );

      await this.prisma.questionImportItem.deleteMany({
        where: { import_id: importId },
      });
      const chapterTree = await this.loadChapterTree(
        questionImport.topic_id,
        questionImport.created_by,
      );
      let validItems = 0;
      let invalidItems = 0;
      for (const parsedQuestion of parsed) {
        const validation = this.validateQuestion(
          parsedQuestion,
          questionImport.default_chapter_id,
          chapterTree,
        );
        const uploadedAssets = [] as Array<{
          tempKey: string;
          name: string;
          size: number;
          order: number;
        }>;
        for (const asset of parsedQuestion.assets) {
          try {
            const normalized = await sharp(asset.buffer, {
              limitInputPixels: 40_000_000,
            })
              .rotate()
              .resize({
                width: 2000,
                height: 2000,
                fit: 'inside',
                withoutEnlargement: true,
              })
              .png({ compressionLevel: 9 })
              .toBuffer();
            const tempKey = `question-imports/${questionImport.created_by}/${importId}/assets/${randomUUID()}.png`;
            await this.s3.putObject(tempKey, normalized, 'image/png');
            uploadedAssets.push({
              tempKey,
              name: asset.name.replace(/\.[^.]+$/, '.png'),
              size: normalized.length,
              order: asset.order,
            });
          } catch {
            validation.errors.push(
              `Ảnh ${asset.name} không hợp lệ hoặc quá lớn`,
            );
          }
        }
        const status = validation.errors.length
          ? QuestionImportItemStatus.INVALID
          : QuestionImportItemStatus.VALID;
        if (status === QuestionImportItemStatus.VALID) validItems += 1;
        else invalidItems += 1;
        await this.prisma.questionImportItem.create({
          data: {
            import_id: importId,
            source_index: parsedQuestion.sourceIndex,
            source_code: parsedQuestion.sourceCode,
            chapter_id: validation.chapterId,
            data: validation.data as unknown as Prisma.InputJsonValue,
            errors: validation.errors,
            warnings: validation.warnings,
            fingerprint: validation.fingerprint,
            status,
            assets: {
              create: uploadedAssets.map((asset) => ({
                temp_s3_key: asset.tempKey,
                name: asset.name,
                mime_type: 'image/png',
                size: asset.size,
                order: asset.order,
              })),
            },
          },
        });
      }
      const finalized = await this.prisma.questionImport.updateMany({
        where: {
          id: importId,
          status: QuestionImportStatus.PARSING,
        },
        data: {
          status: QuestionImportStatus.REVIEW_REQUIRED,
          total_items: parsed.length,
          valid_items: validItems,
          invalid_items: invalidItems,
        },
      });
      if (!finalized.count) {
        const assets = await this.prisma.questionImportAsset.findMany({
          where: { item: { import_id: importId }, file_id: null },
          select: { temp_s3_key: true },
        });
        await Promise.all(
          assets.map((asset) => this.s3.remove(asset.temp_s3_key)),
        );
        await this.prisma.questionImportItem.deleteMany({
          where: { import_id: importId },
        });
      }
    } catch (error) {
      await this.prisma.questionImport.updateMany({
        where: {
          id: importId,
          status: QuestionImportStatus.PARSING,
        },
        data: {
          status: QuestionImportStatus.FAILED,
          error_message: this.errorMessage(error),
        },
      });
      throw error;
    }
  }

  async cleanupExpired() {
    const expired = await this.prisma.questionImport.findMany({
      where: {
        expires_at: { lt: new Date() },
        status: {
          in: [
            QuestionImportStatus.UPLOADING,
            QuestionImportStatus.QUEUED,
            QuestionImportStatus.PARSING,
            QuestionImportStatus.REVIEW_REQUIRED,
            QuestionImportStatus.FAILED,
          ],
        },
      },
      include: {
        items: {
          include: { assets: { where: { file_id: null } } },
        },
      },
    });
    for (const questionImport of expired) {
      await Promise.all([
        this.s3.remove(questionImport.source_s3_key),
        ...questionImport.items.flatMap((item) =>
          item.assets.map((asset) => this.s3.remove(asset.temp_s3_key)),
        ),
      ]);
      await this.prisma.questionImport.update({
        where: { id: questionImport.id },
        data: {
          status: QuestionImportStatus.CANCELLED,
          error_message: 'Import expired before completion',
        },
      });
    }
    return { cleaned: expired.length };
  }

  /**
   * Resolves which chapter a row belongs to. Priority: the chapter name/path
   * typed in the row, then a legacy chapter_id column, then the import's
   * default chapter. A path that does not exist yet is kept as
   * `chapterPath` and created on commit.
   */
  private resolveChapter(
    question: ParsedImportQuestion,
    defaultChapterId: string | null | undefined,
    tree: ChapterTree,
    errors: string[],
    warnings: string[],
  ): { chapterId: string | null; chapterPath: string[] | null } {
    const segments = parseChapterPath(question.chapterName ?? '');
    if (segments.length) {
      const resolution = tree.resolve(segments);
      if (resolution.kind === 'existing') {
        return { chapterId: resolution.chapterId, chapterPath: null };
      }
      if (resolution.kind === 'ambiguous') {
        errors.push(
          `Chapter "${resolution.segment}" trùng tên ở nhiều vị trí: ${resolution.candidates.join('; ')}. ` +
            `Ghi rõ đường dẫn (vd. "${resolution.candidates[0]}") hoặc chọn Chapter khi sửa dòng`,
        );
        return { chapterId: null, chapterPath: null };
      }
      const parentPath = resolution.parentId
        ? `${tree.pathOf(resolution.parentId)} ${CHAPTER_PATH_SEPARATOR} `
        : '';
      warnings.push(
        `Sẽ tạo mới Chapter: ${parentPath}${resolution.names.join(` ${CHAPTER_PATH_SEPARATOR} `)}`,
      );
      return { chapterId: null, chapterPath: segments };
    }

    const chapterId = question.chapterId || defaultChapterId || null;
    if (!chapterId) {
      errors.push('Thiếu tên chapter và chưa chọn Chapter mặc định');
    } else if (!tree.has(chapterId)) {
      errors.push('Chapter không thuộc Topic đã chọn');
    }
    return { chapterId, chapterPath: null };
  }

  /**
   * Maps every item to its final chapter id, creating the chapters that
   * rows reference by a not-yet-existing path. Runs inside the commit
   * transaction against the live tree, so rows sharing a path create it
   * once and a failed commit leaves no chapters behind.
   */
  private async materializeChapters(
    tx: Prisma.TransactionClient,
    topicId: string,
    userId: string,
    items: Array<{ id: string; chapter_id: string | null; data: unknown }>,
  ): Promise<Map<string, string>> {
    const tree = await this.loadChapterTree(topicId, userId, tx);
    const result = new Map<string, string>();
    for (const item of items) {
      const path = (item.data as ImportQuestionData).chapterPath;
      if (!path?.length) {
        if (!item.chapter_id || !tree.has(item.chapter_id)) {
          throw new BadRequestException(
            `Chapter of import row ${item.id} no longer exists`,
          );
        }
        result.set(item.id, item.chapter_id);
        continue;
      }

      const resolution = tree.resolve(path);
      if (resolution.kind === 'ambiguous') {
        throw new ConflictException(
          `Chapter "${resolution.segment}" is now ambiguous (${resolution.candidates.join('; ')}); edit the row and pick a chapter`,
        );
      }
      if (resolution.kind === 'existing') {
        result.set(item.id, resolution.chapterId);
        continue;
      }

      let parentId = resolution.parentId;
      for (const name of resolution.names) {
        const created = await tx.chapter.create({
          data: {
            topic_id: topicId,
            parent_id: parentId,
            name,
            order: tree.nextOrder(parentId),
          },
          select: { id: true, name: true, parent_id: true, order: true },
        });
        tree.add(created);
        parentId = created.id;
      }
      result.set(item.id, parentId as string);
    }
    return result;
  }

  /** Chapters of the topic, scoped to the lecturer who owns it. */
  private async loadChapterTree(
    topicId: string,
    userId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const chapters = await db.chapter.findMany({
      where: {
        topic_id: topicId,
        is_deleted: false,
        topic: { created_by: userId, is_deleted: false },
      },
      select: { id: true, name: true, parent_id: true, order: true },
    });
    return new ChapterTree(chapters);
  }

  private validateQuestion(
    question: ParsedImportQuestion,
    defaultChapterId: string | null | undefined,
    tree: ChapterTree,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings = [...question.parserWarnings];
    const { chapterId, chapterPath } = this.resolveChapter(
      question,
      defaultChapterId,
      tree,
      errors,
      warnings,
    );
    const chapterValid = Boolean(
      chapterPath || (chapterId && tree.has(chapterId)),
    );

    const questionText = question.questionText.trim();
    if (!questionText) errors.push('Nội dung câu hỏi không được để trống');
    const questionType = Object.values(QuestionType).includes(
      question.questionType as QuestionType,
    )
      ? (question.questionType as QuestionType)
      : null;
    const questionFormat = Object.values(QuestionFormat).includes(
      question.questionFormat as QuestionFormat,
    )
      ? (question.questionFormat as QuestionFormat)
      : null;
    if (!questionType) errors.push('question_type không hợp lệ');
    if (!questionFormat) errors.push('question_format không hợp lệ');

    const options = question.options
      .map((option) => ({
        ...option,
        key: option.key.trim().toUpperCase(),
        text: option.text.trim(),
      }))
      .filter((option) => option.text);
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (questionType === QuestionType.SINGLE_CHOICE) {
      if (options.length < 2)
        errors.push('Câu một đáp án cần ít nhất 2 lựa chọn');
      if (correctCount !== 1)
        errors.push('Câu một đáp án phải có đúng 1 đáp án đúng');
    } else if (questionType === QuestionType.MULTIPLE_CHOICE) {
      if (options.length < 2)
        errors.push('Câu nhiều đáp án cần ít nhất 2 lựa chọn');
      if (correctCount < 1)
        errors.push('Câu nhiều đáp án cần ít nhất 1 đáp án đúng');
    } else if (
      questionType === QuestionType.ESSAY &&
      !question.correctAnswer?.trim()
    ) {
      errors.push('Câu tự luận cần essay_answer');
    }

    const data: ImportQuestionData = {
      questionText,
      questionType: questionType ?? QuestionType.SINGLE_CHOICE,
      questionFormat: questionFormat ?? QuestionFormat.KNOWLEDGE,
      options: questionType === QuestionType.ESSAY ? [] : options,
      correctAnswer:
        questionType === QuestionType.ESSAY
          ? question.correctAnswer?.trim() || null
          : null,
      chapterPath,
    };
    // Rows headed for a not-yet-created chapter still de-duplicate among
    // themselves via a path-based key.
    const chapterKey = chapterPath
      ? `new:${chapterPathKey(chapterPath)}`
      : chapterId;
    const fingerprint =
      chapterValid &&
      chapterKey &&
      questionType &&
      questionFormat &&
      questionText
        ? this.fingerprint(chapterKey, data)
        : null;
    return {
      data,
      chapterId: chapterValid ? chapterId : null,
      errors,
      warnings,
      fingerprint,
    };
  }

  private fingerprint(chapterId: string, data: ImportQuestionData) {
    const normalized = {
      chapterId,
      text: data.questionText.trim().replace(/\s+/g, ' ').toLowerCase(),
      type: data.questionType,
      format: data.questionFormat,
      options: data.options.map((option) => ({
        text: option.text.trim().replace(/\s+/g, ' ').toLowerCase(),
        isCorrect: option.isCorrect,
      })),
      correctAnswer:
        data.correctAnswer?.trim().replace(/\s+/g, ' ').toLowerCase() ?? null,
    };
    return createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  private async loadExistingFingerprints(chapterIds: string[]) {
    const questions = await this.prisma.question.findMany({
      where: {
        chapter_id: { in: [...new Set(chapterIds)] },
        is_deleted: false,
      },
      select: {
        chapter_id: true,
        question_text: true,
        question_type: true,
        question_format: true,
        options: true,
        correct_answer: true,
      },
    });
    return new Set(
      questions.map((question) => {
        let options: ImportOption[] = [];
        try {
          const parsed = JSON.parse(question.options ?? '[]') as Array<{
            text: string;
            isCorrect: boolean;
          }>;
          options = parsed.map((option, index) => ({
            key: String(index),
            ...option,
          }));
        } catch {
          options = [];
        }
        return this.fingerprint(question.chapter_id, {
          questionText: question.question_text,
          questionType: question.question_type,
          questionFormat: question.question_format,
          options,
          correctAnswer: question.correct_answer,
        });
      }),
    );
  }

  private async refreshCounts(importId: string) {
    const grouped = await this.prisma.questionImportItem.groupBy({
      by: ['status'],
      where: { import_id: importId },
      _count: true,
    });
    const count = (status: QuestionImportItemStatus) =>
      grouped.find((entry) => entry.status === status)?._count ?? 0;
    await this.prisma.questionImport.update({
      where: { id: importId },
      data: {
        valid_items: count(QuestionImportItemStatus.VALID),
        invalid_items: count(QuestionImportItemStatus.INVALID),
      },
    });
  }

  private async assertScope(
    userId: string,
    topicId: string,
    chapterId?: string,
    examId?: string,
  ) {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, created_by: userId, is_deleted: false },
      select: { id: true },
    });
    if (!topic)
      throw new ForbiddenException('Topic does not belong to the current user');
    if (chapterId) {
      const chapter = await this.prisma.chapter.findFirst({
        where: { id: chapterId, topic_id: topicId, is_deleted: false },
        select: { id: true },
      });
      if (!chapter)
        throw new BadRequestException(
          'Default Chapter does not belong to Topic',
        );
    }
    if (examId) {
      const exam = await this.prisma.exam.findFirst({
        where: { id: examId, lecturer_id: userId, is_deleted: false },
        select: {
          id: true,
          topic_id: true,
          mode: true,
          _count: { select: { submissions: true } },
        },
      });
      if (!exam)
        throw new ForbiddenException(
          'Exam does not belong to the current user',
        );
      if (exam.topic_id !== topicId)
        throw new BadRequestException(
          'Exam and import must use the same Topic',
        );
      if (exam.mode !== ExamMode.MANUAL)
        throw new BadRequestException(
          'Questions can only be imported into a MANUAL exam',
        );
      if (exam._count.submissions > 0)
        throw new ConflictException(
          'Cannot import questions after the exam has submissions',
        );
    }
  }

  private assertSource(dto: CreateQuestionImportDto) {
    const expectedMime = QUESTION_IMPORT_MIME_TYPES[dto.source_type];
    const expectedExtension =
      dto.source_type === QuestionImportSourceType.DOCX ? '.docx' : '.xlsx';
    if (
      dto.mime_type !== expectedMime ||
      path.extname(dto.file_name).toLowerCase() !== expectedExtension
    ) {
      throw new BadRequestException(
        `File must be a valid ${expectedExtension} template`,
      );
    }
  }

  private async findOwned(
    userId: string,
    importId: string,
    include?: Prisma.QuestionImportInclude,
  ) {
    const questionImport = await this.prisma.questionImport.findFirst({
      where: { id: importId, created_by: userId },
      ...(include ? { include } : {}),
    });
    if (!questionImport)
      throw new NotFoundException('Question import not found');
    return questionImport;
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) return error.message.slice(0, 1000);
    return 'Unexpected import error';
  }
}
