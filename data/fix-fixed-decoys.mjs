// Rebuilds decoys for templates that used ONE decoy set for every question
// (2026-10) — the non-football version of the World Cup host fix. "Which
// author wrote X?" always offered Sebastian Brant / Agatha Christie / Rilke;
// every Greek god was offered Jupiter / Mars / Mercury; "headquartered in
// Stuttgart" offered Peugeot / Renault / Fiat. Players eliminated by type.
//
// Each question's decoys are drawn from the OTHER answers in its own
// template, preferring the same group when there is one (a Greek god for a
// Greek god, a German brand for a German city). An answer that is also
// right for the same question text — Porsche and Mercedes-Benz are both in
// Stuttgart — is never used. Seeded, so reruns give the same decoys.
//
// Also removes two templates that were broken rather than easy.
// Idempotent. Run: node data/fix-fixed-decoys.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { seededRandom } from './football/link-templates.mjs'
import { shuffle } from '../engine/bank.js'

const PATH = 'data/trivia.json'

// Six-year era from a year in the question ("Superstar (2011)"), so an
// album's decoys are artists from the same years, not ones who broke
// through a decade later.
const era = (text) => {
  const y = Number(text.match(/\b(19[5-9]\d|20[0-3]\d)\b/)?.[1])
  return y ? Math.floor((y - 1950) / 6) : undefined
}

// Template -> which question shape to fix (`match`; a template can mix
// "who starred in X?" with "which film featured X?") and how to find a
// question's group (null = no grouping).
const TEMPLATES = {
  'art|': { match: /^Which author wrote /, group: null },
  'nigerian-entertainment|nollywood-stars': { match: /^Who starred in /, group: (q) => era(q.q) },
  'cartoons|cartoon-creators': { match: /^Which animated series is described/, group: null },
  'nigerian-music|album-lore': { match: /^Which Nigerian artist released /, group: (q) => era(q.q) },
  'health|health-anatomy': { match: /^Which organ or nutrient is defined/, group: null },
  'vehicles|auto-brands': { match: /^Which automotive brand is headquartered in /, group: (q) => q.q.match(/,\s*([^,?]+)\?$/)?.[1] },
  'mythology|myth-gods': { match: /^Which mythological deity is described here/, group: (q) => q.q.match(/"(Greek|Roman|Norse|Egyptian|Hindu|Aztec|Mayan|Japanese|Celtic|Chinese|Yoruba|Mesopotamian|Inca|Slavic)/)?.[1] },
  'music|mainstream-music-hits': { match: /^Who is the world-renowned recording artist/, group: null },
  'tv-shows|tv-creators': { match: /^Which television series is described/, group: null },
  'vehicles|car-lineups': { match: /^Which automotive manufacturer produces/, group: null },
  'health|medical-terms': { match: /^Which medical condition or term matches/, group: null },
}

// Broken, not just easy: the answer doesn't answer the question asked.
const REMOVE_TEMPLATES = new Set([
  'sports|sports-mastery', // "Which sport is associated with France?" -> "2024 Summer Olympics"
  'cartoons|cartoons-mastery', // "What is the premise of Futurama?" -> its creators, vs joke decoys
])

const lower = (s) => s.trim().toLowerCase()
const trivia = JSON.parse(readFileSync(PATH, 'utf8'))
let rebuilt = 0
let removed = 0
// Seeded per question, so a rerun computes the same decoys (and changes nothing).
const seedOf = (id) => [...String(id)].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7)

for (const [cat, questions] of Object.entries(trivia.categories)) {
  trivia.categories[cat] = questions.filter((q) => {
    if (REMOVE_TEMPLATES.has(`${cat}|${q.template ?? ''}`)) { removed++; return false }
    return true
  })

  for (const [key, cfg] of Object.entries(TEMPLATES)) {
    const [c, t] = key.split('|')
    if (c !== cat) continue
    const members = trivia.categories[cat].filter((q) => (q.template ?? '') === t && (!cfg.match || cfg.match.test(q.q)))
    if (members.length < 4) continue
    // Answers per question text, so a co-correct answer is never a decoy.
    const rightFor = new Map()
    for (const q of members) {
      const k = lower(q.q)
      if (!rightFor.has(k)) rightFor.set(k, new Set())
      rightFor.get(k).add(lower(q.correct))
    }
    const answers = [...new Map(members.map((q) => [lower(q.correct), q])).values()]
    // Every group an answer appears in (an artist has albums in several eras).
    const groupsOf = new Map()
    for (const m of members) {
      const k = lower(m.correct)
      if (!groupsOf.has(k)) groupsOf.set(k, new Set())
      const g = cfg.group?.(m)
      if (g !== undefined && g !== null) groupsOf.get(k).add(g)
    }
    const inGroup = (a, g) => g !== undefined && g !== null && groupsOf.get(lower(a.correct))?.has(g)
    // Only decoy sets shared by 3+ questions are the fixed-set problem; a
    // rebuilt set is effectively unique, so reruns leave it alone.
    const setKey = (q) => q.wrong.map(lower).sort().join('|')
    const setUse = new Map()
    for (const q of members) setUse.set(setKey(q), (setUse.get(setKey(q)) ?? 0) + 1)
    for (const q of members) {
      if (setUse.get(setKey(q)) < 3) continue
      const right = rightFor.get(lower(q.q))
      const random = seededRandom(seedOf(q.id))
      const g = cfg.group?.(q)
      const ok = (a) => !right.has(lower(a.correct)) && lower(a.correct) !== lower(q.correct)
      const sameGroup = shuffle(answers.filter((a) => ok(a) && inGroup(a, g)), random)
      const rest = shuffle(answers.filter((a) => ok(a) && !inGroup(a, g)), random)
      const decoys = []
      for (const a of [...sameGroup, ...rest]) {
        if (decoys.length === 3) break
        if (!decoys.some((d) => lower(d) === lower(a.correct))) decoys.push(a.correct)
      }
      if (decoys.length < 3 || decoys.join('|') === q.wrong.join('|')) continue
      q.wrong = decoys
      rebuilt++
    }
  }
}

writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
console.log(`Rebuilt decoys on ${rebuilt} questions, removed ${removed} broken ones.`)
