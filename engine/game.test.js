import assert from 'node:assert/strict'
import { createGame } from './game.js'
import { createScheduler } from './tick.js'
import { LOBBY_WINDOW_MS, MODES, RAMP_LENGTH_EVERY_ROUNDS, RAMP_CLOCK_EVERY_ROUNDS, RAMP_MIN_LENGTH_STEP, RAMP_MIN_LENGTH_CAP, RAMP_CLOCK_STEP_S, RAMP_CLOCK_FLOOR_S } from './modes.js'

// Tiny deterministic fake dict: has() checks a Set, randomLetter() cycles through
// a fixed sequence (repeating the last entry once exhausted). No real dictionary,
// no Math.random() — keeps the whole suite reproducible.
function makeDict(words, letters = []) {
  const set = new Set(words)
  let idx = 0
  return {
    has: (w) => set.has(w),
    randomLetter: () => {
      if (letters.length === 0) return null
      const l = letters[Math.min(idx, letters.length - 1)]
      idx++
      return l
    },
  }
}

// 16-char words starting with 'a' (always above the 13-letter ramp cap), unique per i.
function longWord(i) {
  const c1 = String.fromCharCode(97 + (Math.floor(i / 26) % 26))
  const c2 = String.fromCharCode(97 + (i % 26))
  return 'a' + 'z'.repeat(13) + c1 + c2
}

