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
  // synchronous=FULL (SQLite's default) fsyncs on every commit; on a contended
  // container disk that costs 100-300ms per write and node:sqlite is fully
  // synchronous, so it freezes the whole event loop mid-game. NORMAL is WAL
  // mode's own officially-recommended setting: still crash-safe, only the very
  // last transaction is at risk on an OS-level crash/power loss (baileys
  // re-derives Signal keys anyway). Do not set this back to FULL.
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA busy_timeout = 5000');
  ensureTable(db);

  // Prepared statements — created once, reused for every get/set.
  const stmtGet = db.prepare('SELECT value FROM wa_keys WHERE category = ? AND id = ?');
  const stmtSet = db.prepare(
    'INSERT INTO wa_keys (category, id, value) VALUES (?, ?, ?) ON CONFLICT(category, id) DO UPDATE SET value = excluded.value'
  );
  const stmtDel = db.prepare('DELETE FROM wa_keys WHERE category = ? AND id = ?');

  // Diagnostics only (see HANDOVER.md phase 7): this pair runs synchronously
  // on literally every inbound decrypt / outbound encrypt via baileys'
  // keys.get/keys.set. node:sqlite is fully synchronous, so a slow call here
  // blocks the whole event loop for its duration. Threshold generous — normal
  // local SQLite ops are sub-millisecond.
  const SLOW_MS = 100;

  function readKey(category, id) {
    const start = performance.now();
    const row = stmtGet.get(category, id);
    const ms = performance.now() - start;
    if (ms > SLOW_MS) console.warn(`SLOW: auth.readKey(${category}) took ${ms.toFixed(1)}ms`);
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
    const start = performance.now();
    if (value === null || value === undefined) {
      stmtDel.run(category, id);
    } else {
      stmtSet.run(category, id, JSON.stringify(value, BufferJSON.replacer));
    }
    const ms = performance.now() - start;
    if (ms > SLOW_MS) console.warn(`SLOW: auth.writeKey(${category}) took ${ms.toFixed(1)}ms`);
  }

  // ── Creds ──
  // Check if creds are already in the DB from a previous run.
  let creds = readKey('creds', 'default');

  if (creds && sessionId) {
    // If the user explicitly provided a SESSION_ID in .env, check if it's a NEW session
    // (meaning they want to override the database and re-pair from scratch).
    try {
      const envCreds = decodeCreds(sessionId);
      if (Buffer.compare(envCreds.noiseKey.public, creds.noiseKey.public) !== 0) {
        db.exec('DELETE FROM wa_keys;');
        creds = null; // force it to load the new creds below
      }
    } catch (e) {
      // ignore invalid SESSION_ID strings
    }
  }

  // If no creds in DB (or if they were just wiped above), bootstrap from env or generate fresh.
  if (!creds) {
    creds = sessionId ? decodeCreds(sessionId) : initAuthCreds();
    writeKey('creds', 'default', creds);
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
          // One transaction for the whole batch: baileys calls set() with
          // multiple keys at once, and without this each key was its own
          // implicit commit (N fsyncs instead of 1). Also makes the batch
          // atomic, which is strictly safer for Signal ratchet consistency.
          db.exec('BEGIN');
          try {
            for (const category in data) {
              for (const id in data[category]) {
                writeKey(category, id, data[category][id]);
              }
            }
            db.exec('COMMIT');
          } catch (e) {
            db.exec('ROLLBACK');
            throw e;
          }
        },
      },
    },
    saveCreds: async () => {
      // Baileys mutates the creds object in-place (e.g. rotating nextPreKeyId).
      // We MUST save it back to the database on every change, otherwise we will
      // reuse old keys on restart and cause Signal decryption failures.
      writeKey('creds', 'default', creds);
    },

    // Expose for the bot to call after a successful first-time pair.
    // Returns the base64 string the user needs to save as SESSION_ID.
    getSessionId: () => encodeCreds(creds),

    // Purge only pairwise (1:1) session rows. SELF-HEALING: baileys re-derives
    // these automatically via retry receipts after a peer's next send. Safe to
    // call unattended (watchdog, badSession branch).
    purgePairwiseSessions: () => {
      const result = db.prepare("DELETE FROM wa_keys WHERE category = 'session'").run();
      return result.changes;
    },

    // Purge pairwise sessions AND sender-key rows (group decryption). NOT
    // SELF-HEALING: a sender-key is redistributed by a participant's client
    // only when it believes the recipient device changed — deleting it locally
    // does not change this device's identity, so peers keep encrypting with a
    // key we no longer hold and every group stays permanently undecryptable
    // until this device is re-paired (new identity forces redistribution).
    // Manual/operator use only (PURGE_SIGNAL_ON_BOOT, scripts/purge-sessions.mjs)
    // — never call this from an unattended path. Keep this DELETE in sync with
    // scripts/purge-sessions.mjs.
    purgeAllSignalSessions: () => {
      const result = db.prepare(
        "DELETE FROM wa_keys WHERE category IN ('session', 'sender-key')"
      ).run();
      return result.changes;
    },

    // Completely wipe all credentials and signal keys. Used when the session
    // is permanently dead (401 loggedOut) to force a fresh pair on next boot.
    wipeAll: () => {
      const result = db.prepare("DELETE FROM wa_keys").run();
      return result.changes;
    },
  };
}
