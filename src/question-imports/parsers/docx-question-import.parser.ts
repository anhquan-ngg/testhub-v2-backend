import { BadRequestException, Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import * as mammoth from 'mammoth';
import { parseImportOptions } from './import-options';
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
      if (firstKey !== 'code') {
        // Ignore instruction tables with a header, but not question tables
        // whose required first row was removed or moved.
        if (
          /^(chapter(_id)?|question_(text|type|format)|option_[a-f]|correct_keys|essay_answer|image)$/.test(
            firstKey,
          )
        ) {
          throw new BadRequestException(
            'Question tables must start with the code field',
          );
        }
        return;
      }

      const fields = new Map<string, string>();
      $(table)
        .find('tr')
        .each((_rowIndex, row) => {
          const cells = $(row).find('td,th');
          if (cells.length < 2) return;
          const key = this.normalizeKey($(cells[0]).text());
          if (fields.has(key)) {
            throw new BadRequestException(`Duplicate question field: ${key}`);
          }
          const valueCell = $(cells[1]).clone();
          valueCell.find('br').replaceWith('\n');
          valueCell.find('p').append('\n');
          fields.set(key, valueCell.text().trim());
        });

      for (const required of [
        'code',
        'question_text',
        'question_type',
        'question_format',
      ]) {
        if (!fields.has(required)) {
          throw new BadRequestException(
            `Missing required question field: ${required}`,
          );
        }
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
    const { options, parserErrors } = parseImportOptions(
      (key) => fields.get(key)?.trim() ?? '',
    );

    return {
      sourceIndex,
      sourceCode: fields.get('code') || undefined,
      chapterName: fields.get('chapter') || undefined,
      chapterId: fields.get('chapter_id') || undefined,
      questionText: fields.get('question_text') ?? '',
      questionType: (fields.get('question_type') ?? '').toUpperCase(),
      questionFormat: (fields.get('question_format') ?? '').toUpperCase(),
      options,
      parserErrors,
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
