// Regenerate data/football/career-paths.json for Career Path mode. Run:
// node data/football/build-career-paths.mjs
//
// Network code (careerPathsQuery -> runQuery, fetchBootstrap, patchLatestClub) is
// untested by design, same rule as data/football/sparql.mjs. Everything else here
// is pure and covered in build-career-paths.test.js.
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { runQuery } from './sparql.mjs'
import { isQid, MIN_SITELINKS, LEAGUES } from './queries.mjs'

// Career Path reveals a candidate's FULL career regardless of date once
// they're in the pool (careerHistoryQuery has no year filter at all) — the
// year gate here only decides who gets discovered as a candidate in the
// first place. queries.mjs's MIN_YEAR=2000 is tuned for trivia (needs a
// recent/answerable era) and wrongly excludes legends whose ONLY qualifying
// spell in a tracked league predates it (e.g. Beckham's Man Utd spell started
// 1992). 1985 covers any career recognisable to someone alive today (late-
// career legends included) without reaching into unrecognisable 1960s-70s
// territory — MIN_SITELINKS is still the real fame gate regardless of date.
export const CAREER_PATH_MIN_YEAR = 1985
import { fetchBootstrap, recognisablePlayers } from './fpl.mjs'

// Same eligibility rule the design spec settled on: excludes one-club careers
// (nothing to reveal) and most one-transfer players (less recognisable) without
// going as low as >=2, which was considered and rejected.
export const MIN_CLUBS = 3

// The 5 major domestic leagues already trusted elsewhere in this codebase
// (queries.mjs LEAGUES) for a recognisable player pool. A global query (any
// footballer, anywhere, ever) has no scope bound and hit WDQS's server-side
// timeout (504) on its first live run — this keeps each query bounded the
// same way playerClubsQuery already proves works (13s / 1105 rows for one
// league).
export const CAREER_PATH_LEAGUES = ['premier_league', 'la_liga', 'serie_a', 'bundesliga', 'ligue_1']

// Additional leagues, career-path only — NOT added to queries.mjs's shared
// LEAGUES export (that map feeds trivia questions elsewhere; touching it
// risks unrelated regressions). Each QID confirmed live via
// `ASK/COUNT { ?club wdt:P118 wd:<qid> }` before being trusted here — league
// names collide with multiple Wikidata items across eras/reorganizations and
// only one per league actually carries current P118 club links.
export const CAREER_PATH_EXTRA_LEAGUES = {
  championship:       { qid: 'Q19510', name: 'EFL Championship' },
  eredivisie:          { qid: 'Q167541', name: 'Eredivisie' },
  primeira_liga:       { qid: 'Q182994', name: 'Primeira Liga' },
  saudi_pro_league:    { qid: 'Q255633', name: 'Saudi Pro League' },
  mls:                 { qid: 'Q18543', name: 'MLS' },
  super_lig:           { qid: 'Q485568', name: 'Süper Lig' },
  belgian_pro_league:  { qid: 'Q216022', name: 'Belgian Pro League' },
}

// First attempt at this (single query, subquery restricted to leagueQid but
// outer P54 pull unrestricted) still hit WDQS 504 live on Q9448 — an
// unrestricted outer clause defeats the query planner even when the join
// variable is pre-bound. Split into two bounded round trips instead, same
// two-step shape playerNationalitiesQuery already proves works (candidate IDs
// via a bounded query, then a VALUES-scoped second query — 891 players in,
// 1062 rows, 6.3s live).
//
// Step 1: any player with sitelinks >= MIN_SITELINKS who has at least one
// dated spell at a club in leagueQid since MIN_YEAR. No per-league clubs>=3
// HAVING here — that wrongly required 3+ DIFFERENT clubs WITHIN this single
// league (killed MLS/Saudi Pro League: late-career, one-club-in-league
// signings) — the real >=3-clubs-total-career rule is enforced later by
// eligiblePlayers() on the full merged career (buildCareerPaths, all
// leagues combined). Same shape as queries.mjs's proven playerClubsQuery,
// which has no such HAVING either.
export function candidatePlayersQuery(leagueQid) {
  return `SELECT DISTINCT ?player WHERE {
  ?player p:P54 ?st . ?st ps:P54 ?c ; pq:P580 ?start .
  ?c wdt:P118 wd:${leagueQid} . FILTER(YEAR(?start) >= ${CAREER_PATH_MIN_YEAR})
  ?player wikibase:sitelinks ?sl . FILTER(?sl >= ${MIN_SITELINKS})
}`
}

