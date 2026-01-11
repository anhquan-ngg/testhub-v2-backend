import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { INTERNAL_PRISMA_CLIENT } from '@/prisma/prisma.module';
import { PrismaClient } from '../../generated/prisma-client';
import * as puppeteer from 'puppeteer';

type EnhancedPrismaClient = Omit<
  PrismaClient,
  '$use' | '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

@Injectable()
export class PdfService {
  constructor(
    @Inject(INTERNAL_PRISMA_CLIENT)
    private readonly prisma: EnhancedPrismaClient,
  ) {}

  async generateSubmissionPdf(submissionId: string): Promise<Buffer> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: {
          include: {
            _count: {
              select: {
                questions: true,
              },
            },
          },
        },
        student: true,
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const getDistributionQuestions = (distributions: any) => {
      if (!distributions) return 0;
      const parsedDistribution = JSON.parse(distributions);
      let res = 0;
      for (let i = 0; i < parsedDistribution.length; i++) {
        res += parsedDistribution[i].quantity;
      }
      return res;
    };

    const calculateTotalQuestions = (sub: typeof submission): number => {
      // @ts-ignore
      const mode = sub.exam.mode;
      switch (mode) {
        case 'RANDOM_N':
          // @ts-ignore
          return sub.exam.sample_size;
        case 'BY_TYPE':
          // @ts-ignore
          return getDistributionQuestions(sub.exam.distribution);
        default:
          // @ts-ignore
          return sub.exam._count.questions;
      }
    };

    const totalQuestions = calculateTotalQuestions(submission);

    const calculateTimeTaken = (start: Date | null, end: Date | null) => {
      if (!start || !end) return 'N/A';
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      return hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
    };

    const timeTaken = calculateTimeTaken(
      submission.start_time,
      submission.end_time,
    );
    const score =
      submission.total_score !== null
        ? Number(submission.total_score).toFixed(2)
        : '0.00';
    const rating = submission.rating || 'N/A';

    const getRatingColor = (r: string | null) => {
      switch (r) {
        case 'EXCELLENT':
          return '#22c55e';
        case 'GOOD':
          return '#3b82f6';
        case 'AVERAGE':
          return '#eab308';
        case 'POOR':
          return '#ef4444';
        default:
          return '#6b7280';
      }
    };

