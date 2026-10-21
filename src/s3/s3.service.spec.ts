import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { isAllowedPrintRequest } from '../exam-print/exam-print.network';

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
