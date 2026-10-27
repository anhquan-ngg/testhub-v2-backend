const { resolve } = require('node:path');
const root = __dirname;
const home = resolve(root, '.tmp/pm2-dev');
const common = {
  cwd: root,
  interpreter: process.execPath,
  exec_mode: 'fork',
  instances: 1,
  watch: false, // Compiler restarts apps only after a complete successful build.
  autorestart: true,
  restart_delay: 2000,
  min_uptime: 5000,
  max_restarts: 10,
  kill_timeout: 240000,
  shutdown_with_message: true, // PM2 uses IPC for graceful Windows shutdown.
  merge_logs: true,
  env: { NODE_ENV: 'development', FORCE_COLOR: '0' },
};
module.exports = {
  apps: [
    {
      name: 'testhub-compiler-dev',
      script: resolve(root, 'scripts/dev/compiler.cjs'),
    },
    {
      name: 'testhub-api-dev',
      script: resolve(root, 'scripts/dev/runtime.cjs'),
      args: ['main.js'],
    },
    {
      name: 'testhub-ai-worker-dev',
      script: resolve(root, 'scripts/dev/runtime.cjs'),
      args: ['question-generation.worker.js'],
    },
    {
      name: 'testhub-document-worker-dev',
      script: resolve(root, 'scripts/dev/runtime.cjs'),
      args: ['document.worker.js'],
    },
  ].map((app) => ({
    ...common,
    ...app,
    out_file: resolve(home, 'logs', `${app.name}-out.log`),
    error_file: resolve(home, 'logs', `${app.name}-error.log`),
  })),
};
