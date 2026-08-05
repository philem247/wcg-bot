// Pure game engine. No transport/, no config.js, no Date.now(), no Math.random().
// All time comes in via `now` args, all randomness via the injected `random` fn.
//
// Design notes not spelled out verbatim in the spec (documented per instructions):
// - `createGame` never returns events (only join/submit/tick/end do). The lobby's
//   `lobby_open` (+ the starter's `joined`) is therefore emitted lazily, the first
//   time `tick` or `join` is called on the game. In practice the scheduler's first
//   `pump` after a game is added to the map delivers it.
// - `ended: 'no_players'` can only happen via `end()` on an empty lobby, since this
//   phase has no `leave()` method.

import { validate } from './validate.js'
import {
  LOBBY_WINDOW_MS,
  MIN_PLAYERS,
  RAMP_LENGTH_EVERY_ROUNDS,
  RAMP_CLOCK_EVERY_ROUNDS,
  RAMP_MIN_LENGTH_STEP,
  RAMP_MIN_LENGTH_CAP,
  RAMP_CLOCK_STEP_S,
  RAMP_CLOCK_FLOOR_S,
  getMode,
} from './modes.js'

const REMINDER_THRESHOLDS_S = [30, 10]

function shuffle(arr, random) {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function createGame({ mode = 'easy', type = 'chain', dict, starter, now, random = () => 0.5 } = {}) {
  const modeCfg = getMode(mode)

  let state = 'lobby'
  let announced = false
  const players = [starter] // lobby roster
  const lobbyDeadline = now + LOBBY_WINDOW_MS
  const remindersSent = new Set()

  let order = [] // fixed turn order once game starts
  let active = [] // current alive rotation (subset of order, order-preserving)
  let turnIndex = 0
  let roundsCompleted = 0
  let curMinLength = modeCfg.minLength
  let curClockSeconds = modeCfg.clockSeconds
  let gameStartAt = 0

  let currentPlayer = null
  let currentLetter = null
  let currentDeadline = 0
  let lastWordLastLetter = null // chain mode only

  const used = new Set()
  let longestWord = ''
  let longestBy = null

  const queuedList = []

  function nextLetter() {
    if (type === 'random') return dict.randomLetter()
    // chain: same rule as `random` for the very first turn (no previous word yet),
    // then the last letter of the previous word for every turn after.
    return lastWordLastLetter ?? dict.randomLetter()
  }

  function ensureAnnounced(events) {
    if (announced) return
    announced = true
    events.push({ type: 'lobby_open', deadline: lobbyDeadline, mode, gameType: type })
    events.push({ type: 'joined', player: starter, count: players.length })
  }

  function makeTurnEvent(now) {
    const player = active[turnIndex]
    const next = active[(turnIndex + 1) % active.length]
    const letter = nextLetter()
    const deadline = now + curClockSeconds * 1000

    currentPlayer = player
    currentLetter = letter
    currentDeadline = deadline

    return {
      type: 'turn',
      player,
      next,
      letter,
      minLength: curMinLength,
      seconds: curClockSeconds,
      alive: active.length,
      total: order.length,
      totalWords: used.size,
      deadline,
    }
  }

  function maybeApplyRamp(events) {
    const prevLength = curMinLength
    const prevClock = curClockSeconds

    if (roundsCompleted % RAMP_LENGTH_EVERY_ROUNDS === 0) {
      curMinLength = Math.min(curMinLength + RAMP_MIN_LENGTH_STEP, RAMP_MIN_LENGTH_CAP)
    }
    if (roundsCompleted % RAMP_CLOCK_EVERY_ROUNDS === 0) {
      curClockSeconds = Math.max(curClockSeconds - RAMP_CLOCK_STEP_S, RAMP_CLOCK_FLOOR_S)
    }

    // Only emit ramp event if at least one value actually changed
    if (curMinLength !== prevLength || curClockSeconds !== prevClock) {
      events.push({ type: 'ramp', round: roundsCompleted, minLength: curMinLength, seconds: curClockSeconds })
    }
  }

  function advanceSameSize(now, events) {
    // active.length unchanged (accept, or a life-lost-but-not-eliminated timeout)
    turnIndex = (turnIndex + 1) % active.length
    if (turnIndex === 0) {
      roundsCompleted++
      maybeApplyRamp(events)
    }
    events.push(makeTurnEvent(now))
  }

  function declareWinner(now, events) {
    state = 'over'
    const player = active[0]
    events.push({
      type: 'winner',
      player,
      totalWords: used.size,
      longestWord,
      longestBy,
      elapsedMs: now - gameStartAt,
    })
  }

  function eliminateCurrent(now, events) {
    const player = active[turnIndex]
    active.splice(turnIndex, 1)
    events.push({ type: 'eliminated', player, reason: 'timeout' })

    if (active.length === 1) {
      declareWinner(now, events)
      return
    }
    if (active.length === 0) {
      // Edge case: cannot happen via normal play (winner fires at length 1), guarded anyway.
      state = 'over'
      events.push({ type: 'ended', reason: 'no_players' })
      return
    }

    turnIndex = turnIndex % active.length
    if (turnIndex === 0) {
      roundsCompleted++
      maybeApplyRamp(events)
    }
    events.push(makeTurnEvent(now))
  }

  function startGame(now, events) {
    order = shuffle(players, random)
    active = order.slice()
    turnIndex = 0
    roundsCompleted = 0
    gameStartAt = now
    state = 'playing'
    events.push({ type: 'game_start', players: order.slice() })
    events.push(makeTurnEvent(now))
  }

  return {
    get state() {
      return state
    },
    get queued() {
      return queuedList.slice()
    },

    join(player, now) {
      if (state === 'over') return []
      const events = []

      if (state === 'lobby') {
        ensureAnnounced(events)
        if (players.includes(player)) return events
        players.push(player)
        events.push({ type: 'joined', player, count: players.length })
        return events
      }

      // playing: enrol into the next game later, just record intent now
      if (order.includes(player) || queuedList.includes(player)) return []
      queuedList.push(player)
      events.push({ type: 'queued', player })
      return events
    },

    submit(player, text, now) {
      if (state !== 'playing') return []
      if (player !== currentPlayer) return []
      if (now >= currentDeadline) return [] // expired: tick is sole timeout authority

      const events = []
      const result = validate(text, { lastLetter: currentLetter, minLength: curMinLength, used, dict })

      if (!result.ok) {
        events.push({ type: 'rejected', player, word: text, reason: result.reason })
        return events
      }

      const word = result.word
      const lastChar = word[word.length - 1]

      used.add(word)
      if (word.length > longestWord.length) {
        longestWord = word
        longestBy = player
      }
      if (type === 'chain') {
        lastWordLastLetter = lastChar
      }

      events.push({ type: 'accepted', player, word })
      advanceSameSize(now, events)
      return events
    },

    tick(now) {
      if (state === 'over') return []
      const events = []

      if (state === 'lobby') {
        ensureAnnounced(events)
        if (now < lobbyDeadline) {
          const remaining = lobbyDeadline - now
          for (const threshold of REMINDER_THRESHOLDS_S) {
            if (!remindersSent.has(threshold) && remaining <= threshold * 1000) {
              remindersSent.add(threshold)
              events.push({ type: 'lobby_reminder', secondsLeft: threshold, count: players.length, mode })
            }
          }
          return events
        }
        if (players.length < MIN_PLAYERS) {
          state = 'over'
          events.push({ type: 'terminated', reason: 'not_enough_players' })
          return events
        }
        startGame(now, events)
        return events
      }

      // playing
      if (now < currentDeadline) return events

      eliminateCurrent(now, events)
      return events
    },

    end(now) {
      if (state === 'over') return []
      const noPlayers = state === 'lobby' ? players.length === 0 : active.length === 0
      state = 'over'
      return [{ type: 'ended', reason: noPlayers ? 'no_players' : 'manual' }]
    },
  }
}
