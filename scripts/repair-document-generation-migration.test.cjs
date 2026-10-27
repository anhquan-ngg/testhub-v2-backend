const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run only the backup-copy block with fake docker; never execute migration code.
const source = fs.readFileSync(
  path.join(__dirname, 'repair-document-generation-migration.cjs'),
  'utf8',
);
const start = source.indexOf('let copied = false;');
const end = source.indexOf('\nif (fs.statSync', start);
assert.ok(start >= 0 && end > start);
const block = source.slice(start, end);
for (const copyFails of [false, true]) {
  for (const cleanupFails of [false, true]) {
    test(`backup cleanup: copy failure=${copyFails}, cleanup failure=${cleanupFails}`, () => {
      const calls = [];
      const copyError = new Error('copy failed');
      const cleanupError = new Error('cleanup failed');
      const run = () =>
        vm.runInNewContext(block, {
          container: 'synthetic',
          containerBackup: '/tmp/synthetic.dump',
          backupDirectory: '/synthetic',
          path,
          docker: (args) => {
            calls.push(args);
            if (args[0] === 'cp' && copyFails) throw copyError;
            if (args[0] === 'exec' && cleanupFails) throw cleanupError;
          },
        });
      if (copyFails) assert.throws(run, (error) => error === copyError);
      else if (cleanupFails)
        assert.throws(run, (error) => error === cleanupError);
      else assert.doesNotThrow(run);
      assert.equal(calls.length, 2);
      assert.equal(calls[0][0], 'cp');
      assert.deepEqual(Array.from(calls[1]), [
        'exec',
        'synthetic',
        'rm',
        '-f',
        '/tmp/synthetic.dump',
      ]);
    });
  }
}
