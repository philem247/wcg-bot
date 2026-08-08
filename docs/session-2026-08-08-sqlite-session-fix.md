---
name: wcg-bot-session-2026-08-08-sqlite-session-fix
description: Full transition from file-based Baileys authentication to SQLite-backed session with a single Base64 SESSION_ID env var.
metadata:
  node_type: memory
  type: project
  originSessionId: 0db0a409-3aff-4664-b97d-48c73072a2c0
  modified: 2026-08-08T02:15:00.000Z
---

## Problem Statement

Even after adding the `badSession` purge logic on `2026-08-07`, the bot was still susceptible to session state corruption. The default `useMultiFileAuthState` provided by Baileys writes Signal ratchet keys into dozens of separate JSON files within the `session/` folder. Write races, incomplete flushes during container restarts, or random network interruptions would corrupt just one file, causing the whole auth state to fall out of sync and crash mid-game with `MessageCounterError`. 

The user requested a migration to a single session string approach (similar to popular bots like Levanter) using a `SESSION_ID` `.env` variable, avoiding the need for a physical session folder.

## Changes Implemented

### 1. SQLite-backed Authentication State (`store/auth.js`)
We created a custom authentication module (`useSqliteAuthState`) that intercepts Baileys' auth reads/writes and maps them directly to the `wcg.db` SQLite database under a new `wa_keys` table. 

Why this solves the problem:
- **Atomic Writes:** SQLite's WAL mode guarantees that each Signal key update is entirely completed or rolled back, effectively eliminating partial file corruption.
- **No File Races:** Because writes are synchronized internally by SQLite, the bot no longer needs `async-mutex` or multiple file handlers, preventing stale reads.

### 2. Base64 `SESSION_ID` Implementation (`config.js`, `.env`)
Instead of needing to back up a `session/` directory, the bot's identity payload (`creds.json`) is now compressed and serialized into a Base64 string.
- When `SESSION_ID` is defined in `.env`, the bot will reconstruct its credentials in memory and exclusively use the `wcg.db` database for the fast-moving Signal keys. 
- The physical `session/` directory is completely bypassed for auth storage (though it's still lightly used by `index.js` for an empty `.lock` instance file to prevent duplicate bot instances).

### 3. Graceful First-time Pairing (`transport/wa.js`)
If `SESSION_ID` is empty (e.g., when the user starts fresh), the bot gracefully falls back to legacy file-based auth to initiate pairing via a pairing code.
- **Immediately upon successful pairing**, the bot triggers `authState.getSessionId()` and prints the user's new Base64 `SESSION_ID` to the terminal in a highly visible console block. 
- The user is instructed to copy this string into their `.env` file and restart. Once they restart with the `SESSION_ID` set, all subsequent auth activity routes purely through SQLite.

### 4. `badSession` Purge Refactored
In `transport/wa.js`, if the bot encounters a `badSession (500)` network disconnect, it still purges the corrupted Signal sessions to automatically recover. However, instead of doing file I/O `unlink()`, it executes a lightning-fast atomic `DELETE FROM wa_keys WHERE category IN ('session', 'sender-key')` via SQLite.

### 5. Dependency / Path Fix
Fixed a module resolution error (`ERR_MODULE_NOT_FOUND`) during testing by correctly pointing the `proto` import to `baileys/WAProto/index.js` inside `store/auth.js`.

## Test Results
Ran the comprehensive unit test suite (`npm test`) consisting of 358 tests across 16 files.
- **0 Failures.**
- Confirms the connection wrapper logic and everything else continues to function correctly alongside the new SQLite authentication state.

## How to Proceed
No further action is required on this front. If any transport/auth modifications are needed in the future, remember that the source of truth for the bot's identity is the `SESSION_ID` string, while the rapidly changing Signal ratchets are transient data that live in `wa_keys` inside SQLite.
