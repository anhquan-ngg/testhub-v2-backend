import { QuestionType } from '@prisma/client';
import type {
  ExamVariant,
  PrintedQuestion,
  PrintExamInfo,
} from './exam-print.types';
import { optionLetter } from './exam-print.variants';

/** Global flag the page sets once math rendering has finished (or failed). */
export const PRINT_READY_FLAG = '__PRINT_READY__';

/** Options shorter than this print two per row; longer ones get a full row. */
const SHORT_OPTION_MAX_CHARS = 38;
const ESSAY_ANSWER_LINES = 8;

/**
 * Escapes text for safe interpolation into HTML. Question content is plain
 * text + LaTeX (the web app renders it the same way), so nothing authored by
 * users is ever interpreted as markup inside the headless browser.
 */
export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const KATEX_HEAD = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap&subset=vietnamese">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">`;

// String.raw keeps the backslashes intact so the page receives '\\(' and
// the delimiter strings are `\(` / `\[` once evaluated by the browser.
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
        /* CDN unreachable: print raw LaTeX rather than failing the run */
      } finally {
        window.${PRINT_READY_FLAG} = true;
      }
    })();
  </script>`;

const BASE_STYLE = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Noto Serif', 'Times New Roman', 'DejaVu Serif', serif;
    font-size: 12.5pt;
    line-height: 1.45;
    color: #000;
    background: #fff;
  }
  .rich { white-space: pre-wrap; word-break: break-word; }
  .header { display: flex; justify-content: space-between; gap: 16px; text-align: center; }
  .header .left { flex: 0 0 42%; }
  .header .right { flex: 1; }
  .header .org { font-weight: 700; text-transform: uppercase; }
  .header .title { font-weight: 700; font-size: 13.5pt; text-transform: uppercase; }
  .header .rule { width: 40%; margin: 4px auto 0; border-top: 1px solid #000; }
  .italic { font-style: italic; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
`;

function renderHeader(info: PrintExamInfo, heading: string): string {
  return `
    <div class="header">
      <div class="left">
        <div class="org">${escapeHtml(info.school || 'Hội đồng thi')}</div>
        <div>Học phần: <strong>${escapeHtml(info.topic_name)}</strong></div>
        <div>Giảng viên: ${escapeHtml(info.lecturer_name)}</div>
        <div class="rule"></div>
      </div>
      <div class="right">
        <div class="title">${escapeHtml(heading)}</div>
        <div class="title">${escapeHtml(info.title)}</div>
        <div>Thời gian làm bài: <strong>${info.duration} phút</strong></div>
        <div class="italic">(không kể thời gian phát đề)</div>
      </div>
    </div>`;
}

function renderQuestion(question: PrintedQuestion): string {
  const hint =
    question.question_type === QuestionType.MULTIPLE_CHOICE
      ? ' <span class="italic">(Chọn tất cả các đáp án đúng)</span>'
      : question.question_type === QuestionType.ESSAY
        ? ' <span class="italic">(Tự luận)</span>'
        : '';

  const images = question.image_urls
    .map(
      (url) =>
        `<img class="q-image" src="${escapeHtml(url)}" alt="" onerror="this.remove()">`,
    )
    .join('');

  const mediaNote = question.has_unprintable_media
    ? '<p class="italic media-note">(Câu hỏi có tệp âm thanh/video đính kèm — cán bộ coi thi phát riêng.)</p>'
    : '';

  let body: string;
  if (question.question_type === QuestionType.ESSAY) {
    body = `<div class="answer-lines">${'<div class="line"></div>'.repeat(ESSAY_ANSWER_LINES)}</div>`;
  } else {
    const compact = question.options.every(
      (text) => text.length <= SHORT_OPTION_MAX_CHARS,
    );
    body = `
      <div class="options ${compact ? 'two-col' : ''}">
        ${question.options
          .map(
            (text, i) =>
              `<div class="option"><strong>${optionLetter(i)}.</strong> <span class="rich">${escapeHtml(text)}</span></div>`,
          )
          .join('')}
      </div>`;
  }

  return `
    <section class="question">
      <div class="stem"><strong>Câu ${question.number}.</strong>${hint} <span class="rich">${escapeHtml(question.question_text)}</span></div>
      ${images}
      ${mediaNote}
      ${body}
    </section>`;
}

/** Full HTML document for one printable exam variant. */
export function renderVariantHtml(
  info: PrintExamInfo,
  variant: ExamVariant,
): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(info.title)} - Mã đề ${variant.code}</title>
  ${KATEX_HEAD}
  <style>
    ${BASE_STYLE}
    .meta { display: flex; align-items: stretch; gap: 16px; margin: 18px 0 6px; }
    .candidate { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
    .fill { display: flex; gap: 6px; }
    .fill .dots { flex: 1; border-bottom: 1px dotted #000; }
    .code-box { border: 1.5px solid #000; padding: 6px 18px; text-align: center; min-width: 110px; }
    .code-box .code { font-size: 20pt; font-weight: 700; letter-spacing: 2px; }
    .summary { margin: 4px 0 14px; font-style: italic; }
    .question { margin-bottom: 12px; break-inside: avoid; }
    .stem { text-align: justify; }
    .options { display: grid; grid-template-columns: 1fr; gap: 3px 24px; margin: 4px 0 0 24px; }
    .options.two-col { grid-template-columns: 1fr 1fr; }
    .q-image { display: block; max-width: 70%; max-height: 260px; margin: 6px auto; }
    .media-note { margin: 4px 0 0 24px; font-size: 11pt; }
    .answer-lines { margin: 6px 0 0 24px; }
    .answer-lines .line { height: 26px; border-bottom: 1px dotted #555; }
    .end { text-align: center; font-weight: 700; margin-top: 24px; }
    .end-note { text-align: center; font-style: italic; font-size: 11pt; }
  </style>
</head>
<body>
  ${renderHeader(info, 'Đề thi')}
  <div class="meta">
    <div class="candidate">
      <div class="fill"><span>Họ và tên thí sinh:</span><span class="dots"></span></div>
      <div class="fill"><span>Mã số sinh viên:</span><span class="dots"></span><span>Phòng thi:</span><span class="dots"></span></div>
    </div>
    <div class="code-box">
      <div>Mã đề</div>
      <div class="code">${variant.code}</div>
    </div>
  </div>
  <div class="summary">Đề thi gồm ${variant.questions.length} câu hỏi.</div>
  ${variant.questions.map(renderQuestion).join('')}
  <div class="end">——— HẾT ———</div>
  <div class="end-note">Cán bộ coi thi không giải thích gì thêm.</div>
  ${KATEX_SCRIPT}
</body>
</html>`;
}

function answerCell(question: PrintedQuestion | undefined): string {
  if (!question) return '';
  if (question.question_type === QuestionType.ESSAY) return 'TL';
  return question.correct_letters.length > 0
    ? question.correct_letters.join(', ')
    : '—';
}

/**
 * Full HTML document for the answer key covering every variant: a
 * question × variant grid for choice questions, then the sample answers of
 * essay questions listed per variant.
 */
export function renderAnswerKeyHtml(
  info: PrintExamInfo,
  variants: readonly ExamVariant[],
): string {
  const rowCount = Math.max(0, ...variants.map((v) => v.questions.length));
  const rows = Array.from({ length: rowCount }, (_, i) => {
    const cells = variants
      .map((v) => `<td>${escapeHtml(answerCell(v.questions[i]))}</td>`)
      .join('');
    return `<tr><th>${i + 1}</th>${cells}</tr>`;
  }).join('');

  const essaySections = variants
    .map((variant) => {
      const essays = variant.questions.filter(
        (q) => q.question_type === QuestionType.ESSAY,
      );
      if (essays.length === 0) return '';
      return `
        <div class="essay-block">
          <h3>Mã đề ${variant.code}</h3>
          ${essays
            .map(
              (q) => `
            <div class="essay">
              <strong>Câu ${q.number}.</strong>
              <span class="rich">${q.correct_answer ? escapeHtml(q.correct_answer) : '<em>(Chưa có đáp án mẫu)</em>'}</span>
            </div>`,
            )
            .join('')}
        </div>`;
    })
    .join('');

  const hasEssay = essaySections.trim().length > 0;
  const hasMissingKey = variants.some((v) =>
    v.questions.some(
      (q) =>
        q.question_type !== QuestionType.ESSAY &&
        q.correct_letters.length === 0,
    ),
  );

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Đáp án - ${escapeHtml(info.title)}</title>
  ${KATEX_HEAD}
  <style>
    ${BASE_STYLE}
    .confidential { text-align: center; font-weight: 700; margin: 14px 0 10px; letter-spacing: 1px; }
    th { background: #eee; }
    tbody th { width: 60px; }
    .legend { font-size: 11pt; font-style: italic; margin-top: 6px; }
    h2 { font-size: 13pt; margin: 22px 0 8px; text-transform: uppercase; }
    h3 { font-size: 12.5pt; margin: 14px 0 6px; }
    .essay { margin: 0 0 8px 12px; }
    .essay-block { break-inside: avoid-page; }
  </style>
</head>
<body>
  ${renderHeader(info, 'Đáp án đề thi')}
  <div class="confidential">TÀI LIỆU MẬT — CHỈ DÀNH CHO CÁN BỘ CHẤM THI</div>
  <table>
    <thead>
      <tr><th>Câu</th>${variants.map((v) => `<th>Mã ${v.code}</th>`).join('')}</tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="legend">
    ${hasEssay ? 'TL: câu tự luận — xem đáp án mẫu bên dưới. ' : ''}
    ${hasMissingKey ? '—: câu hỏi chưa được đánh dấu đáp án đúng trong ngân hàng câu hỏi.' : ''}
  </div>
  ${hasEssay ? `<h2>Đáp án mẫu phần tự luận</h2>${essaySections}` : ''}
  ${KATEX_SCRIPT}
</body>
</html>`;
}
