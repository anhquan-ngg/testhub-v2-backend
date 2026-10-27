const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { lineWriter, tail } = require('./logs.cjs');

test('every multiline/CRLF log is labelled; split Unicode and ANSI do not corrupt output', () => {
  let actual = '';
  const log = lineWriter('testhub-ai-worker-dev', (text) => (actual += text));
  const bytes = Buffer.from(
    '\x1b[31mTiếng Việt\x1b[0m\r\nError: failed\n  at worker\npartial',
  );
  log.push(bytes.subarray(0, 9));
  log.push(bytes.subarray(9, 13));
  log.push(bytes.subarray(13));
  log.flush();
  assert.equal(
    actual,
    '[testhub-ai-worker-dev] - Tiếng Việt\n[testhub-ai-worker-dev] - Error: failed\n[testhub-ai-worker-dev] -   at worker\n[testhub-ai-worker-dev] - partial\n',
  );
});

test('tail reads bounded history, live appends and log truncation', async () => {
  const folder = path.resolve(
    __dirname,
    '../../.tmp/dev-log-tests',
    randomUUID(),
  );
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, 'app.log');
  let result = '';
  fs.writeFileSync(file, 'old one\nold two\nold three\n');
  const stop = tail(file, 'testhub-api-dev', 2, (text) => (result += text));
  try {
    assert.equal(
      result,
      '[testhub-api-dev] - old two\n[testhub-api-dev] - old three\n',
    );
    fs.appendFileSync(file, 'live one\nlive two\n');
    await delay(350);
    assert.match(
      result,
      /\[testhub-api-dev\] - live one\n\[testhub-api-dev\] - live two\n/,
    );
    fs.writeFileSync(file, 'rotated\n');
    await delay(350);
    assert.match(result, /\[testhub-api-dev\] - rotated\n$/);
  } finally {
    stop();
    assert.ok(
      fs
        .realpathSync(folder)
        .startsWith(
          path.resolve(__dirname, '../../.tmp/dev-log-tests') + path.sep,
        ),
    );
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
