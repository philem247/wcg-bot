# Wordle Tournament & Emoji Puzzle — Design

**Status:** scope locked, not yet implemented.
**Date:** 2026-08-26

Two new game modes. Wordle Tournament first, Emoji Puzzle second. This document
is the agreed scope for both, including all the plumbing that every mode needs,
so none of it gets re-litigated mid-build.

---

## Part 1 — Wordle Tournament (`/wordle`)

Head-to-head single-elimination bracket. Two players per match, **each gets a
different word**, six guesses each, first to solve wins the match.

### Why different words per player

A WhatsApp group has no private channel. If both players share one word, every
guess and its colour feedback is public, so the second guesser gets free
information — and worse, the optimal strategy becomes *waiting*: let the
opponent burn guesses gathering clues, then solve it with their work. The
passive player beats the active one, which inverts the game.

Different words removes the leak entirely. The cost is difficulty variance,
mitigated by drawing both words from the same difficulty tier (below).

### Match rules

- **6 guesses** per player, independent boards.
- **Different word per player**, same difficulty tier.
- **20s cooldown** per player between their own guesses. Does not block the
  opponent — the two players are not in lockstep.
- **First to solve wins** the match immediately.
- **Invalid words are rejected and do not consume a guess.** Guesses are
  validated against the full 703k-word dictionary; only real words count, and
  a typo shouldn't cost a life.
- **Match clock: 4 minutes.** Without it a silent player stalls the whole
  bracket. On expiry, resolve by progress (below).

### Guess input

Contestants type a bare 5-letter word — no command prefix. The match is a
foreground game occupying the group's game slot (same as Scramble), so this is
unambiguous. Non-contestants' messages are ignored silently.

This differs from the co-op daily Wordle idea discussed earlier, which needed an
explicit `/w` command because it ran in the background where any stray 5-letter
chat word would have been eaten as a guess. Not a concern here.

### Feedback format

Per guess, the bot replies with that player's **full board so far**, not just
the newest row — all guesses with their colours, and guesses remaining. Nobody
should need to scroll up in a busy group.

```
🎯 @player  (guess 3/6)
CRANE  🟩⬜🟨⬜⬜
SPLIT  ⬜🟨⬜⬜🟩
MOUTH  🟩🟩⬜🟨⬜
⏳ 3 left
```

Colour rules follow real Wordle, including the duplicate-letter case: a yellow
is only shown if that letter still has unmatched occurrences left in the answer
after greens are assigned. This is the part people get wrong — it needs explicit
tests.

### Resolving a match that nobody solves

Both players exhaust six guesses, or the match clock expires:

1. **Progress tiebreak.** Score each player's *best* guess: green = 2,
   yellow = 1. Higher total wins.
2. **Sudden death** if still level: a fresh word for each player, **4 guesses**
   each, same rules.
3. **Progress tiebreak again**, then **coin flip** if still tied.

The existing trivia tournament already has both a sudden-death concept and a
`coinFlipFinish` for unresolvable fixtures — same shape, so this is consistent
with how the bot already behaves rather than a new idea.

### Word selection

- **Difficulty tiers are word length**, matching Word Chain's existing
  easy/medium/hard convention (`engine/modes.js`) where "harder" already
  means "longer word" to these players. Not letter-frequency scoring within a
  fixed length — that was the original plan and was replaced.
  - **easy** = 5 letters
  - **medium** = 6 letters
  - **hard** = 7 letters
- An admin picks the tier for the whole bracket: `/wordle start [easy|medium|hard]`,
  default `easy`. Every match and every sudden-death round in that tournament
  draws from the same tier — nobody faces a longer word than their opponent.
- **Valid guesses** are checked against the full dictionary (703k words) at
  the player's own word length, so players can guess any real word of the
  right length even if it would never be an answer.
