// Strips parenthetical detail from answer options.
//
// Two ways this detail gives the answer away:
//
//   1. Inconsistent presence — "Harry Kane (6 goals)" beside three bare names.
//      The annotated option is the answer, so players pick it without knowing
//      anything. The mirror case (detail on the distractors only) teaches the
//      opposite rule just as reliably.
//
//   2. Consistent presence, leaky content — every Golden Boot question reads
//      "Erling Haaland (27 goals)" against three lower tallies, so "pick the
//      biggest number" is always right. Uniform formatting does not save a
//      question whose parenthetical encodes the very fact being asked; for
//      superlative questions (top scorer, title winner, most points) it is a
//      perfect giveaway.
//
// So the detail comes off regardless of consistency. It is never needed to
// answer the question — the answer is the name, not the stat.
//
// The one case left alone is when stripping would collapse two options into
// the same string: "Mammal" against "Mammal (Marsupial)" needs its
// parenthetical to stay a distinct choice.
import { readFileSync, writeFileSync } from 'node:fs'

const strip = (s) =>
  String(s).replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim()

function main() {
  const trivia = JSON.parse(readFileSync('./data/trivia.json', 'utf8'))

  let scanned = 0, fixed = 0, skippedCollision = 0, skippedEmpty = 0
  const perCat = {}

  for (const [cat, questions] of Object.entries(trivia.categories)) {
    for (const q of questions) {
      scanned++
      const hasParen = (s) => /\(/.test(String(s))
      const total = (hasParen(q.correct) ? 1 : 0) + q.wrong.filter(hasParen).length
      if (total === 0) continue // nothing to strip

      const newCorrect = strip(q.correct)
      const newWrong = q.wrong.map(strip)

      // Never strip into an empty or near-empty option.
      if (!newCorrect || newCorrect.length < 2 || newWrong.some((w) => !w || w.length < 2)) {
        skippedEmpty++
        continue
      }

      // Never strip if it collapses two options into the same string — that
      // would create a question with two identical choices.
      const all = [newCorrect, ...newWrong].map((s) => s.toLowerCase())
      if (new Set(all).size !== 4) {
        skippedCollision++
        continue
      }

      q.correct = newCorrect
      q.wrong = newWrong
      fixed++
      perCat[cat] = (perCat[cat] ?? 0) + 1
    }
  }

  trivia.generated = new Date().toISOString()
  writeFileSync('./data/trivia.json', JSON.stringify(trivia))

  console.log(`scanned: ${scanned}`)
  console.log(`fixed:   ${fixed}`)
  console.log(`skipped (would collide):   ${skippedCollision}`)
  console.log(`skipped (would go empty):  ${skippedEmpty}`)
  console.log('\nper category:')
  for (const [c, n] of Object.entries(perCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}: ${n}`)
  }
}

main()
