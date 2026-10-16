// Question bank: loads data/trivia.json and picks unasked questions.
// No Date.now(), no Math.random() — randomness is injected so the suite is
// reproducible, same rule as the rest of engine/.
import { readFileSync } from 'node:fs'

// Share of a single-category game reserved for questions flagged `hard`.
export const HARD_SHARE = 0.4

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

// Sample questions with template diversity: if items have template tags,
// round-robin across templates so no single template over-dominates.
export function sampleDiverse(pool, count, random) {
  const byTemplate = new Map()
  for (const item of pool) {
    const t = item.template || '__none__'
    let group = byTemplate.get(t)
    if (!group) {
      group = []
      byTemplate.set(t, group)
    }
    group.push(item)
  }

  if (byTemplate.size <= 1) {
    return shuffle(pool, random).slice(0, count)
  }

  const templatePools = Array.from(byTemplate.entries()).map(([tmpl, items]) => ({
    tmpl,
    items: shuffle(items, random),
  }))
  const order = shuffle(templatePools, random)
  const out = []

  for (let round = 0; out.length < count; round++) {
    let addedThisRound = 0
    for (const p of order) {
      if (out.length >= count) break
      if (round < p.items.length) {
        out.push(p.items[round])
        addedThisRound++
      }
    }
    if (addedThisRound === 0) break
  }

  if (out.length < count) {
    for (const p of order) {
      for (const item of p.items) {
        if (out.length >= count) break
        if (!out.some((q) => q.id === item.id)) {
          out.push(item)
        }
      }
    }
  }

  return shuffle(out, random)
}

// Template-first order: templates interleaved round-robin in a shuffled
// order, each template's questions shuffled. Taking the first few gives an
// even spread of question shapes, unlike a plain shuffle of the pool.
export function diverseOrder(pool, random) {
  const byTemplate = new Map()
  for (const q of pool) {
    const t = q.template || '__none__'
    if (!byTemplate.has(t)) byTemplate.set(t, [])
    byTemplate.get(t).push(q)
  }
  const groups = shuffle([...byTemplate.values()], random).map((g) => shuffle(g, random))
  const out = []
  for (let i = 0; out.length < pool.length; i++) {
    for (const g of groups) if (i < g.length) out.push(g[i])
  }
  return out
}

