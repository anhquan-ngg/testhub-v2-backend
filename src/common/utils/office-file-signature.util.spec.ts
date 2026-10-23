import { BadRequestException } from '@nestjs/common';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { assertOfficeZipLimits } from './office-file-signature.util';

const LIMITS = { maxEntries: 50, maxUncompressedBytes: 1024 * 1024 };

async function buildZip(files: Record<string, string | Buffer>) {
  const zip = new JSZip();
  Object.entries(files).forEach(([name, content]) => zip.file(name, content));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

describe('assertOfficeZipLimits', () => {
  it('accepts the published import templates', async () => {
    const dir = path.resolve(
      process.cwd(),
      'src/question-imports/parsers/fixtures',
    );
    for (const name of [
      'question-import-template.docx',
      'question-import-template.xlsx',
    ]) {
      const buffer = await readFile(path.join(dir, name));
      await expect(
        assertOfficeZipLimits(buffer, {
          maxEntries: 10_000,
          maxUncompressedBytes: 250 * 1024 * 1024,
        }),
      ).resolves.toBeInstanceOf(Buffer);
    }
  });

  it('rejects a package with too many entries', async () => {
    const files = Object.fromEntries(
      Array.from({ length: 51 }, (_, i) => [`f${i}.xml`, 'x']),
    );
    await expect(
      buildZip(files).then((b) => assertOfficeZipLimits(b, LIMITS)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a highly compressible package that expands past the limit', async () => {
    // ~3 MB of zeros deflates to a few KB, so the upload-size cap alone
    // would never catch it.
    const buffer = await buildZip({
      'word/document.xml': Buffer.alloc(3 * 1024 * 1024),
    });
    expect(buffer.length).toBeLessThan(50 * 1024);
    await expect(assertOfficeZipLimits(buffer, LIMITS)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('sums sizes across entries', async () => {
    const half = Buffer.alloc(700 * 1024);
    const buffer = await buildZip({ 'a.bin': half, 'b.bin': half });
    await expect(assertOfficeZipLimits(buffer, LIMITS)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      assertOfficeZipLimits(buffer, {
        ...LIMITS,
        maxUncompressedBytes: 2 * 1024 * 1024,
      }),
    ).resolves.toBeInstanceOf(Buffer);
  });

  it('rejects data that has no central directory', async () => {
    await expect(
      assertOfficeZipLimits(Buffer.from('not a zip at all, just text'), LIMITS),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a truncated or corrupted central directory', async () => {
    const buffer = await buildZip({ 'word/document.xml': '<w/>' });
    const corrupted = Buffer.from(buffer);
    // Break the first central directory entry signature.
    const entryStart = corrupted.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    corrupted[entryStart] = 0;
    await expect(assertOfficeZipLimits(corrupted, LIMITS)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('bounds actual inflation when the central directory lies about size', async () => {
    const buffer = await buildZip({
      'bomb.bin': Buffer.alloc(3 * 1024 * 1024),
    });
    const entry = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    buffer.writeUInt32LE(1, entry + 24);
    await expect(assertOfficeZipLimits(buffer, LIMITS)).rejects.toThrow(
      /expansion exceeds/,
    );
  });

  it('uses the remaining total budget for every inflate', async () => {
    const buffer = await buildZip({
      'first.bin': Buffer.alloc(700 * 1024),
      'second.bin': Buffer.alloc(700 * 1024),
    });
    const first = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    const second = buffer.indexOf(
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      first + 4,
    );
    buffer.writeUInt32LE(1, second + 24);
    await expect(assertOfficeZipLimits(buffer, LIMITS)).rejects.toThrow(
      /expansion exceeds/,
    );
  });

  it('returns a canonical package with only verified STORE entries', async () => {
    const original = await buildZip({
      'word/document.xml': '<document/>',
      'empty.bin': '',
    });
    const checked = await assertOfficeZipLimits(original, LIMITS);
    const zip = await JSZip.loadAsync(checked, { checkCRC32: true });
    expect(await zip.file('word/document.xml')?.async('string')).toBe(
      '<document/>',
    );
    expect(checked.readUInt16LE(8)).toBe(0);
    expect(checked.equals(original)).toBe(false);
  });
});
