# WCG Bot — Session Handover (2026-08-04)

This document summarizes all changes made in a single session to the WCG Bot codebase. Use it as full context for continuing development.

## Project Overview

WCG Bot is a standalone WhatsApp Word Chain Game bot built on Node 22+ with `baileys` (v6.7.24) for WhatsApp transport and `node:sqlite` for persistence. It runs as a linked device on the owner's WhatsApp account. The full spec lives in [PLAN.md](file:///c:/Users/hp/wcg-bot/PLAN.md) (406 lines, extremely detailed).

### Key Architecture
- **Engine layer** (`engine/`) — pure, I/O-free game state machine. All time injected via `now` args.
- **Transport layer** (`transport/`) — baileys socket, outbox rate limiter, command router, message renderer.
- **Store** (`store/db.js`) — `node:sqlite` with 5 tables: `games`, `results`, `rejections`, `custom_words`, `settings`.
- **Single global tick** (`engine/tick.js`) — one `setInterval(1s)` walks all active games. No per-game timers.
- **Outbox** (`transport/outbox.js`) — per-chat FIFO queue with global rate limit (8/sec), per-chat pacing (400ms gap), stale-turn coalescing, and cosmetic-first shedding under load.

### File Layout (post-changes)
```
index.js               boot: lock → dict → socket → tick → outbox; crash handlers; welcome message
config.js              env only (PREFIX, PHONE_NUMBER, OWNER, ADMINS, SESSION_DIR, SESSION_FILE)
engine/game.js         lobby → turns → win state machine (no I/O)
engine/validate.js     chain / length / used / dictionary checks
engine/modes.js        shared ramp steps + per-mode entry points, as data
engine/dictionary.js   Set + per-letter index for random prompts
engine/normalize.js    fold diacritics, strip invisible unicode, lowercase
engine/tick.js         one global scheduler over Map<jid, Game>
engine/test.js         assert-based engine self-check (29 tests)
engine/game.test.js    game state machine tests (16 tests)
transport/wa.js        baileys socket, pairing code, inbound handler, safe shutdown
transport/auth.js      ★ NEW — single-file auth state (replaces useMultiFileAuthState)
transport/outbox.js    send queue, per-chat pacing, global rate limit, send timeout
transport/router.js    command dispatch, game event → outbox, leaderboard, pnMap tracking
transport/render.js    pure event → WhatsApp text renderer
transport/commands.js   prefix-based command parser
transport/admin.js     three-layer admin resolution (OWNER, ADMINS, group admins)
transport/lock.js      single-instance guard over session/
transport/quiet.js     suppresses libsignal decrypt noise in logs
store/db.js            node:sqlite schema + queries + player_pn migration
session/creds.json     ★ single-file auth state (replaces 45+ individual files)
```

---

## Changes Made (5 Bug Fixes + 1 Feature)

### Bug 1: Duplicate Users in Leaderboard

**Symptom:** `/stats` showed the same person (e.g. `@Phil`) multiple times with separate scores.

**Root cause:** WhatsApp has two JID namespaces — phone-form (`234…@s.whatsapp.net`) and LID-form (`…@lid`). The `results` table stored the raw `sender` JID, and the leaderboard grouped by it. Same physical person with different JIDs across games = duplicate entries.

**Files changed:**

#### `store/db.js`
- Added `player_pn TEXT` column to `results` table via `ALTER TABLE` migration (try/catch for idempotency).
- Updated `stmtInsertResult` to accept and store `player_pn`.
- Changed leaderboard query: `SELECT COALESCE(player_pn, player) AS player` — aggregates by phone-form JID when available, falls back to raw JID for old data.
- `recordGame()` now destructures `player_pn` from each result entry.

#### `transport/router.js`
- `gameMeta` (per-jid game metadata tracker) now includes a `pnMap: new Map()` initialized on `lobby_open`.
- `startGame()` accepts `senderPn` and records `sender → senderPn` in the pnMap after the game is created.
- `handleMessage()` populates `pnMap.set(sender, senderPn)` before calling `sendEvents()` on every join/submit.
- `sendEvents()` winner-event handler now passes `player_pn: pnMap.get(player)` in each result entry.

#### `store/db.test.js`
- Added test: "player_pn: same person under two JID namespaces aggregates into one leaderboard entry" — records two games with the same person under `@lid` and `@s.whatsapp.net` JIDs with matching `player_pn`, verifies leaderboard shows 1 entry with 2 games.

---

### Bug 2: Bot Rejecting All Words

**Symptom:** During a game, the bot rejected every word from every player until the last person won by default (everyone else timed out).

