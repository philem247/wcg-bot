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

// No single template may own the bank: without this, nationality questions were
// 76% of it. And no answer may repeat much: most Premier League players are
// "United Kingdom", so an uncapped nationality pool degenerates into one
// question with one answer that players learn to guess blind.
export const MAX_TEMPLATE_SHARE = 0.25
// The cap is per TEMPLATE+ANSWER pair, not the bare answer: it exists so no
// answer is guessable from the template alone ("what nationality is <PL
// player>" always "United Kingdom" is the guessable case). "Which club did X
// NOT play for" shuffles its correct option among four, so the same club
// recurring as the answer across different players' questions teaches nobody
// anything — keying on the answer alone punished that template for no reason
// and starved the whole bank (2968 source rows -> 292 questions). 40 of a
// ~1500-question bank keeps any single template+answer pair under 3%.
export const MAX_PER_ANSWER = 40

// Composes the final pool to the target ratio. A tag with too few questions
// contributes everything it has rather than starving the others.
// The cap below keys on q.league, the tag stamped onto each question by
// makeQuestion — it must always equal the bucket key (tag) this loop is
// iterating, i.e. every question pushed into byTag[tag] must carry league: tag.
export function weightPool(byTag, total, random) {
  const out = []
  const seen = new Set()
  const perTemplate = new Map()
  const perAnswer = new Map()
  const templateCap = Math.round(total * MAX_TEMPLATE_SHARE)
  for (const [tag, weight] of Object.entries(WEIGHTS)) {
    const want = Math.round(total * weight)
    for (const q of shuffle(byTag[tag] ?? [], random)) {
      if (out.filter((x) => x.league === tag).length >= want) break
      if (seen.has(q.id)) continue
      if ((perTemplate.get(q.template) ?? 0) >= templateCap) continue
      const answerKey = `${q.template}|${q.correct.toLowerCase()}`
      if ((perAnswer.get(answerKey) ?? 0) >= MAX_PER_ANSWER) continue
      seen.add(q.id)
      perTemplate.set(q.template, (perTemplate.get(q.template) ?? 0) + 1)
      perAnswer.set(answerKey, (perAnswer.get(answerKey) ?? 0) + 1)
      out.push(q)
    }
  }

  return scaleToWeightRatio(out)
}

// The weights are a RATIO, not four independent quotas. If pl can only fill 43
// of its 750, letting the other tags fill theirs in full inverts the very
// emphasis the weights exist to express. Scale every tag to the most
// constrained one so the proportions survive a short league.
//
// Exported standalone (not just called at the end of weightPool) because
// enforceTemplateShare runs AFTER weightPool and trims by template share
// irrespective of league — it can re-invert the ratio weightPool just
// established (observed: a template concentrated in one league gets cut hard,
// leaving that league's count far below its weighted share again). main()
// re-applies this after enforceTemplateShare so the ratio holds on the
// pool that actually ships, not just on weightPool's intermediate output.
export function scaleToWeightRatio(pool) {
  const filledByTag = {}
  for (const tag of Object.keys(WEIGHTS)) filledByTag[tag] = pool.filter((q) => q.league === tag).length
  // A tag that produced NOTHING (filled 0) is excluded from the binding search —
  // otherwise it would force ratio 0 and collapse every other tag to zero too.
  const candidates = Object.keys(WEIGHTS).filter((tag) => filledByTag[tag] > 0)
  if (candidates.length === 0) return pool
  const bindingTag = candidates.reduce((a, b) => (filledByTag[a] / WEIGHTS[a] <= filledByTag[b] / WEIGHTS[b] ? a : b))
  const bindingRatio = filledByTag[bindingTag] / WEIGHTS[bindingTag]

  const keepCap = {}
  for (const tag of Object.keys(WEIGHTS)) keepCap[tag] = Math.round(WEIGHTS[tag] * bindingRatio)
  const kept = new Map()
  // Drop from the end of each tag's slice — the pool is already shuffled per
  // tag by weightPool, so this trims a random subset, not a biased one.
  return pool.filter((q) => {
    const n = (kept.get(q.league) ?? 0) + 1
    kept.set(q.league, n)
    return n <= keepCap[q.league]
  })
}

// weightPool's templateCap is measured against TARGET_TOTAL, but the pool it
// actually builds can land well short of that (a starved template, a failed
// league) — capping against the target then lets an over-represented template
// dominate the smaller real pool. Iterate to a fixed point: trimming shrinks
// the pool, which lowers the cap again. Converges in a few rounds; the bound
// is a guard, not an expectation.
export function enforceTemplateShare(pool, random) {
  pool = shuffle(pool, random)
  for (let round = 0; round < 10; round++) {
    // floor, not round: rounding a cap UP at the fixed point (e.g. 66.75 -> 67)
    // let the converged share sit fractionally above MAX_TEMPLATE_SHARE. floor
    // guarantees count <= floor(pool.length * share) <= pool.length * share.
    const cap = Math.max(1, Math.floor(pool.length * MAX_TEMPLATE_SHARE))
    const counts = new Map()
    for (const q of pool) counts.set(q.template, (counts.get(q.template) ?? 0) + 1)
    const over = [...counts.entries()].filter(([, n]) => n > cap)
    if (over.length === 0) return pool
    const kept = new Map()
    pool = pool.filter((q) => {
      const n = (kept.get(q.template) ?? 0) + 1
      kept.set(q.template, n)
      return n <= cap
    })
  }
  return pool
}

// Returns a NEW bank; never mutates the one passed in.
export function mergeFootball(bank, questions) {
  return {
    ...bank,
    generated: new Date().toISOString(),
    categories: { ...bank.categories, football: questions },
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
      const neverWonPool = [...new Set([...winners.map((r) => r.winner), ...domesticClubs])]
      const generated = [
        ...winnerQuestions(winners, { leagueName: league.name, league: league.tag, random }),
        ...neverWonQuestions(winners, neverWonPool, { leagueName: league.name, league: league.tag, random }),
      ]
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
      ...neverWonQuestions(winners, allClubs, { leagueName: league.name, league: league.tag, random }),
      ...neverPlayedForQuestions(clubs, { league: league.tag, random }),
      ...venueQuestions(venues, { league: league.tag, random }),
      ...nationalityQuestions(nationalities, { league: league.tag, random }),
    ]
    byTag[league.tag].push(...generated)
    console.log(`  ${league.name}: ${generated.length} questions`)
  }

  console.log('Fetching FPL...')
  const bootstrap = await tryQuery(failures, 'FPL', fetchBootstrap)
  byTag.fpl.push(...fplQuestions(Array.isArray(bootstrap) ? {} : bootstrap, { random }))
  console.log(`  FPL: ${byTag.fpl.length} questions`)

  if (process.env.DUMP_BYTAG) await writeFile(process.env.DUMP_BYTAG, JSON.stringify(byTag))

  // enforceTemplateShare trims by template share irrespective of league, which
  // can re-invert the ratio weightPool just established (a template
  // concentrated in one league gets cut hard, taking that league below its
  // weighted share again) — re-apply the ratio scale-down on what actually ships.
  const pool = scaleToWeightRatio(enforceTemplateShare(weightPool(byTag, TARGET_TOTAL, random), random))
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
    console.log(`FAILED: ${failures.join(', ')}`)
  }
}

// Only run the network path when invoked directly, so the tests can import the
// pure functions above without triggering a build.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
