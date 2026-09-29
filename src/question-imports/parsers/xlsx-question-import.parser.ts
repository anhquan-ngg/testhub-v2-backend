import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { QUESTION_IMPORT_OPTION_KEYS } from '../question-import.constants';
import {
  ParsedImportAsset,
  ParsedImportQuestion,
} from '../question-import.types';

type WorksheetImage = {
  imageId: string;
  range: { tl: { nativeRow: number } };
};

@Injectable()
export class XlsxQuestionImportParser {
  async parse(buffer: Buffer): Promise<ParsedImportQuestion[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.getWorksheet('Questions');
    if (!worksheet) {
      throw new BadRequestException(
        'Workbook must contain a sheet named Questions',
      );
    }

    const headers = new Map<string, number>();
    worksheet.getRow(1).eachCell((cell, column) => {
      headers.set(cell.text.trim().toLowerCase(), column);
    });
    for (const required of [
      'question_text',
      'question_type',
      'question_format',
    ]) {
      if (!headers.has(required)) {
        throw new BadRequestException(`Missing required column: ${required}`);
      }
    }

    const imagesByRow = this.extractImages(workbook, worksheet);
    const questions: ParsedImportQuestion[] = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const text = this.cellText(row, headers, 'question_text');
      const type = this.cellText(row, headers, 'question_type');
      if (!text && !type) continue;

      const correctKeys = new Set(
        this.cellText(row, headers, 'correct_keys')
          .toUpperCase()
          .split(/[\s,;]+/)
          .filter(Boolean),
      );
      const options = QUESTION_IMPORT_OPTION_KEYS.map((key) => ({
        key,
        text: this.cellText(row, headers, `option_${key.toLowerCase()}`),
        isCorrect: correctKeys.has(key),
      })).filter((option) => option.text.length > 0);
      const assets = imagesByRow.get(rowNumber) ?? [];
      const hasImageMarker = Boolean(this.cellText(row, headers, 'image'));

      questions.push({
        sourceIndex: rowNumber,
        sourceCode: this.cellText(row, headers, 'code') || undefined,
        chapterName: this.cellText(row, headers, 'chapter') || undefined,
        chapterId: this.cellText(row, headers, 'chapter_id') || undefined,
        questionText: text,
        questionType: type.toUpperCase(),
        questionFormat: this.cellText(
          row,
          headers,
          'question_format',
        ).toUpperCase(),
        options,
        correctAnswer: this.cellText(row, headers, 'essay_answer') || undefined,
        assets,
        parserWarnings:
          hasImageMarker && assets.length === 0
            ? [
                'Cột image có nội dung nhưng không tìm thấy ảnh nhúng trong dòng',
              ]
            : [],
      });
    }

    return questions;
  }

  private extractImages(
    workbook: ExcelJS.Workbook,
    worksheet: ExcelJS.Worksheet,
  ) {
    const imagesByRow = new Map<number, ParsedImportAsset[]>();
    const worksheetImages =
      worksheet.getImages() as unknown as WorksheetImage[];
    worksheetImages.forEach((image) => {
      const model = workbook.getImage(Number(image.imageId));
      if (!model?.buffer) return;
      const rowNumber = Math.floor(image.range.tl.nativeRow) + 1;
      const current = imagesByRow.get(rowNumber) ?? [];
      const extension = String(model.extension || 'png').toLowerCase();
      current.push({
        name: `excel-image-${rowNumber}-${current.length + 1}.${extension}`,
        mimeType: this.mimeForExtension(extension),
        buffer: Buffer.from(model.buffer),
        order: current.length,
      });
      imagesByRow.set(rowNumber, current);
    });
    return imagesByRow;
  }

  private cellText(
    row: ExcelJS.Row,
    headers: Map<string, number>,
    key: string,
  ) {
    const column = headers.get(key);
    return column ? row.getCell(column).text.trim() : '';
  }

  private mimeForExtension(extension: string) {
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'gif') return 'image/gif';
    if (extension === 'webp') return 'image/webp';
    return 'image/png';
  }
}
