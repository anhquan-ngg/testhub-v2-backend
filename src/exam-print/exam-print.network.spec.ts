import { isAllowedPrintRequest } from './exam-print.network';

const BUCKET_HOST = 'exam-bucket.s3.ap-southeast-1.amazonaws.com';

describe('isAllowedPrintRequest', () => {
  const allowed = (url: string) => isAllowedPrintRequest(url, [BUCKET_HOST]);

  it('allows KaTeX, fonts and the storage bucket over https', () => {
    expect(
      allowed('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js'),
    ).toBe(true);
    expect(allowed('https://fonts.googleapis.com/css2?family=Noto+Serif')).toBe(
      true,
    );
    expect(allowed('https://fonts.gstatic.com/s/notoserif/x.woff2')).toBe(true);
    expect(allowed(`https://${BUCKET_HOST}/questions/u/q/f.png?X-Amz=1`)).toBe(
      true,
    );
  });

  it('allows data URLs', () => {
    expect(allowed('data:image/png;base64,AAAA')).toBe(true);
  });

  it('blocks internal addresses and cloud metadata endpoints', () => {
    expect(allowed('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(allowed('http://localhost:3001/exams')).toBe(false);
    expect(allowed('http://127.0.0.1:6379/')).toBe(false);
    expect(allowed('https://10.0.0.5/admin')).toBe(false);
    expect(allowed('file:///etc/passwd')).toBe(false);
  });

  it('blocks arbitrary and look-alike hosts', () => {
    expect(allowed('https://evil.example.com/x.png')).toBe(false);
    expect(allowed('https://cdn.jsdelivr.net.evil.com/x.js')).toBe(false);
    expect(allowed(`https://${BUCKET_HOST}.evil.com/x.png`)).toBe(false);
    expect(allowed('https://evil.com/?u=https://cdn.jsdelivr.net/')).toBe(
      false,
    );
  });

  it('blocks allowed hosts over plain http and malformed URLs', () => {
    expect(allowed('http://cdn.jsdelivr.net/npm/katex.js')).toBe(false);
    expect(allowed('not a url')).toBe(false);
  });

  it('compares hosts case-insensitively', () => {
    expect(allowed('https://CDN.JSDelivr.net/npm/katex.js')).toBe(true);
  });
});
