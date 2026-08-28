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
    name: 'leaderboard score math: 4-player game, winner gets 3, runner-up 1, rest 0',
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

      assert.equal(scores.get('alice'), 3, 'winner should get 3')
      assert.equal(scores.get('bob'), 1, 'second place should get 1')
      assert.equal(scores.get('charlie'), 0, 'third place should get 0')
      assert.equal(scores.get('dave'), 0, 'last place should get 0')
      db.close()
    },
  },
  {
    name: 'football scoring: 8-player game still gives winner exactly 3, not scaled by player count',
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
      assert.equal(winner.score, 3, 'winner gets 3 regardless of player count')
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
      db.setSetting('jid-a', 'pool', 'on')
      assert.equal(db.getSetting('jid-a', 'pool'), 'on')
      db.close()
    },
  },
  {
    name: 'settings: getSetting returns fallback when unset',
    fn: () => {
      const db = openDb(':memory:')
      assert.equal(db.getSetting('jid-a', 'pool', 'off'), 'off')
      assert.equal(db.getSetting('jid-a', 'pool'), null, 'default fallback is null')
      db.close()
    },
  },
  {
    name: 'settings: setSetting upserts, overwriting rather than duplicating',
    fn: () => {
      const db = openDb(':memory:')
      db.setSetting('jid-a', 'pool', 'on')
      db.setSetting('jid-a', 'pool', 'off')
      assert.equal(db.getSetting('jid-a', 'pool'), 'off', 'second call should overwrite, not add a row')
      // different jid/key are independent
      db.setSetting('jid-b', 'pool', 'on')
      assert.equal(db.getSetting('jid-a', 'pool'), 'off')
      assert.equal(db.getSetting('jid-b', 'pool'), 'on')
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
  {
    name: 'player_pn: same person under two JID namespaces aggregates into one leaderboard entry',
    fn: () => {
      const db = openDb(':memory:')
      // Game 1: player recorded under @lid JID, but player_pn is phone-form
      db.recordGame({
        jid: 'test-jid',
        mode: 'easy',
        type: 'chain',
        startedAt: 1000,
        endedAt: 2000,
        words: 5,
        results: [
          { player: '12345@lid', placement: 1, player_pn: '2349137123224@s.whatsapp.net' },
          { player: 'bob@s.whatsapp.net', placement: 2 },
        ],
      })
      // Game 2: same person, now under phone-form JID directly
      db.recordGame({
        jid: 'test-jid',
        mode: 'easy',
        type: 'chain',
        startedAt: 3000,
        endedAt: 4000,
        words: 5,
        results: [
          { player: '2349137123224@s.whatsapp.net', placement: 1, player_pn: '2349137123224@s.whatsapp.net' },
          { player: 'bob@s.whatsapp.net', placement: 2 },
        ],
      })

      const board = db.leaderboard({ jid: 'test-jid' })
      // Should have 2 entries (one per unique person), not 3
      assert.equal(board.length, 2, 'same person under 2 JIDs should merge into 1 entry')
      // The merged player should have 2 games and 2 wins
      const merged = board.find(r => r.player === '2349137123224@s.whatsapp.net')
      assert(merged, 'merged player should appear under phone-form JID')
      assert.equal(merged.games, 2, 'merged player should have 2 games')
      assert.equal(merged.wins, 2, 'merged player should have 2 wins')
      db.close()
    },
  },
  {
    name: 'bot_admins round-trip: add, duplicate returns false, list, delete, delete-missing returns false',
    fn: () => {
      const db = openDb(':memory:')
      const added = db.addBotAdmin('jid-a', '5551234567', { addedBy: '9999999999', ts: 1000 })
      assert(added, 'first add should return true')

      const dup = db.addBotAdmin('jid-a', '5551234567', { addedBy: '9999999999', ts: 1100 })
      assert(!dup, 'duplicate add should return false')

      assert.deepEqual(db.botAdmins('jid-a'), ['5551234567'])
      assert.deepEqual(db.botAdmins('jid-b'), [], 'different jid should be unaffected')

      const removed = db.delBotAdmin('jid-a', '5551234567')
      assert(removed, 'delete existing should return true')
      assert.deepEqual(db.botAdmins('jid-a'), [])

      const removedAgain = db.delBotAdmin('jid-a', '5551234567')
      assert(!removedAgain, 'delete missing should return false')
      db.close()
    },
  },
  {
    name: 'asked_questions: markAsked then askedIds round-trips, scoped per group not per category',
    fn: () => {
      const db = openDb(':memory:')
      db.markAsked('jid-a', [{ id: 'q1', category: 'general' }, { id: 'q2', category: 'general' }], 1000)
      db.markAsked('jid-a', [{ id: 'q9', category: 'science' }], 1000)
      // askedIds(jid) is the whole group's seen set, no category filter — that is
      // the invariant a mixed-mode pick and a direct-category pick both rely on.
      assert.deepEqual([...db.askedIds('jid-a')].sort(), ['q1', 'q2', 'q9'])
      assert.equal(db.askedIds('jid-b').size, 0, 'scoped per group')
      db.close()
    },
  },
  {
    name: 'asked_questions: re-marking the same id does not throw or duplicate',
    fn: () => {
      const db = openDb(':memory:')
      db.markAsked('jid-a', [{ id: 'q1', category: 'general' }], 1000)
      db.markAsked('jid-a', [{ id: 'q1', category: 'general' }, { id: 'q2', category: 'general' }], 2000)
      assert.deepEqual([...db.askedIds('jid-a')].sort(), ['q1', 'q2'])
      db.close()
    },
  },
  {
    name: 'asked_questions: a question tagged with its own category is freed only when that category is recycled',
    fn: () => {
      const db = openDb(':memory:')
      // markAsked tags rows by the QUESTION's category, regardless of which mode served it
      // (e.g. a 'mixed' game serving a 'general' question tags the row 'general') — see
      // engine/bank.js pick() and transport/router.js's markAsked call.
      db.markAsked('jid-a', [{ id: 'q1', category: 'general' }], 1000)
      db.markAsked('jid-a', [{ id: 'q9', category: 'science' }], 1000)
      db.clearAsked('jid-a', 'general')
      assert.deepEqual([...db.askedIds('jid-a')], ['q9'], 'q1 freed, q9 (science) untouched')
      db.close()
    },
  },
  {
    name: 'leaderboard: trivia and chain results never appear on each other s board',
    fn: () => {
      const db = openDb(':memory:')
      db.recordGame({
        jid: 'g', mode: 'easy', type: 'chain', startedAt: 0, endedAt: 1000, words: 5,
        results: [{ player: 'wordy', placement: 1 }, { player: 'other', placement: 2 }],
      })
      db.recordGame({
        jid: 'g', mode: 'general', type: 'trivia', startedAt: 0, endedAt: 1000, words: 10,
        results: [{ player: 'quizzy', placement: 1 }, { player: 'other', placement: 2 }],
      })

      const chain = db.leaderboard({ jid: 'g', since: 0, type: 'chain' })
      const trivia = db.leaderboard({ jid: 'g', since: 0, type: 'trivia' })

      assert.deepEqual(chain.map((r) => r.player).sort(), ['other', 'wordy'])
      assert.deepEqual(trivia.map((r) => r.player).sort(), ['other', 'quizzy'])
      assert.equal(chain.find((r) => r.player === 'other').games, 1, 'one chain game only')
      assert.equal(trivia.find((r) => r.player === 'other').games, 1, 'one trivia game only')
      db.close()
    },
  },
  {
    name: 'leaderboard: chain board includes legacy rows recorded as type random',
    fn: () => {
      const db = openDb(':memory:')
      db.recordGame({
        jid: 'g', mode: 'easy', type: 'random', startedAt: 0, endedAt: 1000, words: 5,
        results: [{ player: 'wordy', placement: 1 }],
      })
      const chain = db.leaderboard({ jid: 'g', since: 0, type: 'chain' })
      assert.deepEqual(chain.map((r) => r.player), ['wordy'], 'chain means every non-trivia type')
      db.close()
    },
  },
  {
    name: 'leaderboard: a win is 3 points, runner-up is 1, everyone else is 0',
    fn: () => {
      const db = openDb(':memory:')
      db.recordGame({
        jid: 'test-jid', mode: 'easy', type: 'chain', startedAt: 0, endedAt: 1000, words: 5,
        results: [
          { player: 'p1', placement: 1 },
          { player: 'p2', placement: 2 },
          { player: 'p3', placement: 3 },
          { player: 'p4', placement: 4 },
        ],
      })
      const board = db.leaderboard({ jid: 'test-jid' })
      const scores = new Map(board.map(r => [r.player, r.score]))
      assert.equal(scores.get('p1'), 3)
      assert.equal(scores.get('p2'), 1)
      assert.equal(scores.get('p3'), 0)
      assert.equal(scores.get('p4'), 0)
      db.close()
    },
  },
  {
    name: 'leaderboard: placing last in a big game still scores nothing',
    fn: () => {
      const db = openDb(':memory:')
      const results = []
      for (let i = 1; i <= 6; i++) results.push({ player: `p${i}`, placement: i })
      db.recordGame({
        jid: 'test-jid', mode: 'easy', type: 'chain', startedAt: 0, endedAt: 1000, words: 5, results,
      })
      const board = db.leaderboard({ jid: 'test-jid' })
      const last = board.find(r => r.player === 'p6')
      assert.equal(last.score, 0, 'last place scores nothing')
      assert.equal(last.games, 1)
      db.close()
    },
  },
  {
    name: 'leaderboard: trivia uses the same football scoring as chain',
    fn: () => {
      const db = openDb(':memory:')
      db.recordGame({
        jid: 'test-jid', mode: 'general', type: 'trivia', startedAt: 0, endedAt: 1000, words: 10,
        results: [{ player: 'tq1', placement: 1 }, { player: 'tq2', placement: 2 }],
      })
      db.recordGame({
        jid: 'test-jid', mode: 'easy', type: 'chain', startedAt: 0, endedAt: 1000, words: 5,
        results: [{ player: 'cq1', placement: 1 }, { player: 'cq2', placement: 2 }],
      })

      const trivia = db.leaderboard({ jid: 'test-jid', type: 'trivia' })
      const chain = db.leaderboard({ jid: 'test-jid', type: 'chain' })

      assert.equal(trivia.find(r => r.player === 'tq1').score, 3, 'trivia winner gets 3')
      assert.equal(chain.find(r => r.player === 'cq1').score, 3, 'chain winner gets 3')
      assert(!trivia.some(r => r.player === 'cq1' || r.player === 'cq2'), 'trivia board excludes chain players')
      assert(!chain.some(r => r.player === 'tq1' || r.player === 'tq2'), 'chain board excludes trivia players')
      db.close()
    },
  },
  {
    name: 'trivia_bans: add/list/delete round-trip',
    fn: () => {
      const db = openDb(':memory:')
      const added = db.addBan('jid-a', '5551234567')
      assert(added, 'first ban should return true')
      assert.deepEqual(db.bans('jid-a'), ['5551234567'])

      const removed = db.delBan('jid-a', '5551234567')
      assert(removed, 'delete existing ban should return true')
      assert.deepEqual(db.bans('jid-a'), [])
      db.close()
    },
  },
  {
    name: 'trivia_bans: addBan twice returns false the second time; delBan on unbanned number returns false',
    fn: () => {
      const db = openDb(':memory:')
      const first = db.addBan('jid-a', '5551234567')
      assert(first, 'first add should return true')
      const dup = db.addBan('jid-a', '5551234567')
      assert(!dup, 'duplicate ban should return false')

      const missing = db.delBan('jid-a', '9999999999')
      assert(!missing, 'delete of an unbanned number should return false')
      db.close()
    },
  },
  {
    name: 'trivia_bans: bans are per-jid',
    fn: () => {
      const db = openDb(':memory:')
      db.addBan('jid-a', '5551234567')
      assert.deepEqual(db.bans('jid-a'), ['5551234567'])
      assert.deepEqual(db.bans('jid-b'), [], 'banning in one group must not ban in another')
      db.close()
    },
  },
  {
    name: 'tournament_wins: recordTournamentWin then tournamentStats aggregates by player, per-jid',
    fn: () => {
      const db = openDb(':memory:')
      db.recordTournamentWin('jid-a', '1111111111', 1000)
      db.recordTournamentWin('jid-a', '1111111111', 2000)
      db.recordTournamentWin('jid-a', '2222222222', 3000)
      db.recordTournamentWin('jid-b', '3333333333', 4000)

      const board = db.tournamentStats('jid-a')
      assert.equal(board.length, 2)
      assert.equal(board[0].player, '1111111111', '2 wins ranks first')
      assert.equal(board[0].wins, 2)
      assert.equal(board[1].player, '2222222222')
      assert.equal(board[1].wins, 1)
      const boardB = db.tournamentStats('jid-b')
      assert.equal(boardB.length, 1, 'scoped per group')
      assert.equal(boardB[0].player, '3333333333')
      assert.equal(boardB[0].wins, 1)
      db.close()
    },
  },
  {
    name: 'tournament_wins: trivia and wordle titles are two separate counts, not merged',
    fn: () => {
      const db = openDb(':memory:')
      db.recordTournamentWin('jid-a', '1111111111', 1000) // default type: 'trivia'
      db.recordTournamentWin('jid-a', '1111111111', 2000, 'wordle')
      db.recordTournamentWin('jid-a', '1111111111', 3000, 'wordle')

      const trivia = db.tournamentStats('jid-a')
      assert.equal(trivia.length, 1)
      assert.equal(trivia[0].wins, 1, 'the wordle rows must not count toward the trivia total')

      const wordle = db.tournamentStats('jid-a', 10, 'wordle')
      assert.equal(wordle.length, 1)
      assert.equal(wordle[0].wins, 2)
      db.close()
    },
  },
  {
    name: 'asked_wordle & wordle leaderboard: round-trip and isolation',
    fn: () => {
      const db = openDb(':memory:')
      db.markAskedWordle('jid-a', ['crane', 'plumb'], 1000)
      const asked = db.askedWordleWords('jid-a')
      assert.ok(asked.has('crane'))
      assert.ok(asked.has('plumb'))
      assert.equal(asked.size, 2)

      db.clearAskedWordle('jid-a')
      assert.equal(db.askedWordleWords('jid-a').size, 0)

      // Another jid's asked words stay isolated
      db.markAskedWordle('jid-b', ['crane'], 2000)
      assert.equal(db.askedWordleWords('jid-a').size, 0)
      assert.equal(db.askedWordleWords('jid-b').size, 1)
      db.close()
    },
  },
  {
    name: 'Fix 3: tournamentStats() returns a mentionable (full-JID, non-bare-digit) identifier when recorded via a resolved pnMap entry',
    fn: () => {
      const db = openDb(':memory:')
      // Full JID, as router.js's tournament_champion handler now writes
      // (pn ?? event.player, no toNumber() stripping) — see transport/router.js.
      const fullJid = '2349137123224@s.whatsapp.net'
      db.recordTournamentWin('jid-a', fullJid, 1000)

      const board = db.tournamentStats('jid-a')
      assert.equal(board.length, 1)
      assert.equal(board[0].player, fullJid, 'stored/returned as the full JID, not stripped to bare digits')
      assert.ok(!/^\d+$/.test(board[0].player), 'must not be a bare numeric string — WhatsApp mentions need the full JID to resolve')
      db.close()
    },
  },
  {
    name: 'tournaments: saveTournament/loadTournament/deleteTournament round-trip a JSON blob per jid',
    fn: () => {
      const db = openDb(':memory:')
      assert.equal(db.loadTournament('jid-a'), null, 'nothing saved yet')

      const snapshot = { v: 1, state: 'awaiting', players: ['a', 'b'], roundIndex: 0 }
      db.saveTournament('jid-a', snapshot, 1000)
      assert.deepEqual(db.loadTournament('jid-a'), snapshot)

      // Overwrite, not duplicate.
      const snapshot2 = { ...snapshot, roundIndex: 1 }
      db.saveTournament('jid-a', snapshot2, 2000)
      assert.deepEqual(db.loadTournament('jid-a'), snapshot2)

      assert.equal(db.loadTournament('jid-b'), null, 'scoped per group')

      db.deleteTournament('jid-a')
      assert.equal(db.loadTournament('jid-a'), null, 'deleted')
      db.close()
    },
  },
  {
    name: 'game_activity: recordGameActivity then lastGameActivity round-trips and upserts',
    fn: () => {
      const db = openDb(':memory:')
      assert.equal(db.lastGameActivity('jid-a'), undefined, 'nothing recorded yet')
      db.recordGameActivity('jid-a', 1000)
      assert.equal(db.lastGameActivity('jid-a'), 1000)
      db.recordGameActivity('jid-a', 2000)
      assert.equal(db.lastGameActivity('jid-a'), 2000, 'overwrites rather than duplicating')
      assert.equal(db.lastGameActivity('jid-b'), undefined, 'scoped per group')
      db.close()
    },
  },
  {
    name: 'asked_riddles & riddle leaderboard: round-trip and isolation',
    fn: () => {
      const db = openDb(':memory:')
      db.markAskedRiddles('jid-a', [{ id: 'r1' }, { id: 'r2' }], 1000)
      const asked = db.askedRiddleIds('jid-a')
      assert.ok(asked.has('r1'))
      assert.ok(asked.has('r2'))
      assert.equal(asked.size, 2)

      db.clearAskedRiddles('jid-a')
      assert.equal(db.askedRiddleIds('jid-a').size, 0)

      // Record a riddle game
      db.recordGame({
        jid: 'jid-a',
        mode: 'mixed',
        type: 'riddle',
        startedAt: 1000,
        endedAt: 2000,
        words: 5,
        results: [
          { player: 'player-1', placement: 1, player_pn: 'pn-1' },
          { player: 'player-2', placement: 2, player_pn: 'pn-2' },
        ],
      })

      const board = db.leaderboard({ jid: 'jid-a', type: 'riddle' })
      assert.equal(board.length, 2)
      assert.equal(board[0].player, 'pn-1')
      assert.equal(board[0].score, 3)
      assert.equal(board[1].player, 'pn-2')
      assert.equal(board[1].score, 1)

      // Trivia board remains isolated
      assert.equal(db.leaderboard({ jid: 'jid-a', type: 'trivia' }).length, 0)
      db.close()
    },
  },
  {
    name: 'asked_flags & flag leaderboard: round-trip and isolation',
    fn: () => {
      const db = openDb(':memory:')
      db.markAskedFlags('jid-a', [{ code: 'NG' }, { code: 'US' }], 1000)
      const asked = db.askedFlagCodes('jid-a')
      assert.ok(asked.has('NG'))
      assert.ok(asked.has('US'))
      assert.equal(asked.size, 2)

      db.clearAskedFlags('jid-a')
      assert.equal(db.askedFlagCodes('jid-a').size, 0)

      // Another jid's asked flags stay isolated
      db.markAskedFlags('jid-b', [{ code: 'NG' }], 2000)
      assert.equal(db.askedFlagCodes('jid-a').size, 0)
      assert.equal(db.askedFlagCodes('jid-b').size, 1)

      // Record a flag game
      db.recordGame({
        jid: 'jid-a',
        mode: 'mixed',
        type: 'flag',
        startedAt: 1000,
        endedAt: 2000,
        words: 5,
        results: [
          { player: 'player-1', placement: 1, player_pn: 'pn-1' },
          { player: 'player-2', placement: 2, player_pn: 'pn-2' },
        ],
      })

      const board = db.leaderboard({ jid: 'jid-a', type: 'flag' })
      assert.equal(board.length, 2)
      assert.equal(board[0].player, 'pn-1')
      assert.equal(board[0].score, 3)
      assert.equal(board[1].player, 'pn-2')
      assert.equal(board[1].score, 1)

      // Word-chain board remains isolated from flag games
      assert.equal(db.leaderboard({ jid: 'jid-a', type: 'chain' }).length, 0)
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
