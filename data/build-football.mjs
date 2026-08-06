// Regenerate the football category. Run: npm run build:football
//
// Reads data/trivia.json, replaces categories.football, writes it back. Separate
// from build-trivia.mjs so football can be rebuilt without re-fetching OpenTDB.
//
// Weighting is applied HERE, at build time, rather than in engine/bank.js: the
// runtime picker already draws uniformly from a category, so composing the pool
// to the target ratio gives the same distribution with no engine changes.
import { readFile, writeFile, rename } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { shuffle } from '../engine/bank.js'
import { LEAGUES, leagueWinners, playerClubs, clubVenues, cupWinners, playerNationalities } from './football/queries.mjs'
import { winnerQuestions, neverWonQuestions, neverPlayedForQuestions, venueQuestions, nationalityQuestions } from './football/templates.mjs'
import { fetchBootstrap, fplQuestions } from './football/fpl.mjs'

// Spec: Premier League 50%, FPL 15%, the other four leagues 25% combined,
// UCL + international 10%. Tune here and nowhere else.
export const WEIGHTS = { pl: 0.50, fpl: 0.15, other: 0.25, ucl: 0.10 }

export const TARGET_TOTAL = 1500

// Composes the final pool to the target ratio. A tag with too few questions
// contributes everything it has rather than starving the others.
// The cap below keys on q.league, the tag stamped onto each question by
// makeQuestion — it must always equal the bucket key (tag) this loop is
// iterating, i.e. every question pushed into byTag[tag] must carry league: tag.
export function weightPool(byTag, total, random) {
  const out = []
  const seen = new Set()
  for (const [tag, weight] of Object.entries(WEIGHTS)) {
    const want = Math.round(total * weight)
    for (const q of shuffle(byTag[tag] ?? [], random)) {
      if (out.filter((x) => x.league === tag).length >= want) break
      if (seen.has(q.id)) continue
      seen.add(q.id)
      out.push(q)
    }
  }
  return out
}

// Returns a NEW bank; never mutates the one passed in.
export function mergeFootball(bank, questions) {
  return {
    ...bank,
    generated: new Date().toISOString(),
    categories: { ...bank.categories, football: questions },
  }
}

async function main() {
  const random = Math.random
  const byTag = { pl: [], fpl: [], other: [], ucl: [] }
  const domesticClubs = new Set() // pool for a cup's never-won question
  const failures = [] // [name, error] — one league's flakiness must not sink the run

  for (const [key, league] of Object.entries(LEAGUES)) {
    console.log(`Querying ${league.name}...`)
    try {
      if (league.cup) {
        const winners = await cupWinners(league.qid)
        const neverWonPool = [...new Set([...winners.map((r) => r.winner), ...domesticClubs])]
        const generated = [
          ...winnerQuestions(winners, { leagueName: league.name, league: league.tag, random }),
          ...neverWonQuestions(winners, neverWonPool, { leagueName: league.name, league: league.tag, random }),
        ]
        byTag[league.tag].push(...generated)
        console.log(`  ${league.name}: ${generated.length} questions`)
        continue
      }

      const winners = await leagueWinners(league.qid)
      const clubs = await playerClubs(league.qid)
      const venues = await clubVenues(league.qid)
      const nationalities = await playerNationalities(league.qid)
      const allClubs = [...new Set(clubs.map((r) => r.club))]
      for (const c of allClubs) domesticClubs.add(c)

      const generated = [
        ...winnerQuestions(winners, { leagueName: league.name, league: league.tag, random }),
        ...neverWonQuestions(winners, allClubs, { leagueName: league.name, league: league.tag, random }),
        ...neverPlayedForQuestions(clubs, { league: league.tag, random }),
        ...venueQuestions(venues, { league: league.tag, random }),
        ...nationalityQuestions(nationalities, { league: league.tag, random }),
      ]
      byTag[league.tag].push(...generated)
      console.log(`  ${league.name}: ${generated.length} questions`)
    } catch (e) {
      console.error(`  ${league.name} FAILED: ${e.message}`)
      failures.push([key, e.message])
    }
  }

  console.log('Fetching FPL...')
  try {
    byTag.fpl.push(...fplQuestions(await fetchBootstrap(), { random }))
    console.log(`  FPL: ${byTag.fpl.length} questions`)
  } catch (e) {
    console.error(`  FPL FAILED: ${e.message}`)
    failures.push(['fpl', e.message])
  }

  if (failures.length === Object.keys(LEAGUES).length + 1) {
    console.error('\nEvery league and FPL failed — refusing to write an empty football category.')
    process.exit(1)
  }

  const pool = weightPool(byTag, TARGET_TOTAL, random)
  if (pool.length === 0) {
    console.error('\nBuilt pool is empty — refusing to overwrite categories.football with nothing.')
    process.exit(1)
  }

  const bank = JSON.parse(await readFile('data/trivia.json', 'utf8'))
  // Atomic write: a ~6-minute network build interrupted mid-writeFile would
  // otherwise truncate trivia.json and destroy all seven categories. Write to
  // a temp file, then rename into place.
  await writeFile('data/trivia.json.tmp', JSON.stringify(mergeFootball(bank, pool), null, 0))
  await rename('data/trivia.json.tmp', 'data/trivia.json')

  const counts = Object.keys(WEIGHTS).map((t) => `${t} ${pool.filter((q) => q.league === t).length}`).join(', ')
  console.log(`\nWrote ${pool.length} football questions (${counts})`)
  if (failures.length > 0) {
    console.log(`FAILED leagues: ${failures.map(([name, msg]) => `${name} (${msg})`).join(', ')}`)
  }
}

// Only run the network path when invoked directly, so the tests can import the
// pure functions above without triggering a build.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