const tests = [
  {
    name: 'lobby: tick announces lobby_open then joined(starter)',
    fn: () => {
      const g = createGame({ dict: makeDict([]), starter: 'a', now: 0 })
      const ev = g.tick(0)
      assert.equal(ev.length, 2)
      assert.deepEqual(ev[0], { type: 'lobby_open', deadline: LOBBY_WINDOW_MS, mode: 'easy', gameType: 'chain' })
      assert.deepEqual(ev[1], { type: 'joined', player: 'a', count: 1 })
    },
  },
  {
    name: 'lobby: join adds player, duplicate join is a no-op',
    fn: () => {
      const g = createGame({ dict: makeDict([]), starter: 'a', now: 0 })
      g.tick(0)
      assert.deepEqual(g.join('b', 1000), [{ type: 'joined', player: 'b', count: 2 }])
      assert.equal(g.join('b', 2000).length, 0)
      assert.equal(g.join('a', 2000).length, 0)
    },
  },
  {
    name: 'lobby: reminders fire at 30s and 10s remaining, once each',
    fn: () => {
      const g = createGame({ dict: makeDict([]), starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      assert.deepEqual(g.tick(30_000), [{ type: 'lobby_reminder', secondsLeft: 30, count: 2, mode: 'easy' }])
      assert.deepEqual(g.tick(50_000), [{ type: 'lobby_reminder', secondsLeft: 10, count: 2, mode: 'easy' }])
      assert.equal(g.tick(55_000).length, 0)
    },
  },
  {
    name: 'lobby: fewer than 2 players terminates at deadline; over-state methods return []',
    fn: () => {
      const g = createGame({ dict: makeDict([]), starter: 'a', now: 0 })
      g.tick(0)
      assert.deepEqual(g.tick(60_000), [{ type: 'terminated', reason: 'not_enough_players' }])
      assert.equal(g.state, 'over')
      assert.equal(g.join('z', 60_001).length, 0)
      assert.equal(g.submit('a', 'x', 60_001).length, 0)
      assert.equal(g.tick(70_000).length, 0)
      assert.equal(g.end(70_000).length, 0)
    },
  },
  {
    name: 'lobby: successful start emits game_start (deterministic order) then first turn, letter null',
    fn: () => {
      const g = createGame({ dict: makeDict([]), starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      g.join('c', 0)
      const ev = g.tick(60_000)
      // shuffle(['a','b','c']) with random()=>0.5 is deterministic: ['a','c','b']
      assert.deepEqual(ev[0], { type: 'game_start', players: ['a', 'c', 'b'] })
      assert.deepEqual(ev[1], {
        type: 'turn',
        player: 'a',
        next: 'c',
        letter: null,
        minLength: MODES.easy.minLength,
        seconds: MODES.easy.clockSeconds,
        alive: 3,
        total: 3,
        totalWords: 0,
        deadline: 60_000 + MODES.easy.clockSeconds * 1000,
      })
    },
  },
  {
    name: 'chain: wrong-player submit is silently dropped; first turn gets a concrete letter from dict.randomLetter() and rejects a word not starting with it; wrong letter rejected without advancing or resetting deadline',
    fn: () => {
      const dict = makeDict(['apple', 'elephant', 'tiger'], ['a'])
      const g = createGame({ dict, starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      const startEv = g.tick(60_000) // players a,b -> shuffle unchanged -> turn a, letter 'a' (from fake dict)
      assert.equal(startEv[1].letter, 'a')

      assert.equal(g.submit('b', 'apple', 61_000).length, 0) // not b's turn

      const firstReject = g.submit('a', 'tiger', 61_000) // doesn't start with required 'a'
      assert.deepEqual(firstReject, [{ type: 'rejected', player: 'a', word: 'tiger', reason: 'not_starting_with' }])

      const acceptEv = g.submit('a', 'apple', 61_000)
      assert.deepEqual(acceptEv[0], { type: 'accepted', player: 'a', word: 'apple' })
      assert.equal(acceptEv[1].type, 'turn')
      assert.equal(acceptEv[1].player, 'b')
      assert.equal(acceptEv[1].letter, 'e')
      const deadlineForB = acceptEv[1].deadline

      const rejectEv = g.submit('b', 'tiger', 62_000) // starts with 't', needs 'e'
      assert.deepEqual(rejectEv, [{ type: 'rejected', player: 'b', word: 'tiger', reason: 'not_starting_with' }])

      // deadline untouched by the rejection: still no timeout one ms before it
      assert.equal(g.tick(deadlineForB - 1).length, 0)

      const acceptEv2 = g.submit('b', 'elephant', deadlineForB - 1)
      assert.deepEqual(acceptEv2[0], { type: 'accepted', player: 'b', word: 'elephant' })
    },
  },
  {
    name: 'minLength is a floor: a much longer word is accepted at a low minLength',
    fn: () => {
      const g = createGame({ dict: makeDict(['extraordinary']), starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      g.tick(60_000)
      const ev = g.submit('a', 'extraordinary', 61_000)
      assert.deepEqual(ev[0], { type: 'accepted', player: 'a', word: 'extraordinary' })
    },
  },
  {
    name: 'words ending in hard letters: same player accepts multiple hard-letter handoffs',
    fn: () => {
      const dict = makeDict(['buzz', 'zebra', 'apex'])
      const g = createGame({ dict, starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      g.tick(60_000) // turn a, letter null

      const ev1 = g.submit('a', 'buzz', 61_000) // ends 'z' (hard), a's first hard handoff
      assert.equal(ev1[0].type, 'accepted')
      assert.equal(ev1[1].letter, 'z')

      const ev2 = g.submit('b', 'zebra', 62_000) // starts z, ends 'a' -> completes round 1 -> ramp fires
      assert.equal(ev2[0].type, 'accepted')
      assert.equal(ev2[1].type, 'ramp') // ramp fires after round 1 completes
      assert.equal(ev2[2].letter, 'a') // turn event is now at index 2

      const ev3 = g.submit('a', 'apex', 63_000) // starts a, ends 'x' (hard) -> a's second hard handoff, still accepted
      assert.equal(ev3[0].type, 'accepted')
      assert.equal(ev3[1].letter, 'x')
    },
  },
  {
    name: 'submit: expired (>= deadline) is silently dropped and leaves the deadline untouched',
    fn: () => {
      const dict = makeDict(['apple'])
      const g = createGame({ dict, starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      const startEv = g.tick(60_000)
      const deadline = startEv[1].deadline

      assert.equal(g.submit('a', 'apple', deadline).length, 0) // exactly at deadline
      assert.equal(g.submit('a', 'apple', deadline + 5000).length, 0) // well past deadline

      // deadline untouched by either drop: still no timeout one ms before the original deadline,
      // and it is still a's turn (tick did not fire, no elimination happened)
      assert.equal(g.tick(deadline - 1).length, 0)
    },
  },
  {
    name: 'submit: one ms before the deadline is still accepted (not off-by-one)',
    fn: () => {
      const dict = makeDict(['apple'])
      const g = createGame({ dict, starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      const startEv = g.tick(60_000)
      const deadline = startEv[1].deadline

      const ev = g.submit('a', 'apple', deadline - 1)
      assert.deepEqual(ev[0], { type: 'accepted', player: 'a', word: 'apple' })
    },
  },
  {
    name: 'timeouts: lives=3 takes three timeouts to eliminate; ramp fires after 1 completed round; winner has correct stats',
    fn: () => {
      const dict = makeDict(['apple', 'elephant'])
      const g = createGame({ dict, starter: 'a', lives: 3, now: 0 })
      g.tick(0)
      g.join('b', 0)
      const startEv = g.tick(60_000) // turn a, letter null, deadline 100000
      const turn0 = startEv[1]
      assert.equal(turn0.player, 'a')
      assert.equal(turn0.deadline, 60_000 + MODES.easy.clockSeconds * 1000)

      // a timeout #1 -> life_lost, turn passes to b
      let ev = g.tick(turn0.deadline)
      assert.deepEqual(ev[0], { type: 'life_lost', player: 'a', livesLeft: 2 })
      assert.equal(ev[1].player, 'b')
      assert.equal(ev[1].letter, null) // a never submitted, so still unset
      const bDeadline1 = ev[1].deadline

      // b submits 'apple' -> completes round 1 -> ramp applies (length only, clock cadence is 2)
      ev = g.submit('b', 'apple', bDeadline1 - 1)
      assert.deepEqual(ev[0], { type: 'accepted', player: 'b', word: 'apple' })
      assert.deepEqual(ev[1], { type: 'ramp', round: 1, minLength: MODES.easy.minLength + RAMP_MIN_LENGTH_STEP, seconds: MODES.easy.clockSeconds })
      assert.equal(ev[2].player, 'a')
      assert.equal(ev[2].letter, 'e')
      assert.equal(ev[2].minLength, MODES.easy.minLength + RAMP_MIN_LENGTH_STEP)
      assert.equal(ev[2].seconds, MODES.easy.clockSeconds, 'clock unchanged after round 1 (cadence is 2)')
      const aDeadline2 = ev[2].deadline

      // a timeout #2
      ev = g.tick(aDeadline2)
      assert.deepEqual(ev[0], { type: 'life_lost', player: 'a', livesLeft: 1 })
      assert.equal(ev[1].player, 'b')
      assert.equal(ev[1].letter, 'e') // still unchanged, a didn't submit
      const bDeadline2 = ev[1].deadline

      // b submits 'elephant' -> completes round 2 -> ramp applies (both length and clock)
      ev = g.submit('b', 'elephant', bDeadline2 - 1)
      assert.deepEqual(ev[0], { type: 'accepted', player: 'b', word: 'elephant' })
      assert.deepEqual(ev[1], { type: 'ramp', round: 2, minLength: MODES.easy.minLength + 2 * RAMP_MIN_LENGTH_STEP, seconds: MODES.easy.clockSeconds - RAMP_CLOCK_STEP_S })
      assert.equal(ev[2].player, 'a')
      assert.equal(ev[2].minLength, MODES.easy.minLength + 2 * RAMP_MIN_LENGTH_STEP)
      assert.equal(ev[2].seconds, MODES.easy.clockSeconds - RAMP_CLOCK_STEP_S, 'clock decreases on round 2')
      const aDeadline3 = ev[2].deadline

      // a timeout #3 -> eliminated -> winner
      ev = g.tick(aDeadline3)
      assert.deepEqual(ev[0], { type: 'eliminated', player: 'a', reason: 'timeout', livesLeft: 0 })
      assert.equal(ev[1].type, 'winner')
      assert.equal(ev[1].player, 'b')
      assert.equal(ev[1].totalWords, 2)
      assert.equal(ev[1].longestWord, 'elephant')
      assert.equal(ev[1].longestBy, 'b')
      assert.equal(ev[1].elapsedMs, aDeadline3 - 60_000)
      assert.equal(g.state, 'over')

      // over: every method returns []
      assert.equal(g.join('z', aDeadline3 + 1).length, 0)
      assert.equal(g.submit('b', 'x', aDeadline3 + 1).length, 0)
      assert.equal(g.tick(aDeadline3 + 1).length, 0)
      assert.equal(g.end(aDeadline3 + 1).length, 0)
    },
  },
  {
    name: 'ramp: minLength clamps at 13, clock clamps at 20; both no-op after clamping',
    fn: () => {
      const words = new Set()
      for (let i = 0; i < 60; i++) words.add(longWord(i))
      const dict = { has: (w) => words.has(w), randomLetter: () => 'a' }
      const g = createGame({ dict, type: 'random', starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      const startEv = g.tick(60_000)
      let turn = startEv[1]

      let now = 60_000
      let wi = 0
      // 30 rounds x 2 players = 60 turns -> 30 length ramps, 15 clock ramps
      // minLength: 3+30*1 = 33, capped at 13 (rounds 10+)
      // clock: 40-15*3 = 5, capped at 20 (rounds 14+)
      // After both clamp, no more ramp events should be emitted
      let lastRampRound = -1
      for (let round = 0; round < 30; round++) {
        for (let t = 0; t < 2; t++) {
          now += 1
          const res = g.submit(turn.player, longWord(wi++), now)
          const rampIdx = res.findIndex(e => e.type === 'ramp')
          if (rampIdx >= 0) {
            lastRampRound = round
          }
          turn = res[res.length - 1]
          assert.equal(turn.type, 'turn')
        }
      }

      assert.equal(turn.minLength, RAMP_MIN_LENGTH_CAP)
      assert.equal(turn.seconds, RAMP_CLOCK_FLOOR_S)
      assert(lastRampRound < 30, 'last ramp should have fired before round 30 and then stopped')
    },
  },
  {
    name: 'easy mode: minLength reaches 13 and holds; clock walks down to 20 and holds',
    fn: () => {
      const words = new Set()
      for (let i = 0; i < 60; i++) words.add(longWord(i))
      const dict = { has: (w) => words.has(w), randomLetter: () => 'a' }
      const g = createGame({ dict, mode: 'easy', type: 'random', starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      const startEv = g.tick(60_000)
      let turn = startEv[1]
      assert.equal(turn.minLength, MODES.easy.minLength)
      assert.equal(turn.seconds, MODES.easy.clockSeconds)

      let now = 60_000
      let wi = 0
      // easy starts at 3, needs 10 rounds to reach 13 (3 + 10*1 = 13)
      // easy starts at 40s, clock drops every 2 rounds: 40 -> 37 (r2) -> 34 (r4) -> 31 (r6) -> 28 (r8) -> 25 (r10) -> 22 (r12) -> 20 (r14, capped)
      for (let round = 0; round < 10; round++) {
        for (let t = 0; t < 2; t++) {
          now += 1
          const res = g.submit(turn.player, longWord(wi++), now)
          turn = res[res.length - 1]
          assert.equal(turn.type, 'turn')
        }
      }

      assert.equal(turn.minLength, 13)
      assert.equal(turn.seconds, 25, 'at round 10: 40 - 5*3 = 25')

      // play 2 more rounds: after round 12 clock should be 22, after round 14 it should be 20
      for (let round = 10; round < 14; round++) {
        for (let t = 0; t < 2; t++) {
          now += 1
          const res = g.submit(turn.player, longWord(wi++), now)
          turn = res[res.length - 1]
          assert.equal(turn.type, 'turn')
        }
      }
      assert.equal(turn.minLength, 13, 'minLength clamped at 13')
      assert.equal(turn.seconds, 20, 'clock clamped at 20')

      // play one more round and verify both stay clamped
      for (let t = 0; t < 2; t++) {
        now += 1
        const res = g.submit(turn.player, longWord(wi++), now)
        turn = res[res.length - 1]
        assert.equal(turn.type, 'turn')
      }
      assert.equal(turn.minLength, 13)
      assert.equal(turn.seconds, 20)
    },
  },
  {
    name: 'ramp cadences are independent: after round 1 minLength changes but clock does not',
    fn: () => {
      const words = new Set()
      for (let i = 0; i < 10; i++) words.add(longWord(i))
      const dict = { has: (w) => words.has(w), randomLetter: () => 'a' }
      const g = createGame({ dict, type: 'random', starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      const startEv = g.tick(60_000)
      let turn = startEv[1]
      const initialClock = turn.seconds
      const initialLength = turn.minLength

      let now = 60_000
      // after round 1: minLength increases, clock does not (clock cadence is 2)
      now += 1
      let res = g.submit(turn.player, longWord(0), now)
      turn = res[res.length - 1]
      now += 1
      res = g.submit(turn.player, longWord(1), now)

      // Check the ramp event
      const rampEv = res.find(e => e.type === 'ramp')
      assert(rampEv, 'ramp event should be emitted after round 1')
      assert.equal(rampEv.minLength, initialLength + 1, 'minLength should increase')
      assert.equal(rampEv.seconds, initialClock, 'clock should not change (cadence is 2)')

      turn = res[res.length - 1]
      assert.equal(turn.minLength, initialLength + 1)
      assert.equal(turn.seconds, initialClock)
    },
  },
  {
    name: 'join while playing queues the player and exposes the queued list',
    fn: () => {
      const dict = makeDict([])
      const g = createGame({ dict, starter: 'a', now: 0 })
      g.tick(0)
      g.join('b', 0)
      g.tick(60_000) // now playing
      const ev = g.join('c', 61_000)
      assert.deepEqual(ev, [{ type: 'queued', player: 'c' }])
      assert.deepEqual(g.queued, ['c'])
      assert.equal(g.join('c', 62_000).length, 0) // duplicate queue join ignored
    },
  },
  {
    name: 'scheduler: pump delivers events per jid and deletes finished games from the map',
    fn: () => {
      const dict = makeDict([])
      const gameX = createGame({ dict, starter: 'a', now: 0 }) // only 1 player -> will terminate
      const gameY = createGame({ dict, starter: 'x', now: 0 })
      gameY.join('y', 0) // 2 players -> will start

      const games = new Map([
        ['jidX', gameX],
        ['jidY', gameY],
      ])
      const calls = []
      const scheduler = createScheduler({ games, onEvents: (jid, events) => calls.push({ jid, events }) })

      scheduler.pump(0)
      assert.equal(calls.length, 1) // only gameX had unannounced lobby_open at this pump
      assert.equal(calls[0].jid, 'jidX')
      assert.equal(games.size, 2)

      scheduler.pump(60_000)
      assert.equal(games.has('jidX'), false) // terminated -> deleted
      assert.equal(games.has('jidY'), true) // started -> kept
      assert.equal(games.size, 1)
    },
  },
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    test.fn()
    console.log(`✓ ${test.name}`)
    passed++
  } catch (e) {
    console.error(`✗ ${test.name}: ${e.message}`)
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
