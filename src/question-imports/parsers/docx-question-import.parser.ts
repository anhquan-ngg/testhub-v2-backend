import { Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import * as mammoth from 'mammoth';
import { QUESTION_IMPORT_OPTION_KEYS } from '../question-import.constants';
import {
  ParsedImportAsset,
  ParsedImportQuestion,
} from '../question-import.types';

@Injectable()
export class DocxQuestionImportParser {
  async parse(buffer: Buffer): Promise<ParsedImportQuestion[]> {
    const extractedAssets: ParsedImportAsset[] = [];
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const order = extractedAssets.length;
          const content = Buffer.from(await image.read('base64'), 'base64');
          const extension = this.extensionForMime(image.contentType);
          extractedAssets.push({
            name: `word-image-${order + 1}.${extension}`,
            mimeType: image.contentType,
            buffer: content,
            order,
          });
          return { src: `question-import-asset://${order}` };
        }),
      },
    );

    const $ = load(result.value);
    const questions: ParsedImportQuestion[] = [];

    $('table').each((_tableIndex, table) => {
      const firstKey = this.normalizeKey(
        $(table).find('tr').first().find('td,th').first().text(),
      );
      if (firstKey !== 'code') return;

      const fields = new Map<string, string>();
      $(table)
        .find('tr')
        .each((_rowIndex, row) => {
          const cells = $(row).find('td,th');
          if (cells.length < 2) return;
          const key = this.normalizeKey($(cells[0]).text());
          const valueCell = $(cells[1]).clone();
          valueCell.find('br').replaceWith('\n');
          fields.set(key, valueCell.text().trim());
        });

      if (
        !fields.has('code') ||
        !fields.has('question_text') ||
        !fields.has('question_type')
      ) {
        return;
      }

      const tableAssets = $(table)
        .find('img')
        .toArray()
        .map((image) => $(image).attr('src') ?? '')
        .map((src) => Number(src.replace('question-import-asset://', '')))
        .filter((index) => Number.isInteger(index) && extractedAssets[index])
        .map((index, order) => ({ ...extractedAssets[index], order }));

      questions.push(
        this.toQuestion(fields, questions.length + 1, tableAssets),
      );
    });

    return questions;
  }

  private toQuestion(
    fields: Map<string, string>,
    sourceIndex: number,
    assets: ParsedImportAsset[],
  ): ParsedImportQuestion {
    const correctKeys = new Set(
      (fields.get('correct_keys') ?? '')
        .toUpperCase()
        .split(/[\s,;]+/)
        .filter(Boolean),
    );
    const options = QUESTION_IMPORT_OPTION_KEYS.map((key) => ({
      key,
      text: fields.get(`option_${key.toLowerCase()}`)?.trim() ?? '',
      isCorrect: correctKeys.has(key),
    })).filter((option) => option.text.length > 0);

    return {
      sourceIndex,
      sourceCode: fields.get('code') || undefined,
      chapterName: fields.get('chapter') || undefined,
      chapterId: fields.get('chapter_id') || undefined,
      questionText: fields.get('question_text') ?? '',
      questionType: (fields.get('question_type') ?? '').toUpperCase(),
      questionFormat: (fields.get('question_format') ?? '').toUpperCase(),
      options,
      correctAnswer: fields.get('essay_answer') || undefined,
      assets,
      parserWarnings: [],
    };
  }

  private normalizeKey(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private extensionForMime(mimeType: string) {
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/gif') return 'gif';
    if (mimeType === 'image/webp') return 'webp';
    return 'png';
  }
}
