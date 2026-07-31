// Single-instance guard for SESSION_DIR. Two live processes advancing the same
// Signal ratchets corrupt each other's session state (persistent Bad MAC /
// decrypt failures) — this stops a second instance from ever opening the socket.
import fs from 'node:fs';
import path from 'node:path';

let lockPath = null;

// Exported because it's the one piece of real logic here: process.kill(pid, 0)
// sends no signal, just checks the pid exists. ESRCH = no such process (dead).
// Any other error (e.g. EPERM, pid owned by another user) means it does exist.
export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== 'ESRCH';
  }
}

function writeLock(file) {
  const fd = fs.openSync(file, 'wx'); // exclusive create, fails if it already exists
  fs.writeSync(fd, String(process.pid));
  fs.closeSync(fd);
  lockPath = file;
}

// Throws if a live instance already holds the lock. Clears + retakes a stale
// lock (dead pid) left behind by a crash.
export function acquireLock(dir, logger = console) {
  const file = path.join(dir, '.lock');
  try {
    writeLock(file);
    return;
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }

  const pidStr = fs.readFileSync(file, 'utf8').trim();
  const pid = Number(pidStr);
  if (pid && isProcessAlive(pid)) {
    throw new Error(
      `Another wcg-bot instance is already running against "${dir}" (pid ${pid}). ` +
      `Refusing to start: two processes sharing session/ corrupts the WhatsApp session.`
    );
  }

  const warn = logger.warn || logger.log;
  warn.call(logger, `lock: stale lock (pid ${pidStr || '?'}) found in ${dir}, clearing`);
  fs.unlinkSync(file);
  writeLock(file);
}

export function releaseLock() {
  if (!lockPath) return;
  try { fs.unlinkSync(lockPath); } catch {}
  lockPath = null;
}
