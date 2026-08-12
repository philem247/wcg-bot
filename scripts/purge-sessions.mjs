// One-time manual recovery. Default: pairwise `session` rows only (safe,
// self-healing via retry receipts). Pass --all to also purge `sender-key`
// rows (group decryption) — NOT self-healing, breaks every group until this
// device is re-paired. creds/pre-key/app-state-sync-key never touched.
// Run with the bot stopped: `node scripts/purge-sessions.mjs [--all]`
// (or `DB_PATH=... node ...`).
//
// Keep this DELETE in sync with store/auth.js's purgePairwiseSessions()/purgeAllSignalSessions().
import { DatabaseSync } from 'node:sqlite';

const all = process.argv.includes('--all');
const dbPath = process.env.DB_PATH ?? 'wcg.db';
const db = new DatabaseSync(dbPath);

if (all) {
  console.warn('--all: also purging sender-key rows. This breaks group decryption for every group until this device is re-paired — sender keys do not self-heal. Try a plain (no --all) pairwise-only purge first.');
}

const query = all
  ? "DELETE FROM wa_keys WHERE category IN ('session', 'sender-key')"
  : "DELETE FROM wa_keys WHERE category = 'session'";
const result = db.prepare(query).run();
db.close();

console.log(`Purged ${result.changes} ${all ? 'session + sender-key' : 'pairwise session'} row(s) from ${dbPath}. creds/pre-key/app-state-sync-key untouched.`);
