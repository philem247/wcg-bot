// Pure question builders. Rows in, questions out — no network, no clock, no
// Math.random(). Randomness is injected so the suite is reproducible, the same
// rule engine/ follows.
//
// Every question in the shipped bank passes through makeQuestion(), which is the
// one place the four-distinct-options and same-result-set-distractor rules are
// enforced. Add templates by calling it; never build a question object by hand.
import { questionId } from '../build-trivia.mjs'
import { shuffle } from '../../engine/bank.js'

// Draws `count` distinct wrong answers from `pool`, excluding the correct answer.
// Returns null when the pool cannot supply enough — the caller must then discard
// the question rather than pad it with something unrelated.
export function pickDistractors(correct, pool, count, random) {
  const candidates = [...new Set(pool)].filter((x) => x && x.toLowerCase() !== correct.toLowerCase())
  if (candidates.length < count) return null
  return shuffle(candidates, random).slice(0, count)
}

// The single choke point. Returns null if the question cannot be built safely.
export function makeQuestion({ q, correct, pool, league, random, template }) {
  if (!q || !correct) return null
  const wrong = pickDistractors(correct, pool, 3, random)
  if (!wrong) return null
  // Belt and braces: same check normalizeQuestion applies to OpenTDB questions.
  if (new Set([correct, ...wrong].map((s) => s.toLowerCase())).size !== 4) return null
  return { id: questionId(q), q, correct, wrong, league, template }
}

// "Who won the 2019/20 Premier League?"
// A season with more than one recorded winner is dropped: two correct answers.
export function winnerQuestions(rows, { leagueName, league, random }) {
  const bySeason = new Map()
  for (const r of rows) {
    if (!r.season || !r.winner) continue
    if (!bySeason.has(r.season)) bySeason.set(r.season, new Set())
    bySeason.get(r.season).add(r.winner)
  }
  const allWinners = [...new Set(rows.map((r) => r.winner).filter(Boolean))]

  const out = []
  for (const [season, winners] of bySeason) {
    if (winners.size !== 1) continue // ambiguous — discard, never ship
    const correct = [...winners][0]
    const question = makeQuestion({
      q: `Who won the ${season}?`,
      correct,
      pool: allWinners,
      league,
      random,
      template: 'winner',
    })
    if (question) out.push(question)
  }
  return out
}

// Club labels arrive from two different SPARQL queries and can differ in
// punctuation ("Manchester City F.C." vs "Manchester City FC"). Comparing raw
// strings would mark a club that HAS won as never-won — a question whose correct
// answer is factually false. Normalize before comparing.
export function clubKey(name) {
  return String(name)
    .toLowerCase()
    .replace(/\./g, '')                 // "f.c." -> "fc", so the suffix is one token
    .replace(/\b(afc|fc|cf|sc)\b/g, '') // drop the club-type token, never a substring
    .replace(/[^a-z0-9]/g, '')
}

// "Which of these clubs has NEVER won the Premier League?"
// Only ONE never-won club ever appears among the four options (same invariant
// neverPlayedForQuestions uses below) — requiring the ENTIRE club list to
// contain exactly one non-winner made this structurally dead with a normal
// league (20 clubs, 7 winners -> 13 non-winners -> always []).
export function neverWonQuestions(rows, allClubs, { leagueName, league, random }) {
  const winners = new Set(rows.map((r) => r.winner).filter(Boolean))
  const winnerKeys = new Set([...winners].map(clubKey))
  const neverWon = allClubs.filter((c) => !winnerKeys.has(clubKey(c)))
  if (neverWon.length < 1) return [] // no non-winner to ask about
  const correct = shuffle(neverWon, random)[0]
  const question = makeQuestion({
    q: `Which of these clubs has NEVER won the ${leagueName}?`,
    correct,
    pool: [...winners],
    league,
    random,
    template: 'never-won',
  })
  return question ? [question] : []
}

// "Which club did Fernandinho NOT play for?"
// Needs 3 clubs he DID play for as distractors, plus one he did not as the answer.
// The answer is drawn from clubs OTHER players played for, so it is always a real
// club rather than an invented name.
// Keyed on r.id (the Wikidata entity), not r.player (the label): two distinct
// footballers who share a name (two "Tommy Wilson"s) must not merge into one
// combined career — that inflates the club count and makes the clubs.size < 3
// gate pass more often, shipping a club as a "never played for" answer when the
// other man of the same name actually played there.
export function neverPlayedForQuestions(rows, { league, random }) {
  const byPlayer = new Map() // id -> { name, clubs: Set }
  const allClubs = new Set()
  for (const r of rows) {
    if (!r.id || !r.player || !r.club) continue
    if (!byPlayer.has(r.id)) byPlayer.set(r.id, { name: r.player, clubs: new Set() })
    byPlayer.get(r.id).clubs.add(r.club)
    allClubs.add(r.club)
  }

  const out = []
  for (const { name: player, clubs } of byPlayer.values()) {
    if (clubs.size < 3) continue // cannot fill three distractors from his real clubs
    const playedKeys = new Set([...clubs].map(clubKey))
    const notPlayed = [...allClubs].filter((c) => !playedKeys.has(clubKey(c)))
    if (notPlayed.length === 0) continue
    const correct = shuffle(notPlayed, random)[0]
    const question = makeQuestion({
      q: `Which of these clubs did ${player} NOT play for?`,
      correct,
      pool: [...clubs],
      league,
      random,
      template: 'never-played',
    })
    if (question) out.push(question)
  }
  return out
}

// "Which club plays its home games at Anfield?" — asked venue -> club so the
// distractors are other venues, which reads better than four club names.
// A club with more than one recorded venue is dropped: historic grounds mean
// two defensible answers.
export function venueQuestions(rows, { league, random }) {
  const byClub = new Map() // clubKey -> { name, venues: Set }
  for (const r of rows) {
    if (!r.club || !r.venue) continue
    const key = clubKey(r.club)
    if (!byClub.has(key)) byClub.set(key, { name: r.club, venues: new Set() })
    byClub.get(key).venues.add(r.venue)
  }
  const allVenues = [...new Set(rows.map((r) => r.venue).filter(Boolean))]

  const out = []
  for (const { name, venues } of byClub.values()) {
    if (venues.size !== 1) continue
    const question = makeQuestion({
      q: `At which stadium does ${name} play its home games?`,
      correct: [...venues][0],
      pool: allVenues,
      league,
      random,
      template: 'venue',
    })
    if (question) out.push(question)
  }
  return out
}

// "What nationality is X?" A player with two recorded nationalities is
// ambiguous — discard it. Keyed on r.id, same reasoning as neverPlayedForQuestions:
// two players sharing a label must not be treated as one person.
export function nationalityQuestions(rows, { league, random }) {
  const byPlayer = new Map() // id -> { name, nats: Set }
  for (const r of rows) {
    if (!r.id || !r.player || !r.nat) continue
    if (!byPlayer.has(r.id)) byPlayer.set(r.id, { name: r.player, nats: new Set() })
    byPlayer.get(r.id).nats.add(r.nat)
  }
  const allNats = [...new Set(rows.map((r) => r.nat).filter(Boolean))]

  const out = []
  for (const { name: player, nats } of byPlayer.values()) {
    if (nats.size !== 1) continue
    const question = makeQuestion({
      q: `What nationality is ${player}?`,
      correct: [...nats][0],
      pool: allNats,
      league,
      random,
      template: 'nationality',
    })
    if (question) out.push(question)
  }
  return out
}
