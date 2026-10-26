const fs = require('node:fs');
const { StringDecoder } = require('node:string_decoder');
const { stripVTControlCharacters } = require('node:util');

/** Prefix every physical line, including multiline stack traces and split UTF-8 writes. */
function lineWriter(name, write = (text) => process.stdout.write(text)) {
  let decoder = new StringDecoder('utf8'),
    pending = '';
  const emit = (line) =>
    write(`[${name}] - ${stripVTControlCharacters(line)}\n`);
  return {
    push(bytes) {
      pending += decoder.write(bytes);
      const lines = pending.split('\n');
      pending = lines.pop();
      for (const line of lines) emit(line.replace(/\r$/, ''));
    },
    flush() {
      pending += decoder.end();
      if (pending) emit(pending.replace(/\r$/, ''));
      pending = '';
      decoder = new StringDecoder('utf8');
    },
  };
}

/** Tail bounded history and live bytes; preserve offsets across polls and handle rotation. */
function tail(file, name, lines, write) {
  const output = lineWriter(name, write);
  let offset = 0,
    inode = null,
    initialized = false,
    closed = false;
  const poll = () => {
    if (closed) return;
    let fd;
    try {
      fd = fs.openSync(file, 'r');
      const stat = fs.fstatSync(fd);
      if (inode !== null && (inode !== stat.ino || stat.size < offset)) {
        output.flush();
        offset = 0;
      }
      inode = stat.ino;
      if (!initialized) {
        offset = Math.max(0, stat.size - 131072);
        const bytes = Buffer.alloc(stat.size - offset);
        fs.readSync(fd, bytes, 0, bytes.length, offset);
        const end = bytes.lastIndexOf(10);
        const start = offset > 0 ? bytes.indexOf(10) + 1 : 0;
        let complete =
          end < start
            ? []
            : bytes.subarray(start, end).toString('utf8').split('\n');
        if (lines)
          output.push(
            Buffer.from(
              complete.slice(-lines).join('\n') + (complete.length ? '\n' : ''),
            ),
          );
        // Keep the in-progress line as raw bytes, including an incomplete UTF-8
        // character, until a later append completes it.
        if (end + 1 < bytes.length && (offset === 0 || end >= 0))
          output.push(bytes.subarray(end + 1));
        offset = stat.size;
        initialized = true;
      }
      while (offset < stat.size) {
        const bytes = Buffer.alloc(Math.min(65536, stat.size - offset));
        const count = fs.readSync(fd, bytes, 0, bytes.length, offset);
        if (!count) break;
        output.push(bytes.subarray(0, count));
        offset += count;
      }
    } catch (error) {
      if (!['ENOENT', 'EACCES', 'EPERM'].includes(error.code)) throw error;
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  };
  poll();
  const timer = setInterval(poll, 150);
  return () => {
    closed = true;
    clearInterval(timer);
    output.flush();
  };
}

/** Stream only the four dev applications, without stopping them when logs are closed. */
function logs(apps, args) {
  let lines = 20,
    only = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lines') {
      lines = Number(args[++i]);
      if (!Number.isInteger(lines) || lines < 0 || lines > 500)
        throw new Error('Use --lines 0..500');
    } else if (args[i] === '--only') {
      only = args[++i];
      if (!only) throw new Error('Unknown development process');
    } else
      throw new Error(
        'Use dev:logs -- [--lines 0..500] [--only api|ai-worker|document-worker|compiler]',
      );
  }
  const selected = only
    ? apps.filter((app) => app.name === `testhub-${only}-dev`)
    : apps;
  if (!selected.length) throw new Error('Unknown development process');
  const close = selected.flatMap((app) => [
    tail(app.out_file, app.name, lines),
    tail(app.error_file, app.name, lines),
  ]);
  process.stdout.write(
    '[dev] - Following logs; Ctrl+C closes this view and keeps processes running.\n',
  );
  const stop = () => {
    close.forEach((fn) => fn());
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

module.exports = { lineWriter, tail, logs };
