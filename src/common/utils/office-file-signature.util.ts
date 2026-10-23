import { BadRequestException } from '@nestjs/common';
import { QuestionImportSourceType } from '@prisma/client';
import JSZip from 'jszip';
import { promisify } from 'node:util';
import { inflateRaw } from 'node:zlib';

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
const LOCAL_ENTRY_SIGNATURE = 0x04034b50;
const LOCAL_ENTRY_MIN_SIZE = 30;
const inflate = promisify(inflateRaw);

const invalidArchive = () =>
  new BadRequestException('File is not a valid or supported ZIP package');

/**
 * Inflate each entry with the remaining aggregate byte budget, then rebuild a
 * STORE-only package from checked bytes. Parsers must receive this result, not
 * the untrusted archive. ZIP64, encryption and unsupported methods are rejected.
 */
export async function assertOfficeZipLimits(
  buffer: Buffer,
  limits: ZipLimits,
): Promise<Buffer> {
  if (
    !Number.isSafeInteger(limits.maxEntries) ||
    limits.maxEntries < 1 ||
    !Number.isSafeInteger(limits.maxUncompressedBytes) ||
    limits.maxUncompressedBytes < 1
  ) {
    throw invalidArchive();
  }
  const windowStart = Math.max(0, buffer.length - EOCD_SEARCH_WINDOW);
  let eocd = -1;
  for (let i = buffer.length - EOCD_MIN_SIZE; i >= windowStart; i--) {
    if (
      buffer.readUInt32LE(i) === EOCD_SIGNATURE &&
      i + EOCD_MIN_SIZE + buffer.readUInt16LE(i + 20) === buffer.length
    ) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw invalidArchive();

  const declaredEntries = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (
    buffer.readUInt16LE(eocd + 4) !== 0 ||
    buffer.readUInt16LE(eocd + 6) !== 0 ||
    buffer.readUInt16LE(eocd + 8) !== declaredEntries ||
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
  if (directoryOffset + directorySize !== eocd) throw invalidArchive();

  let position = directoryOffset;
  let totalUncompressed = 0;
  const checked = new JSZip();
  const names = new Set<string>();
  for (let entry = 0; entry < declaredEntries; entry++) {
    if (
      position + CENTRAL_ENTRY_MIN_SIZE > eocd ||
      buffer.readUInt32LE(position) !== CENTRAL_ENTRY_SIGNATURE
    ) {
      throw invalidArchive();
    }
    const flags = buffer.readUInt16LE(position + 8);
    const method = buffer.readUInt16LE(position + 10);
    const compressedSize = buffer.readUInt32LE(position + 20);
    const uncompressedSize = buffer.readUInt32LE(position + 24);
    const nameLength = buffer.readUInt16LE(position + 28);
    const extraLength = buffer.readUInt16LE(position + 30);
    const commentLength = buffer.readUInt16LE(position + 32);
    const localOffset = buffer.readUInt32LE(position + 42);
    const nextPosition =
      position +
      CENTRAL_ENTRY_MIN_SIZE +
      nameLength +
      extraLength +
      commentLength;
    if (
      (flags & 1) !== 0 ||
      ![0, 8].includes(method) ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      buffer.readUInt16LE(position + 34) !== 0 ||
      localOffset + LOCAL_ENTRY_MIN_SIZE > directoryOffset ||
      nextPosition > eocd ||
      buffer.readUInt32LE(localOffset) !== LOCAL_ENTRY_SIGNATURE ||
      buffer.readUInt16LE(localOffset + 6) !== flags ||
      buffer.readUInt16LE(localOffset + 8) !== method
    )
      throw invalidArchive();

    const nameBytes = buffer.subarray(
      position + CENTRAL_ENTRY_MIN_SIZE,
      position + CENTRAL_ENTRY_MIN_SIZE + nameLength,
    );
    const name = nameBytes.toString('utf8');
    if (
      !name ||
      names.has(name) ||
      name.startsWith('/') ||
      name.includes('\\') ||
      name.includes('\0') ||
      name.split('/').some((part) => part === '..' || part === '.')
    ) {
      throw invalidArchive();
    }
    names.add(name);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart =
      localOffset + LOCAL_ENTRY_MIN_SIZE + localNameLength + localExtraLength;
    if (
      dataStart + compressedSize > directoryOffset ||
      !nameBytes.equals(
        buffer.subarray(
          localOffset + LOCAL_ENTRY_MIN_SIZE,
          localOffset + LOCAL_ENTRY_MIN_SIZE + localNameLength,
        ),
      )
    ) {
      throw invalidArchive();
    }
    const remaining = limits.maxUncompressedBytes - totalUncompressed;
    if (
      uncompressedSize > remaining ||
      (method === 0 && compressedSize > remaining)
    ) {
      throw new BadRequestException('Package expands beyond the allowed size');
    }
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    let content: Buffer;
    try {
      content =
        method === 0
          ? compressed
          : await inflate(compressed, {
              maxOutputLength: Math.max(1, remaining),
            });
    } catch {
      throw new BadRequestException(
        'Invalid ZIP entry or expansion exceeds the allowed size',
      );
    }
    totalUncompressed += content.length;
    if (totalUncompressed > limits.maxUncompressedBytes) {
      throw new BadRequestException('Package expands beyond the allowed size');
    }
    if (content.length !== uncompressedSize) throw invalidArchive();
    checked.file(name, content, {
      createFolders: false,
      dir: name.endsWith('/'),
    });
    position = nextPosition;
  }
  if (position !== directoryOffset + directorySize) throw invalidArchive();
  return checked.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
}
