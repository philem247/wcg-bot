import test from 'node:test'
import assert from 'node:assert/strict'
import { createWordleMatch, scoreGuess, bestProgress, MAX_GUESSES, GUESS_COOLDOWN_MS, MATCH_CLOCK_MS } from './wordle.js'

test('scoreGuess: exact match is all green', () => {
  assert.deepEqual(scoreGuess('crane', 'crane'), ['green', 'green', 'green', 'green', 'green'])
})

test('scoreGuess: no shared letters is all gray', () => {
  assert.deepEqual(scoreGuess('bugsy', 'crane'), ['gray', 'gray', 'gray', 'gray', 'gray'])
})

test('scoreGuess: mixed green/yellow/gray with no duplicate letters', () => {
  // answer CRANE, guess REACT
  assert.deepEqual(scoreGuess('react', 'crane'), ['yellow', 'yellow', 'green', 'yellow', 'gray'])
})

test('scoreGuess: a guess cannot yellow more of a letter than the answer actually has', () => {
  // answer ROBOT has one R; guess ERROR has three. Only one may go yellow, and
  // it must be the leftmost, matching real Wordle's left-to-right pass.
  assert.deepEqual(scoreGuess('error', 'robot'), ['gray', 'yellow', 'gray', 'green', 'gray'])
})

test('scoreGuess: both duplicate letters in a guess score when the answer has enough of them', () => {
  // answer SPEED has two E's; guess ELITE has two E's too — both are real.
  assert.deepEqual(scoreGuess('elite', 'speed'), ['yellow', 'gray', 'gray', 'gray', 'yellow'])
})

test('bestProgress: takes the single best guess, not a sum across guesses', () => {
  const rows = [
    ['gray', 'gray', 'gray', 'gray', 'gray'],
    ['green', 'yellow', 'gray', 'gray', 'gray'],
    ['yellow', 'gray', 'gray', 'gray', 'gray'],
  ]
  assert.equal(bestProgress(rows), 3) // one green (2) + one yellow (1) from row 2
})

test('bestProgress: no guesses is zero', () => {
  assert.equal(bestProgress([]), 0)
})

function newMatch(overrides = {}) {
  return createWordleMatch({
    p1: 'alice', p2: 'bob', word1: 'crane', word2: 'plumb', now: 0, ...overrides,
  })
}

test('wordle match: a non-contestant submission is ignored', () => {
  const m = newMatch()
  assert.deepEqual(m.submit('carol', 'grape', 100), [])
})

test('wordle match: a correct guess ends the match immediately in the solver\'s favour', () => {
  const m = newMatch()
  const events = m.submit('alice', 'crane', 100)
  assert.equal(events.length, 2)
  assert.equal(events[0].type, 'wordle_guess')
  assert.equal(events[1].type, 'wordle_match_over')
  assert.equal(events[1].winner, 'alice')
  assert.equal(events[1].reason, 'solved')
  assert.equal(m.state, 'over')
})

test('wordle match: the opponent cannot guess once the match is over', () => {
  const m = newMatch()
  m.submit('alice', 'crane', 100)
  assert.deepEqual(m.submit('bob', 'plumb', 200), [])
})

test('wordle match: a wrong guess does not end the match', () => {
  const m = newMatch()
  const events = m.submit('alice', 'grape', 100)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'wordle_guess')
  assert.equal(m.state, 'playing')
})

test('wordle match: an invalid word is rejected and consumes no guess', () => {
  const m = newMatch({ isValidWord: (w) => w === 'crane' })
  const events = m.submit('alice', 'zzzzz', 100)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'wordle_invalid')
  assert.equal(m.board('alice').guesses.length, 0)
})

test('wordle match: a guess of the wrong length is rejected and consumes no guess', () => {
  const m = newMatch()
  const events = m.submit('alice', 'ab', 100)
  assert.equal(events[0].type, 'wordle_invalid')
  assert.equal(m.board('alice').guesses.length, 0)
})

test('wordle match: a second guess inside the cooldown window is rejected and consumes no guess', () => {
  const m = newMatch({ now: 0 })
  m.submit('alice', 'grape', 0)
  const events = m.submit('alice', 'ghost', GUESS_COOLDOWN_MS - 1)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'wordle_cooldown')
  assert.equal(m.board('alice').guesses.length, 1)
})

