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

  // Deduplicate on question string + correct answer to allow identical templates
  for (const catName of Object.keys(finalCategories)) {
    const seen = new Set()
    finalCategories[catName] = finalCategories[catName].filter(q => {
      if (!q.q || !q.correct || q.wrong.length < 3) return false
      const hash = q.q + '|' + q.correct
      if (seen.has(hash)) return false
      seen.add(hash)
      return true
    })
  }

  return finalCategories
}

function main() {
  console.log('Merging all databases...')
  
  const apis = readBank('./data/apis.json')
  const pidgin = readBank('./data/pidgin.json')
  const bible = readBank('./data/bible.json')
  const mega = readBank('./data/mega.json')
  const mega2 = readBank('./data/mega2.json')
  const mega3 = readBank('./data/mega3.json')
  const naija = readBank('./data/naija.json')
  const got = readBank('./data/got.json')
  const anime = readBank('./data/anime.json')
  const naruto = readBank('./data/naruto.json')
  const culture = readBank('./data/culture.json')
  
  // trivia.json contains the results of build:football and build:world
  const intermediateTrivia = readBank('./data/trivia.json')
  
  // To avoid preserving broken 'ghost' questions from old builds, we only
  // salvage the categories that are explicitly built externally (football/fpl).
  // The rest will be cleanly regenerated from the fresh JSON sources.
  const salvagedExternal = { categories: {} }
  if (intermediateTrivia.categories) {
    if (intermediateTrivia.categories['football']) {
      salvagedExternal.categories['football'] = intermediateTrivia.categories['football']
    }
    if (intermediateTrivia.categories['fpl']) {
      salvagedExternal.categories['fpl'] = intermediateTrivia.categories['fpl']
    }
  }
  
  // Existing static trivia (for old tech, old general, old pidgin, etc)
  let staticTrivia = { categories: {} }
  try {
    staticTrivia = JSON.parse(readFileSync('./data/static-trivia.json', 'utf8'))
  } catch (e) {}

  const merged = mergeBanks([salvagedExternal, apis, pidgin, bible, mega, mega2, mega3, naija, got, anime, naruto, culture, staticTrivia])
  
  // Ensure entertainment is completely removed in case it sneaks in from staticTrivia
  delete merged['entertainment']
  

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
