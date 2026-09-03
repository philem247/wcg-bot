# Career Path Mode — Design Spec

**Status:** Approved, ready for implementation planning.

## What it is

A free-for-all football guessing mode: the bot reveals a mystery player's
career club history one club at a time, and the first person in the group
chat to guess the player's name wins the round. Format matches the
"guess the footballer from their career path" games already popular on
TikTok/football social media (footle.club/career, ExtraTime, playfootball.games).

## Game flow

- Command: `/careerpath` to start (admins only, matching every other mode),
  `/careerpath end` to stop.
- Open to everyone in the group — not turn-based, no queueing. Anyone can
  type a guess at any time, first correct guess wins the round.
- One mystery player per round. 8 rounds per game.
- Clubs revealed in chronological order, one at a time, no cap on how many
  clubs get shown (a long career just takes longer to fully reveal).
- 20 seconds per reveal window before the next club appears.
- If a correct guess lands before all clubs are shown, the round ends
  immediately and the answer (with full club list) is shown.
- If nobody guesses after the last club is revealed, the round ends
  unscored and the answer is shown.
- 10 second gap between rounds.
- Leaderboard shown at game end.

## Scoring

Flat +1 point per round won. No speed or reveal-count weighting — matches
every other mode in this bot (Trivia, Riddle), keeps the scoring code path
identical rather than adding a second scheme.

## Data pool

- **Base layer:** Wikidata SPARQL, `P54` (member of sports team) with
  `P580`/`P582` (start/end date) qualifiers — gives full ordered club
  history per player. Same query client as `data/football/sparql.mjs`
  (serial, rate-limited, already used by Trivia's football questions).
- **Notability filter:** sitelink count, same proxy already validated for
  football trivia (see prior "obscure players are fixed by sitelink count"
  finding). Keeps the pool to names a casual group chat can actually guess.
- **Eligibility:** ≥3 distinct clubs required. Excludes one-club-career
  players (no path to reveal) and reduces one-transfer players who tend to
  be less recognisable. Deliberately not lowered to ≥2 — reconsidered and
  rejected during design.
- **Freshness patch:** the summer transfer window closes ~Sept 1 each year,
  and Wikidata lags real transfers by weeks/months. Fix: a targeted,
  per-player you.com search (or direct Transfermarkt fetch) only to confirm/
  correct the player's *current* club after the pool is built — never a bulk
  re-crawl of the whole pool through you.com. Keeps API usage proportional
  to pool size once, not to rebuild frequency.
- **FPL overlay:** current Premier League players via the existing
  `data/football/fpl.mjs` recognisability filter (`MIN_OWNERSHIP_PCT`),
  merged in for current-season freshness on top of the Wikidata base.
- **Estimated realistic pool size:** ~400-700 players after filtering.
  Supports ~50-90 games (8 rounds each) before a forced repeat, comparable
  tolerance to Concentration's finite category pools already shipped.
- **Build-time only:** stored as a JSON file (e.g.
  `data/football/career-paths.json`), same pattern as `categories.json` —
  the bot never queries Wikidata/you.com live during gameplay.

## Answer matching

Reuse Concentration's `matchItem()` fold/normalize approach (case, accent,
punctuation-insensitive) rather than a new matcher. Each pool entry carries
an alias list (surname-only, common nickname) in the same shape
`categories.json` already uses for its `aliases` field.

## No-repeat tracking

Reuse Trivia's `asked_questions` mechanism as-is: `askedIds`, `markAsked`,
`clearAsked`, with a new `type: 'careerpath'` tag. Pool exhausted for a
group → recycle via `clearAsked`, same fallback Trivia already has.

## Leaderboard

New `type: 'careerpath'` bucket in the existing type-filtered leaderboard
system — not a separate leaderboard implementation. `/careerpath stats [all]`
matches the `<mode> stats [all]` convention every other mode already uses.

## Messages

Timer/header style matches Trivia's `header · progress · timer` line;
reveal-in-place style matches Concentration's deferred-reveal pattern
(`engine/concentration.js`'s `START_DELAY_MS` announce-then-reveal timing).

**Game start (once, when `/careerpath` begins):**
```
⚽ *CAREER PATH* is starting!
Guess the footballer from their club history — clubs revealed one at a time.
First correct guess in the chat wins the round!
⏳ 8 rounds · first clue in 10s — get ready!
```

**Per-round reveal (Trivia-style header, re-sent with the growing club list
on each reveal):**
```
⚽ *Round 1/8*  ·  ⏱ *20s*

Club 1: Le Havre → Club 2: Monaco

_Type the player's name to guess!_
```

**Correct guess:**
```
✅ Kwame got it — Kylian Mbappé (Le Havre → Monaco → PSG → Real Madrid)
Kwame: 1 point
⏳ Next round in 10s...
```

**Nobody guessed:**
```
❌ Nobody got it. Answer: Kylian Mbappé (Le Havre → Monaco → PSG → Real Madrid)
⏳ Next round in 10s...
```

**Help menu entry** (added to the `/help` block alongside every other mode):
```
*⚽ CAREER PATH* _(start: admins only)_
▸ /careerpath
▸ /careerpath end
```
and under `*📊 SCORES*`: `▸ /careerpath stats [all]`

## Reuse summary (nothing net-new architecturally)

| Piece | Reused from |
|---|---|
| Deferred reveal timing | `engine/concentration.js` (`START_DELAY_MS` pattern) |
| Free-for-all scoring, timer header | `engine/trivia.js` |
| Answer fold/alias matching | `engine/concentration.js` (`matchItem()`) |
| No-repeat tracking | Trivia's `asked_questions`/`askedIds` |
| Leaderboard | Existing type-filtered leaderboard |
| Data build pipeline | `data/football/sparql.mjs`, `data/football/fpl.mjs` |

## Open follow-up (not yet started)

Implementation plan (task breakdown for subagent dispatch, per this
project's Task-tool orchestration convention) has not been written yet.
Next step is breaking this spec into concrete build tasks: data pipeline
script, `engine/careerpath.js`, router/render wiring, tests.
