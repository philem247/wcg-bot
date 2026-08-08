// Regenerate the football category. Run: npm run build:football
//
// Reads data/trivia.json, replaces categories.football, writes it back. Separate
// from build-trivia.mjs so football can be rebuilt without re-fetching OpenTDB.
//
// The bank ships every valid question generated; there is no target size or
// per-league ratio to compose toward.
import { readFile, writeFile, rename } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { shuffle } from '../engine/bank.js'
import { LEAGUES, leagueWinners, playerClubs, clubVenues, cupWinners, playerNationalities } from './football/queries.mjs'
import { winnerQuestions, neverWonQuestions, neverPlayedForQuestions, venueQuestions, nationalityQuestions, playedForQuestions, clubPlayerQuestions, clubVenueQuestions, nationalityPlayerQuestions, hasWonQuestions } from './football/templates.mjs'
import { fetchBootstrap, fplQuestions, seasonFolders, fetchSeasons, fplSeasonQuestions, fplGoalsQuestions, fplSeasonPositionQuestions, fplAssistsQuestions, fplCleanSheetsQuestions } from './football/fpl.mjs'

// The bank ships every valid question generated — no target size, no per-league
// ratio to hit. The only limiter left is per TEMPLATE+ANSWER pair, and its job
// is narrow: stop one guessable fact ("what nationality is <PL player>" is
// almost always "United Kingdom") from flooding the bank. It must never act as
// a volume limiter on the bank as a whole.
export const MAX_PER_ANSWER = 100

// Dedupes by q.id, drops a question once its template+answer pair has hit
// MAX_PER_ANSWER, and returns everything else — nothing else is trimmed.
export function capAnswers(questions, random) {
  const out = []
  const seen = new Set()
  const perAnswer = new Map()
  for (const q of shuffle(questions, random)) {
    if (seen.has(q.id)) continue
    const answerKey = `${q.template}|${q.correct.toLowerCase()}`
    if ((perAnswer.get(answerKey) ?? 0) >= MAX_PER_ANSWER) continue
    seen.add(q.id)
    perAnswer.set(answerKey, (perAnswer.get(answerKey) ?? 0) + 1)
    out.push(q)
  }
  return out
}

// Returns a NEW bank; never mutates the one passed in.
export function mergeFootball(bank, football, fpl) {
  return {
    ...bank,
    generated: new Date().toISOString(),
    categories: { ...bank.categories, football, fpl },
  }
}

// One failing query must not discard the questions the others already produced.
// A nationality timeout previously wiped the Premier League's winners, venues
// and career questions along with it (see PL nationality: expected to 504 —
// it's the over-represented template anyway, capped elsewhere).
export async function tryQuery(failures, label, fn) {
  try {
    return await fn()
  } catch (e) {
    console.error(`  ${label} FAILED: ${e.message}`)
    failures.push(`${label}: ${e.message}`)
    return []
  }
}

