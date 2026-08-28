// Single Wordle match: two players, each with their own secret word, racing
// to solve first. No shared state between boards — see the design spec
// (docs/superpowers/specs/2026-08-26-wordle-tourney-and-emoji-design.md) for
// why different words per player is load-bearing, not a simplification: a
// shared word in a public group chat leaks every guess to the opponent for
// free, which makes waiting the optimal strategy.
//
// No Date.now(), no Math.random(). Time arrives via `now`, randomness via
// `random`. Same contract as the rest of engine/.
export const MAX_GUESSES = 6
export const SUDDEN_DEATH_MAX_GUESSES = 4
export const GUESS_COOLDOWN_MS = 20_000
export const MATCH_CLOCK_MS = 4 * 60 * 1000

// Real Wordle only marks a letter yellow if the answer has an unmatched
// occurrence of it left over after every green has claimed its letter first.
// Two-pass: greens consume from the letter pool before any yellow is decided,
// so "ERROR" guessed against "ROBOT" doesn't yellow both R's when the answer
// only has one to give.
export function scoreGuess(guess, answer) {
  const g = String(guess).toLowerCase().split('')
  const a = String(answer).toLowerCase().split('')
  const result = new Array(g.length).fill('gray')
  const pool = {}

  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) result[i] = 'green'
    else pool[a[i]] = (pool[a[i]] || 0) + 1
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'green') continue
    const c = g[i]
    if (pool[c] > 0) {
      result[i] = 'yellow'
      pool[c]--
    }
  }
  return result
}

// Tiebreak score for a board that never got solved: the single best guess
// counts, not the sum of all guesses — otherwise spamming plausible guesses
// would out-score one sharp guess that actually narrowed the word down.
export function bestProgress(feedbackRows) {
  let best = 0
  for (const row of feedbackRows) {
    let score = 0
    for (const c of row) score += c === 'green' ? 2 : c === 'yellow' ? 1 : 0
    if (score > best) best = score
  }
  return best
}

function fold(s) {
  return String(s ?? '').trim().toLowerCase()
}

export function createWordleMatch({
  p1,
  p2,
  word1,
  word2,
  maxGuesses = MAX_GUESSES,
  cooldownMs = GUESS_COOLDOWN_MS,
  matchClockMs = MATCH_CLOCK_MS,
  now = 0,
  isValidWord = () => true,
}) {
  // Both players' words are always the same length within a match — the word
  // bank only ever pairs same-tier (same-length) words — but each player's
  // guesses are checked against their own word's length, not a hardcoded 5,
  // since Medium (6 letters) and Hard (7 letters) tiers exist too.
  const w1 = fold(word1)
  const w2 = fold(word2)
  const boards = new Map([
    [p1, { word: w1, guesses: [], solvedAt: null, lastGuessAt: null }],
    [p2, { word: w2, guesses: [], solvedAt: null, lastGuessAt: null }],
  ])
  const deadline = now + matchClockMs

  let state = 'playing'
  let result = null // { winner, s1, s2, reason } once state === 'over'

  function boardOf(player) {
    return boards.get(player) ?? null
  }

  function opponentOf(player) {
    return player === p1 ? p2 : p1
  }

  function finalize(finishNow, reason, winner) {
    const b1 = boards.get(p1)
    const b2 = boards.get(p2)
    const s1 = bestProgress(b1.guesses.map((g) => g.feedback))
    const s2 = bestProgress(b2.guesses.map((g) => g.feedback))
    state = 'over'
    result = { winner: winner ?? null, s1, s2, reason }
    return { type: 'wordle_match_over', p1, p2, winner: result.winner, s1, s2, reason }
  }

  return {
    get state() {
      return state
    },

    result() {
      return result
    },

    board(player) {
      const b = boardOf(player)
      if (!b) return null
      return { guesses: b.guesses.map((g) => ({ ...g })), solved: b.solvedAt !== null, maxGuesses }
    },

    tick(checkNow) {
      if (state !== 'playing') return []
      if (checkNow < deadline) return []
      return [finalize(checkNow, 'timeout', null)]
    },

    submit(player, text, submitNow) {
      if (state !== 'playing') return []
      const board = boardOf(player)
      if (!board) return [] // not a contestant
      if (board.solvedAt !== null) return []
      if (board.guesses.length >= maxGuesses) return []

      if (board.lastGuessAt !== null && submitNow - board.lastGuessAt < cooldownMs) {
        return [{
          type: 'wordle_cooldown',
          player,
          waitMs: cooldownMs - (submitNow - board.lastGuessAt),
        }]
      }

      const guess = fold(text)
      const lengthPattern = new RegExp(`^[a-z]{${board.word.length}}$`)
      if (!lengthPattern.test(guess) || !isValidWord(guess)) {
        return [{ type: 'wordle_invalid', player, guess: text }]
      }

      const feedback = scoreGuess(guess, board.word)
      board.guesses.push({ word: guess, feedback })
      board.lastGuessAt = submitNow

      const events = [{
        type: 'wordle_guess',
        player,
        guess,
        feedback,
        guessNumber: board.guesses.length,
        maxGuesses,
        // The full board so far, not just this guess — every reply must be a
        // self-sufficient snapshot so nobody in a busy group needs to scroll
        // up to see earlier rows. See the design spec's "Feedback format".
        guesses: board.guesses.map((g) => ({ word: g.word, feedback: g.feedback })),
      }]

      if (guess === board.word) {
        board.solvedAt = submitNow
        events.push(finalize(submitNow, 'solved', player))
        return events
      }

      if (board.guesses.length >= maxGuesses) {
        const other = boardOf(opponentOf(player))
        if (other.guesses.length >= maxGuesses) {
          events.push(finalize(submitNow, 'exhausted', null))
        } else {
          events.push({ type: 'wordle_exhausted', player })
        }
      }

      return events
    },
  }
}
