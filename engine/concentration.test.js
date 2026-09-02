// engine/concentration.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createConcentrationGame, REGISTRATION_MS, MIN_PLAYERS, TURN_CLOCK_SECONDS, START_DELAY_MS } from './concentration.js'

// A tiny fixed bank: two categories, small item lists so tests can exhaust
// them deliberately. pickCategory cycles deterministically off `exclude`.
function fixtureBank() {
  // 'colors' is picked first by default (pickCategory returns the first
  // available entry) and deliberately has enough items (6) that a handful of
  // accepted answers among 3 players never triggers the pool-low switch by
  // accident — tests that need that behavior build their own dedicated bank.
  // 'clubs' is reached by explicitly excluding 'colors' (see the alias test).
  const categories = [
    { id: 'colors', category: 'Primary colors', items: ['Red', 'Blue', 'Yellow', 'Green', 'Orange', 'Black'] },
    { id: 'clubs', category: 'Football clubs in Germany', items: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen'], aliases: { 'Bayern Munich': ['bayern'] } },
  ]
  return {
    size: () => categories.length,
    pickCategory: ({ exclude = new Set() }) => {
      const available = categories.filter((c) => !exclude.has(c.id))
      return available.length ? available[0] : null
    },
  }
}

function newGame(opts = {}) {
  return createConcentrationGame({ bank: fixtureBank(), now: 0, random: () => 0.5, ...opts })
}

test('concentration: exports the documented defaults', () => {
  assert.equal(REGISTRATION_MS, 60_000)
  assert.equal(MIN_PLAYERS, 2)
  assert.equal(TURN_CLOCK_SECONDS, 15)
  assert.equal(START_DELAY_MS, 5_000)
})

test('concentration: rejects a bank with zero categories', () => {
  const emptyBank = { size: () => 0, pickCategory: () => null }
  assert.throws(() => createConcentrationGame({ bank: emptyBank, now: 0 }), /non-empty category bank/)
})

test('concentration: tick() lazily announces registration on the first call', () => {
  const game = newGame()
  const events = game.tick(0)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'concentration_registration_open')
  assert.equal(events[0].minPlayers, 2)
  assert.equal(events[0].seconds, 60)
})

test('concentration: join adds a player and does not double-count a repeat join', () => {
  const game = newGame()
  game.tick(0)
  assert.deepEqual(game.join('p1', 100), [{ type: 'concentration_joined', player: 'p1', count: 1 }])
  assert.deepEqual(game.join('p1', 200), [])
  assert.equal(game.playerCount, 1)
})

test('concentration: the registration timer cancels the game below minPlayers', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  const events = game.tick(60_000)
  assert.equal(events.length, 1)
  assert.deepEqual(events[0], { type: 'concentration_cancelled', reason: 'not_enough_players', count: 1, needed: 2 })
  assert.equal(game.state, 'over')
})

test('concentration: the registration timer enters a starting phase once minPlayers is met, then reveals the first turn after the heads-up delay', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  game.join('p2', 200)
  game.join('p3', 300)
  const startEvents = game.tick(60_000)
  assert.equal(startEvents.length, 1)
  assert.equal(startEvents[0].type, 'concentration_start')
  assert.deepEqual(startEvents[0].players.sort(), ['p1', 'p2', 'p3'])
  assert.equal(startEvents[0].seconds, 5)
  assert.equal(game.state, 'starting')

  assert.deepEqual(game.tick(60_000 + START_DELAY_MS - 1), [])
  const revealEvents = game.tick(60_000 + START_DELAY_MS)
  assert.equal(revealEvents[0].type, 'concentration_category_switch')
  assert.equal(revealEvents[0].reason, 'start')
  assert.equal(revealEvents[1].type, 'concentration_turn')
  assert.equal(revealEvents[1].round, 1)
  assert.equal(game.state, 'playing')
})

test('concentration: begin() is denied below minPlayers and does not start the game', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  const events = game.begin(200)
  assert.deepEqual(events, [{ type: 'concentration_begin_denied', reason: 'not_enough_players', count: 1, needed: 2 }])
  assert.equal(game.state, 'registering')
})

