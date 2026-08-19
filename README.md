# WCG Bot — WhatsApp Multiplayer Game Bot

A self-hosted WhatsApp bot for group game nights: Word Chain, Trivia, Word Scramble, Logo Quiz, Riddle Quest, and head-to-head Trivia Tournaments, all running out of one Node process against a single group chat's messages. No database server, no native build step — everything lives in one SQLite file.

## Requirements

- Node 22+ (uses the builtin `node:sqlite`, so there is no native compile step and no build tools needed on the host)
- No database server to install

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your values:
   - `PHONE_NUMBER`: The bot's WhatsApp number (country code + number, digits only, no +)
   - `OWNER`: Your WhatsApp number for full control
   - `ADMINS`: Comma-separated list of global admin numbers (optional)
   - Other variables control logging, timing, and the bot's prefix
3. `npm start`

On first run, the bot prints an 8-digit pairing code to the console. Enter that code in WhatsApp under **Linked Devices → Link with phone number**. A `515 restartRequired` disconnect immediately after pairing is normal — wait for the bot to reconnect.

### Auth: how credentials are actually stored

All WhatsApp credentials (the Signal identity and ratchet keys) are stored in the bot's own SQLite database (`wcg.db`), not in a `session/` folder — `session/` today holds only a `.lock` file that stops two instances from running against the same install at once.

- **First run, no `SESSION_ID` set**: the bot generates fresh credentials, stores them in `wcg.db`, and after the socket successfully connects, prints a base64 `SESSION_ID` string to the console. Copy that into your `.env` (or hosting panel) as `SESSION_ID` if you want a portable copy of the credentials outside `wcg.db`.
- **`SESSION_ID` set**: on boot, the bot decodes it and uses those credentials. If `wcg.db` already holds a *different* identity, it wipes the old one and adopts the `SESSION_ID` credentials instead — this is how you move a paired session to a new host without re-pairing.
- Either way, reads and writes go through `wcg.db`. `SESSION_ID` is just a portable snapshot of what's in there — it is optional, not a separate auth mode.

### Deploying to a hosting panel

Configuration works two ways: variables set in the panel, or an uploaded `.env` file. Panel variables take priority and act as overrides.

Since credentials live in `wcg.db`, there is no `session/` folder to SFTP-upload for auth purposes at all — either:
- Set `SESSION_ID` in the panel/`.env` before first boot (recommended — the bot adopts it immediately, no re-pairing), or
- Copy `wcg.db` itself to the new host, or
- Pair fresh on the host using the 8-digit code printed to the panel console, then grab the `SESSION_ID` printed after connect for next time.

`session/`, `.env`, and `wcg.db` are gitignored, so none of them arrive via git deploy.

**Critical: only one instance may run against a given install at a time.** `session/.lock` enforces this — if you copy `wcg.db`/`SESSION_ID` to a new host, stop the old instance first. Two live instances advancing the same Signal ratchets corrupt each other's session and force a re-pair.

Node 22+ is required on the host for the builtin `node:sqlite`.

## Configuration

