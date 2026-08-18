// Pure, I/O-free state machine for Riddle Quest games.
// All time is injected via `now` arguments for deterministic testing.

export const RIDDLE_COUNT = 5
export const RIDDLE_CLOCK_SECONDS = 20
export const RIDDLE_HINT_SECONDS = 10
export const RIDDLE_INTERMISSION_SECONDS = 3

function normalizeGuess(text) {
  if (typeof text !== 'string') return ''
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

function matchesAnswer(guess, target, aliases = []) {
  const normGuess = normalizeGuess(guess)
  if (!normGuess) return false

  const candidates = [target, ...(aliases || [])].map(normalizeGuess)
  // Also strip leading 'a', 'an', 'the' from guess and candidates
  const stripArticles = (s) => s.replace(/^(a|an|the)\s+/i, '').trim()
  const cleanGuess = stripArticles(normGuess)

  for (const cand of candidates) {
    if (normGuess === cand || cleanGuess === stripArticles(cand)) {
      return true
    }
  }
  return false
}

export function createRiddleGame({
  riddles = [],
  count = RIDDLE_COUNT,
  clockSeconds = RIDDLE_CLOCK_SECONDS,
  hintSeconds = RIDDLE_HINT_SECONDS,
  intermissionSeconds = RIDDLE_INTERMISSION_SECONDS,
  now,
  random = Math.random,
} = {}) {
  if (!Array.isArray(riddles) || riddles.length === 0) {
    throw new Error('createRiddleGame requires a non-empty riddles array')
  }

  const selectedRiddles = riddles.slice(0, count)
  let currentIndex = 0
  let state = 'active' // 'active', 'intermission', 'over'
  let roundDeadline = now + clockSeconds * 1000
  let hintFired = false
  let nextRoundAt = null

  // Map of player -> score (riddles solved in this game)
  const scores = new Map()

  function currentRiddle() {
    return selectedRiddles[currentIndex] || null
  }

  function getSortedStandings() {
    const arr = Array.from(scores.entries()).map(([player, score]) => ({ player, score }))
    arr.sort((a, b) => b.score - a.score)
    return arr.map((item, idx) => ({
      player: item.player,
      score: item.score,
      placement: idx + 1,
    }))
  }

  return {
    get state() {
      return state
    },

    scores() {
      return new Map(scores)
    },

    currentIndex() {
      return currentIndex
    },

    totalRounds() {
      return selectedRiddles.length
    },

    end(now) {
      state = 'over'
      return [{ type: 'riddle_terminated' }]
    },

    tick(now) {
      if (state === 'over') return []

      const events = []

      // Initial start on round 0
      if (currentIndex === 0 && !hintFired && now === (roundDeadline - clockSeconds * 1000)) {
        events.push({
          type: 'riddle_start',
          round: currentIndex + 1,
          totalRounds: selectedRiddles.length,
          riddle: currentRiddle().riddle,
          hint: currentRiddle().hint,
          deadline: roundDeadline,
        })
      }

      // Check intermission transition
      if (state === 'intermission') {
        if (now >= nextRoundAt) {
          currentIndex++
          if (currentIndex >= selectedRiddles.length) {
            state = 'over'
            return [{
              type: 'riddle_game_over',
              scores: getSortedStandings(),
            }]
          }
          state = 'active'
          roundDeadline = now + clockSeconds * 1000
          hintFired = false
          nextRoundAt = null
          return [{
            type: 'riddle_start',
            round: currentIndex + 1,
            totalRounds: selectedRiddles.length,
            riddle: currentRiddle().riddle,
            hint: currentRiddle().hint,
            deadline: roundDeadline,
          }]
        }
        return []
      }

      // Active state checks
      // 1. Check hint trigger at 10s remaining
      const timeRemaining = Math.max(0, Math.ceil((roundDeadline - now) / 1000))
      if (!hintFired && timeRemaining <= hintSeconds && timeRemaining > 0) {
        hintFired = true
        events.push({
          type: 'riddle_hint',
          round: currentIndex + 1,
          totalRounds: selectedRiddles.length,
          hint: currentRiddle().hint,
          deadline: roundDeadline,
        })
      }

      // 2. Check timeout at 0s remaining
      if (now >= roundDeadline) {
        state = 'intermission'
        nextRoundAt = now + intermissionSeconds * 1000
        events.push({
          type: 'riddle_timeout',
          round: currentIndex + 1,
          totalRounds: selectedRiddles.length,
          answer: currentRiddle().answer,
          scores: getSortedStandings(),
          nextAt: nextRoundAt,
        })
      }

      return events
    },

    submit(player, text, now) {
      if (state !== 'active') return []
      if (!player || typeof text !== 'string') return []

      const q = currentRiddle()
      if (!q) return []

      if (matchesAnswer(text, q.answer, q.aliases)) {
        // Correct answer!
        const currentScore = scores.get(player) || 0
        scores.set(player, currentScore + 1)

        state = 'intermission'
        nextRoundAt = now + intermissionSeconds * 1000

        return [{
          type: 'riddle_solved',
          round: currentIndex + 1,
          totalRounds: selectedRiddles.length,
          player,
          answer: q.answer,
          score: currentScore + 1,
          scores: getSortedStandings(),
          nextAt: nextRoundAt,
        }]
      }

      // Incorrect guesses are silently ignored (no penalty, rapid-fire racing allowed)
      return []
    },
  }
}
