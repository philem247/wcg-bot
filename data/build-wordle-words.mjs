// Builds data/wordle-words.json: the curated Wordle answer pool, tagged into
// easy/medium/hard tiers by WORD LENGTH — matching Word Chain's existing
// difficulty naming (engine/modes.js), where players already understand
// "harder" to mean "longer word."
//
//   easy   = 5 letters  (data/backfill/wordle-answers.json)
//   medium = 6 letters  (data/backfill/wordle-6.json)
//   hard   = 7 letters  (data/backfill/wordle-7.json)
//
// All three source files are hand-filtered from data/common.txt to remove
// proper nouns, brand names, and place names that are unfit as a secret
// answer — see the curation prompts in git history for the exact rules
// applied. engine/wordle.js's guess-length check is derived from each
// player's own word, not hardcoded to 5, so all three tiers work through the
// same match engine unchanged.
//
// Both words in a Wordle Tournament match are drawn from the same tier
// (engine/bank.js's pickPair), so nobody ever faces a longer word than their
// opponent within one match.
import { readFileSync, writeFileSync } from 'node:fs'

const SOURCES = [
  { path: './data/backfill/wordle-answers.json', tier: 'easy' },
  { path: './data/backfill/wordle-6.json', tier: 'medium' },
  { path: './data/backfill/wordle-7.json', tier: 'hard' },
]

const EXPECTED_LENGTH = { easy: 5, medium: 6, hard: 7 }

function main() {
  const words = []
  const counts = {}

  for (const { path, tier } of SOURCES) {
    const list = JSON.parse(readFileSync(path, 'utf8'))
    const expectedLen = EXPECTED_LENGTH[tier]
    const bad = list.filter((w) => !new RegExp(`^[a-z]{${expectedLen}}$`).test(w))
    if (bad.length > 0) {
      throw new Error(`${path}: ${bad.length} entries are not ${expectedLen} lowercase letters, e.g. ${bad.slice(0, 5).join(', ')}`)
    }
    for (const word of list) words.push({ word, tier })
    counts[tier] = list.length
  }

  writeFileSync(
    './data/wordle-words.json',
    JSON.stringify({ attribution: 'curated from data/common.txt, hand-filtered for proper nouns', generated: new Date().toISOString(), words }, null, 1)
  )

  console.log(`Wrote data/wordle-words.json — ${words.length} words (easy: ${counts.easy}, medium: ${counts.medium}, hard: ${counts.hard})`)
}

main()
