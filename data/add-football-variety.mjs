// Makes the football bank tougher and less samey (2026-10):
//
//   1. Adds two new generated shapes from data/football/career-paths.json —
//      "Which club have both X and Y played for?" and "Which of these players
//      has played for both A and B?" — where every decoy is a club one of
//      them DID play for / a player who DID play for one of the clubs
//      (data/football/link-templates.mjs).
//   2. Adds the hand-written hard packs (data/football/hard-pack.mjs, hard-pack-2.mjs).
//   3. Retires "What nationality is X?" — decoys drawn from the whole world
//      made it the easiest, most repetitive shape in the bank.
//   4. Cleans Wikidata's legal-style names in the generated questions:
//      "Spain men's national football team" -> "Spain",
//      "Real Madrid Club de Fútbol" -> "Real Madrid".
//
// Idempotent: (1)-(2) are regenerated from scratch on every run with a fixed
// seed, so ids stay stable and groups' "already asked" history keeps working.
// Run: node data/add-football-variety.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { questionId } from './build-trivia.mjs'
import { HARD_PACK } from './football/hard-pack.mjs'
import { HARD_PACK_2 } from './football/hard-pack-2.mjs'
import { clubLinkQuestions, bothClubsQuestions, seededRandom, shortClub } from './football/link-templates.mjs'

const PATH = 'data/trivia.json'
const RETIRED = new Set(['nationality'])
const OWN = (t) => t === 'club-link' || t === 'both-clubs' || t?.startsWith('hard-')
const CLEAN_TEMPLATES = new Set([
  'winner', 'has-won', 'never-won', 'never-played', 'played-for', 'club-player',
  'venue', 'club-venue', 'nationality-player',
])

const NATIONAL_TEAM = /\s+(?:men's\s+)?national(?:\s+association)?\s+football\s+team$/i
export function cleanLabel(label) {
  const s = String(label)
  if (NATIONAL_TEAM.test(s)) return s.replace(NATIONAL_TEAM, '')
  return shortClub(s)
}

function cleanQuestion(q) {
  const labels = [q.correct, ...q.wrong]
  const cleaned = labels.map(cleanLabel)
  // Two options collapsing to the same name would leave a broken question.
  if (new Set(cleaned.map((x) => x.toLowerCase())).size !== 4) return q
  let text = q.q
  // The question text names clubs too ("Which club did X NOT play for?" has
  // none, but "Which of these players played for Manchester United F.C.?"
  // does) — swap any full label it contains for the short one.
  const allLabels = new Set(labels)
  for (const m of text.matchAll(/(?:for|at|does|won the)\s+(.+?)(?:\?| play)/g)) allLabels.add(m[1])
  for (const l of allLabels) {
    const c = cleanLabel(l)
    if (c !== l) text = text.split(l).join(c)
  }
  return { ...q, q: text, correct: cleaned[0], wrong: cleaned.slice(1) }
}

const trivia = JSON.parse(readFileSync(PATH, 'utf8'))
const before = trivia.categories.football
let retired = 0
let cleaned = 0
const kept = []
for (const q of before) {
  if (OWN(q.template)) continue // regenerated below
  if (RETIRED.has(q.template)) { retired++; continue }
  if (CLEAN_TEMPLATES.has(q.template)) {
    const c = cleanQuestion(q)
    if (JSON.stringify(c) !== JSON.stringify(q)) cleaned++
    kept.push(c)
    continue
  }
  kept.push(q)
}

const players = JSON.parse(readFileSync('data/football/career-paths.json', 'utf8'))
const links = [
  ...clubLinkQuestions(players, { random: seededRandom(1) }),
  ...bothClubsQuestions(players, { random: seededRandom(2) }),
]
const hard = [...HARD_PACK, ...HARD_PACK_2].map((h) => ({ id: questionId(h.q), q: h.q, correct: h.correct, wrong: h.wrong, league: 'football', template: h.template }))

const ids = new Set(kept.map((q) => q.id))
const texts = new Set(kept.map((q) => q.q.toLowerCase()))
const added = []
for (const q of [...hard, ...links]) {
  if (ids.has(q.id) || texts.has(q.q.toLowerCase())) continue
  ids.add(q.id)
  texts.add(q.q.toLowerCase())
  // `hard` gets these a guaranteed share of every football game (engine/bank.js HARD_SHARE).
  added.push({ ...q, hard: true })
}

trivia.categories.football = [...kept, ...added]
writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
console.log(`Retired ${retired}, cleaned ${cleaned}, added ${added.length} (${hard.length} hand-written, ${links.length} generated). Football now ${trivia.categories.football.length}.`)
