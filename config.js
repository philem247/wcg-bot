// Load .env file if present. Hosting panels that cannot pass --env-file=.env
// rely on this to fill environment variables from an uploaded file.
// Real environment variables take priority over file values.
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  // No .env file is normal when all variables come from the hosting panel
}

// Hosting panels have no way to "unset" a variable — you blank the field, which
// hands us '' rather than undefined. `??` only falls back on null/undefined, so
// a blanked field used to pass '' straight through: WA_LOG_LEVEL='' crashed pino
// at boot ("default level: must be included in custom levels"), and Number('')
// is 0, which silently DISABLED the stall/silence watchdogs. Treat blank and
// whitespace-only as absent everywhere.
function envStr(name, fallback) {
  const raw = process.env[name];
  return raw === undefined || raw.trim() === '' ? fallback : raw.trim();
}

function envNum(name, fallback) {
  const n = Number(envStr(name, ''));
  return Number.isFinite(n) && envStr(name, '') !== '' ? n : fallback;
}

export const PREFIX = envStr('PREFIX', '/');
export const PHONE_NUMBER = process.env.PHONE_NUMBER;
export const OWNER = process.env.OWNER;
export const LOG_LEVEL = envStr('LOG_LEVEL', 'info');
export const WA_LOG_LEVEL = envStr('WA_LOG_LEVEL', 'silent');
export const QUIET_SIGNAL_NOISE = (process.env.QUIET_SIGNAL_NOISE ?? 'true') !== 'false';
// Default OFF: one-time manual recovery for ratchet rows already corrupted
// before the phase-8/9 fixes existed. Purges session/sender-key rows once on
// boot, then UNSET this — see README Reliability section.
export const PURGE_SIGNAL_ON_BOOT = process.env.PURGE_SIGNAL_ON_BOOT === 'true';
// Default OFF: wipes ALL wa_keys rows (including creds) before the auth state
// is constructed, forcing fresh credential generation and a pairing code on
// next boot. Use when clearing SESSION_ID alone did not force a re-pair (the
// DB still has old creds) — see README Reliability section. UNSET after use.
export const RESET_SESSION = process.env.RESET_SESSION === 'true';
// Default OFF: when enabled, announces this linked device as the active client
// on connect, which is diagnostic for WhatsApp queueing vs. streaming behavior.
export const MARK_ONLINE = process.env.MARK_ONLINE === 'true';
// Default OFF: gates the 13 TRACE: log calls (index.js, transport/outbox.js,
// transport/router.js) that fire on every inbound message. They're the
// primary diagnostic for a recurring production hang — enable to diagnose,
// leave off to avoid flooding logs.
export const TRACE_LOG = process.env.TRACE_LOG === 'true';
export const SESSION_ID = process.env.SESSION_ID ?? '';
export const SESSION_DIR = envStr('SESSION_DIR', 'session');
// Force a reconnect when a game is running but no message has dispatched for
// this long — see transport/wa.js's watchdog. 0 disables it.
export const STALL_TIMEOUT_MS = envNum('STALL_TIMEOUT_MS', 3 * 60 * 1000);
// Deaf-socket detector (transport/wa.js shouldRepairPreKeys): connected, but no
// notify traffic for this long AND libsignal has logged decrypt failures -> a
// peer's pre-key is missing from our wa_keys store, silently NACKing every
// message before it reaches messages.upsert. 0 disables it.
export const SILENCE_TIMEOUT_MS = envNum('SILENCE_TIMEOUT_MS', 15 * 60 * 1000);
// Default 0 (disabled): shutdown() ends in process.exit(), and on a bare
// panel host (e.g. pterodactyl) with no process supervisor, exiting means the
// bot stays dead until a human presses Start. Only set this >0 if the host
// runs the bot under pm2/systemd/a supervisor that restarts on exit.
export const AUTO_RESTART_HOURS = envNum('AUTO_RESTART_HOURS', 0);
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
