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
// LIMIT keeps the response inside WDQS's timeout — the uncapped Premier League
// query returns ~19k rows (~5MB) and gets truncated mid-stream under load,
// surfacing as a JSON parse error. We only ship a few hundred questions per
// league, so this costs nothing.
export function playerClubsQuery(leagueQid) {
  return `SELECT ?player ?playerLabel ?clubLabel WHERE {
  ?player wdt:P54 ?club .
  ?club wdt:P118 wd:${leagueQid} .
  ${NO_FICTIONAL}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 10000`
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

// P54 member of sports team, P118 league, P27 country of citizenship.
// Uniqueness is enforced IN the query (GROUP BY/HAVING COUNT=1) rather than
// client-side: LIMIT 3000 with no ORDER BY made the row subset arbitrary, and
// a dual-national's two P27 rows could straddle the cut so only one showed up
// — the old client-side "nats.size !== 1" guard never fired. Verified live:
// 200 status, rows returned, no 504 (23s response, one retry under sparql.mjs
// backoff covers the occasional 502).
// ?player selected alongside ?playerLabel for the same reason as playerClubsQuery:
// two players sharing a label must not merge into one identity.
// LIMIT keeps the response inside WDQS's timeout — the uncapped Premier League
// query returns ~19k rows (~5MB) and gets truncated mid-stream under load,
// surfacing as a JSON parse error. We only ship a few hundred questions per
// league, so this costs nothing.
export function playerNationalitiesQuery(leagueQid) {
  return `SELECT ?player ?playerLabel ?natLabel WHERE {
  { SELECT ?player WHERE {
      ?player wdt:P54 ?c . ?c wdt:P118 wd:${leagueQid} . ?player wdt:P27 ?n .
    } GROUP BY ?player HAVING(COUNT(DISTINCT ?n) = 1) }
  ?player wdt:P27 ?nat .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 10000`
}

export async function playerNationalities(leagueQid, opts) {
  const rows = await runQuery(playerNationalitiesQuery(leagueQid), opts)
  return rows
    .filter((r) => r.player && r.playerLabel && r.natLabel && !isQid(r.playerLabel) && !isQid(r.natLabel))
    .map((r) => ({ id: r.player, player: r.playerLabel, nat: r.natLabel }))
}
