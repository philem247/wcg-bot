import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createEmojiGame, EMOJI_COUNT, CLOCK_SECONDS, GAP_SECONDS } from './emoji.js'

const testPuzzles = [
  { id: 'e1', emoji: '🦁👑', answer: 'The Lion King', aliases: ['lion king'], category: 'movies' },
  { id: 'e2', emoji: '🕷️👨', answer: 'Spider-Man', aliases: ['spiderman', 'spider man'], category: 'movies' },
  { id: 'e3', emoji: '🍚🐟', answer: 'Jollof Rice', aliases: ['jollof'], category: 'food' },
]

function newGame(puzzles = testPuzzles, opts = {}) {
  return createEmojiGame({ puzzles, clockSeconds: 20, gapSeconds: 10, now: 1000, ...opts })
}

test('emoji: defaults are 10 puzzles at 20 seconds each', () => {
  assert.equal(EMOJI_COUNT, 10)
  assert.equal(CLOCK_SECONDS, 20)
  assert.equal(GAP_SECONDS, 10)
})

test('emoji: rejects an empty pool rather than starting an unplayable game', () => {
  assert.throws(() => createEmojiGame({ puzzles: [] }), /non-empty/)
})

test('emoji: join posts the first puzzle with its deadline', () => {
  const game = newGame()
  const events = game.join('p1', 1000)

  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'emoji_word')
  assert.equal(events[0].index, 1)
  assert.equal(events[0].total, 3)
  assert.equal(events[0].emoji, '🦁👑')
  assert.equal(events[0].endsAt, 21000)
  assert.equal(events[0].clockSeconds, 20)
})

test('emoji: a second join mid-round does not restart or skip the round', () => {
  const game = newGame()
  game.join('p1', 1000)
  assert.deepEqual(game.join('p2', 2000), [])
})

test('emoji: correct answer scores, reveals, and opens the gap', () => {
  const game = newGame()
  game.join('p1', 1000)

  const events = game.submit('p1', 'The Lion King', 3000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'emoji_answer')
  assert.equal(events[0].correct, 'The Lion King')
  assert.equal(events[0].winner, 'p1')
  assert.equal(events[0].reason, 'correct')
})

test('emoji: aliases, case and spacing all score', () => {
  for (const guess of ['spiderman', 'Spider-Man', '  spider man  ', 'SPIDERMAN']) {
    const game = newGame([testPuzzles[1]])
    game.join('p1', 1000)
    const events = game.submit('p1', guess, 2000)
    assert.equal(events.length, 1, `"${guess}" should have scored`)
    assert.equal(events[0].winner, 'p1')
  }
})

test('emoji: a wrong guess is ignored silently and does not end the round', () => {
  const game = newGame()
  game.join('p1', 1000)

  assert.deepEqual(game.submit('p1', 'Aladdin', 2000), [])
  assert.deepEqual(game.submit('p1', '', 2100), [])
  // The round is still live, so the right answer still scores.
  assert.equal(game.submit('p2', 'lion king', 2200)[0].winner, 'p2')
})

test('emoji: only the first correct answer scores — the rest arrive too late', () => {
  const game = newGame()
  game.join('p1', 1000)

  assert.equal(game.submit('p1', 'lion king', 2000)[0].winner, 'p1')
  // Now in the gap: a second correct answer earns nothing.
  assert.deepEqual(game.submit('p2', 'lion king', 2100), [])
})

test('emoji: an unanswered puzzle times out and reveals the answer', () => {
  const game = newGame()
  game.join('p1', 1000)

  assert.deepEqual(game.tick(20000), [])
  const events = game.tick(21000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'emoji_answer')
  assert.equal(events[0].winner, null)
  assert.equal(events[0].reason, 'timeout')
  assert.equal(events[0].correct, 'The Lion King')
})