- **Source data:** `data/common.txt`'s 5/6/7-letter words, hand-curated to
  remove proper nouns/brands/places unfit as a secret answer (confirmed
  present in the raw list: Aaron, Adams, Cisco, China, Bruce, and many more —
  same class of problem as the trivia bank's data-quality issues). Curated
  files land in `data/backfill/`, built into `data/wordle-words.json` by
  `data/build-wordle-words.mjs`.
- **No repeats per group:** an `asked_wordle` table, same pattern as
  `asked_flags` / `asked_riddles`, tracking words used across tournaments
  over time. Separate from the in-bracket `exclude` set, which only prevents
  the same word appearing twice *within* one tournament. Auto-clears and
  reshuffles when a tier is exhausted.

### Bracket

Single elimination with byes for non-power-of-two entrant counts — identical to
the trivia tournament's approach.

**Implementation note:** the trivia tournament's bracket logic (`buildBracket`,
`pairConsecutive`, `nextPow2`, `resolveRound`, `finalizeMatch`,
`coinFlipFinish`) is generic, but its match machinery is tightly bound to
`createTriviaGame`'s question/clock/gap model. A Wordle match is structurally
different — asynchronous, per-player boards, no shared per-question clock.

Decision: **build `engine/wordle.js` as a separate engine** rather than
generalising `engine/tournament.js`. The trivia tournament is load-bearing and
battle-tested; refactoring it to host a second, differently-shaped match type
risks regressing something that currently works. Accept the bracket-logic
duplication for now; unify later only if a third bracket mode appears.

---

## Part 2 — Emoji Puzzle (`/emoji`)

Straight race, same shape as Flag and Logo. The bot posts an emoji sequence,
everyone races to name it.

```
🎬 EMOJI PUZZLE (3/10)
───────────────────

🦁 👑

⏳ Time: 20s
```

- **10 puzzles** per game, **20s** clock each, **10s** gap between — matching
  the Riddle/Flag rhythm.
- **First correct answer** takes the point.
- Answer matching via `fold()` plus an alias list, exactly like Flag — so "lion
  king", "The Lion King" and "thelionking" all score.
- **No repeats per group:** `asked_emoji` table.

### Content

New file `data/emoji.json`, shaped like `data/riddles.json`:

```json
{ "id": "e001", "emoji": "🦁👑", "answer": "The Lion King",
  "aliases": ["lion king"], "category": "movies" }
```

Target **300+ puzzles** at launch, spread across movies, songs, Nollywood,
proverbs and idioms, food, places, and general phrases. Nigerian-specific
content is a first-class category, not an afterthought.

Content rules carry over from `data/backfill/SPEC.md`: no duplicates, no answer
leaking into the prompt, every entry genuinely solvable. Emoji must render on
Android WhatsApp — no rare/ZWJ-heavy sequences that show as tofu boxes. Flag
mode already proved regional-indicator pairs render fine; anything more exotic
needs checking on a real device before it ships.

---

## Part 3 — Shared plumbing checklist

Every mode needs all of this. Missing any one of these is how past modes
shipped half-wired.

| # | Item | Wordle | Emoji |
|---|------|--------|-------|
| 1 | `engine/<mode>.js` — pure, I/O-free, time injected via `now` | ✅ | ✅ |
| 2 | `engine/<mode>.test.js` + entry in `package.json` `test` script | ✅ | ✅ |
| 3 | `render.js` cases for every event type | ✅ | ✅ |
| 4 | `KIND_BY_EVENT` entries in `router.js` (outbox priority) | ✅ | ✅ |
| 5 | `gameMeta` + game-over persistence | titles | `recordGame` |
| 6 | `db`: `stmtSelectResults<Mode>` + `leaderboard({type})` branch | — | ✅ |
| 7 | `db`: **add mode to the chain-leaderboard exclusion list** | — | ✅ |
| 8 | `db`: `asked_<mode>` table + mark / get / clear helpers | ✅ | ✅ |
| 9 | `router`: `start<Mode>Game`, `end`, `stats` subcommands | ✅ | ✅ |
| 10 | `router`: add command to `GAME_COMMANDS` (**ban enforcement**) | ✅ | ✅ |
| 11 | Help menu: mode section + `stats` line | ✅ | ✅ |
| 12 | `index.js` welcome message line | ✅ | ✅ |
| 13 | README: modes table, commands, scores, database, test list | ✅ | ✅ |

