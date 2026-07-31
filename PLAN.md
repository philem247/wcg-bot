# WCG Bot — Standalone WhatsApp Word Chain Game

Rewrite of levanter's `wcg`/`wrg` (lib/class/Wcg.js — obfuscated upstream). Behavior spec
reverse-engineered from `plugins/wcg.js` call signature + `lang/en.json` strings.

## Scope
WhatsApp only. Single process, self-hosted on bot-hosting.net (Node egg).
Engine layer stays I/O-free anyway — porting later is cheap, but nothing is built for it now.

## Original mechanics (target parity)
- `wcg start|easy|medium|hard|end`, `wrg …` — chain mode and random-word mode, one engine.
  (`en.json` exposes only easy/hard; medium sat in the obfuscated blob. All three supported.)
  Ours prefixes every command with `/` — see "Commands".
- Lobby: 60s join window, type `join`, need >= 2 players, countdown + join count, terminate if < 2.
- Turn broadcast: current @, next @, required starting letter, min length, players left/total,
  seconds to reply, total words.
- Reject reasons: already used / wrong starting letter / below min length / not in dictionary.
- Min length and turn clock both ramp during the game; min length is a floor, longer always legal.
- Timeout = instant elimination. Last standing wins.
- Win message: total words, longest word + author, elapsed time.

## Stack
- Node 22+ (uses builtin `node:sqlite` — no native compile, no build tools on the host)
- `baileys` — WhatsApp transport
- `pino` — logs
- Dictionary: local files loaded into one `Set` at boot — 703,769 words, 47 MB heap measured.
  O(1) validation, zero network on the hot path. See "Dictionary" below.
- Command prefix `/` — one constant in `config.js`.

No framework, no ORM, no Redis.

## The three scale decisions
1. **One global 1s tick** over `Map<jid, Game>` — not one `setTimeout` per turn.
   500 concurrent games = 1 timer. No drift, no leaks.
2. **O(1) inbound routing** — one `Map.get(jid)`; non-game groups cost nothing.
3. **Outbound queue + per-chat pacing + global rate limit.** WhatsApp bans on send rate — this is
   the real ceiling, not CPU. Stale turn prompts are coalesced so a backed-up chat never sends a
   turn message that is already superseded.
   An earlier draft said to *edit* one pinned turn message instead of sending a new one each turn.
   **Rejected:** an edit does not re-notify, and the `@mention` ping is how a player learns it is
   their turn. That would have saved send quota by breaking the core loop.

## Layout
```
index.js               boot: lock -> dict -> socket -> tick -> outbox; graceful shutdown
config.js              env only
engine/game.js         lobby -> turns -> win state machine (no I/O)
engine/validate.js     chain / length / used / dictionary
engine/modes.js        shared ramp steps + per-mode entry points, as data
engine/dictionary.js   Set + per-letter index for random prompts
engine/test.js         assert-based self-check, runs with no WhatsApp connection
transport/wa.js        baileys socket, pairing code, inbound handler, safe shutdown
transport/outbox.js    send queue, per-chat pacing, global rate limit, stale-turn coalescing
transport/lock.js      single-instance guard over session/ (stops session corruption)
store/db.js            node:sqlite schema + queries — leaderboard, rejection log
wcg.db                 sqlite database (project root by default, overridable via `DB_PATH` env var)
data/words.txt         base dictionary (393k)
data/common.txt        optional shallow pool (9k), off by default
data/lang/*.txt        10 language lists, all on by default
data/extra.txt         your manual additions
data/build.mjs         regenerates all of the above from source
session/               baileys auth state (gitignored)
```

## Dictionary
Built and in-repo already, 12 files, 7.9 MB on disk, 703,769 unique words live. All public domain, no network at
runtime, no license risk. Regenerate any time with `node data/build.mjs`.

| File | Words | Source | Use |
|---|---|---|---|
| `data/words.txt` | 393,532 | `words_alpha` ∪ ENABLE1 | default — deep, obscure, very long words |
| `data/common.txt` | 8,934 | words ∩ google-10k-english | optional `/pool common` — off by default |
| `data/lang/*.txt` | 39-48k each | OpenSubtitles frequency lists | on by default, `/lang remove` to drop |
| `data/extra.txt` | seeded | you | manual additions, `#` = comment |

