// Scramble race. Bot scrambles a word, everyone races to unscramble it.
// First correct gets the point.
//
// No Date.now(), no Math.random(). Time arrives via `now`, randomness via
// `random`. Same contract as engine/game.js and engine/trivia.js.
import { shuffle } from './bank.js'
import { fold } from './normalize.js'

export const SCRAMBLE_COUNT = 5
export const CLOCK_SECONDS = 15
export const GAP_SECONDS = 10

export function createScrambleGame({ words, clockSeconds = CLOCK_SECONDS, gapSeconds = GAP_SECONDS, now = 0, random = () => 0.5 }) {
  const clockMs = clockSeconds * 1000
  const gapMs = gapSeconds * 1000
  const scores = new Map()      // player -> points
  const scoredAt = new Map()    // player -> ms of their first correct answer, for tie-breaks

  let state = 'playing'
  let phase = 'idle'            // 'idle' | 'asking' | 'gap'
  let index = -1                // index of the word currently being asked
  let currentWord = null
  let currentScrambled = null
  let deadline = 0
  let gapEnd = 0

  function scrambleString(str) {
    const chars = str.split('')
    let scrambled;
    let attempts = 0;
    // Try to ensure it doesn't look exactly like the original word if possible
    do {
      scrambled = shuffle(chars, random).join('')
      attempts++;
    } while (scrambled.toLowerCase() === str.toLowerCase() && attempts < 10 && str.length > 1)
    
    return scrambled.toUpperCase()
  }

  function standings() {
    return Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score || scoredAt.get(a.player) - scoredAt.get(b.player))
  }

  function finish() {
    state = 'over'
    return [{ type: 'scramble_over', total: words.length, standings: standings() }]
  }

  function revealAndGap(at, result) {
    phase = 'gap'
    gapEnd = at + gapMs
    return [{ type: 'scramble_answer', index: index + 1, total: words.length, ...result }]
  }

  function advanceToWord(at) {
    index++
    if (index >= words.length) return finish()
    
    currentWord = words[index].answer
    currentScrambled = scrambleString(currentWord)
    deadline = at + clockMs
    phase = 'asking'
    
    return [{
      type: 'scramble_word',
      index: index + 1,
      total: words.length,
      scrambled: currentScrambled,
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
      if (phase === 'idle') {
        return advanceToWord(at)
      }
      return []
    },

    submit(player, text, at = now) {
      if (state !== 'playing' || phase !== 'asking') return []
      if (at > deadline) return [] // should have been caught by tick(), but safe

      const guess = String(text || '').trim()
      // Only exact matches are accepted (ignoring case)
      if (fold(guess) === fold(currentWord)) {
        scores.set(player, (scores.get(player) ?? 0) + 1)
        if (!scoredAt.has(player)) scoredAt.set(player, at)
        
        return revealAndGap(at, {
          correct: currentWord,
          winner: player,
          reason: 'correct',
        })
      }

      return [] // incorrect guess, ignore it (unlimited attempts)
    },

    tick(at = now) {
      if (state !== 'playing') return []
      
      if (phase === 'asking' && at >= deadline) {
        return revealAndGap(at, {
          correct: currentWord,
          winner: null,
          reason: 'timeout',
        })
      }
      
      if (phase === 'gap' && at >= gapEnd) {
        return advanceToWord(at)
      }
      
      return []
    },

    terminate(at = now) {
      state = 'over'
      return [{ type: 'scramble_terminated' }]
    }
  }
}
