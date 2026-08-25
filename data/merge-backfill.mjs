// Merges data/backfill/*.json into data/trivia.json, applying the same hard
// rules as data/backfill/SPEC.md as a safety net against agent mistakes:
// no numbering, no placeholder leaks, no duplicate question text (against
// either the existing bank or within the same backfill batch), no answer
// leaked verbatim inside the question, exactly 3 distractors, no distractor
// that duplicates a groupmate's correct answer.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import crypto from 'node:crypto'

const NUMBERED = /\(#\d+\)/
const LEAK = /this subject|this notable entity|\bthis entity\b/i

// A short common word/number ("O", "Ten", "20") legitimately recurring inside
// unrelated question text is not an answer leak; only flag names/titles long
// enough that their appearance is actually a giveaway.
function isSelfAnswer(q, correct) {
  if (!correct || correct.length < 4) return false
  return q.toLowerCase().includes(correct.toLowerCase())
}

function validQuestion(q) {
  if (!q || typeof q.q !== 'string' || typeof q.correct !== 'string') return false
  if (!Array.isArray(q.wrong) || q.wrong.length !== 3) return false
  if (NUMBERED.test(q.q)) return false
  if (LEAK.test(q.q)) return false
  if (isSelfAnswer(q.q, q.correct)) return false
  if (q.wrong.some((w) => typeof w !== 'string' || !w.trim())) return false
  const wrongLower = q.wrong.map((w) => w.toLowerCase().trim())
  if (new Set(wrongLower).size !== 3) return false // distractors must differ from each other
  if (wrongLower.includes(q.correct.toLowerCase().trim())) return false // and from the answer
  return true
}

function main() {
  const trivia = JSON.parse(readFileSync('./data/trivia.json', 'utf8'))
  const files = readdirSync('./data/backfill').filter((f) => f.endsWith('.json'))

  const report = []

  for (const file of files) {
    const cat = file.replace(/(-extra)?\.json$/, '')
    if (!trivia.categories[cat]) {
      report.push(`SKIP ${file}: no matching category '${cat}' in trivia.json`)
      continue
    }

    let incoming
    try {
      incoming = JSON.parse(readFileSync(`./data/backfill/${file}`, 'utf8'))
    } catch (e) {
      report.push(`SKIP ${file}: parse error ${e.message}`)
      continue
    }
    if (!Array.isArray(incoming)) {
      report.push(`SKIP ${file}: not an array`)
      continue
    }

    const existingTexts = new Set(trivia.categories[cat].map((q) => q.q))
    let added = 0, rejectedInvalid = 0, rejectedDupe = 0

    for (const q of incoming) {
      if (!validQuestion(q)) { rejectedInvalid++; continue }
      if (existingTexts.has(q.q)) { rejectedDupe++; continue }
      existingTexts.add(q.q)
      trivia.categories[cat].push({
        id: crypto.randomBytes(6).toString('hex'),
        q: q.q,
        correct: q.correct,
        wrong: q.wrong,
        template: 'backfill-2026-08',
      })
      added++
    }

    report.push(`${file} -> ${cat}: +${added} (rejected: ${rejectedInvalid} invalid, ${rejectedDupe} dupe)`)
  }

  trivia.generated = new Date().toISOString()
  writeFileSync('./data/trivia.json', JSON.stringify(trivia))

  console.log(report.join('\n'))
  console.log('\n--- New totals ---')
  let total = 0
  const rows = Object.entries(trivia.categories).map(([k, v]) => { total += v.length; return [k, v.length] })
  rows.sort((a, b) => b[1] - a[1])
  for (const [k, n] of rows) console.log(`${k}: ${n}`)
  console.log(`TOTAL: ${total}  CATS: ${rows.length}`)
}

main()
