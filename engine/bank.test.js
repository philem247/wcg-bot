import assert from 'node:assert/strict'
import { loadBank, shuffle, CATEGORIES } from './bank.js'

// Deterministic stand-in for Math.random: cycles a fixed sequence.
function seeded(seq = [0.1, 0.7, 0.3, 0.9, 0.5]) {
  let i = 0
  return () => seq[i++ % seq.length]
}

const q = (id, n) => ({ id, q: `q${n}`, correct: 'c', wrong: ['w1', 'w2', 'w3'] })

const fixture = {
  attribution: 'test',
  categories: {
    general: [q('g1', 1), q('g2', 2), q('g3', 3)],
    science: [q('s1', 4), q('s2', 5)],
    tech: [],
    movies: [q('m1', 6)],
    geography: [],
    history: [],
    football: [],
  },
}

const tests = [
  {
    name: 'CATEGORIES lists all twenty-seven, with football and fpl included',
    fn: () => {
      assert.equal(CATEGORIES.length, 27)
      assert.ok(CATEGORIES.includes('football'))
      assert.ok(CATEGORIES.includes('fpl'))
      assert.ok(!CATEGORIES.includes('mixed'), 'mixed is a mode, not a category')
    },
  },
  {
    name: 'shuffle: returns a permutation and does not mutate the input',
    fn: () => {
      const src = [1, 2, 3, 4, 5]
      const out = shuffle(src, seeded())
      assert.deepEqual(src, [1, 2, 3, 4, 5], 'input untouched')
      assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5], 'same members')
    },
  },
  {
    name: 'shuffle: identical seeds give identical output',
    fn: () => {
      assert.deepEqual(shuffle([1, 2, 3, 4, 5], seeded()), shuffle([1, 2, 3, 4, 5], seeded()))
    },
  },
  {
    name: 'categories(): only non-empty ones are playable',
    fn: () => {
      const bank = loadBank({ data: fixture })
      assert.deepEqual(bank.categories().sort(), ['general', 'movies', 'science'])
    },
  },
  {
    name: 'pick: named category returns only that category, no duplicates',
    fn: () => {
      const bank = loadBank({ data: fixture })
      const got = bank.pick({ category: 'general', count: 3, random: seeded() })
      assert.equal(got.length, 3)
      assert.deepEqual(got.map((x) => x.id).sort(), ['g1', 'g2', 'g3'])
    },
  },
  {
    name: 'pick: exclude keeps already-asked questions out',
    fn: () => {
      const bank = loadBank({ data: fixture })
      const got = bank.pick({ category: 'general', count: 3, exclude: new Set(['g1', 'g2']), random: seeded() })
      assert.deepEqual(got.map((x) => x.id), ['g3'])
    },
  },
  {
    name: 'pick: returns fewer than requested rather than repeating',
    fn: () => {
      const bank = loadBank({ data: fixture })
      const got = bank.pick({ category: 'science', count: 10, random: seeded() })
      assert.equal(got.length, 2)
      assert.equal(new Set(got.map((x) => x.id)).size, 2)
    },
  },
  {
    name: 'pick: mixed draws across categories, not proportional to size',
    fn: () => {
      // general has 3, science 2, movies 1. Proportional drawing would
      // give general half of everything; equal weighting must not.
      const bank = loadBank({ data: fixture })
      const got = bank.pick({ category: 'mixed', count: 3, random: seeded() })
      assert.equal(got.length, 3)
      const ids = got.map((x) => x.id)
      assert.equal(new Set(ids).size, 3, 'no duplicates')
      const prefixes = new Set(ids.map((i) => i[0]))
      assert.equal(prefixes.size, 3, 'one from each non-empty category before any repeats')
    },
  },
  {
    name: 'pick: every returned question is tagged with its own real source category, not the mode that served it',
    fn: () => {
      const bank = loadBank({ data: fixture })
      const direct = bank.pick({ category: 'general', count: 2, random: seeded() })
      assert.ok(direct.every((q) => q.category === 'general'))

      const mixed = bank.pick({ category: 'mixed', count: 3, random: seeded() })
      assert.equal(mixed.length, 3)
      for (const q of mixed) {
        // fixture ids are prefixed with their category's first letter (g/s/m)
        assert.equal(q.category[0], q.id[0], `q ${q.id} must be tagged 'mixed', not its real category (${q.category})`)
      }
    },
  },
  {
    name: 'pick: unknown category yields nothing',
    fn: () => {
      const bank = loadBank({ data: fixture })
      assert.deepEqual(bank.pick({ category: 'football', count: 5, random: seeded() }), [])
      assert.deepEqual(bank.pick({ category: 'nonsense', count: 5, random: seeded() }), [])
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}\n  ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