**These files are not one pile to merge — they have different roles.** What is actually live:

| File | Loaded by default | Role |
|---|---|---|
| `words.txt` | **yes** | the pool. Every word in it is legal |
| `extra.txt` | **yes** | additive, merged at boot |
| `custom_words` (sqlite) | **yes** | additive, `/addword` |
| `lang/*.txt` (all 10) | **yes** | additive |
| `common.txt` | no | **subset** of `words.txt` — restricts, cannot add |

**Default active pool = 703,769 words** in one `Set`, one `has()` per submission.

`common.txt` was built by filtering `words.txt`, so it is a strict subset and can never add a word.
`/pool common` *shrinks* the legal pool to 9k for groups that want shallow vocabulary. It is a
restrictor, not a dictionary.

Languages shipped: `es fr de it pt nl pl ro tr id`, all on. `/lang remove es` per group for anyone
who wants English-only; disabled lists are skipped at boot.

**Measured cost of having them all on** (`node --expose-gc`, real numbers, not estimates):

| Pool | Words | Heap |
|---|---|---|
| English only | 393,536 | 29.3 MB |
| + all 10 languages | 703,769 | 47.0 MB (**+17.7 MB**) |

461k raw language lines collapse to 310k new words — heavy overlap with English. 1M lookups take
27 ms (27 ns each), identical either way: it is one `Set.has()` regardless of pool size. Process RSS
with everything loaded is 100 MB; Baileys adds 150-300 MB on top, so ~400 MB against a 2 GB plan.
Not a constraint.
<!-- ponytail: plain Set of strings; a trie or bloom prefilter only if RSS actually hurts -->

**Languages-on is not what prevents "my word was legal!" complaints.** Worth being blunt about:
those complaints come from missing *English* — slang, Nigerian English (`wahala`, `abeg`), new
coinages, niche inflections. A Spanish list adds none of that, and it invites the mirror complaint
(someone plays `los`, it is accepted, purists object). The fix is the feedback loop below.

## Rejection feedback loop — the actual answer to "that was a real word"
No fixed word list ever satisfies a live group. So the list learns from the group instead:

1. Every `not_in_list` rejection is logged — word, player, group, timestamp.
2. `/pending` shows admins the most-rejected words in their group, commonest first.
3. `/addword <w>` approves one into `custom_words`, live, no restart. `/addword all` takes the top
   of the list in one go.
4. Approved words persist in sqlite and reload at boot. A group's own vocabulary gets absorbed
   within days of play.

That converges on what your players actually type, which no shipped dictionary can do. It also
turns a complaint into a one-word admin action instead of an argument.

Two cheap additions in the same spirit:
- Rejection message names the reason and nothing else — `_This word is not in my list_`.
  An earlier draft appended an "an admin can add it with /addword" hint; playtesting showed the
  bot was already talking too much, so the hint was cut. `/pending` is where admins find the
  rejected words instead.
- **No penalty for a rejected word.** The player's clock keeps running and they may submit again
  until it expires. A wrong guess costs time, never the turn. Removes the sting that drives most
  complaints in the first place.

**Obscure and long: covered.** Longest entries run 31 characters
(`dichlorodiphenyltrichloroethane`); `zyzzyva`, `syzygy`, `xylopyrography`, `quokka` all
validate. The four famous monsters `words_alpha` omits (`floccinaucinihilipilification`,
`pneumonoultramicroscopic…`, etc.) are seeded into `extra.txt` as a worked example.

Filter applied everywhere: fold diacritics (`café` → `cafe`, `ß` → `ss`), lowercase,
`^[a-z]{3,}$`, sort, dedupe. Keeps the a-z chain rule intact across languages — that folding is
what makes mixed-language play work at all, and it is why non-Latin scripts (Arabic, Cyrillic,
CJK) are out of scope: no shared letter alphabet, no chain.

**Not found in that source: Yoruba, Hausa, Igbo, Swahili, Pidgin.** No public-domain frequency
list exists in `FrequencyWords` for them. Path if you want them: drop a list into
`data/lang/yo.txt` in the same one-word-per-line format — the loader needs no change.

