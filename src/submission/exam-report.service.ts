import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { INTERNAL_PRISMA_CLIENT } from '@/prisma/prisma.module';
import { PrismaClient } from '../../generated/prisma-client';
import * as puppeteer from 'puppeteer';

type EnhancedPrismaClient = Omit<
  PrismaClient,
  '$use' | '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

@Injectable()
export class ExamReportService {
  constructor(
    @Inject(INTERNAL_PRISMA_CLIENT)
    private readonly prisma: EnhancedPrismaClient,
  ) {}

  async generateExamReportPdf(examId: string): Promise<Buffer> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
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

    const submissions = await this.prisma.submission.findMany({
      where: { exam_id: examId, status: 'COMPLETED' },
      include: {
        student: true,
        questions: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const getDistributionQuestions = (distributions: any) => {
      if (!distributions) return 0;
      const parsedDistribution = JSON.parse(distributions);
      let res = 0;
      for (let i = 0; i < parsedDistribution.length; i++) {
        res += parsedDistribution[i].quantity;
      }
      return res;
    };

    const calculateTotalQuestions = (ex: typeof exam): number => {
      // @ts-ignore
      const mode = ex.mode;
      switch (mode) {
        case 'RANDOM_N':
          // @ts-ignore
          return ex.sample_size;
        case 'BY_TYPE':
          // @ts-ignore
          return getDistributionQuestions(ex.distribution);
        default:
          // @ts-ignore
          return ex._count.questions;
      }
    };

    const totalQuestions = calculateTotalQuestions(exam);

    const calculateStats = (submission: any) => {
      let correct = 0;
      let incorrect = 0;

      submission.questions?.forEach((sq: any) => {
        if (sq.is_correct) {
          correct++;
        } else {
          incorrect++;
        }
      });

      const skipped = totalQuestions - correct - incorrect;

      return { correct, incorrect, skipped };
    };

    const calculateTimeTaken = (start: Date | null, end: Date | null) => {
      if (!start || !end) return 'N/A';
      const diff = new Date(end).getTime() - new Date(start).getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return `${minutes}p ${seconds}s`;
    };

    const getRatingColor = (rating: string | null) => {
      switch (rating) {
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

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo cáo bài thi - ${exam.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: white; color: #111827; }
        @page { size: A4 landscape; margin: 1cm; }
        table { page-break-inside: avoid; }
        tr { page-break-inside: avoid; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-full mx-auto space-y-6">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Báo cáo kết quả thi</h1>
            <p class="text-lg text-gray-600">Bài thi: <strong>${exam.title}</strong></p>
            <p class="text-sm text-gray-500">Tổng số lượt thi: ${submissions.length}</p>
        </div>

        <!-- Table -->
        <table class="w-full border-collapse border border-gray-300">
            <thead>
                <tr class="bg-gray-100">
                    <th class="border border-gray-300 px-4 py-3 text-left">Họ tên</th>
                    <th class="border border-gray-300 px-4 py-3 text-left">Email</th>
                    <th class="border border-gray-300 px-4 py-3 text-center">Điểm</th>
                    <th class="border border-gray-300 px-4 py-3 text-center">Thời gian</th>
                    <th class="border border-gray-300 px-4 py-3 text-center">Xếp loại</th>
                    <th class="border border-gray-300 px-4 py-3 text-center text-green-600">Đúng</th>
                    <th class="border border-gray-300 px-4 py-3 text-center text-red-600">Sai</th>
                    <th class="border border-gray-300 px-4 py-3 text-center text-gray-600">Bỏ qua</th>
                </tr>
            </thead>
            <tbody>
                ${submissions
                  .map((sub: any) => {
                    const stats = calculateStats(sub);
                    const ratingColor = getRatingColor(sub.rating);

                    return `
                    <tr class="hover:bg-gray-50">
                        <td class="border border-gray-300 px-4 py-3 font-medium">${sub.student?.full_name || 'N/A'}</td>
                        <td class="border border-gray-300 px-4 py-3 text-sm text-gray-600">${sub.student?.email || 'N/A'}</td>
                        <td class="border border-gray-300 px-4 py-3 text-center font-bold text-blue-700">${Number(sub.total_score || 0).toFixed(2)}</td>
                        <td class="border border-gray-300 px-4 py-3 text-center text-sm">${calculateTimeTaken(sub.start_time, sub.end_time)}</td>
                        <td class="border border-gray-300 px-4 py-3 text-center">
                            <span style="background-color: ${ratingColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                                ${sub.rating || 'N/A'}
                            </span>
                        </td>
                        <td class="border border-gray-300 px-4 py-3 text-center font-semibold text-green-600">${stats.correct}</td>
                        <td class="border border-gray-300 px-4 py-3 text-center font-semibold text-red-600">${stats.incorrect}</td>
                        <td class="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-500">${stats.skipped}</td>
                    </tr>
                `;
                  })
                  .join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  }
}
