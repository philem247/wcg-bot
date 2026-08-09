import { writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const TTA_MAP = {
  general: 'general_knowledge',
  science: 'science',
  history: 'history',
  geography: 'geography',
  art: 'arts_and_literature',
  food: 'food_and_drink',
  sports: 'sport_and_leisure',
  music: 'music'
}

const OPENTDB_MAP = {
  general: 9,
  science: 17,
  tech: 18,
  history: 23,
  geography: 22,
  animals: 27,
  videogames: 15,
  cartoons: 32,
  art: 25,
  mythology: 20,
  vehicles: 28,
  sports: 21,
  music: 12,
  movies: 11,
  'tv-shows': 14
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchTriviaAPI(category, totalNeeded = 500) {
  let all = []
  if (!TTA_MAP[category]) return all
  console.log(`[TTA] Fetching ${category}...`)
  
  // TTA has a max limit of 50 per request. We'll page it.
  for (let i = 0; i < (totalNeeded / 50); i++) {
    try {
      const res = await fetch(`https://the-trivia-api.com/v2/questions?categories=${TTA_MAP[category]}&limit=50`)
      if (!res.ok) {
        await sleep(2000)
        continue
      }
      const data = await res.json()
      if (data.length === 0) break
      
      const mapped = data.map(q => ({
        id: q.id || randomUUID(),
        q: q.question.text,
        correct: q.correctAnswer,
        wrong: q.incorrectAnswers.slice(0, 3)
      }))
      all.push(...mapped)
      await sleep(1000)
    } catch (e) {
      console.log('TTA Error:', e.message)
      break
    }
  }
  // Deduplicate
  const seen = new Set()
  return all.filter(q => {
    if (seen.has(q.q)) return false
    seen.add(q.q)
    return true
  })
}

async function fetchOpenTDB(category, totalNeeded = 500) {
  let all = []
  if (!OPENTDB_MAP[category]) return all
  console.log(`[OpenTDB] Fetching ${category}...`)
  
  // Get a session token so we don't get duplicates
  let token = ''
  try {
    const tr = await fetch('https://opentdb.com/api_token.php?command=request')
    const td = await tr.json()
    if (td.response_code === 0) token = td.token
  } catch (e) {}

  const decode = str => str.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&shy;/g, '').replace(/&[a-z]+;/gi, '')

  for (let i = 0; i < (totalNeeded / 50); i++) {
    try {
      const url = `https://opentdb.com/api.php?amount=50&category=${OPENTDB_MAP[category]}&type=multiple${token ? '&token=' + token : ''}`
      const res = await fetch(url)
      if (res.status === 429) {
        console.log('  Rate limited, waiting 10s...')
        await sleep(10000)
        i-- // retry
        continue
      }
      const data = await res.json()
      if (data.response_code === 1) break // No more results
      if (data.response_code === 4 || data.response_code === 3) break // Token Empty
      
      const mapped = data.results.map(q => ({
        id: randomUUID(),
        q: decode(q.question),
        correct: decode(q.correct_answer),
        wrong: q.incorrect_answers.slice(0, 3).map(decode)
      }))
      all.push(...mapped)
      await sleep(2000)
    } catch (e) {
      console.log('OpenTDB Error:', e.message)
      break
    }
  }
  
  return all
}

async function main() {
  const merged = {}
  console.log('Building Global APIs (The Trivia API + OpenTDB)...')
  
  const categoriesToFetch = [
    'general', 'science', 'tech', 'history', 'geography', 
    'animals', 'videogames', 'cartoons', 'art', 
    'mythology', 'vehicles', 'sports', 'music', 'movies', 'tv-shows', 'food'
  ]
  
  for (const cat of categoriesToFetch) {
    const tta = await fetchTriviaAPI(cat, 500)
    const otdb = await fetchOpenTDB(cat, 500)
    
    // Merge
    let combined = [...tta, ...otdb]
    
    // Specific filtering for sports to remove football
    if (cat === 'sports') {
      const forbidden = ['football', 'soccer', 'fifa', 'premier league', 'nfl', 'messi', 'ronaldo']
      combined = combined.filter(q => {
        const text = (q.q + ' ' + q.correct).toLowerCase()
        return !forbidden.some(fw => text.includes(fw))
      })
    }
    
    // Deduplicate on question text
    const seen = new Set()
    combined = combined.filter(q => {
      if (seen.has(q.q)) return false
      seen.add(q.q)
      return true
    })
    
    merged[cat] = combined
    console.log(`✅ ${cat}: ${combined.length} questions`)
  }
  
  const bank = {
    attribution: "OpenTDB and The Trivia API",
    generated: new Date().toISOString(),
    categories: merged
  }
  
  await writeFile('./data/apis.json', JSON.stringify(bank, null, 2))
  console.log('Saved to data/apis.json')
}

main()
