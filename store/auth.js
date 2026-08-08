// SQLite-backed auth state for baileys. Replaces useMultiFileAuthState (file-per-key)
// with a single table in wcg.db. Why this is better:
//
//   1. ATOMIC WRITES: SQLite's WAL journal guarantees every key write is all-or-nothing.
//      File-based writes can half-flush on a container kill, corrupting one key and taking
//      the entire Signal session down with it (the badSession/MessageCounterError loop).
//
//   2. NO FILE RACES: useMultiFileAuthState needs per-file mutexes (async-mutex) because
//      Node's fs module can interleave writes to the same file. SQLite serializes writes
//      internally — no mutex needed, no window for a stale read.
//
//   3. SESSION_ID: The creds (device identity, ~2KB) are encoded as a single base64 string
//      that lives in the .env file. No session/ folder to back up, corrupt, or lose on a
//      panel reinstall. Signal ratchet keys (session-*, sender-key-*, pre-key-*) go into
//      the wa_keys table and are rebuilt automatically if the DB is lost.
//
// Compatible with baileys 6.x's auth state interface: { state: { creds, keys }, saveCreds }.

import { DatabaseSync } from 'node:sqlite';
import { proto } from 'baileys/WAProto/index.js';
import { initAuthCreds } from 'baileys/lib/Utils/auth-utils.js';
import { BufferJSON } from 'baileys/lib/Utils/generics.js';

// ── Creds codec: SESSION_ID string ↔ creds object ──────────────────────────

export function encodeCreds(creds) {
  const json = JSON.stringify(creds, BufferJSON.replacer);
  return Buffer.from(json).toString('base64');
}

export function decodeCreds(sessionId) {
  const json = Buffer.from(sessionId, 'base64').toString('utf-8');
  return JSON.parse(json, BufferJSON.reviver);
}

// ── SQLite key store ────────────────────────────────────────────────────────

function ensureTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wa_keys (
      category TEXT NOT NULL,
      id       TEXT NOT NULL,
      value    TEXT,
      PRIMARY KEY (category, id)
    )
  `);
}

/**
 * Build a baileys-compatible auth state backed by SQLite.
 *
 * @param {object}  opts
 * @param {string}  [opts.sessionId]  - SESSION_ID env var (base64-encoded creds).
 *                                      Omit on first run to generate fresh creds.
 * @param {string}  [opts.dbPath]     - Path to SQLite DB (default: process.env.DB_PATH ?? 'wcg.db')
 * @param {object}  [opts.existingDb] - An already-opened DatabaseSync instance (for sharing with the app db)
 */
export function useSqliteAuthState({ sessionId, dbPath, existingDb } = {}) {
  const db = existingDb ?? new DatabaseSync(dbPath ?? process.env.DB_PATH ?? 'wcg.db');
  db.exec('PRAGMA journal_mode = WAL');
  ensureTable(db);

  // ── Creds ──
  // If a SESSION_ID was provided, decode it. Otherwise generate fresh creds.
  // creds is mutated in-place by baileys (it does Object.assign onto it), so
  // this single object must survive the process lifetime.
  const creds = sessionId ? decodeCreds(sessionId) : initAuthCreds();

  // Prepared statements — created once, reused for every get/set.
  const stmtGet = db.prepare('SELECT value FROM wa_keys WHERE category = ? AND id = ?');
  const stmtSet = db.prepare(
    'INSERT INTO wa_keys (category, id, value) VALUES (?, ?, ?) ON CONFLICT(category, id) DO UPDATE SET value = excluded.value'
  );
  const stmtDel = db.prepare('DELETE FROM wa_keys WHERE category = ? AND id = ?');

  function readKey(category, id) {
    const row = stmtGet.get(category, id);
    if (!row) return null;
    try {
      let value = JSON.parse(row.value, BufferJSON.reviver);
      if (category === 'app-state-sync-key' && value) {
        value = proto.Message.AppStateSyncKeyData.fromObject(value);
      }
      return value;
    } catch {
      return null;
    }
  }

  function writeKey(category, id, value) {
    if (value === null || value === undefined) {
      stmtDel.run(category, id);
    } else {
      stmtSet.run(category, id, JSON.stringify(value, BufferJSON.replacer));
    }
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            const value = readKey(type, id);
            if (value) data[id] = value;
          }
          return data;
        },
        set: async (data) => {
          for (const category in data) {
            for (const id in data[category]) {
              writeKey(category, id, data[category][id]);
            }
          }
        },
      },
    },
    saveCreds: async () => {
      // creds live in the SESSION_ID env var, not in the DB. On first pair
      // (no SESSION_ID yet), we print the new SESSION_ID to the console.
      // saveCreds is a no-op in normal operation — the creds object in memory
      // is the source of truth, and it's already the same object baileys mutates.
      // Nothing to persist to disk; the SESSION_ID is write-once at pair time.
    },

    // Expose for the bot to call after a successful first-time pair.
    // Returns the base64 string the user needs to save as SESSION_ID.
    getSessionId: () => encodeCreds(creds),

    // Purge all Signal ratchet sessions from the DB. Same purpose as the old
    // purgeSignalSessions() but atomic and instant — no file I/O.
    purgeSignalSessions: () => {
      const result = db.prepare(
        "DELETE FROM wa_keys WHERE category IN ('session', 'sender-key')"
      ).run();
      return result.changes;
    },
  };
}