export function loadBank({ path = 'data/trivia.json', data = null } = {}) {
  const bank = data ?? JSON.parse(readFileSync(path, 'utf8'))
  const byCategory = bank.categories ?? {}

  const categoryById = new Map()
  for (const [c, qs] of Object.entries(byCategory)) for (const q of qs) categoryById.set(q.id, c)

  const poolOf = (category, exclude) =>
    (byCategory[category] ?? []).filter((q) => !exclude.has(q.id))

  return {
    get attribution() {
      return bank.attribution ?? ''
    },

    // Source category of a question id (tournaments record ids only).
    categoryOf(id) {
      return categoryById.get(id)
    },

    // Only categories that actually have questions are offerable.
    categories() {
      return CATEGORIES.filter((c) => (byCategory[c] ?? []).length > 0)
    },

    size(category) {
      return (byCategory[category] ?? []).length
    },

    pick({ category, count, exclude = new Set(), random = Math.random }) {
      if (category !== 'mixed') {
        const pool = poolOf(category, exclude)
        // Questions flagged `hard` (data/add-football-variety.mjs) get a
        // guaranteed share of every game. Spread evenly across ~130 templates
        // they'd surface about once a game, and a game would still feel easy.
        const hardPool = pool.filter((q) => q.hard)
        const nHard = Math.min(hardPool.length, Math.round(count * HARD_SHARE))
        const picked = nHard > 0
          ? [
              ...sampleDiverse(hardPool, nHard, random),
              ...sampleDiverse(pool.filter((q) => !q.hard), count - nHard, random),
            ]
          : sampleDiverse(pool, count, random)
        // Topped up from the hard tier if the normal pool alone ran short.
        if (picked.length < count && nHard > 0) {
          const have = new Set(picked.map((q) => q.id))
          picked.push(...sampleDiverse(hardPool.filter((q) => !have.has(q.id)), count - picked.length, random))
        }
        return shuffle(picked, random).map((q) => ({ ...q, category }))
      }

      const ANIMATION_CATEGORIES = new Set(['anime', 'naruto', 'cartoons'])

      // Mixed: categories take turns in a shuffled order, so the largest
      // category can't supply a third of every game purely for being large.
      // Within a category the draw is template-first (diverseOrder), so one
      // big template — FPL's "how many assists did X provide?" was 37% of
      // FPL draws — no longer dominates. HARD_SHARE of the slots ask for a
      // question flagged `hard`, falling back to a normal one when that
      // category has none left (and vice versa). Animation/anime is capped
      // to one question per game while anything else is still available.
      const pools = shuffle(this.categories(), random)
        .map((c) => {
          const pool = poolOf(c, exclude)
          return {
            category: c,
            hard: diverseOrder(pool.filter((q) => q.hard), random),
            normal: diverseOrder(pool.filter((q) => !q.hard), random),
          }
        })
        .filter((p) => p.hard.length + p.normal.length > 0)

      const nHard = Math.round(count * HARD_SHARE)
      const out = []
      const seen = new Set()
      const usedCats = new Set()
      let animationCount = 0
      const animBlocked = (p) =>
        ANIMATION_CATEGORIES.has(p.category) && animationCount >= 1 &&
        pools.some((o) => !ANIMATION_CATEGORIES.has(o.category) && !usedCats.has(o.category) && o.hard.length + o.normal.length > 0)
      const take = (p, q) => {
        if (!q || seen.has(q.id)) return
        seen.add(q.id)
        usedCats.add(p.category)
        out.push({ ...q, category: p.category })
        if (ANIMATION_CATEGORIES.has(p.category)) animationCount++
      }

      // Hard slots first, one per category, from categories that have hard
      // questions left — otherwise they'd mostly land on categories without
      // any and quietly become normal questions.
      for (const p of pools) {
        if (out.length >= Math.min(nHard, count)) break
        if (p.hard.length === 0 || animBlocked(p)) continue
        take(p, p.hard.shift())
      }

      // The rest round-robin: every unused category once before any repeats.
      for (let round = 0; out.length < count; round++) {
        let added = 0
        for (const p of pools) {
          if (out.length >= count) break
          if (round === 0 && usedCats.has(p.category)) continue
          if (animBlocked(p)) continue
          const before = out.length
          take(p, p.normal.shift() ?? p.hard.shift())
          if (out.length > before) added++
        }
        if (added === 0) break
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

export function loadWordleBank({ path = 'data/wordle-words.json', data = null } = {}) {
  const parsed = data ?? JSON.parse(readFileSync(path, 'utf8'))
  const words = parsed.words ?? [] // [{ word, tier }]

  const byTier = new Map()
  for (const w of words) {
    if (!byTier.has(w.tier)) byTier.set(w.tier, [])
    byTier.get(w.tier).push(w.word)
  }

  return {
    size() {
      return words.length
    },

    // Both words in a match are drawn from the same difficulty tier — see
    // design spec for why. With `tier` given, restricts to that tier only
    // (an admin's explicit /wordle start easy|medium|hard); otherwise picks a
    // tier at random from those with at least two unused words left.
    pickPair({ tier = null, exclude = new Set(), random = Math.random } = {}) {
      const candidateTiers = tier !== null ? [[tier, byTier.get(tier) ?? []]] : [...byTier.entries()]
      const eligibleTiers = candidateTiers
        .map(([t, list]) => [t, list.filter((w) => !exclude.has(w))])
        .filter(([, list]) => list.length >= 2)

      if (eligibleTiers.length === 0) return null

      const [pickedTier, list] = shuffle(eligibleTiers, random)[0]
      const picked = shuffle(list, random)
      return { tier: pickedTier, word1: picked[0], word2: picked[1] }
    },
  }
}

export function loadCategoryBank({ path = 'data/categories.json', data = null } = {}) {
  const categories = data ?? JSON.parse(readFileSync(path, 'utf8'))

  return {
    size() {
      return categories.length
    },

    pickCategory({ exclude = new Set(), random = Math.random } = {}) {
      const available = categories.filter((c) => !exclude.has(c.id))
      if (available.length === 0) return null
      return shuffle(available, random)[0]
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

