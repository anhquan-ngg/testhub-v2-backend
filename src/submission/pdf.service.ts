import { selectChapterQuestionIds } from '../common/chapter-question-selection';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FileType, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { S3Service } from '@/s3/s3.service';
import { isAllowedPrintRequest } from '@/exam-print/exam-print.network';
import {
  PRINT_READY_FLAG,
  escapeHtml,
} from '@/exam-print/exam-print.templates';
import * as puppeteer from 'puppeteer';
import {
  renderSubmissionPdfHtml,
  type SubmissionPdfMedia,
  type SubmissionPdfOption,
  type SubmissionPdfQuestion,
  type SubmissionPdfView,
} from './submission-pdf.template';

export type SubmissionPdfOptions = {
  /** Render the per-question breakdown (staff, or practice exams). */
  showQuestions: boolean;
  /** Use staff wording ("Câu trả lời của thí sinh") instead of "Câu trả lời của bạn". */
  staffView: boolean;
};

export type SubmissionAccessInfo = {
  studentId: string;
  lecturerId: string;
  practice: boolean;
};

const PAGE_LOAD_TIMEOUT_MS = 45_000;
const MATH_READY_TIMEOUT_MS = 15_000;
const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
};

/** Minimal FIFO counting semaphore bounding concurrent Chromium instances. */
class Semaphore {
  private readonly waiters: Array<() => void> = [];

  constructor(
    private available: number,
    private readonly maxWaiters: number,
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.available > 0) {
      this.available--;
    } else {
      if (this.waiters.length >= this.maxWaiters) {
        throw new ServiceUnavailableException(
          'PDF queue is full; try again later',
        );
      }
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    try {
      return await task();
    } finally {
      const next = this.waiters.shift();
      if (next) next();
      else this.available++;
    }
  }
}

const submissionPdfSlots = new Semaphore(2, 4);

