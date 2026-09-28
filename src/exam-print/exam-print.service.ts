import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ExamMode, FileType, UserRole } from '@prisma/client';
import JSZip from 'jszip';
import * as puppeteer from 'puppeteer';
import { PrismaService } from '@/prisma/prisma.service';
import { S3Service } from '@/s3/s3.service';
import {
  ExamRuntimeService,
  type ExamQuestionRow,
} from '@/exam-runtime/exam-runtime.service';
import {
  PRINT_READY_FLAG,
  renderAnswerKeyHtml,
  renderVariantHtml,
} from './exam-print.templates';
import type {
  ExamVariant,
  PrintExamInfo,
  PrintSourceQuestion,
  PrintVariantCount,
} from './exam-print.types';
import { buildVariant, generateVariantCodes } from './exam-print.variants';

type PrintUser = { id: string; role: UserRole };

type PdfDocument = { html: string; footerLabel: string };

const PAGE_LOAD_TIMEOUT_MS = 45_000;
const MATH_READY_TIMEOUT_MS = 15_000;
/** Chromium instances allowed at once across all print requests. */
const MAX_CONCURRENT_BROWSERS = 2;
/** Tabs rendering at once inside one browser. */
const MAX_TABS_PER_BROWSER = 3;

/** Minimal FIFO counting semaphore. */
class Semaphore {
  private readonly waiters: Array<() => void> = [];

  constructor(private available: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.available > 0) {
      this.available--;
    } else {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    try {
      return await task();
    } finally {
      const next = this.waiters.shift();
      // Hand the slot straight to the next waiter, or return it to the pool.
      if (next) next();
      else this.available++;
    }
  }
}

/** Maps with at most `limit` tasks in flight; results keep input order. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

/** Shared by every request so concurrent prints cannot exhaust the host. */
const browserSlots = new Semaphore(MAX_CONCURRENT_BROWSERS);

/** Generated archive, ready to stream to the client. */
export type PrintArchive = { buffer: Buffer; fileName: string };

@Injectable()
export class ExamPrintService {
  private readonly logger = new Logger(ExamPrintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly examRuntime: ExamRuntimeService,
    private readonly s3: S3Service,
  ) {}

