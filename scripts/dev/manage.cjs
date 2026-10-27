const fs = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const {
  home,
  apps,
  compiler,
  runtimes,
  stopPath,
  manager,
  call,
  readState,
  state,
} = require('./shared.cjs');
const say = (text) => process.stdout.write(`[dev] - ${text}\n`);
const lockPath = resolve(home, 'control.lock');

function lock() {
  fs.mkdirSync(home, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return () => fs.rmSync(lockPath, { force: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const pid = Number(fs.readFileSync(lockPath, 'utf8'));
      if (!Number.isInteger(pid) || pid < 1)
        throw new Error(
          'Invalid control lock; inspect .tmp/pm2-dev/control.lock',
        );
      try {
        process.kill(pid, 0);
      } catch (error) {
        if (error.code === 'ESRCH') {
          fs.rmSync(lockPath);
          continue;
        }
        throw error;
      }
      throw new Error(
        'Another dev:up/dev:down is running; wait or cancel it first.',
      );
    }
  }
  throw new Error('Cannot acquire development process lock');
}

async function main() {
  const action = process.argv[2];
  if (action === 'logs') {
    require('./logs.cjs').logs(apps, process.argv.slice(3));
    return;
  }
  if (!['up', 'down', 'status'].includes(action))
    throw new Error('Expected up, down, status or logs');
  if (action !== 'up' && !fs.existsSync(resolve(home, 'pm2.pid'))) {
    say('Development processes are stopped.');
    return;
  }
  const release = action === 'status' ? () => {} : lock();
  let pm2;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    pm2 = manager();
    await call(pm2, 'connect');
    if (action === 'up') {
      fs.rmSync(stopPath, { force: true });
      const run = randomUUID();
      process.env.TESTHUB_DEV_RUN = run;
      const existing = await call(pm2, 'describe', compiler.name);
      say(
        'Starting one Nest compiler; application processes start after a successful build.',
      );
      if (existing.length)
        await call(pm2, 'restart', compiler.name, { updateEnv: true });
      else
        await call(pm2, 'start', {
          ...compiler,
          env: { ...compiler.env, TESTHUB_DEV_RUN: run },
        });
      const deadline = Date.now() + 600000;
      let ready = false;
      while (!cancelled && Date.now() < deadline) {
        const current = readState();
        if (current?.run === run) {
          if (current.status === 'ready') {
            ready = true;
            say(
              'Build succeeded. Dev processes are running in the background.',
            );
            break;
          }
          if (
            ['build-error', 'compiler-error', 'process-error'].includes(
              current.status,
            )
          )
            throw new Error(
              'Build/start failed. Run npm run dev:logs. The compiler remains watching for fixes.',
            );
        }
        await delay(250);
      }
      if (cancelled) {
        say('Stopped waiting. Use dev:down to stop background processes.');
        process.exitCode = 130;
        return;
      }
      if (!ready)
        throw new Error(
          'Build startup timed out. Check dev:logs; background processes remain managed by PM2.',
        );
    } else if (action === 'down') {
      fs.writeFileSync(stopPath, 'stop');
      // Stop the sole compiler first, so it cannot relaunch an app during teardown.
      for (const app of [compiler, ...runtimes])
        if ((await call(pm2, 'describe', app.name)).length)
          await call(pm2, 'delete', app.name);
      say('Stopped compiler, API and both workers. Logs are retained.');
      state({ status: 'stopped' });
      return;
    }
    const listed = await call(pm2, 'list');
    for (const app of apps) {
      const found = listed.find((item) => item.name === app.name);
      say(
        `${app.name}: ${found?.pm2_env?.status ?? 'stopped'} | PID ${found?.pid || '-'} | restarts ${found?.pm2_env?.restart_time ?? 0}`,
      );
    }
    say(`Build: ${readState()?.status ?? 'not started'}`);
  } finally {
    pm2?.disconnect();
    release();
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}

main().catch((error) => {
  // Application logs remain in named streams; never dump PM2 env/config objects.
  const safe =
    error.message?.startsWith('Build') ||
    error.message?.startsWith('Another') ||
    error.message?.startsWith('Expected') ||
    error.message?.startsWith('Use ') ||
    error.message?.startsWith('Unknown');
  process.stderr.write(
    `[dev] - ${safe ? error.message : 'Process management failed. Check permissions and .tmp/pm2-dev/pm2.log.'}\n`,
  );
  process.exitCode = 1;
});
