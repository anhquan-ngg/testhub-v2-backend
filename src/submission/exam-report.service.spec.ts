import { NotFoundException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import type { PrismaService } from '@/prisma/prisma.service';
import { ExamReportService } from './exam-report.service';

jest.mock('puppeteer', () => ({ launch: jest.fn() }));

const submission = {
  student: { full_name: 'Student One', email: 'student@example.test' },
  total_score: 8.5,
  rating: 'GOOD',
  start_time: new Date('2026-11-01T01:00:00Z'),
  end_time: new Date('2026-11-01T01:01:37Z'),
  questions: [{ is_correct: true }, { is_correct: false }],
};

describe('ExamReportService PDF presentation', () => {
  const pdf = Buffer.from('%PDF-test');
  const setContent = jest
    .fn<Promise<void>, [string, { waitUntil: string }]>()
    .mockResolvedValue(undefined);
  const renderPdf = jest.fn().mockResolvedValue(pdf);
  const closePage = jest.fn().mockResolvedValue(undefined);
  const closeBrowser = jest.fn().mockResolvedValue(undefined);
  const newPage = jest.fn();
  const findUnique = jest.fn();
  const findMany = jest.fn();
  let service: ExamReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    findUnique.mockResolvedValue({
      title: 'Sample exam',
      mode: 'MANUAL',
      _count: { questions: 3 },
    });
    findMany.mockResolvedValue([submission]);
    newPage.mockResolvedValue({
      setContent,
      pdf: renderPdf,
      close: closePage,
    });
    jest.mocked(puppeteer.launch).mockResolvedValue({
      connected: true,
      newPage,
      close: closeBrowser,
    } as unknown as puppeteer.Browser);
    service = new ExamReportService({
      exam: { findUnique },
      submission: { findMany },
    } as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function generate() {
    const result = service.generateExamReportPdf('exam-id');
    await jest.runAllTimersAsync();
    expect(await result).toEqual(pdf);
    return String(setContent.mock.calls[0][0]);
  }

  it('keeps the queries, values and Puppeteer download payload unchanged', async () => {
    const html = await generate();
    expect(findMany).toHaveBeenCalledWith({
      where: { exam_id: 'exam-id', status: 'COMPLETED' },
      include: { student: true, questions: { include: { question: true } } },
      orderBy: { created_at: 'desc' },
    });
    expect(html).toContain('Student One');
    expect(html).toContain('student@example.test');
    expect(html).toContain('<td class="score">8.50</td>');
    expect(html).toMatch(/class="duration">[\s\S]*?1 phút 37 giây<\/td>/);
    expect(html).toContain('class="rating rating-good">Tốt</span>');
    for (const kind of ['correct', 'incorrect', 'skipped']) {
      expect(html).toContain(`<td class="count ${kind}">1</td>`);
    }
    expect(html).toContain('Bài thi: Sample exam - Tổng số lượt thi: 1');
    expect(setContent).toHaveBeenCalledWith(html, {
      waitUntil: 'networkidle0',
    });
    expect(renderPdf).toHaveBeenCalledWith({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });
    expect(closePage).toHaveBeenCalledTimes(1);
  });

  it('matches the results page card with self-contained print-safe styling', async () => {
    const html = await generate();
    expect(html).toContain('<h1>Báo cáo kết quả</h1>');
    expect(html).toContain('class="results-card"');
    expect(html).toContain('class="section-icon"');
    expect(html).toContain('color: #0066cc');
    expect(html).toMatch(
      /class="student-details">[\s\S]*?class="student-name">Student One[\s\S]*?class="student-email">student@example.test/,
    );
    expect(html).not.toContain('brand-mark');
    expect(html).toContain('display: table-header-group');
    expect(html).toContain('page-break-inside: avoid');
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('print-color-adjust: exact');
    expect(html).not.toMatch(/<script|<link|https?:\/\//);
    expect(html.match(/<th scope="col"/g)).toHaveLength(7);
  });

  it('renders all rating palettes, fallback values and an empty report', async () => {
    findMany.mockResolvedValue(
      ['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR', null].map((rating) => ({
        ...submission,
        rating,
        student: null,
        total_score: null,
        start_time: null,
        end_time: null,
      })),
    );
    const html = await generate();
    for (const kind of [
      'excellent',
      'good',
      'average',
      'poor',
      'unavailable',
    ]) {
      expect(html).toContain(`class="rating rating-${kind}"`);
    }
    expect(html).toContain('<td class="score">0.00</td>');
    expect(html).toMatch(/class="duration">[\s\S]*? N\/A<\/td>/);
    for (const label of ['Xuất sắc', 'Tốt', 'Trung bình', 'Yếu', 'N/A']) {
      expect(html).toContain(`>${label}</span>`);
    }
    setContent.mockClear();
    findMany.mockResolvedValue([]);
    const emptyHtml = await generate();
    expect(emptyHtml).toContain('colspan="7">Chưa có kết quả làm bài.');
    expect(emptyHtml).toContain('Bài thi: Sample exam - Tổng số lượt thi: 0');
  });

  it('keeps user-provided text from becoming report markup', async () => {
    findUnique.mockResolvedValue({
      title: 'Exam <img src=x> & report',
      mode: 'MANUAL',
      _count: { questions: 3 },
    });
    findMany.mockResolvedValue([
      {
        ...submission,
        student: { full_name: '<b>Name</b>', email: 'a&b@test' },
      },
    ]);
    const html = await generate();
    expect(html).toContain('Exam &lt;img src=x&gt; &amp; report');
    expect(html).toContain('&lt;b&gt;Name&lt;/b&gt;');
    expect(html).toContain('a&amp;b@test');
    expect(html).not.toContain('<img src=x>');
  });

  it('reuses the browser and closes it on module shutdown', async () => {
    await generate();
    await generate();
    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    expect(newPage).toHaveBeenCalledTimes(2);
    await service.onModuleDestroy();
    expect(closeBrowser).toHaveBeenCalledTimes(1);
  });

  it('preserves the not-found response without launching Chromium', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.generateExamReportPdf('missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(puppeteer.launch).not.toHaveBeenCalled();
  });
});