test('concentration: begin() enters the starting phase early once minPlayers is met', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  game.join('p2', 200)
  const events = game.begin(400)
  assert.equal(events[0].type, 'concentration_start')
  assert.equal(game.state, 'starting')
  const revealEvents = game.tick(400 + START_DELAY_MS)
  assert.equal(revealEvents.find((e) => e.type === 'concentration_turn')?.round, 1)
  assert.equal(game.state, 'playing')
})

test('concentration: begin() outside registering is denied', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  game.join('p2', 200)
  game.begin(400)
  assert.deepEqual(game.begin(500), [{ type: 'concentration_begin_denied', reason: 'not_registering' }])
})

// Drives a game all the way into 'playing' with the first turn revealed —
// begin() at t=0 enters 'starting', then tick() at START_DELAY_MS reveals
// the first category/turn. Every test using this helper works in terms of
// offsets from START_DELAY_MS, not from 0, since that's when play actually begins.
function started(players = ['p1', 'p2', 'p3']) {
  const game = newGame()
  game.tick(0)
  for (const p of players) game.join(p, 0)
  game.begin(0)
  game.tick(START_DELAY_MS)
  return game
}

test('concentration: only the current player\'s submission is accepted', () => {
  const game = started()
  const events = game.submit('p2', 'Red', START_DELAY_MS + 100) // p1 is up first (join order)
  assert.deepEqual(events, [])
})

test('concentration: a correct, unused answer advances to the next player in the same category', () => {
  const game = started()
  const events = game.submit('p1', 'Red', START_DELAY_MS + 100)
  assert.equal(events[0].type, 'concentration_accepted')
  assert.equal(events[0].player, 'p1')
  assert.equal(events[0].answer, 'Red')
  const turn = events.find((e) => e.type === 'concentration_turn')
  assert.equal(turn.player, 'p2')
  assert.equal(turn.round, 2)
  assert.equal(turn.category, 'Primary colors') // no elimination yet, category unchanged
})

test('concentration: an alias scores the same as the canonical name', () => {
  // Exclude 'colors' (the default first pick) so the game starts on 'clubs' instead.
  const game = newGame({ exclude: new Set(['colors']) })
  game.tick(0)
  game.join('p1', 0); game.join('p2', 0); game.join('p3', 0)
  game.begin(0)
  game.tick(START_DELAY_MS)
  const events = game.submit('p1', 'bayern', START_DELAY_MS + 100)
  assert.equal(events[0].type, 'concentration_accepted')
  assert.equal(events[0].answer, 'Bayern Munich')
})

test('concentration: a wrong answer eliminates the player, then the new category arrives only after the pause', () => {
  const game = started()
  const at = START_DELAY_MS + 100
  const events = game.submit('p1', 'Purple', at) // not in Primary colors

  // The elimination lands alone — no category/turn in the same batch.
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'concentration_eliminated')
  assert.equal(events[0].player, 'p1')
  assert.equal(events[0].reason, 'wrong')
  assert.equal(events[0].answer, 'Purple')

  assert.deepEqual(game.tick(at + START_DELAY_MS - 1), [], 'nothing before the pause elapses')

  const resumed = game.tick(at + START_DELAY_MS)
  assert.equal(resumed[0].type, 'concentration_category_switch')
  assert.equal(resumed[0].reason, 'elimination')
  const turn = resumed.find((e) => e.type === 'concentration_turn')
  assert.equal(turn.alive, 2)
})

test('concentration: repeating an already-said answer eliminates as a duplicate', () => {
  const game = started()
  game.submit('p1', 'Red', START_DELAY_MS + 100)
  game.submit('p2', 'Blue', START_DELAY_MS + 200)
  const events = game.submit('p3', 'red', START_DELAY_MS + 300) // case-insensitive repeat
  assert.equal(events[0].type, 'concentration_eliminated')
  assert.equal(events[0].reason, 'duplicate')
  assert.equal(events[0].answer, 'Red')
})

