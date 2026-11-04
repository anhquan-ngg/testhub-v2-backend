import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as puppeteer from 'puppeteer';
import { escapeHtml } from '@/exam-print/exam-print.templates';

@Injectable()
export class ExamReportService implements OnModuleDestroy {
  private browser: puppeteer.Browser | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

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
        case 'BY_CHAPTER':
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
      return `${minutes} phút ${seconds} giây`;
    };

    const getRatingClass = (rating: string | null) => {
      switch (rating) {
        case 'EXCELLENT':
          return 'rating-excellent';
        case 'GOOD':
          return 'rating-good';
        case 'AVERAGE':
          return 'rating-average';
        case 'POOR':
          return 'rating-poor';
        default:
          return 'rating-unavailable';
      }
    };

    const ratingLabels: Record<string, string> = {
      EXCELLENT: 'Xuất sắc',
      GOOD: 'Tốt',
      AVERAGE: 'Trung bình',
      POOR: 'Yếu',
    };
    const icons = {
      history: '<circle cx="12" cy="12" r="9"/><path d="M3 3v6h6M12 7v5l3 2"/>',
      user: '<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      correct: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
      incorrect: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
      skipped: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>',
    };
    const icon = (name: keyof typeof icons) =>
      `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo cáo bài thi - ${escapeHtml(exam.title)}</title>
    <style>
        /* Mirrors the web design tokens without a runtime CSS/font CDN. */
        :root {
            --accent-100: #eef6ff;
            --accent-200: #d6ebff;
            --accent-600: #597ea3;
            --accent-700: #416180;
            --accent-800: #2c455d;
            --neutral-50: #fafafb;
            --neutral-100: #f5f5f8;
            --neutral-200: #e7e7ea;
            --neutral-600: #7a7a7d;
            --neutral-900: #2b2b2d;
        }
        * { box-sizing: border-box; }
        @page { size: A4 landscape; }
        html, body { margin: 0; padding: 0; }
        body {
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: var(--neutral-900);
            background: var(--neutral-100);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        main { padding: 16px; }
        .report-header { margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid; }
        h1 { margin: 0 0 4px; font-size: 17pt; line-height: 1.3; font-weight: 700; }
        .exam-title { margin: 0; color: #98989b; font-size: 9pt; overflow-wrap: anywhere; }
        .results-card {
            padding: 20px; border: 1px solid #d4d4d7; border-radius: 12px;
            background: #fff; box-shadow: 0 1px 2px #0000000d;
        }
        .results-heading {
            display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
            break-after: avoid; page-break-after: avoid;
        }
        .section-icon {
            display: inline-flex; align-items: center; justify-content: center;
            width: 24px; height: 24px; border-radius: 6px; color: #059669; background: #ecfdf5;
        }
        svg { width: 13px; height: 13px; vertical-align: middle; flex-shrink: 0; }
        .section-icon svg { width: 15px; height: 15px; }
        h2 { margin: 0; font-size: 11pt; font-weight: 600; }
        table { width: 100%; table-layout: fixed; border-spacing: 0; border-collapse: collapse; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; page-break-after: auto; }
        th, td { padding: 10px 8px; text-align: center; vertical-align: middle; overflow-wrap: anywhere; }
        th { background: #f8f9fb; font-weight: 500; font-size: 8.5pt; border-bottom: 1px solid var(--neutral-200); }
        td { border-bottom: 1px solid #f0f0f3; font-size: 9pt; background: #fcfcfe; }
        tbody tr:last-child td { border-bottom: 0; }
        .text-left { text-align: left; }
        .student { display: flex; align-items: center; gap: 8px; }
        .student > svg { color: #98989b; }
        .student-details { min-width: 0; }
        .student-name { font-weight: 500; }
        .student-email { color: #98989b; font-size: 8pt; }
        .duration { color: #424244; font-size: 8.5pt; }
        .duration svg { color: #98989b; margin-right: 3px; }
        .score { font-weight: 700; color: #0066cc; font-variant-numeric: tabular-nums; }
        .count { font-weight: 500; font-variant-numeric: tabular-nums; }
        .correct { color: #059669; }
        .incorrect { color: #dc2626; }
        .skipped { color: var(--neutral-600); }
        .rating { display: inline-block; padding: 1px 7px; border: 1px solid; border-radius: 5px; font-size: 8pt; font-weight: 500; line-height: 1.4; }
        .rating-excellent { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .rating-good { color: var(--accent-700); background: var(--accent-100); border-color: var(--accent-200); }
        .rating-average { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .rating-poor { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .rating-unavailable { color: var(--neutral-600); background: var(--neutral-100); border-color: var(--neutral-200); }
        .empty-state { padding: 32px 16px; text-align: center; color: var(--neutral-600); }
    </style>
</head>
<body>
    <main>
        <header class="report-header">
            <h1>Báo cáo kết quả</h1>
            <p class="exam-title">Bài thi: ${escapeHtml(exam.title)} - Tổng số lượt thi: ${submissions.length}</p>
        </header>
        <section class="results-card" aria-labelledby="results-title">
        <div class="results-heading">
            <span class="section-icon">${icon('history')}</span>
            <h2 id="results-title">Danh sách kết quả làm bài</h2>
        </div>
        <table aria-label="Danh sách kết quả làm bài">
            <colgroup>
                <col style="width: 31%">
                <col style="width: 10%">
                <col style="width: 17%">
                <col style="width: 15%">
                <col style="width: 9%">
                <col style="width: 9%">
                <col style="width: 9%">
            </colgroup>
            <thead>
                <tr>
                    <th scope="col" class="text-left">Họ tên</th>
                    <th scope="col">Điểm</th>
                    <th scope="col">Thời gian</th>
                    <th scope="col">Xếp loại</th>
                    <th scope="col" class="correct">${icon('correct')} Đúng</th>
                    <th scope="col" class="incorrect">${icon('incorrect')} Sai</th>
                    <th scope="col" class="skipped">${icon('skipped')} Bỏ qua</th>
                </tr>
            </thead>
            <tbody>
                ${submissions
                  .map((sub) => {
                    const stats = calculateStats(sub);
                    const ratingClass = getRatingClass(sub.rating);

                    return `
                    <tr>
                        <td class="text-left">
                            <div class="student">${icon('user')}<div class="student-details">
                                <div class="student-name">${escapeHtml(sub.student?.full_name || 'N/A')}</div>
                                <div class="student-email">${escapeHtml(sub.student?.email || 'N/A')}</div>
                            </div></div>
                        </td>
                        <td class="score">${Number(sub.total_score || 0).toFixed(2)}</td>
                        <td class="duration">${icon('clock')} ${calculateTimeTaken(sub.start_time, sub.end_time)}</td>
                        <td><span class="rating ${ratingClass}">${escapeHtml(sub.rating ? ratingLabels[sub.rating] || sub.rating : 'N/A')}</span></td>
                        <td class="count correct">${stats.correct}</td>
                        <td class="count incorrect">${stats.incorrect}</td>
                        <td class="count skipped">${stats.skipped}</td>
                    </tr>
                `;
                  })
                  .join('')}
                ${submissions.length === 0 ? '<tr><td class="empty-state" colspan="7">Chưa có kết quả làm bài.</td></tr>' : ''}
            </tbody>
        </table>
        </section>
    </main>
</body>
</html>
    `;

    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await this.browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });

    await page.close();

    return Buffer.from(pdfBuffer);
  }
}
