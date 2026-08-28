// engine/concentration.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createConcentrationGame, REGISTRATION_MS, MIN_PLAYERS, TURN_CLOCK_SECONDS } from './concentration.js'

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
  assert.equal(REGISTRATION_MS, 90_000)
  assert.equal(MIN_PLAYERS, 3)
  assert.equal(TURN_CLOCK_SECONDS, 15)
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
  assert.equal(events[0].minPlayers, 3)
  assert.equal(events[0].seconds, 90)
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
  game.join('p2', 200)
  const events = game.tick(90_000)
  assert.equal(events.length, 1)
  assert.deepEqual(events[0], { type: 'concentration_cancelled', reason: 'not_enough_players', count: 2, needed: 3 })
  assert.equal(game.state, 'over')
})

test('concentration: the registration timer starts the game once minPlayers is met', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  game.join('p2', 200)
  game.join('p3', 300)
  const events = game.tick(90_000)
  assert.equal(events[0].type, 'concentration_start')
  assert.deepEqual(events[0].players.sort(), ['p1', 'p2', 'p3'])
  assert.equal(events[1].type, 'concentration_category_switch')
  assert.equal(events[1].reason, 'start')
  assert.equal(events[2].type, 'concentration_turn')
  assert.equal(events[2].round, 1)
  assert.equal(game.state, 'playing')
})

test('concentration: begin() is denied below minPlayers and does not start the game', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  const events = game.begin(200)
  assert.deepEqual(events, [{ type: 'concentration_begin_denied', reason: 'not_enough_players', count: 1, needed: 3 }])
  assert.equal(game.state, 'registering')
})

test('concentration: begin() starts the game early once minPlayers is met', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  game.join('p2', 200)
  game.join('p3', 300)
  const events = game.begin(400)
  assert.equal(events[0].type, 'concentration_start')
  assert.equal(game.state, 'playing')
})

test('concentration: begin() outside registering is denied', () => {
  const game = newGame()
  game.tick(0)
  game.join('p1', 100)
  game.join('p2', 200)
  game.join('p3', 300)
  game.begin(400)
  assert.deepEqual(game.begin(500), [{ type: 'concentration_begin_denied', reason: 'not_registering' }])
})

function started(players = ['p1', 'p2', 'p3']) {
  const game = newGame()
  game.tick(0)
  for (const p of players) game.join(p, 0)
  game.begin(0)
  return game
}

test('concentration: only the current player\'s submission is accepted', () => {
  const game = started()
  const events = game.submit('p2', 'Red', 100) // p1 is up first (join order, random()=0.5 keeps order stable)
  assert.deepEqual(events, [])
})

test('concentration: a correct, unused answer advances to the next player in the same category', () => {
  const game = started()
  const events = game.submit('p1', 'Red', 100)
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
  const events = game.submit('p1', 'bayern', 100)
  assert.equal(events[0].type, 'concentration_accepted')
  assert.equal(events[0].answer, 'Bayern Munich')
})

test('concentration: a wrong answer eliminates the player and switches category', () => {
  const game = started()
  const events = game.submit('p1', 'Purple', 100) // not in Primary colors
  assert.equal(events[0].type, 'concentration_eliminated')
  assert.equal(events[0].player, 'p1')
  assert.equal(events[0].reason, 'wrong')
  assert.equal(events[0].answer, 'Purple')
  assert.equal(events[1].type, 'concentration_category_switch')
  assert.equal(events[1].reason, 'elimination')
  const turn = events.find((e) => e.type === 'concentration_turn')
  assert.equal(turn.alive, 2)
})

test('concentration: repeating an already-said answer eliminates as a duplicate', () => {
  const game = started()
  game.submit('p1', 'Red', 100)
  game.submit('p2', 'Blue', 200)
  const events = game.submit('p3', 'red', 300) // case-insensitive repeat
  assert.equal(events[0].type, 'concentration_eliminated')
  assert.equal(events[0].reason, 'duplicate')
  assert.equal(events[0].answer, 'Red')
})

test('concentration: a timed-out turn eliminates via tick(), not submit()', () => {
  const game = started()
  assert.deepEqual(game.tick(14_999), [])
  const events = game.tick(15_000)
  assert.equal(events[0].type, 'concentration_eliminated')
  assert.equal(events[0].reason, 'timeout')
  assert.equal(events[0].player, 'p1')
  assert.equal(events[0].answer, null)
})

test('concentration: a submission arriving after the deadline is ignored (tick is sole timeout authority)', () => {
  const game = started()
  assert.deepEqual(game.submit('p1', 'Red', 15_000), [])
})

test('concentration: pool-low proactively switches category before players run out of unused items', () => {
  // 'Primary colors' has exactly 3 items; with 3 alive players, after 1 accepted
  // answer only 2 remain (< 3 alive) — must switch before the pool is exhausted.
  const game = newGame({ bank: {
    size: () => 2,
    pickCategory: (() => {
      let calls = 0
      const cats = [
        { id: 'small', category: 'Primary colors', items: ['Red', 'Blue', 'Yellow'] },
        { id: 'big', category: 'Football clubs in Germany', items: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen'] },
      ]
      return ({ exclude }) => {
        const available = cats.filter((c) => !exclude.has(c.id))
        return available[0] ?? null
      }
    })(),
  }})
  game.tick(0)
  game.join('p1', 0); game.join('p2', 0); game.join('p3', 0)
  game.begin(0)
  const events = game.submit('p1', 'Red', 100) // 2 unused left, 3 alive -> must switch
  const switchEvent = events.find((e) => e.type === 'concentration_category_switch')
  assert.ok(switchEvent, 'expected a proactive category switch')
  assert.equal(switchEvent.reason, 'pool_low')
  assert.equal(switchEvent.category, 'Football clubs in Germany')
})

test('concentration: end() mid-game terminates immediately and further input is ignored', () => {
  const game = started()
  const events = game.end(500)
  assert.deepEqual(events, [{ type: 'concentration_terminated' }])
  assert.equal(game.state, 'over')
  assert.deepEqual(game.submit('p2', 'Blue', 600), [])
  assert.deepEqual(game.tick(700), [])
  assert.deepEqual(game.join('new', 700), [])
})

test('concentration: exclude seeds the initial category pool (cross-game dedup)', () => {
  const game = newGame({ exclude: new Set(['colors']) })
  game.tick(0)
  game.join('p1', 0); game.join('p2', 0); game.join('p3', 0)
  const events = game.begin(0)
  const switchEvent = events.find((e) => e.type === 'concentration_category_switch')
  assert.equal(switchEvent.id, 'clubs') // colors excluded, only clubs left
})

test('concentration: the game ends when only one player remains, standings winner-first then reverse elimination order', () => {
  const game = started(['p1', 'p2', 'p3'])
  const r1 = game.tick(15_000) // p1's turn times out -> eliminated, category switches, p2's turn (fresh 15s clock from now)
  assert.equal(r1[0].player, 'p1')
  const r2 = game.tick(30_000) // p2's turn (deadline was 15_000+15_000) times out -> only p3 left -> game over
  const overEvent = r2.find((e) => e.type === 'concentration_over')
  assert.ok(overEvent, 'expected concentration_over once one player remains')
  assert.equal(overEvent.winner, 'p3')
  assert.deepEqual(overEvent.standings, [{ player: 'p3' }, { player: 'p2' }, { player: 'p1' }])
  assert.equal(game.state, 'over')
})
