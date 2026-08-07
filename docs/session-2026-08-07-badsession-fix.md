---
name: wcg-bot-session-2026-08-07-badsession-fix
description: Permanent fix for the recurring badSession (500) disconnect that left the bot unable to decrypt messages mid-game, plus console noise suppression and a stale test fix.
metadata:
  node_type: memory
  type: project
  originSessionId: 0db0a409-3aff-4664-b97d-48c73072a2c0
  modified: 2026-08-07T15:48:00.000Z
---

## Problem

The bot was repeatedly crashing mid-game with a `500 badSession` disconnect from WhatsApp's server. After reconnecting, every inbound message hit:

```
MessageCounterError: Key used already or never filled
    at SessionCipher.doDecryptWhisperMessage (libsignal/src/session_cipher.js:236:19)
```

This meant the bot could not decrypt **any** messages after the reconnect. It sat there silently while players sent commands — appearing to "hang up" mid-game and failing everyone until the game ended. The console also flooded with `Removing old closed session:` dumps containing raw Buffer key material.

### Root Cause

When WhatsApp sends a `badSession` (500) stream error, it means the device's Signal protocol ratchet state is out of sync with the server. The per-contact session files on disk (`session-*.json`) and group sender-key files (`sender-key-*.json`) contain stale ratchet counters. On reconnect, baileys loaded these corrupted files and every `SessionCipher.decryptWhisperMessage()` call failed because the stored key counters didn't match what the sender was using. The retry mechanism (`sendRetryRequest`) couldn't help either — the underlying session record was fundamentally broken.

The bot's existing code (in `transport/wa.js`) had no special handling for `badSession` — it fell through to the generic reconnect path, which simply reconnected with the same corrupted auth state.

## Changes Made

### 1. BadSession Recovery — `transport/wa.js`

**The core fix.** Three things happen when a `badSession` disconnect is detected:

1. **Purge corrupted Signal session files**: A new `purgeSignalSessions()` async function reads the session directory and deletes all `session-*.json` and `sender-key-*.json` files. These are the per-contact Signal ratchet states that are corrupted. `creds.json` (device identity), `pre-key-*.json` (unused pre-keys), and `app-state-sync-key-*.json` are preserved — they're still valid.

2. **Null `authState`**: Forces the next `connect()` call to rebuild the auth state from disk via `useMultiFileAuthState()`, so the in-memory store sees the cleaned directory rather than serving stale cached sessions.

3. **Reconnect after standard delay**: baileys automatically negotiates fresh Signal sessions via pre-key messages with each contact on the new connection.

**New imports added**: `readdir` and `unlink` from `node:fs/promises`, `join` from `node:path`.

**New `badSession` branch** in `connection.update` handler (lines 314–333), sitting between the existing `restartRequired` and generic disconnect branches.

**What the console will show on recovery**:
```
[WARN] Bad session (500 badSession) after Xs connected — purging Signal sessions and reconnecting...
[INFO] Purged N stale Signal session file(s) from session
[INFO] Connected to WhatsApp as ...
```

Recovery takes ~3 seconds instead of the bot sitting dead indefinitely.

### 2. Console Noise Suppression — `transport/quiet.js`

Added 5 new patterns to `NOISE_PATTERNS` to suppress libsignal console spam that was flooding the terminal (especially during badSession recovery bursts):

| Pattern | Source in libsignal |
|---|---|
| `Session error:...MessageCounterError` | `session_cipher.js` — fires in bursts during badSession |
| `Removing old closed session:` | `session_record.js` — dumps raw Buffer/key data |
| `Decrypted message with closed session.` | `session_cipher.js` — harmless backlog processing |
| `Session already open` | `session_record.js` |
| `Opening session:` | `session_record.js` — dumps full SessionEntry |

All suppressed lines are still counted and reported in the periodic `suppressed N libsignal decrypt-noise lines` log summary (existing mechanism, unchanged).

### 3. Stale Test Fix — `engine/tournament.test.js`

The test `"match questions run the tournament-specific 7s clock"` had a hardcoded `afterStart + 7_000` assertion from when `TOURNAMENT_CLOCK_SECONDS` was 7. It was changed to 10 in the previous session but this assertion wasn't updated. Fixed to use `afterStart + TOURNAMENT_CLOCK_SECONDS * 1000` and renamed the test to say "10s".

**Note**: `TOURNAMENT_CLOCK_SECONDS` was already 10 (set in the 2026-08-06 session). The user re-requested it but no code change was needed — only the stale test.

## Test Results

Full test suite: **all pass** (358 tests across 16 test files). The only non-pass output is `nationality FAILED: WDQS 504` which is a live Wikidata Query Service timeout, not a test failure — the test correctly handles it via `tryQuery`-style isolation.

## Files Changed

| File | Change |
|---|---|
| `transport/wa.js` | +2 imports, +`purgeSignalSessions()` function, +`badSession` branch in disconnect handler |
| `transport/quiet.js` | +5 noise suppression patterns |
| `engine/tournament.test.js` | Fixed stale 7s→10s clock assertion |

## Architecture Notes for Future Reference

- **`authState` lifecycle**: Initialized once via `useMultiFileAuthState(SESSION_DIR)` and reused across reconnects (baileys' documented pattern). Each `makeWASocket()` call wraps `authState.keys` with its own `addTransactionCapability` — this is local to each socket and does not layer/conflict. The only time `authState` should be nulled is after a `badSession` purge (done in this fix).

- **Signal session files**: baileys' `useMultiFileAuthState` stores each key type as `{type}-{id}.json` in the session directory. The `fixFileName` function replaces `/` with `__` and `:` with `-`. Session files are `session-*.json`, sender keys are `sender-key-*.json`.

- **`badSession` (500)**: This is the default/fallback disconnect reason in baileys (`generics.js` line 276). It fires when the server sends a `stream:error` or `failure` without a more specific code. It does NOT mean "logged out" — the device identity is fine, only the per-contact ratchet state is broken.

- **Pre-key supply**: After purging sessions, baileys will consume pre-keys as it re-negotiates sessions. The `handleEncryptNotification` handler in `messages-recv.js` automatically uploads more pre-keys when the server's count drops below `MIN_PREKEY_COUNT`. No manual intervention needed.

## How to Apply

Before starting new work on session/transport code, confirm this state is current via `git log`/`git status`. Nothing was committed — changes sit in the working tree (owner commits directly to main).
