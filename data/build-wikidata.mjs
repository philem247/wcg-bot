import { writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { runQuery } from './football/sparql.mjs'

const queries = {
  nigerianFood: `
    SELECT ?foodLabel WHERE { 
      ?food wdt:P31/wdt:P279* wd:Q2095; wdt:P495 wd:Q1033. 
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } 
    }
  `,
  nollywood: `
    SELECT ?filmLabel ?directorLabel WHERE {
      ?film wdt:P31 wd:Q11424; wdt:P495 wd:Q1033; wdt:P57 ?director.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `,
  nigerianMusic: `
    SELECT ?albumLabel ?artistLabel WHERE {
      ?album wdt:P31 wd:Q482994; wdt:P175 ?artist.
      ?artist wdt:P27 wd:Q1033.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `,
  web3: `
    SELECT ?cryptoLabel ?inceptionLabel ?founderLabel ?tickerLabel WHERE {
      ?crypto wdt:P31 wd:Q13479982; wdt:P571 ?inception.
      OPTIONAL { ?crypto wdt:P112 ?founder. }
      OPTIONAL { ?crypto wdt:P249 ?ticker. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 500
  `,
  art: `
    SELECT ?paintingLabel ?creatorLabel ?movementLabel ?museumLabel WHERE {
      ?painting wdt:P31 wd:Q3305213; wdt:P170 ?creator.
      OPTIONAL { ?painting wdt:P135 ?movement. }
      OPTIONAL { ?painting wdt:P276 ?museum. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `,
  vehicles: `
    SELECT ?carLabel ?manufacturerLabel ?countryLabel WHERE {
      ?car wdt:P31 wd:Q3231690; wdt:P176 ?manufacturer.
      OPTIONAL { ?manufacturer wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `,
  mythology: `
    SELECT ?deityLabel ?domainLabel WHERE {
      ?deity wdt:P31 wd:Q204711; wdt:P2293 ?domain.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `,
  animals: `
    SELECT ?animalLabel ?scientificLabel WHERE {
      ?animal wdt:P31 wd:Q16521; wdt:P225 ?scientific.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `,
  anime: `
    SELECT ?animeLabel ?studioLabel WHERE {
      ?anime wdt:P31 wd:Q63704149; wdt:P272 ?studio.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `,
  nigerianHistory: `
    SELECT ?personLabel ?officeLabel WHERE {
      ?person wdt:P27 wd:Q1033; wdt:P39 ?office.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `,
  cartoons: `
    SELECT ?cartoonLabel ?creatorLabel WHERE {
      ?cartoon wdt:P31 wd:Q581714; wdt:P170 ?creator.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1000
  `
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQuestions(data, qTemplateFn, correctKey, wrongKeyPool) {
  const qs = []
  if (!data || data.length === 0) return qs
  const pool = [...new Set(data.map(d => d[wrongKeyPool]))].filter(Boolean)
  for (const item of data) {
    if (!item[correctKey]) continue
    const qText = qTemplateFn(item)
    // 3 wrong items
    const wrong = shuffle(pool.filter(p => p !== item[correctKey])).slice(0, 3)
    if (wrong.length === 3) {
      qs.push({
        id: randomUUID(),
        q: qText,
        correct: item[correctKey],
        wrong
      })
    }
  }
  return qs
}

async function tryQuery(label, sparql) {
  try {
    return await runQuery(sparql)
  } catch (e) {
    console.error(`  ${label} FAILED: ${e.message}`)
    return []
  }
}

async function main() {
  const bank = {}
  console.log('Querying Wikidata for massive generative trivia...')

  const nFood = await tryQuery('Nigerian Food', queries.nigerianFood)
  const foodQs = []
  const worldFoods = ['Sushi', 'Croissant', 'Pizza', 'Pad Thai', 'Tacos', 'Baguette', 'Hamburger', 'Paella', 'Kimchi', 'Pasta', 'Curry', 'Ramen', 'Burrito', 'Dim Sum', 'Falafel']
  
  const templates = [
    (f) => `Which of these is a traditional Nigerian food?`,
    (f) => `If you were eating traditional food in Nigeria, what might you be served?`,
    (f) => `What type of entity is ${f.foodLabel}?`,
    (f) => `Which of the following dishes originates from Nigeria?`,
    (f) => `${f.foodLabel} is a traditional food from which country?`
  ]
  
  for (const item of nFood) {
    if (!item.foodLabel || item.foodLabel.match(/^[Q\d]/)) continue
    foodQs.push({ id: randomUUID(), q: templates[0](item), correct: item.foodLabel, wrong: shuffle(worldFoods).slice(0, 3) })
    foodQs.push({ id: randomUUID(), q: templates[1](item), correct: item.foodLabel, wrong: shuffle(worldFoods).slice(0, 3) })
    foodQs.push({ id: randomUUID(), q: templates[3](item), correct: item.foodLabel, wrong: shuffle(worldFoods).slice(0, 3) })
    foodQs.push({ id: randomUUID(), q: templates[2](item), correct: 'Nigerian Food', wrong: ['Car model', 'Programming language', 'City'] })
    foodQs.push({ id: randomUUID(), q: templates[4](item), correct: 'Nigeria', wrong: ['Japan', 'France', 'Mexico', 'India', 'China', 'Brazil', 'Italy', 'USA'].sort(()=>Math.random()-0.5).slice(0, 3) })
  }
  
  bank['nigerian-food'] = foodQs

  const mArt = await tryQuery('Art', queries.art)
  bank['art'] = buildQuestions(mArt, i => `Who painted the famous artwork "${i.paintingLabel}"?`, 'creatorLabel', 'creatorLabel')
  bank['art'].push(...buildQuestions(mArt.filter(i => i.movementLabel), i => `Which art movement is "${i.paintingLabel}" commonly associated with?`, 'movementLabel', 'movementLabel'))
  bank['art'].push(...buildQuestions(mArt.filter(i => i.museumLabel), i => `Which famous museum currently houses "${i.paintingLabel}"?`, 'museumLabel', 'museumLabel'))
  
  const mVehicles = await tryQuery('Vehicles', queries.vehicles)
  const safeVehicles = mVehicles.map(v => {
    // Replace manufacturer name in car label with empty string, trim whitespace
    const cleanLabel = v.carLabel.replace(new RegExp(v.manufacturerLabel, 'gi'), '').trim()
    return { ...v, safeLabel: cleanLabel }
  }).filter(v => v.safeLabel.length > 2) // drop if empty or too short (e.g. "BMW" manufactured by "BMW")
  
  bank['vehicles'] = buildQuestions(safeVehicles, i => `Which company manufactured the "${i.safeLabel}"?`, 'manufacturerLabel', 'manufacturerLabel')
  bank['vehicles'].push(...buildQuestions(safeVehicles.filter(i => i.countryLabel), i => `Which country is the automaker ${i.manufacturerLabel} originally from?`, 'countryLabel', 'countryLabel'))
  
  const mMythology = await tryQuery('Mythology', queries.mythology)
  bank['mythology'] = buildQuestions(mMythology, i => `In mythology, ${i.deityLabel} is known as the god/deity of what?`, 'domainLabel', 'domainLabel')
  
  const mAnimals = await tryQuery('Animals', queries.animals)
  bank['animals'] = buildQuestions(mAnimals, i => `What is the scientific classification/name for the ${i.animalLabel}?`, 'scientificLabel', 'scientificLabel')
  
  const mAnime = await tryQuery('Anime', queries.anime)
  bank['anime'] = buildQuestions(mAnime, i => `Which animation studio produced the anime "${i.animeLabel}"?`, 'studioLabel', 'studioLabel')
  
  const mMusic = await tryQuery('Nigerian Music', queries.nigerianMusic)
  bank['nigerian-music'] = buildQuestions(mMusic, i => `Which Nigerian artist released the album/song "${i.albumLabel}"?`, 'artistLabel', 'artistLabel')
  
  const mNolly = await tryQuery('Nollywood', queries.nollywood)
  bank['nigerian-entertainment'] = buildQuestions(mNolly, i => `Who directed the Nollywood film "${i.filmLabel}"?`, 'directorLabel', 'directorLabel')
  
  const mHist = await tryQuery('Nigerian History', queries.nigerianHistory)
  bank['nigerian-history'] = buildQuestions(mHist, i => `Which political office or position did ${i.personLabel} hold in Nigeria?`, 'officeLabel', 'officeLabel')
  
  const mWeb3 = await tryQuery('Web3', queries.web3)
  bank['web3'] = buildQuestions(mWeb3, i => `In what year was the cryptocurrency ${i.cryptoLabel} launched/founded?`, 'inceptionLabel', 'inceptionLabel')
  bank['web3'].push(...buildQuestions(mWeb3.filter(i => i.founderLabel), i => `Who is the known founder or creator of ${i.cryptoLabel}?`, 'founderLabel', 'founderLabel'))
  bank['web3'].push(...buildQuestions(mWeb3.filter(i => i.tickerLabel), i => `What is the official ticker symbol for ${i.cryptoLabel}?`, 'tickerLabel', 'tickerLabel'))

  const mCartoons = await tryQuery('Cartoons', queries.cartoons)
  bank['cartoons'] = buildQuestions(mCartoons, i => `Who is the creator of the animated series "${i.cartoonLabel}"?`, 'creatorLabel', 'creatorLabel')

  // Print stats
  for (const [cat, qs] of Object.entries(bank)) {
    const seen = new Set()
    bank[cat] = qs.filter(q => {
      if (!q.q || !q.correct || q.wrong.length < 3) return false
      if (q.q.match(/Q\d{3,}/) || q.correct.match(/Q\d{3,}/)) return false
      if (seen.has(q.q)) return false
      seen.add(q.q)
      return true
    })
    console.log(`✅ ${cat}: ${bank[cat].length} questions`)
  }

  const output = {
    attribution: "Wikidata Generator",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/wikidata.json', JSON.stringify(output, null, 2))
  console.log('Saved to data/wikidata.json')
}

main()
