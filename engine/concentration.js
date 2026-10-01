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

export const REGISTRATION_MS = 60_000
export const MIN_PLAYERS = 2
export const TURN_CLOCK_SECONDS = 15
export const START_DELAY_MS = 5_000

function sanitize(s) {
  return fold(String(s ?? '')).replace(/[^a-z0-9]/g, '')
}

// Returns the item's canonical answer string if `text` matches it by name,
// alias, or a validator-approved extra for the current game, else null.
function matchItem(text, category, extraItems) {
  const g = sanitize(text)
  if (!g) return null
  for (const item of category.items) {
    if (sanitize(item) === g) return item
    const aliases = category.aliases?.[item] ?? []
    if (aliases.some((a) => sanitize(a) === g)) return item
  }
  if (extraItems?.has(g)) return extraItems.get(g)
  return null
}

export function createConcentrationGame({
  bank,
  now,
  random = () => 0.5,
  registrationMs = REGISTRATION_MS,
  clockSeconds = TURN_CLOCK_SECONDS,
  minPlayers = MIN_PLAYERS,
  startDelayMs = START_DELAY_MS,
  exclude = new Set(),
}) {
  if (!bank || bank.size() === 0) {
    throw new Error('createConcentrationGame requires a non-empty category bank')
  }

  let state = 'registering'
  let opened = false
  const players = []
  const registrationDeadline = now + registrationMs
  let startDeadline = 0
  let pendingSwitchReason = 'start' // which reason the deferred category reveal carries

  let order = []
  let active = []
  let turnIndex = 0
  let round = 0

  const usedCategoryIds = new Set(exclude)
  let currentCategory = null
  const used = new Set() // canonical answers accepted in the current category
  let extraItems = new Map() // sanitized -> canonical, validator-approved answers for the current category
  let deadline = 0

  const eliminatedOrder = [] // in elimination order, first eliminated first
  let pendingEliminatedIndex = -1 // active[]-index to reinsert at if reinstate() undoes the pending elimination
  let pendingFinish = false // true when the pending 'starting' pause is for the game-ending elimination

  const clockMs = clockSeconds * 1000

  function pickCategory() {
    return bank.pickCategory({ exclude: usedCategoryIds, random })
      ?? bank.pickCategory({ exclude: new Set(), random })
  }

  function switchCategory(reason) {
    currentCategory = pickCategory()
    used.clear()
    extraItems.clear()
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
    return currentCategory.items.length + extraItems.size - used.size
  }

  function finish(events) {
    state = 'over'
    const winner = active[0]
    const standings = [{ player: winner }]
    for (let i = eliminatedOrder.length - 1; i >= 0; i--) standings.push({ player: eliminatedOrder[i] })
    events.push({ type: 'concentration_over', winner, standings })
  }

  function eliminate(at, reason, answer, events) {
    const idx = turnIndex
    const player = active[idx]
    active.splice(idx, 1)
    eliminatedOrder.push(player)
    // `category` lets a caller (e.g. a background answer validator) know what
    // the rejected answer was judged against, without needing to track it separately.
    events.push({ type: 'concentration_eliminated', player, reason, answer: answer ?? null, category: currentCategory.category })

    turnIndex = idx % active.length
    pendingEliminatedIndex = idx
    // Same deferred-reveal pause as the game's opening: the elimination message
    // lands alone, then the next category arrives startDelayMs later, so players
    // get a beat to react instead of the whole batch hitting at once. This same
    // pause is also the window reinstate() can still undo a 'wrong' elimination in
    // — including the game-ending elimination (active.length === 1), which must
    // get the same pause/reinstate chance as any other, hence pendingFinish
    // instead of calling finish() immediately.
    state = 'starting'
    startDeadline = at + startDelayMs
    pendingSwitchReason = 'elimination'
    pendingFinish = active.length === 1
  }

  // Heads-up: announce the roster now, then wait startDelayMs before the
  // first category/turn actually lands — same deferred-tick pattern as
  // engine/tournament.js's MATCH_START_DELAY_MS (Fix 2), so the "who's
  // playing" message and the first prompt never arrive in the same batch.
  function enterStartingPhase(at, events) {
    order = players.slice()
    active = order.slice()
    turnIndex = 0
    round = 0
    state = 'starting'
    startDeadline = at + startDelayMs
    pendingSwitchReason = 'start'
    events.push({ type: 'concentration_start', players: order.slice(), seconds: Math.round(startDelayMs / 1000) })
  }

  function revealNextCategory(at, events) {
    state = 'playing'
    events.push(switchCategory(pendingSwitchReason))
    events.push(makeTurnEvent(at))
  }

  function closeRegistration(at, events) {
    if (players.length < minPlayers) {
      state = 'over'
      events.push({ type: 'concentration_cancelled', reason: 'not_enough_players', count: players.length, needed: minPlayers })
      return
    }
    enterStartingPhase(at, events)
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
      enterStartingPhase(at, events)
      return events
    },

    submit(player, text, at = now) {
      if (state !== 'playing') return []
      if (player !== active[turnIndex]) return []
      if (at >= deadline) return [] // tick() is sole timeout authority

      const events = []
      const match = matchItem(text, currentCategory, extraItems)

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

      if (state === 'starting') {
        if (at < startDeadline) return events
        if (pendingFinish) {
          pendingFinish = false
          finish(events)
          return events
        }
        revealNextCategory(at, events)
        return events
      }

      if (at < deadline) return events
      eliminate(at, 'timeout', null, events)
      return events
    },

    // Undoes the most recent elimination — used when a background answer
    // validator later confirms a 'wrong'-rejected answer was actually valid.
    // Only possible while still paused in the post-elimination 'starting'
    // window (see eliminate()) and only for the same elimination that's still
    // pending: if the window already closed (next category revealed, or the
    // game ended), it's too late to undo cleanly and this is a no-op — the
    // caller falls back to logging the miss for manual review instead.
    // Otherwise it replays the accept path exactly as if `answer` had matched
    // the first time: same category, same used-set, turn advances normally.
    reinstate(player, answer, at = now) {
      if (state !== 'starting' || pendingSwitchReason !== 'elimination') return []
      if (eliminatedOrder[eliminatedOrder.length - 1] !== player) return []

      eliminatedOrder.pop()
      const insertAt = Math.min(pendingEliminatedIndex, active.length)
      active.splice(insertAt, 0, player)
      // Make the validator-approved answer a first-class member of the current
      // category (not just `used`), so a later repeat is caught as 'duplicate'
      // instead of falling through matchItem() as 'wrong' forever (the soft-lock).
      extraItems.set(sanitize(answer), answer)
      used.add(answer)

      const events = [{ type: 'concentration_reinstated', player, answer }]
      turnIndex = (insertAt + 1) % active.length
      pendingFinish = false
      state = 'playing'
      if (unusedCount() < active.length) {
        events.push(switchCategory('pool_low'))
      }
      events.push(makeTurnEvent(at))
      return events
    },

    end(at = now) {
      if (state === 'over') return []
      state = 'over'
      return [{ type: 'concentration_terminated' }]
    },
  }
}
