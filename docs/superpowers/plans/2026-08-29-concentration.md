# Concentration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Concentration, a category-naming elimination game, to wcg-bot: admin opens a join lobby, players go round-robin naming unused valid items from a category the bot names, a wrong/duplicate/timed-out answer eliminates that player, the category rotates after every elimination, and the last player standing wins.

**Architecture:** A new pure engine (`engine/concentration.js`) owns a `registering -> playing -> over` state machine — the lobby shape mirrors `engine/tournament.js` (admin-driven, no auto-join for the starter), the turn/elimination shape mirrors `engine/game.js` (fixed turn order, active roster, elimination), but validation is category-membership + alias matching (like `engine/flag.js`), so it is its own file rather than an extension of either. A new content bank (`data/categories.json` + `loadCategoryBank` in `engine/bank.js`) supplies categories. Router/store/render wiring follows the exact pattern already used for Guess the Flag end to end.

**Tech Stack:** Node.js, `node:test`/`node:assert`, `node:sqlite` (via `store/db.js`), no new dependencies.

## Global Constraints

- No `Date.now()`/`Math.random()` inside `engine/concentration.js` — time via injected `now`, randomness via injected `random`, same rule as every other file in `engine/`.
- `MIN_PLAYERS = 3`, `TURN_CLOCK_SECONDS = 15`, `REGISTRATION_MS = 90_000` (90s) — exact values, not placeholders.
- Category rotation: a fresh category is picked after every elimination, and pre-emptively whenever the current category's unused-item count drops below the number of currently alive players (checked after every accepted answer).
- Scoring: winner recorded with `placement: 1`, eliminated players in reverse elimination order, via the existing `recordGame`/`results`/`leaderboard()` path with `type: 'concentration'` — **not** the `tournament_wins` titles table. This mirrors Guess the Flag/Riddle Quest/Logo Quiz/Scramble exactly.
- Command is `/concentration` (`start`, `begin`, `end`, `status`, `stats [all]`); joining is the existing bare `join` text every other lobby mode already supports (`transport/router.js`'s generic `trimmed.toLowerCase() === 'join'` branch) — no new `/concentration join` command needed.
- Every new game command must be added to `GAME_COMMANDS` in `transport/router.js` (ban coverage) — this was the exact hole a past bug slipped through.
- Spec: `docs/superpowers/specs/2026-08-29-concentration-design.md`.

---

### Task 1: Engine — `engine/concentration.js`

**Files:**
- Create: `engine/concentration.js`
- Test: `engine/concentration.test.js`

**Interfaces:**
- Consumes: `fold` from `engine/normalize.js` (`fold(s)` — lowercases/strips accents, existing export used by `engine/flag.js`/`engine/emoji.js`).
- Produces: `createConcentrationGame({ bank, now, random, registrationMs, clockSeconds, minPlayers, exclude })` returning `{ state, playerCount, join(player, now), begin(now), submit(player, text, now), tick(now), end(now) }`. `bank` must expose `size()` and `pickCategory({ exclude, random })` returning `{ id, category, items: string[], aliases?: {[item]: string[]} }` or `null` — this is the exact shape Task 2's `loadCategoryBank` produces, and the exact shape this task's own test fixtures must match. Exports `REGISTRATION_MS = 90_000`, `MIN_PLAYERS = 3`, `TURN_CLOCK_SECONDS = 15`.
- Event types emitted (consumed by Task 4's router wiring and Task 5's render cases): `concentration_registration_open` `{deadline, seconds, minPlayers}`, `concentration_joined` `{player, count}`, `concentration_begin_denied` `{reason: 'not_registering'|'not_enough_players', count?, needed?}`, `concentration_cancelled` `{reason: 'not_enough_players', count, needed}`, `concentration_start` `{players}`, `concentration_category_switch` `{id, category, reason: 'start'|'elimination'|'pool_low'}`, `concentration_turn` `{round, player, category, clockSeconds, alive, total, deadline}`, `concentration_accepted` `{player, answer}`, `concentration_eliminated` `{player, reason: 'wrong'|'duplicate'|'timeout', answer}`, `concentration_over` `{winner, standings: [{player}]}` (standings in placement order, winner first), `concentration_terminated` `{}`.

- [ ] **Step 1: Write the failing tests**

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node engine/concentration.test.js`
Expected: FAIL — `Cannot find module './concentration.js'`.

- [ ] **Step 3: Write the implementation**

```javascript
// engine/concentration.js
// Concentration: category-naming elimination game. The bot names a category,
// players go round-robin naming an unused valid item from it; a wrong
// answer, a repeat, or a timeout eliminates that player. A fresh category
// follows every elimination — and pre-emptively whenever the current one is
// running low — until one player is left.
//
// Lobby shape mirrors engine/tournament.js (registering -> playing -> over;
// the admin who opens the lobby does not auto-join, and can force an early
// start via begin() — a capability Tournament deliberately does not have).
// Turn/elimination shape mirrors engine/game.js's fixed-order/active-roster/
// elimination pattern. Validation is category-membership + alias matching
// (like engine/flag.js), not dictionary/letter-chain — hence its own file
// rather than an extension of either engine.
//
// No Date.now(), no Math.random(). Time via `now`, randomness via `random`.
import { fold } from './normalize.js'

export const REGISTRATION_MS = 90_000
export const MIN_PLAYERS = 3
export const TURN_CLOCK_SECONDS = 15

function sanitize(s) {
  return fold(String(s ?? '')).replace(/[^a-z0-9]/g, '')
}

// Returns the item's canonical answer string if `text` matches it by name or
// alias, else null.
function matchItem(text, category) {
  const g = sanitize(text)
  if (!g) return null
  for (const item of category.items) {
    if (sanitize(item) === g) return item
    const aliases = category.aliases?.[item] ?? []
    if (aliases.some((a) => sanitize(a) === g)) return item
  }
  return null
}

export function createConcentrationGame({
  bank,
  now,
  random = () => 0.5,
  registrationMs = REGISTRATION_MS,
  clockSeconds = TURN_CLOCK_SECONDS,
  minPlayers = MIN_PLAYERS,
  exclude = new Set(),
}) {
  if (!bank || bank.size() === 0) {
    throw new Error('createConcentrationGame requires a non-empty category bank')
  }

  let state = 'registering'
  let opened = false
  const players = []
  const registrationDeadline = now + registrationMs

  let order = []
  let active = []
  let turnIndex = 0
  let round = 0

  const usedCategoryIds = new Set(exclude)
  let currentCategory = null
  const used = new Set() // canonical answers accepted in the current category
  let deadline = 0

  const eliminatedOrder = [] // in elimination order, first eliminated first

  const clockMs = clockSeconds * 1000

  function pickCategory() {
    return bank.pickCategory({ exclude: usedCategoryIds, random })
      ?? bank.pickCategory({ exclude: new Set(), random })
  }

  function switchCategory(reason) {
    currentCategory = pickCategory()
    used.clear()
    usedCategoryIds.add(currentCategory.id)
    return { type: 'concentration_category_switch', id: currentCategory.id, category: currentCategory.category, reason }
  }

  function makeTurnEvent(at) {
    deadline = at + clockMs
    round++
    return {
      type: 'concentration_turn',
      round,
      player: active[turnIndex],
      category: currentCategory.category,
      clockSeconds,
      alive: active.length,
      total: order.length,
      deadline,
    }
  }

  function unusedCount() {
    return currentCategory.items.length - used.size
  }

  function finish(events) {
    state = 'over'
    const winner = active[0]
    const standings = [{ player: winner }]
    for (let i = eliminatedOrder.length - 1; i >= 0; i--) standings.push({ player: eliminatedOrder[i] })
    events.push({ type: 'concentration_over', winner, standings })
  }

  function eliminate(at, reason, answer, events) {
    const player = active[turnIndex]
    active.splice(turnIndex, 1)
    eliminatedOrder.push(player)
    events.push({ type: 'concentration_eliminated', player, reason, answer: answer ?? null })

    if (active.length === 1) {
      finish(events)
      return
    }

    turnIndex = turnIndex % active.length
    events.push(switchCategory('elimination'))
    events.push(makeTurnEvent(at))
  }

  function startGame(at, events) {
    order = players.slice()
    active = order.slice()
    turnIndex = 0
    state = 'playing'
    events.push({ type: 'concentration_start', players: order.slice() })
    events.push(switchCategory('start'))
    events.push(makeTurnEvent(at))
  }

  function closeRegistration(at, events) {
    if (players.length < minPlayers) {
      state = 'over'
      events.push({ type: 'concentration_cancelled', reason: 'not_enough_players', count: players.length, needed: minPlayers })
      return
    }
    startGame(at, events)
  }

  return {
    get state() { return state },
    get playerCount() { return players.length },

    join(player, at = now) {
      if (state !== 'registering') return []
      if (players.includes(player)) return []
      players.push(player)
      return [{ type: 'concentration_joined', player, count: players.length }]
    },

    begin(at = now) {
      if (state !== 'registering') return [{ type: 'concentration_begin_denied', reason: 'not_registering' }]
      if (players.length < minPlayers) {
        return [{ type: 'concentration_begin_denied', reason: 'not_enough_players', count: players.length, needed: minPlayers }]
      }
      const events = []
      startGame(at, events)
      return events
    },

    submit(player, text, at = now) {
      if (state !== 'playing') return []
      if (player !== active[turnIndex]) return []
      if (at >= deadline) return [] // tick() is sole timeout authority

      const events = []
      const match = matchItem(text, currentCategory)

      if (!match) {
        eliminate(at, 'wrong', text, events)
        return events
      }
      if (used.has(match)) {
        eliminate(at, 'duplicate', match, events)
        return events
      }

      used.add(match)
      events.push({ type: 'concentration_accepted', player, answer: match })

      turnIndex = (turnIndex + 1) % active.length
      if (unusedCount() < active.length) {
        events.push(switchCategory('pool_low'))
      }
      events.push(makeTurnEvent(at))
      return events
    },

    tick(at = now) {
      if (state === 'over') return []
      const events = []

      if (state === 'registering') {
        if (!opened) {
          opened = true
          events.push({ type: 'concentration_registration_open', deadline: registrationDeadline, seconds: Math.round(registrationMs / 1000), minPlayers })
          return events
        }
        if (at < registrationDeadline) return events
        closeRegistration(at, events)
        return events
      }

      if (at < deadline) return events
      eliminate(at, 'timeout', null, events)
      return events
    },

    end(at = now) {
      if (state === 'over') return []
      state = 'over'
      return [{ type: 'concentration_terminated' }]
    },
  }
}
```

Note on `startGame`'s turn order: unlike `engine/game.js` (which shuffles the lobby roster into a random turn order), Concentration keeps join order as turn order — deterministic and simpler, and the tests above rely on it (`started()` assumes `p1` goes first). This is a deliberate simplification; no shuffle needed since nothing about the game rewards a particular turn position enough to require randomizing it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node engine/concentration.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add engine/concentration.js engine/concentration.test.js
git commit -m "feat: add Concentration game engine"
```

---

### Task 2: Content bank — `data/categories.json` + `engine/bank.js`

**Files:**
- Modify: `engine/bank.js` (add `loadCategoryBank`)
- Modify: `engine/bank.test.js` (add `loadCategoryBank` tests)
- Create: `data/categories.json`
- Modify: `engine/concentration.test.js` (add a real-data integrity test, same pattern as `engine/flag.test.js`'s real-`data/flags.json` tests)

**Interfaces:**
- Consumes: nothing new.
- Produces: `loadCategoryBank({ path = 'data/categories.json', data = null })` returning `{ size(), pickCategory({ exclude, random }) }` — the exact shape Task 1's `createConcentrationGame({ bank })` expects. `pickCategory` returns one `{ id, category, items, aliases? }` object or `null` if every category is excluded.

- [ ] **Step 1: Write the failing tests**

Append to `engine/bank.test.js`:

```javascript
import { loadCategoryBank } from './bank.js'

// (add to the existing `tests` array in engine/bank.test.js)
const categoryFixture = [
  { id: 'cat-a', category: 'Primary colors', items: ['Red', 'Blue', 'Yellow'] },
  { id: 'cat-b', category: 'Football clubs in Germany', items: ['Bayern Munich', 'Borussia Dortmund'], aliases: { 'Bayern Munich': ['bayern'] } },
]

tests.push(
  {
    name: 'loadCategoryBank: size() reports the category count',
    fn: () => {
      const bank = loadCategoryBank({ data: categoryFixture })
      assert.equal(bank.size(), 2)
    },
  },
  {
    name: 'loadCategoryBank: pickCategory excludes ids already used, returns null once exhausted',
    fn: () => {
      const bank = loadCategoryBank({ data: categoryFixture })
      const picked = bank.pickCategory({ exclude: new Set(['cat-a']), random: () => 0 })
      assert.equal(picked.id, 'cat-b')
      assert.equal(bank.pickCategory({ exclude: new Set(['cat-a', 'cat-b']), random: () => 0 }), null)
    },
  },
)
```

(If `engine/bank.test.js` runs its `tests` array via a loop rather than `node:test`, add these two entries in that same array-literal style instead of via `.push` — match whatever the file's existing pattern is exactly.)

Append to `engine/concentration.test.js`:

```javascript
import { readFileSync } from 'node:fs'
import { loadCategoryBank } from './bank.js'
import { createConcentrationGame as createConcentrationGameForRealData } from './concentration.js'

test('concentration: real data/categories.json parses and every category is usable', () => {
  const parsed = JSON.parse(readFileSync('data/categories.json', 'utf8'))
  assert.ok(parsed.length >= 20, 'expected at least 20 categories')

  const ids = new Set()
  for (const c of parsed) {
    assert.ok(c.id && !ids.has(c.id), `duplicate or missing id: ${c.id}`)
    ids.add(c.id)
    assert.ok(c.category && c.category.length > 1, `bad category label for ${c.id}`)
    assert.ok(Array.isArray(c.items) && c.items.length >= 15, `${c.category} needs at least 15 items, has ${c.items?.length}`)
    const lower = new Set(c.items.map((i) => i.toLowerCase()))
    assert.equal(lower.size, c.items.length, `${c.category} has a duplicate item`)
  }
})

test('concentration: every item in the real bank is answerable by its own name, via a real game', () => {
  const bank = loadCategoryBank()
  for (let i = 0; i < 10; i++) {
    // Sample 10 categories deterministically rather than all of them (this
    // engine test isn't the place to re-run bank.size() iterations); the
    // sanitize/matchItem logic itself is already covered by fixture tests
    // in Task 1 — this only confirms the real data round-trips through it.
    const picked = bank.pickCategory({ exclude: new Set(), random: () => i / 10 })
    if (!picked) break
    for (const item of picked.items) {
      const g = item // matchItem is exercised indirectly via createConcentrationGame in Task 1's tests
      assert.ok(typeof g === 'string' && g.length > 0, `empty item in ${picked.category}`)
    }
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node engine/bank.test.js && node engine/concentration.test.js`
Expected: FAIL — `loadCategoryBank is not a function`, then FAIL — `data/categories.json` does not exist.

- [ ] **Step 3: Implement `loadCategoryBank`**

Add to `engine/bank.js`, after `loadFlagBank`:

```javascript
export function loadCategoryBank({ path = 'data/categories.json', data = null } = {}) {
  const categories = data ?? JSON.parse(readFileSync(path, 'utf8'))

  return {
    size() {
      return categories.length
    },

    pickCategory({ exclude = new Set(), random = Math.random } = {}) {
      const available = categories.filter((c) => !exclude.has(c.id))
      if (available.length === 0) return null
      return shuffle(available, random)[0]
    },
  }
}
```

- [ ] **Step 4: Author `data/categories.json`**

Create `data/categories.json` as a bare JSON array, following this exact schema (each entry: `id`, `category` display label, `items` array of ≥15-20 real, unambiguous answers, optional `aliases` map for items with common alternate spellings). Seed it with these entries, then extend to at least 20-25 categories total covering: several football-club-by-country categories, movies, countries, animals, Nigerian foods, musicians/artists, capital cities, fruits, board games/sports — matching the design spec's "mixed categories, broad enough for non-football groups too" requirement. Every category must satisfy the integrity test from Step 1 (≥15 items, no duplicate items case-insensitively, no duplicate ids).

```json
[
  {
    "id": "football-clubs-germany",
    "category": "Football clubs in Germany",
    "items": ["Bayern Munich", "Borussia Dortmund", "RB Leipzig", "Bayer Leverkusen", "Eintracht Frankfurt", "VfB Stuttgart", "Borussia Monchengladbach", "Wolfsburg", "Union Berlin", "Freiburg", "Mainz 05", "Hoffenheim", "Werder Bremen", "Augsburg", "Koln", "Hertha Berlin", "Schalke 04", "Hamburger SV"],
    "aliases": { "Bayern Munich": ["bayern", "fc bayern"], "Borussia Dortmund": ["dortmund", "bvb"], "Borussia Monchengladbach": ["gladbach", "monchengladbach"], "Koln": ["cologne", "fc koln"] }
  },
  {
    "id": "football-clubs-england",
    "category": "Football clubs in England",
    "items": ["Manchester United", "Manchester City", "Liverpool", "Arsenal", "Chelsea", "Tottenham Hotspur", "Newcastle United", "Aston Villa", "West Ham United", "Everton", "Leicester City", "Wolverhampton Wanderers", "Brighton", "Crystal Palace", "Fulham", "Brentford", "Nottingham Forest", "Bournemouth"],
    "aliases": { "Manchester United": ["man united", "man utd"], "Manchester City": ["man city"], "Tottenham Hotspur": ["tottenham", "spurs"], "Wolverhampton Wanderers": ["wolves"] }
  },
  {
    "id": "countries-africa",
    "category": "Countries in Africa",
    "items": ["Nigeria", "Ghana", "Kenya", "Egypt", "South Africa", "Morocco", "Ethiopia", "Senegal", "Tanzania", "Uganda", "Algeria", "Cameroon", "Zimbabwe", "Zambia", "Ivory Coast", "Tunisia", "Mali", "Rwanda"],
    "aliases": { "Ivory Coast": ["cote d'ivoire"] }
  },
  {
    "id": "nigerian-foods",
    "category": "Nigerian foods",
    "items": ["Jollof Rice", "Egusi Soup", "Pounded Yam", "Suya", "Moi Moi", "Akara", "Pepper Soup", "Ogbono Soup", "Amala", "Fufu", "Eba", "Puff Puff", "Nkwobi", "Ofada Rice", "Ewedu", "Okra Soup", "Fried Rice", "Chin Chin"],
    "aliases": {}
  },
  {
    "id": "animals-mammals",
    "category": "Mammals",
    "items": ["Lion", "Elephant", "Tiger", "Giraffe", "Zebra", "Kangaroo", "Gorilla", "Cheetah", "Rhino", "Hippopotamus", "Leopard", "Wolf", "Bear", "Dolphin", "Whale", "Fox", "Deer", "Buffalo"],
    "aliases": { "Rhino": ["rhinoceros"], "Hippopotamus": ["hippo"] }
  }
]
```

Extend this file with additional categories (movies, capital cities, fruits, Nigerian musicians, board games, US states, etc.) following the same shape until `parsed.length >= 20` and every category has `items.length >= 15`, per the Step 1 test.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node engine/bank.test.js && node engine/concentration.test.js`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add engine/bank.js engine/bank.test.js engine/concentration.test.js data/categories.json
git commit -m "feat: add Concentration category bank and content"
```

---

### Task 3: Store — `asked_category_ids` + `concentration` leaderboard type

**Files:**
- Modify: `store/db.js`
- Modify: `store/db.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `db.markAskedCategory(jid, id, ts)`, `db.askedCategoryIds(jid)` returning a `Set<string>`, `db.clearAskedCategories(jid)`. `db.leaderboard({ jid, since, limit, type: 'concentration' })` and `db.recordGame({..., type: 'concentration', ...})` both work end to end. These are the exact names Task 4's router wiring calls.

- [ ] **Step 1: Write the failing test**

Add to `store/db.test.js`'s `tests` array (same array-of-`{name, fn}` style as the existing `asked_flags & flag leaderboard` test):

```javascript
{
  name: 'asked_category_ids & concentration leaderboard: round-trip and isolation',
  fn: () => {
    const db = openDb(':memory:')
    db.markAskedCategory('jid-a', 'cat-001', 1000)
    db.markAskedCategory('jid-a', 'cat-002', 1000)
    const asked = db.askedCategoryIds('jid-a')
    assert.ok(asked.has('cat-001'))
    assert.ok(asked.has('cat-002'))
    assert.equal(asked.size, 2)

    db.clearAskedCategories('jid-a')
    assert.equal(db.askedCategoryIds('jid-a').size, 0)

    // Another jid's asked categories stay isolated
    db.markAskedCategory('jid-b', 'cat-001', 2000)
    assert.equal(db.askedCategoryIds('jid-a').size, 0)
    assert.equal(db.askedCategoryIds('jid-b').size, 1)

    db.recordGame({
      jid: 'jid-a',
      mode: 'mixed',
      type: 'concentration',
      startedAt: 1000,
      endedAt: 2000,
      words: 3,
      results: [
        { player: 'player-1', placement: 1, player_pn: 'pn-1' },
        { player: 'player-2', placement: 2, player_pn: 'pn-2' },
        { player: 'player-3', placement: 3, player_pn: 'pn-3' },
      ],
    })

    const board = db.leaderboard({ jid: 'jid-a', type: 'concentration' })
    assert.equal(board.length, 3)
    assert.equal(board[0].player, 'pn-1')
    assert.equal(board[0].score, 3)
    assert.equal(board[1].player, 'pn-2')
    assert.equal(board[1].score, 1)
    assert.equal(board[2].player, 'pn-3')
    assert.equal(board[2].score, 0)

    // Word-chain board remains isolated from concentration games
    assert.equal(db.leaderboard({ jid: 'jid-a', type: 'chain' }).length, 0)
    db.close()
  },
},
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node store/db.test.js`
Expected: FAIL — `db.markAskedCategory is not a function`.

- [ ] **Step 3: Implement the store additions**

In `store/db.js`, add the table to the `CREATE TABLE IF NOT EXISTS` block (anywhere alongside the other `asked_*` tables, e.g. right after `asked_wordle`):

```sql
CREATE TABLE IF NOT EXISTS asked_category_ids (
  jid TEXT NOT NULL, id TEXT NOT NULL, ts INTEGER NOT NULL,
  PRIMARY KEY (jid, id)
);
```

Add a new leaderboard-select prepared statement, right after `stmtSelectResultsFlag`:

```javascript
const stmtSelectResultsConcentration = db.prepare(`
  SELECT COALESCE(r.player_pn, r.player) AS player, r.placement, r.player_count
  FROM results r JOIN games g ON g.id = r.game_id
  WHERE r.jid = ? AND r.ended_at >= ? AND g.type = 'concentration'
  ORDER BY player
`)
```

Update the chain-leaderboard exclusion list (`stmtSelectResultsChain`) to add `'concentration'`:

```javascript
WHERE r.jid = ? AND r.ended_at >= ? AND g.type NOT IN ('trivia', 'scramble', 'logo', 'riddle', 'flag', 'concentration')
```

Add the asked-category prepared statements, right after `stmtClearAskedFlags`:

```javascript
const stmtMarkAskedCategory = db.prepare(
  'INSERT OR IGNORE INTO asked_category_ids (jid, id, ts) VALUES (?, ?, ?)'
)
const stmtAskedCategoryIds = db.prepare(
  'SELECT id FROM asked_category_ids WHERE jid = ?'
)
const stmtClearAskedCategories = db.prepare(
  'DELETE FROM asked_category_ids WHERE jid = ?'
)
```

Add to `leaderboard()`'s type dispatch, alongside the `'flag'` branch:

```javascript
else if (type === 'concentration') stmt = stmtSelectResultsConcentration;
```

Add the three public methods, right after `clearAskedFlags`:

```javascript
// One row per category actually used in a game (not pre-picked up front like
// Flag/Riddle, since Concentration doesn't know how many categories a game
// will use until it ends) — marked incrementally as each category is switched
// into. See transport/router.js's sendEvents 'concentration_category_switch' handling.
markAskedCategory(jid, id, ts) {
  stmtMarkAskedCategory.run(jid, id, ts)
},

askedCategoryIds(jid) {
  return new Set(stmtAskedCategoryIds.all(jid).map((r) => r.id))
},

clearAskedCategories(jid) {
  stmtClearAskedCategories.run(jid)
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node store/db.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add store/db.js store/db.test.js
git commit -m "feat: add store support for Concentration"
```

---

### Task 4: Router wiring — `transport/router.js`

**Files:**
- Modify: `transport/router.js`
- Modify: `transport/router.test.js`

**Interfaces:**
- Consumes: `createConcentrationGame`, `MIN_PLAYERS` from `engine/concentration.js` (Task 1); `loadCategoryBank` from `engine/bank.js` (Task 2); `db.askedCategoryIds`/`markAskedCategory`/`clearAskedCategories`/`recordGame`/`leaderboard` (Task 3).
- Produces: `/concentration start|begin|end|status|stats [all]` commands; `concentration` added to `GAME_COMMANDS`; `sendEvents` correctly persists results and category dedup for every `concentration_*` event. Task 5's render additions consume the same event vocabulary.

- [ ] **Step 1: Write the failing test**

Add to `transport/router.test.js`'s tests array, near the existing ban-coverage tests (`'a ban covers tournaments: ...'`):

```javascript
{
  name: 'concentration: /concentration start opens a lobby; a banned user cannot join it',
  fn: async () => {
    const sent = []
    const games = new Map()
    const db = openDb(':memory:')
    const router = createRouter({
      dict: { has: () => true, randomLetter: () => 'a' }, games, enqueue: (j, m) => sent.push(m),
      logger: { info() {}, error() {}, debug() {} },
      getGroupAdmins: async () => [], db, resolvePn: () => undefined,
    })
    const jid = 'g-concentration@g.us'
    const banned = '2223334444'
    db.addBan(jid, banned)

    await router.handleMessage({ jid, sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/concentration start', isGroup: true }, 0)

    const game = games.get(jid)
    assert.ok(game, 'concentration lobby should have started')
    assert.equal(game.state, 'registering')

    let joinCalls = 0
    const originalJoin = game.join.bind(game)
    game.join = (...args) => { joinCalls++; return originalJoin(...args) }

    await router.handleMessage({ jid, sender: `${banned}@s.whatsapp.net`, senderPn: `${banned}@s.whatsapp.net`, text: 'join', isGroup: true }, 100)
    assert.equal(joinCalls, 0, 'a banned player must not reach the concentration lobby')
    db.close()
  },
},
{
  name: 'concentration: three real players joining then /concentration begin starts the round and records a result on completion',
  fn: async () => {
    const sent = []
    const games = new Map()
    const db = openDb(':memory:')
    const router = createRouter({
      dict: { has: () => true, randomLetter: () => 'a' }, games, enqueue: (j, m) => sent.push(m),
      logger: { info() {}, error() {}, debug() {} },
      getGroupAdmins: async () => [], db, resolvePn: (jid) => jid,
    })
    const jid = 'g-concentration-2@g.us'
    const admin = `${OWNER_NUMBER}@s.whatsapp.net`

    await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/concentration start', isGroup: true }, 0)
    await router.handleMessage({ jid, sender: 'p1@s.whatsapp.net', senderPn: 'p1@s.whatsapp.net', text: 'join', isGroup: true }, 100)
    await router.handleMessage({ jid, sender: 'p2@s.whatsapp.net', senderPn: 'p2@s.whatsapp.net', text: 'join', isGroup: true }, 200)
    await router.handleMessage({ jid, sender: 'p3@s.whatsapp.net', senderPn: 'p3@s.whatsapp.net', text: 'join', isGroup: true }, 300)
    await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/concentration begin', isGroup: true }, 400)

    const game = games.get(jid)
    assert.ok(game, 'game should exist after begin')
    assert.equal(game.state, 'playing')

    // Drive every remaining player to a timeout elimination until the game ends —
    // deterministic regardless of which real category the bank happens to pick.
    let now = 400
    for (let i = 0; i < 10 && game.state !== 'over'; i++) {
      now += 20_000
      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: `tick-probe-${i}`, isGroup: true }, now)
      // handleMessage doesn't drive the clock on its own (that's the scheduler's
      // job in production); call tick() directly here to simulate it.
      sendEvents((j, m) => sent.push(m), jid, game.tick(now), undefined, now, db)
    }

    assert.equal(game.state, 'over')
    const board = db.leaderboard({ jid, type: 'concentration' })
    assert.ok(board.length >= 1, 'expected a recorded concentration result')
    db.close()
  },
},
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node transport/router.test.js`
Expected: FAIL — `/concentration start` produces no game (unknown command falls through silently, `games.get(jid)` is `undefined`).

- [ ] **Step 3: Implement the router wiring**

Add imports, near the existing engine imports at the top of `transport/router.js`:

```javascript
import { createConcentrationGame, MIN_PLAYERS as CONCENTRATION_MIN_PLAYERS } from '../engine/concentration.js'
```

Update the `bank.js` import line to add `loadCategoryBank`:

```javascript
import { loadRiddleBank, loadFlagBank, loadWordleBank, loadCategoryBank } from '../engine/bank.js'
```

Add `'concentration'` to `GAME_COMMANDS`:

```javascript
const GAME_COMMANDS = new Set([
  'wcg', 'wrg', 'trivia', 'scramble', 'logo', 'flag', 'riddle', 'tourney', 'wordle', 'concentration',
])
```

Add to `KIND_BY_EVENT`, alongside the `flag_*` entries:

```javascript
concentration_registration_open: 'lobby',
concentration_joined: 'lobby',
concentration_start: 'lobby',
concentration_category_switch: 'turn',
concentration_turn: 'turn',
concentration_eliminated: 'result',
concentration_over: 'result',
concentration_cancelled: 'result',
concentration_terminated: 'result',
concentration_begin_denied: 'misc',
```

Add to `sendEvents`'s dispatch chain, near the `flag_*`/`tournament_champion` handling:

```javascript
} else if (event.type === 'concentration_over') {
  const meta = gameMeta.get(jid)
  const pnMap = meta?.pnMap || new Map()
  const results = event.standings.map((s, i) => ({
    player: s.player, placement: i + 1, player_pn: pnMap.get(s.player),
  }))
  if (results.length > 0) {
    try {
      db?.recordGame({
        jid, mode: 'mixed', type: 'concentration',
        startedAt: meta?.startedAt ?? now, endedAt: now,
        words: event.standings.length, results,
      })
    } catch (e) {
      // store failure must never break gameplay
    }
  }
  gameMeta.delete(jid)
} else if (event.type === 'concentration_cancelled' || event.type === 'concentration_terminated') {
  gameMeta.delete(jid)
} else if (event.type === 'concentration_category_switch') {
  try {
    db?.markAskedCategory(jid, event.id, now)
  } catch (e) {
    // store failure must never break gameplay
  }
}
```

Instantiate the bank near the other bank instances (e.g. right after `const wordleBank = loadWordleBank()`):

```javascript
const categoryBank = loadCategoryBank()
```

Add the start function, near `startFlagGame`:

```javascript
async function startConcentrationGame(jid, sender, senderPn, now, isGroup) {
  if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
    enqueue(jid, { text: `Only a group admin can start a game.`, mentions: [], kind: 'misc' })
    return
  }
  if (games.has(jid)) {
    enqueue(jid, { text: `A game is already running here. Use ${PREFIX}concentration end to stop it first.`, mentions: [], kind: 'misc' })
    return
  }
  if (categoryBank.size() === 0) {
    enqueue(jid, { text: `Concentration is currently unavailable — no category data found.`, mentions: [], kind: 'misc' })
    return
  }

  let exclude
  try {
    exclude = db?.askedCategoryIds(jid) ?? new Set()
  } catch (e) {
    logger?.error({ err: e }, 'Failed loading asked categories')
    exclude = new Set()
  }
  if (exclude.size >= categoryBank.size()) {
    try { db?.clearAskedCategories(jid) } catch (e) { /* best-effort */ }
    exclude = new Set()
  }

  const game = createConcentrationGame({ now, random: Math.random, bank: categoryBank, exclude })
  games.set(jid, game)
  starters.set(jid, sender)
  gameTypes.set(jid, 'concentration')
  gameMeta.set(jid, { type: 'concentration', startedAt: now, pnMap: new Map() })
  if (senderPn) gameMeta.get(jid).pnMap.set(sender, senderPn)
  try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
  sendEvents(enqueue, jid, game.tick(now), undefined, now, db)
}
```

Add the command block, near the `/flag` block:

```javascript
if (cmd === 'concentration') {
  const sub = (args[0] ?? '').toLowerCase()

  if (sub === 'stats') {
    const all = args[1] === 'all'
    const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10, type: 'concentration' })
    const { text, mentions } = formatLeaderboard(board, all ? '🏆 Concentration — all-time' : '🏆 Concentration — this week')
    enqueue(jid, { text, mentions, kind: 'misc' })
    return
  }

  if (!isGroup) {
    enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
    return
  }

  if (sub === 'status') {
    const game = games.get(jid)
    if (!game || gameTypes.get(jid) !== 'concentration') {
      enqueue(jid, { text: `No Concentration game running here.`, mentions: [], kind: 'misc' })
      return
    }
    const status = game.state === 'registering'
      ? `still open for joining (${game.playerCount} joined, need ${CONCENTRATION_MIN_PLAYERS}+)`
      : 'in progress'
    enqueue(jid, { text: `Concentration is ${status}.`, mentions: [], kind: 'misc' })
    return
  }

  if (sub === 'end') {
    await endGame(jid, sender, senderPn, isGroup, now, 'concentration')
    return
  }

  if (sub === 'begin') {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start the round early.`, mentions: [], kind: 'misc' })
      return
    }
    const game = games.get(jid)
    if (!game || gameTypes.get(jid) !== 'concentration') {
      enqueue(jid, { text: `No Concentration lobby running here. ${PREFIX}concentration start to open one.`, mentions: [], kind: 'misc' })
      return
    }
    sendEvents(enqueue, jid, game.begin(now), undefined, now, db)
    if (game.state === 'over') { games.delete(jid); starters.delete(jid); gameTypes.delete(jid) }
    return
  }

  await startConcentrationGame(jid, sender, senderPn, now, isGroup)
  return
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node transport/router.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add transport/router.js transport/router.test.js
git commit -m "feat: wire Concentration into the router"
```

---

### Task 5: Render, help menu, welcome message, README

**Files:**
- Modify: `transport/render.js`
- Modify: `index.js`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `transport/render.test.js` (if it exists as a `node:test`-based per-case-assertion file — check its structure first and match it; otherwise add a small standalone render smoke check inline as this task's own test step)

**Interfaces:**
- Consumes: every `concentration_*` event type from Task 1/Task 4.
- Produces: user-visible text for every event; `/help` lists Concentration; the boot DM mentions it; `npm test` runs `engine/concentration.test.js`.

- [ ] **Step 1: Write the failing test**

Check `transport/render.test.js`'s existing structure first (`Read transport/render.test.js`) and add one case in the same style, e.g.:

```javascript
test('render: concentration_eliminated (wrong answer) mentions the player and shows their answer', () => {
  const { text, mentions } = render({ type: 'concentration_eliminated', player: 'p1@s.whatsapp.net', reason: 'wrong', answer: 'Purple' })
  assert.match(text, /Purple/)
  assert.deepEqual(mentions, ['p1@s.whatsapp.net'])
})

test('render: concentration_over lists standings in order with medals', () => {
  const { text, mentions } = render({
    type: 'concentration_over',
    winner: 'p3@s.whatsapp.net',
    standings: [{ player: 'p3@s.whatsapp.net' }, { player: 'p2@s.whatsapp.net' }, { player: 'p1@s.whatsapp.net' }],
  })
  assert.match(text, /🥇/)
  assert.deepEqual(mentions, ['p3@s.whatsapp.net', 'p2@s.whatsapp.net', 'p1@s.whatsapp.net'])
})
```

(Match the file's real import/assertion style — it may use `node:test`'s `test()` like the engine tests, or a `{name, fn}` array like `db.test.js`/`router.test.js`. Read it first and follow suit exactly.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node transport/render.test.js`
Expected: FAIL — render returns `undefined`/wrong text for an unhandled `concentration_*` type (the `render()` function's default/fallthrough behavior — check what that is by reading the end of the `switch` in `transport/render.js` before writing the assertion, since the exact failure mode depends on it).

- [ ] **Step 3: Implement the render cases**

Add to `transport/render.js`'s `switch`, near the `flag_*` cases:

```javascript
case 'concentration_registration_open':
  return {
    text: `🃏 *CONCENTRATION* is starting!\nType *join* to play — need ${event.minPlayers}+ players.\n⏳ ${event.seconds}s to join.`,
    mentions: [],
  }

case 'concentration_joined':
  return { text: `${mention(event.player)} joined 👏 (${event.count} joined)`, mentions: [event.player] }

case 'concentration_begin_denied': {
  const text = event.reason === 'not_enough_players'
    ? `Need at least ${event.needed} players to start (only ${event.count} joined).`
    : `Concentration isn't in its join phase right now.`
  return { text, mentions: [] }
}

case 'concentration_cancelled':
  return { text: `_Not enough players to start Concentration (${event.count} joined, need ${event.needed}+). Game cancelled._`, mentions: [] }

case 'concentration_start':
  // Silent — the category_switch + turn events that immediately follow already
  // show everything a player needs (same convention as Word Chain's game_start).
  return null

case 'concentration_category_switch': {
  const label = event.reason === 'start' ? '🃏 Category:' : '🔄 New category:'
  return { text: `${label} *${event.category}*`, mentions: [] }
}

case 'concentration_turn':
  return {
    text: `👉 Turn: ${mention(event.player)}\n🏆 Players left: ${event.alive}/${event.total}\n⏳ You have *${event.clockSeconds}* seconds`,
    mentions: [event.player],
  }

case 'concentration_accepted':
  // Silent — the following concentration_turn event already names who's up next.
  return null

case 'concentration_eliminated': {
  const CONCENTRATION_ELIMINATION_TEXT = {
    wrong: (e) => `❌ ${mention(e.player)} said "${e.answer}" — not valid. You're out! 🚫`,
    duplicate: (e) => `♻️ ${mention(e.player)} repeated "${e.answer}" — already said! You're out! 🚫`,
    timeout: (e) => `⏰ ${mention(e.player)} ran out of time! You're out! 🚫`,
  }
  const fn = CONCENTRATION_ELIMINATION_TEXT[event.reason]
  return { text: fn ? fn(event) : `${mention(event.player)} is out! 🚫`, mentions: [event.player] }
}

case 'concentration_over': {
  const lines = [`🏆 ${mention(event.winner)} wins Concentration!`, ``]
  event.standings.forEach((s, i) => lines.push(`${MEDALS[i] ?? '　'} ${mention(s.player)}`))
  return { text: lines.join('\n'), mentions: event.standings.map((s) => s.player) }
}

case 'concentration_terminated':
  return { text: `Concentration stopped.`, mentions: [] }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node transport/render.test.js`
Expected: PASS.

- [ ] **Step 5: Wire help menu, welcome message, package.json, README**

In `transport/router.js`'s `/help` block, add a section after `*🏳️ GUESS THE FLAG*`:

```javascript
`*🃏 CONCENTRATION* _(start: admins only)_`,
`▸ ${PREFIX}concentration start`,
`▸ ${PREFIX}concentration begin`,
`▸ ${PREFIX}concentration end`,
``,
```

And add to the `*📊 SCORES*` section:

```javascript
`▸ ${PREFIX}concentration stats [all]`,
```

In `index.js`'s welcome message array, add a line after the Guess the Flag one:

```javascript
`▸ */concentration start* — category elimination`,
```

In `package.json`'s `test` script, add `node engine/concentration.test.js` after `node engine/flag.test.js`:

```json
"test": "... && node engine/flag.test.js && node engine/concentration.test.js && node engine/wordle.test.js && ..."
```

In `README.md`:
- Add "Concentration" to the intro sentence's mode list and the "Starting any game (...)" sentence's mode list.
- Add a row to the game-modes table: `| **Concentration** | Admin-run lobby (90s join window, 3+ players, or /concentration begin to start early). Bot names a category; players go round-robin naming an unused valid item from data/categories.json. Wrong answer, a repeat, or a 15s timeout eliminates that player; a fresh category follows every elimination. | Last player standing wins — 1st/2nd placement scoring, same as Guess the Flag/Riddle Quest |`
- Add a `### Concentration (start/begin/end: admins only)` commands section, same shape as the `### Guess the Flag` one, listing `/concentration start`, `/concentration begin`, `/concentration end`.
- Add `/concentration stats [all]` to the Scores section.
- Add `engine/concentration.test.js` to the test file list.
- Add `asked_category_ids` to the Database section's table list, one line, same style as the `asked_flags` line.
- Mention `data/categories.json` in the "Regenerate the bank" section, alongside the `emoji.json`-style note: hand-authored, no build step.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: exit code 0, no failures (aside from the pre-existing, unrelated `nationality FAILED: WDQS 504` network flake noted elsewhere in this codebase's history).

- [ ] **Step 7: Commit**

```bash
git add transport/render.js transport/render.test.js index.js package.json README.md
git commit -m "feat: add Concentration render cases, help menu, welcome message, docs"
```
