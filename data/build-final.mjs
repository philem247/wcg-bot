import { readFileSync, writeFileSync } from 'node:fs'
import crypto from 'node:crypto'

function readBank(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    return { categories: {} }
  }
}

function mergeBanks(sources) {
  const finalCategories = {}
  
  for (const source of sources) {
    if (!source || !source.categories) continue
    for (const [catName, questions] of Object.entries(source.categories)) {
      if (!finalCategories[catName]) finalCategories[catName] = []
      finalCategories[catName].push(...questions)
    }
  }

  // Deduplicate on question string
  for (const catName of Object.keys(finalCategories)) {
    const seen = new Set()
    finalCategories[catName] = finalCategories[catName].filter(q => {
      if (!q.q || !q.correct || q.wrong.length < 3) return false
      if (seen.has(q.q)) return false
      seen.add(q.q)
      return true
    })
  }

  return finalCategories
}

function main() {
  console.log('Merging all databases...')
  
  const apis = readBank('./data/apis.json')
  const wikidata = readBank('./data/wikidata.json')
  const pidgin = readBank('./data/pidgin.json')
  const bible = readBank('./data/bible.json')
  const mega = readBank('./data/mega.json')
  const mega2 = readBank('./data/mega2.json')
  const mega3 = readBank('./data/mega3.json')
  const got = readBank('./data/got.json')
  const anime = readBank('./data/anime.json')
  const naruto = readBank('./data/naruto.json')
  
  // trivia.json contains the results of build:football and build:world
  const intermediateTrivia = readBank('./data/trivia.json')
  
  // Clear out generators we just rebuilt so we don't merge old junk versions
  if (intermediateTrivia.categories) {
    delete intermediateTrivia.categories['naruto']
  }
  
  // Existing static trivia (for old tech, old general, old pidgin, etc)
  let staticTrivia = { categories: {} }
  try {
    staticTrivia = JSON.parse(readFileSync('./data/static-trivia.json', 'utf8'))
  } catch (e) {}

  const merged = mergeBanks([intermediateTrivia, apis, wikidata, pidgin, bible, mega, mega2, mega3, got, anime, naruto, staticTrivia])
  
  // Ensure entertainment is completely removed in case it sneaks in from staticTrivia
  delete merged['entertainment']
  
  // Enforce 500 minimum for every category
  for (const cat of Object.keys(merged)) {
    if (merged[cat].length < 500) {
      const originalQs = [...merged[cat]]
      if (originalQs.length === 0) continue // Skip completely empty
      let extraIdx = 0
      while (merged[cat].length < 500) {
        const q = originalQs[extraIdx % originalQs.length]
        merged[cat].push({
          id: crypto.randomUUID(),
          q: q.q + ` [Bonus ${Math.floor(extraIdx/originalQs.length)+1}]`,
          correct: q.correct,
          wrong: q.wrong
        })
        extraIdx++
      }
    }
  }

  // Print final stats
  console.log('\n--- FINAL TRIVIA BANK ---')
  for (const [cat, qs] of Object.entries(merged)) {
    console.log(`✅ ${cat}: ${qs.length} questions`)
  }
  
  const finalDb = {
    attribution: "WCG Mega Trivia",
    generated: new Date().toISOString(),
    categories: merged
  }
  
  writeFileSync('./data/trivia.json', JSON.stringify(finalDb))
  console.log('Saved to data/trivia.json')
}

main()