Environment variables (defined in `.env` and read from `config.js`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PHONE_NUMBER` | required | Bot's WhatsApp number, digits only, no + |
| `OWNER` | required | Bot owner's number for full control everywhere |
| `ADMINS` | empty | Comma-separated global admins (same format) |
| `PREFIX` | `/` | Command prefix |
| `LOG_LEVEL` | `info` | Log verbosity: `trace`, `debug`, `info`, `warn`, `error` |
| `WA_LOG_LEVEL` | `silent` | Baileys' internal logger (set to `debug` only when diagnosing connection issues) |
| `QUIET_SIGNAL_NOISE` | `true` | Suppress libsignal console noise after re-pairing |
| `SESSION_ID` | empty | Base64 credentials string printed after first connect; set it to move a paired session to a new host (see Auth above) |
| `SESSION_DIR` | `session` | Directory holding the single-instance `.lock` file (back this up before reinstalling is no longer required — credentials live in `wcg.db`) |
| `STALL_TIMEOUT_MS` | `180000` (3 min) | Force a reconnect if a game is running and nothing has dispatched for this long. `0` disables the watchdog — see Reliability below |
| `SILENCE_TIMEOUT_MS` | `900000` (15 min) | Connected but zero notify traffic for this long, plus at least one Signal decrypt failure observed → treat as a deaf socket and attempt a non-destructive `uploadPreKeys()` repair. `0` disables it — see Reliability below |
| `BUFFER_FLUSH_TIMEOUT_MS` | `60000` (1 min) | Force-flush baileys' initial post-connect event buffer if it's still held and no traffic has arrived by this long after connect. `0` disables it — see Reliability below |
| `MARK_ONLINE` | `false` | Announce this linked device as the active client on connect (`markOnlineOnConnect`). Left off by default — it makes the owner's phone lag by pulling presence/notification routing onto the bot's device |
| `TRACE_LOG` | `false` | Verbose per-message diagnostic logging (inbound message, command parse, dispatch, send) — floods the console, only for actively diagnosing a routing problem |
| `AUTO_RESTART_HOURS` | `0` | Periodically restart the whole process (clean reconnect) after this many hours. `0` disables it. Only enable on a host with a process supervisor (pm2/systemd) — on a bare panel host, exiting means the bot stays down until a human restarts it |
| `PURGE_SIGNAL_ON_BOOT` | `false` | One-time manual recovery: purge `session`/`sender-key` rows once on the next boot. **Destructive** — breaks group decryption until re-pair, see Reliability below. **Unset it after one restart** or it purges on every boot |
| `RESET_SESSION` | `false` | Force a genuine re-pair: wipes ALL `wa_keys` rows (including `creds`) before the next boot, so the bot generates fresh credentials and prints a new pairing code. **Destructive** — destroys this device's identity. **Unset it after one restart** or it re-pairs on every boot. See Reliability below for why clearing `SESSION_ID` alone does not do this |

## Game modes

| Mode | Rounds/shape | Scoring |
|------|--------------|---------|
| **Word Chain** | Players take turns submitting words starting with the previous word's last letter; required length rises and the clock shrinks as the game goes on. Last player standing wins. `/wrg` is the random-letter variant. | Elimination |
| **Trivia** | Multiple-choice questions drawn from `data/trivia.json`, mixed or single-category, no lobby (answering is joining). | Points per correct answer, weekly and all-time leaderboards |
| **Scramble** | 10 rounds, 15s clock per word, 10s gap between rounds. The bot scrambles a dictionary word (4–7 letters); players race to unscramble it. | Race — first correct answer per round wins the point |
| **Logo Quiz** | 10 rounds, 20s clock, 10s gap. The bot posts a brand-logo image from `data/logos/`; players race to name the brand. Answer matching strips spaces/punctuation to be forgiving. | Race — first correct answer per round wins the point |
| **Riddle Quest** | 5 riddles per game, 20s clock per riddle, a hint marker at the 10s mark, 3s gap between riddles. Drawn from `data/riddles.json`; answers match against a curated alias list, not just the literal answer string. | 3 points for 1st correct, 1 point for 2nd, weekly and all-time leaderboards |
| **Tournament** | Head-to-head single-elimination trivia bracket, byes for non-power-of-two entrant counts. `TOURNAMENT_CLOCK_SECONDS = 10` per question (tighter than group trivia's 30s clock, to discourage searching an answer up mid-match), `MATCH_START_DELAY_MS = 4000` pause before each match's first question, `REGISTRATION_MS = 120000` (2 min) open registration window. An admin drives every round with `/tourney next`. | Race scoring within each match (first correct answer wins the question); a tied match goes to sudden death |

Starting any game (Word Chain, Trivia, Scramble, Logo Quiz, Riddle Quest, or a Tournament) requires a bot admin, group admin, owner, or global admin — this is enforced the same way for every mode.

## Commands

Prefix all commands with `/` (or your custom `PREFIX`):

### Word Chain (start: admins only)

| Command | Does |
|---------|------|
| `/wcg start` | start a chain game |
| `/wcg easy\|medium\|hard` | start a chain game at that difficulty |
| `/wrg start` | start a random-letter game |
| `/wcg end` | stop the current game (starter or admin) |

### Trivia (start: admins only)

| Command | Does |
|---------|------|
| `/trivia` | start a mixed-category trivia game |
| `/trivia <category>` | start a trivia game in one category |
| `/trivia categories` | list playable categories |
| `/trivia end` | stop the current trivia game (starter or admin) |

### Scramble (start: admins only)

| Command | Does |
|---------|------|
| `/scramble start` | start a scramble game |
| `/scramble end` | stop the current scramble game |

### Logo Quiz (start: admins only)

| Command | Does |
|---------|------|
| `/logo start` | start a logo quiz |
| `/logo end` | stop the current logo quiz |

### Riddle Quest (start: admins only)

| Command | Does |
|---------|------|
| `/riddle` | start a 5-riddle game |
| `/riddle end` | stop the current riddle game (starter or admin) |

### Tournament (start/next/end: admins only)

| Command | Does |
|---------|------|
| `/tourney start [category]` | open registration for a head-to-head bracket (admin) |
| `/tourney next` | advance to/through the next round (admin) |
| `/tourney end` | end the tournament (admin) |
| `/tourney status` | show the current bracket state (anyone) |
| `/tourney stats` | tournament win leaderboard (anyone) |

### Scores (anyone)

| Command | Does |
|---------|------|
| `/stats [all]` | word chain weekly (or all-time) leaderboard |
| `/trivia stats [all]` | trivia weekly (or all-time) leaderboard |
| `/scramble stats [all]` | scramble weekly (or all-time) leaderboard |
| `/logo stats [all]` | logo quiz weekly (or all-time) leaderboard |
| `/riddle stats [all]` | riddle quest weekly (or all-time) leaderboard |

### Admin

| Command | Does |
|---------|------|
| `/pending` | most-rejected words in this group |
| `/addword <word>` | approve a rejected word into the dictionary, live |
| `/addword all` | approve the top 10 rejected words at once |
| `/delword <word>` | remove a word |
| `/admin` | list who can run admin commands here and why |

### Owner (owner and global admins only)

| Command | Does |
|---------|------|
| `/promote @user` | grant bot-admin rights in this group (persists) |
| `/demote @user` | revoke them |
| `/ban @user` | ban a user from trivia in this group |
| `/unban @user` | lift a trivia ban |
| `/bans` | list who's trivia-banned here |

### Everyone

| Command | Does |
|---------|------|
| `/help` | show all commands (admin/owner sections only shown to those who can use them) |
| `join` | join the lobby (bare word, no prefix) |
| `<word>` | submit a word during Word Chain play (bare word, no prefix) |
| `A`–`D` | answer a trivia question (bare letter, no prefix) |

Admin layers (checked in order):
1. **OWNER** — full control everywhere
2. **ADMINS** (global) — same power as owner
3. **WhatsApp group admins** — control the bot in their group only
4. **Promoted bot admins** — per-group, granted with `/promote`, stored in the database, survive restarts

Only the OWNER and global ADMINS can run `/promote`, `/demote`, `/ban`, `/unban` — WhatsApp group admins cannot.

## Trivia categories

Questions live in `data/trivia.json`, committed, no network at runtime. Current bank: **30 categories, 30,814 questions total** (counts via `node data/check_sizes.mjs`):

| Category | Questions | Category | Questions |
|----------|-----------|----------|-----------|
| football | 3,480 | web3 | 252 |
| fpl | 2,644 | bible | 1,030 |
| got | 1,195 | music | 1,039 |
| sports | 1,040 | food | 830 |
| science | 1,030 | general | 830 |
| tech | 982 | animals | 830 |
| movies | 1,030 | videogames | 830 |
| tv-shows | 1,030 | mythology | 830 |
| geography | 1,030 | vehicles | 830 |
| history | 1,030 | pidgin-english | 830 |
| anime | 830 | health | 830 |
| naruto | 1,039 | nigerian-music | 830 |
| cartoons | 1,030 | nigerian-entertainment | 839 |
| tech-gadgets | 834 | nigerian-history | 830 |
| art | 300 | nigerian-food | 830 |

`football` and `fpl` cover 2024–2026, including the 2026 World Cup and 2025/26 season — see `data/football/` for the generation pipeline.

Regenerate the full bank with `npm run build`, a multi-stage pipeline (`build-pidgin` → `build-bible` → `build-mega` → `build-mega-2` → `build-mega-3` → `build-got` → `build-anime` → `build-naruto` → `build-final`). A targeted rebuild script also exists for refreshing football/FPL without re-running the whole pipeline:

    npm run build:football   # rewrites categories.football and categories.fpl only

Questions are CC BY-SA 4.0 — see `LICENSES.md` for attribution.

## Reliability / connection handling

Long-running self-hosted WhatsApp bots occasionally hit a connection that looks alive but has silently stopped delivering messages, or a full event-loop freeze. `transport/wa.js` and the diagnostics below exist to detect and recover from both without operator intervention — but if you're debugging a freeze, here's what to grep your console log for.

**Stall watchdog** (`STALL_TIMEOUT_MS`, default 3 minutes): baileys' own keepalive only proves the websocket is alive, not that inbound messages are still being delivered over it. Every 30 seconds the bot checks whether a message has actually dispatched recently. It force-reconnects when either:
- a game is running (traffic is expected) and nothing has dispatched within the timeout, or
- messages are visibly arriving but nothing is being dispatched (catches an idle-bot hang with no game running, without ever tripping against a genuinely quiet group).

Watch for `Stall watchdog: no message dispatched in ...` in the log. Set `STALL_TIMEOUT_MS=0` to disable it.

**Grace-timer hard fallback** (`GRACE_TIMEOUT_MS = 10_000`, not configurable): when the watchdog calls `sock.end()`, it expects baileys to emit a `close` event that drives the reconnect. That event is not guaranteed to fire on a zombied/already-half-closed websocket. If no new connect cycle has started within 10 seconds, the bot forcefully terminates the raw websocket itself and reconnects directly rather than waiting on an event that may never come. Watch for `Stall watchdog: no close event within grace window — forcing hard socket teardown and reconnect`.

**Status-broadcast decrypt storm (root cause of a multi-hour "connected but not responding" outage, fixed 2026-08-18).** The bot used to attempt Signal decryption on every `status@broadcast` and `@newsletter` message it saw — traffic it holds no sender-key for and has no use for. Every failed decrypt fired a retry request to WhatsApp; in production this reached 1,622 failures in 5 minutes against ~137 real messages, and WhatsApp eventually stopped delivering to the device entirely. `transport/wa.js`'s `shouldIgnoreJid()` now short-circuits both before decryption is ever attempted (wired into baileys' `shouldIgnoreJid` socket option) — it returns `true` only for `@broadcast`/`@newsletter` JIDs; groups, DMs, and LID senders are untouched. Watch `decryptFails` on the `inbound 5m:` line (below) — it should stay near zero. If it climbs into the hundreds/thousands again, something new is triggering mass decrypt failures.

**Stuck initial event buffer.** On every connect, baileys withholds *all* app-visible events — including `messages.upsert` — until WhatsApp sends its "offline queue drained" node. If that node is slow or never arrives (which is what the status-broadcast storm above caused), the bot sits fully connected, decrypting and acking normally, while the app receives nothing — with no error logged anywhere. `BUFFER_FLUSH_TIMEOUT_MS` (default 1 minute) guards this: if the buffer is still held and no traffic has arrived by the time it fires, the bot force-flushes it itself. Watch for `Buffer-flush watchdog: initial event buffer still held and no traffic delivered ...s after connect — forcing flush`. Seeing this line means the guard caught a real stuck buffer — worth a closer look at what's generating decrypt failures around that time.

**Deaf-socket detector** (`SILENCE_TIMEOUT_MS`, default 15 minutes): connected, zero notify traffic for the timeout, *and* at least one genuine Signal decrypt failure observed (as opposed to the buffer case above, which has none) → the bot's pre-key pool is the suspected cause. It calls baileys' own `uploadPreKeys()` — non-destructive, generates and uploads a fresh pre-key batch, deletes nothing. If traffic still hasn't resumed on a second trip, it escalates to a reconnect. Watch for `Deaf-socket watchdog: ... uploading a fresh pre-key batch`.

**Diagnostic logging** (always on, no config): these lines exist purely to help track down event-loop-blocking freezes and connection problems, and are safe to ignore in normal operation.
- `EVENT LOOP LAG: <ms>` (from `lag-monitor.js`) — a scheduled timer fired late by more than 500ms, proving something blocked the event loop synchronously for that long.
- `SLOW: db.<label> took <ms>ms` (from `store/db.js`) and `SLOW: auth.readKey/writeKey(<category>) took <ms>ms` (from `store/auth.js`) — a single SQLite call took over 100ms. `node:sqlite` is fully synchronous, so a slow call here blocks the whole process for its duration; these calls run on every game action and every inbound/outbound message respectively.
- `inbound 5m: total=... byType=... noPayload=... echo=... dispatched=... connected=... upSec=... decryptFails=...` (every 5 minutes, only while traffic is arriving) — a summary of inbound WhatsApp traffic. A run of `noPayload` is the signature of a Signal ratchet problem; `byType` separates live traffic (`notify`) from backfill (`append`); `decryptFails` is the running count of genuine Signal decrypt failures (see the status-broadcast note above) and should stay near zero.
- `SILENT 5m: no inbound messages while connected (upSec=... decryptFails=...)` — printed instead of the line above when the bot is connected but nothing arrived for 5 minutes straight. A quiet console used to look identical to a healthy one; this makes the difference visible.

`TRACE_LOG=true` turns on a much more verbose per-message trace (`TRACE: msg ...`, `TRACE: cmd=...`, `TRACE: dispatching ...`, `TRACE: sent ...`) covering the full inbound-to-outbound path. Off by default — floods the log — but it's the fastest way to see exactly where a specific message got stuck (never arrived, arrived but didn't parse as a command, or parsed but never dispatched).

`AUTO_RESTART_HOURS` (default `0`, disabled) periodically restarts the whole process on a clean shutdown/reconnect cycle to keep the connection fresh, independent of the watchdog. Leave it `0` unless the host runs the bot under a process supervisor (pm2/systemd) that restarts on exit — on a bare panel host, `shutdown()` ends in `process.exit()` and nothing brings the process back up.

**Blank env vars on a hosting panel are safe.** Panels have no way to "unset" a variable — you blank the field, which the process sees as an empty string, not as absent. Every numeric/string config value in `config.js` treats a blank or whitespace-only value as if the variable were never set at all and falls back to its default. (This wasn't always true: a blank `WA_LOG_LEVEL` used to crash the process at boot, and a blank `STALL_TIMEOUT_MS`/`SILENCE_TIMEOUT_MS` used to silently evaluate to `0` and disable the watchdog with no warning — both fixed 2026-08-18.)

**Deaf bot with a healthy-looking console.** Symptom: the bot connects fine, logs "Connected to WhatsApp", the socket never drops — but it never responds to anything. This means the WhatsApp connection is fine but the Signal ratchet desynced, so inbound messages fail to decrypt and are silently dropped.

There are two kinds of ratchet row, and they behave very differently when purged:
- **`session` rows** (pairwise 1:1 chats) are **self-healing**: baileys' own retry receipts re-derive them automatically.
- **`sender-key` rows** (group chats) are **not self-healing**: a participant's client only redistributes its sender key when it believes the recipient device changed. Deleting the row locally does not change this device's identity, so peers keep encrypting with a key the bot no longer holds — every group stays permanently undecryptable until the device is **re-paired** (a new device identity forces redistribution).

**Purging is manual-recovery only — nothing purges automatically.** `500 badSession` disconnects are routine WhatsApp connection rotation on real deployments (observed roughly every ~50 minutes) and the bot recovers fully on the normal reconnect with no purge needed. An earlier version of this bot purged `session` rows automatically on `badSession` and from the stall watchdog; in production this deleted working session keys on a timer and silently deafened the bot (every inbound message failed to decrypt). The stall watchdog now only logs, resets its dispatch clock, and force-reconnects — it never purges.

Both `purgePairwiseSessions()` and the full `purgeAllSignalSessions()` (which also drops `sender-key` rows and breaks group decryption until re-pair) remain available for **manual, operator-initiated** recovery only:
- **No shell access** (e.g. bot-hosting.net/pterodactyl): set `PURGE_SIGNAL_ON_BOOT=true` in the panel's env vars and press Restart. The bot warns in the log, then purges once on the next `connect()` — unset the variable afterward so it doesn't purge on every future boot.
- **Shell access**: stop the bot and run `node scripts/purge-sessions.mjs` (pairwise-only by default, respects `DB_PATH`). Pass `--all` for the destructive full purge — it prints the same warning first.

**Forcing a genuine re-pair on a no-shell host.** Clearing `SESSION_ID` in the panel is *not* enough to force a re-pair: `useSqliteAuthState()` checks `wcg.db` for existing `creds` first, and if it finds any (from a previous pairing), it reuses that identity regardless of what `SESSION_ID` says — an empty `SESSION_ID` just means "don't override the DB." The bot silently comes back up on the same dead device identity, prints no pairing code, and stays broken. Use `RESET_SESSION=true` instead: it wipes `creds` out of the DB itself, before the auth state is even constructed, so the next boot has nothing to reuse and generates a fresh identity. Set it in the panel's env vars, press Restart, watch the log for the pairing code, then unset it.

## Tests

```
npm test
```

Assert-based/`node:test` checks (mostly the former, a couple of files use node's built-in test runner directly), no external framework, no WhatsApp connection needed. Runs the following files in order (the authoritative list is `scripts.test` in `package.json`):

- `lag-monitor.test.js` — event loop lag detection math
- `transport/test.js` — command parsing, admin layers, message filtering
- `transport/render.test.js` — event-to-text rendering
- `transport/router.test.js` — command routing and game lifecycle
- `engine/test.js` — validation and rejection logic
- `engine/game.test.js` — word chain game state machine
- `engine/riddle.test.js` — riddle quest state machine (timer, hint, intermission)
- `transport/outbox.test.js` — send queue and rate limiting
- `transport/lock.test.js` — single-instance guard
- `transport/quiet.test.js` — signal-noise suppression, genuine-decrypt-failure counting
- `transport/wa.test.js` — watchdog decision logic, grace fallback, buffer-flush guard, sender/echo resolution, `shouldIgnoreJid`
- `store/db.test.js` — sqlite schema and queries
- `store/auth.test.js` — sqlite-backed auth state, pairwise/sender-key purge helpers
- `data/build-trivia.test.js` — trivia data normalization and build
- `engine/bank.test.js` — trivia question bank selection, mixed-mode animation cap
- `engine/trivia.test.js` — trivia game state machine
- `engine/tournament.test.js` — tournament bracket state machine, asked-question exclusion
- `data/football/templates.test.js` — football question template generation
- `data/football/fpl.test.js` — Fantasy Premier League data parsing and question generation
- `data/build-football.test.js` — football category rebuild pipeline

## Dictionary

~704k words live, committed under `data/`, built from public-domain sources. No network at runtime. Regenerate with `node data/build.mjs`.

Players grow the dictionary at runtime:
- `data/extra.txt` — manual additions, one per line
- `/addword <w>` — approve a rejected word, stored in sqlite, loaded at boot
- `/pending` — admin-only view of most-rejected words, with `/addword all` for bulk approval

`/delword <w>` removes words added via `/addword` (persisted in `custom_words` table). For base words from `data/words.txt`, the removal only lasts until restart — to remove them permanently, edit `data/extra.txt` or rebuild with `node data/build.mjs`. This is a real gotcha: admins should know that `/delword` on a base word will not stick.

## Database

Everything except the dictionary and trivia bank lives in one SQLite file, `wcg.db` (WAL mode). Tables:

- `games`, `results` — every completed game and its per-player placements, source of the leaderboards
- `rejections` — rejected word chain submissions, feeds `/pending`
- `custom_words` — words approved live via `/addword`
- `settings` — per-group key/value settings
- `bot_admins` — promoted bot admins, per group, survives restarts
- `asked_questions` — tracks which trivia question ids a group has already seen, so a category recycles only once exhausted (also feeds tournament match questions, so a tournament never repeats a group's recent trivia)
- `asked_riddles` — tracks which riddle ids a group has already seen, per-group dedup for `/riddle`
- `trivia_bans` — per-group trivia bans set via `/ban`
- `tournament_wins` — tournament win history, feeds `/tourney stats`
- `tournaments` — persisted bracket state, so an in-progress tournament survives a restart
- `game_activity` — last-activity timestamp per group
- `wa_keys` — WhatsApp/Signal auth credentials and ratchet keys (see Auth above)

## Security

**Both `wcg.db` and `SESSION_ID` are the bot's full WhatsApp account credentials.** Neither is a scoped token — anyone who has either one controls the account. Treat them identically:

- Never commit `wcg.db` or a `.env` with `SESSION_ID` set to git (both are in `.gitignore`)
- Never share either one, never paste them anywhere (including into a chat, an issue, or a support ticket)
- Back up `wcg.db` (or note down `SESSION_ID`) before any host reinstall — it is the only recovery path short of re-pairing from scratch
- Never run two instances against the same install at once; `session/.lock` prevents this to guard against Signal ratchet corruption

The bot handles graceful shutdown via `SIGINT`/`SIGTERM` (with a short delay to let baileys flush pending keys to `wcg.db`) to ensure credentials are saved before exit. Avoid `kill -9` and avoid just closing the terminal window.

If credentials are lost or corrupted, delete `wcg.db` (or clear `SESSION_ID`) and re-pair from scratch (same 8-digit code flow as first run).