  /**
   * Builds the offline print package for an exam: one PDF per variant plus
   * one answer-key PDF, zipped. MANUAL exams reuse the same question set in
   * every variant (only question and option order change); random modes
   * draw a fresh set per variant using the same rules as online attempts.
   * Nothing is persisted — each call yields a brand-new set of variants.
   */
  async generateArchive(
    examId: string,
    variantCount: PrintVariantCount,
    user: PrintUser,
  ): Promise<PrintArchive> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, is_deleted: false },
      select: {
        id: true,
        title: true,
        duration: true,
        topic_id: true,
        mode: true,
        sample_size: true,
        distribution: true,
        lecturer_id: true,
        topic: { select: { name: true } },
        lecturer: { select: { full_name: true, school: true } },
      },
    });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    if (user.role !== UserRole.ADMIN && exam.lecturer_id !== user.id) {
      throw new ForbiddenException('Not allowed to print this exam');
    }

    // selectQuestions throws 400 when the bank cannot satisfy the exam's
    // distribution, so the lecturer sees the same error an online attempt
    // would hit.
    const manualSet =
      exam.mode === ExamMode.MANUAL
        ? await this.examRuntime.selectQuestions(exam)
        : null;
    const questionSets: ExamQuestionRow[][] = manualSet
      ? Array.from({ length: variantCount }, () => manualSet)
      : await Promise.all(
          Array.from({ length: variantCount }, () =>
            this.examRuntime.selectQuestions(exam),
          ),
        );

    const sources = await this.hydrateQuestions(questionSets.flat());
    const codes = generateVariantCodes(variantCount);
    const variants: ExamVariant[] = codes.map((code, i) =>
      buildVariant(
        code,
        questionSets[i].map((row) => this.requireSource(sources, row.id)),
      ),
    );

    const info: PrintExamInfo = {
      title: exam.title,
      topic_name: exam.topic?.name ?? '',
      lecturer_name: exam.lecturer?.full_name ?? '',
      school: exam.lecturer?.school ?? null,
      duration: exam.duration,
    };

    const pdfs = await this.renderPdfs([
      ...variants.map((variant) => ({
        html: renderVariantHtml(info, variant),
        footerLabel: `Mã đề ${variant.code}`,
      })),
      { html: renderAnswerKeyHtml(info, variants), footerLabel: 'Đáp án' },
    ]);

    const zip = new JSZip();
    variants.forEach((variant, i) => {
      zip.file(`Ma_de_${variant.code}.pdf`, pdfs[i]);
    });
    zip.file('Dap_an.pdf', pdfs[variants.length]);
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    this.logger.log(
      `Printed exam ${exam.id}: ${variantCount} variants (${codes.join(', ')}) for user ${user.id}`,
    );

    return {
      buffer,
      fileName: `De_thi_${toAsciiSlug(exam.title)}_${variantCount}_ma_de.zip`,
    };
  }

  /**
   * Loads authoritative question data (including the correct answer, which
   * the runtime selection deliberately omits) and resolves image files to
   * URLs the headless browser can fetch.
   */
  private async hydrateQuestions(
    rows: ExamQuestionRow[],
  ): Promise<Map<string, PrintSourceQuestion>> {
    const questionIds = [...new Set(rows.map((row) => row.id))];
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        question_text: true,
        question_type: true,
        options: true,
        correct_answer: true,
        files: {
          orderBy: { order: 'asc' },
          select: {
            file: { select: { id: true, url: true, s3_key: true, type: true } },
          },
        },
      },
    });

    const imageUrlById = new Map<string, string | null>();
    await Promise.all(
      questions
        .flatMap((q) => q.files.map((qf) => qf.file))
        .filter((file) => file.type === FileType.IMAGE)
        .map(async (file) => {
          imageUrlById.set(file.id, await this.resolveImageUrl(file));
        }),
    );

    return new Map(
      questions.map((q) => [
        q.id,
        {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          image_urls: q.files
            .map((qf) => imageUrlById.get(qf.file.id))
            .filter((url): url is string => Boolean(url)),
          has_unprintable_media: q.files.some(
            (qf) => qf.file.type !== FileType.IMAGE,
          ),
        },
      ]),
    );
  }

  private async resolveImageUrl(file: {
    id: string;
    url: string;
    s3_key: string | null;
  }): Promise<string | null> {
    try {
      if (file.s3_key) {
        return (await this.s3.getViewUrl(file.s3_key)).url;
      }
      if (/^https?:\/\//i.test(file.url)) {
        return file.url;
      }
      return (await this.s3.getViewUrl(file.url)).url;
    } catch (error) {
      // A missing image should not block printing the whole exam.
      this.logger.warn(
        `Could not resolve image file ${file.id} for printing: ${String(error)}`,
      );
      return null;
    }
  }

  private requireSource(
    sources: Map<string, PrintSourceQuestion>,
    id: string,
  ): PrintSourceQuestion {
    const source = sources.get(id);
    if (!source) {
      // Only possible if a question was hard-deleted between selection and
      // hydration; fail loudly rather than print an incomplete exam.
      throw new NotFoundException(`Question ${id} no longer exists`);
    }
    return source;
  }

  /**
   * Renders every document in a single browser instance. Requests queue for
   * one of MAX_CONCURRENT_BROWSERS slots, and each browser renders at most
   * MAX_TABS_PER_BROWSER tabs at once. Output order matches `documents`.
   */
  private async renderPdfs(documents: PdfDocument[]): Promise<Buffer[]> {
    return browserSlots.run(async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        return await mapWithConcurrency(
          documents,
          MAX_TABS_PER_BROWSER,
          (doc) => this.renderPdf(browser, doc),
        );
      } finally {
        await browser.close();
      }
    });
  }

  private async renderPdf(
    browser: puppeteer.Browser,
    doc: PdfDocument,
  ): Promise<Buffer> {
    const page = await browser.newPage();
    try {
      await page.setContent(doc.html, {
        waitUntil: 'networkidle0',
        timeout: PAGE_LOAD_TIMEOUT_MS,
      });
      await page
        .waitForFunction(`window.${PRINT_READY_FLAG} === true`, {
          timeout: MATH_READY_TIMEOUT_MS,
        })
        .catch(() =>
          this.logger.warn(`Math rendering timed out for "${doc.footerLabel}"`),
        );
      await page.evaluate('document.fonts.ready');

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="width:100%;font-size:9px;font-family:serif;color:#333;padding:0 15mm;display:flex;justify-content:space-between;">
            <span>${doc.footerLabel}</span>
            <span>Trang <span class="pageNumber"></span>/<span class="totalPages"></span></span>
          </div>`,
        margin: { top: '15mm', right: '15mm', bottom: '18mm', left: '18mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }
}

/** "Giải tích 1 - Giữa kỳ" → "Giai_tich_1_Giua_ky"; safe for any filesystem. */
function toAsciiSlug(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return slug || 'exam';
}
