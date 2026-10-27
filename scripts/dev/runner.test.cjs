const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

// Production workers are never started: the real PM2/Nest compiler exercise
// three synthetic apps in a temporary project, without DB/Redis/S3/AI access.
test(
  'real PM2: background start, clean reload, compile-error fencing, named logs and graceful down',
  { timeout: 180000 },
  async () => {
    const base = path.resolve(__dirname, '../../.tmp/dev-runner-tests');
    const root = path.join(base, randomUUID());
    const source = path.join(root, 'src');
    fs.mkdirSync(path.join(root, 'scripts/dev'), { recursive: true });
    fs.mkdirSync(source);
    const repo = path.resolve(__dirname, '../..');
    for (const name of fs
      .readdirSync(__dirname)
      .filter((name) => name.endsWith('.cjs') && !name.endsWith('.test.cjs')))
      fs.copyFileSync(
        path.join(__dirname, name),
        path.join(root, 'scripts/dev', name),
      );
    for (const file of [
      'ecosystem.dev.config.cjs',
      'nest-cli.dev.json',
      'tsconfig.dev.json',
    ])
      fs.copyFileSync(path.join(repo, file), path.join(root, file));
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(
      path.join(root, 'tsconfig.build.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'CommonJS',
          rootDir: 'src',
          outDir: 'dist',
          types: [],
          skipLibCheck: true,
        },
        include: ['src'],
      }),
    );
    const code = (version) =>
      `declare const process:any; console.log('hello ${version}');console.error('stack one\\nstack two');process.on('SIGINT',()=>{console.log('DRAINED');setTimeout(()=>process.exit(0),100);});setInterval(()=>console.log('tick ${version}'),500);export {};`;
    for (const name of [
      'main',
      'question-generation.worker',
      'document.worker',
    ])
      fs.writeFileSync(path.join(source, `${name}.ts`), code('v1'));
    const environment = { ...process.env };
    delete environment.NODE_OPTIONS;
    delete environment.PM2_HOME;
    delete environment.TESTHUB_DEV_PM2;
    const launch = (action, args = []) =>
      spawn(
        process.execPath,
        [path.join(root, 'scripts/dev/manage.cjs'), action, ...args],
        {
          cwd: root,
          env: environment,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
    const run = (action, args = []) =>
      new Promise((resolve, reject) => {
        const child = launch(action, args);
        let output = '';
        child.stdout.on('data', (bytes) => (output += bytes));
        child.stderr.on('data', (bytes) => (output += bytes));
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error(`${action} timed out: ${output}`));
        }, 130000);
        child.once('error', reject);
        child.once('exit', (code) => {
          clearTimeout(timer);
          resolve({ code, output });
        });
      });
    const checkpoint = () => {
      try {
        return JSON.parse(
          fs.readFileSync(
            path.join(root, '.tmp/pm2-dev/build-state.json'),
            'utf8',
          ),
        );
      } catch {
        return null;
      }
    };
    const until = async (predicate) => {
      const end = Date.now() + 30000;
      while (Date.now() < end) {
        if (predicate()) return;
        await delay(150);
      }
      throw new Error('Fixture checkpoint timed out');
    };
    let logs;
    try {
      fs.appendFileSync(
        path.join(source, 'main.ts'),
        '\nconst initiallyBroken: string = 42;',
      );
      let result = await run('up');
      assert.equal(result.code, 1, result.output);
      assert.equal(checkpoint()?.status, 'build-error');
      result = await run('status');
      assert.match(result.output, /testhub-api-dev: stopped/);
      fs.writeFileSync(path.join(source, 'main.ts'), code('v1'));
      await until(() => checkpoint()?.status === 'ready');
      result = await run('up');
      assert.equal(result.code, 0, result.output);
      assert.match(result.output, /testhub-api-dev: online/);
      assert.match(result.output, /testhub-ai-worker-dev: online/);
      result = await run('status');
      const before = result.output.match(
        /testhub-api-dev: online \| PID (\d+)/,
      )?.[1];
      assert.ok(before, result.output);
      let live = '';
      logs = launch('logs', ['--lines', '0']);
      logs.stdout.on('data', (bytes) => (live += bytes));
      logs.stderr.on('data', (bytes) => (live += bytes));
      await until(() =>
        live.includes('[testhub-document-worker-dev] - tick v1'),
      );
      logs.kill();
      result = await run('status');
      assert.equal(
        result.output.match(/testhub-api-dev: online \| PID (\d+)/)?.[1],
        before,
      );
      logs = launch('logs', ['--lines', '0']);
      logs.stdout.on('data', (bytes) => (live += bytes));
      logs.stderr.on('data', (bytes) => (live += bytes));
      fs.writeFileSync(path.join(source, 'main.ts'), code('v2'));
      await until(() => live.includes('[testhub-api-dev] - hello v2'));
      result = await run('status');
      const afterReload = result.output.match(
        /testhub-api-dev: online \| PID (\d+)/,
      )?.[1];
      assert.notEqual(afterReload, before);
      assert.ok(
        live
          .split('\n')
          .filter(Boolean)
          .every((line) => /^\[(dev|testhub-[a-z-]+-dev)\] - /.test(line)),
        live,
      );
      const valid = fs.readFileSync(path.join(root, 'dist/main.js'), 'utf8');
      fs.appendFileSync(
        path.join(source, 'main.ts'),
        '\nconst broken: string = 42;',
      );
      await until(() => checkpoint()?.status === 'build-error');
      assert.equal(
        fs.readFileSync(path.join(root, 'dist/main.js'), 'utf8'),
        valid,
      );
      result = await run('status');
      const onError = result.output.match(
        /testhub-api-dev: online \| PID (\d+)/,
      )?.[1];
      assert.ok(onError);
      assert.equal(onError, afterReload);
      fs.writeFileSync(path.join(source, 'main.ts'), code('v3'));
      await until(() => live.includes('[testhub-api-dev] - hello v3'));
      // A repeated up updates the compiler run token and keeps one compiler/app per name.
      result = await run('up');
      assert.equal(result.code, 0, result.output);
      result = await run('down');
      assert.equal(result.code, 0, result.output);
      result = await run('status');
      assert.doesNotMatch(result.output, /: online/);
      assert.match(
        fs.readFileSync(
          path.join(root, '.tmp/pm2-dev/logs/testhub-ai-worker-dev-out.log'),
          'utf8',
        ),
        /DRAINED/,
      );
      logs.kill();
      logs = null;
    } finally {
      logs?.kill();
      await run('down').catch(() => {});
      // Kill only this fixture's isolated daemon, not the developer's PM2 daemon.
      await new Promise((resolve) => {
        const cleanup = spawn(
          process.execPath,
          [
            '-e',
            `const s=require('./scripts/dev/shared.cjs');const p=s.manager();s.call(p,'connect').then(()=>s.call(p,'killDaemon')).finally(()=>{p.disconnect();process.exit(0)});`,
          ],
          { cwd: root, env: environment, windowsHide: true, stdio: 'ignore' },
        );
        const timer = setTimeout(() => {
          cleanup.kill();
          resolve();
        }, 15000);
        cleanup.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
        cleanup.once('error', () => {
          clearTimeout(timer);
          resolve();
        });
      });
      assert.ok(
        fs.realpathSync(root).startsWith(fs.realpathSync(base) + path.sep),
      );
      fs.rmSync(root, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 200,
      });
    }
  },
);
