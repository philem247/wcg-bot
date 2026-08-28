// Head-to-head Wordle tournament: single elimination, byes for non-power-of-two
// entrant counts, sudden death on an unresolved match. Same bracket shape as
// engine/tournament.js (registering -> awaiting -> match -> ... -> over), but
// NOT built on top of it: a Wordle match is asynchronous with per-player
// boards and no shared per-question clock, a different enough shape from
// engine/trivia.js's question/clock/gap model that generalising the trivia
// tournament to host both risked regressing something that already works.
// The bracket-pairing logic below is intentionally a near-duplicate of
// tournament.js's — see the design spec for that call.
//
// No Date.now(), no Math.random(). Time arrives via `now`, randomness via
// `random`. Same contract as the rest of engine/.
import { createWordleMatch, MAX_GUESSES, SUDDEN_DEATH_MAX_GUESSES } from './wordle.js'
import { shuffle } from './bank.js'

export const REGISTRATION_MS = 120_000
// Same reasoning as the trivia tournament's Fix 2: give players a moment to
// read who they're facing before their boards appear.
export const MATCH_START_DELAY_MS = 4000

function nextPow2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

function pairConsecutive(list) {
  const fixtures = []
  for (let i = 0; i < list.length; i += 2) {
    fixtures.push({ type: 'match', p1: list[i], p2: list[i + 1], winner: null, scoreP1: 0, scoreP2: 0 })
  }
  return fixtures
}

