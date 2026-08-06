// SPARQL query strings. Network — untested by design; the pure transforms that
// consume these rows live in templates.mjs and ARE tested.
import { runQuery } from './sparql.mjs'

// wikibase:label falls back to the QID string when no English label exists.
// Shared by every row-shaping function below so a bare "Q123" never ships as
// a question subject or answer.
export const isQid = (s) => /^Q\d+$/.test(s)

// Q14623646 = fictional organisation. Applied at query time (not row-shaping)
// so it also shrinks the distractor pool, not just the correct answer.
const NO_FICTIONAL = 'FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q14623646 }'

// League QIDs, with the tag each maps to for weighting (see build-football.mjs).
export const LEAGUES = {
  premier_league: { qid: 'Q9448', name: 'Premier League', tag: 'pl' },
  la_liga:        { qid: 'Q324867', name: 'La Liga', tag: 'other' },
  serie_a:        { qid: 'Q15804', name: 'Serie A', tag: 'other' },
  bundesliga:     { qid: 'Q82595', name: 'Bundesliga', tag: 'other' },
  ligue_1:        { qid: 'Q13394', name: 'Ligue 1', tag: 'other' },
  ucl:            { qid: 'Q18756', name: 'UEFA Champions League', tag: 'ucl', cup: true },
}

// P31 season-of-a-league, P3450 is-a-season-of, P1346 winner, P580 start time.
export function leagueWinnersQuery(leagueQid) {
  return `SELECT ?seasonLabel ?winnerLabel ?start WHERE {
  ?season wdt:P31 wd:Q27020041 ;
          wdt:P3450 wd:${leagueQid} ;
          wdt:P1346 ?winner ;
          wdt:P580 ?start .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY DESC(?start)`
}

export async function leagueWinners(leagueQid, opts) {
  const rows = await runQuery(leagueWinnersQuery(leagueQid), opts)
  return rows
    .filter((r) => r.seasonLabel && r.winnerLabel && !isQid(r.seasonLabel) && !isQid(r.winnerLabel))
    .map((r) => ({ season: r.seasonLabel, winner: r.winnerLabel, start: r.start }))
}

// P54 member of sports team, P118 league (club plays in), P115 home venue.
// ?player selected alongside ?playerLabel: two players sharing a label (two
// "Tommy Wilson"s) must not merge into one career — templates.mjs keys on id.
// neverPlayedForQuestions only uses players with 3+ known clubs, so the
// HAVING clause filters server-side (same trick as playerNationalitiesQuery)
// instead of downloading every player-club row and discarding most locally —
// that discarding is what collapsed this template to near-nothing under the
// old flat LIMIT. Verified live against Q9448: 2968 rows, no 504.
export function playerClubsQuery(leagueQid) {
  return `SELECT ?player ?playerLabel ?clubLabel WHERE {
  { SELECT ?player WHERE {
      ?player wdt:P54 ?c . ?c wdt:P118 wd:${leagueQid} .
    } GROUP BY ?player HAVING(COUNT(DISTINCT ?c) >= 3) }
  ?player wdt:P54 ?club .
  ?club wdt:P118 wd:${leagueQid} .
  ${NO_FICTIONAL}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
}

export async function playerClubs(leagueQid, opts) {
  const rows = await runQuery(playerClubsQuery(leagueQid), opts)
  return rows
    .filter((r) => r.player && r.playerLabel && r.clubLabel && !isQid(r.playerLabel) && !isQid(r.clubLabel))
    .map((r) => ({ id: r.player, player: r.playerLabel, club: r.clubLabel }))
}

export function clubVenuesQuery(leagueQid) {
  return `SELECT ?clubLabel ?venueLabel WHERE {
  ?club wdt:P118 wd:${leagueQid} ; wdt:P115 ?venue .
  ${NO_FICTIONAL}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
}

export async function clubVenues(leagueQid, opts) {
  const rows = await runQuery(clubVenuesQuery(leagueQid), opts)
  return rows
    .filter((r) => r.clubLabel && r.venueLabel && !isQid(r.clubLabel) && !isQid(r.venueLabel))
    .map((r) => ({ club: r.clubLabel, venue: r.venueLabel }))
}

// leagueWinnersQuery requires P31 Q27020041 (season-of-league) + P580, which
// Champions League editions don't carry — 2 rows matched. Editions use P3450
// (season of competition) + P1346 (winner) without that typing. Loose form
// verified: 96 editions, 71 with a winner.
export function cupWinnersQuery(compQid) {
  return `SELECT ?edLabel ?winnerLabel WHERE {
  ?ed wdt:P3450 wd:${compQid} ; wdt:P1346 ?winner .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
}

export async function cupWinners(compQid, opts) {
  const rows = await runQuery(cupWinnersQuery(compQid), opts)
  return rows
    .filter((r) => r.edLabel && r.winnerLabel && !isQid(r.edLabel) && !isQid(r.winnerLabel))
    .map((r) => ({ season: r.edLabel, winner: r.winnerLabel }))
}

// P27 country of citizenship. Takes the player URIs the caller already has
// from playerClubs and asks only about those, via VALUES — the earlier
// league-wide GROUP BY/HAVING(COUNT=1) subquery timed out server-side for the
// Premier League (measured: HTTP 504 on GET at 66s, HTTP 500 on POST at 60s)
// and was not fixable by retrying, so it was retired. This shape was measured
// live: 891 PL players in, 1062 rows back, 6.3s.
// ?player selected alongside ?playerLabel for the same reason as playerClubsQuery:
// two players sharing a label must not merge into one identity.
// Uniqueness is no longer server-side: every P27 row for a player comes back
// now, so playerNationalities groups by player and keeps only those with
// exactly one distinct nationality.
export function playerNationalitiesQuery(playerUris) {
  return `SELECT ?player ?playerLabel ?natLabel WHERE {
  VALUES ?player { ${playerUris.map((u) => `<${u}>`).join(' ')} }
  ?player wdt:P27 ?nat .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
}

export async function playerNationalities(playerUris, opts) {
  if (playerUris.length === 0) return []
  const rows = await runQuery(playerNationalitiesQuery(playerUris), opts)
  const byPlayer = new Map()
  for (const r of rows) {
    if (!r.player || !r.playerLabel || !r.natLabel || isQid(r.playerLabel) || isQid(r.natLabel)) continue
    if (!byPlayer.has(r.player)) byPlayer.set(r.player, [])
    byPlayer.get(r.player).push(r)
  }
  const out = []
  for (const [, playerRows] of byPlayer) {
    const nats = new Set(playerRows.map((r) => r.natLabel))
    if (nats.size !== 1) continue
    const r = playerRows[0]
    out.push({ id: r.player, player: r.playerLabel, nat: r.natLabel })
  }
  return out
}
