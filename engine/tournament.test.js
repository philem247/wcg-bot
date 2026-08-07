import assert from 'node:assert/strict'
import { createTournament, REGISTRATION_MS, TOURNAMENT_CLOCK_SECONDS, MATCH_START_DELAY_MS } from './tournament.js'
import { QUESTION_COUNT, GAP_SECONDS } from './trivia.js'
import { openDb } from '../store/db.js'

// transport/router.js -> config.js throws if PHONE_NUMBER is missing; set env
// before the dynamic import below (a static import would be hoisted ahead of
// this and blow up).
process.env.PHONE_NUMBER = process.env.PHONE_NUMBER ?? '1234567890'
const { sendEvents } = await import('../transport/router.js')

const fixed = (v = 0) => () => v
const GAP_MS = GAP_SECONDS * 1000

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
function wrongLetter(q) {
  return q.options.find((o) => o.text !== 'right').letter
}

// next() only announces the match now (Fix 2); the first question arrives on
// a separate tick() after MATCH_START_DELAY_MS. Merge both so existing call
// sites that expect the question in the same batch still work.
function startMatch(t, now) {
  const startEv = t.next(now)
  now += MATCH_START_DELAY_MS
  return { events: [...startEv, ...t.tick(now)], now }
}

// Drives a full 10-question match where `winner` answers correctly every
// question (loser never answers) -> ends 10-0, no sudden death. Race scoring:
// the winning submit() call itself closes the question immediately.
function winOneSidedMatch(t, startEvents, winner, now) {
  let q = startEvents.find((e) => e.type === 'trivia_question')
  let result
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const at = now + 100
    const sub = t.submit(winner, correctLetter(q), at)
    const reveal = sub.find((e) => e.type === 'tournament_question_result')
    assert.ok(reveal, 'the first correct answer closes the question immediately')
    assert.equal(reveal.winner, winner)
    const gapEnd = at + GAP_MS
    let afterGap = t.tick(gapEnd)
    now = gapEnd
    if (afterGap.find((e) => e.type === 'tournament_sudden_death' || e.type === 'tournament_sudden_death_repeat')) {
      now += MATCH_START_DELAY_MS
      afterGap = [...afterGap, ...t.tick(now)]
    }
    if (i < QUESTION_COUNT - 1) {
      q = afterGap.find((e) => e.type === 'trivia_question')
    } else {
      result = afterGap
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
    const { events: ev, now: afterStart } = startMatch(t, now)
    const startEv = ev.find((e) => e.type === 'tournament_match_start')
    assert.ok(startEv, 'expected a match to start')
    const { now: nextNow } = winOneSidedMatch(t, ev, startEv.p1, afterStart)
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
    name: 'match questions run the tournament-specific 10s clock, not group trivia\'s 30s',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const { events: ev, now: afterStart } = startMatch(t, REGISTRATION_MS)
      const q = ev.find((e) => e.type === 'trivia_question')
      assert.equal(q.clockSeconds, TOURNAMENT_CLOCK_SECONDS)
      assert.equal(q.clockSeconds, 10)
      assert.equal(q.endsAt, afterStart + TOURNAMENT_CLOCK_SECONDS * 1000)
    },
  },
  {
    name: 'Fix 2: tournament_match_start and question 1 arrive in separate next()/tick() calls, not the same batch',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const startEv = t.next(REGISTRATION_MS)
      assert.ok(startEv.find((e) => e.type === 'tournament_match_start'), 'next() announces the match')
      assert.equal(startEv.find((e) => e.type === 'trivia_question'), undefined, 'question 1 is NOT in the same batch as the announcement')
      assert.equal(t.state, 'match_starting')

      // A tick before the delay elapses produces nothing.
      assert.deepEqual(t.tick(REGISTRATION_MS + MATCH_START_DELAY_MS - 1), [])
      assert.equal(t.state, 'match_starting', 'still waiting out the delay')

      // A later, separate tick() call is what actually delivers question 1.
      const afterDelay = t.tick(REGISTRATION_MS + MATCH_START_DELAY_MS)
      assert.ok(afterDelay.find((e) => e.type === 'trivia_question'), 'question 1 arrives on its own tick(), once MATCH_START_DELAY_MS has passed')
      assert.equal(t.state, 'match')
    },
  },
  {
    name: "a non-contestant's answer during a match is ignored",
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const { events: ev, now: afterStart } = startMatch(t, REGISTRATION_MS)
      const q = ev.find((e) => e.type === 'trivia_question')
      const letter = correctLetter(q)

      const outsider = t.submit('outsider', letter, afterStart + 100)
      assert.deepEqual(outsider, [], 'a non-contestant must be ignored silently')

      // A genuine contestant's correct submission is the race engine's own
      // first-correct-answer-closes-it behavior — it reveals immediately.
      const ans = t.submit('p0', letter, afterStart + 200)
      assert.ok(ans.find((e) => e.type === 'tournament_question_result'), 'a contestant\'s correct answer closes the question immediately')
    },
  },
  {
    name: 'a contestant gets one attempt per question',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const { events: ev, now: afterStart } = startMatch(t, REGISTRATION_MS)
      const q = ev.find((e) => e.type === 'trivia_question')
      const correct = correctLetter(q)
      const wrong = wrongLetter(q)

      const first = t.submit('p0', wrong, afterStart + 100)
      assert.deepEqual(first, [])
      const second = t.submit('p0', correct, afterStart + 200)
      assert.deepEqual(second, [], 'second attempt from the same contestant is ignored')
    },
  },
  {
    name: 'race scoring: the first correct answer scores the point and closes the question immediately, not after the full clock',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const { events: ev, now: afterStart } = startMatch(t, REGISTRATION_MS)
      const q = ev.find((e) => e.type === 'trivia_question')

      const sub = t.submit('p0', correctLetter(q), afterStart + 100)
      const reveal = sub.find((e) => e.type === 'tournament_question_result')
      assert.ok(reveal, 'the result event fires right after the winning submit() call')
      assert.ok(afterStart + 100 < q.endsAt, 'sanity: this really is early, not a coincidence of timing')
      assert.equal(reveal.winner, 'p0')
      assert.equal(reveal.scoreP1 + reveal.scoreP2, 1, 'exactly one point awarded')

      // The other contestant's submission after the question has closed is a no-op.
      const late = t.submit('p1', wrongLetter(q), afterStart + 200)
      assert.deepEqual(late, [], "a submission after the question has already closed is ignored")
    },
  },
  {
    name: "a contestant who never answers is never recorded as the winner of that question (regression: non-answerer previously scored)",
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const { events: ev, now: afterStart } = startMatch(t, REGISTRATION_MS)
      const q = ev.find((e) => e.type === 'trivia_question') // neither p0 nor p1 submits anything

      const reveal = t.tick(q.endsAt).find((e) => e.type === 'tournament_question_result')
      assert.ok(reveal, 'reveals once the full clock elapses with no answer')
      assert.equal(reveal.winner, null, 'nobody answered — winner must not be set to either contestant')
      assert.equal(reveal.scoreP1, 0)
      assert.equal(reveal.scoreP2, 0)
    },
  },
  {
    name: 'tournament_question_result carries scoreP1/scoreP2 that increment correctly across multiple questions in a match',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const { events: ev, now: afterStart } = startMatch(t, REGISTRATION_MS)
      const matchStart = ev.find((e) => e.type === 'tournament_match_start')
      let q = ev.find((e) => e.type === 'trivia_question')
      let now = afterStart

      // p0 wins Q1 and Q2; check the running score after each.
      for (let i = 0; i < 2; i++) {
        const at = now + 100
        const sub = t.submit(matchStart.p1, correctLetter(q), at)
        const reveal = sub.find((e) => e.type === 'tournament_question_result')
        assert.ok(reveal)
        const p1Score = matchStart.p1 === reveal.p1 ? reveal.scoreP1 : reveal.scoreP2
        assert.equal(p1Score, i + 1, `p1's score should be ${i + 1} after question ${i + 1}`)
        const gapEnd = at + GAP_MS
        const afterGap = t.tick(gapEnd)
        now = gapEnd
        q = afterGap.find((e) => e.type === 'trivia_question')
      }
    },
  },
  {
    name: 'a level match goes to sudden death; it repeats when nobody answers in time, resolves once someone does',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const started = startMatch(t, REGISTRATION_MS)
      let now = started.now
      let q = started.events.find((e) => e.type === 'trivia_question')

      // Alternate scorers across the 10 main questions so the match ties 5-5.
      for (let i = 0; i < QUESTION_COUNT; i++) {
        const scorer = i % 2 === 0 ? 'p0' : 'p1'
        const at = now + 100
        const sub = t.submit(scorer, correctLetter(q), at)
        assert.ok(sub.find((e) => e.type === 'tournament_question_result'), 'the scorer\'s answer closes the question')
        const gapEnd = at + GAP_MS
        const afterGap = t.tick(gapEnd)
        now = gapEnd
        if (i < QUESTION_COUNT - 1) {
          q = afterGap.find((e) => e.type === 'trivia_question')
        } else {
          assert.ok(afterGap.find((e) => e.type === 'tournament_sudden_death'), 'a tied match enters sudden death')
          // Fix 2: the sudden-death announcement lands alone — chase the start
          // delay for its question.
          now += MATCH_START_DELAY_MS
          q = t.tick(now).find((e) => e.type === 'trivia_question')
          assert.ok(q, 'sudden death posts its question after the start delay')
        }
      }

      // SD round 1: nobody answers -> timeout -> repeat.
      let afterGap = t.tick(q.endsAt)
      const timeoutReveal = afterGap.find((e) => e.type === 'tournament_question_result')
      assert.equal(timeoutReveal.winner, null, 'nobody answered this sudden-death question')
      let gapEnd = q.endsAt + GAP_MS
      afterGap = t.tick(gapEnd)
      assert.ok(afterGap.find((e) => e.type === 'tournament_sudden_death_repeat'), 'nobody answering repeats sudden death')
      // The repeat announcement lands alone (Fix 2) — chase the delay for its question.
      now = gapEnd + MATCH_START_DELAY_MS
      q = t.tick(now).find((e) => e.type === 'trivia_question')
      assert.ok(q, 'sudden-death repeat posts its question after the start delay')

      // SD round 2: p0 answers correctly -> resolves.
      const at = now + 100
      const sub = t.submit('p0', correctLetter(q), at)
      assert.ok(sub.find((e) => e.type === 'tournament_question_result'), 'p0\'s answer closes the question')
      gapEnd = at + GAP_MS
      const afterFinalGap = t.tick(gapEnd)
      const overEv = afterFinalGap.find((e) => e.type === 'tournament_match_over')
      assert.ok(overEv, 'a correct answer in sudden death resolves the match')
      assert.equal(overEv.winner, 'p0')
      assert.equal(overEv.suddenDeath, true)
      // Only 2 players: this WAS the final, so it crowns a champion outright
      // rather than sitting at 'awaiting' for a round that doesn't exist.
      assert.ok(afterFinalGap.find((e) => e.type === 'tournament_champion'))
      assert.equal(t.state, 'over')
    },
  },
  {
    name: 'the tournament never auto-advances: after a match ends, state stays awaiting until next()',
    fn: () => {
      const t = createTournament({ bank: makeBank(), now: 0, random: fixed(0) })
      registerPlayers(t, 2)
      const { events: ev, now: afterStart } = startMatch(t, REGISTRATION_MS)
      const { result } = winOneSidedMatch(t, ev, 'p0', afterStart)
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

      t.next(REGISTRATION_MS)
      assert.equal(t.state, 'match_starting', 'next() only announces the match — question 1 is deferred (Fix 2)')
      const deniedWhileStarting = t.next(REGISTRATION_MS + 500)
      assert.equal(deniedWhileStarting[0].reason, 'match_in_progress')

      t.tick(REGISTRATION_MS + MATCH_START_DELAY_MS)
      assert.equal(t.state, 'match')
      const midMatch = t.next(REGISTRATION_MS + MATCH_START_DELAY_MS + 500)
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
      const noop = () => { }

      sendEvents(noop, jid, t.tick(0), undefined, 0, db) // registration open
      t.join('a', 0)
      t.join('b', 0)
      sendEvents(noop, jid, t.tick(REGISTRATION_MS), undefined, REGISTRATION_MS, db) // bracket ready

      const { events: startEv, now: afterStart } = startMatch(t, REGISTRATION_MS)
      sendEvents(noop, jid, startEv, undefined, REGISTRATION_MS, db)
      const { result } = winOneSidedMatch(t, startEv, 'a', afterStart)
      sendEvents(noop, jid, result, undefined, afterStart, db)

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
      assert.equal(t.state, 'match_starting', 'next() only announces the match — question 1 is deferred (Fix 2)')
      t.tick(REGISTRATION_MS + MATCH_START_DELAY_MS) // past the start delay: question 1 now live
      assert.equal(t.state, 'match')
      const midMatchSnapshot = t.serialize()
      assert.equal(midMatchSnapshot.state, 'match')

      const resumed = createTournament({ bank, now: REGISTRATION_MS + MATCH_START_DELAY_MS + 500, random: fixed(0), restore: midMatchSnapshot })
      assert.equal(resumed.state, 'awaiting', 'mid-match progress cannot survive a restart, so it collapses to awaiting')
      const startEv = resumed.next(REGISTRATION_MS + MATCH_START_DELAY_MS + 600)
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
