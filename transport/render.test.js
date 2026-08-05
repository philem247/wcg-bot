import assert from 'node:assert/strict'

// config.js throws if PHONE_NUMBER is missing; set env before any import that touches it.
process.env.PHONE_NUMBER = '1234567890'
process.env.PREFIX = '/'

const { render } = await import('./render.js')

const P1 = '111111111@s.whatsapp.net'
const P2 = '222222222@s.whatsapp.net'

const tests = [
  {
    name: 'lobby_open: verbatim "starting" string, mode substituted, no mentions',
    fn: () => {
      const r = render({ type: 'lobby_open', deadline: 60_000, mode: 'easy', gameType: 'chain' })
      assert.equal(r.text, '🎮 Game starting...\n👥 Need 2 or more players\n⏳ You have 60 seconds to join ⏳\n🧩 Mode easy')
      assert.deepEqual(r.mentions, [])
    },
  },
  {
    name: 'joined: verbatim "joined" string, @digits, no double @',
    fn: () => {
      const r = render({ type: 'joined', player: P1, count: 2 })
      assert.equal(r.text, '@111111111 joined 👏')
      assert.deepEqual(r.mentions, [P1])
    },
  },
  {
    name: 'lobby_reminder: includes secondsLeft, mode line, and players_count suffix',
    fn: () => {
      const r = render({ type: 'lobby_reminder', secondsLeft: 30, count: 2, mode: 'hard' })
      assert.equal(r.text, '🎮 Game starts in 30 seconds ⏳\nType *join* to play 🙋‍♂️🙋‍♀️\n🧩 Mode hard\n\n👥 2 players joined.')
    },
  },
  {
    name: 'terminated: verbatim string',
    fn: () => {
      const r = render({ type: 'terminated', reason: 'not_enough_players' })
      assert.equal(r.text, '_Not enough players to start. Game terminated._')
    },
  },
  {
    name: 'game_start: returns null (upstream omits this message)',
    fn: () => {
      const r = render({ type: 'game_start', players: [P1, P2] })
      assert.equal(r, null)
    },
  },
  {
    name: 'turn_info: verbatim string, letter present',
    fn: () => {
      const r = render({
        type: 'turn',
        player: P1,
        next: P2,
        letter: 'e',
        minLength: 4,
        seconds: 30,
        alive: 3,
        total: 4,
        totalWords: 12,
        deadline: 999,
      })
      assert.equal(
        r.text,
        '🎲Turn : @111111111\n🙌Next : @222222222\n🆎Starts with E (at least 4 letters)\n🏆Players left : 3/4\n⏳ You have *30* seconds to reply\n📝Total words : 12'
      )
      assert.deepEqual(r.mentions, [P1, P2])
    },
  },
  {
    name: 'turn_info: null letter renders "?" not an invented sentence',
    fn: () => {
      const r = render({ type: 'turn', player: P1, next: P2, letter: null, minLength: 3, seconds: 40, alive: 2, total: 2, totalWords: 0, deadline: 0 })
      assert(r.text.includes('Starts with ? (at least 3 letters)'))
    },
  },
  {
    name: 'accepted: returns null (noise reduction, see comment in render.js)',
    fn: () => {
      const r = render({ type: 'accepted', player: P1, word: 'apple' })
      assert.equal(r, null)
    },
  },
  {
    name: 'rejected: already_used verbatim, quoted reply, no mentions',
    fn: () => {
      const r = render({ type: 'rejected', player: P1, word: 'apple', reason: 'already_used' })
      assert.equal(r.text, '_This word is already used!_')
      assert.equal(r.quote, true)
      assert.deepEqual(r.mentions, [])
    },
  },
  {
    name: 'rejected: not_starting_with verbatim with word + required letter',
    fn: () => {
      const r = render({ type: 'rejected', player: P1, word: 'zzz', reason: 'not_starting_with', letter: 'e', minLength: 4 })
      assert.equal(r.text, '_zzz is not starting with_ E')
      assert.equal(r.quote, true)
    },
  },
  {
    name: 'rejected: length_limit verbatim with minLength',
    fn: () => {
      const r = render({ type: 'rejected', player: P1, word: 'a', reason: 'length_limit', letter: 'e', minLength: 5 })
      assert.equal(r.text, '_This word is below 5 length_')
    },
  },
  {
    name: 'rejected: not_in_list verbatim, no /addword hint',
    fn: () => {
      const r = render({ type: 'rejected', player: P1, word: 'zzz', reason: 'not_in_list' })
      assert.equal(r.text, '_This word is not in my list_')
      assert(!r.text.includes('/addword'))
      assert(!r.text.toLowerCase().includes("haven't lost your turn"))
    },
  },
  {
    name: 'rejected: all reason strings produce distinct non-empty text',
    fn: () => {
      const reasons = ['already_used', 'not_starting_with', 'length_limit', 'not_in_list']
      const texts = new Set()
      for (const reason of reasons) {
        const r = render({ type: 'rejected', player: P1, word: 'x', reason, letter: 'x', minLength: 3 })
        assert(typeof r.text === 'string' && r.text.length > 0)
        texts.add(r.text)
      }
      assert.equal(texts.size, reasons.length)
    },
  },
  {
    name: 'ramp: renders null — deleted, redundant with the next turn_info',
    fn: () => {
      const r = render({ type: 'ramp', round: 4, minLength: 5, seconds: 20 })
      assert.equal(r, null)
    },
  },
  {
    name: 'eliminated: verbatim "timeout" string, mentions player',
    fn: () => {
      const r = render({ type: 'eliminated', player: P1, reason: 'timeout' })
      assert.equal(r.text, 'Time out @111111111! You are out! 🚫')
      assert.deepEqual(r.mentions, [P1])
    },
  },
  {
    name: 'winner: verbatim string, HH:MM:SS elapsed, longest word length in {3}',
    fn: () => {
      const r = render({ type: 'winner', player: P1, totalWords: 9, longestWord: 'extraordinary', longestBy: P2, elapsedMs: (7 * 60 + 19) * 1000 })
      assert.equal(
        r.text,
        '@111111111 won the game 🏆\nWords : *9*\nLongest word : *extraordinary (13)* by @222222222 📚\nTime : *00:07:19* ⏱️'
      )
      assert.deepEqual(r.mentions, [P1, P2])
    },
  },
  {
    name: 'winner: elapsed under a minute still zero-pads H and M',
    fn: () => {
      const r = render({ type: 'winner', player: P1, totalWords: 1, longestWord: 'cat', longestBy: P1, elapsedMs: 45_000 })
      assert(r.text.includes('*00:00:45*'))
    },
  },
  {
    name: 'queued: mentions the player',
    fn: () => {
      const r = render({ type: 'queued', player: P1 })
      assert.deepEqual(r.mentions, [P1])
    },
  },
  {
    name: 'ended: verbatim "game_ends" string',
    fn: () => {
      const a = render({ type: 'ended', reason: 'manual' })
      const b = render({ type: 'ended', reason: 'no_players' })
      assert.equal(a.text, 'Game Ends')
      assert.equal(b.text, 'Game Ends')
    },
  },
  {
    name: 'unknown event type returns null',
    fn: () => {
      const r = render({ type: 'nonsense' })
      assert.equal(r, null)
    },
  },
  {
    name: 'trivia_question: renders header, question, stacked options, no mentions',
    fn: () => {
      const out = render({
        type: 'trivia_question', index: 1, total: 10, category: 'general',
        question: 'Capital of France?', clockSeconds: 20, endsAt: 15000,
        options: [
          { letter: 'A', text: 'Paris' }, { letter: 'B', text: 'Rome' },
          { letter: 'C', text: 'Madrid' }, { letter: 'D', text: 'Berlin' },
        ],
      })
      assert.ok(out.text.includes('*Q1/10*'))
      assert.ok(out.text.includes('*Capital of France?*'))
      assert.ok(out.text.includes('*A)*  Paris'))
      assert.ok(out.text.includes('*D)*  Berlin'))
      assert.ok(!out.text.includes('━'), 'question message carries no result block')
      assert.deepEqual(out.mentions, [])
    },
  },
  {
    name: 'trivia_answer: correct reveals letter + full answer text and mentions the scorer',
    fn: () => {
      const out = render({
        type: 'trivia_answer', category: 'football', index: 2, total: 10,
        outcome: 'correct', player: '234111@s.whatsapp.net', letter: 'B', answer: 'Lille',
      })
      assert.ok(out.text.startsWith('✅'))
      assert.ok(out.text.includes('@234111'))
      // The letter alone is useless — you would have to scroll back to the
      // question to learn what B) was. Both must be present.
      assert.ok(out.text.includes('B)'))
      assert.ok(out.text.includes('Lille'))
      assert.deepEqual(out.mentions, ['234111@s.whatsapp.net'])
    },
  },
  {
    name: 'trivia_answer: timeout reveals the answer and mentions nobody',
    fn: () => {
      const out = render({
        type: 'trivia_answer', category: 'science', index: 3, total: 10,
        outcome: 'timeout', letter: 'C', answer: 'Helium',
      })
      assert.ok(out.text.includes("Time's up!"))
      assert.ok(out.text.includes('C)'))
      assert.ok(out.text.includes('Helium'))
      assert.deepEqual(out.mentions, [], 'no player to mention on a timeout')
    },
  },
  {
    name: 'trivia_answer: is a standalone message — never carries question text',
    fn: () => {
      const out = render({
        type: 'trivia_answer', category: 'general', index: 1, total: 10,
        outcome: 'timeout', letter: 'A', answer: 'Stern',
      })
      assert.ok(!out.text.includes('Reply A, B, C or D'))
      assert.ok(!out.text.includes('Q1/10'))
    },
  },
  {
    name: 'trivia_over: standings are medalled and every player is mentioned',
    fn: () => {
      const out = render({
        type: 'trivia_over', category: 'general', total: 10,
        standings: [
          { player: '1@s.whatsapp.net', score: 5 },
          { player: '2@s.whatsapp.net', score: 3 },
          { player: '3@s.whatsapp.net', score: 2 },
          { player: '4@s.whatsapp.net', score: 1 },
        ],
      })
      assert.ok(out.text.includes('🥇'))
      assert.ok(out.text.includes('🥈'))
      assert.ok(out.text.includes('🥉'))
      assert.ok(out.text.includes('@4'), 'fourth place still listed')
      assert.equal(out.mentions.length, 4)
    },
  },
  {
    name: 'trivia_over: nobody scoring still renders without crashing',
    fn: () => {
      const out = render({ type: 'trivia_over', category: 'general', total: 10, standings: [] })
      assert.ok(out.text.length > 0)
      assert.deepEqual(out.mentions, [])
    },
  },
  {
    name: 'trivia_over: starts straight at the FINAL header, no result block',
    fn: () => {
      const out = render({ type: 'trivia_over', category: 'general', total: 0, standings: [] })
      assert.ok(!out.text.includes('✅'))
      assert.ok(!out.text.includes('⏱ *Time!*'))
      assert.ok(out.text.startsWith('🏁 *FINAL*'))
    },
  },
  {
    name: 'trivia_terminated renders a stop message',
    fn: () => {
      const out = render({ type: 'trivia_terminated' })
      assert.ok(out.text.length > 0)
      assert.deepEqual(out.mentions, [])
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
