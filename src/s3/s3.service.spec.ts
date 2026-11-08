import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  type DeleteObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';
import { isAllowedPrintRequest } from '../exam-print/exam-print.network';

type DeletionTransport = {
  send(command: DeleteObjectCommand): Promise<DeleteObjectCommandOutput>;
};

describe('S3Service deletion (offline SDK transport)', () => {
  afterEach(() => jest.restoreAllMocks());

  /** Construct storage with synthetic credentials and a mocked transport only. */
  function storage() {
    return new S3Service(
      new ConfigService({
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET_NAME: 'fixture-bucket',
        AWS_ACCESS_KEY_ID: 'test-only',
        AWS_SECRET_ACCESS_KEY: 'test-only',
      }),
    );
  }

  it('propagates deletion failures while preserving best-effort remove', async () => {
    const failure = new Error('storage unavailable');
    const send = jest
      .spyOn(S3Client.prototype as unknown as DeletionTransport, 'send')
      .mockRejectedValue(failure);
    const warning = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const service = storage();
    await expect(service.removeOrThrow('source')).rejects.toBe(failure);
    await expect(service.remove('source')).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'fixture-bucket',
      Key: 'source',
    });
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it('accepts successful and already-absent object deletions', async () => {
    const send = jest
      .spyOn(S3Client.prototype as unknown as DeletionTransport, 'send')
      .mockResolvedValue({ $metadata: {} });
    const service = storage();
    await expect(service.removeOrThrow('source')).resolves.toBeUndefined();
    await expect(service.removeOrThrow('source')).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('S3Service endpoint alignment (real SDK, fake signing credentials)', () => {
  it.each([
    ['exam-bucket', 'ap-southeast-1'],
    ['exam.bucket', 'ap-southeast-1'],
    ['exam.bucket', 'us-east-1'],
    ['exam.bucket', 'cn-north-1'],
  ])(
    'matches storage and presigned hosts for %s in %s',
    async (bucket, region) => {
      const service = new S3Service(
        new ConfigService({
          AWS_REGION: region,
          AWS_S3_BUCKET_NAME: bucket,
          AWS_ACCESS_KEY_ID: 'test-only',
          AWS_SECRET_ACCESS_KEY: 'test-only',
        }),
      );
      const { url } = await service.getViewUrl('questions/a b.png');
      const signed = new URL(url);
      const stored = new URL(service.createStorageUrl('questions/a b.png'));
      expect(service.getStorageHost()).toBe(signed.hostname);
      expect(stored.origin).toBe(signed.origin);
      expect(stored.pathname).toBe(signed.pathname);
      expect(isAllowedPrintRequest(url, [service.getStorageHost()])).toBe(true);
      expect(
        isAllowedPrintRequest('https://attacker.invalid/a.png', [
          service.getStorageHost(),
        ]),
      ).toBe(false);
      expect(
        isAllowedPrintRequest(
          `https://${signed.hostname}.attacker.invalid/a.png`,
          [service.getStorageHost()],
        ),
      ).toBe(false);
      if (bucket.includes('.'))
        expect(signed.pathname).toContain(`/${bucket}/`);
    },
  );
});
