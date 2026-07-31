import assert from 'node:assert/strict'
import { openDb, startOfWeek } from './db.js'

const tests = [
  {
    name: 'schema creates and reopens cleanly',
    fn: () => {
      const db = openDb(':memory:')
      db.close()
      // if we get here without error, schema creation worked
    },
  },
  {
    name: 'recordGame returns an id and writes one results row per player',
    fn: () => {
      const db = openDb(':memory:')
      const gameId = db.recordGame({
        jid: 'test-jid',
        mode: 'easy',
        type: 'chain',
        startedAt: 1000,
        endedAt: 2000,
        words: 5,
        results: [
          { player: 'alice', placement: 1 },
          { player: 'bob', placement: 2 },
        ],
      })
      assert(gameId > 0, 'gameId should be positive')

      const board = db.leaderboard({ jid: 'test-jid' })
      assert.equal(board.length, 2, 'should have 2 players')
      assert.equal(board[0].player, 'alice', 'alice should be first (winner)')
      db.close()
    },
  },
  {
    name: 'leaderboard score math: 4-player game, winner gets 6, last place gets 0',
    fn: () => {
      const db = openDb(':memory:')
      db.recordGame({
        jid: 'test-jid',
        mode: 'easy',
        type: 'chain',
        startedAt: 1000,
        endedAt: 2000,
        words: 10,
        results: [
          { player: 'alice', placement: 1 },
          { player: 'bob', placement: 2 },
          { player: 'charlie', placement: 3 },
          { player: 'dave', placement: 4 },
        ],
      })

      const board = db.leaderboard({ jid: 'test-jid' })
      const scores = new Map(board.map(r => [r.player, r.score]))

      // alice (placement 1): min(4-1, 3) + 3 = 3 + 3 = 6
      assert.equal(scores.get('alice'), 6, 'winner should get 6')
      // bob (placement 2): min(4-2, 3) + 0 = 2
      assert.equal(scores.get('bob'), 2, 'second place should get 2')
      // charlie (placement 3): min(4-3, 3) + 0 = 1
      assert.equal(scores.get('charlie'), 1, 'third place should get 1')
      // dave (placement 4): min(4-4, 3) + 0 = 0
      assert.equal(scores.get('dave'), 0, 'last place should get 0')
      db.close()
    },
  },
  {
    name: 'per-game cap: 8-player game still gives winner 6, not 10',
    fn: () => {
      const db = openDb(':memory:')
      const results = []
      for (let i = 1; i <= 8; i++) {
        results.push({ player: `player${i}`, placement: i })
      }

      db.recordGame({
        jid: 'test-jid',
        mode: 'easy',
        type: 'chain',
        startedAt: 1000,
        endedAt: 2000,
        words: 20,
        results,
      })

      const board = db.leaderboard({ jid: 'test-jid' })
      const winner = board.find(r => r.player === 'player1')
      // min(8-1, 3) + 3 = 3 + 3 = 6
      assert.equal(winner.score, 6, 'winner capped at 6 even in 8-player game')
      db.close()
    },
  },
  {
    name: 'since filter excludes older games',
    fn: () => {
      const db = openDb(':memory:')
      db.recordGame({
        jid: 'test-jid',
        mode: 'easy',
        type: 'chain',
        startedAt: 1000,
        endedAt: 1500,
        words: 5,
        results: [{ player: 'alice', placement: 1 }],
      })

      db.recordGame({
        jid: 'test-jid',
        mode: 'easy',
        type: 'chain',
        startedAt: 2000,
        endedAt: 3000,
        words: 5,
        results: [{ player: 'bob', placement: 1 }],
      })

      const boardAll = db.leaderboard({ jid: 'test-jid', since: 0 })
      assert.equal(boardAll.length, 2, 'should have both players')

      const boardRecent = db.leaderboard({ jid: 'test-jid', since: 2000 })
      assert.equal(boardRecent.length, 1, 'should only have bob (ended_at >= 2000)')
      assert.equal(boardRecent[0].player, 'bob')
      db.close()
    },
  },
  {
    name: 'pending orders by count descending and hides words in custom_words',
    fn: () => {
      const db = openDb(':memory:')
      db.recordRejection({ jid: 'test-jid', word: 'apple', player: 'alice', ts: 1000 })
      db.recordRejection({ jid: 'test-jid', word: 'apple', player: 'bob', ts: 1100 })
      db.recordRejection({ jid: 'test-jid', word: 'apple', player: 'alice', ts: 1200 })
      db.recordRejection({ jid: 'test-jid', word: 'banana', player: 'charlie', ts: 1300 })
      db.recordRejection({ jid: 'test-jid', word: 'cherry', player: 'alice', ts: 1400 })
      db.recordRejection({ jid: 'test-jid', word: 'cherry', player: 'bob', ts: 1500 })

      const pendingBefore = db.pending('test-jid', 10)
      assert.equal(pendingBefore.length, 3, 'should have 3 words')
      assert.equal(pendingBefore[0].word, 'apple', 'apple should be first (count 3)')
      assert.equal(pendingBefore[0].count, 3)

      // Add 'apple' to custom_words
      db.addWord('apple', { jid: 'test-jid', addedBy: 'admin', ts: 2000 })

      const pendingAfter = db.pending('test-jid', 10)
      assert.equal(pendingAfter.length, 2, 'should exclude apple from pending')
      assert(pendingAfter.every(r => r.word !== 'apple'))
      db.close()
    },
  },
  {
    name: 'addWord returns false on duplicate, delWord returns false on missing',
    fn: () => {
      const db = openDb(':memory:')
      const first = db.addWord('hello', { jid: 'test-jid', addedBy: 'alice', ts: 1000 })
      assert(first, 'first insert should return true')

      const second = db.addWord('hello', { jid: 'test-jid', addedBy: 'bob', ts: 1100 })
      assert(!second, 'duplicate insert should return false')

      const deleted = db.delWord('hello')
      assert(deleted, 'delete existing word should return true')

      const deletedAgain = db.delWord('hello')
      assert(!deletedAgain, 'delete missing word should return false')
      db.close()
    },
  },
  {
    name: 'customWords returns all lowercased custom words',
    fn: () => {
      const db = openDb(':memory:')
      db.addWord('Hello', { jid: 'test-jid', addedBy: 'alice', ts: 1000 })
      db.addWord('WORLD', { jid: 'test-jid', addedBy: 'bob', ts: 1100 })
      db.addWord('Test', { jid: 'test-jid', addedBy: 'charlie', ts: 1200 })

      const words = db.customWords()
      assert.equal(words.length, 3)
      assert(words.includes('hello'), 'should be lowercase')
      assert(words.includes('world'), 'should be lowercase')
      assert(words.includes('test'), 'should be lowercase')
      db.close()
    },
  },
  {
    name: 'recordRejection skips junk (punctuation/digits/too-short), never reaches pending',
    fn: () => {
      const db = openDb(':memory:')
      db.recordRejection({ jid: 'test-jid', word: 'hello!!', player: 'alice', ts: 1000 })
      db.recordRejection({ jid: 'test-jid', word: '12345', player: 'alice', ts: 1100 })
      db.recordRejection({ jid: 'test-jid', word: 'ab', player: 'alice', ts: 1200 })
      db.recordRejection({ jid: 'test-jid', word: 'wahala', player: 'alice', ts: 1300 })

      const pending = db.pending('test-jid', 10)
      assert.equal(pending.length, 1, 'only the real word should be stored')
      assert.equal(pending[0].word, 'wahala')
      db.close()
    },
  },
  {
    name: 'startOfWeek lands on Monday 00:00 UTC',
    fn: () => {
      // Test with a known date: July 30, 2026 (Wednesday)
      const wednesdayMs = new Date('2026-07-30T12:34:56Z').getTime()
      const weekStart = startOfWeek(wednesdayMs)
      const weekDate = new Date(weekStart)

      // Should be Monday
      assert.equal(weekDate.getUTCDay(), 1, 'startOfWeek should return Monday')
      // Should be 00:00:00 UTC
      assert.equal(weekDate.getUTCHours(), 0)
      assert.equal(weekDate.getUTCMinutes(), 0)
      assert.equal(weekDate.getUTCSeconds(), 0)
      assert.equal(weekDate.getUTCMilliseconds(), 0)

      // Test with a Monday: should return itself
      const mondayMs = new Date('2026-07-27T15:30:00Z').getTime()
      const mondayStart = startOfWeek(mondayMs)
      const mondayDate = new Date(mondayStart)
      assert.equal(mondayDate.getUTCDay(), 1)
      assert.equal(mondayDate.getUTCHours(), 0)

      // Test with Sunday: should go back to previous Monday
      const sundayMs = new Date('2026-07-26T23:59:59Z').getTime()
      const sundayStart = startOfWeek(sundayMs)
      const sundayDate = new Date(sundayStart)
      assert.equal(sundayDate.getUTCDay(), 1)
    },
  },
  {
    name: 'addWord folds diacritics: café stored as cafe',
    fn: () => {
      const db = openDb(':memory:')
      db.addWord('café', { jid: 'test-jid', addedBy: 'alice', ts: 1000 })
      const words = db.customWords()
      assert(words.includes('cafe'), 'café should be folded to cafe')
      assert(!words.includes('café'), 'café (unfolded) should not be in list')
      db.close()
    },
  },
  {
    name: 'settings round-trip: setSetting then getSetting returns the stored value',
    fn: () => {
      const db = openDb(':memory:')
      db.setSetting('jid-a', 'lives', 'on')
      assert.equal(db.getSetting('jid-a', 'lives'), 'on')
      db.close()
    },
  },
  {
    name: 'settings: getSetting returns fallback when unset',
    fn: () => {
      const db = openDb(':memory:')
      assert.equal(db.getSetting('jid-a', 'lives', 'off'), 'off')
      assert.equal(db.getSetting('jid-a', 'lives'), null, 'default fallback is null')
      db.close()
    },
  },
  {
    name: 'settings: setSetting upserts, overwriting rather than duplicating',
    fn: () => {
      const db = openDb(':memory:')
      db.setSetting('jid-a', 'lives', 'on')
      db.setSetting('jid-a', 'lives', 'off')
      assert.equal(db.getSetting('jid-a', 'lives'), 'off', 'second call should overwrite, not add a row')
      // different jid/key are independent
      db.setSetting('jid-b', 'lives', 'on')
      assert.equal(db.getSetting('jid-a', 'lives'), 'off')
      assert.equal(db.getSetting('jid-b', 'lives'), 'on')
      db.close()
    },
  },
  {
    name: 'delWord matches case-insensitive folded word: CAFÉ matches café',
    fn: () => {
      const db = openDb(':memory:')
      const added = db.addWord('café', { jid: 'test-jid', addedBy: 'alice', ts: 1000 })
      assert(added, 'should add café')
      const deleted = db.delWord('CAFÉ')
      assert(deleted, 'delWord(CAFÉ) should match stored café (folded)')
      const words = db.customWords()
      assert.equal(words.length, 0, 'café should be deleted')
      db.close()
    },
  },
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    test.fn()
    console.log(`✓ ${test.name}`)
    passed++
  } catch (e) {
    console.error(`✗ ${test.name}: ${e.message}`)
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
