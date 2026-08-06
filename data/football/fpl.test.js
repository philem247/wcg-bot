import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { seasonLabel, seasons, fplQuestions, POSITIONS, MIN_OWNERSHIP_PCT } from './fpl.mjs'

const fixture = JSON.parse(readFileSync(new URL('./fpl.fixture.json', import.meta.url), 'utf8'))
const fixed = (v = 0) => () => v

const tests = [
  {
    name: 'seasonLabel: derives a season string, never a gameweek',
    fn: () => {
      const s = seasonLabel(fixture)
      assert.match(s, /^\d{4}\/\d{2}$/, 'looks like 2025/26')
    },
  },
  {
    name: 'every FPL question names a season and never says "GW"',
    fn: () => {
      const qs = fplQuestions(fixture, { random: fixed(0) })
      assert.ok(qs.length > 0, 'fixture must produce questions')
      const s = seasons(fixture)
      for (const q of qs) {
        assert.ok(q.q.includes(s.squad) || q.q.includes(s.stats), `"${q.q}" must carry a season stamp`)
        assert.ok(!/\bGW\d/i.test(q.q), 'gameweek stamps rot at every roll — forbidden')
      }
    },
  },
  {
    name: 'every FPL question is tagged league fpl with four distinct options',
    fn: () => {
      for (const q of fplQuestions(fixture, { random: fixed(0) })) {
        assert.equal(q.league, 'fpl')
        assert.equal(q.wrong.length, 3)
        assert.equal(new Set([q.correct, ...q.wrong].map((s) => s.toLowerCase())).size, 4)
      }
    },
  },
  {
    name: 'position questions use the FPL classification, not a guess',
    fn: () => {
      assert.deepEqual(POSITIONS, { 1: 'goalkeeper', 2: 'defender', 3: 'midfielder', 4: 'forward' })
    },
  },
  {
    name: 'players with zero points produce no top-scorer question',
    fn: () => {
      // After 21 Aug the totals reset. A "most points" question built on all-zero
      // data would have four equally correct answers.
      const zeroed = { ...fixture, elements: fixture.elements.map((p) => ({ ...p, total_points: 0 })) }
      const qs = fplQuestions(zeroed, { random: fixed(0) })
      assert.ok(!qs.some((q) => /most FPL points/i.test(q.q)), 'no points data means no points question')
    },
  },
  {
    name: 'ids are stable across runs',
    fn: () => {
      const a = fplQuestions(fixture, { random: fixed(0) }).map((q) => q.id)
      const b = fplQuestions(fixture, { random: fixed(0) }).map((q) => q.id)
      assert.deepEqual(a, b)
    },
  },
  {
    name: 'seasons: before any gameweek finishes, stats belong to the previous season',
    fn: () => {
      const bootstrap = { events: [{ deadline_time: '2026-08-21T17:30:00Z', finished: false }], elements: [] }
      const s = seasons(bootstrap)
      assert.equal(s.squad, '2026/27')
      assert.equal(s.stats, '2025/26')
    },
  },
  {
    name: 'seasons: once a gameweek has finished, stats belong to the current season',
    fn: () => {
      // Regression test: the old heuristic inferred "previous season" from
      // total_points > 0, which stays true forever once the new season starts
      // scoring — it would never flip stats back to match squad.
      const bootstrap = { events: [{ deadline_time: '2026-08-21T17:30:00Z', finished: true }], elements: [] }
      const s = seasons(bootstrap)
      assert.equal(s.stats, s.squad)
    },
  },
  {
    name: 'seasons: returns null when the payload carries no dated fixtures',
    fn: () => {
      const bootstrap = { events: [], elements: [] }
      assert.equal(seasons(bootstrap), null)
      assert.deepEqual(fplQuestions(bootstrap, { random: fixed(0) }), [])
    },
  },
  {
    name: 'two players sharing a web_name produce distinct question ids',
    fn: () => {
      const bootstrap = {
        events: fixture.events,
        teams: fixture.teams,
        elements: [
          { web_name: 'Sanchez', first_name: 'Robert', second_name: 'Sánchez', team: 1, element_type: 1, selected_by_percent: '5.0', total_points: 10 },
          { web_name: 'Sanchez', first_name: 'Davinson', second_name: 'Sánchez', team: 2, element_type: 2, selected_by_percent: '5.0', total_points: 5 },
        ],
      }
      const ids = fplQuestions(bootstrap, { random: fixed(0) }).map((q) => q.id)
      assert.equal(new Set(ids).size, ids.length, 'ids must not collide across same-named players')
    },
  },
  {
    name: 'players below MIN_OWNERSHIP_PCT are excluded',
    fn: () => {
      const bootstrap = {
        events: fixture.events,
        teams: fixture.teams,
        elements: [
          { web_name: 'Ghost', first_name: 'No', second_name: 'One', team: 1, element_type: 1, selected_by_percent: String(MIN_OWNERSHIP_PCT - 0.9), total_points: 0 },
        ],
      }
      const qs = fplQuestions(bootstrap, { random: fixed(0) })
      assert.equal(qs.length, 0, 'below-threshold player should not appear in any question')
    },
  },
  {
    name: 'squad facts carry the squad season, stat facts carry the stats season',
    fn: () => {
      const s = seasons(fixture) // real fixture is pre-season: squad !== stats
      assert.notEqual(s.squad, s.stats, 'fixture must be pre-season for this test to mean anything')
      const bootstrap = {
        events: fixture.events,
        teams: fixture.teams,
        elements: [
          { web_name: 'A', first_name: 'Al', second_name: 'Pha', team: 1, element_type: 1, selected_by_percent: '5.0', total_points: 100 },
          { web_name: 'B', first_name: 'Be', second_name: 'Ta', team: 2, element_type: 2, selected_by_percent: '5.0', total_points: 50 },
          { web_name: 'C', first_name: 'Ga', second_name: 'Mma', team: 3, element_type: 3, selected_by_percent: '5.0', total_points: 30 },
          { web_name: 'D', first_name: 'De', second_name: 'Lta', team: 4, element_type: 4, selected_by_percent: '5.0', total_points: 10 },
        ],
      }
      const qs = fplQuestions(bootstrap, { random: fixed(0) })
      const positionQ = qs.find((q) => /which position did FPL classify/i.test(q.q))
      const topScorerQ = qs.find((q) => /most FPL points/i.test(q.q))
      assert.ok(positionQ, 'fixture must produce a position question')
      assert.ok(topScorerQ, 'fixture must produce a top-scorer question')
      assert.ok(positionQ.q.includes(s.squad) && !positionQ.q.includes(s.stats), 'squad fact must carry squad season only')
      assert.ok(topScorerQ.q.includes(s.stats) && !topScorerQ.q.includes(s.squad), 'stat fact must carry stats season only')
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
