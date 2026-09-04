import assert from 'node:assert/strict'
import { createCareerPathGame, ROUND_COUNT, REVEAL_SECONDS, GAP_SECONDS, POINTS_MAX } from './careerpath.js'

const REVEAL_MS = REVEAL_SECONDS * 1000
const GAP_MS = GAP_SECONDS * 1000

function makePool(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    aliases: [`P${i}`, `Nick${i}`],
    clubs: [`ClubA${i}`, `ClubB${i}`, `ClubC${i}`],
  }))
}

function startGame(n = 3, opts = {}) {
  const g = createCareerPathGame({ pool: makePool(n), now: 0, ...opts })
  const ev = g.tick(0)
  return { g, first: ev[0] }
}

const tests = [
  {
    name: 'first tick reveals round 1 first club',
    fn: () => {
      const { first } = startGame(3)
      assert.equal(first.type, 'careerpath_reveal')
      assert.equal(first.round, 1)
      assert.equal(first.totalRounds, 3)
      assert.deepEqual(first.clubs, ['ClubA0'])
      assert.equal(first.revealSeconds, REVEAL_SECONDS)
    },
  },
  {
    name: 'tick after revealSeconds reveals next club, clubs array grows',
    fn: () => {
      const { g } = startGame(3)
      const ev = g.tick(REVEAL_MS)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'careerpath_reveal')
      assert.deepEqual(ev[0].clubs, ['ClubA0', 'ClubB0'])
    },
  },
  {
    name: 'tick before deadline emits nothing',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.tick(REVEAL_MS - 1), [])
    },
  },
  {
    name: 'correct guess mid-reveal ends round immediately with full club list',
    fn: () => {
      const { g } = startGame(3)
      const ev = g.submit('alice', 'Player 0', 1000)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'careerpath_correct')
      assert.equal(ev[0].player, 'alice')
      assert.equal(ev[0].answer, 'Player 0')
      assert.deepEqual(ev[0].clubs, ['ClubA0', 'ClubB0', 'ClubC0'], 'full list even though only 1 club had been revealed')
      assert.equal(ev[0].round, 1)
      assert.equal(ev[0].totalRounds, 3)
      assert.equal(ev[0].points, POINTS_MAX, 'first reveal scores POINTS_MAX')
      assert.equal(g.state, 'playing', 'not over yet, in gap')
    },
  },
  {
    name: 'correct guess via alias also matches',
    fn: () => {
      const { g } = startGame(3)
      const ev = g.submit('bob', 'Nick0', 1000)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'careerpath_correct')
      assert.equal(ev[0].player, 'bob')
    },
  },
  {
    name: 'incorrect guess is ignored, round continues',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.submit('bob', 'Nobody', 1000), [])
      assert.equal(g.state, 'playing')
      // still revealing: next tick still advances reveal, not gap
      const ev = g.tick(REVEAL_MS)
      assert.equal(ev[0].type, 'careerpath_reveal')
    },
  },
  {
    name: 'after all clubs revealed and final deadline passes with no correct guess, timeout fires with full list',
    fn: () => {
      const { g } = startGame(3)
      g.tick(REVEAL_MS)      // reveal club 2
      g.tick(REVEAL_MS * 2)  // reveal club 3 (last one)
      const ev = g.tick(REVEAL_MS * 3) // deadline for last club passes
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'careerpath_timeout')
      assert.equal(ev[0].answer, 'Player 0')
      assert.deepEqual(ev[0].clubs, ['ClubA0', 'ClubB0', 'ClubC0'])
      assert.equal(ev[0].round, 1)
      assert.equal(ev[0].totalRounds, 3)
    },
  },
  {
    name: 'after round ends, game waits gapSeconds then advances to next round',
    fn: () => {
      const { g } = startGame(3)
      g.submit('alice', 'Player 0', 1000)
      assert.deepEqual(g.tick(1000 + GAP_MS - 1), [], 'gap not elapsed')
      const ev = g.tick(1000 + GAP_MS)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'careerpath_reveal')
      assert.equal(ev[0].round, 2)
      assert.deepEqual(ev[0].clubs, ['ClubA1'])
    },
  },
  {
    name: 'after last round, careerpath_over fires with standings sorted score desc then earliest scoredAt',
    fn: () => {
      const { g } = startGame(2)
      // Round 1: bob scores
      g.submit('bob', 'Player 0', 1000)
      let ev = g.tick(1000 + GAP_MS)
      assert.equal(ev[0].type, 'careerpath_reveal')
      assert.equal(ev[0].round, 2)
      // Round 2: alice scores
      ev = g.submit('alice', 'Player 1', 1000 + GAP_MS + 500)
      assert.equal(ev[0].type, 'careerpath_correct')
      ev = g.tick(1000 + GAP_MS + 500 + GAP_MS)
      assert.equal(ev[0].type, 'careerpath_over')
      assert.equal(g.state, 'over')
      assert.equal(ev[0].totalRounds, 2)
      assert.deepEqual(ev[0].standings, [
        { player: 'bob', score: POINTS_MAX },
        { player: 'alice', score: POINTS_MAX },
      ])
    },
  },
  {
    name: 'correct guess after 3 reveals scores POINTS_MAX - 2',
    fn: () => {
      const { g } = startGame(3)
      g.tick(REVEAL_MS)     // reveal club 2 (revealed.length = 2)
      g.tick(REVEAL_MS * 2) // reveal club 3 (revealed.length = 3)
      const ev = g.submit('alice', 'Player 0', REVEAL_MS * 2 + 100)
      assert.equal(ev[0].type, 'careerpath_correct')
      assert.equal(ev[0].points, POINTS_MAX - 2)
    },
  },
  {
    name: 'correct guess after POINTS_MAX or more reveals floors at 1',
    fn: () => {
      const pool = Array.from({ length: 1 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        aliases: [],
        clubs: Array.from({ length: POINTS_MAX + 3 }, (_, j) => `Club${j}`),
      }))
      const g = createCareerPathGame({ pool, now: 0 })
      g.tick(0)
      let at = 0
      for (let i = 1; i < POINTS_MAX + 2; i++) {
        at = REVEAL_MS * i
        g.tick(at) // reveals up through revealed.length = POINTS_MAX + 2
      }
      const ev = g.submit('alice', 'Player 0', at + 100)
      assert.equal(ev[0].type, 'careerpath_correct')
      assert.equal(ev[0].points, 1, 'floors at 1, never 0 or negative')
    },
  },
  {
    name: 'cumulative scoring across rounds with different points-per-round sums correctly',
    fn: () => {
      const { g } = startGame(2)
      // Round 1: alice scores on first reveal (points = POINTS_MAX)
      let ev = g.submit('alice', 'Player 0', 1000)
      assert.equal(ev[0].points, POINTS_MAX)
      g.tick(1000 + GAP_MS) // advance to round 2
      // Round 2: alice scores after 1 extra reveal (points = POINTS_MAX - 1)
      g.tick(1000 + GAP_MS + REVEAL_MS)
      ev = g.submit('alice', 'Player 1', 1000 + GAP_MS + REVEAL_MS + 100)
      assert.equal(ev[0].points, POINTS_MAX - 1)
      const over = g.tick(1000 + GAP_MS + REVEAL_MS + 100 + GAP_MS)
      assert.equal(over[0].type, 'careerpath_over')
      assert.deepEqual(over[0].standings, [
        { player: 'alice', score: POINTS_MAX + (POINTS_MAX - 1) },
      ])
    },
  },
  {
    name: 'submit() and tick() are no-ops after game is over',
    fn: () => {
      const { g } = startGame(1)
      g.tick(REVEAL_MS) // club 1 is the only club (need >=1); force timeout path
      // finish round via timeout since only 1 club in this pool by default (3 clubs actually)
      // simplify: just end() to reach over state
      g.end(500)
      assert.equal(g.state, 'over')
      assert.deepEqual(g.tick(99999), [])
      assert.deepEqual(g.submit('alice', 'Player 0', 99999), [])
    },
  },
  {
    name: 'end() before game-over emits careerpath_terminated; calling again is a no-op',
    fn: () => {
      const { g } = startGame(3)
      const ev = g.end(5000)
      assert.deepEqual(ev, [{ type: 'careerpath_terminated' }])
      assert.equal(g.state, 'over')
      assert.deepEqual(g.end(6000), [])
    },
  },
  {
    name: 'end() after natural game-over is a no-op',
    fn: () => {
      const { g } = startGame(1)
      g.submit('alice', 'Player 0', 1000)
      const over = g.tick(1000 + GAP_MS)
      assert.equal(over[0].type, 'careerpath_over')
      assert.equal(g.state, 'over')
      assert.deepEqual(g.end(9999), [])
    },
  },
  {
    name: 'join() is a no-op',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.join('alice', 0), [])
    },
  },
  {
    name: 'ROUND_COUNT is 8, REVEAL_SECONDS is 20, GAP_SECONDS is 10',
    fn: () => {
      assert.equal(ROUND_COUNT, 8)
      assert.equal(REVEAL_SECONDS, 20)
      assert.equal(GAP_SECONDS, 10)
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
