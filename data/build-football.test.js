import assert from 'node:assert/strict'
import { WEIGHTS, MAX_TEMPLATE_SHARE, MAX_PER_ANSWER, weightPool, enforceTemplateShare, mergeFootball, tryQuery } from './build-football.mjs'
import { playerNationalities } from './football/queries.mjs'

const fixed = (v = 0) => () => v
// correct/template are unique per item so the new diversity caps (below) never
// fire by accident in tests that aren't exercising them.
const make = (tag, n) => Array.from({ length: n }, (_, i) => ({
  id: `${tag}${i}`, q: `${tag}${i}?`, correct: `${tag}-correct-${i}`, wrong: ['b', 'c', 'd'], league: tag, template: `${tag}-template-${i}`,
}))

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
    name: 'weightPool: a short tag scales the others down so the ratio holds',
    fn: () => {
      const pool = weightPool(
        { pl: make('pl', 100), fpl: make('fpl', 500), other: make('other', 500), ucl: make('ucl', 500) },
        1000, fixed(0),
      )
      const count = (t) => pool.filter((q) => q.league === t).length
      assert.equal(count('pl'), 100, 'takes all it has')
      assert.equal(count('other'), 50, 'other is scaled down to match pl:other = 50:25 = 2:1')
      assert.equal(count('pl') / count('other'), 2, 'pl stays roughly double other, not other-dominant')
    },
  },
  {
    name: 'weightPool: a tag with zero questions does not collapse the pool',
    fn: () => {
      const pool = weightPool(
        { pl: [], fpl: make('fpl', 500), other: make('other', 500), ucl: make('ucl', 500) },
        1000, fixed(0),
      )
      const count = (t) => pool.filter((q) => q.league === t).length
      assert.ok(pool.length > 0, 'empty pl does not zero out the whole pool')
      assert.equal(count('pl'), 0)
      assert.equal(count('fpl') / count('other'), WEIGHTS.fpl / WEIGHTS.other, 'remaining tags keep their relative proportions')
      assert.equal(count('ucl') / count('other'), WEIGHTS.ucl / WEIGHTS.other, 'remaining tags keep their relative proportions')
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
    name: 'weightPool: no single template exceeds MAX_TEMPLATE_SHARE of the pool',
    fn: () => {
      const nationality = Array.from({ length: 2000 }, (_, i) => ({
        id: `n${i}`, q: `n${i}?`, correct: `nat${i}`, wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality',
      }))
      const others = Array.from({ length: 20 }, (_, i) => ({
        id: `o${i}`, q: `o${i}?`, correct: `ans${i}`, wrong: ['b', 'c', 'd'], league: 'pl', template: `other${i}`,
      }))
      const total = 1000
      const pool = weightPool({ pl: [...nationality, ...others], fpl: [], other: [], ucl: [] }, total, fixed(0))
      const natCount = pool.filter((q) => q.template === 'nationality').length
      assert.equal(natCount, Math.round(total * MAX_TEMPLATE_SHARE), 'nationality is capped at its template share')
    },
  },
  {
    name: 'weightPool: no template+answer pair repeats more than MAX_PER_ANSWER times',
    fn: () => {
      const qs = Array.from({ length: 100 }, (_, i) => ({
        id: `u${i}`, q: `u${i}?`, correct: 'United Kingdom', wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality',
      }))
      const pool = weightPool({ pl: qs, fpl: [], other: [], ucl: [] }, 1000, fixed(0))
      assert.equal(pool.length, MAX_PER_ANSWER)
    },
  },
  {
    name: 'weightPool: the per-template+answer cap is case-insensitive on the answer',
    fn: () => {
      const qs = [
        ...Array.from({ length: 25 }, (_, i) => ({ id: `a${i}`, q: `a${i}?`, correct: 'United Kingdom', wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality' })),
        ...Array.from({ length: 25 }, (_, i) => ({ id: `b${i}`, q: `b${i}?`, correct: 'united kingdom', wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality' })),
      ]
      const pool = weightPool({ pl: qs, fpl: [], other: [], ucl: [] }, 1000, fixed(0))
      assert.equal(pool.length, MAX_PER_ANSWER, '"United Kingdom" and "united kingdom" under the same template share one cap')
    },
  },
  {
    name: 'weightPool: the same answer is admitted under two different templates past the old per-answer limit',
    fn: () => {
      const perTemplate = MAX_PER_ANSWER - 10 // each template stays under the cap alone...
      const qs = [
        ...Array.from({ length: perTemplate }, (_, i) => ({ id: `x${i}`, q: `x${i}?`, correct: 'France', wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality' })),
        ...Array.from({ length: perTemplate }, (_, i) => ({ id: `y${i}`, q: `y${i}?`, correct: 'France', wrong: ['b', 'c', 'd'], league: 'pl', template: 'not-club' })),
      ]
      const pool = weightPool({ pl: qs, fpl: [], other: [], ucl: [] }, 1000, fixed(0))
      // ...but the combined total exceeds MAX_PER_ANSWER, which a bare-answer key
      // would have trimmed. Keying on template+answer must admit the full 2*perTemplate.
      assert.ok(perTemplate * 2 > MAX_PER_ANSWER, 'test setup must actually exceed the old bare-answer cap')
      assert.equal(pool.length, perTemplate * 2, 'both templates admit their full share of the same answer')
    },
  },
  {
    name: 'weightPool: id dedupe and league weighting still hold',
    fn: () => {
      const dupes = [...make('pl', 3), ...make('pl', 3)]
      const pool = weightPool(
        { pl: dupes, fpl: make('fpl', 500), other: make('other', 500), ucl: make('ucl', 500) },
        200, fixed(0),
      )
      assert.equal(new Set(pool.map((q) => q.id)).size, pool.length, 'ids stay unique')
      assert.equal(pool.filter((q) => q.league === 'pl').length, 3, 'pl only has 3 distinct questions available')
      assert.equal(pool.filter((q) => q.league === 'fpl').length, 1, 'fpl is scaled down to match pl:fpl ratio (3/100 of its 30-question share)')
    },
  },
  {
    name: 'enforceTemplateShare: no template exceeds the share of the FINAL pool size',
    fn: () => {
      // Regression for the bug where the cap was computed against a fixed
      // target (TARGET_TOTAL) instead of the pool actually returned — that let
      // nationality hit 51% of a 735-question pool while "passing" a cap sized
      // for 1500. Feed 800 nationality + 200 mixed, well past what a
      // 25%-of-target cap would have blocked.
      const nationality = Array.from({ length: 800 }, (_, i) => ({
        id: `n${i}`, q: `n${i}?`, correct: `nat${i}`, wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality',
      }))
      const mixed = Array.from({ length: 200 }, (_, i) => ({
        id: `m${i}`, q: `m${i}?`, correct: `ans${i}`, wrong: ['b', 'c', 'd'], league: 'pl', template: `other${i}`,
      }))
      const out = enforceTemplateShare([...nationality, ...mixed], fixed(0))
      const natCount = out.filter((q) => q.template === 'nationality').length
      assert.ok(natCount / out.length <= MAX_TEMPLATE_SHARE + 1e-9, `nationality share ${natCount}/${out.length} exceeds cap`)
    },
  },
  {
    name: 'enforceTemplateShare: leaves an already-balanced pool untouched',
    fn: () => {
      const qs = [
        ...Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, q: `a${i}?`, correct: `ca${i}`, wrong: ['b', 'c', 'd'], league: 'pl', template: 'a' })),
        ...Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, q: `b${i}?`, correct: `cb${i}`, wrong: ['b', 'c', 'd'], league: 'pl', template: 'b' })),
        ...Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, q: `c${i}?`, correct: `cc${i}`, wrong: ['b', 'c', 'd'], league: 'pl', template: 'c' })),
        ...Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, q: `d${i}?`, correct: `cd${i}`, wrong: ['b', 'c', 'd'], league: 'pl', template: 'd' })),
      ]
      const out = enforceTemplateShare(qs, fixed(0))
      assert.equal(out.length, qs.length, 'nothing over the cap — nothing trimmed')
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
  {
    name: 'playerNationalities: a dual-national (two distinct P27 rows) is dropped, not reduced to one',
    fn: async () => {
      const bindings = [
        { player: { value: 'Q1' }, playerLabel: { value: 'Dual Player' }, natLabel: { value: 'France' } },
        { player: { value: 'Q1' }, playerLabel: { value: 'Dual Player' }, natLabel: { value: 'Algeria' } },
        { player: { value: 'Q2' }, playerLabel: { value: 'Single Player' }, natLabel: { value: 'England' } },
      ]
      const fetchImpl = async () => ({
        status: 200,
        ok: true,
        json: async () => ({ results: { bindings } }),
      })
      const rows = await playerNationalities(['Q1', 'Q2'], { fetchImpl, delayMs: 0 })
      assert.equal(rows.length, 1, 'the dual-national must not appear at all')
      assert.equal(rows[0].player, 'Single Player')
      assert.equal(rows[0].nat, 'England')
    },
  },
  {
    name: 'playerNationalities: empty input returns [] without firing a query',
    fn: async () => {
      const fetchImpl = async () => { throw new Error('must not be called for empty input') }
      const rows = await playerNationalities([], { fetchImpl })
      assert.deepEqual(rows, [])
    },
  },
  {
    name: 'tryQuery-style isolation: a failing query yields no questions but does not discard the others',
    fn: async () => {
      const failures = []
      const [a, b, c] = await Promise.all([
        tryQuery(failures, 'nationality', async () => { throw new Error('WDQS 504') }),
        tryQuery(failures, 'winners', async () => make('pl', 3)),
        tryQuery(failures, 'venues', async () => make('pl', 2)),
      ])
      assert.deepEqual(a, [], 'the throwing query yields no questions')
      assert.equal(b.length, 3, 'a succeeding query is untouched by a sibling failure')
      assert.equal(c.length, 2, 'a succeeding query is untouched by a sibling failure')
      assert.equal(failures.length, 1)
      assert.match(failures[0], /nationality.*WDQS 504/)
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    await t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}: ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