const submissionPdfInclude = {
  exam: {
    include: {
      topic: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  },
  student: { select: { full_name: true, email: true } },
  questions: {
    where: { is_deleted: false },
    orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    include: {
      question: {
        select: {
          question_text: true,
          question_type: true,
          options: true,
          correct_answer: true,
          files: {
            orderBy: { order: 'asc' },
            select: {
              file: {
                select: {
                  id: true,
                  name: true,
                  url: true,
                  s3_key: true,
                  type: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SubmissionInclude;

type SubmissionForPdf = Prisma.SubmissionGetPayload<{
  include: typeof submissionPdfInclude;
}>;

type PdfFile =
  SubmissionForPdf['questions'][number]['question']['files'][number]['file'];

type ParsedOption = { text: string; isCorrect: boolean };

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  /** Returns the ownership facts needed to authorize a submission PDF download. */
  async getSubmissionAccessInfo(
    submissionId: string,
  ): Promise<SubmissionAccessInfo> {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, is_deleted: false },
      select: {
        student_id: true,
        exam: { select: { lecturer_id: true, practice: true } },
      },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return {
      studentId: submission.student_id,
      lecturerId: submission.exam.lecturer_id,
      practice: submission.exam.practice,
    };
  }

  /**
   * Renders a submission's detailed result as an A4 PDF whose layout mirrors
   * the web result view. Each question card is kept on a single page.
   */
  async generateSubmissionPdf(
    submissionId: string,
    options: SubmissionPdfOptions,
  ): Promise<Buffer> {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, is_deleted: false },
      include: submissionPdfInclude,
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submissionPdfSlots.run(async () => {
      const extraHosts = new Set<string>();
      const view = await this.buildSubmissionView(
        submission,
        options,
        extraHosts,
      );
      const html = renderSubmissionPdfHtml(view);
      const footerLabel = `${view.examTitle} — ${view.student.fullName}`;

      return this.renderPdf(html, footerLabel, [...extraHosts]);
    });
  }

  private async buildSubmissionView(
    submission: SubmissionForPdf,
    { showQuestions, staffView }: SubmissionPdfOptions,
    extraHosts: Set<string>,
  ): Promise<SubmissionPdfView> {
    const totalQuestions = countExamQuestions(submission.exam);
    const scorePerQuestion =
      totalQuestions <= 0 ? 0 : Number((10 / totalQuestions).toFixed(2));

    const questions: SubmissionPdfQuestion[] = showQuestions
      ? await Promise.all(
          submission.questions.map(async (sq, index) => {
            const correctOptions = parseOptions(sq.question.options);
            const studentOptions = parseOptions(sq.options);
            const options: SubmissionPdfOption[] = correctOptions.map(
              (option) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                isStudentChoice: studentOptions.some(
                  (chosen) => chosen.isCorrect && chosen.text === option.text,
                ),
              }),
            );
            const media = await Promise.all(
              sq.question.files.map(({ file }) =>
                this.toPdfMedia(file, extraHosts),
              ),
            );
            return {
              number: index + 1,
              questionText: sq.question.question_text,
              questionType: sq.question.question_type,
              isCorrect: sq.is_correct,
              score: (scorePerQuestion * Number(sq.score ?? 0)).toFixed(2),
              options,
              answer: sq.answer,
              correctAnswer: sq.question.correct_answer,
              media,
            };
          }),
        )
      : [];

    return {
      examTitle: submission.exam.title,
      topicName: submission.exam.topic?.name ?? '',
      isPractice: submission.exam.practice,
      totalScore:
        submission.total_score !== null
          ? Number(submission.total_score).toFixed(2)
          : '0.00',
      timeTaken: formatDuration(submission.start_time, submission.end_time),
      status: formatStatus(submission.status),
      totalQuestions,
      staffView,
      showQuestions,
      student: {
        fullName: submission.student?.full_name ?? '',
        email: submission.student?.email ?? '',
      },
      submissionId: submission.id,
      submittedAt: submission.end_time
        ? submission.end_time.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            dateStyle: 'short',
            timeStyle: 'short',
          })
        : 'N/A',
      questions,
    };
  }

  /**
   * Images are inlined as data URLs so Chromium never needs network access to
   * the bucket; audio/video cannot be printed and only render as a label.
   */
  private async toPdfMedia(
    file: PdfFile,
    extraHosts: Set<string>,
  ): Promise<SubmissionPdfMedia> {
    if (file.type !== FileType.IMAGE) {
      return { name: file.name, kind: file.type, src: null };
    }
    try {
      if (!file.s3_key && /^https:\/\//i.test(file.url)) {
        extraHosts.add(new URL(file.url).hostname);
        return { name: file.name, kind: file.type, src: file.url };
      }
      const key = file.s3_key ?? file.url;
      const bytes = await this.s3.getBoundedObject(key, MAX_INLINE_IMAGE_BYTES);
      const mime = imageMimeType(file.name || key);
      return {
        name: file.name,
        kind: file.type,
        src: `data:${mime};base64,${bytes.toString('base64')}`,
      };
    } catch (error) {
      // A missing image must not block exporting the whole result.
      this.logger.warn(
        `Could not inline image file ${file.id} for submission PDF: ${String(error)}`,
      );
      return { name: file.name, kind: file.type, src: null };
    }
  }

  private async renderPdf(
    html: string,
    footerLabel: string,
    extraHosts: string[],
  ): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      try {
        // Armed before loading the HTML so no subresource can slip through.
        const allowedHosts = [this.s3.getStorageHost(), ...extraHosts];
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const action = isAllowedPrintRequest(request.url(), allowedHosts)
            ? request.continue()
            : request.abort('blockedbyclient');
          action.catch(() => undefined);
        });
        await page.emulateMediaType('print');
        await page.setContent(html, {
          waitUntil: 'networkidle0',
          timeout: PAGE_LOAD_TIMEOUT_MS,
        });
        await page
          .waitForFunction(`window.${PRINT_READY_FLAG} === true`, {
            timeout: MATH_READY_TIMEOUT_MS,
          })
          .catch(() =>
            this.logger.warn(
              'Math rendering timed out while generating a submission PDF',
            ),
          );
        await page.evaluate('document.fonts.ready');

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: `
            <div style="width:100%;font-size:9px;font-family:sans-serif;color:#6b7280;padding:0 15mm;display:flex;justify-content:space-between;gap:12px;">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(footerLabel)}</span>
              <span style="white-space:nowrap;">Trang <span class="pageNumber"></span>/<span class="totalPages"></span></span>
            </div>`,
          margin: { top: '15mm', right: '15mm', bottom: '18mm', left: '15mm' },
        });
        return Buffer.from(pdf);
      } finally {
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }

  async generateBlankExamPdf(examId: string): Promise<Buffer> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        lecturer: true,
        topic: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    let questions: any[] = [];

    if (exam.mode === 'MANUAL') {
      const examQuestions = await this.prisma.examQuestions.findMany({
        where: { exam_id: examId },
        include: { question: true },
      });
      questions = examQuestions.map((eq) => eq.question);
    } else if (exam.mode === 'RANDOM_N') {
      questions = await this.prisma.$queryRaw`
        SELECT * FROM "questions"
        WHERE is_deleted = false
        ORDER BY RANDOM()
        LIMIT ${exam.sample_size}
      `;
    } else if (exam.mode === 'BY_TYPE') {
      if (exam.distribution) {
        const parsedDistribution = JSON.parse(exam.distribution);
        for (const dist of parsedDistribution) {
          const questionsData = await this.prisma.$queryRaw<any[]>`
            SELECT * FROM "questions"
            WHERE question_type::text = ${dist.question_type}
              AND question_format::text = ${dist.question_format}
              AND is_deleted = false
            ORDER BY RANDOM()
            LIMIT ${dist.quantity}
          `;
          questions.push(...questionsData);
        }
      }
    } else if (exam.mode === 'BY_CHAPTER') {
      const ids = await selectChapterQuestionIds(
        this.prisma.current,
        exam.topic_id,
        exam.distribution,
      );
      const selected = await this.prisma.current.question.findMany({
        where: { id: { in: ids }, is_deleted: false },
      });
      if (selected.length !== ids.length)
        throw new BadRequestException(
          'Question bank changed during selection; retry',
        );
      const byId = new Map(selected.map((question) => [question.id, question]));
      questions = ids.map((id) => byId.get(id)).filter(Boolean);
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đề thi - ${exam.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: white; color: #111827; }
        @page { size: A4; margin: 1.5cm; }
        .no-break { break-inside: avoid; }
    </style>
</head>
<body class="p-4">
    <div class="max-w-4xl mx-auto space-y-8">
        <!-- Header -->
        <div class="bg-[#0066cc] p-8 rounded-2xl text-white shadow-lg overflow-hidden relative">
            <div class="relative z-10 flex justify-between items-center">
                <div class="space-y-4">
                    <h1 class="text-3xl font-extrabold tracking-tight">${exam.title}</h1>
                    <div class="flex flex-wrap gap-3">
                        <div class="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-xs font-bold uppercase tracking-wider">
                            Học phần: <strong>${exam.topic?.name ?? 'N/A'}</strong>
                        </div>
                        <div class="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-xs font-bold uppercase tracking-wider">
                            Giảng viên: <strong>${exam.lecturer?.full_name}</strong>
                        </div>
                    </div>
                </div>
                <div class="text-center bg-white/10 p-6 rounded-2xl border border-white/20 min-w-[140px]">
                    <div class="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1">Thời gian</div>
                    <div class="text-4xl font-black">${exam.duration}</div>
                    <div class="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Phút</div>
                </div>
            </div>
        </div>

        <!-- Student Info Grid -->
        <div class="grid grid-cols-3 gap-6">
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm col-span-1">
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Họ và tên</div>
                <div class="border-b border-gray-300 h-6"></div>
            </div>
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm col-span-1">
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Mã số SV</div>
                <div class="border-b border-gray-300 h-6"></div>
            </div>
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm col-span-1">
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Đề thi số</div>
                <div class="border-b border-gray-300 h-6"></div>
            </div>
        </div>

        <!-- Questions Section -->
        <div class="space-y-6">
            <h2 class="text-xl font-bold text-gray-900 border-b-2 border-blue-600 pb-2 mb-8 uppercase tracking-tight">Phần nội dung câu hỏi</h2>
            ${(
              await Promise.all(
                questions.map(async (q, index) => {
                  const options = q.options ? JSON.parse(q.options) : [];

                  return `
                <div class="no-break page-break-inside-avoid border-2 border-gray-50 rounded-2xl p-6 shadow-sm bg-white">
                    <div class="flex gap-4 mb-4">
                        <span class="bg-blue-600 self-start px-3 py-1 rounded-lg text-white font-bold text-sm">Câu ${index + 1}</span>
                        <div class="text-gray-800 leading-relaxed font-semibold text-lg">
                            ${q.question_text}
                        </div>
                    </div>

                    ${
                      q.question_type === 'ESSAY'
                        ? `
                        <div class="mt-4 min-h-[160px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/20"></div>
                        `
                        : `
                        <div class="grid grid-cols-2 gap-4 mt-4 ml-8">
                            ${options
                              .map((opt: any, optIndex: number) => {
                                const charPrefix = String.fromCharCode(
                                  65 + optIndex,
                                );
                                return `
                                <div class="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                                    <span class="flex-none w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm font-bold text-blue-600">${charPrefix}</span>
                                    <div class="text-gray-700 pt-1">${opt.text}</div>
                                </div>
                                `;
                              })
                              .join('')}
                        </div>
                        `
                    }
                </div>
                `;
                }),
              )
            ).join('')}
        </div>

        <!-- Footer -->
        <div class="mt-12 text-center text-gray-400 text-xs border-t pt-4">
            <p>--- Hết ---</p>
            <p>(Cán bộ coi thi không giải thích gì thêm)</p>
        </div>
    </div>

    <script>
        window.addEventListener('load', () => {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\\\(', right: '\\\\)', display: false},
                    {left: '\\\\[', right: '\\\\]', display: true}
                ],
                throwOnError : false
            });
        });
    </script>
