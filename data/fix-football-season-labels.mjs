// Repairs stadium questions built from Wikidata rows that named a club's
// SEASON item instead of the club: "At which stadium does 2022–23 Manchester
// City F.C. season play its home games?". The label is mapped back to the
// club (data/football/templates.mjs's clubLabel, which the builder now
// applies too). A question is dropped instead when the mapping would leave it
// with two identical options, or make it a duplicate of one already in the bank.
//
// Idempotent. Run: node data/fix-football-season-labels.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { clubLabel } from './football/templates.mjs'

const PATH = 'data/trivia.json'
const trivia = JSON.parse(readFileSync(PATH, 'utf8'))
// Only the two stadium templates carry club labels in their text; prose
// questions mentioning "the 2024–25 season" must be left alone.
const TEMPLATES = new Set(['venue', 'club-venue'])
const VENUE_Q = /^At which stadium does (.+) play its home games\?$/
const fixText = (q) => {
  const m = q.template === 'venue' && q.q.match(VENUE_Q)
  return m ? `At which stadium does ${clubLabel(m[1])} play its home games?` : q.q
}

let repaired = 0
let dropped = 0
// Seeded with every question this script leaves alone, so a repaired question
// that duplicates one later in the bank is caught regardless of order.
const seen = new Set(
  trivia.categories.football.filter((q) => fixText(q) === q.q).map((q) => q.q.toLowerCase()),
)
const kept = []
for (const q of trivia.categories.football) {
  if (!TEMPLATES.has(q.template)) { kept.push(q); continue }
  const before = JSON.stringify(q)
  const fixed = { ...q, q: fixText(q), correct: clubLabel(q.correct), wrong: q.wrong.map(clubLabel) }
  const changed = JSON.stringify(fixed) !== before
  const key = fixed.q.toLowerCase()
  const distinct = new Set([fixed.correct, ...fixed.wrong].map((o) => o.toLowerCase())).size === 4
  // Only a question whose TEXT changed can newly collide with another one.
  const duplicate = fixed.q !== q.q && seen.has(key)
  if (changed && (!distinct || duplicate)) {
    dropped++
    console.log(`- ${q.q}  (${distinct ? 'duplicate question' : 'duplicate options'})`)
    continue
  }
  if (changed) {
    repaired++
    console.log(`~ ${fixed.q} -> ${fixed.correct}`)
  }
  if (changed) seen.add(key)
  kept.push(changed ? fixed : q)
}
trivia.categories.football = kept
writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
console.log(`\nRepaired ${repaired}, dropped ${dropped}.`)
