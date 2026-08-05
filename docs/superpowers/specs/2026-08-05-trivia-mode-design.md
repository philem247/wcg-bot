# Trivia Mode — Design

Date: 2026-08-05
Status: approved, not yet implemented

## Goal

Add a trivia/quiz game to wcg-bot alongside the existing word chain game. Players
race to answer multiple-choice questions. Categories are selectable, with football
as the headline category and a general mode that draws across all of them.

## Categories

Seven, curated rather than mirroring any upstream taxonomy:

`general` · `football` · `science` · `tech` · `entertainment` · `geography` · `history`

`/trivia` with no argument plays **mixed** mode, drawing across all seven. "Mixed" is
deliberately not called "general": `general` is itself one of the seven categories
(OpenTDB's General Knowledge), so `/trivia general` must mean that category alone and
nothing else.

**Mixed mode draws each category with equal probability, not in proportion to bank
size.** Pooling the banks and drawing uniformly would let entertainment supply ~35%
of every game purely because it is the largest. Equal weighting is what makes the
mode feel general.

If a requested category's bank is empty — football before phase 2 — the bot replies
that the category is not available yet and lists the ones that are, rather than
starting an unplayable game. General mode skips empty categories.

Video games, anime, cartoons, comics and board games are **deliberately excluded**.
They are ~1,650 of Open Trivia DB's 5,298 questions — nearly a third — and their
weight would dominate random draws in the general mode. Entertainment is restricted
to Film, Music and Television.

## Content sourcing

Verified 2026-08-05.

### Open Trivia DB — six categories

5,298 verified questions, no API key, **CC BY-SA 4.0**. Per-category counts:

| Our category | OpenTDB source | Count |
|---|---|---|
| general | General Knowledge (9) | 469 |
| science | Science & Nature (17) + Maths (19) + Gadgets (30) | 419 |
| tech | Science: Computers (18) | 192 |
| entertainment | Film (11), Music (12), Television (14) | 992 |
| geography | Geography (22) | 383 |
| history | History (23) | 411 |

Attribution is mandatory and goes in `LICENSES.md`. Share-alike applies to the
derived bank.

Rejected alternatives: The Trivia API (larger, but **CC BY-NC** — non-commercial
only, a constraint we would inherit permanently); API Ninjas (100 free questions).

### Football — Wikidata + FPL

OpenTDB has **no football category**. Its Sports category is 176 questions across
*all* sports, so realistically 30–60 football ones. That is under one session of
play. Football therefore needs generation.

**Wikidata (CC0, public domain)** via SPARQL at build time. Relevant properties:
`P54` member of sports team with `P580`/`P582` date qualifiers, `P1346` winner,
`P286` head coach, `P115` home venue, `P27` nationality. Yields league winners,
career histories, managers, stadiums, nationalities.

**Fantasy Premier League API** — `https://fantasy.premierleague.com/api/bootstrap-static/`,
public and unauthenticated, ~80 fields per player: price, ownership %, total points,
form, position, squad number, xG/xA.

Two caveats confirmed on 2026-08-05:

1. The 2026/27 season starts **21 Aug 2026**. Until then every performance stat is
   zero. Price, position, team and ownership are populated pre-season; points, form
   and goals are not.
2. FPL data is volatile — prices drift, ownership swings weekly.

**Decision:** bake FPL questions at build time with a gameweek stamp, phrased
`"As of GW12, ..."`. A stale answer is then still a *correct* answer rather than a
wrong one. Refresh is a manual `npm run build:trivia` plus re-upload. This keeps the
project's no-network-at-runtime property fully intact.

### League weighting

Every football question carries a league tag. Selection is weighted, tunable in one
constant:

| Premier League | FPL | La Liga + Serie A + Bundesliga + Ligue 1 | UCL + international |
|---|---|---|---|
| 50% | 15% | 25% combined | 10% |

### Question templates

Plain lookups get boring fast. The key generation insight: **once a set has been
queried, its complement is free**, and inverted questions are markedly more
interesting at no extra data cost.

- Straight: "Who won the 2019/20 Premier League?"
- **Never-won / odd-one-out**: "Which of these has NEVER won the Premier League?"
- **Club-they-never-played-for**: "Which club did Fernandinho NOT play for?"
- Superlative: most goals, most assists
- Stadium ↔ club, manager-at-the-time, nationality, squad number
- **"Who am I?"** — a player synthesised from career facts
- FPL-native: price, ownership, and classification gotchas (FPL lists Trent
  Alexander-Arnold as a defender)

### Difficulty calibration

Benchmarked 2026-08-05 against published quizzes aimed at serious fans (Goal.com,
FourFourTwo, GiveMeSport, Planet Football). They consistently test: records and
superlatives, historical precision by season, career journeys across clubs,
managers, and "who am I?" synthesis.

That is a close match for what Wikidata already encodes via `P54`, `P1346` and
`P286`. These fact types are not a compromise forced by the data source — they are
the same ones serious quizzes use.

**Third-party quiz questions are not harvested.** Those pages are copyrighted
editorial content; they were consulted to calibrate difficulty and question shape
only. All shipped questions are generated from CC0 Wikidata, the public FPL API, or
CC BY-SA OpenTDB.

### Hard requirement: answer uniqueness

"Who am I?" and odd-one-out templates can silently produce questions with more than
one correct answer. *"Dutch, played for Ajax, Barcelona and Man United, won the 1995
Champions League with Ajax"* matches Kluivert, Davids **and** de Boer.

Every generated question must be verified to resolve to **exactly one** correct
answer before emission — a `COUNT = 1` check on the generating query. A question
failing the check is discarded, not shipped. This applies to all generated
templates, not just "who am I?".

**Distractor quality is the main design risk.** Wrong answers must be drawn from the
same result set — other Champions League winners, not random clubs — or questions
become guessable at a glance. This is the part most likely to need iteration once
real generated questions are reviewed.

## Architecture

Trivia is a **sibling game object, not a mode of the chain game**.

`engine/tick.js` only calls `game.tick(now)` and reads `game.state`. The outbox and
the router's event loop are equally agnostic. A new game object implementing that
contract therefore drops in with no changes to the scheduler, outbox or tick logic.

```
engine/trivia.js       NEW   state machine: ask -> race -> score -> next
engine/bank.js         NEW   loads data/trivia.json, weighted unasked selection
data/build-trivia.mjs  NEW   build-time fetch -> data/trivia.json (committed)
engine/tick.js         --    unchanged
transport/outbox.js    --    unchanged
transport/render.js    +     new cases in the existing switch
transport/router.js    +     /trivia command, events -> outbox
store/db.js            +     asked_questions table, type filter on leaderboards
```

One game per chat still holds: `games` is keyed by jid, so starting trivia during a
chain game hits the existing "A game is already running here."

**Determinism is preserved.** No `Date.now()` or `Math.random()` inside `engine/`.
Question selection and option shuffling both take the injected `random`, so tests
are reproducible. Options are shuffled at runtime, not baked, so the correct answer
is not always in the same slot.

## Game mechanics

```js
createTriviaGame({ bank, category, questionCount = 10,
                   clockSeconds = 30, now, random })
// state: 'asking' | 'over'
// submit(player, text, now) -> events
// tick(now) -> events
// end(now)  -> events
```

`questionCount` and `clockSeconds` are module constants in `engine/trivia.js`,
mirroring how `engine/modes.js` holds the chain game's knobs. They are **not**
per-group settings in v1 — no command exposes them, and the `settings` table is not
involved. Make them per-group only if a group actually asks.

**Race format.** Bot posts a question with four options and a 30-second clock. The
first player to answer correctly takes the point and the game **advances
immediately** — there is no reason to wait out a clock nobody can still win. Clock
expiry with no correct answer reveals the answer and advances. After the last
question, standings.

Race is not a stylistic preference. In a WhatsApp group every answer is public the
instant it is sent, which breaks any format where players answer the same question
independently — the second person simply copies the first. A race is immune, because
being first *is* the game.

**Entry is open.** No lobby. `/trivia football` starts immediately and anyone who
answers is in. Only players who answered at least once are scored. This also removes
the 60-second lobby wait, which is the slowest part of starting the existing game.

**Input rules:**

- Only `a`–`d` and `1`–`4` count as an answer attempt, case-insensitive.
- **Everything else is ignored silently.** No "invalid answer" replies. People chat
  in these groups; a bot that responds to every message is unusable.
- A player's first submission is locked in. Second attempt ignored, right or wrong.
  Without this lock, a player spams `a b c d` in two seconds and is guaranteed the
  point.
- A wrong answer does not eliminate or penalise — it only locks that player out of
  the current question. Same principle as the chain game, where a rejected word
  costs time but never the turn.

## Events and message budget

Naive implementation is a question message plus a result message: 20 messages per
game. Playtest feedback on this bot was already "bot talks too much".

Instead **`trivia_question` carries how the previous question resolved**:

```js
{ type: 'trivia_question', index, total, category, question, options, endsAt,
  previous?: { outcome: 'correct'|'timeout', player?, letter, answer } }
```

One event, one message, `render()` stays pure, and the budget falls to 11 messages
per game with no batching machinery. Rendered:

```
✅ *Phil* — *B)* Real Madrid
━━━━━━━━━━━━━━━━

⚽ *FOOTBALL*  ·  *Q4/10*  ·  ⏱ *30s*

*Which club broke PSG's Ligue 1
dominance in 2020/21?*

*A)*  Monaco
*B)*  Lille
*C)*  Lyon
*D)*  Marseille

_Reply A, B, C or D_
```

**Options are stacked one per line, never in columns.** WhatsApp renders text in a
proportional font, so two-column layouts do not align — they look ragged, and
differently ragged on every device.

The first question of a game omits the result line and rule. On a timeout the
result line reads `⏱ *Time!* Nobody got it — *B)* Lille`.

Final standings, on `trivia_over`:

```
🏁 *FINAL*
━━━━━━━━━━━━━━━━

🥇 *Phil* — 5
🥈 *Ada* — 3
🥉 *Sam* — 2
```

Other events: `trivia_over { standings }`, `trivia_terminated`.

## Commands

| Command | Who | Does |
|---|---|---|
| `/trivia` | anyone | start a general-mode game |
| `/trivia <category>` | anyone | start a focused game |
| `/trivia end` | starter or admin | stop the current game |
| `/trivia stats [all]` | anyone | trivia leaderboard |
| `/trivia categories` | anyone | list categories |

Group-only, matching `/wcg`.

## Storage

- `asked_questions (jid, category, qid, ts)`, primary key `(jid, qid)`. Selection
  excludes what a group has already seen; when a category runs dry for that group,
  its rows are cleared and the pool recycles. Without this, 469 general-knowledge
  questions go stale quickly in an active group.
- `games.type = 'trivia'`, `games.mode = <category>`.
- On `trivia_over`, rank by score descending into placements and record via the
  existing `recordGame` path.
**The two leaderboards are separate.** Both game types write to the same `results`
table, tagged by `games.type`, and each board filters to its own type:

- `/stats` gains `WHERE games.type != 'trivia'` — word chain only.
- `/trivia stats` is the same query with `WHERE games.type = 'trivia'`.

`results.game_id` already joins to `games.type`, so this needs no schema migration —
it is two `WHERE` clauses. The `/stats` change is called out specifically because it
edits a query that currently works correctly: without the filter, trivia results
would silently start appearing on the word chain board.

**Deliberate cut:** no `score` column on `results`. Ranking reuses the existing
`min(player_count - placement, 3) + 3` formula verbatim, so both boards share one
code path. Raw points appear only in the end-of-game standings, which come from the
event rather than the database. Add the column if "total trivia points all-time" is
ever wanted.

**Tie-breaking:** equal scores are ordered deterministically by first-answer time,
so placements are stable and reproducible in tests.

## /help redesign

Independent of trivia, but urgent because trivia adds five commands to a list that
is already 13 lines of undifferentiated text.

Grouped into sections with bold headers and blank lines between them, and
**role-aware**: the admin and owner blocks are omitted for players who cannot use
them. A normal player sees roughly 18 lines instead of 30, and no command they would
only ever be refused on. The router already resolves admin status for every command,
so this needs no new lookup.

```
🎮 *W·C·G  B·O·T*
━━━━━━━━━━━━━━━━

*🔤 WORD CHAIN*
▸ /wcg start
▸ /wcg easy|medium|hard
▸ /wrg start
▸ /wcg end

*🧠 TRIVIA*
▸ /trivia
▸ /trivia football
▸ /trivia categories
▸ /trivia end

*📊 SCORES*
▸ /stats [all]
▸ /trivia stats [all]

*⚙️ ADMIN*          (admins only)
▸ /pending
▸ /addword <word>|all
▸ /delword <word>
▸ /admin

*👑 OWNER*          (owner only)
▸ /promote @user
▸ /demote @user

_In game:_ send join, then
your word — or A–D for trivia
```

## Testing

- `engine/trivia.test.js` — first correct wins and advances, second answer from the
  same player ignored, non-answer text ignored, timeout reveals and advances, game
  ends after N questions, standings ordering, tie-break stability, determinism under
  a seeded `random`.
- `engine/bank.test.js` — league weighting, repeat exclusion, pool-exhaustion recycle.
- `transport/render.test.js` — new cases, including a `trivia_question` carrying
  `previous` in both outcomes and the first question carrying none.
- `transport/router.test.js` — command routing, recording on `trivia_over`,
  `/trivia end` permissions, role-aware `/help` for player vs admin vs owner.
- `store/db.test.js` — `asked_questions` round-trip and recycle, type-filtered
  leaderboards not leaking across game types.

`data/build-trivia.mjs`'s **network fetching** is not tested, same as the existing
`data/build.mjs`. Its **pure transforms are**, and must be, because they are where
bad questions come from: the answer-uniqueness check (a question whose fact set
matches two players is discarded), distractor selection drawing from the same result
set, and HTML-entity decoding. These take data in and give data out, so they test
without a network.

## Phasing

1. **Engine + OpenTDB pipeline + /help redesign.** Six categories playable. No
   football.
2. **Football generation** — Wikidata SPARQL and FPL, templates, distractor tuning.

This ordering lets a real trivia game run before any football generation exists, and
football is where the design risk sits.

## Out of scope

- Free-text answers. Multiple choice only.
- Anti-cheat beyond the short clock. Everyone can search; a race keeps it fair enough.
- Runtime FPL refresh. Revisit if manual rebuilds prove annoying.
- Current affairs as a category. No static bank can carry it.
- Food & Drink, Art & Literature. Both classic pub-quiz categories, both thin in
  OpenTDB (59 and 120). Add via `/addq` or generation if wanted later.
