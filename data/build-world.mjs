import { readFile, writeFile, rename } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { runQuery } from './football/sparql.mjs'
import { queries } from './world/queries.mjs'
import { flagQuestions, capitalQuestions, currencyQuestions, nigerianStateQuestions } from './world/templates.mjs'
import { capAnswers } from './build-football.mjs'

function mergeWorld(bank, worldData) {
  return {
    ...bank,
    generated: new Date().toISOString(),
    categories: { ...bank.categories, geography: [...(bank.categories.geography || []), ...worldData] },
  }
}

async function tryQuery(failures, label, sparql) {
  try {
    return await runQuery(sparql)
  } catch (e) {
    console.error(`  ${label} FAILED: ${e.message}`)
    failures.push(`${label}: ${e.message}`)
    return []
  }
}

async function main() {
  const failures = []
  const generated = []
  const random = Math.random

  console.log('Querying World & Nigerian Geography...')
  
  const flags = await tryQuery(failures, 'Flags', queries.flags)
  generated.push(...flagQuestions(flags, { random }))
  
  const capitals = await tryQuery(failures, 'Capitals', queries.capitals)
  generated.push(...capitalQuestions(capitals, { random }))
  
  const currencies = await tryQuery(failures, 'Currencies', queries.currencies)
  generated.push(...currencyQuestions(currencies, { random }))
  
  const ngStates = await tryQuery(failures, 'Nigerian States', queries.nigerianStates)
  generated.push(...nigerianStateQuestions(ngStates, { random }))

  if (generated.length === 0) {
    console.error('\nBuilt pool is empty — refusing to overwrite categories with nothing.')
    process.exit(1)
  }

  // We cap answers in case Wikidata returns too many of a single answer (e.g. some currency that many countries use, though we excluded reverse currency questions to avoid ambiguity anyway).
  const pool = capAnswers(generated, random)

  const bank = JSON.parse(await readFile('data/trivia.json', 'utf8'))
  // Atomic write, same as build-football.mjs
  await writeFile('data/trivia.json.tmp', JSON.stringify(mergeWorld(bank, pool), null, 0))
  await rename('data/trivia.json.tmp', 'data/trivia.json')

  console.log(`\nWrote ${pool.length} world/geography questions`)
  if (failures.length > 0) {
    console.log(`FAILED: ${failures.join(', ')}`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
