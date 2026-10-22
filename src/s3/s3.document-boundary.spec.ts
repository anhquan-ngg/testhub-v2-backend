import { ForbiddenException } from '@nestjs/common';
import { S3Controller } from './s3.controller';
import { S3Service } from './s3.service';

describe('Legacy S3 API cannot bypass document ownership', () => {
  const storage = {
    findAll: jest
      .fn()
      .mockResolvedValue([
        { name: 'learning-documents/doc/version/source/hash' },
        { name: 'questions/image.png' },
      ]),
  };
  const controller = new S3Controller(storage as unknown as S3Service);
  it.each([
    'learning-documents/doc/version/source/hash',
    'learning-documents%2Fdoc',
    '/learning-documents/doc',
    'files/../learning-documents/doc',
  ])('blocks signing/removing protected key %s', async (key) => {
    expect(() => controller.viewFile(key)).toThrow(ForbiddenException);
    expect(() => controller.presignedGetObject(key)).toThrow(
      ForbiddenException,
    );
    expect(() => controller.createUploadUrl({ path: key })).toThrow(
      ForbiddenException,
    );
    expect(() => controller.checkFile({ filePath: key })).toThrow(
      ForbiddenException,
    );
    await expect(controller.remove(key)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      controller.findAll({ path: key, limit: 100 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('filters protected objects out of root listings', async () => {
    expect(await controller.findAll({ limit: 100 })).toEqual([
      { name: 'questions/image.png' },
    ]);
  });
});
