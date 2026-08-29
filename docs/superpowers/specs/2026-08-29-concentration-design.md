# Concentration — Category Elimination Game

Named after the childhood Nigerian "name of things" game. Suggested by a group member: the bot names a category, players take turns naming a valid, unused item from it, a wrong/duplicate/timed-out answer eliminates that player, and the game keeps going — with a fresh category after every elimination — until one player is left standing.

## Overview

- Lobby flow mirrors Tournament/Wordle Tournament: `/concentration start` opens a join window, players `/concentration join`, the game begins once the window closes or the admin runs `/concentration begin` (whichever comes first), with a minimum of 3 joined players.
- Turn order is fixed once the game starts (join order). Each turn: bot shows the current category, whose turn it is, and a 15s clock. The player types their answer as plain text (no command prefix), matched against that category's valid-answer list with alias support (same forgiving matching as Flag/Emoji/Riddle).
- Wrong answer, a repeat of something already said in the current category, or a 15s timeout eliminates that player. Play continues with the next surviving player.
- After every elimination, the bot switches to a new category. It also switches early — before anyone is forced into a turn with too few options — if the remaining unused answers in the current category drop below the number of players still alive.
- Last player standing wins the round.

## Data — `data/categories.json`

A bare array, one entry per category:

```json
{
  "id": "cat-001",
  "category": "Football clubs in Germany",
  "items": ["Bayern Munich", "Borussia Dortmund", "..."],
  "aliases": { "Bayern Munich": ["bayern", "fc bayern"] }
}
```

- `aliases` is optional per item; items with no meaningful alternate spelling omit it.
- Mixed categories: football clubs (several countries as separate category entries), movies, countries, animals, Nigerian foods, musicians, etc. — broad enough to serve non-football groups too, per the project's existing "cater for other groups" goal.
- Hand-authored (like `data/emoji.json` was), no build script. Each category needs enough items to comfortably outlast a full lobby before the early-switch rule kicks in — rule of thumb, at least 15–20 items per category.

## Engine — `engine/concentration.js`

New file. Mirrors the *shape* of `engine/game.js` (lobby → fixed turn order → active roster → elimination) but is not built on top of it: `engine/game.js`'s `validate()` is dictionary + starting-letter logic specific to Word Chain, and this mode's validation is category-membership + alias matching instead. Following the project's precedent (Wordle Tournament got its own engine rather than extending `engine/tournament.js`), Concentration gets its own file rather than bolting a second validation contract onto Word Chain's.

States: `lobby` → `playing` → `over`.

Per-turn state: current player, current category, a `used` set (answers already accepted in the current category — reset whenever the category switches), the turn deadline.

Events:
- `lobby_open` (deadline, min players)
- `joined` (player, count)
- `concentration_turn` (category, player, clockSeconds)
- `concentration_eliminated` (player, reason: `'wrong' | 'duplicate' | 'timeout'`, answer if given)
- `concentration_category_switch` (new category, reason: `'elimination' | 'pool_low'`)
- `concentration_over` (winner, standings — placement order by elimination, winner first)
- `concentration_terminated` (admin-ended mid-game)

`join`/`submit`/`tick`/`end` return event arrays, same contract as every other engine in this codebase (pure, no `Date.now()`/`Math.random()`, `now`/`random` injected).

## Store

- `asked_category_ids` table (`jid, id, ts`, same shape as `asked_flags`/`asked_riddles`) — per-group dedup so a category doesn't repeat until the bank is exhausted for that group, with the same clear-and-retry fallback used elsewhere.
- No new leaderboard mechanism needed: `type: 'concentration'` is recorded through the existing `recordGame`/`results` path (the one Word Chain, Flag, Logo, and Riddle already use) — **not** the `tournament_wins` titles table, since Concentration is one continuous elimination game with a single winner per round, the same shape as those modes, not a multi-match bracket like Trivia/Wordle Tournament. Winner gets placement `1`; eliminated players get placement by reverse elimination order (last eliminated = 2nd place, etc.). `type: 'concentration'` is added to `leaderboard()`'s type dispatch and to the chain-leaderboard exclusion list, exactly like every other race-style mode. `/concentration stats [all]` is a normal weekly/all-time leaderboard, same shape as `/flag stats`.

## Router / Render

- Commands: `/concentration start`, `/concentration join`, `/concentration begin`, `/concentration end`, `/concentration stats [all]`.
- `GAME_COMMANDS` gains `'concentration'` (ban coverage).
- New render cases for every event type above, following the existing per-mode formatting conventions (header line, separator, body).
- Help menu gets a `*🃏 CONCENTRATION* _(start: admins only)_` section; welcome message gets a one-line mention.

## Edge Cases

- Lobby never reaches 3 players before the join window closes: cancelled, same as Tournament's registration-fails-to-fill path.
- Admin ends the game mid-round: `concentration_terminated`, no result recorded (matches how other modes handle an admin-forced stop).
- A player who times out or answers wrong is removed from the active rotation immediately; if only one player remains after an elimination, the game ends without waiting for a further turn.
