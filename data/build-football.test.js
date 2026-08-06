import assert from 'node:assert/strict'
import { MAX_PER_ANSWER, capAnswers, mergeFootball, tryQuery } from './build-football.mjs'
import { playerNationalities, cupWinners } from './football/queries.mjs'

const fixed = (v = 0) => () => v
// correct/template are unique per item so the new diversity caps (below) never
// fire by accident in tests that aren't exercising them.
const make = (tag, n) => Array.from({ length: n }, (_, i) => ({
  id: `${tag}${i}`, q: `${tag}${i}?`, correct: `${tag}-correct-${i}`, wrong: ['b', 'c', 'd'], league: tag, template: `${tag}-template-${i}`,
}))

const tests = [
  {
    name: 'capAnswers: duplicate ids are dropped',
    fn: () => {
      const dupes = [...make('pl', 3), ...make('pl', 3)]
      const pool = capAnswers(dupes, fixed(0))
      assert.equal(new Set(pool.map((q) => q.id)).size, pool.length)
      assert.equal(pool.length, 3)
    },
  },
  {
    name: 'capAnswers: every valid question ships — no target, no ratio to trim toward',
    fn: () => {
      const qs = [...make('pl', 50), ...make('fpl', 50), ...make('other', 50), ...make('ucl', 50)]
      const pool = capAnswers(qs, fixed(0))
      assert.equal(pool.length, 200)
    },
  },
  {
    name: 'capAnswers: no template+answer pair repeats more than MAX_PER_ANSWER times',
    fn: () => {
      const qs = Array.from({ length: MAX_PER_ANSWER + 50 }, (_, i) => ({
        id: `u${i}`, q: `u${i}?`, correct: 'United Kingdom', wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality',
      }))
      const pool = capAnswers(qs, fixed(0))
      assert.equal(pool.length, MAX_PER_ANSWER)
    },
  },
  {
    name: 'capAnswers: the per-template+answer cap is case-insensitive on the answer',
    fn: () => {
      const half = MAX_PER_ANSWER
      const qs = [
        ...Array.from({ length: half }, (_, i) => ({ id: `a${i}`, q: `a${i}?`, correct: 'United Kingdom', wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality' })),
        ...Array.from({ length: half }, (_, i) => ({ id: `b${i}`, q: `b${i}?`, correct: 'united kingdom', wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality' })),
      ]
      const pool = capAnswers(qs, fixed(0))
      assert.equal(pool.length, MAX_PER_ANSWER, '"United Kingdom" and "united kingdom" under the same template share one cap')
    },
  },
  {
    name: 'capAnswers: the same answer is admitted under two different templates past the old per-answer limit',
    fn: () => {
      const perTemplate = MAX_PER_ANSWER - 10 // each template stays under the cap alone...
      const qs = [
        ...Array.from({ length: perTemplate }, (_, i) => ({ id: `x${i}`, q: `x${i}?`, correct: 'France', wrong: ['b', 'c', 'd'], league: 'pl', template: 'nationality' })),
        ...Array.from({ length: perTemplate }, (_, i) => ({ id: `y${i}`, q: `y${i}?`, correct: 'France', wrong: ['b', 'c', 'd'], league: 'pl', template: 'not-club' })),
      ]
      const pool = capAnswers(qs, fixed(0))
      // ...but the combined total exceeds MAX_PER_ANSWER, which a bare-answer key
      // would have trimmed. Keying on template+answer must admit the full 2*perTemplate.
      assert.ok(perTemplate * 2 > MAX_PER_ANSWER, 'test setup must actually exceed the old bare-answer cap')
      assert.equal(pool.length, perTemplate * 2, 'both templates admit their full share of the same answer')
    },
  },
  {
    name: 'cupWinners: an edition with two distinct winners is dropped, not reduced to one',
    fn: async () => {
      const bindings = [
        { edLabel: { value: 'UEFA Euro 2004' }, winnerLabel: { value: 'Greece' } },
        { edLabel: { value: 'UEFA Euro 2004' }, winnerLabel: { value: 'Portugal' } },
        { edLabel: { value: 'UEFA Euro 2008' }, winnerLabel: { value: 'Spain' } },
      ]
      const fetchImpl = async () => ({
        status: 200,
        ok: true,
        json: async () => ({ results: { bindings } }),
      })
      const rows = await cupWinners('Q260858', { fetchImpl, delayMs: 0 })
      assert.equal(rows.length, 1, 'the two-winner edition must not appear at all')
      assert.equal(rows[0].season, 'UEFA Euro 2008')
      assert.equal(rows[0].winner, 'Spain')
    },
  },
  {
    name: 'cupWinners: an edition dated only by its label year is kept when modern, dropped when not',
    fn: async () => {
      const bindings = [
        { edLabel: { value: '2006 FIFA World Cup' }, winnerLabel: { value: 'Italy' } }, // no P580, label year 2006
        { edLabel: { value: '1956–57 DFB-Pokal' }, winnerLabel: { value: 'Bayern Munich' } }, // no P580, label year 1956
      ]
      const fetchImpl = async () => ({ status: 200, ok: true, json: async () => ({ results: { bindings } }) })
      const rows = await cupWinners('Q19317', { fetchImpl, delayMs: 0 })
      assert.deepEqual(rows.map((r) => r.season), ['2006 FIFA World Cup'], 'only the modern, label-dated edition survives')
    },
  },
  {
    name: 'cupWinners: P580 wins over the label year when both are present',
    fn: async () => {
      const bindings = [
        // Label reads 1999 but the P580 statement (the more precise source) says 2001 — modern.
        { edLabel: { value: '1999 Some Cup' }, winnerLabel: { value: 'Team A' }, start: { value: '2001-06-01T00:00:00Z' } },
      ]
      const fetchImpl = async () => ({ status: 200, ok: true, json: async () => ({ results: { bindings } }) })
      const rows = await cupWinners('Q1', { fetchImpl, delayMs: 0 })
      assert.equal(rows.length, 1, 'P580 (2001) must be used over the label year (1999)')
    },
  },
  {
    name: 'cupWinners: an edition with no P580 and no year in its label is dropped — undated cannot be shown modern',
    fn: async () => {
      const bindings = [
        { edLabel: { value: 'Cup Final Replay' }, winnerLabel: { value: 'Team A' } },
      ]
      const fetchImpl = async () => ({ status: 200, ok: true, json: async () => ({ results: { bindings } }) })
      const rows = await cupWinners('Q1', { fetchImpl, delayMs: 0 })
      assert.deepEqual(rows, [])
    },
  },
  {
    name: 'cupWinners: several P580 date rows for one edition still yield exactly one question',
    fn: async () => {
      const bindings = [
        { edLabel: { value: '2015 Big Cup' }, winnerLabel: { value: 'Team B' }, start: { value: '2015-05-30T00:00:00Z' } },
        { edLabel: { value: '2015 Big Cup' }, winnerLabel: { value: 'Team B' }, start: { value: '2015-06-15T00:00:00Z' } },
      ]
      const fetchImpl = async () => ({ status: 200, ok: true, json: async () => ({ results: { bindings } }) })
      const rows = await cupWinners('Q1', { fetchImpl, delayMs: 0 })
      assert.equal(rows.length, 1, 'one winner + several date values must still collapse to one question')
      assert.equal(rows[0].winner, 'Team B')
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
