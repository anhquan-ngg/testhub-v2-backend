const { resolve } = require('node:path');
const allowed = new Set([
  'main.js',
  'question-generation.worker.js',
  'document.worker.js',
]);
const entry = process.argv[2];
if (!allowed.has(entry)) throw new Error('Unknown development entry point');
let closing = false;
process.on('message', (message) => {
  if (message !== 'shutdown' || closing) return;
  closing = true;
  // Nest's shutdown hooks drain BullMQ workers before pools are closed. Emitting
  // a signal locally also works on Windows, where PM2 sends an IPC message.
  if (process.listenerCount('SIGINT')) process.emit('SIGINT');
  else process.exit(0);
});
require(resolve(__dirname, '../../dist', entry));
