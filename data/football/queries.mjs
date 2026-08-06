// SPARQL query strings. Network — untested by design; the pure transforms that
// consume these rows live in templates.mjs and ARE tested.
import { runQuery } from './sparql.mjs'

// wikibase:label falls back to the QID string when no English label exists.
// Shared by every row-shaping function below so a bare "Q123" never ships as
// a question subject or answer.
export const isQid = (s) => /^Q\d+$/.test(s)

// Single knob for "recognisable era". A 1956 DFB-Pokal winner or a player whose
// only club spell started in 1978 is real trivia but unguessable to a room of
// players today — move this one constant to shift the whole bank's era.
export const MIN_YEAR = 2000

// The era cap alone did not solve unguessable subjects — a 2008 journeyman is
// as unrecognisable as a 1956 one. Wikipedia sitelink count is the proxy for
// fame: measured live on the Premier League (era filter already applied),
// >=25 keeps 191 players and the least-famous survivor is Glenn Murray /
// Anthony Stokes / Eric Lichaj — a reasonable "would a casual fan know them"
// bar. Single exported constant so the owner can retune in one edit.
export const MIN_SITELINKS = 25

// Q14623646 = fictional organisation. Applied at query time (not row-shaping)
// so it also shrinks the distractor pool, not just the correct answer.
const NO_FICTIONAL = 'FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q14623646 }'

// League QIDs, with the tag each maps to for weighting (see build-football.mjs).
// Non-cup leagues must be listed before any cup: the build accumulates
// domesticClubs (a cup's never-won distractor pool) from the league loop, so a
// cup iterated first would find that pool empty.
// `national: true` marks a competition won by national teams rather than
// clubs — the build skips its never-won question rather than mix national
// teams and club sides in one option set (see build-football.mjs).
export const LEAGUES = {
  premier_league: { qid: 'Q9448', name: 'Premier League', tag: 'pl' },
  la_liga:        { qid: 'Q324867', name: 'La Liga', tag: 'other' },
  serie_a:        { qid: 'Q15804', name: 'Serie A', tag: 'other' },
  bundesliga:     { qid: 'Q82595', name: 'Bundesliga', tag: 'other' },
  ligue_1:        { qid: 'Q13394', name: 'Ligue 1', tag: 'other' },
  ucl:            { qid: 'Q18756', name: 'UEFA Champions League', tag: 'ucl', cup: true },
  fa_cup:         { qid: 'Q11151', name: 'FA Cup', tag: 'pl', cup: true },
  copa_del_rey:   { qid: 'Q483794', name: 'Copa del Rey', tag: 'other', cup: true },
  dfb_pokal:      { qid: 'Q150880', name: 'DFB-Pokal', tag: 'other', cup: true },
  coppa_italia:   { qid: 'Q169918', name: 'Coppa Italia', tag: 'other', cup: true },
  efl_cup:        { qid: 'Q11152', name: 'EFL Cup', tag: 'pl', cup: true },
  copa_america:   { qid: 'Q178750', name: 'Copa América', tag: 'ucl', cup: true, national: true },
  uefa_super_cup: { qid: 'Q484028', name: 'UEFA Super Cup', tag: 'other', cup: true },
  afcon:          { qid: 'Q83145', name: 'Africa Cup of Nations', tag: 'ucl', cup: true, national: true },
  world_cup:      { qid: 'Q19317', name: 'FIFA World Cup', tag: 'ucl', cup: true, national: true },
  // Club World Cup winners are CLUBS (Real Madrid, Chelsea, ...), not national
  // teams — despite the name, it belongs with the domestic-club cups, not the
  // national: true group below.
  club_world_cup: { qid: 'Q223366', name: 'FIFA Club World Cup', tag: 'ucl', cup: true },
  euros:          { qid: 'Q260858', name: 'UEFA European Championship', tag: 'ucl', cup: true, national: true },
  europa_league:  { qid: 'Q18760', name: 'UEFA Europa League', tag: 'other', cup: true },
}