**Extending it — three paths, all end up in the same `Set`:**
1. `data/extra.txt` — paste over SFTP, restart. For bulk.
2. `/addword <w>` / `/delword <w>` (admin) — `custom_words` table in sqlite, applied immediately
   *and* reloaded at boot. For one-offs mid-game.
3. New language file in `data/lang/`, or point `config.js` at a different base file.

**One pool, all modes.** Difficulty never changes which words are legal — only the length floor and
the clock (see "Difficulty ramp"). `common.txt` is a separate opt-in *pool* switch
(`/pool common`) for groups that want a shallow-vocabulary game, and it is **off by default**.
Pool and difficulty are independent knobs; do not couple them.

**Memory:** English base ≈ 45 MB heap as a `Set`. Every enabled language adds ~5 MB. All 10 on
≈ 95 MB — still fine inside 2 GB, but it is the one number to watch on a smaller plan.
<!-- ponytail: plain Set of strings; swap for a trie or bloom prefilter only if RSS actually hurts -->

`data/build.mjs` is the provenance: it re-downloads sources, folds, filters, and rewrites every
file. No hand-edited data, nothing to trust blindly.

## Admins — three layers
Checked in this order by `transport/admin.js`:

1. **OWNER** (`.env`) — full control everywhere, every group. One number.
2. **ADMINS** (`.env`, comma-separated) — global bot admins, same power as owner in practice.
   Invalid entries throw at boot, not at command time.
3. **WhatsApp group admins** — anyone who is an admin *of that group* controls the bot *in that
   group*. No configuration at all: promote someone in WhatsApp and they can run `/wcg hard`,
   `/addword`, `/pending` there. This is the layer you will actually use day to day.

Layer 3 is why the bot needs no admin database. Group ownership already lives in WhatsApp; copying
it into sqlite would just be a second copy to keep in sync.

`@lid` JIDs are a separate identifier namespace from phone numbers, so OWNER/ADMINS matching is
restricted to phone-form JIDs. Group-admin matching works in either namespace since both sides come
from the same source.

## Session — no session ID, deliberately
Levanter's flow (visit a site, scan a QR, get a `SESSION_ID` string in WhatsApp) means a
third-party server generated and held full credentials for the account. That string is not a
scoped token — it is the whole auth state.

Ours pairs locally: baileys prints an 8-digit code, you enter it in WhatsApp → Linked Devices →
Link with phone number, credentials land in `session/` on your own host. Nothing leaves the
machine.

**`session/` is the session.** Back it up over SFTP before any panel reinstall. It is gitignored
and must never be committed or shared.

## Session integrity
`session/` is not a login token you can reissue — it holds the live Signal protocol ratchet
state for every chat the bot has ever exchanged messages in. Each message advances that state.
Lose or corrupt it for a peer and there is no "log back in" fix, because the keys needed to
decrypt that peer's next message no longer exist anywhere.

**`Bad MAC` / `Failed to decrypt message with any known session`** — you'll see this in the logs
sometimes. Two very different situations produce the same line:

- **Benign, self-healing:** messages sent to a group or DM while the bot was offline. The sender's
  client and the bot's ratchet fall out of step by a few messages; baileys sends a retry receipt,
  the other side resends under fresh keys, and it resolves within a message or two. Expect to see
  this after every restart and not think about it again.
- **Corruption, permanent:** the *same* peer fails to decrypt across multiple restarts, not just
  once. That means the ratchet state on disk for that peer is actually broken, not just behind.
  There is no retry that fixes it — the keys are gone.

**Two causes used to make the corruption kind possible; both are now fixed:**
1. Hard-killing the process (`kill -9`, closing the terminal, a host reboot) mid-write. Baileys
   persists credential/key updates via `useMultiFileAuthState` asynchronously; killing the process
   between "write started" and "write flushed" leaves a truncated key file on disk, which is
   unrecoverable. `index.js` now handles `SIGINT`/`SIGTERM` gracefully (see below) and waits for
   in-flight writes to settle before exiting.
2. Two instances pointed at the same `session/` at once, each advancing the ratchets independently
   and stepping on each other's state. `transport/lock.js` now refuses to let a second instance
   start against a `session/` another live process holds (see boot order in `index.js`).

