import assert from 'node:assert/strict'
import { createTournament, REGISTRATION_MS } from './tournament.js'
import { QUESTION_COUNT, CLOCK_SECONDS, GAP_SECONDS } from './trivia.js'
import { openDb } from '../store/db.js'

// transport/router.js -> config.js throws if PHONE_NUMBER is missing; set env
// before the dynamic import below (a static import would be hoisted ahead of
// this and blow up).
process.env.PHONE_NUMBER = process.env.PHONE_NUMBER ?? '1234567890'
const { sendEvents } = await import('../transport/router.js')

const fixed = (v = 0) => () => v
const GAP_MS = GAP_SECONDS * 1000
const CLOCK_MS = CLOCK_SECONDS * 1000

// Never exhausts (fresh ids every call) — repeat-avoidance across a tournament
// is verified separately via the `exclude` set it's given.
function makeBank() {
  let counter = 0
  return {
    categories: () => ['general'],
    pick: ({ count, exclude }) => {
      const out = []
      while (out.length < count) {
        const id = `q${counter++}`
        if (exclude?.has(id)) continue
        out.push({ id, q: `${id}?`, correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' })
      }
      return out
    },
  }
}

function correctLetter(q) {
  return q.options.find((o) => o.text === 'right').letter
}

// Drives a full 10-question match where `winner` answers correctly every
// question (loser never answers) -> ends 10-0, no sudden death.
function winOneSidedMatch(t, startEvents, winner, now) {
  let q = startEvents.find((e) => e.type === 'trivia_question')
  let result
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const ans = t.submit(winner, correctLetter(q), now + 1000)
    assert.equal(ans[0]?.type, 'trivia_answer')
    now += 1000 + GAP_MS
    const tickEv = t.tick(now)
    if (i < QUESTION_COUNT - 1) {
      q = tickEv.find((e) => e.type === 'trivia_question')
    } else {
      result = tickEv
    }
  }
  return { result, now }
}

// Opens registration, joins n players, closes registration.
function registerPlayers(t, n) {
  t.tick(0)
  const players = Array.from({ length: n }, (_, i) => `p${i}`)
  for (const p of players) t.join(p, 0)
  const closeEv = t.tick(REGISTRATION_MS)
  return { players, closeEv }
}

// Plays a whole bracket out to a champion: in every match, fixture.p1 always
// wins by answering all 10 questions correctly.
function playOutTournament(n, random = fixed(0)) {
  const t = createTournament({ bank: makeBank(), now: 0, random })
  registerPlayers(t, n)
  let now = REGISTRATION_MS
  while (t.state !== 'over') {
    const ev = t.next(now)
    const startEv = ev.find((e) => e.type === 'tournament_match_start')
    assert.ok(startEv, 'expected a match to start')
    const { now: nextNow } = winOneSidedMatch(t, ev, startEv.p1, now)
    now = nextNow
  }
  return t
}

const tests = [
  {
    name: 'bracket seeding is deterministic for a fixed random',
    fn: () => {
      function build() {
        const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0.37) })
        const { closeEv } = registerPlayers(t, 5)
        return closeEv.find((e) => e.type === 'tournament_bracket_ready')
      }
      const a = build()
      const b = build()
      assert.deepEqual(a.byes, b.byes)
      assert.deepEqual(a.matches, b.matches)
    },
  },
  {
    name: 'byes: 5, 6 and 7 players each produce a valid bracket reaching exactly one champion',
    fn: () => {
      for (const n of [5, 6, 7]) {
        const t = playOutTournament(n)
        assert.equal(t.state, 'over', `n=${n} should finish`)
        assert.ok(t.status().champion, `n=${n} should produce a champion`)
      }
    },
  },
  {
    name: 'fewer than 2 players is refused',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      t.tick(0)
      t.join('solo', 0)
      const ev = t.tick(REGISTRATION_MS)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'tournament_cancelled')
      assert.equal(ev[0].reason, 'not_enough_players')
      assert.equal(t.state, 'over')
    },
  },
  {
    name: 'zero players is also refused, not just one',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      t.tick(0) // opens registration; the deadline is only checked on a later tick
      const ev = t.tick(REGISTRATION_MS)
      assert.equal(ev[0].type, 'tournament_cancelled')
      assert.equal(t.state, 'over')
    },
  },
  {
    name: "a non-contestant's answer during a match is ignored",
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const ev = t.next(REGISTRATION_MS)
      const q = ev.find((e) => e.type === 'trivia_question')
      const letter = correctLetter(q)

      const outsider = t.submit('outsider', letter, REGISTRATION_MS + 100)
      assert.deepEqual(outsider, [], 'a non-contestant must be ignored silently')

      // A genuine contestant's answer still works afterward.
      const ans = t.submit('p0', letter, REGISTRATION_MS + 200)
      assert.equal(ans[0].outcome, 'correct')
    },
  },
  {
    name: 'a contestant gets one attempt per question',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const ev = t.next(REGISTRATION_MS)
      const q = ev.find((e) => e.type === 'trivia_question')
      const correct = correctLetter(q)
      const wrong = q.options.find((o) => o.text !== 'right').letter

      const first = t.submit('p0', wrong, REGISTRATION_MS + 100)
      assert.deepEqual(first, [])
      const second = t.submit('p0', correct, REGISTRATION_MS + 200)
      assert.deepEqual(second, [], 'second attempt from the same contestant is ignored')
    },
  },
  {
    name: 'a level match goes to sudden death; it repeats on a double timeout and resolves once exactly one is right',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      let now = REGISTRATION_MS
      let ev = t.next(now)
      let q = ev.find((e) => e.type === 'trivia_question')

      // Alternate scorers across the 10 main questions so the match ties 5-5.
      for (let i = 0; i < QUESTION_COUNT; i++) {
        const scorer = i % 2 === 0 ? 'p0' : 'p1'
        t.submit(scorer, correctLetter(q), now + 1000)
        now += 1000 + GAP_MS
        const tickEv = t.tick(now)
        if (i < QUESTION_COUNT - 1) {
          q = tickEv.find((e) => e.type === 'trivia_question')
        } else {
          assert.ok(tickEv.find((e) => e.type === 'tournament_sudden_death'), 'a tied match enters sudden death')
          q = tickEv.find((e) => e.type === 'trivia_question')
          assert.ok(q, 'sudden death posts a question immediately')
        }
      }

      // SD round 1: neither contestant answers -> timeout -> repeat.
      now += CLOCK_MS
      let tickEv = t.tick(now) // timeout reveal
      assert.equal(tickEv[0].type, 'trivia_answer')
      assert.equal(tickEv[0].outcome, 'timeout')
      now += GAP_MS
      tickEv = t.tick(now) // trivia_over -> resolved
      assert.ok(tickEv.find((e) => e.type === 'tournament_sudden_death_repeat'), 'a double timeout repeats sudden death')
      q = tickEv.find((e) => e.type === 'trivia_question')
      assert.ok(q)

      // SD round 2: p0 answers correctly, p1 doesn't -> resolves.
      t.submit('p0', correctLetter(q), now + 1000)
      now += 1000 + GAP_MS
      tickEv = t.tick(now)
      const overEv = tickEv.find((e) => e.type === 'tournament_match_over')
      assert.ok(overEv, 'exactly one correct in sudden death resolves the match')
      assert.equal(overEv.winner, 'p0')
      assert.equal(overEv.suddenDeath, true)
      // Only 2 players: this WAS the final, so it crowns a champion outright
      // rather than sitting at 'awaiting' for a round that doesn't exist.
      assert.ok(tickEv.find((e) => e.type === 'tournament_champion'))
      assert.equal(t.state, 'over')
    },
  },
  {
    name: 'the tournament never auto-advances: after a match ends, state stays awaiting until next()',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const ev = t.next(REGISTRATION_MS)
      const { result } = winOneSidedMatch(t, ev, 'p0', REGISTRATION_MS)
      assert.ok(result.find((e) => e.type === 'tournament_champion'), '2-player bracket: this was the final')
      // Ticking further must not start anything on its own.
      assert.deepEqual(t.tick(999_999_999), [])
    },
  },
  {
    name: "next() is refused while a match is running or before registration closes, and doesn't crash once over",
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      // Not yet closed via tick(): still 'registering'.
      const t2 = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      t2.tick(0)
      t2.join('a', 0)
      t2.join('b', 0)
      const denied = t2.next(1000)
      assert.equal(denied[0].type, 'tournament_next_denied')
      assert.equal(denied[0].reason, 'still_registering')

      const ev = t.next(REGISTRATION_MS)
      assert.equal(t.state, 'match')
      const midMatch = t.next(REGISTRATION_MS + 500)
      assert.equal(midMatch[0].reason, 'match_in_progress')
    },
  },
  {
    name: 'a tournament win is recorded to the tournament table and does not touch trivia/chain tables',
    fn: () => {
      const bank = makeBank()
      const t = createTournament({ bank, now: 0, random: fixed(0) })
      const db = openDb(':memory:')
      const jid = 'tourney-jid'
      const noop = () => {}

      sendEvents(noop, jid, t.tick(0), undefined, 0, db) // registration open
      t.join('a', 0)
      t.join('b', 0)
      sendEvents(noop, jid, t.tick(REGISTRATION_MS), undefined, REGISTRATION_MS, db) // bracket ready

      const startEv = t.next(REGISTRATION_MS)
      sendEvents(noop, jid, startEv, undefined, REGISTRATION_MS, db)
      const { result } = winOneSidedMatch(t, startEv, 'a', REGISTRATION_MS)
      sendEvents(noop, jid, result, undefined, REGISTRATION_MS, db)

      assert.equal(t.state, 'over')
      const stats = db.tournamentStats(jid)
      assert.equal(stats.length, 1)
      assert.equal(stats[0].player, 'a')
      assert.equal(stats[0].wins, 1)
      assert.equal(db.leaderboard({ jid, since: 0, type: 'trivia' }).length, 0, 'must not touch the trivia leaderboard')
      assert.equal(db.leaderboard({ jid, since: 0, type: 'chain' }).length, 0, 'must not touch the chain leaderboard')
      db.close()
    },
  },
  {
    name: 'bracket state survives being written and re-read from the store',
    fn: () => {
      const bank = makeBank()
      const db = openDb(':memory:')
      const jid = 'persist-jid'
      const t = createTournament({ bank, now: 0, random: fixed(0.2) })
      const { closeEv } = registerPlayers(t, 3)
      const ready = closeEv.find((e) => e.type === 'tournament_bracket_ready')
      db.saveTournament(jid, ready.snapshot, REGISTRATION_MS)

      const loaded = db.loadTournament(jid)
      assert.ok(loaded, 'snapshot round-trips through the store')
      const resumed = createTournament({ bank, now: REGISTRATION_MS + 1000, random: fixed(0.2), restore: loaded })
      assert.equal(resumed.state, 'awaiting')
      assert.deepEqual(resumed.status().players.slice().sort(), ['p0', 'p1', 'p2'])
      assert.deepEqual(resumed.serialize(), t.serialize(), 'resumed tournament matches the original snapshot')
      db.close()
    },
  },
  {
    name: 'a persisted mid-match snapshot resumes as awaiting at the same fixture, not lost',
    fn: () => {
      const bank = makeBank()
      const t = createTournament({ bank, now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      t.next(REGISTRATION_MS)
      assert.equal(t.state, 'match')
      const midMatchSnapshot = t.serialize()
      assert.equal(midMatchSnapshot.state, 'match')

      const resumed = createTournament({ bank, now: REGISTRATION_MS + 500, random: fixed(0), restore: midMatchSnapshot })
      assert.equal(resumed.state, 'awaiting', 'mid-match progress cannot survive a restart, so it collapses to awaiting')
      const startEv = resumed.next(REGISTRATION_MS + 600)
      assert.ok(startEv.find((e) => e.type === 'tournament_match_start'), 'the same fixture restarts fresh via next()')
    },
  },
  {
    name: 'join is a no-op once registration has closed, and duplicate joins do not double-count',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      t.tick(0)
      assert.equal(t.join('a', 0).length, 1)
      assert.deepEqual(t.join('a', 0), [], 'duplicate join is a no-op')
      t.join('b', 0)
      t.tick(REGISTRATION_MS)
      assert.deepEqual(t.join('c', REGISTRATION_MS + 1), [], 'join after registration closes is a no-op')
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
    console.log(`✗ ${t.name}\n  ${e.stack}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
