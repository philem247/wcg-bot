// Reports questions whose text contains the correct answer as a whole word.
// Word-boundary matching avoids the substring false positives a naive
// includes() produces — "Tunis" inside "Tunisia", "Cher" inside "Cherilyn",
// "1911" inside "M1911" are not giveaways.
import { readFileSync } from 'node:fs'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function leaksAnswer(q) {
  if (!q.correct || q.correct.length < 4) return false
  const re = new RegExp(`(^|[^A-Za-z0-9])${esc(q.correct)}([^A-Za-z0-9]|$)`, 'i')
  return re.test(q.q)
}

function main() {
  const trivia = JSON.parse(readFileSync('./data/trivia.json', 'utf8'))
  let total = 0
  for (const [cat, questions] of Object.entries(trivia.categories)) {
    for (const q of questions) {
      if (leaksAnswer(q)) {
        total++
        console.log(`[${cat}] ${q.q}\n   -> ${q.correct}`)
      }
    }
  }
  console.log(`\nTRUE leaks (word-boundary): ${total}`)
}

if (process.argv[1] && process.argv[1].endsWith('find-answer-leaks.mjs')) main()
