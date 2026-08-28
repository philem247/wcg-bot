// Emoji Puzzle. The bot posts a short emoji sequence, everyone races to name
// what it represents. First correct answer takes the point.
//
// Shaped exactly like engine/flag.js/engine/logo.js (same phases, same event
// vocabulary) so the router, renderer and scheduler treat it the same way.
// Answers are matched against a list of accepted aliases rather than one
// exact string — "lion king", "The Lion King" and "thelionking" must all
// score for 🦁👑.
import { fold } from './normalize.js'

export const EMOJI_COUNT = 10
export const CLOCK_SECONDS = 20
export const GAP_SECONDS = 10

// Strip everything but letters and digits so "The Lion King" matches
// "the lion king" and "lionking" alike. fold() already handles accents and case.
function sanitize(s) {
  return fold(String(s ?? '')).replace(/[^a-z0-9]/g, '')
}

function matchesPuzzle(guess, puzzle) {
  const g = sanitize(guess)
  if (!g) return false
  const candidates = [puzzle.answer, ...(puzzle.aliases || [])]
  return candidates.some((c) => sanitize(c) === g)
}

export function createEmojiGame({
  puzzles,
  clockSeconds = CLOCK_SECONDS,
  gapSeconds = GAP_SECONDS,
  now = 0,
  random = () => 0.5,
}) {
  if (!Array.isArray(puzzles) || puzzles.length === 0) {
    throw new Error('createEmojiGame requires a non-empty puzzles array')
  }

  const clockMs = clockSeconds * 1000
  const gapMs = gapSeconds * 1000
  const scores = new Map() // player -> points
  const scoredAt = new Map() // player -> ms of first correct answer, for tie-breaks

  let state = 'playing'
  let phase = 'idle' // 'idle' | 'asking' | 'gap'
  let index = -1
  let currentPuzzle = null
  let deadline = 0
  let gapEnd = 0

  function standings() {
    return Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score || scoredAt.get(a.player) - scoredAt.get(b.player))
  }

  function finish() {
    state = 'over'
    return [{ type: 'emoji_over', total: puzzles.length, standings: standings() }]
  }

  function revealAndGap(at, result) {
    phase = 'gap'
    gapEnd = at + gapMs
    return [{ type: 'emoji_answer', index: index + 1, total: puzzles.length, ...result }]
  }

  function advanceToPuzzle(at) {
    index++
    if (index >= puzzles.length) return finish()

    currentPuzzle = puzzles[index] // { id, emoji, answer, aliases, category }
    deadline = at + clockMs
    phase = 'asking'

    return [{
      type: 'emoji_word',
      index: index + 1,
      total: puzzles.length,
      emoji: currentPuzzle.emoji,
      endsAt: deadline,
      clockSeconds,
    }]
  }

  return {
    get state() {
      return state
    },

    join(player, at = now) {
      if (state !== 'playing') return []
      if (phase === 'idle') return advanceToPuzzle(at)
      return []
    },

    submit(player, text, at = now) {
      if (state !== 'playing' || phase !== 'asking') return []
      if (at > deadline) return [] // tick() should have caught this, but be safe

      if (matchesPuzzle(text, currentPuzzle)) {
        scores.set(player, (scores.get(player) ?? 0) + 1)
        if (!scoredAt.has(player)) scoredAt.set(player, at)

        return revealAndGap(at, {
          correct: currentPuzzle.answer,
          winner: player,
          reason: 'correct',
        })
      }

      return [] // wrong guess, ignored — unlimited attempts, no penalty
    },

    tick(at = now) {
      if (state !== 'playing') return []

      if (phase === 'asking' && at >= deadline) {
        return revealAndGap(at, {
          correct: currentPuzzle.answer,
          winner: null,
          reason: 'timeout',
        })
      }

      if (phase === 'gap' && at >= gapEnd) {
        return advanceToPuzzle(at)
      }

      return []
    },

    end(at = now) {
      state = 'over'
      return [{ type: 'emoji_terminated' }]
    },
  }
}
