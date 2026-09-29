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
      expect(() =>
        assertOfficeZipLimits(buffer, {
          maxEntries: 10_000,
          maxUncompressedBytes: 250 * 1024 * 1024,
        }),
      ).not.toThrow();
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
    expect(() => assertOfficeZipLimits(buffer, LIMITS)).toThrow(
      BadRequestException,
    );
  });

  it('sums sizes across entries', async () => {
    const half = Buffer.alloc(700 * 1024);
    const buffer = await buildZip({ 'a.bin': half, 'b.bin': half });
    expect(() => assertOfficeZipLimits(buffer, LIMITS)).toThrow(
      BadRequestException,
    );
    expect(() =>
      assertOfficeZipLimits(buffer, {
        ...LIMITS,
        maxUncompressedBytes: 2 * 1024 * 1024,
      }),
    ).not.toThrow();
  });

  it('rejects data that has no central directory', () => {
    expect(() =>
      assertOfficeZipLimits(Buffer.from('not a zip at all, just text'), LIMITS),
    ).toThrow(BadRequestException);
  });

  it('rejects a truncated or corrupted central directory', async () => {
    const buffer = await buildZip({ 'word/document.xml': '<w/>' });
    const corrupted = Buffer.from(buffer);
    // Break the first central directory entry signature.
    const entryStart = corrupted.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    corrupted[entryStart] = 0;
    expect(() => assertOfficeZipLimits(corrupted, LIMITS)).toThrow(
      BadRequestException,
    );
  });
});