**Root cause:** WhatsApp's rich-text engine injects invisible Unicode characters into message text:
- `\u200B` (Zero-Width Space)
- `\u200C` (ZWNJ), `\u200D` (ZWJ)
- `\u00AD` (Soft Hyphen), `\uFEFF` (BOM)
- `\u200E`/`\u200F` (LTR/RTL marks)
- `\u202A`–`\u202E` (bidi embedding/override)
- `\u2060`–`\u2064`, `\u2066`–`\u2069` (word joiners, isolates)

These characters survived `fold()` (lowercase + accent stripping) but failed the `/^[a-z]+$/` regex in `validate.js`, causing every word to be reported as `not_in_list`.

**File changed:**

#### `engine/normalize.js`
- Added `INVISIBLE_RE` regex constant at module level.
- `fold()` now calls `s.replace(INVISIBLE_RE, '')` as its **first** step, before lowercasing or any other transformation.
- No other files needed changes — `validate.js` calls `normalizeInput()` which calls `fold()`, so the fix propagates automatically.

---

### Bug 3: Bot Hanging / Unresponsive After Game

**Symptom:** After a game ended (especially one where all players timed out), the bot stopped responding to all commands. Persisted even after restart.

**Root cause (multi-factor):**
1. Unhandled promise rejections in baileys or the message handler killed the event loop silently — no log output, process appeared alive but dead.
2. No try/catch around the `messages.upsert` handler — one bad message could crash the entire listener.
3. A hanging `sendFn()` call (baileys socket issue) could permanently block a chat's outbox queue slot, since `inFlightChats` was never cleared.
4. The "persists after restart" part was likely session corruption from hard-killing the process (covered by PLAN.md's session integrity section).

**Files changed:**

#### `index.js`
- Added `process.on('unhandledRejection', ...)` — logs the error, does not crash.
- Added `process.on('uncaughtException', ...)` — logs fatal error, triggers `shutdown()`.
- Both handlers are registered after the dictionary loads but before the socket connects.

#### `transport/wa.js`
- Wrapped the entire `messages.upsert` handler body in `try { ... } catch (e) { logger.error(...) }`. A single bad message can no longer crash the event loop.

#### `transport/outbox.js`
- Added a 30-second timeout race on `sendFn()` calls in `dispatch()`:
  ```js
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('send timed out after 30s')), 30_000)
  )
  Promise.race([sendFn(...), timeout])
  ```
  If baileys hangs, the in-flight slot is freed after 30s and the message retries once (existing retry logic), then drops. The outbox can never deadlock.

---

### Bug 4: Reaction Emoji (✅) Removed

**Symptom:** The checkmark reaction on accepted words consumed rate-limit budget. Every accepted word queued 2 extra outbox messages (a `✅` reaction + a clearing empty-text reaction 8 seconds later via `notBefore`). In fast games with 5+ players, cosmetic sends ate a significant chunk of the 8/sec global rate limit.

**Decision:** Remove entirely (user chose this over a toggle).

**Files changed:**

#### `transport/router.js`
- Deleted `REACTION_TTL_MS` export (was `8000`).
- Removed `let reactKey = null` tracking in `sendEvents()`.
- Removed the `event.type === 'accepted' && quoted?.key` branch that set `reactKey`.
- Removed the post-loop block that enqueued two cosmetic reactions.
- Net effect: `sendEvents()` no longer produces any outbox entries for `accepted` events.

#### `transport/router.test.js`
- Removed `REACTION_TTL_MS` from import.
- Replaced two tests ("accepted enqueues a ✅ reaction..." and "turn message is enqueued before the ✅ reaction...") with one test: "accepted enqueues nothing (reactions removed for speed)" — asserts `calls.length === 0`.

---

### Bug 5: Single-File Session (creds.json)

**Before:** `session/` contained 45+ files (creds.json, pre-key-*.json, session-*.json, sender-key-*.json, app-state-sync-key-*.json, sender-key-memory-*.json). Generated by baileys' `useMultiFileAuthState()`.

**After:** `session/` contains 2 files: `creds.json` (all auth state) and `.lock` (instance guard). Generated by new custom `useSingleFileAuthState()`.

**Files changed:**

#### `transport/auth.js` (NEW)
- Exports `useSingleFileAuthState(filePath)`.
- Returns `{ state, saveCreds, flush }` — same interface as baileys' `useMultiFileAuthState` plus `flush()`.
- Stores all state in one JSON object: `{ creds: {...}, keys: { "pre-key": {...}, "session": {...}, ... } }`.
- Uses baileys' `BufferJSON.replacer`/`reviver` for Buffer serialization (imported from `baileys`).
- Uses baileys' `initAuthCreds()` for fresh credentials (imported from `baileys`).
- **Debounced writes:** `scheduleSave()` coalesces multiple key updates within 500ms into one disk write. Critical during connect when baileys fires dozens of key updates in rapid succession.
- **`flush()`:** Synchronous force-write for graceful shutdown. Clears any pending debounce timer and writes immediately.
- Directory is auto-created via `mkdirSync({ recursive: true })`.
- Corrupted file on load → starts fresh (same as baileys' behavior).

#### `transport/wa.js`
- Import changed: `useMultiFileAuthState` → `useSingleFileAuthState` from `./auth.js`.
- Import changed: `SESSION_DIR` → `SESSION_FILE` from config.
- `connect()` call: `useSingleFileAuthState(SESSION_FILE)` (synchronous, no `await` needed).
- Module-level `authFlush` variable set during `connect()`, called in `shutdown()`.
- `shutdown()` now calls `authFlush()` before `sock.end()`.

#### `config.js`
- Added: `export const SESSION_FILE = process.env.SESSION_FILE ?? \`\${SESSION_DIR}/creds.json\`;`

#### `index.js`
- Removed the `await new Promise(r => setTimeout(r, 500))` delay in `shutdown()` — no longer needed since `wa.js`'s `shutdown()` calls `authFlush()` synchronously.

#### `.env`
- Updated comments to reference single-file approach.
- Added commented `SESSION_FILE` override option.

---

### Feature: Welcome Message on Connect

**Behavior:** On first connection, the bot sends a DM to the OWNER with boot stats and a thematic quote. Reconnections (after brief disconnects) do not re-send.

**Message content:**
```
🎮 W·C·G  B·O·T 🎮
━━━━━━━━━━━━━━━━━━━

⚡ Online and locked in.

📚 703,769 words loaded
🕐 Booted in 2.3s

"First they ignore your vocabulary.
Then they time out."

▸ /help — all commands
▸ /wcg start — drop into a group and go

🔗 Chain. Survive. Win.
```

**Files changed:**

#### `index.js`
- Added `const bootStart = Date.now()` at module top (before logger init).
- Added `onConnected()` function with `welcomeSent` guard (boolean flag, prevents re-send on reconnect).
- Computes boot time (`Date.now() - bootStart`), dictionary size (`dict.size.toLocaleString()`).
- Sends to `${OWNER}@s.whatsapp.net` via `send()`.
- Passed as third argument to `connect(handleMessage, logger, onConnected)`.

#### `transport/wa.js`
- `connect()` signature: added `onConnected` parameter.
- `connection.update` handler: calls `onConnected()` when `connection === 'open'`.

---

## Test Results

All **149 tests** pass across 9 suites:

| Suite | Tests |
|---|---|
| `engine/test.js` | 29 |
| `engine/game.test.js` | 16 |
| `store/db.test.js` | 16 (was 15, +1 new dedup test) |
| `transport/test.js` | 37 |
| `transport/render.test.js` | 21 |
| `transport/router.test.js` | 17 (was 18, -2 reaction tests, +1 no-reaction test) |
| `transport/outbox.test.js` | 13 |
| `transport/lock.test.js` | 6 |
| `transport/quiet.test.js` | 7 |

Run all with: `npm test`

---

## Current State

- **Session folder was deleted** by the user before this session. The bot needs re-pairing on next start (it will print a pairing code).
- **No session/creds.json exists yet** — it will be created on first connect.
- **The old 45-file session format is not migrated** — fresh start. The `useSingleFileAuthState` in `transport/auth.js` creates the new format from scratch.
- **The `wcg.db` SQLite database** still exists with historical data. The `ALTER TABLE results ADD COLUMN player_pn TEXT` migration runs automatically and is idempotent (try/catch). Old rows have `player_pn = NULL` and fall back to raw `player` via `COALESCE`.

---

## What's NOT Done Yet (from PLAN.md)

These are scoped in the plan but deferred:

- **`/pool full|common`** — switch between 704k and 9k word pools per group
- **`/lang add|remove <code>`** — toggle language lists per group
- **`/suspect @user`** — admin-only anti-cheat reporting (timing + rarity stats)
- **Banned-letter mode, category mode** — cut in Phase 6
- **In-game word scoring display** — cut ("bot talks too much" feedback)
- **i18n string extraction** — deferred until second language exists
- **Crash recovery / snapshot resume** — deliberately dropped in Phase 5 (bad cost/benefit tradeoff)

---

## Key Design Decisions to Preserve

1. **No penalty for rejected words.** Player's clock keeps running, they may submit again. Wrong guess costs time, never the turn.
2. **Ramp unit is the round** (every surviving player has had one turn), not the word. Prevents scale-dependent behavior with 20 players.
3. **Per-game leaderboard cap of 6 points.** Stops marathon farmers from owning the week.
4. **No solver auto-detection.** `/suspect` is report-only and opt-in. False accusation costs more than an undetected cheater.
5. **`session/` is the session.** Never call `sock.logout()` — that unlinks the device permanently. Use `sock.end()` for clean disconnect.
6. **Dictionary pool and difficulty are independent knobs.** `common.txt` restricts the pool; difficulty only changes the length floor and clock.