**Item 7 is the easy one to forget.** `stmtSelectResultsChain` selects
`g.type NOT IN ('trivia','scramble','logo','riddle','flag')`. A new mode not
added there silently pollutes the Word Chain leaderboard. Emoji must be added;
Wordle needs nothing here because it never writes `results` rows at all.

**Item 5 differs per mode.** Emoji calls `db.recordGame` with placements on
`emoji_over`. Wordle instead calls `db.recordTournamentWin(jid, champion, ts,
'wordle')` when the bracket resolves — one row, one champion, no placements.

**Item 10 is now the whole ban story.** Bans are enforced at the command entry
point via `GAME_COMMANDS`, in `mayStartGame`, on `join`, and on every submit
path. Adding the command to `GAME_COMMANDS` is all a new mode needs — but it is
not optional.

### Scoring

The two modes score differently, on purpose.

**Emoji Puzzle** uses the existing football-style scheme, unchanged:
**1st = 3 points, 2nd = 1 point**, everyone else nothing, derived from placement
at read time. Rows go into `results` with `type = 'emoji'`; weekly and all-time
boards via `/emoji stats [all]`.

**Wordle Tournament records titles, not points.** A bracket produces one
champion, so "titles won" is the honest metric — the same way the trivia
tournament already works (it writes only to `tournament_wins` and never to
`results`). Wordle mirrors that exactly.

Consequence: Wordle needs **no** `results` rows, **no** `stmtSelectResultsWordle`,
**no** `leaderboard({type})` branch, and **no** chain-exclusion entry. Items 6
and 7 of the plumbing checklist do not apply to it.

#### Keeping the two title counts apart

`tournament_wins` has no type column today, so writing Wordle champions into it
would merge them with trivia titles into one meaningless number. Add a typed
column, following the `player_pn` migration already in `store/db.js`:

```js
try {
  db.exec("ALTER TABLE tournament_wins ADD COLUMN type TEXT NOT NULL DEFAULT 'trivia'")
} catch {
  // Column already exists — expected on every run after the first migration.
}
```

The `DEFAULT 'trivia'` is what makes this safe on the live database: every
existing row is a trivia-tournament title, so backfilling them as `'trivia'` is
correct rather than merely convenient. No data migration script needed.

Then thread the type through:

- `recordTournamentWin(jid, player, ts, type = 'trivia')`
- `tournamentStats(jid, limit = 10, type = 'trivia')` — filters `WHERE jid = ? AND type = ?`

Defaulting both to `'trivia'` keeps every existing call site working untouched.

`/tourney stats` reads `type = 'trivia'`, `/wordle stats` reads
`type = 'wordle'`. Label them distinctly in the rendered output — "🏆 Tournament
titles" vs "🏆 Wordle titles" — so the two boards are never mistaken for each
other.

### Commands

```
/wordle              start a Wordle tournament (admins only)
/wordle end          stop it (starter or admin)
/wordle stats [all]  leaderboard

/emoji               start an Emoji Puzzle game (admins only)
/emoji end           stop it (starter or admin)
/emoji stats [all]   leaderboard
```

`join` enters the Wordle bracket during registration, same as the trivia
tournament.

### Welcome message

Add to `index.js`:

```
▸ */wordle* — wordle tournament
▸ */emoji start* — emoji puzzle
```

---

## Deliberately out of scope

- **Co-op daily Wordle.** Discussed and set aside in favour of the tournament,
  which fits the groups' admin-starts-a-session rhythm better. The daily-habit
  version remains a possible future addition; it is a different game, not a
  variant, and would need the background-state architecture described in the
  brainstorm (persistent SQLite state outside the `games` map, explicit guess
  command, board reprint on demand).
- **Same-word head-to-head Wordle** — rejected for the information leak.
- **Progressive-reveal formats** — message-volume risk given past throttling.
- **Player career-path mode** — separately agreed, comes after these two.
- **Math mode** — parked; procedurally cheap but weaker audience fit.
