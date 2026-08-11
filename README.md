# WCG Bot — WhatsApp Multiplayer Game Bot

A self-hosted WhatsApp bot for group game nights: Word Chain, Trivia, Word Scramble, Logo Quiz, and head-to-head Trivia Tournaments, all running out of one Node process against a single group chat's messages. No database server, no native build step — everything lives in one SQLite file.

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
| `AUTO_RESTART_HOURS` | `6` | Periodically restart the whole process (clean reconnect) after this many hours. `0` disables it |

## Game modes

| Mode | Rounds/shape | Scoring |
|------|--------------|---------|
| **Word Chain** | Players take turns submitting words starting with the previous word's last letter; required length rises and the clock shrinks as the game goes on. Last player standing wins. `/wrg` is the random-letter variant. | Elimination |
| **Trivia** | Multiple-choice questions drawn from `data/trivia.json`, mixed or single-category, no lobby (answering is joining). | Points per correct answer, weekly and all-time leaderboards |
| **Scramble** | 10 rounds, 15s clock per word, 10s gap between rounds. The bot scrambles a dictionary word (4–7 letters); players race to unscramble it. | Race — first correct answer per round wins the point |
| **Logo Quiz** | 10 rounds, 20s clock, 10s gap. The bot posts a brand-logo image from `data/logos/`; players race to name the brand. Answer matching strips spaces/punctuation to be forgiving. | Race — first correct answer per round wins the point |
| **Tournament** | Head-to-head single-elimination trivia bracket, byes for non-power-of-two entrant counts. `TOURNAMENT_CLOCK_SECONDS = 10` per question (tighter than group trivia's 30s clock, to discourage searching an answer up mid-match), `MATCH_START_DELAY_MS = 4000` pause before each match's first question, `REGISTRATION_MS = 120000` (2 min) open registration window. An admin drives every round with `/tourney next`. | Race scoring within each match (first correct answer wins the question); a tied match goes to sudden death |

Starting any game (Word Chain, Trivia, Scramble, Logo Quiz, or a Tournament) requires a bot admin, group admin, owner, or global admin — this is enforced the same way for every mode.

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

Questions live in `data/trivia.json`, committed, no network at runtime. Current bank: **30 categories, 23,860 questions total** (from `engine/bank.js`'s `CATEGORIES`, counts via `node data/check_sizes.mjs`):

| Category | Questions | Category | Questions |
|----------|-----------|----------|-----------|
| general | 618 | web3 | 400 |
| football | 1,548 | bible | 624 |
| fpl | 4,255 | music | 769 |
| sports | 523 | food | 630 |
| science | 744 | got | 1,195 |
| tech | 682 | naruto | 1,039 |
| movies | 730 | health | 550 |
| tv-shows | 537 | tech-gadgets | 570 |
| geography | 821 | nigerian-music | 506 |
| history | 808 | nigerian-entertainment | 502 |
| anime | 622 | nigerian-history | 532 |
| animals | 524 | nigerian-food | 539 |
| videogames | 580 | pidgin-english | 768 |
| cartoons | 523 | | |
| art | 661 | | |
| mythology | 560 | | |
| vehicles | 500 | | |

Regenerate the full bank with `npm run build`, a multi-stage pipeline (`build-apis` → `build-wikidata` → `build-pidgin` → `build-bible` → `build-mega` → `build-mega-2` → `build-mega-3` → `build-got` → `build-anime` → `build-naruto` → `build-final`). Two targeted rebuild scripts also exist for refreshing a slice of the bank without re-running the whole pipeline:

    npm run build:football   # rewrites categories.football and categories.fpl only
    npm run build:world      # rewrites a broader set of world/general categories

Questions are CC BY-SA 4.0 — see `LICENSES.md` for attribution.

## Reliability / connection handling

Long-running self-hosted WhatsApp bots occasionally hit a connection that looks alive but has silently stopped delivering messages, or a full event-loop freeze. `transport/wa.js` and the diagnostics below exist to detect and recover from both without operator intervention — but if you're debugging a freeze, here's what to grep your console log for.

**Stall watchdog** (`STALL_TIMEOUT_MS`, default 3 minutes): baileys' own keepalive only proves the websocket is alive, not that inbound messages are still being delivered over it. Every 30 seconds the bot checks whether a message has actually dispatched recently. It force-reconnects when either:
- a game is running (traffic is expected) and nothing has dispatched within the timeout, or
- messages are visibly arriving but nothing is being dispatched (catches an idle-bot hang with no game running, without ever tripping against a genuinely quiet group).

Watch for `Stall watchdog: no message dispatched in ...` in the log. Set `STALL_TIMEOUT_MS=0` to disable it.

**Grace-timer hard fallback** (`GRACE_TIMEOUT_MS = 10_000`, not configurable): when the watchdog calls `sock.end()`, it expects baileys to emit a `close` event that drives the reconnect. That event is not guaranteed to fire on a zombied/already-half-closed websocket. If no new connect cycle has started within 10 seconds, the bot forcefully terminates the raw websocket itself and reconnects directly rather than waiting on an event that may never come. Watch for `Stall watchdog: no close event within grace window — forcing hard socket teardown and reconnect`.

**Diagnostic logging** (always on, no config): these lines exist purely to help track down event-loop-blocking freezes and are safe to ignore in normal operation.
- `EVENT LOOP LAG: <ms>` (from `lag-monitor.js`) — a scheduled timer fired late by more than 500ms, proving something blocked the event loop synchronously for that long.
- `SLOW: db.<label> took <ms>ms` (from `store/db.js`) and `SLOW: auth.readKey/writeKey(<category>) took <ms>ms` (from `store/auth.js`) — a single SQLite call took over 100ms. `node:sqlite` is fully synchronous, so a slow call here blocks the whole process for its duration; these calls run on every game action and every inbound/outbound message respectively.
- `inbound 5m: total=... byType=... noPayload=... echo=... dispatched=... connected=... upSec=...` (every 5 minutes, only while traffic is arriving) — a summary of inbound WhatsApp traffic. A run of `noPayload` is the signature of a Signal ratchet problem; `byType` separates live traffic (`notify`) from backfill (`append`).

`AUTO_RESTART_HOURS` (default 6, `0` disables) periodically restarts the whole process on a clean shutdown/reconnect cycle to keep the connection fresh, independent of the watchdog.

## Tests

```
npm test
```

364 assert-based/`node:test` checks, no external framework, no WhatsApp connection needed. Runs the following files in order (the authoritative list is `scripts.test` in `package.json`):

- `lag-monitor.test.js` — event loop lag detection math
- `transport/test.js` — command parsing, admin layers, message filtering
- `transport/render.test.js` — event-to-text rendering
- `transport/router.test.js` — command routing and game lifecycle
- `engine/test.js` — validation and rejection logic
- `engine/game.test.js` — word chain game state machine
- `transport/outbox.test.js` — send queue and rate limiting
- `transport/lock.test.js` — single-instance guard
- `transport/quiet.test.js` — signal-noise suppression
- `transport/wa.test.js` — watchdog decision logic, grace fallback, sender/echo resolution
- `store/db.test.js` — sqlite schema and queries
- `data/build-trivia.test.js` — trivia data normalization and build
- `engine/bank.test.js` — trivia question bank selection
- `engine/trivia.test.js` — trivia game state machine
- `engine/tournament.test.js` — tournament bracket state machine
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
- `asked_questions` — tracks which trivia question ids a group has already seen, so a category recycles only once exhausted
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
