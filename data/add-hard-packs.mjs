// Adds the hand-written hard packs in data/hard/*.mjs to the bank, flagged
// `hard: true` so they get the hard share of every game (engine/bank.js).
// A pack that fails data/hard/check.mjs is skipped whole. Ids come from the
// question text, so reruns add nothing new.
// Run: node data/add-hard-packs.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { questionId } from './build-trivia.mjs'
import { loadPacks, checkPack } from './hard/check.mjs'

const PATH = 'data/trivia.json'
const trivia = JSON.parse(readFileSync(PATH, 'utf8'))
const added = {}

for (const pack of await loadPacks()) {
  const { errors } = checkPack(pack, trivia)
  if (errors.length) {
    console.log(`Skipping ${pack.category}: ${errors.length} check error(s), run node data/hard/check.mjs ${pack.category}`)
    continue
  }
  const bank = trivia.categories[pack.category]
  const ids = new Set(bank.map((q) => q.id))
  let n = 0
  for (const h of pack.questions) {
    const id = questionId(h.q)
    if (ids.has(id)) continue
    bank.push({ id, q: h.q, correct: h.correct, wrong: h.wrong, template: h.template, hard: true })
    ids.add(id)
    n++
  }
  added[pack.category] = n
}

writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
console.log('Hard questions added:', added)