</body>
</html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  }
}

function countExamQuestions(exam: SubmissionForPdf['exam']): number {
  if (exam.mode === 'RANDOM_N') {
    return exam.sample_size ?? 0;
  }
  if (
    (exam.mode === 'BY_TYPE' || exam.mode === 'BY_CHAPTER') &&
    exam.distribution
  ) {
    try {
      const parsed: unknown = JSON.parse(exam.distribution);
      if (Array.isArray(parsed)) {
        return parsed.reduce<number>((sum, item: unknown) => {
          const quantity = Number(
            (item as { quantity?: unknown } | null)?.quantity,
          );
          return Number.isFinite(quantity) ? sum + quantity : sum;
        }, 0);
      }
    } catch {
      // Malformed distribution: fall back to the linked question count.
    }
  }
  return exam._count.questions;
}

function parseOptions(raw: unknown): ParsedOption[] {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { text: unknown; isCorrect?: unknown } =>
        typeof item === 'object' && item !== null && 'text' in item,
    )
    .map((item) => ({
      text:
        typeof item.text === 'string' || typeof item.text === 'number'
          ? String(item.text)
          : '',
      isCorrect: item.isCorrect === true,
    }));
}

function formatDuration(start: Date | null, end: Date | null): string {
  if (!start || !end) return 'N/A';
  const minutes = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} giờ ${rest} phút` : `${rest} phút`;
}

function formatStatus(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'IN_PROGRESS':
      return 'Đang làm bài';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

function imageMimeType(name: string): string {
  const extension = name.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_MIME_BY_EXTENSION[extension] ?? 'image/png';
}
