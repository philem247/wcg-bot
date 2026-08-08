import { readFile, writeFile, rename } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { shuffle } from '../engine/bank.js'

function mergeStatic(bank, staticData) {
  const newCategories = { ...bank.categories }
  
  // Group static questions by their category
  const byCategory = new Map()
  for (const q of staticData) {
    if (!byCategory.has(q.category)) {
      byCategory.set(q.category, [])
    }
    byCategory.get(q.category).push(q)
  }

  // Merge into existing bank
  for (const [cat, qs] of byCategory) {
    newCategories[cat] = [...(newCategories[cat] || []), ...qs]
  }

  return {
    ...bank,
    generated: new Date().toISOString(),
    categories: newCategories,
  }
}

async function main() {
  console.log('Merging static JSON bank...')
  
  const staticRaw = await readFile('data/static-trivia.json', 'utf8')
  const staticData = JSON.parse(staticRaw)
  
  if (staticData.length === 0) {
    console.error('\nStatic pool is empty.')
    process.exit(1)
  }

  const bank = JSON.parse(await readFile('data/trivia.json', 'utf8'))
  
  // Atomic write
  await writeFile('data/trivia.json.tmp', JSON.stringify(mergeStatic(bank, staticData), null, 0))
  await rename('data/trivia.json.tmp', 'data/trivia.json')

  console.log(`\nWrote ${staticData.length} static questions`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
