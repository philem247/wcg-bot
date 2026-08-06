# WCG Bot — Standalone WhatsApp Word Chain Game

A WhatsApp word-chain game bot: players take turns submitting words starting with the previous word's last letter, the required word length rises and the clock shrinks as the game goes on, and the last player standing wins. Self-hosted on Node 22+ with no database server or native compilation needed.

## Requirements

- Node 22+ (uses the builtin `node:sqlite`, so there is no native compile step and no build tools needed on the host)
- No database server to install

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your values:
   - `PHONE_NUMBER`: The bot's WhatsApp number (country code + number, digits only, no +)
   - `OWNER`: Your WhatsApp number for full control
   - `ADMINS`: Comma-separated list of global admin numbers (optional)
   - Other variables control logging and the bot's prefix
3. `npm start`

On first run, the bot prints an 8-digit pairing code to the console. Enter that code in WhatsApp under **Linked Devices → Link with phone number**. A `515 restartRequired` disconnect immediately after pairing is normal — wait for the bot to reconnect.

### Deploying to a hosting panel

Configuration works two ways: variables set in the panel, or an uploaded `.env` file. Panel variables take priority and act as overrides.

`session/` and `.env` are gitignored, so they do not arrive via git deploy:
- Upload them over SFTP, or
- Pair fresh on the host using the 8-digit code printed to the panel console

**Critical: only one instance may run against a given `session/` at a time.** If you upload `session/` from your machine, stop the local bot first. Two live instances corrupt each other's Signal ratchets and force a re-pair.

When copying `session/` from another machine, skip any lock files inside it — a stale lock from a different OS can block startup.

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
| `SESSION_DIR` | `session` | Directory for WhatsApp credentials (back this up before reinstalling) |

## Commands

Prefix all commands with `/` (or your custom `PREFIX`):

| Command | Who | Does |
|---------|-----|------|
| `/wcg start` | anyone | start a chain game |
| `/wcg easy\|medium\|hard` | anyone | start a chain game at that difficulty |
| `/wcg end` | starter or admin | stop the current game |
| `/wrg start` | anyone | start a random-letter game |
| `/trivia` | anyone | start a mixed-category trivia game |
| `/trivia <category>` | anyone | start a trivia game in one category |
| `/trivia end` | starter or admin | stop the current trivia game |
| `/trivia categories` | anyone | list playable categories |
| `/stats` | anyone | weekly leaderboard |
| `/trivia stats [all]` | anyone | weekly or all-time trivia leaderboard |
| `/stats all` | anyone | all-time leaderboard |
| `/pending` | admin | most-rejected words in this group |
| `/addword <word>` | admin | approve a rejected word into the dictionary, live |
| `/addword all` | admin | approve the top 10 rejected words at once |
| `/delword <word>` | admin | remove a word |
| `/promote @user` | owner | grant bot-admin rights in this group (persists) |
| `/demote @user` | owner | revoke them |
| `/admin` | anyone | list who can run admin commands here and why |
| `/help` | anyone | show all commands |
| `join` | anyone | join the lobby (bare word, no prefix) |
| `<word>` | current player | submit a word during play (bare word, no prefix) |

Admin layers (checked in order):
1. **OWNER** — full control everywhere
2. **ADMINS** (global) — same power as owner
3. **WhatsApp group admins** — control the bot in their group only
4. **Promoted bot admins** — per-group, granted with `/promote`, stored in the database, survive restarts

Only the OWNER and global ADMINS can run `/promote` and `/demote` — WhatsApp group admins cannot.

## Tests

```
npm test
```

Assert-based test suite with no framework. Runs with no WhatsApp connection needed. 215 tests total across:
- `transport/test.js` — command parsing, admin layers, message filtering
- `transport/render.test.js` — event-to-text rendering
- `transport/router.test.js` — command routing and game lifecycle
- `engine/test.js` — validation and rejection logic
- `engine/game.test.js` — game state machine
- `engine/trivia.test.js` — trivia game state machine
- `engine/bank.test.js` — trivia question bank selection
- `data/build-trivia.test.js` — trivia data normalization and build
- `transport/outbox.test.js` — send queue and rate limiting
- `transport/lock.test.js` — single-instance guard
- `transport/quiet.test.js` — signal-noise suppression
- `transport/auth.test.js` — single-file session state, atomic writes
- `store/db.test.js` — sqlite schema and queries

## Dictionary

~704k words live, committed under `data/`, built from public-domain sources. No network at runtime. Regenerate with `node data/build.mjs`.

Players grow the dictionary at runtime:
- `data/extra.txt` — manual additions, one per line
- `/addword <w>` — approve a rejected word, stored in sqlite, loaded at boot
- `/pending` — admin-only view of most-rejected words, with `/addword all` for bulk approval

`/delword <w>` removes words added via `/addword` (persisted in `custom_words` table). For base words from `data/words.txt`, the removal only lasts until restart — to remove them permanently, edit `data/extra.txt` or rebuild with `node data/build.mjs`. This is a real gotcha: admins should know that `/delword` on a base word will not stick.

## Trivia

Questions live in `data/trivia.json`, committed, no network at runtime. Regenerate with `npm run build:trivia`. Questions are CC BY-SA 4.0 — see `LICENSES.md` for attribution.

### Rebuilding the football category

    npm run build:football

Queries Wikidata and the FPL API and rewrites `categories.football` in
`data/trivia.json`. Leaves every other category alone, so it does not re-fetch
Open Trivia DB.

Re-run it when you want fresher football data. FPL questions are stamped with the
season they describe, so they do not become wrong when a season rolls over — but a
rebuild after a completed season adds that season's questions.

## Security

**`session/` is the bot's full WhatsApp account credentials.** This is not a scoped token — anyone who has it controls the account.

- Never commit `session/` to git (it's in `.gitignore`)
- Never share it, never paste it anywhere
- Back it up over SFTP before any host reinstall — it is the only recovery path
- Never run two instances against the same `session/` directory; a lock file inside `session/` prevents this to guard against Signal ratchet corruption
- Session writes are atomic (temp file + rename), and an unreadable `creds.json` is preserved as `creds.json.corrupt-<timestamp>` rather than silently discarded

The bot handles graceful shutdown via `SIGINT`/`SIGTERM` to ensure credentials are flushed before exit. Avoid `kill -9` and avoid just closing the terminal window.

If `session/` is lost or corrupted, delete it and re-pair from scratch (same 8-digit code flow as first run).
