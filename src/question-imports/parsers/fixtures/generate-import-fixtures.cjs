/* Maintained fixture builder: edit the published templates, never call an import parser. */
const fs = require('node:fs/promises');
const path = require('node:path');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { load } = require('cheerio');
const { questions } = require('./import-expected.json');
const root = __dirname;
const fields = (q) => ({
  code: q.sourceCode,
  chapter: q.chapterName,
  question_type: q.questionType,
  question_format: q.questionFormat,
  question_text: q.questionText,
  ...Object.fromEntries(
    'ABCDEF'
      .split('')
      .map((key) => [
        `option_${key.toLowerCase()}`,
        q.options.find((o) => o.key === key)?.text ?? '',
      ]),
  ),
  correct_keys: q.options
    .filter((o) => o.isCorrect)
    .map((o) => o.key.toLowerCase())
    .join('; '),
  essay_answer: q.correctAnswer ?? '',
  image: q.imageCount ? 'Embedded image' : '',
});
const variants = [
  'mixed',
  'single',
  'unknown-answer',
  'missing-answer-option',
  'missing-header',
  'missing-code',
  'duplicate-field',
  'incomplete-row',
  'empty',
  'multiple-images',
  'blank-row',
  'no-answer',
  'invalid-type',
  'long-rich',
  'duplicate-questions',
];
function variantFields(q, i, variant) {
  const data = fields(q);
  if (i === 0 && variant === 'unknown-answer') data.correct_keys = 'C,Z';
  if (i === 0 && variant === 'missing-answer-option') data.correct_keys = 'A,B';
  if (i === 0 && variant === 'no-answer') data.correct_keys = '';
  if (i === 0 && variant === 'invalid-type') data.question_type = 'TRUE_FALSE';
  if (i === 0 && variant === 'long-rich')
    data.question_text =
      q.questionText +
      '\n' +
      'Nội dung dài — giữ nguyên dấu tiếng Việt. '.repeat(250).trimEnd();
  return data;
}
async function excel(variant) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(path.join(root, 'question-import-template.xlsx'));
  const sheet = book.getWorksheet('Questions');
  const headers = [];
  sheet.getRow(1).eachCell((c, n) => {
    headers[n] = c.text;
  });
  for (let n = 2; n <= sheet.rowCount; n++)
    sheet.getRow(n).eachCell((c) => {
      c.value = null;
    });
  const rows =
    variant === 'empty'
      ? []
      : variant === 'single'
        ? questions.slice(0, 1)
        : questions;
  rows.forEach((q, i) => {
    const data = variantFields(q, i, variant);
    const row = i + 2 + (variant === 'blank-row' && i > 0 ? 1 : 0);
    headers.forEach((key, col) => {
      sheet.getCell(row, col).value = data[key] ?? '';
    });
    if (i === 0 && variant === 'long-rich')
      sheet.getCell(row, headers.indexOf('option_a')).value = {
        richText: [
          { font: { bold: true }, text: 'Sai: ' },
          { font: { italic: true }, text: 'x = 0' },
        ],
      };
  });
  if (variant === 'missing-header')
    sheet.getCell(1, headers.indexOf('question_text')).value = 'wrong_header';
  if (variant === 'duplicate-field')
    sheet.getCell(1, headers.indexOf('option_b')).value = 'option_a';
  if (variant === 'incomplete-row')
    sheet.getCell(5, headers.indexOf('code')).value = 'BROKEN-ROW';
  if (variant === 'duplicate-questions')
    sheet.getRow(5).values = sheet.getRow(4).values;
  if (variant === 'multiple-images') {
    const original = sheet.getImages()[0];
    sheet.addImage(Number(original.imageId), {
      tl: { col: 13, row: 1 },
      ext: { width: 90, height: 60 },
    });
  }
  await book.xlsx.writeFile(path.join(root, `${variant}.xlsx`));
}
function cellValue($, cell, text) {
  const prototype = cell.children('w\\:p').first().clone();
  cell.children('w\\:p').remove();
  for (const line of text.split('\n')) {
    const p = prototype.clone();
    p.children().not('w\\:pPr').remove();
    const run = $('<w:r><w:t xml:space="preserve"></w:t></w:r>');
    run.find('w\\:t').text(line);
    p.append(run);
    cell.append(p);
  }
}
async function word(variant) {
  const zip = await JSZip.loadAsync(
    await fs.readFile(path.join(root, 'question-import-template.docx')),
  );
  const $ = load(await zip.file('word/document.xml').async('string'), {
    xml: true,
  });
  const tables = $('w\\:tbl')
    .toArray()
    .filter(
      (t) =>
        $(t).find('w\\:tr').first().find('w\\:tc').first().text().trim() ===
        'code',
    );
  tables.forEach((table, i) => {
    if (variant === 'empty' || (variant === 'single' && i > 0)) {
      $(table).remove();
      return;
    }
    const data = variantFields(questions[i], i, variant);
    $(table)
      .children('w\\:tr')
      .each((_, row) => {
        const cells = $(row).children('w\\:tc');
        const key = cells.first().text().trim();
        if (i === 0 && key === 'code' && variant === 'missing-code') {
          $(row).remove();
          return;
        }
        if (key === 'image') {
          if (i === 0 && variant === 'multiple-images')
            cells.eq(1).append(cells.eq(1).children('w\\:p').clone());
          return;
        }
        if (
          i === 0 &&
          key === 'question_text' &&
          variant === 'missing-header'
        ) {
          $(row).remove();
          return;
        }
        cellValue($, cells.eq(1), data[key] ?? '');
        if (i === 0 && variant === 'long-rich' && key === 'option_a')
          cells.eq(1).find('w\\:r').prepend('<w:rPr><w:b/><w:i/></w:rPr>');
        if (i === 0 && key === 'code' && variant === 'duplicate-field')
          $(row).after($(row).clone());
      });
  });
  if (variant === 'blank-row')
    $(tables[0]).after('<w:p><w:r><w:t></w:t></w:r></w:p>');
  if (variant === 'duplicate-questions')
    $(tables[2]).after($(tables[2]).clone());
  if (variant === 'incomplete-row') {
    const table = $(tables[2]).clone();
    table.children('w\\:tr').each((_, row) => {
      const cells = $(row).children('w\\:tc');
      cellValue(
        $,
        cells.eq(1),
        cells.first().text().trim() === 'code' ? 'BROKEN-ROW' : '',
      );
    });
    $(tables[2]).after(table);
  }
  zip.file('word/document.xml', $.xml());
  await fs.writeFile(
    path.join(root, `${variant}.docx`),
    await zip.generateAsync({ type: 'nodebuffer' }),
  );
}
(async () => {
  for (const variant of variants) {
    if (variant !== 'missing-code') await excel(variant);
    await word(variant);
  }
  await fs.writeFile(
    path.join(root, 'corrupt.xlsx'),
    Buffer.from('Not an Office ZIP package'),
  );
  await fs.writeFile(
    path.join(root, 'corrupt.docx'),
    Buffer.from('Not an Office ZIP package'),
  );
  console.log(
    `Generated ${variants.length * 2 + 1} fixtures from the published templates.`,
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
