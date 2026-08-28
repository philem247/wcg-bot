// Repairs or removes questions whose text gives away their own answer.
//
// Two shapes exist in the bank:
//
//   1. The answer sits inside a parenthetical aside that is not load-bearing —
//      "Which national team won the 1980 (Nigeria) Africa Cup of Nations?"
//      names the host, which for that edition is also the winner. Dropping the
//      aside leaves a perfectly good question, so we repair rather than delete.
//
//   2. The answer is woven into the question itself — "Who held the title of
//      Third Kazekage?" answered by "Third Kazekage", or a definition-style
//      question whose definition text contains the term. Nothing to salvage;
//      these are deleted.
//
// Repairs are re-checked: if stripping the aside does not actually clear the
// leak, the question is deleted instead of shipped half-fixed.
import { readFileSync, writeFileSync } from 'node:fs'
import { leaksAnswer } from './find-answer-leaks.mjs'

function repair(q) {
  // Remove any parenthetical group that contains the answer, then tidy spacing
  // and the space that can be left sitting before punctuation.
  const candidate = {
    ...q,
    q: q.q
      .replace(/\s*\(([^()]*)\)/g, (match, inner) => {
        const re = new RegExp(`(^|[^A-Za-z0-9])${q.correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`, 'i')
        return re.test(inner) ? '' : match
      })
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([?:.,])/g, '$1')
      .trim(),
  }

  if (candidate.q === q.q) return null // nothing was removed
  if (candidate.q.length < 15) return null // too mangled to be a question
  if (leaksAnswer(candidate)) return null // still leaks — not salvageable
  return candidate
}

function main() {
  const trivia = JSON.parse(readFileSync('./data/trivia.json', 'utf8'))

  let repaired = 0, deleted = 0, dedupedAfter = 0
  const log = []

  for (const [cat, questions] of Object.entries(trivia.categories)) {
    const kept = []
    for (const q of questions) {
      if (!leaksAnswer(q)) { kept.push(q); continue }

      const fixed = repair(q)
      if (fixed) {
        kept.push(fixed)
        repaired++
        log.push(`REPAIR [${cat}] ${q.q}\n    ->  ${fixed.q}`)
      } else {
        deleted++
        log.push(`DELETE [${cat}] ${q.q}  (answer: ${q.correct})`)
      }
    }

    // Repairs can collapse two variants onto the same text (e.g. the "2006
    // (Egypt)" and plain "2006" AFCON questions), so dedupe afterwards.
    const seen = new Set()
    trivia.categories[cat] = kept.filter((q) => {
      if (seen.has(q.q)) { dedupedAfter++; return false }
      seen.add(q.q)
      return true
    })
  }

  trivia.generated = new Date().toISOString()
  writeFileSync('./data/trivia.json', JSON.stringify(trivia))

  console.log(log.join('\n'))
  console.log(`\nrepaired: ${repaired}`)
  console.log(`deleted:  ${deleted}`)
  console.log(`deduped after repair: ${dedupedAfter}`)
}

main()
