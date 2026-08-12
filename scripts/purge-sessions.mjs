// One-time manual recovery. Default: pairwise `session` rows only (safe,
// self-healing via retry receipts). Pass --all to also purge `sender-key`
// rows (group decryption) — NOT self-healing, breaks every group until this
// device is re-paired. creds/pre-key/app-state-sync-key never touched.
// Pass --reset to wipe EVERYTHING including creds, forcing a full re-pair
// (new pairing code on next boot) — use this when clearing SESSION_ID alone
// did not force it, because creds in the DB take priority (see README).
// Run with the bot stopped: `node scripts/purge-sessions.mjs [--all|--reset]`
// (or `DB_PATH=... node ...`).
//
// Keep this DELETE in sync with store/auth.js's
// purgePairwiseSessions()/purgeAllSignalSessions()/wipeAll().
import { DatabaseSync } from 'node:sqlite';

const all = process.argv.includes('--all');
const reset = process.argv.includes('--reset');
const dbPath = process.env.DB_PATH ?? 'wcg.db';
const db = new DatabaseSync(dbPath);

if (reset) {
  console.warn('--reset: wiping ALL wa_keys rows including creds. This destroys this device\'s identity — a fresh pairing code is required on next boot.');
} else if (all) {
  console.warn('--all: also purging sender-key rows. This breaks group decryption for every group until this device is re-paired — sender keys do not self-heal. Try a plain (no --all) pairwise-only purge first.');
}

const query = reset
  ? 'DELETE FROM wa_keys'
  : all
    ? "DELETE FROM wa_keys WHERE category IN ('session', 'sender-key')"
    : "DELETE FROM wa_keys WHERE category = 'session'";
const result = db.prepare(query).run();
db.close();

const label = reset ? 'all (including creds)' : all ? 'session + sender-key' : 'pairwise session';
console.log(`Purged ${result.changes} ${label} row(s) from ${dbPath}.${reset ? '' : ' creds/pre-key/app-state-sync-key untouched.'}`);
