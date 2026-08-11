// Logo Image Quiz. Bot sends an image, everyone races to guess the brand.
// First correct gets the point.
import { fold } from './normalize.js'

export const LOGO_COUNT = 10
export const CLOCK_SECONDS = 20
export const GAP_SECONDS = 10

export function createLogoGame({ logos, clockSeconds = CLOCK_SECONDS, gapSeconds = GAP_SECONDS, now = 0, random = () => 0.5 }) {
  const clockMs = clockSeconds * 1000
  const gapMs = gapSeconds * 1000
  const scores = new Map()      // player -> points
  const scoredAt = new Map()    // player -> ms of their first correct answer, for tie-breaks

  let state = 'playing'
  let phase = 'idle'            // 'idle' | 'asking' | 'gap'
  let index = -1                // index of the logo currently being asked
  let currentLogo = null
  let deadline = 0
  let gapEnd = 0

  function standings() {
    return Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score || scoredAt.get(a.player) - scoredAt.get(b.player))
  }

  function finish() {
    state = 'over'
    return [{ type: 'logo_over', total: logos.length, standings: standings() }]
  }

  function revealAndGap(at, result) {
    phase = 'gap'
    gapEnd = at + gapMs
    return [{ type: 'logo_answer', index: index + 1, total: logos.length, ...result }]
  }

  function advanceToLogo(at) {
    index++
    if (index >= logos.length) return finish()
    
    currentLogo = logos[index] // { answer: 'Apple', path: 'data/logos/Apple.png' }
    deadline = at + clockMs
    phase = 'asking'
    
    return [{
      type: 'logo_word',
      index: index + 1,
      total: logos.length,
      imagePath: currentLogo.path,
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
        return advanceToLogo(at)
      }
      return []
    },

    submit(player, text, at = now) {
      if (state !== 'playing' || phase !== 'asking') return []
      if (at > deadline) return [] // should have been caught by tick(), but safe

      const guess = String(text || '').trim()
      // Strip spaces and punctuation for comparison so "Coca-Cola" matches "Coca Cola"
      const sanitize = (s) => fold(s).replace(/[^a-z0-9]/g, '')
      
      if (sanitize(guess) === sanitize(currentLogo.answer)) {
        scores.set(player, (scores.get(player) ?? 0) + 1)
        if (!scoredAt.has(player)) scoredAt.set(player, at)
        
        return revealAndGap(at, {
          correct: currentLogo.answer,
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
          correct: currentLogo.answer,
          winner: null,
          reason: 'timeout',
        })
      }
      
      if (phase === 'gap' && at >= gapEnd) {
        return advanceToLogo(at)
      }
      
      return []
    },

    end(at = now) {
      state = 'over'
      return [{ type: 'logo_terminated' }]
    }
  }
}
