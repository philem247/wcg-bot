import assert from 'node:assert/strict'
import { createTriviaGame, parseAnswer, LETTERS, QUESTION_COUNT, CLOCK_SECONDS } from './trivia.js'

const fixed = (v = 0) => () => v

// With random() === 0 the Fisher-Yates loop swaps every element with index 0,
// which is deterministic — we assert against whatever it produces rather than
// assuming a particular order.
function makeQs(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i}`, q: `Question ${i}?`, correct: `right${i}`, wrong: [`w${i}a`, `w${i}b`, `w${i}c`],
  }))
}

function startGame(n = 3, opts = {}) {
  const g = createTriviaGame({ questions: makeQs(n), category: 'general', now: 0, random: fixed(0), ...opts })
  const ev = g.tick(0)
  return { g, first: ev[0] }
}

const tests = [
  {
    name: 'parseAnswer: accepts a-d and 1-4 in any case, rejects everything else',
    fn: () => {
      assert.equal(parseAnswer('a'), 'A')
      assert.equal(parseAnswer('D'), 'D')
      assert.equal(parseAnswer(' b '), 'B')
      assert.equal(parseAnswer('1'), 'A')
      assert.equal(parseAnswer('4'), 'D')
      assert.equal(parseAnswer('e'), null)
      assert.equal(parseAnswer('5'), null)
      assert.equal(parseAnswer('abc'), null)
      assert.equal(parseAnswer('lol'), null)
      assert.equal(parseAnswer(''), null)
    },
  },
  {
    name: 'first tick emits question 1 with four options and no previous result',
    fn: () => {
      const { first } = startGame(3)
      assert.equal(first.type, 'trivia_question')
      assert.equal(first.index, 1)
      assert.equal(first.total, 3)
      assert.equal(first.category, 'general')
      assert.equal(first.options.length, 4)
      assert.equal(first.previous, undefined, 'nothing precedes the first question')
      assert.equal(first.endsAt, CLOCK_SECONDS * 1000)
      assert.deepEqual(first.options.map((o) => o.letter), LETTERS)
    },
  },
  {
    name: 'options contain the correct answer exactly once',
    fn: () => {
      const { first } = startGame(1)
      const texts = first.options.map((o) => o.text)
      assert.equal(texts.filter((t) => t === 'right0').length, 1)
      assert.equal(new Set(texts).size, 4)
    },
  },
  {
    name: 'correct answer scores and advances immediately, carrying the result forward',
    fn: () => {
      const { g, first } = startGame(3)
      const correct = first.options.find((o) => o.text === 'right0').letter
      const ev = g.submit('alice', correct, 1000)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'trivia_question')
      assert.equal(ev[0].index, 2, 'advanced without waiting out the clock')
      assert.deepEqual(ev[0].previous, { outcome: 'correct', player: 'alice', letter: correct, answer: 'right0' })
    },
  },
  {
    name: 'wrong answer emits nothing and does not advance',
    fn: () => {
      const { g, first } = startGame(3)
      const wrong = first.options.find((o) => o.text !== 'right0').letter
      assert.deepEqual(g.submit('bob', wrong, 1000), [], 'silent — no scolding in a busy group')
      assert.equal(g.state, 'playing')
    },
  },
  {
    name: 'a player gets one attempt per question: a wrong answer locks them out',
    fn: () => {
      const { g, first } = startGame(3)
      const correct = first.options.find((o) => o.text === 'right0').letter
      const wrong = first.options.find((o) => o.text !== 'right0').letter
      g.submit('bob', wrong, 1000)
      assert.deepEqual(g.submit('bob', correct, 1100), [], 'second attempt ignored')
      assert.equal(g.state, 'playing', 'still on question 1')
    },
  },
  {
    name: 'spamming every letter cannot win the point',
    fn: () => {
      const { g, first } = startGame(3)
      // Submit a deliberately wrong letter first, then every other letter.
      // The wrong one consumes the single attempt, so the correct letter that
      // follows must not score — otherwise a spammer wins every question.
      const correct = first.options.find((o) => o.text === 'right0').letter
      const wrongFirst = LETTERS.find((l) => l !== correct)
      const order = [wrongFirst, ...LETTERS.filter((l) => l !== wrongFirst)]
      const emitted = order.flatMap((l) => g.submit('cheat', l, 1000))
      assert.deepEqual(emitted, [], 'no submission after the first can score')
      assert.equal(g.state, 'playing', 'still on question 1')
      // And the point is genuinely still available to someone else.
      const ev = g.submit('honest', correct, 1100)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].previous.player, 'honest')
    },
  },
  {
    name: 'non-answer chatter is ignored entirely',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.submit('alice', 'lol what', 1000), [])
      assert.deepEqual(g.submit('alice', 'hello', 1100), [])
      // Chatter must not consume the player's one attempt.
      const q = g.tick(CLOCK_SECONDS * 1000)
      assert.equal(q[0].previous.outcome, 'timeout')
    },
  },
  {
    name: 'clock expiry reveals the answer and advances',
    fn: () => {
      const { g, first } = startGame(3)
      const correctText = 'right0'
      const correctLetter = first.options.find((o) => o.text === correctText).letter
      const ev = g.tick(CLOCK_SECONDS * 1000)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].index, 2)
      assert.deepEqual(ev[0].previous, { outcome: 'timeout', letter: correctLetter, answer: correctText })
    },
  },
  {
    name: 'tick before the deadline emits nothing',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.tick(CLOCK_SECONDS * 1000 - 1), [])
    },
  },
  {
    name: 'game ends after the last question with ranked standings',
    fn: () => {
      const { g } = startGame(2)
      let ev = g.tick(CLOCK_SECONDS * 1000)      // Q1 times out -> Q2
      assert.equal(ev[0].index, 2)
      const correct = ev[0].options.find((o) => o.text === 'right1').letter
      ev = g.submit('alice', correct, 20_000)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'trivia_over')
      assert.equal(g.state, 'over')
      assert.deepEqual(ev[0].standings, [{ player: 'alice', score: 1 }])
      assert.equal(ev[0].category, 'general')
      assert.equal(ev[0].total, 2)
    },
  },
  {
    name: 'standings rank by score, ties broken by who scored first',
    fn: () => {
      const g = createTriviaGame({ questions: makeQs(3), category: 'general', now: 0, random: fixed(0) })
      let ev = g.tick(0)
      const letterFor = (q, text) => q.options.find((o) => o.text === text).letter
      ev = g.submit('bob', letterFor(ev[0], 'right0'), 1000)      // bob scores at 1000
      ev = g.submit('alice', letterFor(ev[0], 'right1'), 2000)    // alice scores at 2000
      ev = g.submit('bob', letterFor(ev[0], 'right2'), 3000)      // bob scores again
      assert.equal(ev[0].type, 'trivia_over')
      assert.deepEqual(ev[0].standings, [
        { player: 'bob', score: 2 },
        { player: 'alice', score: 1 },
      ])
    },
  },
  {
    name: 'players who never answered are absent from standings',
    fn: () => {
      const { g, first } = startGame(1)
      const wrong = first.options.find((o) => o.text !== 'right0').letter
      const ev = g.submit('ghost', wrong, 1000)
      assert.deepEqual(ev, [], 'wrong answer is silent')
      const over = g.tick(CLOCK_SECONDS * 1000)
      assert.equal(over[0].type, 'trivia_over')
      assert.deepEqual(over[0].standings, [], 'nobody scored, nobody ranks')
    },
  },
  {
    name: 'the final question is never dropped: a timeout on it still reveals the answer via trivia_over.previous',
    fn: () => {
      const { g, first } = startGame(1)
      const correctLetter = first.options.find((o) => o.text === 'right0').letter
      const ev = g.tick(CLOCK_SECONDS * 1000)
      assert.equal(ev[0].type, 'trivia_over')
      assert.deepEqual(ev[0].previous, { outcome: 'timeout', letter: correctLetter, answer: 'right0' })
    },
  },
  {
    name: 'the final question is never dropped: a correct final answer is still revealed via trivia_over.previous',
    fn: () => {
      const { g, first } = startGame(1)
      const correct = first.options.find((o) => o.text === 'right0').letter
      const ev = g.submit('alice', correct, 1000)
      assert.equal(ev[0].type, 'trivia_over')
      assert.deepEqual(ev[0].previous, { outcome: 'correct', player: 'alice', letter: correct, answer: 'right0' })
    },
  },
  {
    name: 'end() terminates without standings and marks the game over',
    fn: () => {
      const { g } = startGame(5)
      const ev = g.end(5000)
      assert.deepEqual(ev, [{ type: 'trivia_terminated' }])
      assert.equal(g.state, 'over')
      assert.deepEqual(g.tick(99_999), [], 'no events after it is over')
      assert.deepEqual(g.submit('alice', 'a', 99_999), [])
    },
  },
  {
    name: 'join() is a no-op so the router bare-message path needs no branch',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.join('alice', 0), [])
    },
  },
  {
    name: 'identical seeds produce identical games',
    fn: () => {
      const a = createTriviaGame({ questions: makeQs(3), category: 'general', now: 0, random: fixed(0.42) })
      const b = createTriviaGame({ questions: makeQs(3), category: 'general', now: 0, random: fixed(0.42) })
      assert.deepEqual(a.tick(0), b.tick(0))
    },
  },
  {
    name: 'QUESTION_COUNT and CLOCK_SECONDS are the documented defaults',
    fn: () => {
      assert.equal(QUESTION_COUNT, 10)
      assert.equal(CLOCK_SECONDS, 15)
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}\n  ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
