// Head-to-head trivia tournament: single elimination, byes for non-power-of-two
// entrant counts, sudden death on a tied match. Wraps engine/trivia.js for the
// actual question/clock/gap machinery rather than re-implementing it — a match
// is just a createTriviaGame() instance restricted to two contestants.
//
// No Date.now(), no Math.random(). Time arrives via `now`, randomness via
// `random`. Same contract as engine/trivia.js and engine/game.js.
//
// State machine: registering -> awaiting -> match -> (awaiting -> match)* -> over.
// An admin drives every awaiting -> match transition via next(); nothing here
// ever advances a round on its own — see tick()'s 'awaiting' branch.
import { createTriviaGame, QUESTION_COUNT } from './trivia.js'
import { shuffle } from './bank.js'

export const REGISTRATION_MS = 120_000

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

export function createTournament({ bank, category = 'mixed', now = 0, random = () => 0.5, registrationMs = REGISTRATION_MS, restore = null }) {
  let state, players, registrationDeadline, rounds, roundIndex, fixtureIndex, usedQids, champion, totalRounds, opened
  let inner = null   // live trivia game for the match/sudden-death round in progress; transient, never persisted
  let sd = false      // in sudden death for the current match
  let sdCorrect = null // Set of contestants who answered THIS sudden-death question correctly
  let matchScores = null // Map(contestant -> score) for the current 10-question match

  if (restore) {
    category = restore.category
    players = [...restore.players]
    registrationDeadline = restore.registrationDeadline
    rounds = restore.rounds.map((r) => ({ fixtures: r.fixtures.map((f) => ({ ...f })) }))
    roundIndex = restore.roundIndex
    fixtureIndex = restore.fixtureIndex
    usedQids = new Set(restore.usedQids)
    champion = restore.champion
    totalRounds = restore.totalRounds
    // ponytail: a persisted 'match' means the process died mid-question-flow — the
    // live trivia clock and inner engine can't be resumed. Collapse to 'awaiting'
    // at the same fixture so an admin's next `next()` restarts that match from
    // question 1, instead of losing the whole tournament to a restart.
    state = restore.state === 'match' ? 'awaiting' : restore.state
    opened = true
  } else {
    state = 'registering'
    players = []
    registrationDeadline = now + registrationMs
    rounds = []
    roundIndex = 0
    fixtureIndex = 0
    usedQids = new Set()
    champion = null
    totalRounds = 0
    opened = false
  }

  function serialize() {
    return {
      v: 1, state, category, players: [...players], registrationDeadline,
      rounds: rounds.map((r) => ({ fixtures: r.fixtures.map((f) => ({ ...f })) })),
      roundIndex, fixtureIndex, usedQids: [...usedQids], champion, totalRounds,
    }
  }

  function status() {
    return {
      state, category, players: [...players],
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
    // Byes go to the front of the shuffled order; everyone after plays round 1.
    // This is what leaves every later round a clean power of two — see the brief.
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
      return [{ type: 'tournament_cancelled', reason: 'not_enough_players', count: players.length, snapshot: serialize() }]
    }
    buildBracket()
    state = 'awaiting'
    const fixtures0 = rounds[0].fixtures
    return [{
      type: 'tournament_bracket_ready',
      players: [...players],
      byes: fixtures0.filter((f) => f.type === 'bye').map((f) => f.player),
      matches: fixtures0.filter((f) => f.type === 'match').map((f) => ({ p1: f.p1, p2: f.p2 })),
      totalRounds,
      snapshot: serialize(),
    }]
  }

  function pickQuestions(count) {
    if (!bank) return []
    const picked = bank.pick({ category, count, exclude: usedQids, random })
    for (const q of picked) usedQids.add(q.id)
    return picked
  }

  // ponytail: bank exhausted mid-tournament (every question for this category
  // already asked). Vanishingly unlikely with a real bank sized in the hundreds —
  // decide with the injected random instead of looping forever on empty picks.
  // Upgrade path: recycle asked questions (as store/db.js's /trivia path does) if
  // this ever actually fires in production.
  function coinFlipFinish(fixture, now) {
    const winner = random() < 0.5 ? fixture.p1 : fixture.p2
    return finalizeMatch(fixture, matchScores?.get(fixture.p1) ?? 0, matchScores?.get(fixture.p2) ?? 0, winner, now, sd)
  }

  function startMatch(now) {
    const fixture = rounds[roundIndex].fixtures[fixtureIndex]
    matchScores = new Map([[fixture.p1, 0], [fixture.p2, 0]])
    sd = false
    sdCorrect = null
    const picked = pickQuestions(QUESTION_COUNT)
    if (picked.length === 0) return coinFlipFinish(fixture, now)
    inner = createTriviaGame({ questions: picked, category, now, random })
    state = 'match'
    return [
      { type: 'tournament_match_start', p1: fixture.p1, p2: fixture.p2, round: roundIndex + 1, totalRounds },
      ...inner.tick(now),
    ]
  }

  // trivia.js is a RACE: the first correct answer to a question closes it
  // immediately, so at most one contestant ever scores a given question — "both
  // right" (owner decision 2) can't structurally occur through submit(). What
  // does occur, and what this maps it to: exactly one correct -> that player
  // wins the round; nobody correct (both wrong, or timeout) -> repeat. Same
  // outcome the rule describes for every reachable case.
  function startSuddenDeath(now, repeat) {
    const fixture = rounds[roundIndex].fixtures[fixtureIndex]
    sd = true
    sdCorrect = new Set()
    const picked = pickQuestions(1)
    if (picked.length === 0) return coinFlipFinish(fixture, now)
    inner = createTriviaGame({ questions: picked, category, now, random })
    return [
      { type: repeat ? 'tournament_sudden_death_repeat' : 'tournament_sudden_death', p1: fixture.p1, p2: fixture.p2 },
      ...inner.tick(now),
    ]
  }

  function resolveRound(now) {
    const fixture = rounds[roundIndex].fixtures[fixtureIndex]
    if (!sd) {
      const s1 = matchScores.get(fixture.p1)
      const s2 = matchScores.get(fixture.p2)
      if (s1 === s2) return startSuddenDeath(now, false)
      return finalizeMatch(fixture, s1, s2, s1 > s2 ? fixture.p1 : fixture.p2, now, false)
    }
    const rightOnes = [fixture.p1, fixture.p2].filter((p) => sdCorrect.has(p))
    if (rightOnes.length === 1) {
      return finalizeMatch(fixture, matchScores.get(fixture.p1), matchScores.get(fixture.p2), rightOnes[0], now, true)
    }
    return startSuddenDeath(now, true)
  }

  function finalizeMatch(fixture, s1, s2, winner, now, suddenDeath) {
    fixture.winner = winner
    fixture.scoreP1 = s1 ?? 0
    fixture.scoreP2 = s2 ?? 0
    inner = null
    sd = false
    sdCorrect = null
    const matchOverEvent = {
      type: 'tournament_match_over', p1: fixture.p1, p2: fixture.p2,
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
        { type: 'tournament_champion', player: champion, rounds: rounds.length, snapshot: serialize() },
      ]
    }

    rounds.push({ fixtures: pairConsecutive(nextPlayers) })
    roundIndex++
    fixtureIndex = firstUnresolvedIndex(roundIndex)
    state = 'awaiting'
    return [{ ...matchOverEvent, roundComplete: true, snapshot: serialize() }]
  }

  function processInnerEvents(events, now) {
    const out = []
    for (const ev of events) {
      if (ev.type === 'trivia_answer' && ev.outcome === 'correct') {
        if (sd) sdCorrect.add(ev.player)
        else if (matchScores.has(ev.player)) matchScores.set(ev.player, matchScores.get(ev.player) + 1)
      }
      if (ev.type === 'trivia_over') {
        out.push(...resolveRound(now))
        continue
      }
      out.push(ev) // trivia_question / trivia_answer pass through unchanged — reuse the trivia rendering
    }
    return out
  }

  return {
    get state() { return state },
    get category() { return category },

    tick(now) {
      if (state === 'registering') {
        if (!opened) {
          opened = true
          return [{
            type: 'tournament_registration_open', category,
            seconds: Math.round(registrationMs / 1000), deadline: registrationDeadline,
          }]
        }
        if (now < registrationDeadline) return []
        return closeRegistration()
      }
      if (state !== 'match') return [] // registering handled above; awaiting/over never auto-advance
      return processInnerEvents(inner.tick(now), now)
    },

    join(player, now) {
      if (state !== 'registering') return []
      if (players.includes(player)) return []
      players.push(player)
      return [{ type: 'tournament_joined', player, count: players.length, snapshot: serialize() }]
    },

    submit(player, text, now) {
      if (state !== 'match') return []
      const fixture = rounds[roundIndex].fixtures[fixtureIndex]
      if (player !== fixture.p1 && player !== fixture.p2) return [] // not a contestant: ignored silently, the whole point of the mode
      return processInnerEvents(inner.submit(player, text, now), now)
    },

    // Admin-only advance: registering -> awaiting (closes registration early is
    // NOT supported, only the timer does that — see tick()) and awaiting -> match.
    next(now) {
      if (state === 'registering') return [{ type: 'tournament_next_denied', reason: 'still_registering' }]
      if (state === 'match') return [{ type: 'tournament_next_denied', reason: 'match_in_progress' }]
      if (state === 'over') return [{ type: 'tournament_next_denied', reason: 'no_active_tournament' }]
      return startMatch(now)
    },

    end() {
      if (state === 'over') return []
      state = 'over'
      return [{ type: 'tournament_ended', snapshot: serialize() }]
    },

    status,
    serialize,
  }
}
