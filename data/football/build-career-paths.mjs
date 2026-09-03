// Regenerate data/football/career-paths.json for Career Path mode. Run:
// node data/football/build-career-paths.mjs
//
// Network code (careerPathsQuery -> runQuery, fetchBootstrap, patchLatestClub) is
// untested by design, same rule as data/football/sparql.mjs. Everything else here
// is pure and covered in build-career-paths.test.js.
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { runQuery } from './sparql.mjs'
import { isQid, MIN_SITELINKS, MIN_YEAR, LEAGUES } from './queries.mjs'
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

// First attempt at this (single query, subquery restricted to leagueQid but
// outer P54 pull unrestricted) still hit WDQS 504 live on Q9448 — an
// unrestricted outer clause defeats the query planner even when the join
// variable is pre-bound. Split into two bounded round trips instead, same
// two-step shape playerNationalitiesQuery already proves works (candidate IDs
// via a bounded query, then a VALUES-scoped second query — 891 players in,
// 1062 rows, 6.3s live).
//
// Step 1: exactly playerClubsQuery's candidate subquery (sitelinks + MIN_YEAR
// spell + 3+ distinct clubs IN leagueQid), standalone, bounded the same way.
export function candidatePlayersQuery(leagueQid) {
  return `SELECT ?player WHERE {
  ?player p:P54 ?st . ?st ps:P54 ?c ; pq:P580 ?start .
  ?c wdt:P118 wd:${leagueQid} . FILTER(YEAR(?start) >= ${MIN_YEAR})
  ?player wikibase:sitelinks ?sl . FILTER(?sl >= ${MIN_SITELINKS})
} GROUP BY ?player ?sl HAVING(COUNT(DISTINCT ?c) >= 3)`
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
export function careerHistoryQuery(playerUris) {
  return `SELECT ?player ?playerLabel ?clubLabel ?start WHERE {
  VALUES ?player { ${playerUris.map((u) => `<${u}>`).join(' ')} }
  ?player p:P54 ?st .
  ?st ps:P54 ?club ; pq:P580 ?start .
  FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q6979593 }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY ?player ?start`
}

// Runs both steps and returns the row shape buildCareerPaths expects. Empty
// candidate set short-circuits — an empty VALUES clause is invalid SPARQL.
export async function careerPathsQuery(leagueQid, opts) {
  const candidates = await runQuery(candidatePlayersQuery(leagueQid), opts)
  const playerUris = candidates.map((r) => r.player).filter(Boolean)
  if (playerUris.length === 0) return []
  return runQuery(careerHistoryQuery(playerUris), opts)
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
  for (const key of CAREER_PATH_LEAGUES) {
    const { qid, name } = LEAGUES[key]
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
  const bootstrap = await fetchBootstrap()
  const teamById = new Map((bootstrap.teams ?? []).map((t) => [t.id, t.name]))
  mergeFplOverlay(base, recognisablePlayers(bootstrap), teamById)

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
