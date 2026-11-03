import {
  PRINT_READY_FLAG,
  escapeHtml,
} from '@/exam-print/exam-print.templates';

export type SubmissionPdfOption = {
  text: string;
  isCorrect: boolean;
  isStudentChoice: boolean;
};

export type SubmissionPdfMedia = {
  name: string;
  kind: 'IMAGE' | 'AUDIO' | 'VIDEO';
  /** Inlined `data:` URL (or allowed https URL) for images; null when unavailable. */
  src: string | null;
};

export type SubmissionPdfQuestion = {
  number: number;
  questionText: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'ESSAY';
  isCorrect: boolean;
  score: string;
  options: SubmissionPdfOption[];
  answer: string | null;
  correctAnswer: string | null;
  media: SubmissionPdfMedia[];
};

export type SubmissionPdfView = {
  examTitle: string;
  topicName: string;
  isPractice: boolean;
  totalScore: string;
  timeTaken: string;
  status: string;
  totalQuestions: number;
  staffView: boolean;
  showQuestions: boolean;
  student: {
    fullName: string;
    email: string;
  };
  submissionId: string;
  submittedAt: string;
  questions: SubmissionPdfQuestion[];
};

const ICON = {
  fileText: (color: string, size = 22) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
  clock: (color: string, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  check: (color: string, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  x: (color: string, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
};

const QUESTION_TYPE: Record<
  SubmissionPdfQuestion['questionType'],
  { label: string; className: string }
> = {
  SINGLE_CHOICE: { label: 'Trắc nghiệm một đáp án', className: 'badge-indigo' },
  MULTIPLE_CHOICE: {
    label: 'Trắc nghiệm nhiều đáp án',
    className: 'badge-violet',
  },
  ESSAY: { label: 'Tự luận', className: 'badge-orange' },
};

const KATEX_HEAD = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap&subset=vietnamese">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">`;

// String.raw keeps the backslashes so the browser receives `\(` / `\[`.
const KATEX_SCRIPT = String.raw`
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
  <script>
    (function () {
      try {
        renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (e) {
        /* CDN unreachable: keep raw LaTeX rather than failing the PDF */
      } finally {
        window.${PRINT_READY_FLAG} = true;
      }
    })();
  </script>`;

/*
 * Mirrors the Tailwind classes of SubmissionResultView (web app) with plain
 * CSS so the PDF needs no CSS framework at render time. Layout is block-based
 * because Chromium honours `break-inside: avoid` reliably on block boxes.
 */
const STYLE = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #111827;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    overflow-wrap: anywhere;
    orphans: 3;
    widows: 3;
  }
  .rich { white-space: pre-wrap; word-break: break-word; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }

  .card { border: 1px solid #d1d5db; border-radius: 12px; background: #fff; overflow: hidden; }
  .card-header { padding: 18px 20px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .card-body { padding: 18px 20px; }
  .title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 4px; }
  .title-row h1 { font-size: 17pt; line-height: 1.25; font-weight: 700; margin: 0; color: #111827; }
  .topic { color: #4b5563; margin: 0 0 0 34px; }
  .score { display: flex; align-items: baseline; gap: 6px; font-size: 22pt; font-weight: 700; color: #0066cc; white-space: nowrap; }
  .score small { font-size: 12pt; font-weight: 500; color: #4b5563; }

  .badge { display: inline-flex; align-items: center; gap: 4px; border: 1px solid; border-radius: 6px; padding: 2px 8px; font-size: 8.5pt; font-weight: 600; line-height: 1.4; white-space: nowrap; }
  .badge svg { flex-shrink: 0; }
  .badge-pill { border-radius: 999px; padding: 3px 10px; font-weight: 700; }
  .badge-sky { border-color: #bae6fd; background: #f0f9ff; color: #0369a1; }
  .badge-violet { border-color: #ddd6fe; background: #f5f3ff; color: #6d28d9; }
  .badge-indigo { border-color: #c7d2fe; background: #eef2ff; color: #4338ca; }
  .badge-orange { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
  .badge-emerald { border-color: #a7f3d0; background: #ecfdf5; color: #047857; }
  .badge-red { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
  .badge-score { border-color: #d1d5db; background: #fff; color: #111827; }

  .identity { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin: 0 0 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; font-size: 9.5pt; }
  .identity dt { color: #6b7280; }
  .identity dd { margin: 0; }
  .identity .strong { font-weight: 600; }

  .stats { display: table; width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 12px 0; margin: 0 -12px; }
  .stat { display: table-cell; vertical-align: middle; padding: 12px 14px; border: 1px solid; border-radius: 8px; }
  .stat-inner { display: flex; align-items: center; gap: 10px; }
  .stat p { margin: 0; }
  .stat .label { font-size: 9pt; color: #4b5563; }
  .stat .value { font-weight: 600; color: #111827; }
  .stat-sky { background: #f0f9ff; border-color: #bae6fd; }
  .stat-emerald { background: #ecfdf5; border-color: #a7f3d0; }
  .stat-violet { background: #f5f3ff; border-color: #ddd6fe; }

  h2.section { font-size: 13pt; font-weight: 600; color: #171717; margin: 22px 0 12px; break-after: avoid; page-break-after: avoid; }

  .question { border: 1px solid; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; }
  .question-correct { border-color: #a7f3d0; background: rgba(236, 253, 245, 0.6); }
  .question-incorrect { border-color: #fecaca; background: rgba(254, 242, 242, 0.6); }
  .question-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
  .question-main { min-width: 0; flex: 1; }
  .question-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
  .question-meta .number { font-weight: 700; color: #111827; }
  .question-text { color: #1f2937; }

  .media { margin-top: 12px; text-align: center; }
  .media img { max-width: 100%; max-height: 70mm; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 8px; }
  .media-note { margin: 6px 0 0; font-size: 9pt; color: #4b5563; font-style: italic; text-align: left; }

  .answers { margin-top: 12px; }
  .option { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid; border-radius: 8px; margin-top: 8px; break-inside: avoid; page-break-inside: avoid; }
  .option:first-child { margin-top: 0; }
  .option .text { min-width: 0; flex: 1; }
  .option-chosen-correct { background: #ecfdf5; border-color: #34d399; color: #064e3b; font-weight: 600; }
  .option-chosen-wrong { background: #fef2f2; border-color: #fca5a5; color: #7f1d1d; font-weight: 600; }
  .option-correct { background: rgba(236, 253, 245, 0.5); border-color: #a7f3d0; color: #065f46; }
  .option-default { background: #fff; border-color: #d1d5db; color: #374151; }
  .option-icon { flex-shrink: 0; display: flex; }
  .option .badge-pill { font-weight: 700; }

  .essay-box { padding: 10px 12px; border: 1px solid; border-radius: 8px; margin-top: 10px; }
  .essay-box:first-child { margin-top: 0; }
  .essay-box .label { margin: 0 0 4px; font-size: 9.5pt; font-weight: 600; }
  .essay-box .content { color: #374151; }
  .essay-student { background: #f0f9ff; border-color: #bae6fd; }
  .essay-student .label { color: #075985; }
  .essay-sample { background: #ecfdf5; border-color: #a7f3d0; }
  .essay-sample .label { color: #065f46; }

  .empty { border: 1px solid #d1d5db; border-radius: 12px; padding: 28px; text-align: center; color: #4b5563; margin-top: 22px; }
  .hidden-note { border: 1px dashed #d1d5db; border-radius: 12px; padding: 16px; text-align: center; color: #4b5563; margin-top: 22px; }
`;

function renderMedia(media: SubmissionPdfMedia[]): string {
  if (media.length === 0) return '';
  const images = media
    .filter((item) => item.kind === 'IMAGE' && item.src)
    .map(
      (item) =>
        `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name || 'Hình ảnh câu hỏi')}">`,
    )
    .join('');
  const notes = media
    .filter((item) => item.kind !== 'IMAGE' || !item.src)
    .map((item) => {
      const name = escapeHtml(item.name || 'Không tên');
      const text =
        item.kind === 'IMAGE'
          ? `Không thể tải hình ảnh: ${name}`
          : `Tệp ${item.kind === 'AUDIO' ? 'âm thanh' : 'video'} (không phát trên bản in): ${name}`;
      return `<p class="media-note">${text}</p>`;
    })
    .join('');
  return `<div class="media">${images}${notes}</div>`;
}

function renderOption(option: SubmissionPdfOption, staffView: boolean): string {
  let variant = 'option-default';
  let icon = '';
  if (option.isStudentChoice && option.isCorrect) {
    variant = 'option-chosen-correct';
    icon = ICON.check('#059669');
  } else if (option.isStudentChoice) {
    variant = 'option-chosen-wrong';
    icon = ICON.x('#dc2626');
  } else if (option.isCorrect) {
    variant = 'option-correct';
    icon = ICON.check('#10b981');
  }
  const choice = option.isStudentChoice
    ? `<span class="badge badge-pill badge-sky">${staffView ? 'Thí sinh chọn' : 'Bạn chọn'}</span>`
    : '';
  return `
    <div class="option ${variant}">
      ${icon ? `<span class="option-icon">${icon}</span>` : ''}
      <div class="text rich">${escapeHtml(option.text)}</div>
      ${choice}
    </div>`;
}

function renderAnswers(
  question: SubmissionPdfQuestion,
  staffView: boolean,
): string {
  if (question.questionType === 'ESSAY') {
    const sample = question.correctAnswer
      ? `
        <div class="essay-box essay-sample">
          <p class="label">Câu trả lời mẫu:</p>
          <div class="content rich">${escapeHtml(question.correctAnswer)}</div>
        </div>`
      : '';
    return `
      <div class="answers">
        <div class="essay-box essay-student">
          <p class="label">${staffView ? 'Câu trả lời của thí sinh:' : 'Câu trả lời của bạn:'}</p>
          <div class="content rich">${escapeHtml(question.answer || 'Không có câu trả lời')}</div>
        </div>
        ${sample}
      </div>`;
  }
  return `
    <div class="answers">
      ${question.options.map((option) => renderOption(option, staffView)).join('')}
    </div>`;
}

function renderQuestion(
  question: SubmissionPdfQuestion,
  staffView: boolean,
): string {
  const type = QUESTION_TYPE[question.questionType];
  const status = question.isCorrect
    ? `<span class="badge badge-emerald">${ICON.check('#047857', 12)}Đúng</span>`
    : `<span class="badge badge-red">${ICON.x('#b91c1c', 12)}Sai</span>`;
  return `
    <section class="question avoid-break ${question.isCorrect ? 'question-correct' : 'question-incorrect'}">
      <div class="question-head">
        <div class="question-main">
          <div class="question-meta">
            <span class="number">Câu ${question.number}:</span>
            ${status}
            ${type ? `<span class="badge ${type.className}">${type.label}</span>` : ''}
          </div>
          <div class="question-text rich">${escapeHtml(question.questionText)}</div>
          ${renderMedia(question.media)}
        </div>
        <span class="badge badge-score">${escapeHtml(question.score)} điểm</span>
      </div>
      ${renderAnswers(question, staffView)}
    </section>`;
}

function renderIdentity(view: SubmissionPdfView): string {
  if (!view.staffView) return '';
  return `
    <dl class="identity">
      <div><dt>Thí sinh</dt><dd class="strong">${escapeHtml(view.student.fullName || '—')}</dd></div>
      <div><dt>Email thí sinh</dt><dd>${escapeHtml(view.student.email || '—')}</dd></div>
      <div><dt>Mã bài làm</dt><dd>${escapeHtml(view.submissionId)}</dd></div>
      <div><dt>Thời điểm nộp bài</dt><dd>${escapeHtml(view.submittedAt || '—')}</dd></div>
    </dl>`;
}

function renderStat(
  variant: string,
  icon: string,
  label: string,
  value: string,
): string {
  return `
    <div class="stat stat-${variant}">
      <div class="stat-inner">
        ${icon}
        <div>
          <p class="label">${label}</p>
          <p class="value">${escapeHtml(value)}</p>
        </div>
      </div>
    </div>`;
}

function renderQuestionsSection(view: SubmissionPdfView): string {
  if (!view.showQuestions) {
    return `<div class="hidden-note">Chi tiết câu trả lời không được công khai đối với bài thi chính thức.</div>`;
  }
  if (view.questions.length === 0) {
    return `<div class="empty">Không có câu hỏi nào trong bài nộp này.</div>`;
  }
  return `
    <h2 class="section">Chi tiết câu trả lời</h2>
    ${view.questions.map((question) => renderQuestion(question, view.staffView)).join('')}`;
}

/**
 * Builds the HTML of a submission result PDF. The markup mirrors the web
 * app's SubmissionResultView; every user-authored string is escaped and
 * LaTeX delimiters are left intact for KaTeX auto-render.
 */
export function renderSubmissionPdfHtml(view: SubmissionPdfView): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(`Kết quả bài thi - ${view.examTitle}`)}</title>
  ${KATEX_HEAD}
  <style>${STYLE}</style>
</head>
<body>
  <article class="card avoid-break">
    <header class="card-header">
      <div style="min-width:0;flex:1;">
        <div class="title-row">
          ${ICON.fileText('#0066cc')}
          <h1>${escapeHtml(view.examTitle)}</h1>
          <span class="badge ${view.isPractice ? 'badge-sky' : 'badge-violet'}">${view.isPractice ? 'Luyện tập' : 'Chính thức'}</span>
        </div>
        <p class="topic">Chủ đề: ${escapeHtml(view.topicName || 'N/A')}</p>
      </div>
      <div class="score">${escapeHtml(view.totalScore)}<small>điểm</small></div>
    </header>
    <div class="card-body">
      ${renderIdentity(view)}
      <div class="stats">
        ${renderStat('sky', ICON.clock('#0369a1'), 'Thời gian làm bài', view.timeTaken)}
        ${renderStat('emerald', ICON.check('#047857'), 'Trạng thái', view.status)}
        ${renderStat('violet', ICON.fileText('#6d28d9', 20), 'Số câu hỏi', String(view.totalQuestions))}
      </div>
    </div>
  </article>
  ${renderQuestionsSection(view)}
  ${KATEX_SCRIPT}
</body>
</html>`;
}
