import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createFlagGame, FLAG_COUNT, CLOCK_SECONDS, GAP_SECONDS } from './flag.js'

const testFlags = [
  { code: 'NG', name: 'Nigeria', emoji: '🇳🇬', aliases: [] },
  { code: 'US', name: 'United States', emoji: '🇺🇸', aliases: ['USA', 'US', 'America'] },
  { code: 'CI', name: 'Ivory Coast', emoji: '🇨🇮', aliases: ["Cote d'Ivoire", 'Côte d’Ivoire'] },
]

function newGame(flags = testFlags, opts = {}) {
  return createFlagGame({ flags, clockSeconds: 15, gapSeconds: 5, now: 1000, ...opts })
}

test('flag: defaults are 5 flags at 15 seconds each', () => {
  assert.equal(FLAG_COUNT, 5)
  assert.equal(CLOCK_SECONDS, 15)
  assert.equal(GAP_SECONDS, 10)
})

test('flag: rejects an empty pool rather than starting an unplayable game', () => {
  assert.throws(() => createFlagGame({ flags: [] }), /non-empty/)
})

test('flag: join posts the first flag with its deadline', () => {
  const game = newGame()
  const events = game.join('p1', 1000)

  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'flag_word')
  assert.equal(events[0].index, 1)
  assert.equal(events[0].total, 3)
  assert.equal(events[0].emoji, '🇳🇬')
  assert.equal(events[0].endsAt, 16000)
  assert.equal(events[0].clockSeconds, 15)
})

test('flag: a second join mid-round does not restart or skip the round', () => {
  const game = newGame()
  game.join('p1', 1000)
  assert.deepEqual(game.join('p2', 2000), [])
})

test('flag: correct answer scores, reveals, and opens the gap', () => {
  const game = newGame()
  game.join('p1', 1000)

  const events = game.submit('p1', 'Nigeria', 3000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'flag_answer')
  assert.equal(events[0].correct, 'Nigeria')
  assert.equal(events[0].winner, 'p1')
  assert.equal(events[0].reason, 'correct')
})

test('flag: aliases, case and spacing all score', () => {
  for (const guess of ['USA', 'usa', 'united states', '  U.S.A.  ', 'America']) {
    const game = newGame([testFlags[1]])
    game.join('p1', 1000)
    const events = game.submit('p1', guess, 2000)
    assert.equal(events.length, 1, `"${guess}" should have scored`)
    assert.equal(events[0].winner, 'p1')
  }
})

test('flag: accents and punctuation are ignored when matching', () => {
  for (const guess of ['Ivory Coast', 'ivorycoast', "cote d'ivoire", 'Côte d’Ivoire']) {
    const game = newGame([testFlags[2]])
    game.join('p1', 1000)
    const events = game.submit('p1', guess, 2000)
    assert.equal(events.length, 1, `"${guess}" should have scored`)
  }
})

test('flag: a wrong guess is ignored silently and does not end the round', () => {
  const game = newGame()
  game.join('p1', 1000)

  assert.deepEqual(game.submit('p1', 'Ghana', 2000), [])
  assert.deepEqual(game.submit('p1', '', 2100), [])
  // The round is still live, so the right answer still scores.
  assert.equal(game.submit('p2', 'Nigeria', 2200)[0].winner, 'p2')
})

test('flag: only the first correct answer scores — the rest arrive too late', () => {
  const game = newGame()
  game.join('p1', 1000)

  assert.equal(game.submit('p1', 'Nigeria', 2000)[0].winner, 'p1')
  // Now in the gap: a second correct answer earns nothing.
  assert.deepEqual(game.submit('p2', 'Nigeria', 2100), [])
})

test('flag: an unanswered flag times out and reveals the country', () => {
  const game = newGame()
  game.join('p1', 1000)

  assert.deepEqual(game.tick(15000), [])
  const events = game.tick(16000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'flag_answer')
  assert.equal(events[0].winner, null)
  assert.equal(events[0].reason, 'timeout')
  assert.equal(events[0].correct, 'Nigeria')
})

test('flag: the next flag arrives only after the gap elapses', () => {
  const game = newGame()
  game.join('p1', 1000)
  game.submit('p1', 'Nigeria', 3000) // gap runs 3000 -> 8000

  assert.deepEqual(game.tick(7000), [])
  const events = game.tick(8000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'flag_word')
  assert.equal(events[0].index, 2)
  assert.equal(events[0].emoji, '🇺🇸')
})

test('flag: the game ends after the last flag, ranking by score', () => {
  const game = newGame()
  game.join('p1', 1000)

  game.submit('p1', 'Nigeria', 2000)
  game.tick(7000) // flag 2
  game.submit('p2', 'USA', 8000)
  game.tick(13000) // flag 3
  game.submit('p1', 'Ivory Coast', 14000)

  const events = game.tick(19000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'flag_over')
  assert.equal(events[0].total, 3)
  assert.deepEqual(events[0].standings, [
    { player: 'p1', score: 2 },
    { player: 'p2', score: 1 },
  ])
  assert.equal(game.state, 'over')
})

test('flag: a tie is broken by who scored first', () => {
  const game = newGame()
  game.join('p1', 1000)

  game.submit('p2', 'Nigeria', 2000) // p2 scores first
  game.tick(7000)
  game.submit('p1', 'USA', 8000)
  game.tick(13000)
  game.tick(28000) // let flag 3 time out

  const events = game.tick(33000)
  assert.equal(events[0].type, 'flag_over')
  assert.deepEqual(events[0].standings.map((s) => s.player), ['p2', 'p1'])
})

test('flag: an ended game accepts nothing further', () => {
  const game = newGame()
  game.join('p1', 1000)

  const events = game.end(2000)
  assert.deepEqual(events, [{ type: 'flag_terminated' }])
  assert.equal(game.state, 'over')

  assert.deepEqual(game.submit('p1', 'Nigeria', 2100), [])
  assert.deepEqual(game.tick(3000), [])
  assert.deepEqual(game.join('p2', 3000), [])
})

test('flag: real flags.json parses and every entry is usable', () => {
  const parsed = JSON.parse(readFileSync('data/flags.json', 'utf8'))

  assert.ok(parsed.flags.length >= 150)

  const codes = new Set()
  const names = new Set()
  for (const f of parsed.flags) {
    assert.match(f.code, /^[A-Z]{2}$/, `bad code: ${f.code}`)
    assert.ok(f.name && f.name.length > 1, `bad name for ${f.code}`)
    // Two regional indicator symbols, i.e. exactly one rendered flag.
    assert.equal([...f.emoji].length, 2, `bad emoji for ${f.code}`)
    for (const ch of f.emoji) {
      const cp = ch.codePointAt(0)
      assert.ok(cp >= 0x1f1e6 && cp <= 0x1f1ff, `not a flag emoji: ${f.code}`)
    }
    assert.ok(Array.isArray(f.aliases))
    assert.ok(!codes.has(f.code), `duplicate code ${f.code}`)
    assert.ok(!names.has(f.name), `duplicate name ${f.name}`)
    codes.add(f.code)
    names.add(f.name)
  }
})

test('flag: every country in the real bank is answerable by its own name', () => {
  const parsed = JSON.parse(readFileSync('data/flags.json', 'utf8'))

  for (const f of parsed.flags) {
    const game = createFlagGame({ flags: [f], now: 0 })
    game.join('p1', 0)
    const events = game.submit('p1', f.name, 100)
    assert.equal(events.length, 1, `${f.name} is not answerable by its own name`)
  }
})