export function createWordleTournament({
  wordBank,
  tier = null, // null = any tier, chosen at random per match; 'easy'|'medium'|'hard' pins the whole bracket
  isValidWord = () => true,
  now = 0,
  random = () => 0.5,
  registrationMs = REGISTRATION_MS,
  restore = null,
  exclude = new Set(),
}) {
  let state, players, registrationDeadline, rounds, roundIndex, fixtureIndex, usedWords, champion, totalRounds, opened
  let inner = null   // live wordle match for the fixture in progress; transient, never persisted
  let sd = false      // in sudden death for the current match
  let matchResult = null // last wordle_match_over payload from `inner`
  let matchStartDeadline = null

  if (restore) {
    tier = restore.tier ?? tier
    players = [...restore.players]
    registrationDeadline = restore.registrationDeadline
    rounds = restore.rounds.map((r) => ({ fixtures: r.fixtures.map((f) => ({ ...f })) }))
    roundIndex = restore.roundIndex
    fixtureIndex = restore.fixtureIndex
    usedWords = new Set([...(restore.usedWords ?? []), ...(exclude ?? [])])
    champion = restore.champion
    totalRounds = restore.totalRounds
    // Same collapse-on-restart behaviour as the trivia tournament: a live
    // match cannot be resumed (the in-progress boards live only in `inner`),
    // so a restart drops back to 'awaiting' at the same fixture. The admin's
    // next `/wordle next` restarts that match from a fresh pair of words.
    state = restore.state === 'match' || restore.state === 'match_starting' ? 'awaiting' : restore.state
    opened = true
  } else {
    state = 'registering'
    players = []
    registrationDeadline = now + registrationMs
    rounds = []
    roundIndex = 0
    fixtureIndex = 0
    usedWords = new Set(exclude ?? [])
    champion = null
    totalRounds = 0
    opened = false
  }

  function serialize() {
    return {
      v: 1, type: 'wordle', state, tier, players: [...players], registrationDeadline,
      rounds: rounds.map((r) => ({ fixtures: r.fixtures.map((f) => ({ ...f })) })),
      roundIndex, fixtureIndex, usedWords: [...usedWords], champion, totalRounds,
    }
  }

  function status() {
    return {
      state, players: [...players],
      round: state === 'registering' || rounds.length === 0 ? 0 : roundIndex + 1,
      totalRounds,
      fixtures: rounds[roundIndex]?.fixtures.map((f) => ({ ...f })) ?? [],
      champion,
    }
  }

  function firstUnresolvedIndex(ri) {
    return rounds[ri].fixtures.findIndex((f) => f.type === 'match' && f.winner === null)
  }

  function roundResolved(ri) {
    return rounds[ri].fixtures.every((f) => f.type === 'bye' || f.winner !== null)
  }

  function buildBracket() {
    const shuffled = shuffle(players, random)
    const n = shuffled.length
    const p = nextPow2(n)
    totalRounds = Math.round(Math.log2(p))
    const byeCount = p - n
    const fixtures = []
    for (let i = 0; i < byeCount; i++) fixtures.push({ type: 'bye', player: shuffled[i] })
    for (let i = byeCount; i < n; i += 2) {
      fixtures.push({ type: 'match', p1: shuffled[i], p2: shuffled[i + 1], winner: null, scoreP1: 0, scoreP2: 0 })
    }
    rounds = [{ fixtures }]
    roundIndex = 0
    fixtureIndex = firstUnresolvedIndex(0)
  }

  function closeRegistration() {
    if (players.length < 2) {
      state = 'over'
      return [{ type: 'wordle_tournament_cancelled', reason: 'not_enough_players', count: players.length, snapshot: serialize() }]
    }
    buildBracket()
    state = 'awaiting'
    const fixtures0 = rounds[0].fixtures
    return [{
      type: 'wordle_tournament_bracket_ready',
      players: [...players],
      byes: fixtures0.filter((f) => f.type === 'bye').map((f) => f.player),
      matches: fixtures0.filter((f) => f.type === 'match').map((f) => ({ p1: f.p1, p2: f.p2 })),
      totalRounds,
      snapshot: serialize(),
    }]
  }

  // Bank exhausted mid-tournament — vanishingly unlikely with a real word
  // bank sized in the hundreds, same reasoning as the trivia tournament's
  // identical fallback. Decided with the injected random rather than looping
  // forever on an empty pick.
  function coinFlipFinish(fixture, finishNow) {
    const winner = random() < 0.5 ? fixture.p1 : fixture.p2
    return finalizeMatch(fixture, matchResult?.s1 ?? 0, matchResult?.s2 ?? 0, winner, finishNow, sd)
  }

  function startMatch(startNow) {
    const fixture = rounds[roundIndex].fixtures[fixtureIndex]
    sd = false
    matchResult = null
    const pair = wordBank.pickPair({ tier, exclude: usedWords, random })
    if (!pair) return coinFlipFinish(fixture, startNow)
    usedWords.add(pair.word1)
    usedWords.add(pair.word2)
    inner = createWordleMatch({
      p1: fixture.p1, p2: fixture.p2, word1: pair.word1, word2: pair.word2,
      maxGuesses: MAX_GUESSES, now: startNow, isValidWord,
    })
    state = 'match_starting'
    matchStartDeadline = startNow + MATCH_START_DELAY_MS
    return [{ type: 'wordle_tournament_match_start', p1: fixture.p1, p2: fixture.p2, round: roundIndex + 1, totalRounds }]
  }

  function startSuddenDeath(startNow) {
    const fixture = rounds[roundIndex].fixtures[fixtureIndex]
    sd = true
    matchResult = null
    const pair = wordBank.pickPair({ tier, exclude: usedWords, random })
    if (!pair) return coinFlipFinish(fixture, startNow)
    usedWords.add(pair.word1)
    usedWords.add(pair.word2)
    inner = createWordleMatch({
      p1: fixture.p1, p2: fixture.p2, word1: pair.word1, word2: pair.word2,
      maxGuesses: SUDDEN_DEATH_MAX_GUESSES, now: startNow, isValidWord,
    })
    state = 'match_starting'
    matchStartDeadline = startNow + MATCH_START_DELAY_MS
    return [{ type: 'wordle_tournament_sudden_death', p1: fixture.p1, p2: fixture.p2 }]
  }

  // Resolution order, matching the design spec exactly: an outright solve
  // wins; a level board goes to sudden death (once, not repeated — a full
  // 4-guess sudden-death board landing exactly level again is rare enough
  // that a coin flip is the honest call rather than looping); otherwise the
  // higher progress score wins the match.
  function resolveRound(resolveNow) {
    const fixture = rounds[roundIndex].fixtures[fixtureIndex]
    if (!sd) {
      if (matchResult.winner) return finalizeMatch(fixture, matchResult.s1, matchResult.s2, matchResult.winner, resolveNow, false)
      if (matchResult.s1 === matchResult.s2) return startSuddenDeath(resolveNow)
      return finalizeMatch(fixture, matchResult.s1, matchResult.s2, matchResult.s1 > matchResult.s2 ? fixture.p1 : fixture.p2, resolveNow, false)
    }
    if (matchResult.winner) return finalizeMatch(fixture, matchResult.s1, matchResult.s2, matchResult.winner, resolveNow, true)
    if (matchResult.s1 === matchResult.s2) return coinFlipFinish(fixture, resolveNow)
    return finalizeMatch(fixture, matchResult.s1, matchResult.s2, matchResult.s1 > matchResult.s2 ? fixture.p1 : fixture.p2, resolveNow, true)
  }

  function finalizeMatch(fixture, s1, s2, winner, finishNow, suddenDeath) {
    fixture.winner = winner
    fixture.scoreP1 = s1 ?? 0
    fixture.scoreP2 = s2 ?? 0
    inner = null
    sd = false
    matchResult = null
    const matchOverEvent = {
      type: 'wordle_tournament_match_over', p1: fixture.p1, p2: fixture.p2,
      scoreP1: fixture.scoreP1, scoreP2: fixture.scoreP2, winner, suddenDeath,
      round: roundIndex + 1,
    }

    if (!roundResolved(roundIndex)) {
      fixtureIndex = firstUnresolvedIndex(roundIndex)
      state = 'awaiting'
      return [{ ...matchOverEvent, roundComplete: false, snapshot: serialize() }]
    }

    const nextPlayers = rounds[roundIndex].fixtures.map((f) => (f.type === 'bye' ? f.player : f.winner))
    if (nextPlayers.length === 1) {
      champion = nextPlayers[0]
      state = 'over'
      return [
        { ...matchOverEvent, roundComplete: true, snapshot: serialize() },
        { type: 'wordle_tournament_champion', player: champion, rounds: rounds.length, snapshot: serialize() },
      ]
    }

    rounds.push({ fixtures: pairConsecutive(nextPlayers) })
    roundIndex++
    fixtureIndex = firstUnresolvedIndex(roundIndex)
    state = 'awaiting'
    return [{ ...matchOverEvent, roundComplete: true, snapshot: serialize() }]
  }

  function processInnerEvents(events, eventsNow) {
    const out = []
    for (const ev of events) {
      if (ev.type === 'wordle_match_over') {
        matchResult = ev
        out.push(...resolveRound(eventsNow))
        continue
      }
      out.push(ev) // wordle_guess / wordle_cooldown / wordle_invalid / wordle_exhausted pass through unchanged
    }
    return out
  }

  return {
    get state() { return state },

    tick(tickNow) {
      if (state === 'registering') {
        if (!opened) {
          opened = true
          return [{
            type: 'wordle_tournament_registration_open',
            seconds: Math.round(registrationMs / 1000), deadline: registrationDeadline,
          }]
        }
        if (tickNow < registrationDeadline) return []
        return closeRegistration()
      }
      if (state === 'match_starting') {
        if (tickNow < matchStartDeadline) return []
        state = 'match'
        return processInnerEvents(inner.tick(tickNow), tickNow)
      }
      if (state !== 'match') return []
      return processInnerEvents(inner.tick(tickNow), tickNow)
    },

    join(player, joinNow) {
      if (state !== 'registering') return []
      if (players.includes(player)) return []
      players.push(player)
      return [{ type: 'wordle_tournament_joined', player, count: players.length, snapshot: serialize() }]
    },

    submit(player, text, submitNow) {
      if (state !== 'match') return []
      const fixture = rounds[roundIndex].fixtures[fixtureIndex]
      if (player !== fixture.p1 && player !== fixture.p2) return [] // not a contestant: ignored silently
      return processInnerEvents(inner.submit(player, text, submitNow), submitNow)
    },

    next(nextNow) {
      if (state === 'registering') return [{ type: 'wordle_tournament_next_denied', reason: 'still_registering' }]
      if (state === 'match' || state === 'match_starting') return [{ type: 'wordle_tournament_next_denied', reason: 'match_in_progress' }]
      if (state === 'over') return [{ type: 'wordle_tournament_next_denied', reason: 'no_active_tournament' }]
      return startMatch(nextNow)
    },

    end() {
      if (state === 'over') return []
      state = 'over'
      return [{ type: 'wordle_tournament_ended', snapshot: serialize() }]
    },

    status,
    serialize,
  }
}