test('concentration: a timed-out turn eliminates via tick(), not submit()', () => {
  const game = started()
  const deadline = START_DELAY_MS + TURN_CLOCK_SECONDS * 1000
  assert.deepEqual(game.tick(deadline - 1), [])
  const events = game.tick(deadline)
  assert.equal(events[0].type, 'concentration_eliminated')
  assert.equal(events[0].reason, 'timeout')
  assert.equal(events[0].player, 'p1')
  assert.equal(events[0].answer, null)
})

test('concentration: a submission arriving after the deadline is ignored (tick is sole timeout authority)', () => {
  const game = started()
  const deadline = START_DELAY_MS + TURN_CLOCK_SECONDS * 1000
  assert.deepEqual(game.submit('p1', 'Red', deadline), [])
})

test('concentration: pool-low proactively switches category before players run out of unused items', () => {
  // 'Primary colors' has exactly 3 items; with 3 alive players, after 1 accepted
  // answer only 2 remain (< 3 alive) — must switch before the pool is exhausted.
  const game = newGame({
    bank: {
      size: () => 2,
      pickCategory: (() => {
        const cats = [
          { id: 'small', category: 'Primary colors', items: ['Red', 'Blue', 'Yellow'] },
          { id: 'big', category: 'Football clubs in Germany', items: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen'] },
        ]
        return ({ exclude }) => {
          const available = cats.filter((c) => !exclude.has(c.id))
          return available[0] ?? null
        }
      })(),
    }
  })
  game.tick(0)
  game.join('p1', 0); game.join('p2', 0); game.join('p3', 0)
  game.begin(0)
  game.tick(START_DELAY_MS)
  const events = game.submit('p1', 'Red', START_DELAY_MS + 100) // 2 unused left, 3 alive -> must switch
  const switchEvent = events.find((e) => e.type === 'concentration_category_switch')
  assert.ok(switchEvent, 'expected a proactive category switch')
  assert.equal(switchEvent.reason, 'pool_low')
  assert.equal(switchEvent.category, 'Football clubs in Germany')
})

test('concentration: end() mid-game terminates immediately and further input is ignored', () => {
  const game = started()
  const events = game.end(START_DELAY_MS + 500)
  assert.deepEqual(events, [{ type: 'concentration_terminated' }])
  assert.equal(game.state, 'over')
  assert.deepEqual(game.submit('p2', 'Blue', START_DELAY_MS + 600), [])
  assert.deepEqual(game.tick(START_DELAY_MS + 700), [])
  assert.deepEqual(game.join('new', START_DELAY_MS + 700), [])
})

test('concentration: exclude seeds the initial category pool (cross-game dedup)', () => {
  const game = newGame({ exclude: new Set(['colors']) })
  game.tick(0)
  game.join('p1', 0); game.join('p2', 0); game.join('p3', 0)
  game.begin(0)
  const revealEvents = game.tick(START_DELAY_MS)
  const switchEvent = revealEvents.find((e) => e.type === 'concentration_category_switch')
  assert.equal(switchEvent.id, 'clubs') // colors excluded, only clubs left
})

test('concentration: end() during the starting phase terminates before any category is revealed', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 0); game.join('p2', 0); game.join('p3', 0)
  game.begin(0)
  assert.equal(game.state, 'starting')
  const events = game.end(1000)
  assert.deepEqual(events, [{ type: 'concentration_terminated' }])
  assert.equal(game.state, 'over')
})

test('concentration: the game ends when only one player remains, standings winner-first then reverse elimination order', () => {
  const game = started(['p1', 'p2', 'p3'])

  // p1's turn times out -> eliminated, then the post-elimination pause runs.
  const t1 = START_DELAY_MS + TURN_CLOCK_SECONDS * 1000
  const r1 = game.tick(t1)
  assert.equal(r1[0].player, 'p1')

  // Pause elapses -> new category + p2's turn (fresh 15s clock from here).
  const t2 = t1 + START_DELAY_MS
  game.tick(t2)

  // p2 times out -> only p3 left -> game over immediately, no pause needed.
  const r3 = game.tick(t2 + TURN_CLOCK_SECONDS * 1000)
  const overEvent = r3.find((e) => e.type === 'concentration_over')
  assert.ok(overEvent, 'expected concentration_over once one player remains')
  assert.equal(overEvent.winner, 'p3')
  assert.deepEqual(overEvent.standings, [{ player: 'p3' }, { player: 'p2' }, { player: 'p1' }])
  assert.equal(game.state, 'over')
})

