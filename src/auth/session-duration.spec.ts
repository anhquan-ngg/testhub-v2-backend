import { ConfigService } from '@nestjs/config';
import { sessionDuration } from './session-duration';

describe('sessionDuration', () => {
  it.each([
    ['15m', 900],
    ['7d', 604800],
    ['2h', 7200],
    [30, 30],
  ])(
    'interprets %s consistently for JWT and cookie expiry',
    (value, expected) => {
      expect(
        sessionDuration(new ConfigService({ TTL: value }), 'TTL', '1s'),
      ).toBe(expected);
    },
  );
  it.each(['', '900', '0m', '-1h', '1.5h', 'never', 0, NaN])(
    'rejects invalid lifetime %s',
    (value) => {
      expect(() =>
        sessionDuration(new ConfigService({ TTL: value }), 'TTL', '1s'),
      ).toThrow();
    },
  );
  it('uses the declared fallback', () => {
    expect(
      sessionDuration(
        new ConfigService(),
        'UNSET_SESSION_DURATION_FIXTURE',
        '15m',
      ),
    ).toBe(900);
  });
});
