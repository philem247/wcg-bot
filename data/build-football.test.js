import assert from 'node:assert/strict'
import { WEIGHTS, weightPool, mergeFootball } from './build-football.mjs'

const fixed = (v = 0) => () => v
const make = (tag, n) => Array.from({ length: n }, (_, i) => ({ id: `${tag}${i}`, q: `${tag}${i}?`, correct: 'a', wrong: ['b', 'c', 'd'], league: tag }))

const tests = [
  {
    name: 'WEIGHTS match the spec and sum to 1',
    fn: () => {
      assert.deepEqual(WEIGHTS, { pl: 0.50, fpl: 0.15, other: 0.25, ucl: 0.10 })
      assert.equal(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 1)
    },
  },
  {
    name: 'weightPool: composition follows the weights',
    fn: () => {
      const pool = weightPool(
        { pl: make('pl', 500), fpl: make('fpl', 500), other: make('other', 500), ucl: make('ucl', 500) },
        200, fixed(0),
      )
      assert.equal(pool.length, 200)
      const count = (t) => pool.filter((q) => q.league === t).length
      assert.equal(count('pl'), 100)
      assert.equal(count('fpl'), 30)
      assert.equal(count('other'), 50)
      assert.equal(count('ucl'), 20)
    },
  },
  {
    name: 'weightPool: a short tag does not block the others, total just shrinks',
    fn: () => {
      const pool = weightPool(
        { pl: make('pl', 5), fpl: make('fpl', 500), other: make('other', 500), ucl: make('ucl', 500) },
        200, fixed(0),
      )
      assert.equal(pool.filter((q) => q.league === 'pl').length, 5, 'takes all it has')
      assert.equal(pool.filter((q) => q.league === 'fpl').length, 30, 'others keep their share')
    },
  },
  {
    name: 'weightPool: duplicate ids are dropped',
    fn: () => {
      const dupes = [...make('pl', 3), ...make('pl', 3)]
      const pool = weightPool({ pl: dupes, fpl: [], other: [], ucl: [] }, 100, fixed(0))
      assert.equal(new Set(pool.map((q) => q.id)).size, pool.length)
      assert.equal(pool.length, 3)
    },
  },
  {
    name: 'mergeFootball: replaces football and leaves every other category untouched',
    fn: () => {
      const bank = {
        generated: 'old', attribution: 'ATTR',
        categories: { general: [{ id: 'g1' }], football: [{ id: 'stale' }] },
      }
      const out = mergeFootball(bank, make('pl', 2))
      assert.equal(out.categories.football.length, 2)
      assert.ok(!out.categories.football.some((q) => q.id === 'stale'), 'stale football questions are replaced')
      assert.deepEqual(out.categories.general, [{ id: 'g1' }], 'other categories untouched')
      assert.equal(out.attribution, 'ATTR')
    },
  },
  {
    name: 'mergeFootball: does not mutate the bank it was given',
    fn: () => {
      const bank = { categories: { general: [{ id: 'g1' }], football: [] } }
      const before = JSON.stringify(bank)
      mergeFootball(bank, make('pl', 2))
      assert.equal(JSON.stringify(bank), before)
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
    console.log(`✗ ${t.name}: ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
