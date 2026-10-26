// PM2 7 uses shared Windows pipe names even with different PM2_HOME values.
// Run this preload in both clients and the daemon to isolate this project's dev
// processes from global/production PM2, including on Windows.
const { createHash } = require('node:crypto');
const { tmpdir, userInfo } = require('node:os');
const { resolve, join } = require('node:path');
if (process.env.TESTHUB_DEV_PM2 === '1') {
  const home = resolve(process.env.PM2_HOME);
  const key = createHash('sha256')
    .update(`${home}:${userInfo().username}`)
    .digest('hex')
    .slice(0, 16);
  const constants = require('pm2/constants');
  for (const [property, suffix] of [
    ['DAEMON_RPC_PORT', 'rpc'],
    ['DAEMON_PUB_PORT', 'pub'],
    ['INTERACTOR_RPC_PORT', 'agent'],
  ]) {
    constants[property] =
      process.platform === 'win32'
        ? `\\\\.\\pipe\\testhub-dev-${key}-${suffix}.sock`
        : join(tmpdir(), `testhub-dev-${key}-${suffix}.sock`);
  }
}
