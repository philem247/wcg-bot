// One-time manual recovery: deletes corrupted Signal ratchet rows (session +
// sender-key) without touching creds/pre-key/app-state-sync-key. Run with the
// bot stopped: `node scripts/purge-sessions.mjs` (or `DB_PATH=... node ...`).
//
// Keep this DELETE in sync with store/auth.js's purgeSignalSessions().
import { DatabaseSync } from 'node:sqlite';

const dbPath = process.env.DB_PATH ?? 'wcg.db';
const db = new DatabaseSync(dbPath);
const result = db.prepare(
  "DELETE FROM wa_keys WHERE category IN ('session', 'sender-key')"
).run();
db.close();

console.log(`Purged ${result.changes} Signal ratchet row(s) from ${dbPath}. creds/pre-key/app-state-sync-key untouched.`);
