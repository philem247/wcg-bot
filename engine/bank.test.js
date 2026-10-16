import assert from 'node:assert/strict'
import { loadBank, shuffle, CATEGORIES, loadCategoryBank } from './bank.js'

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
    name: 'mixed: hard slots come from categories that have hard questions; one question per category; templates spread',
    fn: () => {
      const categories = {}
      for (const c of CATEGORIES.slice(0, 12)) {
        categories[c] = [
          // one dominant template (30) and three small ones (2 each)
          ...Array.from({ length: 30 }, (_, i) => ({ id: `${c}-big${i}`, q: `${c} big ${i}?`, correct: 'a', wrong: ['b', 'c', 'd'], template: 'big' })),
          ...['s1', 's2', 's3'].flatMap((t) => [0, 1].map((i) => ({ id: `${c}-${t}-${i}`, q: `${c} ${t} ${i}?`, correct: 'a', wrong: ['b', 'c', 'd'], template: t }))),
        ]
      }
      // Only two categories have hard questions.
      for (const c of CATEGORIES.slice(0, 2)) categories[c].push(...[0, 1, 2].map((i) => ({ id: `${c}-h${i}`, q: `${c} hard ${i}?`, correct: 'a', wrong: ['b', 'c', 'd'], template: 'hard', hard: true })))
      const bank = loadBank({ data: { categories } })
      let big = 0
      let total = 0
      for (let g = 0; g < 300; g++) {
        const picked = bank.pick({ category: 'mixed', count: 10, random: Math.random })
        assert.equal(picked.length, 10)
        assert.equal(new Set(picked.map((q) => q.category)).size, 10, 'one question per category')
        assert.equal(picked.filter((q) => q.hard).length, 2, 'both categories with hard questions supply one')
        for (const q of picked) { total++; if (q.template === 'big') big++ }
      }
      // Template-first: the big template is 1 of 4 templates, not 30 of 36 questions.
      assert.ok(big / total < 0.45, `dominant template share ${(big / total).toFixed(2)}`)
    },
  },
  {
    name: 'pick: questions flagged hard fill 40% of a single-category game, the rest come from the normal pool',
    fn: () => {
      const qs = [
        ...Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, q: `N${i}?`, correct: 'a', wrong: ['b', 'c', 'd'], template: `t${i % 5}` })),
        ...Array.from({ length: 30 }, (_, i) => ({ id: `h${i}`, q: `H${i}?`, correct: 'a', wrong: ['b', 'c', 'd'], template: `hard-${i % 3}`, hard: true })),
      ]
      const bank = loadBank({ data: { categories: { football: qs } } })
      const picked = bank.pick({ category: 'football', count: 10, random: Math.random })
      assert.equal(picked.length, 10)
      assert.equal(picked.filter((q) => q.hard).length, 4)
      // Once the normal pool is used up, the hard tier tops the game up to full length.
      const exclude = new Set(qs.filter((q) => !q.hard).slice(0, 28).map((q) => q.id))
      const late = bank.pick({ category: 'football', count: 10, exclude, random: Math.random })
      assert.equal(late.length, 10)
    },
  },
  {
    name: 'CATEGORIES lists all thirty, with football and fpl included',
    fn: () => {
      assert.equal(CATEGORIES.length, 30)
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
  {
    name: 'loadCategoryBank: size() reports the category count',
    fn: () => {
      const bank = loadCategoryBank({ data: [
        { id: 'cat-a', category: 'Primary colors', items: ['Red', 'Blue', 'Yellow'] },
        { id: 'cat-b', category: 'Football clubs in Germany', items: ['Bayern Munich', 'Borussia Dortmund'] },
      ] })
      assert.equal(bank.size(), 2)
    },
  },
  {
    name: 'loadCategoryBank: pickCategory excludes ids already used, returns null once exhausted',
    fn: () => {
      const bank = loadCategoryBank({ data: [
        { id: 'cat-a', category: 'Primary colors', items: ['Red', 'Blue', 'Yellow'] },
        { id: 'cat-b', category: 'Football clubs in Germany', items: ['Bayern Munich', 'Borussia Dortmund'] },
      ] })
      const picked = bank.pickCategory({ exclude: new Set(['cat-a']), random: () => 0 })
      assert.equal(picked.id, 'cat-b')
      assert.equal(bank.pickCategory({ exclude: new Set(['cat-a', 'cat-b']), random: () => 0 }), null)
    },
  },
  {
    name: 'pick: balances across templates round-robin so single template does not dominate',
    fn: () => {
      const templateFixture = {
        attribution: 'test',
        categories: {
          football: [
            { id: 'w1', q: 'w1', correct: 'a', wrong: ['b', 'c', 'd'], template: 'winner' },
            { id: 'w2', q: 'w2', correct: 'a', wrong: ['b', 'c', 'd'], template: 'winner' },
            { id: 'w3', q: 'w3', correct: 'a', wrong: ['b', 'c', 'd'], template: 'winner' },
            { id: 'w4', q: 'w4', correct: 'a', wrong: ['b', 'c', 'd'], template: 'winner' },
            { id: 'c1', q: 'c1', correct: 'a', wrong: ['b', 'c', 'd'], template: 'commentary' },
            { id: 'a1', q: 'a1', correct: 'a', wrong: ['b', 'c', 'd'], template: 'assist' },
          ],
        },
      }
      const bank = loadBank({ data: templateFixture })
      const picked = bank.pick({ category: 'football', count: 3, random: () => 0.1 })
      assert.equal(picked.length, 3)
      const templates = new Set(picked.map((q) => q.template))
      assert.equal(templates.size, 3, 'Must draw 1 from each available template before repeating any template')
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
