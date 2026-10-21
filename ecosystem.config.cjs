const { resolve } = require('node:path');

module.exports = {
  apps: [
    {
      name: 'testhub-api',
      script: './dist/main.js',
      // Restarting an existing process must update its stored executable path.
      pm_exec_path: resolve(__dirname, 'dist/main.js'),
      cwd: __dirname,
    },
  ],
};
