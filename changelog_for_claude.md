# Recent Changes & Additions

This document summarizes all the recent updates, architectural decisions, and bug fixes applied to the `wcg-bot` repository. You can provide this to Claude so it has full context on the current state of the codebase.

## 1. New Feature: Word Scramble Game
We designed and integrated a completely new game mode called **Word Scramble**.

### Architecture & Engine (`engine/scramble.js`)
- Implemented a state machine patterned after the existing Word Chain and Trivia games (`idle`, `asking`, `gap`, `over`).
- **Rules**: 10 rounds per game, 15 seconds to guess each word, 10-second gap between words.
- Uses exact case-insensitive matching for unlimited attempts until the timer runs out.
- Instead of using the large 700,000 word scrabble dictionary (which proved too obscure) or the trivia answers (which were too easy and included proper nouns), Scramble pulls words exclusively from `data/common.txt` and filters them to exactly **4 to 7 characters**. This guarantees moderately challenging but highly recognizable English words.

### Integration (`transport/router.js` & `transport/render.js`)
- **Commands**: Registered `/scramble start`, `/scramble end`, and `/scramble stats [all]`. Starting is restricted to group admins.
- **Routing**: `startScramble()` initializes the game, loads the 4-7 character `scramblePool` into memory, and wires it to `handleMessage` for processing guesses.
- **Rendering**: Added event renderers for `scramble_word`, `scramble_answer`, `scramble_over`, and `scramble_terminated` in `transport/render.js`.
- **Boot Message**: Updated the global welcome message in `index.js` to advertise the Scramble game (and the Tournament game).

## 2. Bug Fixes for Scramble
- **Data Structure Crash**: Fixed a fatal `TypeError` caused by attempting to `.split()` an undefined string. The engine was originally targeting `.answer` on the trivia objects instead of `.correct`. 
- **Leaderboard Duplication**: Fixed a bug where a player's phone number was being accidentally overwritten with `undefined` during the `scramble_answer` event. This caused the database to store their internal WhatsApp `@lid` instead of their `@s.whatsapp.net` ID, leading to duplicate entries on the leaderboard. The bad block in `router.js` was removed, and a manual SQL script was run to backfill the missing phone numbers in `wcg.db`.
- **Leaderboard Bleed**: Fixed a bug where `/scramble stats` was showing players who had never played Scramble. The SQL query in `store/db.js` was filtering by `g.type IS NOT 'trivia'`, which mistakenly aggregated both Word Chain and Scramble results together. Split this into dedicated `stmtSelectResultsChain` and `stmtSelectResultsScramble` queries.
- **Termination Bug**: Fixed `/scramble end` failing silently. The method in `engine/scramble.js` was named `terminate()`, but `router.js` expected it to be named `end()` to match the interface used by all other game types.

## 3. WhatsApp Authentication Crash Loop Fix
- **The Issue**: When the bot received a `401 loggedOut` event from WhatsApp (indicating a revoked or corrupted session), it told the user to clear their `SESSION_ID` and restart. However, because the legacy session was still stored inside `wcg.db`, clearing the env var caused the bot to simply reload the dead session from the database, resulting in an infinite crash loop.
- **The Fix**: 
  - Added a `wipeAll()` method to `store/auth.js` which executes `DELETE FROM wa_keys`.
  - Updated the connection logic in `transport/wa.js` to automatically call `authState.wipeAll()` whenever a `DisconnectReason.loggedOut` is received.
  - Now, if the session is killed by WhatsApp, the bot instantly purges the SQLite credentials before shutting down, guaranteeing that the next boot will correctly generate fresh credentials and prompt for a pairing code.
