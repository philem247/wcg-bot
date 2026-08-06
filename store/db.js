import { DatabaseSync } from 'node:sqlite'
import { fold, isWord } from '../engine/normalize.js'

export function openDb(path = process.env.DB_PATH ?? 'wcg.db') {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL')

  // Create schema if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY,
      jid TEXT NOT NULL,
      mode TEXT, type TEXT,
      started_at INTEGER, ended_at INTEGER,
      words INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS results (
      game_id INTEGER NOT NULL,
      jid TEXT NOT NULL,
      player TEXT NOT NULL,
      placement INTEGER NOT NULL,
      player_count INTEGER NOT NULL,
      ended_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rejections (
      jid TEXT NOT NULL, word TEXT NOT NULL, player TEXT, ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_words (
      word TEXT PRIMARY KEY, jid TEXT, added_by TEXT, ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      jid TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
      PRIMARY KEY (jid, key)
    );
    CREATE TABLE IF NOT EXISTS bot_admins (
      jid TEXT NOT NULL, number TEXT NOT NULL, added_by TEXT, added_at INTEGER,
      PRIMARY KEY (jid, number)
    );
    CREATE TABLE IF NOT EXISTS asked_questions (
      jid TEXT NOT NULL, category TEXT NOT NULL, qid TEXT NOT NULL, ts INTEGER NOT NULL,
      PRIMARY KEY (jid, qid)
    );
    CREATE TABLE IF NOT EXISTS trivia_bans (
      jid TEXT NOT NULL, number TEXT NOT NULL,
      PRIMARY KEY (jid, number)
    );
    CREATE INDEX IF NOT EXISTS idx_results_jid_ended ON results(jid, ended_at);
    CREATE INDEX IF NOT EXISTS idx_rejections_jid_word ON rejections(jid, word);
  `)

  // Migration: add player_pn column for phone-form JID aggregation.
  // Same person can appear under @s.whatsapp.net and @lid namespaces;
  // player_pn stores the phone-form JID so leaderboard groups correctly.
  try {
    db.exec('ALTER TABLE results ADD COLUMN player_pn TEXT')
  } catch {
    // Column already exists — expected on every run after the first migration.
  }

  // Prepare statements once
  const stmtInsertGame = db.prepare(
    'INSERT INTO games (jid, mode, type, started_at, ended_at, words) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const stmtInsertResult = db.prepare(
    'INSERT INTO results (game_id, jid, player, player_pn, placement, player_count, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const stmtInsertRejection = db.prepare(
    'INSERT INTO rejections (jid, word, player, ts) VALUES (?, ?, ?, ?)'
  )
  const stmtSelectRejections = db.prepare(`
    SELECT word, COUNT(*) as count
    FROM rejections
    WHERE jid = ?
      AND word NOT IN (SELECT word FROM custom_words)
    GROUP BY word
    ORDER BY count DESC
    LIMIT ?
  `)
  const stmtInsertCustomWord = db.prepare(
    'INSERT OR IGNORE INTO custom_words (word, jid, added_by, ts) VALUES (?, ?, ?, ?)'
  )
  const stmtDeleteCustomWord = db.prepare(
    'DELETE FROM custom_words WHERE word = ?'
  )
  const stmtSelectCustomWords = db.prepare(
    'SELECT word FROM custom_words ORDER BY word'
  )
  const stmtSelectResultsTrivia = db.prepare(`
    SELECT COALESCE(r.player_pn, r.player) AS player, r.placement, r.player_count
    FROM results r JOIN games g ON g.id = r.game_id
    WHERE r.jid = ? AND r.ended_at >= ? AND g.type = 'trivia'
    ORDER BY player
  `)
  const stmtSelectResultsChain = db.prepare(`
    SELECT COALESCE(r.player_pn, r.player) AS player, r.placement, r.player_count
    FROM results r JOIN games g ON g.id = r.game_id
    WHERE r.jid = ? AND r.ended_at >= ? AND g.type IS NOT 'trivia'
    ORDER BY player
  `)
  const stmtMarkAsked = db.prepare(
    'INSERT OR IGNORE INTO asked_questions (jid, category, qid, ts) VALUES (?, ?, ?, ?)'
  )
  const stmtAskedIds = db.prepare(
    'SELECT qid FROM asked_questions WHERE jid = ?'
  )
  const stmtClearAsked = db.prepare(
    'DELETE FROM asked_questions WHERE jid = ? AND category = ?'
  )
  const stmtGetSetting = db.prepare(
    'SELECT value FROM settings WHERE jid = ? AND key = ?'
  )
  const stmtSetSetting = db.prepare(
    'INSERT INTO settings (jid, key, value) VALUES (?, ?, ?) ON CONFLICT(jid, key) DO UPDATE SET value = excluded.value'
  )
  const stmtInsertBotAdmin = db.prepare(
    'INSERT OR IGNORE INTO bot_admins (jid, number, added_by, added_at) VALUES (?, ?, ?, ?)'
  )
  const stmtDeleteBotAdmin = db.prepare(
    'DELETE FROM bot_admins WHERE jid = ? AND number = ?'
  )
  const stmtSelectBotAdmins = db.prepare(
    'SELECT number FROM bot_admins WHERE jid = ? ORDER BY number'
  )
  const stmtInsertBan = db.prepare(
    'INSERT OR IGNORE INTO trivia_bans (jid, number) VALUES (?, ?)'
  )
  const stmtDeleteBan = db.prepare(
    'DELETE FROM trivia_bans WHERE jid = ? AND number = ?'
  )
  const stmtSelectBans = db.prepare(
    'SELECT number FROM trivia_bans WHERE jid = ? ORDER BY number'
  )

  return {
    recordGame({ jid, mode, type, startedAt, endedAt, words, results }) {
      db.exec('BEGIN')
      try {
        const info = stmtInsertGame.run(jid, mode, type, startedAt, endedAt, words)
        const gameId = info.lastInsertRowid

        for (const { player, placement, player_pn } of results) {
          stmtInsertResult.run(gameId, jid, player, player_pn ?? null, placement, results.length, endedAt)
        }

        db.exec('COMMIT')
        return gameId
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },

    recordRejection({ jid, word, player, ts }) {
      if (!isWord(word)) return // junk (punctuation/digits/too-short) never enters pending/addword-all
      stmtInsertRejection.run(jid, fold(word), player, ts)
    },

    pending(jid, limit = 10) {
      return stmtSelectRejections.all(jid, limit)
    },

    addWord(word, { jid, addedBy, ts }) {
      const result = stmtInsertCustomWord.run(fold(word), jid, addedBy, ts)
      return result.changes > 0
    },

    delWord(word) {
      const result = stmtDeleteCustomWord.run(fold(word))
      return result.changes > 0
    },

    customWords() {
      return stmtSelectCustomWords.all().map(row => row.word)
    },

    leaderboard({ jid, since = 0, limit = 10, type = 'chain' }) {
      const stmt = type === 'trivia' ? stmtSelectResultsTrivia : stmtSelectResultsChain
      const rows = stmt.all(jid, since)

      const agg = new Map()
      for (const { player, placement } of rows) {
        if (!agg.has(player)) {
          agg.set(player, { score: 0, wins: 0, games: 0 })
        }
        const stats = agg.get(player)
        stats.games++
        // Football scoring: a win is 3, second place is the "draw" at 1, and
        // nobody else takes anything. Points are derived from placement on every
        // read rather than stored, so changing this re-scores all past games.
        if (placement === 1) stats.score += 3
        else if (placement === 2) stats.score += 1
        if (placement === 1) stats.wins++
      }

      const result = Array.from(agg.entries()).map(([player, stats]) => ({
        player,
        score: stats.score,
        wins: stats.wins,
        games: stats.games,
      }))

      return result.sort((a, b) => b.score - a.score || a.games - b.games).slice(0, limit)
    },

    // `questions` are tagged with their own source category (engine/bank.js's
    // pick() attaches it), not the mode that served them — a mixed-mode pick
    // still tags each row with the category it actually came from. This is
    // what lets askedIds(jid) enforce "never repeat" across modes while
    // clearAsked(jid, category) still recycles one category at a time.
    markAsked(jid, questions, ts) {
      for (const q of questions) stmtMarkAsked.run(jid, q.category, q.id, ts)
    },

    // No category filter: a question already seen via ANY mode must not be
    // served again by any other mode.
    askedIds(jid) {
      return new Set(stmtAskedIds.all(jid).map((r) => r.qid))
    },

    clearAsked(jid, category) {
      stmtClearAsked.run(jid, category)
    },

    getSetting(jid, key, fallback = null) {
      const row = stmtGetSetting.get(jid, key)
      return row ? row.value : fallback
    },

    setSetting(jid, key, value) {
      stmtSetSetting.run(jid, key, value)
    },

    addBotAdmin(jid, number, { addedBy, ts }) {
      const result = stmtInsertBotAdmin.run(jid, number, addedBy, ts)
      return result.changes > 0
    },

    delBotAdmin(jid, number) {
      const result = stmtDeleteBotAdmin.run(jid, number)
      return result.changes > 0
    },

    botAdmins(jid) {
      return stmtSelectBotAdmins.all(jid).map(row => row.number)
    },

    addBan(jid, number) {
      const result = stmtInsertBan.run(jid, number)
      return result.changes > 0
    },

    delBan(jid, number) {
      const result = stmtDeleteBan.run(jid, number)
      return result.changes > 0
    },

    bans(jid) {
      return stmtSelectBans.all(jid).map(row => row.number)
    },

    close() {
      db.close()
    },
  }
}

export function startOfWeek(now) {
  const date = new Date(now)
  const dayOfWeek = date.getUTCDay()
  // Monday is 1, so subtract (dayOfWeek - 1) days
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - daysBack)
  return date.getTime()
}
