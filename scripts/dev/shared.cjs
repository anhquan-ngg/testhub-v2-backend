const fs = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../..');
const home = resolve(root, '.tmp/pm2-dev');
const statePath = resolve(home, 'build-state.json');
const stopPath = resolve(home, 'stopping');
const apps = require(resolve(root, 'ecosystem.dev.config.cjs')).apps;
const compiler = apps[0];
const runtimes = apps.slice(1);

/** Connect only to this repository's private PM2 daemon, never global PM2. */
function manager() {
  fs.mkdirSync(home, { recursive: true });
  process.env.PM2_HOME = home;
  process.env.PM2_DISCRETE_MODE = 'true';
  process.env.PM2_SILENT = 'true';
  process.env.TESTHUB_DEV_PM2 = '1';
  const preload = resolve(__dirname, 'pm2-paths.cjs');
  const flag = `--require=${JSON.stringify(preload)}`;
  if (!(process.env.NODE_OPTIONS || '').includes(flag))
    process.env.NODE_OPTIONS =
      `${process.env.NODE_OPTIONS || ''} ${flag}`.trim();
  require(preload);
  return require('pm2');
}

/** Adapt PM2's callback API without exposing process environment in output. */
function call(pm2, method, ...args) {
  return new Promise((resolveCall, reject) =>
    pm2[method](...args, (error, value) =>
      error ? reject(error) : resolveCall(value),
    ),
  );
}

/** Publish a small atomic checkpoint; no source text, env values or credentials. */
function state(value) {
  fs.mkdirSync(home, { recursive: true });
  const temp = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(
    temp,
    JSON.stringify({ ...value, updated_at: new Date().toISOString() }),
  );
  fs.renameSync(temp, statePath);
}

/** Return status without failing on a missing initial checkpoint. */
function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  root,
  home,
  apps,
  compiler,
  runtimes,
  statePath,
  stopPath,
  manager,
  call,
  state,
  readState,
};
