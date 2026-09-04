// engine/careerpath.js
// Career Path: free-for-all football guessing game. A mystery player's club
// history is revealed one club at a time; first correct guess in the chat
// wins the round. Race pattern mirrors engine/trivia.js exactly (tick/submit/
// join/end, no per-player attempt limit though — unlike trivia, guessing
// keeps working every reveal window until someone gets it or the round ends).
// Answer matching reuses engine/concentration.js's matchItem()-style
// fold/normalize/alias approach.
//
// No Date.now(), no Math.random(). Time via `now`/`at` params, randomness via
// `random` (unused here — pool order/selection is the caller's job).
import { fold } from './normalize.js'

export const ROUND_COUNT = 8
export const REVEAL_SECONDS = 20
export const GAP_SECONDS = 10
export const POINTS_MAX = 5

function sanitize(s) {
  return fold(String(s ?? '')).replace(/[^a-z0-9]/g, '')
}

function matchPlayer(text, player) {
  const g = sanitize(text)
  if (!g) return false
  if (sanitize(player.name) === g) return true
  return (player.aliases ?? []).some((a) => sanitize(a) === g)
}

export function createCareerPathGame({
  pool,
  roundCount = ROUND_COUNT,
  revealSeconds = REVEAL_SECONDS,
  gapSeconds = GAP_SECONDS,
  now = 0,
  random = () => 0.5,
}) {
  const revealMs = revealSeconds * 1000
  const gapMs = gapSeconds * 1000
  const totalRounds = Math.min(roundCount, pool.length)

  const scores = new Map()   // player -> points
  const scoredAt = new Map() // player -> ms of first correct answer, for tie-breaks

  let state = 'playing'
  let phase = 'idle'    // 'idle' | 'revealing' | 'gap'
  let round = -1        // index into pool of the round currently playing
  let current = null    // pool entry for the current round
  let revealed = []      // clubs revealed so far this round
  let deadline = 0
  let gapEnd = 0

  function standings() {
    return Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score || scoredAt.get(a.player) - scoredAt.get(b.player))
  }

  function finish() {
    state = 'over'
    return [{ type: 'careerpath_over', totalRounds, standings: standings() }]
  }

  function enterGap(at) {
    phase = 'gap'
    gapEnd = at + gapMs
  }

  function advanceToRound(at) {
    round++
    if (round >= totalRounds) return finish()
    current = pool[round]
    revealed = [current.clubs[0]]
    deadline = at + revealMs
    phase = 'revealing'
    return [{
      type: 'careerpath_reveal',
      round: round + 1,
      totalRounds,
      clubs: revealed.slice(),
      revealSeconds,
    }]
  }

  return {
    get state() {
      return state
    },

    tick(at) {
      if (state === 'over') return []

      if (phase === 'idle') return advanceToRound(at)

      if (phase === 'gap') {
        if (at < gapEnd) return []
        return advanceToRound(at)
      }

      // revealing phase
      if (at < deadline) return []

      // Reveal deadline passed with clubs still unshown: show the next one.
      if (revealed.length < current.clubs.length) {
        revealed.push(current.clubs[revealed.length])
        deadline = at + revealMs
        return [{
          type: 'careerpath_reveal',
          round: round + 1,
          totalRounds,
          clubs: revealed.slice(),
          revealSeconds,
        }]
      }

      // All clubs revealed, nobody guessed: round ends unscored.
      enterGap(at)
      return [{
        type: 'careerpath_timeout',
        answer: current.name,
        clubs: current.clubs.slice(),
        round: round + 1,
        totalRounds,
      }]
    },

    submit(player, text, at) {
      if (state === 'over' || phase !== 'revealing' || !current) return []
      if (!matchPlayer(text, current)) return []

      const points = Math.max(1, POINTS_MAX - (revealed.length - 1))
      scores.set(player, (scores.get(player) ?? 0) + points)
      if (!scoredAt.has(player)) scoredAt.set(player, at)

      enterGap(at)
      return [{
        type: 'careerpath_correct',
        player,
        answer: current.name,
        clubs: current.clubs.slice(),
        round: round + 1,
        totalRounds,
        points,
      }]
    },

    // No lobby: answering is joining. Present so the router's existing
    // bare-message path works unchanged.
    join() {
      return []
    },

    end() {
      if (state === 'over') return []
      state = 'over'
      return [{ type: 'careerpath_terminated' }]
    },
  }
}
