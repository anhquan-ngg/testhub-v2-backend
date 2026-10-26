const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { stripVTControlCharacters } = require('node:util');
const {
  root,
  stopPath,
  compiler,
  runtimes,
  manager,
  call,
  state,
} = require('./shared.cjs');
const run = process.env.TESTHUB_DEV_RUN;
let closing = false,
  revision = 0,
  successful = false,
  running = null;
const pm2 = manager();
let child;

async function restart() {
  if (running || closing || !successful || fs.existsSync(stopPath)) return;
  const current = revision;
  running = (async () => {
    for (const app of runtimes) {
      if (
        closing ||
        !successful ||
        revision !== current ||
        fs.existsSync(stopPath)
      )
        return;
      const existing = await call(pm2, 'describe', app.name);
      if (existing.length)
        await call(pm2, 'restart', app.name, { updateEnv: true });
      else await call(pm2, 'start', app);
    }
    if (!closing && successful && revision === current) {
      state({ run, status: 'ready', revision });
      console.log('Build complete; API and both workers started/restarted.');
    }
  })()
    .catch(() => {
      if (!closing) {
        state({ run, status: 'process-error', revision });
        console.error(
          'Cannot start/restart development processes. Check dev:status and dev:logs.',
        );
      }
    })
    .finally(() => {
      running = null;
      if (!closing && successful && revision !== current) void restart();
    });
  await running;
}

function output(line, stream) {
  stream.write(`${line}\n`);
  const clean = stripVTControlCharacters(line);
  if (/Starting (?:incremental )?compilation/.test(clean)) {
    successful = false;
    revision++;
    state({ run, status: 'building', revision });
  }
  const completed = clean.match(
    /\bFound (\d+) errors?\. Watching for file changes\./,
  );
  if (!completed) return;
  successful = Number(completed[1]) === 0;
  state({ run, status: successful ? 'starting' : 'build-error', revision });
  if (successful) void restart();
}

async function close() {
  if (closing) return;
  closing = true;
  child?.kill(); // The compiler child performs no application/queue work.
  if (child && child.exitCode === null)
    await new Promise((resolve) => child.once('exit', resolve));
  if (running) await running;
  pm2.disconnect();
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => void close());
process.on('message', (message) => {
  if (message === 'shutdown') void close();
});

call(pm2, 'connect')
  .then(() => {
    state({ run, status: 'building', revision });
    child = spawn(
      process.execPath,
      [
        require.resolve('@nestjs/cli/bin/nest.js'),
        'build',
        '--watch',
        '--preserveWatchOutput',
        '--config',
        'nest-cli.dev.json',
      ],
      {
        cwd: root,
        env: process.env,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    createInterface({ input: child.stdout }).on('line', (line) =>
      output(line, process.stdout),
    );
    createInterface({ input: child.stderr }).on('line', (line) =>
      output(line, process.stderr),
    );
    child.on('error', () => {
      console.error('Cannot start Nest compiler.');
      void close();
    });
    child.on('exit', (code) => {
      if (!closing) {
        state({ run, status: 'compiler-error', revision });
        console.error(`Compiler exited (${code}); PM2 will restart it.`);
        pm2.disconnect();
        process.exit(1);
      }
    });
  })
  .catch(() => {
    console.error(`Cannot connect ${compiler.name} to development PM2.`);
    process.exitCode = 1;
  });