// P31 season-of-a-league, P3450 is-a-season-of, P1346 winner, P580 start time.
export function leagueWinnersQuery(leagueQid) {
  return `SELECT ?seasonLabel ?winnerLabel ?start WHERE {
  ?season wdt:P31 wd:Q27020041 ;
          wdt:P3450 wd:${leagueQid} ;
          wdt:P1346 ?winner ;
          wdt:P580 ?start .
  FILTER(YEAR(?start) >= ${MIN_YEAR})
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
//
// Restricted to club spells starting in MIN_YEAR or later via the P54
// qualifier P580 (statement-level start time), not the truthy wdt:P54 — a
// truthy triple has no start date to filter on. A birth-year filter (P569)
// was measured as an alternative and rejected: it yields far fewer players
// than a spell-start filter (251 vs 1105 on the Premier League) and produces
// visibly more obscure names. Verified live against Q9448: 1105 rows, 299
// distinct players, 13.1s — Grealish, Bellamy, Lennon, Milner.
//
// Also gated on MIN_SITELINKS (wikibase:sitelinks): era alone still let
// through journeymen a casual fan has never heard of. ?sl must sit in the
// GROUP BY alongside ?player or the query is invalid.
export function playerClubsQuery(leagueQid) {
  return `SELECT ?player ?playerLabel ?clubLabel WHERE {
  { SELECT ?player WHERE {
      ?player p:P54 ?st . ?st ps:P54 ?c ; pq:P580 ?start .
      ?c wdt:P118 wd:${leagueQid} . FILTER(YEAR(?start) >= ${MIN_YEAR})
      ?player wikibase:sitelinks ?sl . FILTER(?sl >= ${MIN_SITELINKS})
    } GROUP BY ?player ?sl HAVING(COUNT(DISTINCT ?c) >= 3) }
  ?player p:P54 ?st .
  ?st ps:P54 ?club ; pq:P580 ?start .
  ?club wdt:P118 wd:${leagueQid} .
  FILTER(YEAR(?start) >= ${MIN_YEAR})
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

// P115 home venue. Restricted to the statement with NO P582 (end time)
// qualifier — a former ground still carries a plain wdt:P115 triple, which is
// how a shipped question answered "Griffin Park" for Brentford four years
// after they left it. NO P582 = current home ground.
export function clubVenuesQuery(leagueQid) {
  return `SELECT ?clubLabel ?venueLabel WHERE {
  ?club wdt:P118 wd:${leagueQid} .
  ?club p:P115 ?vs .
  ?vs ps:P115 ?venue .
  FILTER NOT EXISTS { ?vs pq:P582 ?end }
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
//
// P580 is OPTIONAL: editions don't all carry a start-time statement (measured
// coverage, FA Cup 145 editions / 97 with P580; DFB-Pokal 81 / 74 — but every
// edition's label carries a year, e.g. "1956–57 DFB-Pokal"). cupWinners below
// falls back to parsing the label when P580 is absent.
export function cupWinnersQuery(compQid) {
  return `SELECT ?edLabel ?winnerLabel ?start WHERE {
  ?ed wdt:P3450 wd:${compQid} ; wdt:P1346 ?winner .
  OPTIONAL { ?ed wdt:P580 ?start }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
}

// First four-digit run in a label like "1956–57 DFB-Pokal" or "2006 FIFA
// World Cup" — the year an edition started or is named for.
function yearFromLabel(label) {
  const m = /\d{4}/.exec(label)
  return m ? Number(m[0]) : null
}

// P580 wins when present; otherwise fall back to the label. An edition with
// neither cannot be shown to be modern, so it is dropped rather than guessed.
function editionYear(season, starts) {
  if (starts.size > 0) return new Date([...starts][0]).getUTCFullYear()
  return yearFromLabel(season)
}

// P1346 picks up runners-up on a handful of editions (verified live: Euro 2004
// returns both Greece and Portugal). Group by edition and drop any with more
// than one distinct winner — same rule as the dual-national drop in
// playerNationalities below. Never pick the first row: that would ship one of
// two correct answers as though it were the only one.
//
// Grouped by edition label (not by edition+date), so an edition that carries
// several P580 date-value rows alongside its one winner still collapses to
// ONE question, not one per date — only the winner-count decides ambiguity.
export async function cupWinners(compQid, opts) {
  const rows = await runQuery(cupWinnersQuery(compQid), opts)
  const byEdition = new Map() // edLabel -> { winners: Set, starts: Set }
  for (const r of rows) {
    if (!r.edLabel || !r.winnerLabel || isQid(r.edLabel) || isQid(r.winnerLabel)) continue
    if (!byEdition.has(r.edLabel)) byEdition.set(r.edLabel, { winners: new Set(), starts: new Set() })
    const e = byEdition.get(r.edLabel)
    e.winners.add(r.winnerLabel)
    if (r.start) e.starts.add(r.start)
  }
  const out = []
  for (const [season, { winners, starts }] of byEdition) {
    if (winners.size !== 1) continue // ambiguous — discard, never ship
    const year = editionYear(season, starts)
    if (year === null || year < MIN_YEAR) continue // undated, or pre-modern-era
    out.push({ season, winner: [...winners][0] })
  }
  return out
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