    const ratingColor = getRatingColor(submission.rating);

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kết quả bài thi - ${submission.student?.full_name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: white; color: #111827; }
        .math-content { display: inline-block; }
        @page { size: A4; margin: 1cm; }
        @media print {
            .no-break { break-inside: avoid; }
        }
    </style>
</head>
<body class="p-4">
    <div class="max-w-4xl mx-auto space-y-8">
        <!-- Header -->
        <div class="bg-[#0066cc] p-8 rounded-2xl text-white shadow-lg overflow-hidden relative">
            <div class="relative z-10 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold mb-2">${submission.student?.full_name}</h1>
                    <p class="text-blue-100 flex items-center gap-2 mb-4">
                       ${submission.student?.email}
                    </p>
                    <div class="flex flex-wrap gap-4">
                        <div class="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-sm">
                            Bài thi: <strong>${submission.exam.title}</strong>
                        </div>
                        <div class="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-sm">
                            Xếp loại: <span style="background-color: ${ratingColor}" class="px-2 py-0.5 rounded text-xs font-bold">${rating}</span>
                        </div>
                    </div>
                </div>
                <div class="text-center bg-white/10 p-6 rounded-2xl border border-white/20 min-w-[140px]">
                    <div class="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Tổng điểm</div>
                    <div class="text-5xl font-black">${score}</div>
                </div>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-3 gap-6">
            <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div class="text-xs font-bold text-gray-500 uppercase mb-1">Thời gian làm bài</div>
                <div class="font-bold text-gray-900">${timeTaken}</div>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div class="text-xs font-bold text-gray-500 uppercase mb-1">Trạng thái</div>
                <div class="font-bold text-gray-900">${submission.status === 'COMPLETED' ? 'Hoàn thành' : submission.status}</div>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div class="text-xs font-bold text-gray-500 uppercase mb-1">Số câu hỏi</div>
                <div class="font-bold text-gray-900">${totalQuestions}</div>
            </div>
        </div>

        <!-- Questions -->
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 pb-2">Chi tiết câu trả lời</h2>
            ${submission.questions
              .map((sq: any, index: number) => {
                const options = sq.question.options
                  ? JSON.parse(sq.question.options)
                  : [];
                const studentAnswers = sq.options ? JSON.parse(sq.options) : [];

                const qScore =
                  sq.score !== null
                    ? Number((sq.score * 10) / totalQuestions).toFixed(2)
                    : '0.00';

                return `
                <div class="no-break border-2 rounded-2xl p-6 shadow-sm ${sq.is_correct ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/20'}">
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex items-center gap-3">
                            <span class="text-lg font-bold">Câu ${index + 1}:</span>
                            <span class="px-3 py-1 rounded-lg text-xs font-bold text-white ${sq.is_correct ? 'bg-green-500' : 'bg-red-500'}">
                                ${sq.is_correct ? 'Đúng' : 'Sai'}
                            </span>
                        </div>
                        <div class="bg-white px-4 py-1.5 rounded-full border border-gray-300 shadow-sm text-sm font-bold">
                            ${qScore} điểm
                        </div>
                    </div>
                    
                    <div class="text-lg font-medium text-gray-800 mb-6">
                        ${sq.question.question_text}
                    </div>

                    ${
                      sq.question.question_type === 'ESSAY'
                        ? `
                        <div class="space-y-4">
                            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <p class="text-xs font-bold text-gray-400 uppercase mb-2">Câu trả lời của thí sinh:</p>
                                <p class="text-gray-700 whitespace-pre-wrap">${sq.answer || 'Không có câu trả lời'}</p>
                            </div>
                            <div class="bg-green-50 p-4 rounded-xl border border-green-200">
                                <p class="text-xs font-bold text-green-700 uppercase mb-2">Đáp án mẫu:</p>
                                <div class="text-gray-800">${sq.question.correct_answer || ''}</div>
                            </div>
                        </div>
                    `
                        : `
                        <div class="grid grid-cols-1 gap-3">
                            ${options
                              .map((opt: any) => {
                                const isChoice = studentAnswers.some(
                                  (so: any) =>
                                    so.text === opt.text &&
                                    so.isCorrect === true,
                                );
                                const isCorrect = opt.isCorrect === true;

                                let classes = 'border-gray-100 bg-white';
                                if (isCorrect)
                                  classes =
                                    'border-green-400 bg-green-50 text-green-900';

                                return `
                                <div class="flex items-center justify-between p-4 rounded-xl border-2 shadow-sm ${classes}">
                                    <div class="flex items-center gap-3">
                                        ${isCorrect ? `<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>` : ''}
                                        <div class="font-medium">${opt.text}</div>
                                    </div>
                                    ${
                                      isChoice
                                        ? `
                                        <span class="px-3 py-1.5 bg-white border border-gray-300 rounded-full text-[10px] font-bold uppercase tracking-tight text-gray-900 shadow-sm">
                                            Thí sinh chọn
                                        </span>
                                    `
                                        : ''
                                    }
                                </div>
                              `;
                              })
                              .join('')}
                        </div>
                    `
                    }
                </div>
              `;
              })
              .join('')}
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

  async generateBlankExamPdf(examId: string): Promise<Buffer> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        lecturer: true,
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
            ORDER BY RANDOM()
            LIMIT ${dist.quantity}
          `;
          questions.push(...questionsData);
        }
      }
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
                            Học phần: <strong>${exam.topic}</strong>
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
            ${questions
              .map((q, index) => {
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
                      q.image_url
                        ? `
                        <div class="my-6 flex justify-center">
                            <img src="${q.image_url}" class="max-w-[100%] max-h-[400px] object-contain rounded-xl border border-gray-100 shadow-lg" />
                        </div>
                        `
                        : ''
                    }

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
              })
              .join('')}
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