**Stopping the bot:** use Ctrl+C (`SIGINT`) or a normal `SIGTERM` — the shutdown handler in
`index.js` stops the scheduler and outbox, closes the WhatsApp socket cleanly (`wa.js`'s
`shutdown()`, which never calls `logout()`), gives credential writes a moment to finish, then
releases the lock and exits. Avoid `kill -9` and avoid just closing the terminal window; neither
gives that handler a chance to run.

**If it does get corrupted anyway:** there is no repair. Delete `session/` and re-pair from
scratch (see "Session — no session ID, deliberately" above for the pairing flow). Back up
`session/` first as described there — that backup is your only recovery path for a host
reinstall, not for decrypt corruption itself (a backup taken *after* corruption is just as broken).

## Commands
**Prefix is `/`** — `PREFIX` in `config.js`, single place, change it once and every command follows.

| Command | Who | Does |
|---|---|---|
| `/wcg start` / `/wcg end` | anyone / starter+admin | start or stop a chain game |
| `/wcg easy\|medium\|hard` | anyone | start a chain game at that difficulty |
| `/wrg start` | anyone | random-word game |
| `/pool full\|common` | admin | full 704k pool, or the shallow 9k list |
| `/lang add\|remove <code>` | admin | toggle a language list for the group |
| `/lang` | anyone | what pools and languages are live right now |
| `/pending` | admin | most-rejected words in this group |
| `/addword <w>` / `/addword all` | admin | approve rejected words into the dictionary, live |
| `/delword <w>` | admin | remove a word |
| `/stats` / `/stats all` | anyone | weekly board / all-time board |
| `/suspect @user` | admin | that player's timing + rarity numbers vs the group median |
| `/admin` | anyone | who can run admin commands here, and why |
| `/help` | anyone | the list above |

"admin" above means any of the three layers in "Admins".

**Not prefixed, deliberately:** `join` during the lobby, and word submissions during play. Both are
bare words — the original works this way and prefixing a gameplay move would wreck the pace.

Non-prefixed, non-game messages in a game group cost one `Map.get(jid)` and return. See scale
decision 2.

## Difficulty ramp — the core loop (parity with the original)
Confirmed against `lang/en.json`: `turn_info` carries a per-turn `(at least {N} letters)` and a
per-turn `You have {S} seconds`, and the reject string is `_This word is below {N} length_`. Both
knobs ramp during a game in the original, and min length is a **floor**.

**One dictionary pool, always.** No word is ever gated by mode or turn. A 14-letter word is legal
when the floor is 3. The floor only ever says *"at least"*. `common.txt` is not part of this — see
Dictionary.

**One ramp, shared by every mode. Mode only chooses where you enter it.**

Step rule, identical in all modes — on separate cadences:
```
min length  +1 every 1 round,   until 13 letters   <- cap: ramp stops climbing here
turn clock  -3s every 2 rounds, until 20s          <- floor: ramp stops descending here
```

Mode = the entry point on that same ramp:

| Mode | starts at | min length reaches 13 | clock reaches 20s |
|---|---|---|---|
| `easy` (default) | 3 letters, 40s | round 10 | round 14 |
| `medium` | 4 letters, 35s | round 9 | round 10 |
| `hard` | 5 letters, 30s | round 8 | round 8 |

**So an easy game genuinely turns hard.** Round 0 it is 3 letters, 40s. Round 2 it is 5 letters, 40s —
past where `medium` began. Round 4 it is 7 letters, 37s — past where `hard` began. Round 10 it reaches
13 letters, then the clock continues to descend until round 14 when both are clamped. Every game, whatever
it started as, converges on 13 letters and a 20-second clock if anyone survives that long. `easy` is a
gentler *opening*, never a permanently gentler game.

**On the limits:**
- **Cap 13 letters** — the point where the length ramp stops climbing. Words that long
  exist in bulk (base list runs to 31 characters), but a game ends well before this in practice.
  It is a safety rail so the floor cannot walk off to an unreasonable height in a marathon game, not a target.
- **Clock floor 20s** — the original's clock did shrink, but at an unknown rate (its engine is obfuscated).
  Our clock descends 3s every 2 rounds until 20s. This keeps time pressure on late-game while avoiding
  the punishing 15s floor that frustrated players in earlier tests. The endgame still accelerates
  from eliminations shrinking player count and rounds getting shorter in real time.

