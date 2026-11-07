import { DocumentCleanup } from './document-cleanup.service';
import { DocumentRepository } from './document.repository';
import { S3Service } from '../s3/s3.service';

describe('Abandoned upload cleanup', () => {
  it('removes expired upload objects before fencing the row as expired', async () => {
    const order: string[] = [];
    const repository = {
      abandonedUploads: jest
        .fn()
        .mockResolvedValue([{ id: 'v1', upload_key: 'quarantine/v1' }]),
      markUploadExpired: jest.fn().mockImplementation(() => {
        order.push('mark');
        return Promise.resolve({ count: 1 });
      }),
    };
    const storage = {
      remove: jest.fn().mockImplementation(() => {
        order.push('remove');
        return Promise.resolve();
      }),
    };
    const cleanup = new DocumentCleanup(
      repository as unknown as DocumentRepository,
      storage as unknown as S3Service,
    );
    const now = new Date('2026-01-10T00:00:00Z');
    expect(await cleanup.sweep(now)).toBe(1);
    expect(order).toEqual(['remove', 'mark']);
    const [cutoff, take] = repository.abandonedUploads.mock.calls[0] as [
      Date,
      number,
    ];
    expect(cutoff.getTime()).toBeLessThan(now.getTime());
    expect(take).toBeGreaterThan(0);
  });
});
