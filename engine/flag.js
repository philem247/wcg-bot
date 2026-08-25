// Guess the Flag. The bot posts a country's flag emoji, everyone races to name
// the country. First correct answer takes the point.
//
// Shaped like engine/logo.js (same phases, same event vocabulary) so the router,
// renderer and scheduler treat it the same way. The difference is that the prompt
// is text (an emoji) rather than an image, and answers are matched against a list
// of accepted aliases rather than one exact string — "USA", "US" and "America"
// must all score for 🇺🇸.
import { fold } from './normalize.js'

export const FLAG_COUNT = 5
export const CLOCK_SECONDS = 15
export const GAP_SECONDS = 10

// Strip everything but letters and digits so "Guinea-Bissau" matches
// "guinea bissau" and "Côte d’Ivoire" matches "cote divoire". fold() already
// handles accents and case.
function sanitize(s) {
  return fold(String(s ?? '')).replace(/[^a-z0-9]/g, '')
}

function matchesFlag(guess, flag) {
  const g = sanitize(guess)
  if (!g) return false
  const candidates = [flag.name, ...(flag.aliases || [])]
  return candidates.some((c) => sanitize(c) === g)
}

export function createFlagGame({
  flags,
  clockSeconds = CLOCK_SECONDS,
  gapSeconds = GAP_SECONDS,
  now = 0,
  random = () => 0.5,
}) {
  if (!Array.isArray(flags) || flags.length === 0) {
    throw new Error('createFlagGame requires a non-empty flags array')
  }

  const clockMs = clockSeconds * 1000
  const gapMs = gapSeconds * 1000
  const scores = new Map() // player -> points
  const scoredAt = new Map() // player -> ms of first correct answer, for tie-breaks

  let state = 'playing'
  let phase = 'idle' // 'idle' | 'asking' | 'gap'
  let index = -1
  let currentFlag = null
  let deadline = 0
  let gapEnd = 0

  function standings() {
    return Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score || scoredAt.get(a.player) - scoredAt.get(b.player))
  }

  function finish() {
    state = 'over'
    return [{ type: 'flag_over', total: flags.length, standings: standings() }]
  }

  function revealAndGap(at, result) {
    phase = 'gap'
    gapEnd = at + gapMs
    return [{ type: 'flag_answer', index: index + 1, total: flags.length, ...result }]
  }

  function advanceToFlag(at) {
    index++
    if (index >= flags.length) return finish()

    currentFlag = flags[index] // { code, name, emoji, aliases }
    deadline = at + clockMs
    phase = 'asking'

    return [{
      type: 'flag_word',
      index: index + 1,
      total: flags.length,
      emoji: currentFlag.emoji,
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
      if (phase === 'idle') return advanceToFlag(at)
      return []
    },

    submit(player, text, at = now) {
      if (state !== 'playing' || phase !== 'asking') return []
      if (at > deadline) return [] // tick() should have caught this, but be safe

      if (matchesFlag(text, currentFlag)) {
        scores.set(player, (scores.get(player) ?? 0) + 1)
        if (!scoredAt.has(player)) scoredAt.set(player, at)

        return revealAndGap(at, {
          correct: currentFlag.name,
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
          correct: currentFlag.name,
          winner: null,
          reason: 'timeout',
        })
      }

      if (phase === 'gap' && at >= gapEnd) {
        return advanceToFlag(at)
      }

      return []
    },

    end(at = now) {
      state = 'over'
      return [{ type: 'flag_terminated' }]
    },
  }
}
