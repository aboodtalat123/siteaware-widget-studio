import { spawn } from 'node:child_process';

const processes = [];

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    ...options,
  });
  processes.push(child);
  return child;
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
start(npmCommand, ['run', 'dev:ui']);
start(process.execPath, ['server.mjs']);

function shutdown(code = 0) {
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
