import { BadRequestException } from '@nestjs/common';
import { QuestionImportSourceType } from '@prisma/client';

// A .docx/.xlsx file is a ZIP archive; a non-empty one always starts with the
// "local file header" signature below (empty/spanned archives use the other two).
const ZIP_SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];

// Every OOXML package contains this entry for its respective document type,
// regardless of the file extension the client claims - a cheap way to tell a
// renamed/mismatched Office file apart from the declared source type.
const REQUIRED_ENTRY: Record<QuestionImportSourceType, string> = {
  DOCX: 'word/document.xml',
  XLSX: 'xl/workbook.xml',
};

/**
 * Validates that a buffer is really an OOXML (.docx/.xlsx) package matching
 * the declared source type, based on its actual bytes rather than the
 * client-supplied mime_type/extension.
 */
export function assertOfficeFileSignature(
  buffer: Buffer,
  sourceType: QuestionImportSourceType,
): void {
  const isZip = ZIP_SIGNATURES.some((signature) =>
    buffer.subarray(0, signature.length).equals(signature),
  );
  if (!isZip) {
    throw new BadRequestException(
      'File is not a valid Office Open XML (.docx/.xlsx) package',
    );
  }
  if (!buffer.includes(Buffer.from(REQUIRED_ENTRY[sourceType], 'ascii'))) {
    throw new BadRequestException(
      `File content does not match the declared ${sourceType} format`,
    );
  }
}