test('emoji: the next puzzle arrives only after the gap elapses', () => {
  const game = newGame()
  game.join('p1', 1000)
  game.submit('p1', 'lion king', 3000) // gap runs 3000 -> 13000

  assert.deepEqual(game.tick(12000), [])
  const events = game.tick(13000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'emoji_word')
  assert.equal(events[0].index, 2)
  assert.equal(events[0].emoji, '🕷️👨')
})

test('emoji: the game ends after the last puzzle, ranking by score', () => {
  const game = newGame()
  game.join('p1', 1000)

  game.submit('p1', 'lion king', 2000)
  game.tick(12000) // puzzle 2
  game.submit('p2', 'spiderman', 13000)
  game.tick(23000) // puzzle 3
  game.submit('p1', 'jollof', 24000)

  const events = game.tick(34000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'emoji_over')
  assert.equal(events[0].total, 3)
  assert.deepEqual(events[0].standings, [
    { player: 'p1', score: 2 },
    { player: 'p2', score: 1 },
  ])
  assert.equal(game.state, 'over')
})

test('emoji: a tie is broken by who scored first', () => {
  const game = newGame()
  game.join('p1', 1000)

  game.submit('p2', 'lion king', 2000) // p2 scores first
  game.tick(12000)
  game.submit('p1', 'spiderman', 13000)
  game.tick(23000)
  game.tick(43000) // let puzzle 3 time out

  const events = game.tick(53000)
  assert.equal(events[0].type, 'emoji_over')
  assert.deepEqual(events[0].standings.map((s) => s.player), ['p2', 'p1'])
})

test('emoji: an ended game accepts nothing further', () => {
  const game = newGame()
  game.join('p1', 1000)

  const events = game.end(2000)
  assert.deepEqual(events, [{ type: 'emoji_terminated' }])
  assert.equal(game.state, 'over')

  assert.deepEqual(game.submit('p1', 'lion king', 2100), [])
  assert.deepEqual(game.tick(3000), [])
  assert.deepEqual(game.join('p2', 3000), [])
})

test('emoji: real emoji.json parses and every entry is usable', () => {
  const parsed = JSON.parse(readFileSync('data/emoji.json', 'utf8'))
  const puzzles = parsed.puzzles ?? parsed

  assert.ok(puzzles.length >= 300, `expected at least 300 puzzles, got ${puzzles.length}`)

  const ids = new Set()
  const emojiSeen = new Set()
  const answersByCategory = new Map()
  for (const p of puzzles) {
    assert.ok(p.id && p.id.length > 0, 'every puzzle needs an id')
    assert.ok(!ids.has(p.id), `duplicate id: ${p.id}`)
    ids.add(p.id)

    assert.ok(p.emoji && p.emoji.length > 0, `bad emoji for ${p.id}`)
    assert.ok(!emojiSeen.has(p.emoji), `duplicate emoji clue: ${p.emoji}`)
    emojiSeen.add(p.emoji)
    // No letters or digits in the clue — emoji only.
    assert.doesNotMatch(p.emoji, /[a-zA-Z0-9]/, `emoji clue contains text: ${p.id} "${p.emoji}"`)

    assert.ok(p.answer && p.answer.length > 1, `bad answer for ${p.id}`)
    assert.ok(Array.isArray(p.aliases), `aliases must be an array for ${p.id}`)
    assert.ok(p.category && p.category.length > 0, `missing category for ${p.id}`)

    const key = `${p.category}:${p.answer.toLowerCase()}`
    assert.ok(!answersByCategory.has(key), `duplicate answer within a category: ${key}`)
    answersByCategory.set(key, true)
  }
})

test('emoji: every puzzle in the real bank is answerable by its own answer text', () => {
  const parsed = JSON.parse(readFileSync('data/emoji.json', 'utf8'))
  const puzzles = parsed.puzzles ?? parsed

  for (const p of puzzles) {
    const game = createEmojiGame({ puzzles: [p], now: 0 })
    game.join('p1', 0)
    const events = game.submit('p1', p.answer, 100)
    assert.equal(events.length, 1, `${p.id} ("${p.answer}") is not answerable by its own answer text`)
  }
})
