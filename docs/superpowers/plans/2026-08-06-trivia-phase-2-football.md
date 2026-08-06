# Trivia Phase 2 — Football Question Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the `football` question category at build time from Wikidata (CC0) and the Fantasy Premier League API, so `/trivia football` serves real, verified, single-answer questions.

**Architecture:** A new `npm run build:football` script fetches from Wikidata's SPARQL endpoint and the FPL API, turns rows into questions through pure template functions, verifies every question resolves to exactly one correct answer, composes the pool to the spec's league weighting, and merges the result into the existing `data/trivia.json` under `categories.football`. Nothing about the runtime changes: `engine/bank.js` already offers any category that has questions.

**Tech Stack:** Node 22 built-ins only (`fetch`, `node:crypto`, `node:fs/promises`). No new dependencies. Assert-based tests via `node:assert/strict`, no framework.

## Global Constraints

- **No new npm dependencies.** Never run `npm install`; never edit `dependencies` or `overrides`. `baileys` stays pinned `~6.7.24` with a tilde.
- **`data/` is otherwise read-only.** Never write to `data/words.txt`, `data/common.txt`, `data/extra.txt`, or `data/lang/`. This plan writes `data/trivia.json` and creates files under `data/football/`.
- **Never touch `session/`.** It holds live WhatsApp credentials.
- **Never modify the real `wcg.db`.** Tests use `:memory:` only.
- **No network access at runtime.** All fetching happens in build scripts under `data/`. The bot process must never make an outbound request.
- **Network code is untested by design; pure transforms ARE tested.** This mirrors `data/build-trivia.mjs`, whose header states the rule. Tests must not hit the network.
- **Answer uniqueness is mandatory.** Every generated question must resolve to exactly one correct answer (a `COUNT = 1` check on the generating result set). A question failing the check is discarded, not shipped.
- **Distractors come from the same result set** as the correct answer — other Champions League winners, not random clubs — or questions are guessable at a glance.
- **Four options, all distinct.** Same rule `normalizeQuestion` already enforces: `new Set([correct, ...wrong].map(lowercase)).size === 4`.
- **FPL questions are season-stamped, never gameweek-stamped.** Phrase as `"…in the 2025/26 season"`. There is no current gameweek pre-season (`is_current: false` on GW1), and season totals reset on 21 Aug 2026.
- **Third-party quiz questions are never harvested.** Only CC0 Wikidata, the public FPL API, and CC BY-SA OpenTDB.
- **League weighting** — Premier League 50%, FPL 15%, La Liga + Serie A + Bundesliga + Ligue 1 25% combined, UCL + international 10%. Tunable in one constant.
- **Wikidata etiquette:** descriptive `User-Agent` on every request, queries run serially with a delay between them, and a hard cap on total queries per build.

---

## File Structure

| File | Responsibility |
|---|---|
| `data/football/sparql.mjs` | **New.** Thin SPARQL client: build URL, set headers, parse the JSON result into plain row objects, retry with backoff. Network — untested. |
| `data/football/queries.mjs` | **New.** The SPARQL query strings and their row shapes. One exported function per query. Network — untested. |
| `data/football/templates.mjs` | **New.** Pure. Rows in, question objects out. Uniqueness check, distractor selection, phrasing. **This is where bad questions come from, so this is what gets tested.** |
| `data/football/templates.test.js` | **New.** Tests for every template and the uniqueness/distractor rules. |
| `data/football/fpl.mjs` | **New.** FPL fetch (untested) plus pure season-stamped template functions (tested). |
| `data/football/fpl.test.js` | **New.** Tests for the FPL pure transforms against a fixture. |
| `data/build-football.mjs` | **New.** Orchestrator: run queries, build questions, weight the pool, merge into `data/trivia.json`. |
| `data/build-football.test.js` | **New.** Tests for pool weighting and the merge, using injected data (no network, no real trivia.json write). |
| `package.json` | **Modify.** Add `build:football` script and the three new test files to `test`. |
| `LICENSES.md` | **Modify.** Add Wikidata (CC0) and FPL attribution. |
| `README.md` | **Modify.** Document `npm run build:football` and when to re-run it. |

**Design decision — weighting happens at build time, not run time.** The spec calls for weighted *selection*. Composing the pool so it already holds ~50% Premier League, 15% FPL, 25% other-four and 10% UCL/international achieves the same distribution and requires **zero changes to `engine/bank.js`**, which already picks uniformly at random from a category. Weighting inside the runtime picker would mean a second, football-only code path in the engine for no behavioural gain.

---

### Task 1: SPARQL client and a verified first query

**Files:**
- Create: `data/football/sparql.mjs`
- Create: `data/football/queries.mjs`

**Interfaces:**
- Produces: `runQuery(sparql, opts) -> Promise<Array<Object>>` where each row maps variable name to its string value. `opts` is `{ endpoint, userAgent, fetchImpl, delayMs }`, all defaulted.
- Produces: `USER_AGENT` (string), `ENDPOINT` (string).
- Produces: `leagueWinners(leagueQid, opts) -> Promise<Array<{season, winner, start}>>` — `opts` is the same options object `runQuery` takes and may be omitted.
- Produces: `LEAGUES` — the league QIDs used by later tasks.

- [ ] **Step 1: Probe the endpoint by hand before writing any code**

Ordering by the season entity URI silently returns seasons out of order — verified on 2026-08-06, which produced `1997–98, 1999–2000, 1993–94`. Order by a bound date instead. Run this to confirm the shape before building on it:

