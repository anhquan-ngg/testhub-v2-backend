const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real command without starting PM2 or touching the dev workspace.
async function runCommand(statuses, timeout = false) {
  let reads = 0;
  let ticks = 0;
  let output = '';
  let errors = '';
  let disconnected = false;
  let released = false;
  const process = {
    argv: ['node', 'manage.cjs', 'up'],
    env: {},
    pid: 123,
    stdout: {
      write: (text) => {
        output += text;
      },
    },
    stderr: {
      write: (text) => {
        errors += text;
      },
    },
    once() {},
    removeListener() {},
  };
  const shared = {
    home: '/synthetic',
    stopPath: '/synthetic/stop',
    compiler: { name: 'compiler', env: {} },
    apps: [],
    runtimes: [],
    manager: () => ({
      disconnect: () => {
        disconnected = true;
      },
    }),
    call: async (_pm2, method) =>
      method === 'describe' || method === 'list' ? [] : undefined,
    readState: () => ({
      run: 'test-run',
      status: statuses[Math.min(reads++, statuses.length - 1)],
    }),
  };
  const context = {
    process,
    Date: { now: () => (timeout ? ticks++ * 600001 : 0) },
    require: (name) => {
      if (name === './shared.cjs') return shared;
      if (name === 'node:crypto') return { randomUUID: () => 'test-run' };
      if (name === 'node:timers/promises')
        return { setTimeout: async () => {} };
      if (name === 'node:fs')
        return {
          mkdirSync() {},
          openSync: () => 1,
          writeSync() {},
          closeSync() {},
          rmSync: (file) => {
            if (file.endsWith('control.lock')) released = true;
          },
        };
      return require(name);
    },
  };
  const source = fs
    .readFileSync(path.join(__dirname, 'manage.cjs'), 'utf8')
    .replace('main().catch(', 'globalThis.completed = main().catch(');
  vm.runInNewContext(source, context);
  await context.completed;
  assert.equal(disconnected, true);
  assert.equal(released, true);
  return { reads, output, errors, exitCode: process.exitCode };
}

test('ready followed by a new build does not report a startup timeout', async () => {
  const result = await runCommand(['building', 'ready', 'building']);
  assert.equal(result.exitCode, undefined);
  assert.equal(result.errors, '');
  assert.match(result.output, /Build succeeded/);
  assert.match(result.output, /Build: building/);
});

test('deadline without observed readiness still reports timeout', async () => {
  const result = await runCommand(['building'], true);
  assert.equal(result.exitCode, 1);
  assert.match(result.errors, /Build startup timed out/);
});

test('build errors still fail startup immediately', async () => {
  const result = await runCommand(['build-error']);
  assert.equal(result.exitCode, 1);
  assert.match(result.errors, /Build\/start failed/);
});
