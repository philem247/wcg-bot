// Question bank: loads data/trivia.json and picks unasked questions.
// No Date.now(), no Math.random() — randomness is injected so the suite is
// reproducible, same rule as the rest of engine/.
import { readFileSync } from 'node:fs'

export const CATEGORIES = ['general', 'football', 'fpl', 'sports', 'science', 'tech', 'movies', 'tv-shows', 'geography', 'history', 'anime', 'animals', 'videogames', 'cartoons', 'art', 'mythology', 'vehicles', 'nigerian-music', 'nigerian-entertainment', 'nigerian-history', 'nigerian-food', 'pidgin-english', 'web3', 'bible', 'music', 'food', 'got', 'naruto', 'health', 'tech-gadgets']

// Fisher-Yates. Returns a new array; the caller's is untouched.
export function shuffle(array, random) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

export function loadBank({ path = 'data/trivia.json', data = null } = {}) {
  const bank = data ?? JSON.parse(readFileSync(path, 'utf8'))
  const byCategory = bank.categories ?? {}

  const poolOf = (category, exclude) =>
    (byCategory[category] ?? []).filter((q) => !exclude.has(q.id))

  return {
    get attribution() {
      return bank.attribution ?? ''
    },

    // Only categories that actually have questions are offerable.
    categories() {
      return CATEGORIES.filter((c) => (byCategory[c] ?? []).length > 0)
    },

    size(category) {
      return (byCategory[category] ?? []).length
    },

    pick({ category, count, exclude = new Set(), random }) {
      if (category !== 'mixed') {
        return shuffle(poolOf(category, exclude), random).slice(0, count).map((q) => ({ ...q, category }))
      }

      // Mixed: round-robin one question from each non-empty category in turn.
      // Drawing uniformly from a pooled list would let the largest category
      // supply a third of every game purely for being large.
      // Each question is tagged with its real source category (not 'mixed') so
      // markAsked/askedIds can enforce repeat-avoidance across modes — see store/db.js.
      const pools = this.categories().map((c) => shuffle(poolOf(c, exclude), random).map((q) => ({ ...q, category: c })))
      const order = shuffle(pools, random)
      const out = []
      for (let round = 0; out.length < count; round++) {
        let addedThisRound = 0
        for (const pool of order) {
          if (out.length >= count) break
          if (round < pool.length) {
            out.push(pool[round])
            addedThisRound++
          }
        }
        if (addedThisRound === 0) break // every pool exhausted
      }
      return out
    },
  }
}