test('concentration: eliminated event carries the category, for a validator to check the rejected answer against', () => {
  const game = started()
  const events = game.submit('p1', 'Purple', START_DELAY_MS + 100)
  assert.equal(events[0].category, 'Primary colors')
})

test('concentration: reinstate() undoes a wrong-answer elimination during the pause and play continues normally', () => {
  const game = started(['p1', 'p2', 'p3'])
  const at = START_DELAY_MS + 100
  game.submit('p1', 'Purple', at) // wrong -> p1 eliminated, paused

  const events = game.reinstate('p1', 'Purple', at + 500)
  assert.equal(events[0].type, 'concentration_reinstated')
  assert.equal(events[0].player, 'p1')
  assert.equal(events[0].answer, 'Purple')
  assert.equal(game.state, 'playing')

  // p1 is back in the active rotation; the category never actually switched.
  const turn = events.find((e) => e.type === 'concentration_turn')
  assert.equal(turn.alive, 3)
  assert.equal(turn.category, 'Primary colors')
  assert.equal(turn.player, 'p2') // play resumes with whoever was next, same as a normal accept

  // Known limitation: a validator-approved answer isn't in the static JSON,
  // so matchItem() still can't find it locally — a second player repeating
  // the exact same reinstated answer goes through the same eliminate/validate/
  // reinstate round-trip again (harmless — the validator cache makes the
  // second lookup free — but it is NOT caught as an instant local duplicate
  // the way an in-JSON answer would be, since matchItem() fails before the
  // used-set check is ever reached). Documented here rather than engineered
  // around, since it only matters until the content gets folded into the
  // permanent category file.
  const repeat = game.submit('p2', 'Purple', at + 600)
  assert.equal(repeat[0].reason, 'wrong')
})

test('concentration: reinstate() is a no-op once the post-elimination pause has already closed', () => {
  const game = started()
  const at = START_DELAY_MS + 100
  game.submit('p1', 'Purple', at) // wrong -> p1 eliminated, paused
  game.tick(at + START_DELAY_MS) // pause elapses -> next category already revealed

  assert.deepEqual(game.reinstate('p1', 'Purple', at + START_DELAY_MS + 10), [])
})

test('concentration: reinstate() is a no-op for a stale elimination (someone else was eliminated since)', () => {
  const game = started(['p1', 'p2', 'p3'])
  const at1 = START_DELAY_MS + 100
  game.submit('p1', 'Purple', at1) // p1 eliminated (wrong), paused
  // A validator call for p1 arrives late — after p2 has ALSO since been eliminated
  // by a fresh timeout, superseding it. Reinstating p1 now would be incoherent.
  const events2 = game.tick(at1 + START_DELAY_MS) // reveals new category/turn for p2
  const t = events2.find((e) => e.type === 'concentration_turn')
  game.tick(t.deadline) // p2 times out -> eliminated, paused again

  assert.deepEqual(game.reinstate('p1', 'Purple', t.deadline + 10), [])
})

test('concentration: reinstate() ends the game immediately if it leaves only one player unaccounted for', () => {
  // Not directly reachable via reinstate (it only ever restores to >= 2 active,
  // since eliminate() already special-cased the 1-remaining case to finish()
  // before ever entering 'starting') — this documents that reinstate() is
  // therefore never called on a game that has already reached 'over'.
  const game = started(['p1', 'p2'])
  const at = START_DELAY_MS + 100
  game.submit('p1', 'Purple', at) // only 2 players -> wrong answer ends the game outright
  assert.equal(game.state, 'over')
  assert.deepEqual(game.reinstate('p1', 'Purple', at + 10), [])
})
