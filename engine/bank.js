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

      const ANIMATION_CATEGORIES = new Set(['anime', 'naruto', 'cartoons'])

      // Mixed: round-robin one question from each non-empty category in turn.
      // Drawing uniformly from a pooled list would let the largest category
      // supply a third of every game purely for being large.
      // Animation/anime is capped to at most 1 question per mixed game/match
      // so it never over-saturates mixed mode.
      const pools = this.categories()
        .map((c) => ({
          category: c,
          items: shuffle(poolOf(c, exclude), random).map((q) => ({ ...q, category: c })),
        }))
        .filter((p) => p.items.length > 0)

      const order = shuffle(pools, random)
      const out = []
      let animationCount = 0

      for (let round = 0; out.length < count; round++) {
        let addedThisRound = 0
        for (const pool of order) {
          if (out.length >= count) break
          if (round < pool.items.length) {
            const isAnim = ANIMATION_CATEGORIES.has(pool.category)
            if (isAnim && animationCount >= 1 && order.some((p) => !ANIMATION_CATEGORIES.has(p.category) && p.items.length > round)) {
              continue
            }
            out.push(pool.items[round])
            if (isAnim) animationCount++
            addedThisRound++
          }
        }
        if (addedThisRound === 0) break
      }

      if (out.length < count) {
        for (const pool of order) {
          for (const item of pool.items) {
            if (out.length >= count) break
            if (!out.some((q) => q.id === item.id)) {
              out.push(item)
            }
          }
        }
      }

      return out
    },

    pickScrambleWords({ count, random, isValidWord = () => true }) {
      // Scramble words don't care about categories or asked history, they just
      // need to be single words of 4-7 letters (letters only, no symbols).
      const allQuestions = [];
      for (const c of this.categories()) {
        allQuestions.push(...(byCategory[c] ?? []));
      }
      
      const validScrambleQuestions = allQuestions.filter(q => {
        // Must be exactly one word, only a-z letters, length 4 to 7
        return /^[A-Za-z]{4,7}$/.test(q.correct) && isValidWord(q.correct);
      });

      return shuffle(validScrambleQuestions, random).slice(0, count);
    },
  }
}

export function loadRiddleBank({ path = 'data/riddles.json', data = null } = {}) {
  const riddles = data ?? JSON.parse(readFileSync(path, 'utf8'))

  return {
    size() {
      return riddles.length
    },

    pickRiddles({ count = 5, exclude = new Set(), random = Math.random } = {}) {
      const available = riddles.filter(r => !exclude.has(r.id))
      return shuffle(available, random).slice(0, count)
    },
  }
}

export function loadFlagBank({ path = 'data/flags.json', data = null } = {}) {
  const parsed = data ?? JSON.parse(readFileSync(path, 'utf8'))
  const flags = parsed.flags ?? []

  return {
    size() {
      return flags.length
    },

    pickFlags({ count = 5, exclude = new Set(), random = Math.random } = {}) {
      const available = flags.filter(f => !exclude.has(f.code))
      return shuffle(available, random).slice(0, count)
    },
  }
}

