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

export type ZipLimits = {
  maxEntries: number;
  maxUncompressedBytes: number;
};

const EOCD_SIGNATURE = 0x06054b50;
const EOCD_MIN_SIZE = 22;
// The end-of-central-directory record may be followed by a comment of up to
// 65535 bytes, so it can only start within this distance from the end.
const EOCD_SEARCH_WINDOW = EOCD_MIN_SIZE + 0xffff;
const CENTRAL_ENTRY_SIGNATURE = 0x02014b50;
const CENTRAL_ENTRY_MIN_SIZE = 46;

const invalidArchive = () =>
  new BadRequestException('File is not a valid or supported ZIP package');

/**
 * Rejects zip bombs before any parser inflates the package. Reads only the
 * ZIP central directory — nothing is decompressed — and checks the number
 * of entries and the sum of their declared uncompressed sizes against
 * `limits`. ZIP64 archives are rejected: Office files within the upload
 * size limit never need them, and their size fields are not read here.
 */
export function assertOfficeZipLimits(buffer: Buffer, limits: ZipLimits): void {
  const windowStart = Math.max(0, buffer.length - EOCD_SEARCH_WINDOW);
  let eocd = -1;
  for (let i = buffer.length - EOCD_MIN_SIZE; i >= windowStart; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw invalidArchive();

  const declaredEntries = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (
    declaredEntries === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff
  ) {
    throw invalidArchive();
  }
  if (declaredEntries > limits.maxEntries) {
    throw new BadRequestException(
      `Package has too many entries (limit ${limits.maxEntries})`,
    );
  }
  if (directoryOffset + directorySize > eocd) throw invalidArchive();

  let position = directoryOffset;
  let totalUncompressed = 0;
  for (let entry = 0; entry < declaredEntries; entry++) {
    if (
      position + CENTRAL_ENTRY_MIN_SIZE > eocd ||
      buffer.readUInt32LE(position) !== CENTRAL_ENTRY_SIGNATURE
    ) {
      throw invalidArchive();
    }
    const uncompressedSize = buffer.readUInt32LE(position + 24);
    const nameLength = buffer.readUInt16LE(position + 28);
    const extraLength = buffer.readUInt16LE(position + 30);
    const commentLength = buffer.readUInt16LE(position + 32);
    if (uncompressedSize === 0xffffffff) throw invalidArchive();

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > limits.maxUncompressedBytes) {
      throw new BadRequestException(
        `Package expands beyond the allowed size (limit ${Math.round(
          limits.maxUncompressedBytes / (1024 * 1024),
        )} MB)`,
      );
    }
    position +=
      CENTRAL_ENTRY_MIN_SIZE + nameLength + extraLength + commentLength;
  }
}