async function main() {
  const random = Math.random
  const byTag = { pl: [], fpl: [], other: [], ucl: [] }
  const domesticClubs = new Set() // pool for a cup's never-won question
  const failures = [] // query-level failure messages — one query must not sink the run

  for (const league of Object.values(LEAGUES)) {
    console.log(`Querying ${league.name}...`)
    if (league.cup) {
      const winners = await tryQuery(failures, `${league.name} winners`, () => cupWinners(league.qid))
      const generated = [...winnerQuestions(winners, { leagueName: league.name, league: league.tag, random })]
      // National-team competitions (World Cup, Euros, Copa América, AFCON) are
      // won by national teams, not clubs — domesticClubs would put club sides
      // in the same option set as national teams. Skip never-won for those
      // rather than build a nonsense question. Club World Cup is NOT in this
      // group: despite the name its winners are clubs, so it uses the normal
      // domesticClubs pool below.
      if (!league.national) {
        const neverWonPool = [...new Set([...winners.map((r) => r.winner), ...domesticClubs])]
        generated.push(...neverWonQuestions(winners, neverWonPool, { leagueName: league.name, league: league.tag, random }))
        generated.push(...hasWonQuestions(winners, neverWonPool, { leagueName: league.name, league: league.tag, random }))
      }
      byTag[league.tag].push(...generated)
      console.log(`  ${league.name}: ${generated.length} questions`)
      continue
    }

    const winners = await tryQuery(failures, `${league.name} winners`, () => leagueWinners(league.qid))
    const clubs = await tryQuery(failures, `${league.name} playerClubs`, () => playerClubs(league.qid))
    const venues = await tryQuery(failures, `${league.name} venues`, () => clubVenues(league.qid))
    const playerUris = [...new Set(clubs.map((r) => r.id))]
    const nationalities = await tryQuery(failures, `${league.name} nationalities`, () => playerNationalities(playerUris))
    const allClubs = [...new Set(clubs.map((r) => r.club))]
    for (const c of allClubs) domesticClubs.add(c)

    const generated = [
      ...winnerQuestions(winners, { leagueName: league.name, league: league.tag, random }),
      ...hasWonQuestions(winners, allClubs, { leagueName: league.name, league: league.tag, random }),
      ...neverWonQuestions(winners, allClubs, { leagueName: league.name, league: league.tag, random }),
      ...neverPlayedForQuestions(clubs, { league: league.tag, random }),
      ...venueQuestions(venues, { league: league.tag, random }),
      ...clubVenueQuestions(venues, { league: league.tag, random }),
      ...nationalityQuestions(nationalities, { league: league.tag, random }),
      ...nationalityPlayerQuestions(nationalities, { league: league.tag, random }),
      ...playedForQuestions(clubs, { league: league.tag, random }),
      ...clubPlayerQuestions(clubs, { league: league.tag, random }),
    ]
    byTag[league.tag].push(...generated)
    console.log(`  ${league.name}: ${generated.length} questions`)
  }

  console.log('Fetching FPL...')
  const bootstrapRaw = await tryQuery(failures, 'FPL', fetchBootstrap)
  const bootstrap = Array.isArray(bootstrapRaw) ? {} : bootstrapRaw
  byTag.fpl.push(...fplQuestions(bootstrap, { random }))

  const folders = seasonFolders(bootstrap)
  if (folders.length > 0) {
    console.log(`Fetching FPL history for ${folders.length} seasons...`)
    const bySeasonCsv = await fetchSeasons(folders)
    byTag.fpl.push(...fplSeasonQuestions(bySeasonCsv, { random }))
    byTag.fpl.push(...fplGoalsQuestions(bySeasonCsv, { random }))
    byTag.fpl.push(...fplSeasonPositionQuestions(bySeasonCsv, { random }))
    byTag.fpl.push(...fplAssistsQuestions(bySeasonCsv, { random }))
    byTag.fpl.push(...fplCleanSheetsQuestions(bySeasonCsv, { random }))
  }
  console.log(`  FPL: ${byTag.fpl.length} questions`)

  if (process.env.DUMP_BYTAG) await writeFile(process.env.DUMP_BYTAG, JSON.stringify(byTag))

  // FPL is now its own category, split from football before capping. Each pool
  // is capped separately: the per-template+answer cap guards football against
  // one guessable fact (PL nationality) flooding, and guards fpl against its
  // own analogous risk (e.g. one goal-count dominating fpl-goals) — same
  // mechanism, scoped per category, rather than one combined cap or none at all.
  const footballPool = capAnswers([...byTag.pl, ...byTag.other, ...byTag.ucl], random)
  const fplPool = capAnswers(byTag.fpl, random)
  if (footballPool.length === 0 && fplPool.length === 0) {
    console.error('\nBuilt pool is empty — refusing to overwrite categories.football/fpl with nothing.')
    process.exit(1)
  }

  const bank = JSON.parse(await readFile('data/trivia.json', 'utf8'))
  // Atomic write: a ~6-minute network build interrupted mid-writeFile would
  // otherwise truncate trivia.json and destroy every category. Write to a
  // temp file, then rename into place. One write, one rename, both categories.
  await writeFile('data/trivia.json.tmp', JSON.stringify(mergeFootball(bank, footballPool, fplPool), null, 0))
  await rename('data/trivia.json.tmp', 'data/trivia.json')

  const tags = [...new Set(footballPool.map((q) => q.league))].sort()
  const counts = tags.map((t) => `${t} ${footballPool.filter((q) => q.league === t).length}`).join(', ')
  console.log(`\nWrote ${footballPool.length} football questions, ${fplPool.length} fpl questions (${counts})`)
  if (failures.length > 0) {
    console.log(`FAILED: ${failures.join(', ')}`)
  }
}

// Only run the network path when invoked directly, so the tests can import the
// pure functions above without triggering a build.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
