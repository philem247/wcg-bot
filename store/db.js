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
    CREATE INDEX IF NOT EXISTS idx_results_jid_ended ON results(jid, ended_at);
    CREATE INDEX IF NOT EXISTS idx_rejections_jid_word ON rejections(jid, word);
  `)

  // Prepare statements once
  const stmtInsertGame = db.prepare(
    'INSERT INTO games (jid, mode, type, started_at, ended_at, words) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const stmtInsertResult = db.prepare(
    'INSERT INTO results (game_id, jid, player, placement, player_count, ended_at) VALUES (?, ?, ?, ?, ?, ?)'
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
  const stmtSelectResults = db.prepare(`
    SELECT player, placement, player_count
    FROM results
    WHERE jid = ? AND ended_at >= ?
    ORDER BY player
  `)
  const stmtGetSetting = db.prepare(
    'SELECT value FROM settings WHERE jid = ? AND key = ?'
  )
  const stmtSetSetting = db.prepare(
    'INSERT INTO settings (jid, key, value) VALUES (?, ?, ?) ON CONFLICT(jid, key) DO UPDATE SET value = excluded.value'
  )

  return {
    recordGame({ jid, mode, type, startedAt, endedAt, words, results }) {
      db.exec('BEGIN')
      try {
        const info = stmtInsertGame.run(jid, mode, type, startedAt, endedAt, words)
        const gameId = info.lastInsertRowid

        for (const { player, placement } of results) {
          stmtInsertResult.run(gameId, jid, player, placement, results.length, endedAt)
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

    leaderboard({ jid, since = 0, limit = 10 }) {
      const rows = stmtSelectResults.all(jid, since)

      const agg = new Map()
      for (const { player, placement, player_count } of rows) {
        if (!agg.has(player)) {
          agg.set(player, { score: 0, wins: 0, games: 0 })
        }
        const stats = agg.get(player)
        stats.games++
        // ponytail: per-game cap of 6 is deliberate, stops marathon players owning the week
        const survivalPoints = Math.min(player_count - placement, 3)
        const bonusPoints = placement === 1 ? 3 : 0
        stats.score += survivalPoints + bonusPoints
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

    getSetting(jid, key, fallback = null) {
      const row = stmtGetSetting.get(jid, key)
      return row ? row.value : fallback
    },

    setSetting(jid, key, value) {
      stmtSetSetting.run(jid, key, value)
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