```bash
node -e '
const q = `SELECT ?seasonLabel ?winnerLabel ?start WHERE {
  ?season wdt:P31 wd:Q27020041 ; wdt:P3450 wd:Q9448 ; wdt:P1346 ?winner ; wdt:P580 ?start .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY DESC(?start) LIMIT 5`;
const u = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q);
fetch(u, {headers:{"User-Agent":"wcg-bot-trivia-build/0.1 (github.com/philem247)","Accept":"application/sparql-results+json"}})
  .then(r=>r.json()).then(j=>console.log(j.results.bindings.map(b=>`${b.seasonLabel.value} -> ${b.winnerLabel.value} (${b.start.value})`)))'
```

Expected: 5 rows, newest season first, each with a club name.

**Two things already verified on 2026-08-06, so do not re-litigate them:**

1. `ORDER BY DESC(?season)` — ordering by the *entity URI* — returns seasons out of order (`1997–98, 1999–2000, 1993–94`). Order by `?start` or `?seasonLabel`, never by `?season`. Ordering is cosmetic here regardless: every returned row becomes a question, so nothing is dropped by a bad sort.
2. Requiring `wdt:P580` costs nothing — the Premier League query returns **31 seasons either way**. Do not switch it to `OPTIONAL` on the theory that it filters rows out; it does not.

**Expect gaps in recent seasons.** The Premier League has run 34 seasons through 2025/26 but only 31 carry a `P1346` winner — 2022–23, 2023–24 and 2024–25 have none in Wikidata. The bank will therefore skew historical. This is missing source data, not a broken query: do not "fix" it by loosening the query, and do not hand-enter the missing winners (that is editorial content, not CC0 data).

- [ ] **Step 2: Write `data/football/sparql.mjs`**

```js
// SPARQL client for Wikidata (CC0). Build-time only — the bot never calls this.
// Network code is untested by design, same rule as data/build-trivia.mjs.
export const ENDPOINT = 'https://query.wikidata.org/sparql'

// Wikidata asks every automated client to identify itself. An anonymous or
// browser-spoofing agent gets throttled or blocked outright.
export const USER_AGENT = 'wcg-bot-trivia-build/1.0 (https://github.com/philem247/wcg-bot)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A 4xx other than 429 means the request itself is wrong — a malformed query, a
// bad endpoint. Retrying cannot fix it, and burning the backoff hides the real
// error for ~14s. Only throttling (429) and server faults (5xx) are worth a retry.
class PermanentError extends Error {}

// Serial by design with a delay between calls: WDQS is a shared public service
// and parallel bursts are what gets a client banned.
export async function runQuery(sparql, {
  endpoint = ENDPOINT,
  userAgent = USER_AGENT,
  fetchImpl = fetch,
  delayMs = 1000,
  maxAttempts = 4,
} = {}) {
  const url = `${endpoint}?format=json&query=${encodeURIComponent(sparql)}`
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/sparql-results+json' },
      })
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`WDQS ${res.status}`) // retryable
      }
      if (!res.ok) {
        throw new PermanentError(`WDQS ${res.status}: ${(await res.text()).slice(0, 200)}`)
      }
      const json = await res.json()
      await sleep(delayMs)
      return (json.results?.bindings ?? []).map((row) => {
        const out = {}
        for (const [k, v] of Object.entries(row)) out[k] = v.value
        return out
      })
    } catch (e) {
      if (e instanceof PermanentError) throw e // never retry a request that is simply wrong
      lastErr = e
      if (attempt === maxAttempts) break
      // Exponential backoff: 2s, 4s, 8s.
      await sleep(1000 * 2 ** attempt)
    }
  }
  throw new Error(`SPARQL query failed after ${maxAttempts} attempts: ${lastErr?.message}`)
}
```

- [ ] **Step 3: Write `data/football/queries.mjs` with the league-winners query**

Use whichever ordering Step 1 confirmed.

```js
// SPARQL query strings. Network — untested by design; the pure transforms that
// consume these rows live in templates.mjs and ARE tested.
import { runQuery } from './sparql.mjs'

// League QIDs, with the tag each maps to for weighting (see build-football.mjs).
export const LEAGUES = {
  premier_league: { qid: 'Q9448', name: 'Premier League', tag: 'pl' },
  la_liga:        { qid: 'Q324867', name: 'La Liga', tag: 'other' },
  serie_a:        { qid: 'Q15804', name: 'Serie A', tag: 'other' },
  bundesliga:     { qid: 'Q82595', name: 'Bundesliga', tag: 'other' },
  ligue_1:        { qid: 'Q13394', name: 'Ligue 1', tag: 'other' },
  ucl:            { qid: 'Q18756', name: 'UEFA Champions League', tag: 'ucl' },
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
    .filter((r) => r.seasonLabel && r.winnerLabel)
    .map((r) => ({ season: r.seasonLabel, winner: r.winnerLabel, start: r.start }))
}
```

- [ ] **Step 4: Verify against the live endpoint**

```bash
node -e '
import("./data/football/queries.mjs").then(async (m) => {
  const rows = await m.leagueWinners(m.LEAGUES.premier_league.qid)
  console.log("rows:", rows.length)
  console.log(rows.slice(0, 3))
})'
```

Expected: 30+ rows, newest first, each `{season, winner, start}` with non-empty strings.

- [ ] **Step 5: Commit**

```bash
git add data/football/sparql.mjs data/football/queries.mjs
git commit -m "feat: add Wikidata SPARQL client and league-winners query"
```

---

### Task 2: Question templates — uniqueness and distractors

This is the task the whole plan turns on. Every question the bot ships passes through here.

**Files:**
- Create: `data/football/templates.mjs`
- Create: `data/football/templates.test.js`

**Interfaces:**
- Consumes: rows from `leagueWinners` — `{season, winner, start}`.
- Produces: `pickDistractors(correct, pool, count, random) -> Array<string> | null`
- Produces: `makeQuestion({ q, correct, pool, league, random }) -> Object | null` — the single choke point that every template goes through. Returns `null` if the question cannot be made safely.
- Produces: `winnerQuestions(rows, { leagueName, league, random }) -> Array<Object>`
- Produces: `neverWonQuestions(rows, allClubs, { leagueName, league, random }) -> Array<Object>`
- Question object shape (matches what `engine/bank.js` and `engine/trivia.js` already consume): `{ id, q, correct, wrong: [3], league }`.

- [ ] **Step 1: Write the failing tests**

```js
import assert from 'node:assert/strict'
import { pickDistractors, makeQuestion, winnerQuestions, neverWonQuestions } from './templates.mjs'

const fixed = (v = 0) => () => v

const tests = [
  {
    name: 'pickDistractors: draws from the pool, never the correct answer, never duplicates',
    fn: () => {
      const pool = ['Arsenal', 'Chelsea', 'Liverpool', 'Everton', 'Arsenal']
      const d = pickDistractors('Arsenal', pool, 3, fixed(0))
      assert.equal(d.length, 3)
      assert.ok(!d.includes('Arsenal'), 'the correct answer must never be a distractor')
      assert.equal(new Set(d).size, 3, 'distractors must be distinct')
    },
  },
  {
    name: 'pickDistractors: returns null when the pool cannot supply enough distinct wrong answers',
    fn: () => {
      assert.equal(pickDistractors('Arsenal', ['Arsenal', 'Chelsea'], 3, fixed(0)), null)
    },
  },
  {
    name: 'makeQuestion: rejects a pool whose only members equal the correct answer',
    fn: () => {
      const out = makeQuestion({ q: 'Who?', correct: 'Arsenal', pool: ['Arsenal', 'Arsenal'], league: 'pl', random: fixed(0) })
      assert.equal(out, null)
    },
  },
  {
    name: 'makeQuestion: produces four distinct options and carries the league tag',
    fn: () => {
      const out = makeQuestion({
        q: 'Who won it?', correct: 'Arsenal',
        pool: ['Chelsea', 'Liverpool', 'Everton'], league: 'pl', random: fixed(0),
      })
      assert.equal(out.correct, 'Arsenal')
      assert.equal(out.wrong.length, 3)
      assert.equal(new Set([out.correct, ...out.wrong]).size, 4)
      assert.equal(out.league, 'pl')
      assert.ok(out.id && out.id.length === 12, 'stable 12-hex id')
    },
  },
  {
    name: 'makeQuestion: the same question text always yields the same id',
    fn: () => {
      const args = { q: 'Same text?', correct: 'A', pool: ['B', 'C', 'D'], league: 'pl', random: fixed(0) }
      assert.equal(makeQuestion(args).id, makeQuestion(args).id)
    },
  },
  {
    name: 'winnerQuestions: one question per season, distractors are other winners of the same league',
    fn: () => {
      const rows = [
        { season: '2019–20 Premier League', winner: 'Liverpool F.C.' },
        { season: '2018–19 Premier League', winner: 'Manchester City F.C.' },
        { season: '2017–18 Premier League', winner: 'Manchester City F.C.' },
        { season: '2016–17 Premier League', winner: 'Chelsea F.C.' },
        { season: '2015–16 Premier League', winner: 'Leicester City F.C.' },
      ]
      const qs = winnerQuestions(rows, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.ok(qs.length > 0)
      const q = qs.find((x) => x.correct === 'Leicester City F.C.')
      assert.ok(q, 'the 2015-16 season must produce a question')
      assert.ok(q.q.includes('2015–16'), 'question names the season it asks about')
      for (const w of q.wrong) {
        assert.ok(rows.some((r) => r.winner === w), 'every distractor is a real winner of this league')
      }
    },
  },
  {
    name: 'winnerQuestions: a season with two different winners recorded is discarded, not shipped',
    fn: () => {
      // Wikidata occasionally carries conflicting winner statements. Two correct
      // answers for one season violates the uniqueness requirement outright.
      const rows = [
        { season: '2019–20 Premier League', winner: 'Liverpool F.C.' },
        { season: '2019–20 Premier League', winner: 'Manchester City F.C.' },
        { season: '2018–19 Premier League', winner: 'Manchester City F.C.' },
        { season: '2017–18 Premier League', winner: 'Chelsea F.C.' },
        { season: '2016–17 Premier League', winner: 'Leicester City F.C.' },
      ]
      const qs = winnerQuestions(rows, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.ok(!qs.some((q) => q.q.includes('2019–20')), 'ambiguous season must be dropped')
    },
  },
  {
    name: 'neverWonQuestions: the correct answer has never won, all three distractors have',
    fn: () => {
      const rows = [
        { season: 'a', winner: 'Manchester City F.C.' },
        { season: 'b', winner: 'Chelsea F.C.' },
        { season: 'c', winner: 'Leicester City F.C.' },
        { season: 'd', winner: 'Liverpool F.C.' },
      ]
      const allClubs = ['Manchester City F.C.', 'Chelsea F.C.', 'Leicester City F.C.', 'Liverpool F.C.', 'Newcastle United F.C.']
      const qs = neverWonQuestions(rows, allClubs, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.ok(qs.length > 0)
      const q = qs[0]
      assert.equal(q.correct, 'Newcastle United F.C.', 'the never-won club is the answer')
      for (const w of q.wrong) {
        assert.ok(rows.some((r) => r.winner === w), 'every distractor HAS won it')
      }
      assert.ok(/NEVER/i.test(q.q), 'question makes the inversion explicit')
    },
  },
  {
    name: 'neverWonQuestions: returns nothing when two or more clubs have never won',
    fn: () => {
      // Two valid answers means the question has no single correct answer.
      const rows = [{ season: 'a', winner: 'Chelsea F.C.' }, { season: 'b', winner: 'Liverpool F.C.' }, { season: 'c', winner: 'Arsenal F.C.' }]
      const allClubs = ['Chelsea F.C.', 'Liverpool F.C.', 'Arsenal F.C.', 'Newcastle United F.C.', 'Everton F.C.']
      const qs = neverWonQuestions(rows, allClubs, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.deepEqual(qs, [], 'ambiguous never-won set must produce nothing')
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}: ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
```

- [ ] **Step 2: Run to verify it fails**

Run: `node data/football/templates.test.js`
Expected: FAIL — `Cannot find module './templates.mjs'`

- [ ] **Step 3: Write `data/football/templates.mjs`**

```js
// Pure question builders. Rows in, questions out — no network, no clock, no
// Math.random(). Randomness is injected so the suite is reproducible, the same
// rule engine/ follows.
//
// Every question in the shipped bank passes through makeQuestion(), which is the
// one place the four-distinct-options and same-result-set-distractor rules are
// enforced. Add templates by calling it; never build a question object by hand.
import { questionId } from '../build-trivia.mjs'
import { shuffle } from '../../engine/bank.js'

// Draws `count` distinct wrong answers from `pool`, excluding the correct answer.
// Returns null when the pool cannot supply enough — the caller must then discard
// the question rather than pad it with something unrelated.
export function pickDistractors(correct, pool, count, random) {
  // Case-insensitive so a variant spelling of the correct answer is excluded here
  // rather than surviving into the options and forcing makeQuestion to throw away
  // an otherwise-good question.
  const candidates = [...new Set(pool)].filter((x) => x && x.toLowerCase() !== correct.toLowerCase())
  if (candidates.length < count) return null
  return shuffle(candidates, random).slice(0, count)
}

// Club labels arrive from two different SPARQL queries and can differ in
// punctuation ("Manchester City F.C." vs "Manchester City FC"). Comparing raw
// strings across sources would mark a club that HAS won as never-won — a question
// whose correct answer is factually false, which makeQuestion cannot catch because
// it only dedupes the four options against each other, never against ground truth.
// Strip the dots FIRST so the suffix becomes a whole token, then remove it on a
// word boundary — never as a trailing substring. Stripping `(afc|fc|cf|sc)$` from
// the already-squashed string matches the "afc" inside "chelseafc" and eats the
// "a", so "Chelsea F.C." and "Chelsea" stop matching. Verified against the real
// 31 Premier League winner labels on 2026-08-06.
export function clubKey(name) {
  return String(name)
    .toLowerCase()
    .replace(/\./g, '')                 // "f.c." -> "fc", so the suffix is one token
    .replace(/\b(afc|fc|cf|sc)\b/g, '') // drop the club-type token, never a substring
    .replace(/[^a-z0-9]/g, '')
}

// The single choke point. Returns null if the question cannot be built safely.
export function makeQuestion({ q, correct, pool, league, random }) {
  if (!q || !correct) return null
  const wrong = pickDistractors(correct, pool, 3, random)
  if (!wrong) return null
  // Belt and braces: same check normalizeQuestion applies to OpenTDB questions.
  if (new Set([correct, ...wrong].map((s) => s.toLowerCase())).size !== 4) return null
  return { id: questionId(q), q, correct, wrong, league }
}

// "Who won the 2019/20 Premier League?"
// A season with more than one recorded winner is dropped: two correct answers.
export function winnerQuestions(rows, { leagueName, league, random }) {
  const bySeason = new Map()
  for (const r of rows) {
    if (!r.season || !r.winner) continue
    if (!bySeason.has(r.season)) bySeason.set(r.season, new Set())
    bySeason.get(r.season).add(r.winner)
  }
  const allWinners = [...new Set(rows.map((r) => r.winner).filter(Boolean))]

  const out = []
  for (const [season, winners] of bySeason) {
    if (winners.size !== 1) continue // ambiguous — discard, never ship
    const correct = [...winners][0]
    const question = makeQuestion({
      q: `Who won the ${season}?`,
      correct,
      pool: allWinners,
      league,
      random,
    })
    if (question) out.push(question)
  }
  return out
}

// "Which of these clubs has NEVER won the Premier League?"
// Requires exactly one never-won club among the candidates, or the question has
// more than one correct answer.
export function neverWonQuestions(rows, allClubs, { leagueName, league, random }) {
  const winners = new Set(rows.map((r) => r.winner).filter(Boolean))
  // Normalized comparison: `allClubs` and `rows` come from different queries.
  const winnerKeys = new Set([...winners].map(clubKey))
  const neverWon = allClubs.filter((c) => !winnerKeys.has(clubKey(c)))
  if (neverWon.length !== 1) return [] // 0 = no question; 2+ = ambiguous
  const question = makeQuestion({
    q: `Which of these clubs has NEVER won the ${leagueName}?`,
    correct: neverWon[0],
    pool: [...winners],
    league,
    random,
  })
  return question ? [question] : []
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node data/football/templates.test.js`
Expected: `9 passed, 0 failed`

- [ ] **Step 5: Commit**

```bash
git add data/football/templates.mjs data/football/templates.test.js
git commit -m "feat: add football question templates with uniqueness and distractor rules"
```

---

### Task 3: Career and venue templates

**Files:**
- Modify: `data/football/queries.mjs`
- Modify: `data/football/templates.mjs`
- Modify: `data/football/templates.test.js`

**Interfaces:**
- Consumes: `makeQuestion`, `pickDistractors` from Task 2.
- Produces: `playerClubsQuery(leagueQid)`, `playerClubs(leagueQid, opts) -> Promise<Array<{player, club}>>`
- Produces: `clubVenuesQuery(leagueQid)`, `clubVenues(leagueQid, opts) -> Promise<Array<{club, venue}>>`
- Produces: `neverPlayedForQuestions(rows, { league, random }) -> Array<Object>`
- Produces: `venueQuestions(rows, { league, random }) -> Array<Object>`

- [ ] **Step 1: Probe both queries against the live endpoint first**

Templates built on a query that returns nothing are wasted work. Confirm shape before writing code:

```bash
node -e '
import("./data/football/sparql.mjs").then(async ({ runQuery }) => {
  const clubs = `SELECT ?playerLabel ?clubLabel WHERE {
    ?player wdt:P54 ?club . ?club wdt:P118 wd:Q9448 .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 20`
  const venues = `SELECT ?clubLabel ?venueLabel WHERE {
    ?club wdt:P118 wd:Q9448 ; wdt:P115 ?venue .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 20`
  console.log("clubs:", (await runQuery(clubs)).slice(0, 3))
  console.log("venues:", (await runQuery(venues)).slice(0, 3))
})'
```

Expected: both print rows with readable English labels. If labels come back as bare `Q`-numbers, the `SERVICE wikibase:label` block is misplaced — it must be inside the `WHERE`.

- [ ] **Step 2: Write the failing tests**

Append these to the `tests` array in `data/football/templates.test.js`, and add `neverPlayedForQuestions, venueQuestions` to the import at the top of that file.

```js
  {
    name: 'neverPlayedForQuestions: the answer is a club the player never played for',
    fn: () => {
      const rows = [
        { player: 'Fernandinho', club: 'Manchester City F.C.' },
        { player: 'Fernandinho', club: 'Shakhtar Donetsk' },
        { player: 'Fernandinho', club: 'Athletico Paranaense' },
        { player: 'Other Player', club: 'Everton F.C.' },
        { player: 'Other Player', club: 'Arsenal F.C.' },
        { player: 'Third Player', club: 'Chelsea F.C.' },
      ]
      const qs = neverPlayedForQuestions(rows, { league: 'pl', random: fixed(0) })
      const q = qs.find((x) => x.q.includes('Fernandinho'))
      assert.ok(q, 'a player with 3+ clubs yields a question')
      assert.ok(/NOT|never/i.test(q.q))
      const played = ['Manchester City F.C.', 'Shakhtar Donetsk', 'Athletico Paranaense']
      assert.ok(!played.includes(q.correct), 'the answer is a club he did NOT play for')
      for (const w of q.wrong) assert.ok(played.includes(w), 'distractors are clubs he DID play for')
    },
  },
  {
    name: 'neverPlayedForQuestions: skips players with fewer than three known clubs',
    fn: () => {
      const rows = [
        { player: 'Loyal One', club: 'Everton F.C.' },
        { player: 'Someone', club: 'Arsenal F.C.' },
        { player: 'Someone', club: 'Chelsea F.C.' },
        { player: 'Someone', club: 'Leeds United F.C.' },
      ]
      const qs = neverPlayedForQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.ok(!qs.some((q) => q.q.includes('Loyal One')), 'one club cannot fill three distractors')
    },
  },
  {
    name: 'venueQuestions: distractors are other real venues, never invented',
    fn: () => {
      const rows = [
        { club: 'Arsenal F.C.', venue: 'Emirates Stadium' },
        { club: 'Chelsea F.C.', venue: 'Stamford Bridge' },
        { club: 'Everton F.C.', venue: 'Goodison Park' },
        { club: 'Liverpool F.C.', venue: 'Anfield' },
      ]
      const qs = venueQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.equal(qs.length, 4)
      const all = rows.map((r) => r.venue)
      for (const q of qs) for (const w of q.wrong) assert.ok(all.includes(w))
    },
  },
  {
    name: 'venueQuestions: a club with two recorded venues is dropped as ambiguous',
    fn: () => {
      const rows = [
        { club: 'Arsenal F.C.', venue: 'Emirates Stadium' },
        { club: 'Arsenal F.C.', venue: 'Highbury' },
        { club: 'Chelsea F.C.', venue: 'Stamford Bridge' },
        { club: 'Everton F.C.', venue: 'Goodison Park' },
        { club: 'Liverpool F.C.', venue: 'Anfield' },
      ]
      const qs = venueQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.ok(!qs.some((q) => q.q.includes('Arsenal')), 'two venues = two correct answers')
    },
  },
```

- [ ] **Step 3: Run to verify they fail**

Run: `node data/football/templates.test.js`
Expected: FAIL — `neverPlayedForQuestions is not a function`

- [ ] **Step 4: Add the queries to `data/football/queries.mjs`**

```js
// P54 member of sports team, P118 league (club plays in), P115 home venue.
export function playerClubsQuery(leagueQid) {
  return `SELECT ?playerLabel ?clubLabel WHERE {
  ?player wdt:P54 ?club .
  ?club wdt:P118 wd:${leagueQid} .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
}

export async function playerClubs(leagueQid, opts) {
  const rows = await runQuery(playerClubsQuery(leagueQid), opts)
  return rows
    .filter((r) => r.playerLabel && r.clubLabel)
    .map((r) => ({ player: r.playerLabel, club: r.clubLabel }))
}

export function clubVenuesQuery(leagueQid) {
  return `SELECT ?clubLabel ?venueLabel WHERE {
  ?club wdt:P118 wd:${leagueQid} ; wdt:P115 ?venue .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
}

export async function clubVenues(leagueQid, opts) {
  const rows = await runQuery(clubVenuesQuery(leagueQid), opts)
  return rows
    .filter((r) => r.clubLabel && r.venueLabel)
    .map((r) => ({ club: r.clubLabel, venue: r.venueLabel }))
}
```

- [ ] **Step 5: Add the templates to `data/football/templates.mjs`**

```js
// "Which club did Fernandinho NOT play for?"
// Needs 3 clubs he DID play for as distractors, plus one he did not as the answer.
// The answer is drawn from clubs OTHER players played for, so it is always a real
// club rather than an invented name.
export function neverPlayedForQuestions(rows, { league, random }) {
  const byPlayer = new Map()
  const allClubs = new Set()
  for (const r of rows) {
    if (!r.player || !r.club) continue
    if (!byPlayer.has(r.player)) byPlayer.set(r.player, new Set())
    byPlayer.get(r.player).add(r.club)
    allClubs.add(r.club)
  }

  const out = []
  for (const [player, clubs] of byPlayer) {
    if (clubs.size < 3) continue // cannot fill three distractors from his real clubs
    const notPlayed = [...allClubs].filter((c) => !clubs.has(c))
    if (notPlayed.length === 0) continue
    const correct = shuffle(notPlayed, random)[0]
    const question = makeQuestion({
      q: `Which of these clubs did ${player} NOT play for?`,
      correct,
      pool: [...clubs],
      league,
      random,
    })
    if (question) out.push(question)
  }
  return out
}

// "Which club plays its home games at Anfield?" — asked venue -> club so the
// distractors are other venues, which reads better than four club names.
// A club with more than one recorded venue is dropped: historic grounds mean
// two defensible answers.
export function venueQuestions(rows, { league, random }) {
  const byClub = new Map()
  for (const r of rows) {
    if (!r.club || !r.venue) continue
    if (!byClub.has(r.club)) byClub.set(r.club, new Set())
    byClub.get(r.club).add(r.venue)
  }
  const allVenues = [...new Set(rows.map((r) => r.venue).filter(Boolean))]

  const out = []
  for (const [club, venues] of byClub) {
    if (venues.size !== 1) continue
    const question = makeQuestion({
      q: `At which stadium does ${club} play its home games?`,
      correct: [...venues][0],
      pool: allVenues,
      league,
      random,
    })
    if (question) out.push(question)
  }
  return out
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node data/football/templates.test.js`
Expected: `13 passed, 0 failed`

- [ ] **Step 7: Commit**

```bash
git add data/football/queries.mjs data/football/templates.mjs data/football/templates.test.js
git commit -m "feat: add career, venue and never-played-for football templates"
```

---

### Task 4: FPL season-stamped questions

**Files:**
- Create: `data/football/fpl.mjs`
- Create: `data/football/fpl.test.js`

**Interfaces:**
- Consumes: `makeQuestion` from Task 2.
- Produces: `fetchBootstrap(opts) -> Promise<Object>` (network, untested)
- Produces: `seasonLabel(bootstrap) -> string` — e.g. `'2025/26'`
- Produces: `POSITIONS` — `{1: 'goalkeeper', 2: 'defender', 3: 'midfielder', 4: 'forward'}`
- Produces: `fplQuestions(bootstrap, { random }) -> Array<Object>` — every question tagged `league: 'fpl'`

**Critical constraint:** FPL questions are **season-stamped, never gameweek-stamped**. There is no current gameweek pre-season (`is_current: false` on GW1, verified 2026-08-06), and `total_points` resets on 21 Aug 2026. A question phrased `"…in the 2025/26 season"` stays correct forever.

- [ ] **Step 1: Capture a real fixture so the tests never touch the network**

```bash
node -e '
fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {headers:{"User-Agent":"wcg-bot-trivia-build/1.0"}})
 .then(r=>r.json()).then(j=>{
   const slim = {
     events: j.events.slice(0,3).map(e=>({id:e.id,name:e.name,is_current:e.is_current,is_next:e.is_next})),
     teams: j.teams.map(t=>({id:t.id,name:t.name})),
     elements: j.elements.slice(0,40).map(p=>({
       id:p.id, web_name:p.web_name, second_name:p.second_name, team:p.team,
       element_type:p.element_type, now_cost:p.now_cost,
       selected_by_percent:p.selected_by_percent, total_points:p.total_points,
     })),
   };
   require("fs").writeFileSync("data/football/fpl.fixture.json", JSON.stringify(slim,null,1));
   console.log("wrote fixture:", slim.elements.length, "players,", slim.teams.length, "teams");
 })'
```

Commit the fixture — it makes the tests reproducible and offline.

- [ ] **Step 2: Write the failing tests**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { seasonLabel, fplQuestions, POSITIONS } from './fpl.mjs'

const fixture = JSON.parse(readFileSync(new URL('./fpl.fixture.json', import.meta.url), 'utf8'))
const fixed = (v = 0) => () => v

const tests = [
  {
    name: 'seasonLabel: derives a season string, never a gameweek',
    fn: () => {
      const s = seasonLabel(fixture)
      assert.match(s, /^\d{4}\/\d{2}$/, 'looks like 2025/26')
    },
  },
  {
    name: 'every FPL question names the season and never says "GW"',
    fn: () => {
      const qs = fplQuestions(fixture, { random: fixed(0) })
      assert.ok(qs.length > 0, 'fixture must produce questions')
      const season = seasonLabel(fixture)
      for (const q of qs) {
        assert.ok(q.q.includes(season), `"${q.q}" must carry the season stamp`)
        assert.ok(!/\bGW\d/i.test(q.q), 'gameweek stamps rot at every roll — forbidden')
      }
    },
  },
  {
    name: 'every FPL question is tagged league fpl with four distinct options',
    fn: () => {
      for (const q of fplQuestions(fixture, { random: fixed(0) })) {
        assert.equal(q.league, 'fpl')
        assert.equal(q.wrong.length, 3)
        assert.equal(new Set([q.correct, ...q.wrong].map((s) => s.toLowerCase())).size, 4)
      }
    },
  },
  {
    name: 'position questions use the FPL classification, not a guess',
    fn: () => {
      assert.deepEqual(POSITIONS, { 1: 'goalkeeper', 2: 'defender', 3: 'midfielder', 4: 'forward' })
    },
  },
  {
    name: 'players with zero points produce no top-scorer question',
    fn: () => {
      // After 21 Aug the totals reset. A "most points" question built on all-zero
      // data would have four equally correct answers.
      const zeroed = { ...fixture, elements: fixture.elements.map((p) => ({ ...p, total_points: 0 })) }
      const qs = fplQuestions(zeroed, { random: fixed(0) })
      assert.ok(!qs.some((q) => /most FPL points/i.test(q.q)), 'no points data means no points question')
    },
  },
  {
    name: 'ids are stable across runs',
    fn: () => {
      const a = fplQuestions(fixture, { random: fixed(0) }).map((q) => q.id)
      const b = fplQuestions(fixture, { random: fixed(0) }).map((q) => q.id)
      assert.deepEqual(a, b)
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}: ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
```

- [ ] **Step 3: Run to verify it fails**

Run: `node data/football/fpl.test.js`
Expected: FAIL — `Cannot find module './fpl.mjs'`

- [ ] **Step 4: Write `data/football/fpl.mjs`**

```js
// Fantasy Premier League questions. Build-time only.
//
// SEASON-stamped, never gameweek-stamped. Verified 2026-08-06: bootstrap-static
// reports Gameweek 1 with is_current false, so there is no current gameweek to
// stamp against, and total_points still carries the COMPLETED 2025/26 season.
// Those totals reset on 21 Aug 2026 — a season stamp stays true through that,
// a gameweek stamp does not.
import { makeQuestion } from './templates.mjs'

export const FPL_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/'
export const USER_AGENT = 'wcg-bot-trivia-build/1.0 (https://github.com/philem247/wcg-bot)'

export const POSITIONS = { 1: 'goalkeeper', 2: 'defender', 3: 'midfielder', 4: 'forward' }

export async function fetchBootstrap({ url = FPL_URL, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`FPL ${res.status}`)
  return res.json()
}

// The API exposes no season field. Derive it from the first gameweek's deadline:
// a season beginning in August of year Y is "Y/Y+1".
export function seasonLabel(bootstrap) {
  const first = (bootstrap.events ?? [])[0]
  const year = first?.deadline_time
    ? new Date(first.deadline_time).getUTCFullYear()
    : new Date().getUTCFullYear()
  const stats = (bootstrap.elements ?? []).some((p) => (p.total_points ?? 0) > 0)
  // Totals still populated pre-season means they belong to the PREVIOUS season.
  const start = stats ? year - 1 : year
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`
}

export function fplQuestions(bootstrap, { random }) {
  const season = seasonLabel(bootstrap)
  const players = bootstrap.elements ?? []
  const teamById = new Map((bootstrap.teams ?? []).map((t) => [t.id, t.name]))
  const out = []

  // Position classification. FPL's own labelling is the point — it is what makes
  // these questions distinct from general football trivia.
  const named = players.filter((p) => p.web_name && POSITIONS[p.element_type])
  for (const p of named) {
    const q = makeQuestion({
      q: `In the ${season} season, which position did FPL classify ${p.web_name} as?`,
      correct: POSITIONS[p.element_type],
      pool: Object.values(POSITIONS),
      league: 'fpl',
      random,
    })
    if (q) out.push(q)
  }

  // Club membership.
  for (const p of named) {
    const club = teamById.get(p.team)
    if (!club) continue
    const q = makeQuestion({
      q: `Which club did ${p.web_name} play for in the ${season} season?`,
      correct: club,
      pool: [...teamById.values()],
      league: 'fpl',
      random,
    })
    if (q) out.push(q)
  }

  // Top scorer — only when there is real points data. All-zero totals (the state
  // right after a season rolls over) would give four equally correct answers.
  const scored = players.filter((p) => (p.total_points ?? 0) > 0)
  if (scored.length >= 4) {
    const ranked = [...scored].sort((a, b) => b.total_points - a.total_points)
    const top = ranked[0]
    if (ranked[1] && ranked[1].total_points < top.total_points) {
      const q = makeQuestion({
        q: `Who scored the most FPL points in the ${season} season?`,
        correct: top.web_name,
        pool: ranked.slice(1, 12).map((p) => p.web_name),
        league: 'fpl',
        random,
      })
      if (q) out.push(q)
    }
  }

  return out
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node data/football/fpl.test.js`
Expected: `6 passed, 0 failed`

- [ ] **Step 6: Commit**

```bash
git add data/football/fpl.mjs data/football/fpl.test.js data/football/fpl.fixture.json
git commit -m "feat: add season-stamped FPL question generation"
```

---

### Task 5: Pool weighting and the merge into trivia.json

**Files:**
- Create: `data/build-football.mjs`
- Create: `data/build-football.test.js`

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: `WEIGHTS` — `{ pl: 0.50, fpl: 0.15, other: 0.25, ucl: 0.10 }`
- Produces: `weightPool(questionsByTag, total, random) -> Array<Object>`
- Produces: `mergeFootball(bank, questions) -> Object` — returns a NEW bank object with `categories.football` replaced.

- [ ] **Step 1: Write the failing tests**

```js
import assert from 'node:assert/strict'
import { WEIGHTS, weightPool, mergeFootball } from './build-football.mjs'

const fixed = (v = 0) => () => v
const make = (tag, n) => Array.from({ length: n }, (_, i) => ({ id: `${tag}${i}`, q: `${tag}${i}?`, correct: 'a', wrong: ['b', 'c', 'd'], league: tag }))

const tests = [
  {
    name: 'WEIGHTS match the spec and sum to 1',
    fn: () => {
      assert.deepEqual(WEIGHTS, { pl: 0.50, fpl: 0.15, other: 0.25, ucl: 0.10 })
      assert.equal(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 1)
    },
  },
  {
    name: 'weightPool: composition follows the weights',
    fn: () => {
      const pool = weightPool(
        { pl: make('pl', 500), fpl: make('fpl', 500), other: make('other', 500), ucl: make('ucl', 500) },
        200, fixed(0),
      )
      assert.equal(pool.length, 200)
      const count = (t) => pool.filter((q) => q.league === t).length
      assert.equal(count('pl'), 100)
      assert.equal(count('fpl'), 30)
      assert.equal(count('other'), 50)
      assert.equal(count('ucl'), 20)
    },
  },
  {
    name: 'weightPool: a short tag does not block the others, total just shrinks',
    fn: () => {
      const pool = weightPool(
        { pl: make('pl', 5), fpl: make('fpl', 500), other: make('other', 500), ucl: make('ucl', 500) },
        200, fixed(0),
      )
      assert.equal(pool.filter((q) => q.league === 'pl').length, 5, 'takes all it has')
      assert.equal(pool.filter((q) => q.league === 'fpl').length, 30, 'others keep their share')
    },
  },
  {
    name: 'weightPool: duplicate ids are dropped',
    fn: () => {
      const dupes = [...make('pl', 3), ...make('pl', 3)]
      const pool = weightPool({ pl: dupes, fpl: [], other: [], ucl: [] }, 100, fixed(0))
      assert.equal(new Set(pool.map((q) => q.id)).size, pool.length)
      assert.equal(pool.length, 3)
    },
  },
  {
    name: 'mergeFootball: replaces football and leaves every other category untouched',
    fn: () => {
      const bank = {
        generated: 'old', attribution: 'ATTR',
        categories: { general: [{ id: 'g1' }], football: [{ id: 'stale' }] },
      }
      const out = mergeFootball(bank, make('pl', 2))
      assert.equal(out.categories.football.length, 2)
      assert.ok(!out.categories.football.some((q) => q.id === 'stale'), 'stale football questions are replaced')
      assert.deepEqual(out.categories.general, [{ id: 'g1' }], 'other categories untouched')
      assert.equal(out.attribution, 'ATTR')
    },
  },
  {
    name: 'mergeFootball: does not mutate the bank it was given',
    fn: () => {
      const bank = { categories: { general: [{ id: 'g1' }], football: [] } }
      const before = JSON.stringify(bank)
      mergeFootball(bank, make('pl', 2))
      assert.equal(JSON.stringify(bank), before)
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}: ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
```

- [ ] **Step 2: Run to verify it fails**

Run: `node data/build-football.test.js`
Expected: FAIL — `Cannot find module './build-football.mjs'`

- [ ] **Step 3: Write `data/build-football.mjs`**

```js
// Regenerate the football category. Run: npm run build:football
//
// Reads data/trivia.json, replaces categories.football, writes it back. Separate
// from build-trivia.mjs so football can be rebuilt without re-fetching OpenTDB.
//
// Weighting is applied HERE, at build time, rather than in engine/bank.js: the
// runtime picker already draws uniformly from a category, so composing the pool
// to the target ratio gives the same distribution with no engine changes.
import { readFile, writeFile } from 'node:fs/promises'
import { shuffle } from '../engine/bank.js'
import { LEAGUES, leagueWinners, playerClubs, clubVenues } from './football/queries.mjs'
import { winnerQuestions, neverWonQuestions, neverPlayedForQuestions, venueQuestions } from './football/templates.mjs'
import { fetchBootstrap, fplQuestions } from './football/fpl.mjs'

// Spec: Premier League 50%, FPL 15%, the other four leagues 25% combined,
// UCL + international 10%. Tune here and nowhere else.
export const WEIGHTS = { pl: 0.50, fpl: 0.15, other: 0.25, ucl: 0.10 }

export const TARGET_TOTAL = 600

// Composes the final pool to the target ratio. A tag with too few questions
// contributes everything it has rather than starving the others.
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

  for (const [key, league] of Object.entries(LEAGUES)) {
    console.log(`Querying ${league.name}...`)
    const winners = await leagueWinners(league.qid)
    const clubs = await playerClubs(league.qid)
    const venues = await clubVenues(league.qid)
    const allClubs = [...new Set(clubs.map((r) => r.club))]

    const generated = [
      ...winnerQuestions(winners, { leagueName: league.name, league: league.tag, random }),
      ...neverWonQuestions(winners, allClubs, { leagueName: league.name, league: league.tag, random }),
      ...neverPlayedForQuestions(clubs, { league: league.tag, random }),
      ...venueQuestions(venues, { league: league.tag, random }),
    ]
    byTag[league.tag].push(...generated)
    console.log(`  ${league.name}: ${generated.length} questions`)
  }

  console.log('Fetching FPL...')
  byTag.fpl.push(...fplQuestions(await fetchBootstrap(), { random }))
  console.log(`  FPL: ${byTag.fpl.length} questions`)

  const pool = weightPool(byTag, TARGET_TOTAL, random)
  const bank = JSON.parse(await readFile('data/trivia.json', 'utf8'))
  await writeFile('data/trivia.json', JSON.stringify(mergeFootball(bank, pool), null, 0))

  const counts = Object.keys(WEIGHTS).map((t) => `${t} ${pool.filter((q) => q.league === t).length}`).join(', ')
  console.log(`\nWrote ${pool.length} football questions (${counts})`)
}

// Only run the network path when invoked directly, so the tests can import the
// pure functions above without triggering a build.
if (import.meta.url === `file://${process.argv[1]}`) await main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node data/build-football.test.js`
Expected: `6 passed, 0 failed`

- [ ] **Step 5: Commit**

```bash
git add data/build-football.mjs data/build-football.test.js
git commit -m "feat: add football pool weighting and trivia.json merge"
```

---

### Task 6: Wire up scripts, attribution and docs, then generate the bank

**Files:**
- Modify: `package.json`
- Modify: `LICENSES.md`
- Modify: `README.md`
- Modify: `data/trivia.json` (generated output)

**Interfaces:**
- Consumes: `npm run build:football` from Task 5.

- [ ] **Step 1: Add the script and the new tests to `package.json`**

Add to `scripts`:

```json
"build:football": "node data/build-football.mjs",
```

Append to the end of the existing `test` script value (it is a single `&&` chain):

```
 && node data/football/templates.test.js && node data/football/fpl.test.js && node data/build-football.test.js
```

Do NOT touch `dependencies` or `overrides`.

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: every suite passes, and the three new suites appear in the output.

- [ ] **Step 3: Add attribution to `LICENSES.md`**

Wikidata is CC0 and legally needs no attribution, but recording provenance is the point of this file.

```markdown
## Wikidata

Football questions are generated from Wikidata, released under CC0 1.0
(public domain dedication). https://www.wikidata.org

## Fantasy Premier League

FPL questions are generated from the public, unauthenticated
`https://fantasy.premierleague.com/api/bootstrap-static/` endpoint. Fantasy
Premier League is a product of the Premier League; this project is not
affiliated with or endorsed by it.

Questions are season-stamped so they remain factually correct after the
underlying data rolls over.
```

- [ ] **Step 4: Document the build in `README.md`**

Add near the existing `build:trivia` documentation:

```markdown
### Rebuilding the football category

    npm run build:football

Queries Wikidata and the FPL API and rewrites `categories.football` in
`data/trivia.json`. Leaves every other category alone, so it does not re-fetch
Open Trivia DB.

Re-run it when you want fresher football data. FPL questions are stamped with the
season they describe, so they do not become wrong when a season rolls over — but a
rebuild after a completed season adds that season's questions.
```

- [ ] **Step 5: Generate the real bank**

Run: `npm run build:football`

Expected: per-league progress lines, then a summary like
`Wrote 600 football questions (pl 300, fpl 90, other 150, ucl 60)`.

If a league returns zero questions, that league's SPARQL query needs fixing — do not ship a bank with an empty tag. If the total is far below `TARGET_TOTAL`, report it rather than lowering the target silently.

- [ ] **Step 6: Verify the generated bank**

```bash
node -e '
const b = require("./data/trivia.json");
const f = b.categories.football;
console.log("football questions:", f.length);
console.log("unique ids:", new Set(f.map(q=>q.id)).size);
console.log("bad option sets:", f.filter(q => new Set([q.correct,...q.wrong].map(s=>s.toLowerCase())).size !== 4).length);
console.log("missing league tag:", f.filter(q=>!q.league).length);
console.log("gameweek stamps (must be 0):", f.filter(q=>/\bGW\d/i.test(q.q)).length);
const byTag = {};
for (const q of f) byTag[q.league] = (byTag[q.league]||0)+1;
console.log("by league:", byTag);
console.log("other categories intact:", Object.keys(b.categories).join(", "));
console.log("\nsample:"); for (const q of f.slice(0,3)) console.log(" ", q.q, "->", q.correct);'
```

Expected: unique ids equal to the question count, **zero** bad option sets, **zero** missing league tags, **zero** gameweek stamps, and every other category still present with its Phase 1 counts.

- [ ] **Step 7: Play a real game end to end**

```bash
node -e '
process.env.PHONE_NUMBER="1234567890"; process.env.OWNER="1234567890";
Promise.all([import("./engine/bank.js"), import("./engine/trivia.js")]).then(([b, t]) => {
  const bank = b.loadBank();
  console.log("categories:", bank.categories().join(", "));
  console.log("football size:", bank.size("football"));
  const qs = bank.pick({category:"football", count:10, random:Math.random});
  const g = t.createTriviaGame({questions:qs, category:"football", now:0, random:Math.random});
  const first = g.tick(0)[0];
  console.log("\nQ1:", first.question);
  for (const o of first.options) console.log(`  ${o.letter}) ${o.text}`);
})'
```

Expected: `football` appears in the category list with a non-zero size, and a real football question prints with four distinct options.

- [ ] **Step 8: Commit**

```bash
git add package.json LICENSES.md README.md data/trivia.json
git commit -m "feat: generate football question bank, add attribution and docs"
```

---

## Manual verification

In a real group, after uploading `data/trivia.json` and the new `data/football/` files:

- `/trivia categories` lists `football`.
- `/trivia football` starts a game and serves football questions.
- Questions are readable on a phone: one option per line, no truncation.
- No question shows two plausible correct answers — play at least two full rounds and read every question.
- No FPL question mentions a gameweek.
- `/trivia stats` still separates trivia from the chain board.

## Out of scope

- Runtime FPL refresh. Rebuild and re-upload instead.
- **Manager-at-the-time (`P286`), nationality (`P27`) and squad-number templates.** The spec lists these, and this plan deliberately does not build them. Four template families across six leagues already fill the `TARGET_TOTAL` of 600 comfortably; adding two more before any of them have been seen by real players is speculative volume, and each new family multiplies the ambiguity surface that Task 2's uniqueness rules have to police. They are mechanically identical to `venueQuestions` — a query in `queries.mjs`, a template calling `makeQuestion`, and tests — so adding one later is a single task with no new infrastructure. Revisit once the shipped bank has been played through.
- "Who am I?" synthesis. It carries the highest ambiguity risk of any template and deserves its own task once the simpler templates are proven in play. The `makeQuestion` choke point is where it would plug in.
- International/national-team questions. `WEIGHTS.ucl` currently covers UCL only; extend `LEAGUES` when there is appetite.
- Any change to `engine/bank.js` or `engine/trivia.js` — Phase 2 is build-time only.