`/wcg easy|medium|hard` starts a game at that difficulty; there is no stored group default. `/wcg start` uses `DEFAULT_MODE` ('easy', matching upstream's "Default mode is easy"). A mode argument applies only to that single game. Mid-game switching is not allowed — it would rewrite the ramp under live players. Six constants total (`+1` per round, `-3s` every 2 rounds, `13` cap, `20` floor) plus one start pair per mode, all in `engine/modes.js` as plain data. Tuning is one edit, no code change.

**Where these numbers come from.** The original bot's engine was obfuscated, so its real constants
are unknown. The **length ramp** is confirmed by screenshots of the original in play with 4 players:
at 10-11 total words the required length was 5 letters and at ~35 words it was 13 letters, matching
a `+1 every round` rule with the observed starting lengths. The winning game had 36 words and finished in 07:19.
The **clock ramp** — confirmed that the original's clock *did* shrink (contradicting earlier testing) — its exact
rate is unknowable. Our clock numbers (40s/35s/30s starting, -3s every 2 rounds, floor 20s) are a
judgement call tuned to maintain challenge without the punishing sub-15s time pressure that earlier tests showed players objected to.

**Ramp unit is the round (every surviving player has had one turn), not the word.** Ramping per
word breaks at scale: with 20 players, "+1 every 7 words" hits floor 12 before everyone has played
three times. Per round it feels identical at 3 players and stays sane at 20.

**The endgame accelerates for free.** Eliminations shrink the player count, so rounds get shorter
in real time, so the ramp arrives faster. 12 players trading 4-letter words on a 40s clock becomes
2 players trading 8-letter words on a 40s clock (same clock, higher length floor), and nothing
special-cases that — it falls out of counting rounds. Once the length cap is reached the game is
pure attrition with a fixed length requirement and plays until one player remains.

**No separate ramp announcement.** The `ramp` event exists in the engine but renders to nothing.
Every turn message already carries `(at least N letters)` and `You have *S* seconds`, so a second
message saying the same thing is noise — and playtest feedback was specifically that the bot talked
too much. Upstream never announced it either.

## Better than the original — revised for fairness
Dropped from the earlier draft: **3 lives**, **speed bonus**, **streak combos**. Reasoning:
lives never protect the weak player (a strong player never spends one), and speed bonus +
streaks are pure dominance amplifiers — they pay the player who was already winning. The real
problem is skill-gap compounding: one strong player wins every game, farms the leaderboard, and
casual players get knocked out in 20 seconds and stop playing.

**Fairness comes from the global ramp, not from handicaps.** Everyone at the table faces the same
rising bar — that pressure *is* the game, and it is what eventually beats the shark too. See
"Difficulty ramp" above. Per-player handicapping was considered and rejected: it punishes the
player who is playing well, which is not the same thing as fixing leaderboard farming.

**Hard-letter cap — considered and removed.** The idea was to reject repeated hard letters
(`j q v x z`) to stop griefing. Removed because it rejected legitimate complex words, confused
players, ate their clock with edge cases, was over-engineered, and did not exist in the original bot.

**Elimination stays instant** — knockout tension *is* the game. What keeps eliminated players
around is short rounds + auto-enrolment in the next lobby, not extra lives. Per-group
`/lives on|off` toggle for groups that want the softer game (one config value, default off).

**Scoring, revised.** In-game points = `word length + rare-letter bonus`, weighted by your
current personal difficulty tier (a 9-letter word at tier 9 beats the same word at tier 4).
Leaderboard does **not** rank by word points — it ranks **wins + survival placement**, and caps
per-game contribution. Per game a player earns `min(player_count - placement, 3)` survival points
plus `3` more for a win — a single game contributes at most 6 points. Games ended early (`/wcg end`)
or terminated for too few players record nothing. The cap stops the marathon-farmer from owning the week.

**Leaderboards.** Weekly board is the headline and resets. All-time hidden behind `/stats all`.

**Solver detection — no automatic penalty. Report-only, and off by default.**

The earlier draft (auto-void anything faster than `250ms + 60ms/char`) is cut. It punishes honest
players:
- **Pre-typing.** Players type a candidate word *while waiting* for their turn and send the moment
  it arrives. Legitimate, common, and by timing alone identical to pasting from a solver.
- **Fast typists.** 100 WPM is ~8 chars/sec. A quick player on a good phone lands inside the
  threshold without cheating.
- **Clock noise.** WhatsApp receipt timestamps are not a trustworthy stopwatch; jitter alone can
  make a normal reply look instant.

A false accusation costs more than an undetected cheater. So the bot never accuses and never voids
a valid word. Instead, `/suspect @user` (admin, opt-in) prints that player's numbers — median reply
time, share of replies under 1s, share of words outside the common 9k, longest words played — next
to the group median. Humans read it and decide. No thresholds, no bans, no silent voids.

What *does* run always, because it is deterministic and cannot misfire on a fast typist: used-word
set, wrong-player drop, per-player flood cooldown. Those catch rule-breaking, not
suspected intent.
<!-- ponytail: stats + human judgement instead of a classifier; revisit only if solver use is actually observed -->

**Unchanged from the draft:**
- **Crash recovery**: snapshot active game row on every valid move; restart resumes mid-game.
- **Extra game types** (the length ramp and shrinking clock are core now, not bonus modes):
  chain, random-letter, banned-letter, category.
- **Anti-cheat**: only the correct player's first valid word counts, wrong-player words dropped
  silently, per-player flood cooldown, dictionary-dump detection.
- **Mid-game join** queues for next round.

## Phases (one sub-agent per phase, tested before the next)
| # | Phase | Model |
|---|-------|-------|
| 1 | ~~Skeleton + config + baileys connect + pairing code~~ **done** — +admin layer, 24 tests | haiku |
| 2 | ~~Dictionary loader + validator + assert tests~~ **done** — 704k words, 28 tests | haiku |
| 3 | ~~Game engine + tick scheduler + round-based ramp~~ **done** — 15 tests, fully deterministic | sonnet |
| 4 | ~~Transport: inbound router + outbox rate limiter~~ **done** — per-chat FIFO queue, per-chat pacing, global rate limit, stale-turn coalescing (`transport/outbox.js`, 9 tests); plus session-integrity: single-instance lock (`transport/lock.js`, 5 tests) and graceful `SIGINT`/`SIGTERM` shutdown in `index.js`. Turn-message **editing** (the original phase-4 plan) was deliberately rejected instead of implemented: an edited message does not re-notify, and the `@mention` ping on a fresh message is how a player actually learns it's their turn — editing in place would silently break that. | sonnet |
| 5 | ~~node:sqlite store: stats, leaderboard, snapshot recovery~~ **done** — 4 tables (`games`, `results`, `rejections`, `custom_words`); rejection feedback loop live (`/pending`, `/addword`, `/delword`); `/stats` weekly and all-time leaderboards; 153 tests. **Snapshot recovery dropped** — engine keeps state in closure; resuming mid-game would mean adding `serialize()`/`restore()` and syncing every state variable in two places forever, in exchange for saving a single ~2-minute game after a crash. Bad trade; revisit only if crashes become common. | haiku |
| 6 | ~~Extra modes, scoring polish, i18n strings~~ **done** — `/lives on|off` (per-group toggle, 3 lives when on, persisted in `settings` table, defaults off) and `/admin` (lists the three admin layers for the current chat); 161 tests. Cut: banned-letter mode (unnecessary; constant deleted), category mode (no category lists in `data/`), in-game word scoring (contradicts "bot talks too much" feedback; leaderboard scoring already shipped in Phase 5), i18n string extraction (strings already live in `transport/render.js`, lookup layer adds no benefit until second language exists). `/pool`, `/lang`, `/suspect` deferred as planned. | haiku |

Phase 3 must pass with no WhatsApp connection. That is the point of the split.

## Host config notes (bot-hosting.net)
- Node 22+ egg required for `node:sqlite`.
- Pair with `requestPairingCode` via panel console — no QR scanning in a web terminal.
- Back up `session/` before any panel reinstall; reinstall wipes the container.
- Disable baileys full message store; cap group metadata cache. That store is the memory hog,
  not the game.

## Deliberately skipped
Redis, Docker/k8s, web dashboard, multi-platform, multi-session. Add when a second process
or a second phone number actually exists.