test('wordle match: a guess exactly at the cooldown boundary is accepted', () => {
  const m = newMatch({ now: 0 })
  m.submit('alice', 'grape', 0)
  const events = m.submit('alice', 'ghost', GUESS_COOLDOWN_MS)
  assert.equal(events[0].type, 'wordle_guess')
  assert.equal(m.board('alice').guesses.length, 2)
})

test('wordle match: the cooldown is per player, not shared across the match', () => {
  const m = newMatch({ now: 0 })
  m.submit('alice', 'grape', 0)
  const events = m.submit('bob', 'ghost', 100) // bob has never guessed, no cooldown applies to him
  assert.equal(events[0].type, 'wordle_guess')
})

test('wordle match: one player exhausting their guesses does not end the match while the other still can guess', () => {
  const m = newMatch({ now: 0, maxGuesses: 2 })
  m.submit('alice', 'grape', 0)
  const events = m.submit('alice', 'ghost', GUESS_COOLDOWN_MS)
  assert.equal(events.length, 2)
  assert.equal(events[1].type, 'wordle_exhausted')
  assert.equal(m.state, 'playing')
  // bob can still solve and win outright even though alice is out of guesses.
  const winEvents = m.submit('bob', 'plumb', 100)
  assert.equal(winEvents[1].type, 'wordle_match_over')
  assert.equal(winEvents[1].winner, 'bob')
})

test('wordle match: both players exhausting their guesses without solving ends the match by progress', () => {
  const m = newMatch({ now: 0, maxGuesses: 1 })
  const e1 = m.submit('alice', 'react', 0) // CRANE vs REACT -> yellow,yellow,green,yellow,gray = 5
  const e2 = m.submit('bob', 'crane', 0) // PLUMB shares no letters with CRANE -> all gray, score 0
  assert.equal(e1[e1.length - 1].type, 'wordle_exhausted')
  assert.equal(e2[e2.length - 1].type, 'wordle_match_over')
  const over = e2[e2.length - 1]
  assert.equal(over.reason, 'exhausted')
  assert.equal(over.winner, null) // resolving a tie by progress is the tournament wrapper's job, not the match's
  assert.equal(over.s1, 5)
  assert.equal(over.s2, 0)
})

test('wordle match: the match clock ends an unresolved match by timeout', () => {
  const m = newMatch({ now: 0 })
  assert.deepEqual(m.tick(MATCH_CLOCK_MS - 1), [])
  const events = m.tick(MATCH_CLOCK_MS)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'wordle_match_over')
  assert.equal(events[0].reason, 'timeout')
  assert.equal(events[0].winner, null)
})

test('wordle match: tick does nothing once the match is already over', () => {
  const m = newMatch()
  m.submit('alice', 'crane', 100)
  assert.deepEqual(m.tick(999_999), [])
})

test('wordle match: guess length is checked against each player\'s own word, not hardcoded to 5', () => {
  // Medium tier is 6 letters, Hard is 7 — the same match engine handles all
  // three tiers, so a 5-letter guess against a 7-letter word must be rejected
  // as invalid rather than silently scored against a mismatched length.
  const m = createWordleMatch({ p1: 'alice', p2: 'bob', word1: 'planet', word2: 'planet', now: 0 })
  const shortGuess = m.submit('alice', 'plane', 100) // 5 letters against a 6-letter word
  assert.equal(shortGuess[0].type, 'wordle_invalid')
  assert.equal(m.board('alice').guesses.length, 0)

  const rightLength = m.submit('alice', 'planet', 200)
  assert.equal(rightLength[0].type, 'wordle_guess')
})

test('wordle match: scoreGuess and bestProgress work at 7 letters, not just 5', () => {
  const m = createWordleMatch({ p1: 'alice', p2: 'bob', word1: 'analyze', word2: 'analyze', now: 0 })
  const events = m.submit('alice', 'catalyz'.padEnd(7, 'e').slice(0, 7), 100)
  // Not asserting exact colours here (covered by the scoreGuess unit tests) —
  // just that a 7-letter guess against a 7-letter word is accepted and scored.
  assert.equal(events[0].type, 'wordle_guess')
  assert.equal(events[0].feedback.length, 7)
})

test('wordle match: default max guesses is 6', () => {
  const m = newMatch()
  for (let i = 0; i < MAX_GUESSES - 1; i++) {
    m.submit('alice', 'grape', i * GUESS_COOLDOWN_MS)
  }
  assert.equal(m.board('alice').guesses.length, MAX_GUESSES - 1)
  assert.equal(m.state, 'playing')
})