// Step 2: FULL P54 history (no club/league/year restriction — an MLS spell or
// lower-league loan outside leagueQid still needs to show up) for exactly the
// candidate set from step 1, gated via VALUES so WDQS never scans unbounded.
// P54 covers national representative squads too (senior + every youth age
// group), which pollute the club-history reveal — see career-path design
// spec. Confirmed live: the senior England team (Q47762) is typed
// wdt:P31 wd:Q135408445 ("men's national association football team"), which
// is itself wdt:P279* wd:Q6979593 ("national association football team");
// age-group squads (e.g. England U18, Q1049171) are typed P31 Q6979593
// directly. FILTER NOT EXISTS on the transitive P31/P279* chain excludes both.
//
// Q6979593 only covers 11-a-side football — a player who also turned out for
// their country's futsal or beach soccer squad still slips through (found
// live: Wissam Ben Yedder's rows included "France national futsal team").
// Confirmed live: France national futsal team (Q2398221) is typed P31
// Q94696559 ("national futsal team"); France national beach soccer team
// (Q2420906) is typed P31 Q47460286 ("national beach soccer team"). Neither
// is P279* under Q6979593 (checked: no useful common ancestor closer than
// generic "organization"), so each needs its own FILTER NOT EXISTS clause.
export function careerHistoryQuery(playerUris) {
  return `SELECT ?player ?playerLabel ?clubLabel ?start WHERE {
  VALUES ?player { ${playerUris.map((u) => `<${u}>`).join(' ')} }
  ?player p:P54 ?st .
  ?st ps:P54 ?club ; pq:P580 ?start .
  FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q6979593 }
  FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q94696559 }
  FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q47460286 }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY ?player ?start`
}

// A single VALUES batch of player URIs is a live WDQS reliability risk, not
// just a size guess: measured live, a 445-player La Liga batch 502'd on the
// first attempt and only succeeded on a bare retry. runQuery already retries
// gateway errors, but if both attempts fail the ENTIRE league's rows are lost
// (main()'s per-league try/catch skips it silently) — confirmed as the actual
// cause of Vinícius Júnior missing from a real build: he clears sitelinks,
// clears MIN_CLUBS with 3 real clubs (Flamengo, Real Madrid, Real Madrid
// Castilla), and is in La Liga's candidate set, but is unreachable through any
// other tracked league. Chunking bounds the blast radius of one WDQS hiccup to
// a slice of players instead of the whole league.
const CAREER_HISTORY_CHUNK_SIZE = 150

// Runs both steps and returns the row shape buildCareerPaths expects. Empty
// candidate set short-circuits — an empty VALUES clause is invalid SPARQL.
export async function careerPathsQuery(leagueQid, opts) {
  const candidates = await runQuery(candidatePlayersQuery(leagueQid), opts)
  const playerUris = candidates.map((r) => r.player).filter(Boolean)
  if (playerUris.length === 0) return []
  const rows = []
  for (let i = 0; i < playerUris.length; i += CAREER_HISTORY_CHUNK_SIZE) {
    const chunk = playerUris.slice(i, i + CAREER_HISTORY_CHUNK_SIZE)
    try {
      rows.push(...(await runQuery(careerHistoryQuery(chunk), opts)))
    } catch (e) {
      // One chunk's WDQS failure must not cost every OTHER chunk's players.
      console.error(`  chunk ${i / CAREER_HISTORY_CHUNK_SIZE + 1} failed: ${e.message}`)
    }
  }
  return rows
}

// Groups P54 rows by player, orders each player's spells by start date, and
// collapses consecutive identical club entries (a loan-and-return through the
// SAME club shows up as one repeated row, not a second real club — see spec's
// "distinct clubs" rule). Two different clubs with the same name are not
// something this data can distinguish and are not something the spec asks for.
export function buildCareerPaths(rows) {
  const byPlayer = new Map() // id -> { id, name, spells: [{club, start}] }
  for (const r of rows) {
    if (!r.player || !r.playerLabel || !r.clubLabel || !r.start) continue
    if (isQid(r.playerLabel) || isQid(r.clubLabel)) continue
    if (!byPlayer.has(r.player)) byPlayer.set(r.player, { id: r.player, name: r.playerLabel, spells: [] })
    byPlayer.get(r.player).spells.push({ club: r.clubLabel, start: r.start })
  }
  const out = []
  for (const { id, name, spells } of byPlayer.values()) {
    const ordered = [...spells].sort((a, b) => new Date(a.start) - new Date(b.start))
    const clubs = []
    for (const { club } of ordered) {
      if (clubs[clubs.length - 1] !== club) clubs.push(club)
    }
    out.push({ id, name, clubs })
  }
  return out
}

export function eligiblePlayers(players, minClubs = MIN_CLUBS) {
  return players.filter((p) => p.clubs.length >= minClubs)
}

