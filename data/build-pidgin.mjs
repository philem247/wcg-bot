import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const data = JSON.parse(readFileSync('./data/pidgin-words.json', 'utf8'))

const TEMPLATES = [
  (w, m) => ({ q: `What is the meaning of the Nigerian Pidgin word '${w}'?`, c: m }),
  (w, m) => ({ q: `Which of these definitions best describes '${w}' in Nigerian Pidgin?`, c: m }),
  (w, m) => ({ q: `If a Nigerian says '${w}', what do they mean?`, c: m }),
  (w, m) => ({ q: `Complete the translation: '${w}' means _____.`, c: m }),
  (w, m) => ({ q: `What does '${w}' mean in street slang?`, c: m }),
  (w, m) => ({ q: `Translate the following Nigerian Pidgin to English: ${w}`, c: m }),
]

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function build() {
  const questions = []
  for (const item of data) {
    for (const t of TEMPLATES) {
      const generated = t(item.word, item.meaning)
      // Pick 3 random wrong meanings
      const wrong = shuffle(data.filter(d => d.word !== item.word)).slice(0, 3).map(d => d.meaning)
      questions.push({
        id: randomUUID(),
        q: generated.q,
        correct: generated.c,
        wrong
      })
    }
  }

  // Deduplicate just in case
  const seen = new Set()
  const finalQuestions = questions.filter(q => {
    if (seen.has(q.q)) return false
    seen.add(q.q)
    return true
  })

  const bank = {
    attribution: "Handcrafted Nigerian Pidgin Dictionary",
    generated: new Date().toISOString(),
    categories: {
      "pidgin-english": finalQuestions
    }
  }
  
  writeFileSync('./data/pidgin.json', JSON.stringify(bank, null, 2))
  console.log(`✅ pidgin-english: ${finalQuestions.length} questions saved to pidgin.json`)
}

build()
