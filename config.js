// Load .env file if present. Hosting panels that cannot pass --env-file=.env
// rely on this to fill environment variables from an uploaded file.
// Real environment variables take priority over file values.
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  // No .env file is normal when all variables come from the hosting panel
}

export const PREFIX = process.env.PREFIX ?? '/';
export const PHONE_NUMBER = process.env.PHONE_NUMBER;
export const OWNER = process.env.OWNER;
export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
export const WA_LOG_LEVEL = process.env.WA_LOG_LEVEL ?? 'silent';
export const QUIET_SIGNAL_NOISE = (process.env.QUIET_SIGNAL_NOISE ?? 'true') !== 'false';
export const SESSION_ID = process.env.SESSION_ID ?? '';
export const SESSION_DIR = process.env.SESSION_DIR ?? 'session';
// Force a reconnect when a game is running but no message has dispatched for
// this long — see transport/wa.js's watchdog. 0 disables it.
export const STALL_TIMEOUT_MS = Number(process.env.STALL_TIMEOUT_MS ?? 3 * 60 * 1000);
// Default 0 (disabled): shutdown() ends in process.exit(), and on a bare
// panel host (e.g. pterodactyl) with no process supervisor, exiting means the
// bot stays dead until a human presses Start. Only set this >0 if the host
// runs the bot under pm2/systemd/a supervisor that restarts on exit.
export const AUTO_RESTART_HOURS = Number(process.env.AUTO_RESTART_HOURS ?? 0);
export const ADMINS = (process.env.ADMINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(s => s.length > 0)
  .map(s => {
    if (!/^\d+$/.test(s)) {
      throw new Error(`ADMINS env var contains invalid entry (digits only, no +): "${s}"`);
    }
    return s;
  });

if (!PHONE_NUMBER || !/^\d+$/.test(PHONE_NUMBER)) {
  throw new Error('PHONE_NUMBER env var missing or invalid (digits only, no +)');
}