// Surname-only alias. Nicknames are a manual curation step, deliberately not
// auto-generated here.
export function surnameAlias(name) {
  const parts = String(name).trim().split(/\s+/)
  const surname = parts[parts.length - 1]
  return surname && surname !== name ? surname : null
}

export function withAliases(players) {
  return players.map(({ id, name, clubs }) => {
    const surname = surnameAlias(name)
    return { id, name, aliases: surname ? [surname] : [], clubs }
  })
}

function fplPlayerName(p) {
  const full = [p.first_name, p.second_name].filter(Boolean).join(' ')
  return full || p.web_name
}

// Wikidata is the only source of full career history — a current PL player with
// no Wikidata match has no history to show, so this NEVER adds a new player.
// Its only job is freshness: when a matched player's Wikidata snapshot is
// behind their current FPL club (summer window closed, Wikidata hasn't caught
// up yet), append the FPL club as the newest entry. Mutates and returns the
// same careerPlayers array (build-time only, no purity contract to keep here).
export function mergeFplOverlay(careerPlayers, fplElements, teamById) {
  const byName = new Map(careerPlayers.map((p) => [p.name.toLowerCase(), p]))
  for (const el of fplElements) {
    const name = fplPlayerName(el)
    const club = teamById.get(el.team)
    if (!name || !club) continue
    const match = byName.get(name.toLowerCase())
    if (!match) continue // no Wikidata career history yet — skip, never fabricate one
    const last = match.clubs[match.clubs.length - 1]
    if (last !== club) match.clubs = [...match.clubs, club]
  }
  return careerPlayers
}

// Very small, best-effort parse of you.com's search response shape. Network
// code, untested by design (same rule as sparql.mjs) — falls back to null (no
// patch) on anything unexpected rather than guessing.
function extractClubFromYouComResult(data) {
  const hit = data?.hits?.[0] ?? data?.results?.[0]
  const text = hit?.snippet ?? hit?.description
  if (!text || typeof text !== 'string') return null
  // Club names are capitalized words (e.g. "Real Madrid") — stop at the first
  // lowercase word so trailing prose ("... this summer.") isn't swept in.
  const m = /(?:plays for|joined|signed for)\s+((?:[A-Z][\w.&'-]*\s?)+)/.exec(text)
  return m ? m[1].trim() : null
}

// Per-player only, never bulk — the caller decides whether/how many players to
// spend you.com budget patching. No apiKey means zero network calls: the whole
// build must work with zero you.com calls.
export async function patchLatestClub(player, { apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) return player
  const query = encodeURIComponent(`${player.name} current football club 2026`)
  const res = await fetchImpl(`https://api.you.com/v1/search?query=${query}`, {
    headers: { 'X-API-Key': apiKey },
  })
  if (!res.ok) return player // best-effort freshness patch; a failure must not break the build
  const data = await res.json()
  const club = extractClubFromYouComResult(data)
  if (!club) return player
  const clubs = player.clubs[player.clubs.length - 1] === club ? player.clubs : [...player.clubs, club]
  return { ...player, clubs }
}

async function main() {
  console.log('Querying Wikidata for career paths...')
  const rows = []
  const leagues = [
    ...CAREER_PATH_LEAGUES.map((key) => LEAGUES[key]),
    ...Object.values(CAREER_PATH_EXTRA_LEAGUES),
  ]
  for (const { qid, name } of leagues) {
    // One league's query failing (transient WDQS error) is skipped, not fatal to the build.
    try {
      const leagueRows = await careerPathsQuery(qid)
      console.log(`  ${name}: ${leagueRows.length} rows`)
      rows.push(...leagueRows)
    } catch (e) {
      console.error(`  ${name} FAILED: ${e.message}`)
    }
  }
  const base = eligiblePlayers(buildCareerPaths(rows))
  console.log(`  ${base.length} players with >= ${MIN_CLUBS} clubs`)

  console.log('Fetching FPL for freshness overlay...')
  try {
    const bootstrap = await fetchBootstrap()
    const teamById = new Map((bootstrap.teams ?? []).map((t) => [t.id, t.name]))
    mergeFplOverlay(base, recognisablePlayers(bootstrap), teamById)
  } catch (e) {
    console.error(`FPL overlay skipped: ${e.message}`)
  }

  const pool = withAliases(base)
  if (pool.length === 0) {
    console.error('\nBuilt pool is empty — refusing to overwrite career-paths.json with nothing.')
    process.exit(1)
  }

  await writeFile('data/football/career-paths.json.tmp', JSON.stringify(pool, null, 0))
  const { rename } = await import('node:fs/promises')
  await rename('data/football/career-paths.json.tmp', 'data/football/career-paths.json')
  console.log(`\nWrote ${pool.length} career paths`)
}

// Only run the network path when invoked directly — importing this module for
// tests must never trigger a live build.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
