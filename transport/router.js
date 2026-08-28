// Group-only game commands routed to the engine. No transport connection here.
import { parseCommand } from './commands.js'
import { render } from './render.js'
import { isAdmin, isAdminEither, toNumber } from './admin.js'
import { createGame } from '../engine/game.js'
import { createTriviaGame, QUESTION_COUNT, parseAnswer } from '../engine/trivia.js'
import { createScrambleGame, SCRAMBLE_COUNT } from '../engine/scramble.js'
import { createLogoGame, LOGO_COUNT } from '../engine/logo.js'
import { createFlagGame, FLAG_COUNT, CLOCK_SECONDS as FLAG_CLOCK_SECONDS } from '../engine/flag.js'
import { createRiddleGame, RIDDLE_COUNT } from '../engine/riddle.js'
import { loadRiddleBank, loadFlagBank, loadWordleBank } from '../engine/bank.js'
import { createTournament } from '../engine/tournament.js'
import { createWordleTournament } from '../engine/wordleTournament.js'
import { fold, isWord } from '../engine/normalize.js'
import { startOfWeek } from '../store/db.js'
import { PREFIX, OWNER, ADMINS, TRACE_LOG } from '../config.js'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Cache 4-7 letter English common words exclusively for Scramble games.
// This avoids foreign languages, proper nouns from the trivia bank, and
// obscure words from the massive scrabble dictionary.
let scramblePool = null
try {
  scramblePool = readFileSync(join('data', 'common.txt'), 'utf8')
    .split('\n')
    .map(w => w.trim())
    .filter(w => /^[a-z]{4,7}$/.test(w))
} catch (e) {
  // If words.txt doesn't exist or fails, it will remain null
}

const MODE_NAMES = new Set(['easy', 'medium', 'hard'])

// Commands a banned player cannot use. Keep every playable mode listed here —
// a mode missing from this set is a mode a banned player can still start.
const GAME_COMMANDS = new Set([
  'wcg', 'wrg', 'trivia', 'scramble', 'logo', 'flag', 'riddle', 'tourney', 'wordle',
])

// rejected events (engine/game.js) don't carry the required letter/minLength, only
// the most recent `turn` event does. sendEvents is the single funnel both router.js
// (submit) and index.js's scheduler (timeouts) push turn events through, so caching
// the latest one here per jid keeps a later rejected render correct regardless of
// which path produced the turn that set it.
const lastTurn = new Map() // jid -> { letter, minLength }

// Tracks the in-progress game per jid so a `winner`/`terminated`/`ended` event (which
// carries no mode/type/startedAt/roster) can still be turned into a store record.
// Built up incrementally as lobby_open -> game_start -> eliminated* -> winner events
// pass through sendEvents (across separate calls - one per tick/submit).
const gameMeta = new Map() // jid -> { mode, type, startedAt, players, eliminated, pnMap }

// When each chat's last trivia game ended, so a new one cannot start immediately.
// Module-level beside gameMeta because trivia_over arrives through sendEvents,
// which is module-level too.
const lastTriviaEnd = new Map() // jid -> ts
export const TRIVIA_COOLDOWN_MS = 2 * 60 * 1000

// The "bot restarted" orphan notice (see createRouter's handleMessage) must only
// fire in a chat that was actually mid-game recently — otherwise a bare "4" typed
// in any random group the bot sits in triggers an unsolicited reply. Gated on
// db.lastGameActivity(jid), recorded whenever any game (wcg/trivia/tournament)
// starts. ORPHAN_NOTICE_MS (below, per-jid cooldown once the gate has passed) is
// unrelated and unchanged.
export const ORPHAN_GATE_MS = 30 * 60 * 1000

// Per-jid cooldown on the notice itself, once ORPHAN_GATE_MS says it's allowed —
// unchanged from before, just hoisted next to ORPHAN_GATE_MS.
export const ORPHAN_NOTICE_MS = 5 * 60 * 1000

// Event type -> outbox kind (transport/outbox.js). Anything not listed here
// (command replies, permission refusals) is enqueued directly as 'misc'.
const KIND_BY_EVENT = {
  turn: 'turn',
  lobby_open: 'lobby',
  lobby_reminder: 'lobby',
  joined: 'lobby',
  queued: 'lobby',
  rejected: 'reject',
  winner: 'result',
  eliminated: 'result',
  terminated: 'result',
  ended: 'result',
  scramble_word: 'turn',
  scramble_answer: 'result',
  scramble_over: 'result',
  logo_word: 'turn',
  logo_answer: 'result',
  logo_over: 'result',
  flag_word: 'turn',
  flag_answer: 'result',
  flag_over: 'result',
  riddle_start: 'turn',
  riddle_solved: 'result',
  riddle_timeout: 'result',
  riddle_game_over: 'result',
  riddle_terminated: 'result',
}

// Ordering (ramp->turn, accepted->turn, eliminated->winner, ...) carries meaning,
// but that guarantee now lives in the outbox's per-chat FIFO, not here — this just
// enqueues in emission order. Exported so index.js's scheduler wiring can reuse it.
//
// `quoted` is the raw inbound WhatsApp message to reply-quote when an event renders
// with `quote: true` (currently only `rejected`), and to react to when an event is
// `accepted` (the original bot's ✅ on a correct word). index.js's scheduler path has
// no inbound message (timeouts aren't replies to anything) and omits it - `accepted`
// only ever comes from the submit path below, which always has one.
//
// `now` is only needed to timestamp the ✅'s clearing reaction (notBefore); the
// submit path (router.handleMessage) always has it, index.js's scheduler path
// passes Date.now(). The reaction is queued AFTER the render loop, not inline when
// `accepted` is seen, so a same-batch `turn` message always wins the per-chat gap -
// gameplay beats cosmetics. Both the ✅ and its clearer are 'cosmetic' kind so the
// outbox sheds them first under load.
export function sendEvents(enqueue, jid, events, quoted, now, db) {
  for (const event of events) {
    let toRender = event
    if (event.type === 'turn') {
      lastTurn.set(jid, { letter: event.letter, minLength: event.minLength })
    } else if (event.type === 'rejected') {
      const st = lastTurn.get(jid)
      if (st) toRender = { ...event, letter: st.letter, minLength: st.minLength }
      if (event.reason === 'not_in_list') {
        try {
          db?.recordRejection({ jid, word: event.word, player: event.player, ts: now })
        } catch (e) {
          // store failure must never break gameplay
        }
      }
    } else if (event.type === 'lobby_open') {
      gameMeta.set(jid, { mode: event.mode, type: event.gameType, eliminated: [], pnMap: new Map() })
    } else if (event.type === 'game_start') {
      const meta = gameMeta.get(jid)
      if (meta) {
        meta.startedAt = now
        meta.players = event.players
      }
    } else if (event.type === 'eliminated') {
      gameMeta.get(jid)?.eliminated.push(event.player)
    } else if (event.type === 'winner') {
      const meta = gameMeta.get(jid)
      if (meta) {
        const pnMap = meta.pnMap || new Map()
        const results = [{ player: event.player, placement: 1, player_pn: pnMap.get(event.player) }]
        for (let i = meta.eliminated.length - 1; i >= 0; i--) {
          const p = meta.eliminated[i]
          results.push({ player: p, placement: results.length + 1, player_pn: pnMap.get(p) })
        }
        const accounted = new Set(results.map((r) => r.player))
        for (const p of meta.players ?? []) {
          if (!accounted.has(p)) {
            results.push({ player: p, placement: results.length + 1, player_pn: pnMap.get(p) })
            accounted.add(p)
          }
        }
        try {
          db?.recordGame({
            jid,
            mode: meta.mode,
            type: meta.type,
            startedAt: meta.startedAt,
            endedAt: now,
            words: event.totalWords,
            results,
          })
        } catch (e) {
          // store failure must never break gameplay
        }
      }
      gameMeta.delete(jid)
    } else if (event.type === 'terminated' || event.type === 'ended') {
      gameMeta.delete(jid)
    } else if (event.type === 'trivia_over') {
      lastTriviaEnd.set(jid, now)
      const meta = gameMeta.get(jid)
      const pnMap = meta?.pnMap || new Map()
      const results = event.standings.map((s, i) => ({
        player: s.player, placement: i + 1, player_pn: pnMap.get(s.player),
      }))
      if (results.length > 0) {
        try {
          db?.recordGame({
            jid, mode: event.category, type: 'trivia',
            startedAt: meta?.startedAt ?? now, endedAt: now,
            words: event.total, results,
          })
        } catch (e) {
          // store failure must never break gameplay
        }
      }
      gameMeta.delete(jid)
    } else if (event.type === 'trivia_terminated') {
      lastTriviaEnd.set(jid, now)
      gameMeta.delete(jid)
    } else if (event.type === 'scramble_word') {
      if (event.index === 1) {
        gameMeta.set(jid, { mode: 'mixed', type: 'scramble', startedAt: now, eliminated: [], pnMap: new Map() })
      }
    } else if (event.type === 'scramble_answer') {
      // Intentionally empty: handleMessage already handles pnMap updates for Scramble
    } else if (event.type === 'scramble_over') {
      const meta = gameMeta.get(jid)
      const pnMap = meta?.pnMap || new Map()
      const results = event.standings.map((s, i) => ({
        player: s.player, placement: i + 1, player_pn: pnMap.get(s.player),
      }))
      if (results.length > 0) {
        try {
          db?.recordGame({
            jid, mode: 'mixed', type: 'scramble',
            startedAt: meta?.startedAt ?? now, endedAt: now,
            words: event.total, results,
          })
        } catch (e) {
          // store failure must never break gameplay
        }
      }
      gameMeta.delete(jid)
    } else if (event.type === 'scramble_terminated') {
      gameMeta.delete(jid)
    } else if (event.type === 'logo_word') {
      if (event.index === 1) {
        gameMeta.set(jid, { mode: 'mixed', type: 'logo', startedAt: now, eliminated: [], pnMap: new Map() })
      }
    } else if (event.type === 'logo_answer') {
      // Intentionally empty
    } else if (event.type === 'logo_over') {
      const meta = gameMeta.get(jid)
      const pnMap = meta?.pnMap || new Map()
      const results = event.standings.map((s, i) => ({
        player: s.player, placement: i + 1, player_pn: pnMap.get(s.player),
      }))
      if (results.length > 0) {
        try {
          db?.recordGame({
            jid, mode: 'mixed', type: 'logo',
            startedAt: meta?.startedAt ?? now, endedAt: now,
            words: event.total, results,
          })
        } catch (e) {
          // store failure must never break gameplay
        }
      }
      gameMeta.delete(jid)
    } else if (event.type === 'logo_terminated') {
      gameMeta.delete(jid)
    } else if (event.type === 'flag_word') {
      if (event.index === 1) {
        gameMeta.set(jid, { mode: 'mixed', type: 'flag', startedAt: now, eliminated: [], pnMap: new Map() })
      }
    } else if (event.type === 'flag_answer') {
      // Intentionally empty
    } else if (event.type === 'flag_over') {
      const meta = gameMeta.get(jid)
      const pnMap = meta?.pnMap || new Map()
      const results = event.standings.map((s, i) => ({
        player: s.player, placement: i + 1, player_pn: pnMap.get(s.player),
      }))
      if (results.length > 0) {
        try {
          db?.recordGame({
            jid, mode: 'mixed', type: 'flag',
            startedAt: meta?.startedAt ?? now, endedAt: now,
            words: event.total, results,
          })
        } catch (e) {
          // store failure must never break gameplay
        }
      }
      gameMeta.delete(jid)
    } else if (event.type === 'flag_terminated') {
      gameMeta.delete(jid)
    } else if (event.type === 'riddle_start') {
      if (event.round === 1) {
        gameMeta.set(jid, { mode: 'mixed', type: 'riddle', startedAt: now, eliminated: [], pnMap: new Map() })
      }
    } else if (event.type === 'riddle_solved') {
      // Intentionally empty
    } else if (event.type === 'riddle_game_over') {
      const meta = gameMeta.get(jid)
      const pnMap = meta?.pnMap || new Map()
      const results = (event.scores || []).map((s, i) => ({
        player: s.player, placement: i + 1, player_pn: pnMap.get(s.player),
      }))
      if (results.length > 0) {
        try {
          db?.recordGame({
            jid, mode: 'mixed', type: 'riddle',
            startedAt: meta?.startedAt ?? now, endedAt: now,
            words: event.scores.length, results,
          })
        } catch (e) {
          // store failure must never break gameplay
        }
      }
      gameMeta.delete(jid)
    } else if (event.type === 'riddle_terminated') {
      gameMeta.delete(jid)
    } else if (event.type === 'tournament_champion') {
      // Tournament wins are a SEPARATE table from trivia/chain results — never
      // touches `results`/leaderboard(). Keyed on the winner's FULL JID (via
      // gameMeta's pnMap, same as results.player_pn) so the same human under
      // two JID namespaces doesn't split into two winners; toNumber() is a
      // display-time-only concern (formatTournamentStats), not a storage one —
      // storing bare digits here broke the WhatsApp `mentions` tag (Fix 3).
      const meta = gameMeta.get(jid)
      const pn = meta?.pnMap?.get(event.player)
      try {
        db?.recordTournamentWin(jid, pn ?? event.player, now)
      } catch (e) {
        // store failure must never break gameplay
      }
      gameMeta.delete(jid)
    } else if (event.type === 'tournament_cancelled' || event.type === 'tournament_ended') {
      gameMeta.delete(jid)
    } else if (event.type === 'wordle_tournament_champion') {
      // Same shape as tournament_champion above, but recorded with type
      // 'wordle' so /tourney stats and /wordle stats stay two separate
      // counts sharing one table — see the store's tournament_wins migration.
      const meta = gameMeta.get(jid)
      const pn = meta?.pnMap?.get(event.player)
      try {
        db?.recordTournamentWin(jid, pn ?? event.player, now, 'wordle')
      } catch (e) {
        // store failure must never break gameplay
      }
      gameMeta.delete(jid)
    } else if (event.type === 'wordle_tournament_cancelled' || event.type === 'wordle_tournament_ended') {
      gameMeta.delete(jid)
    }

    // Tournament state transitions carry a full bracket snapshot to persist —
    // see engine/tournament.js's serialize() and engine/wordleTournament.js's.
    // Mid-match ticks (question/guess pass-through events) carry none and are
    // deliberately not persisted: a restart mid-match collapses back to
    // 'awaiting' on the next next()/`/wordle next` rather than trying to
    // resume a live clock or in-progress boards.
    if (event.snapshot) {
      try {
        if (event.snapshot.state === 'over') db?.deleteTournament(jid)
        else db?.saveTournament(jid, event.snapshot, now)
        if (Array.isArray(event.snapshot.usedQids) && event.snapshot.usedQids.length > 0) {
          db?.markAsked(jid, event.snapshot.usedQids.map((id) => ({ id, category: event.snapshot.category || 'mixed' })), now)
        }
        if (Array.isArray(event.snapshot.usedWords) && event.snapshot.usedWords.length > 0) {
          db?.markAskedWordle(jid, event.snapshot.usedWords, now)
        }
      } catch (e) {
        // store failure must never break gameplay
      }
    }

    const rendered = render(toRender)
    if (rendered) {
      enqueue(jid, {
        text: rendered.text,
        mentions: rendered.mentions,
        imagePath: rendered.imagePath,
        quoted: rendered.quote ? quoted : undefined,
        kind: KIND_BY_EVENT[event.type] || 'misc',
      })
    }
  }
}

function formatLeaderboard(board, heading) {
  if (board.length === 0) return { text: `${heading}\nNo games yet.`, mentions: [] }
  const lines = board.map((r, i) => `${i + 1}. @${toNumber(r.player)} - ${r.score} ${r.score === 1 ? 'pt' : 'pts'} (${r.wins}W/${r.games}G)`)
  return { text: `${heading}\n${lines.join('\n')}`, mentions: board.map((r) => r.player) }
}

// `label` distinguishes /tourney stats from /wordle stats — same table
// (tournament_wins), different `type` column, so the two boards must never
// read as the same thing even though the format is identical.
function formatTournamentStats(board, label = null) {
  if (label) {
    if (board.length === 0) return { text: `🏆 No ${label} titles won yet.`, mentions: [] }
    const lines = board.map((r, i) => `${i + 1}. @${toNumber(r.player)} - ${r.wins} ${r.wins === 1 ? 'title' : 'titles'}`)
    return { text: `🏆 ${label} titles\n${lines.join('\n')}`, mentions: board.map((r) => r.player) }
  }
  if (board.length === 0) return { text: `🏆 No tournaments won yet.`, mentions: [] }
  const lines = board.map((r, i) => `${i + 1}. @${toNumber(r.player)} - ${r.wins} ${r.wins === 1 ? 'title' : 'titles'}`)
  return { text: `🏆 Tournament wins\n${lines.join('\n')}`, mentions: board.map((r) => r.player) }
}

function formatPending(rows) {
  if (rows.length === 0) return { text: `No pending words.`, mentions: [] }
  return { text: `📝 Most-rejected words here:\n${rows.map((r) => `${r.word} x${r.count}`).join('\n')}`, mentions: [] }
}

export function createRouter({ dict, games, enqueue, logger, getGroupAdmins, db, bank = null, resolvePn = () => undefined }) {
  const riddleBank = loadRiddleBank()
  const flagBank = loadFlagBank()
  const wordleBank = loadWordleBank()
  // Engine games don't expose who started them; track it here, mirroring `games`.
  // ponytail: scheduler-driven deletions (timeout/lobby-fail) don't clean this map,
  // it's overwritten on the jid's next game — bounded leak, fix if it ever matters.
  const starters = new Map()
  // jid -> 'wcg' | 'trivia', so /wcg end and /trivia end each only end their own
  // game type. Same bounded-leak note as `starters`: scheduler-driven (timeout)
  // deletions don't clean this map, it's overwritten on the jid's next game.
  const gameTypes = new Map()

  // A restart wipes `games` (in-memory) while the group is still playing. Bare
  // A-D answers then hit the no-game path and vanish, so the bot looks dead.
  // Rate-limited per jid: same bounded-leak note as `starters`.
  const lastOrphanNotice = new Map() // jid -> ts of the last notice sent

  // Command flood guard. Only commands are counted — gameplay messages must never
  // be limited or a fast round breaks. Over the limit we drop SILENTLY: replying
  // "stop spamming" is itself more spam and doubles the flood.
  // ponytail: fixed window per sender, not a token bucket — same bounded-leak note
  // as `starters`.
  const CMD_WINDOW_MS = 30_000
  const CMD_MAX = 5
  const cmdHits = new Map() // sender -> { windowStart, count }

  function overCommandLimit(sender, now) {
    const hit = cmdHits.get(sender)
    if (!hit || now - hit.windowStart >= CMD_WINDOW_MS) {
      cmdHits.set(sender, { windowStart: now, count: 1 })
      return false
    }
    hit.count++
    return hit.count > CMD_MAX
  }

  // Group admins are a group-only concept. Calling getGroupAdmins on a DM jid
  // never gets a reply and baileys blocks for its full 60s query timeout.
  // Never query group metadata for a non-group JID: WhatsApp simply never answers,
  // so baileys blocks for its full 60s query timeout before the command can run.
  // Group admins are a group-only concept anyway; [] in a DM is the right answer,
  // and the OWNER/ADMINS/bot-admin checks still apply.
  async function groupAdminsFor(jid, isGroup) {
    return isGroup ? await getGroupAdmins(jid) : []
  }

  // Admin check used by every existing admin-gated command: also accepts
  // db-stored bot admins (per-group, /promote'd), and resolves a @lid sender's
  // phone-form JID via resolvePn when senderPn wasn't already supplied.
  function isBotAdminEither(sender, senderPn, isGroup, groupAdmins, gJid) {
    return isAdminEither({
      sender,
      senderPn: senderPn ?? resolvePn(sender),
      isGroup,
      groupAdmins,
      extraAdmins: db.botAdmins?.(gJid) ?? [],
    })
  }

  // /promote and /demote are gated to OWNER/ADMINS only — group admins and
  // db-stored bot admins must not be able to mint new bot admins.
  function isOwnerOrGlobalAdmin(sender, senderPn) {
    const pn = senderPn ?? resolvePn(sender)
    return isAdmin({ sender: pn, isGroup: false, groupAdmins: [] }) || isAdmin({ sender, isGroup: false, groupAdmins: [] })
  }

  // A ban covers every mode, not just trivia — the table is still named
  // trivia_bans for backwards compatibility with existing rows.
  //
  // Bans are stored as bare phone numbers; sender may arrive as an @lid JID,
  // so resolve to phone-form the same way isBotAdminEither does.
  function isBanned(jid, sender, senderPn) {
    const num = toNumber(senderPn ?? resolvePn(sender))
    return (db.bans?.(jid) ?? []).includes(num)
  }

  // Starting a game is now admin-only: group admins, /promote'd bot admins, the
  // OWNER, or a global ADMIN. Everyone can still play, answer and read stats.
  //
  // The ban check lives here rather than in each start* function because every
  // mode funnels through this one call — a new mode is banned-proof by default
  // instead of needing to remember its own check, which is how the tournament
  // hole appeared in the first place.
  async function mayStartGame(jid, sender, senderPn, isGroup) {
    if (isBanned(jid, sender, senderPn)) return false
    const groupAdmins = await groupAdminsFor(jid, isGroup)
    return isBotAdminEither(sender, senderPn, isGroup, groupAdmins, jid) || isOwnerOrGlobalAdmin(sender, senderPn)
  }

  // Mentioned JID takes priority over a typed number in args. A mentioned
  // @lid JID is resolved to phone-form first, since bot_admins stores numbers.
  function resolveTarget(raw, args) {
    const mentionedJid = raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    let number
    if (mentionedJid) {
      const pnJid = mentionedJid.endsWith('@lid') ? resolvePn(mentionedJid) : mentionedJid
      number = pnJid ? toNumber(pnJid) : undefined
    } else {
      // Strip +, spaces and dashes so a typed "+234 913..." still resolves.
      number = (args[0] ?? '').replace(/[^\d]/g, '')
    }
    return /^\d+$/.test(number ?? '') ? number : undefined
  }

  async function startGame(jid, sender, senderPn, args, type, now, isGroup) {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start a game.`, mentions: [], kind: 'misc' })
      return
    }
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. Use ${PREFIX}wcg end to stop it first.`, mentions: [], kind: 'misc' })
      return
    }
    const mode = MODE_NAMES.has(args[0]) ? args[0] : undefined
    const game = createGame({ mode, type, dict, starter: sender, now, random: Math.random })
    games.set(jid, game)
    starters.set(jid, sender)
    gameTypes.set(jid, 'wcg')
    try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
    sendEvents(enqueue, jid, game.join(sender, now), undefined, now, db)
    // Record starter's phone-form JID for leaderboard aggregation
    if (senderPn) {
      const meta = gameMeta.get(jid)
      if (meta?.pnMap) meta.pnMap.set(sender, senderPn)
    }
  }

  async function startScramble(jid, sender, senderPn, args, now, isGroup) {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start a game.`, mentions: [], kind: 'misc' })
      return
    }
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. Use ${PREFIX}scramble end to stop it first.`, mentions: [], kind: 'misc' })
      return
    }
    if (!scramblePool || scramblePool.length < SCRAMBLE_COUNT) {
      enqueue(jid, { text: `Scramble is unavailable — valid dictionary not loaded.`, mentions: [], kind: 'misc' })
      return
    }

    // Pick random unique words from the pure English dictionary pool
    const selectedIndexes = new Set()
    const words = []
    while (selectedIndexes.size < SCRAMBLE_COUNT) {
      const idx = Math.floor(Math.random() * scramblePool.length)
      if (!selectedIndexes.has(idx)) {
        selectedIndexes.add(idx)
        words.push({ correct: scramblePool[idx] })
      }
    }

    enqueue(jid, { text: `🔠 *Scramble Game started!*\n${SCRAMBLE_COUNT} words. You have 15 seconds per word. Get ready...`, mentions: [], kind: 'misc' })
    
    const game = createScrambleGame({ words, now, random: Math.random })
    games.set(jid, game)
    starters.set(jid, sender)
    gameTypes.set(jid, 'scramble')
    try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
    
    // We send join() immediately but the engine drops the first word immediately since phase is idle.
    sendEvents(enqueue, jid, game.join(sender, now), undefined, now, db)
    if (senderPn) {
      const meta = gameMeta.get(jid)
      if (meta?.pnMap) meta.pnMap.set(sender, senderPn)
    }
  }

  // No lobby: the first question posts immediately and answering is joining.
  async function startTrivia(jid, sender, senderPn, args, now, isGroup) {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start a game.`, mentions: [], kind: 'misc' })
      return
    }
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. Use ${PREFIX}trivia end to stop it first.`, mentions: [], kind: 'misc' })
      return
    }
    if (!bank) {
      enqueue(jid, { text: `Trivia is unavailable — no question bank loaded.`, mentions: [], kind: 'misc' })
      return
    }
    // Bans are enforced for every mode at the handleCommand entry point and
    // again in mayStartGame, so there is no trivia-specific check here.
    //
    // Group admins are subject to this too — otherwise, with starts already
    // restricted to admins, the cooldown would never apply to anyone.
    const endedAt = lastTriviaEnd.get(jid)
    if (endedAt !== undefined && now - endedAt < TRIVIA_COOLDOWN_MS && !isOwnerOrGlobalAdmin(sender, senderPn)) {
      const waitSec = Math.ceil((TRIVIA_COOLDOWN_MS - (now - endedAt)) / 1000)
      enqueue(jid, { text: `Hold on — another trivia round can start in ${waitSec}s.`, mentions: [], kind: 'misc' })
      return
    }
    const available = bank.categories()
    const requested = args[0]
    const category = requested ? requested.toLowerCase() : 'mixed'
    if (category !== 'mixed' && !available.includes(category)) {
      enqueue(jid, {
        text: `No questions for "${requested}" yet.\nAvailable: ${available.join(', ') || 'none'}`,
        mentions: [], kind: 'misc',
      })
      return
    }

    // A store failure here must never break gameplay — fall back to an empty
    // Set (a possible repeat this one time) rather than let /trivia die silently.
    let exclude
    try {
      exclude = db?.askedIds(jid) ?? new Set()
    } catch (e) {
      logger?.error({ err: e }, 'Failed loading asked questions')
      exclude = new Set()
    }
    let picked = bank.pick({ category, count: QUESTION_COUNT, exclude, random: Math.random })
    // Pool exhausted for this group: recycle rather than serving a short game.
    if (picked.length === 0) {
      try {
        // Mixed draws from every category, and rows are tagged by each
        // question's own source category (not 'mixed') — recycle them all.
        if (category === 'mixed') {
          for (const c of available) db?.clearAsked(jid, c)
        } else {
          db?.clearAsked(jid, category)
        }
      } catch (e) {
        logger?.error({ err: e }, 'Failed clearing asked questions')
      }
      picked = bank.pick({ category, count: QUESTION_COUNT, exclude: new Set(), random: Math.random })
    }
    if (picked.length === 0) {
      enqueue(jid, { text: `No questions available for that category.`, mentions: [], kind: 'misc' })
      return
    }

    const game = createTriviaGame({ questions: picked, category, now, random: Math.random })
    games.set(jid, game)
    starters.set(jid, sender)
    gameTypes.set(jid, 'trivia')
    gameMeta.set(jid, { mode: category, type: 'trivia', startedAt: now, players: [], eliminated: [], pnMap: new Map() })
    if (senderPn) gameMeta.get(jid).pnMap.set(sender, senderPn)
    try {
      db?.markAsked(jid, picked, now)
    } catch (e) {
      logger?.error({ err: e }, 'Failed recording asked questions')
    }
    try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
    sendEvents(enqueue, jid, game.tick(now), undefined, now, db)
  }

  // Open registration for a head-to-head tournament. `args` here is everything
  // after "start" (e.g. /tourney start football -> args = ['football']).
  async function startTournament(jid, sender, senderPn, args, now, isGroup) {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start a tournament.`, mentions: [], kind: 'misc' })
      return
    }
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. End it first.`, mentions: [], kind: 'misc' })
      return
    }
    if (!bank) {
      enqueue(jid, { text: `Trivia is unavailable — no question bank loaded.`, mentions: [], kind: 'misc' })
      return
    }
    const available = bank.categories()
    const requested = args[0]
    const category = requested ? requested.toLowerCase() : 'mixed'
    if (category !== 'mixed' && !available.includes(category)) {
      enqueue(jid, {
        text: `No questions for "${requested}" yet.\nAvailable: ${available.join(', ') || 'none'}`,
        mentions: [], kind: 'misc',
      })
      return
    }

    let exclude
    try {
      exclude = db?.askedIds(jid) ?? new Set()
    } catch (e) {
      logger?.error({ err: e }, 'Failed loading asked questions')
      exclude = new Set()
    }

    const tourney = createTournament({ now, random: Math.random, bank, category, exclude })
    games.set(jid, tourney)
    starters.set(jid, sender)
    gameTypes.set(jid, 'tournament')
    gameMeta.set(jid, { type: 'tournament', startedAt: now, pnMap: new Map() })
    if (senderPn) gameMeta.get(jid).pnMap.set(sender, senderPn)
    try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
    sendEvents(enqueue, jid, tourney.tick(now), undefined, now, db)
  }

  // A tournament may exist in the store but not in memory (the process
  // restarted). Reconstruct it from the persisted bracket so /tourney next
  // (etc.) can resume it instead of silently acting like nothing is running.
  // See engine/tournament.js's `restore` — a mid-match snapshot collapses to
  // 'awaiting' since the live trivia clock can't be recovered.
  function resumeTournament(jid, sender, now) {
    let persisted
    try {
      persisted = db.loadTournament?.(jid)
    } catch (e) {
      persisted = undefined
      logger?.error({ err: e }, 'Failed loading persisted tournament')
    }
    if (!persisted) return false
    // Both tournament types persist to the same `tournaments` table (only one
    // game runs per jid at a time). A blob with no `type` predates this check
    // and was always trivia; an explicit non-trivia type means /wordle's
    // resume owns it instead, not this function.
    if (persisted.type && persisted.type !== 'trivia') return false
    try {
      let exclude
      try {
        exclude = db?.askedIds(jid) ?? new Set()
      } catch (e) {
        exclude = new Set()
      }
      const tourney = createTournament({ now, random: Math.random, bank, restore: persisted, exclude })
      if (tourney.state === 'over') {
        try { db.deleteTournament?.(jid) } catch (e) { /* best effort cleanup */ }
        return false
      }
      games.set(jid, tourney)
      gameTypes.set(jid, 'tournament')
      if (!starters.has(jid)) starters.set(jid, sender)
      if (!gameMeta.has(jid)) gameMeta.set(jid, { type: 'tournament', startedAt: now, pnMap: new Map() })
      enqueue(jid, { text: `🏆 Tournament resumed after a restart.`, mentions: [], kind: 'misc' })
      return true
    } catch (e) {
      logger?.error({ err: e }, 'Failed to resume tournament')
      try { db.deleteTournament?.(jid) } catch (e2) { /* best effort cleanup */ }
      enqueue(jid, {
        text: `Couldn't resume the tournament here — its saved state was unreadable. An admin needs to run ${PREFIX}tourney start again.`,
        mentions: [], kind: 'misc',
      })
      return false
    }
  }

  async function startWordleTournament(jid, sender, senderPn, args, now, isGroup) {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start a tournament.`, mentions: [], kind: 'misc' })
      return
    }
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. End it first.`, mentions: [], kind: 'misc' })
      return
    }

    const requestedTier = (args[0] ?? '').toLowerCase()
    const tier = MODE_NAMES.has(requestedTier) ? requestedTier : 'easy'

    let exclude
    try {
      exclude = db?.askedWordleWords(jid) ?? new Set()
    } catch (e) {
      logger?.error({ err: e }, 'Failed loading asked wordle words')
      exclude = new Set()
    }

    // If this tier's history has used up nearly everything, a fresh tournament
    // would spend the whole bracket coin-flipping instead of actually playing.
    // Same "probe, then clear and retry" shape as /riddle's asked-riddle reset.
    if (!wordleBank.pickPair({ tier, exclude, random: Math.random })) {
      try { db?.clearAskedWordle(jid) } catch (e) { /* best effort */ }
      exclude = new Set()
    }

    const wt = createWordleTournament({
      wordBank: wordleBank, tier, isValidWord: (w) => dict.has(w),
      now, random: Math.random, exclude,
    })
    games.set(jid, wt)
    starters.set(jid, sender)
    gameTypes.set(jid, 'wordle_tournament')
    gameMeta.set(jid, { type: 'wordle_tournament', startedAt: now, pnMap: new Map() })
    if (senderPn) gameMeta.get(jid).pnMap.set(sender, senderPn)
    try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
    sendEvents(enqueue, jid, wt.tick(now), undefined, now, db)
  }

  function resumeWordleTournament(jid, sender, now) {
    let persisted
    try {
      persisted = db.loadTournament?.(jid)
    } catch (e) {
      persisted = undefined
      logger?.error({ err: e }, 'Failed loading persisted wordle tournament')
    }
    if (!persisted || persisted.type !== 'wordle') return false
    try {
      let exclude
      try {
        exclude = db?.askedWordleWords(jid) ?? new Set()
      } catch (e) {
        exclude = new Set()
      }
      const wt = createWordleTournament({
        wordBank: wordleBank, isValidWord: (w) => dict.has(w),
        now, random: Math.random, restore: persisted, exclude,
      })
      if (wt.state === 'over') {
        try { db.deleteTournament?.(jid) } catch (e) { /* best effort cleanup */ }
        return false
      }
      games.set(jid, wt)
      gameTypes.set(jid, 'wordle_tournament')
      if (!starters.has(jid)) starters.set(jid, sender)
      if (!gameMeta.has(jid)) gameMeta.set(jid, { type: 'wordle_tournament', startedAt: now, pnMap: new Map() })
      enqueue(jid, { text: `🏳️ Wordle Tournament resumed after a restart.`, mentions: [], kind: 'misc' })
      return true
    } catch (e) {
      logger?.error({ err: e }, 'Failed to resume wordle tournament')
      try { db.deleteTournament?.(jid) } catch (e2) { /* best effort cleanup */ }
      enqueue(jid, {
        text: `Couldn't resume the Wordle Tournament here — its saved state was unreadable. An admin needs to run ${PREFIX}wordle start again.`,
        mentions: [], kind: 'misc',
      })
      return false
    }
  }

  // `expectedType` ('wcg' | 'trivia') keeps /wcg end and /trivia end from
  // terminating each other's game — only one game runs per jid at a time, so
  // without this check either command would end whatever happens to be running.
  async function endGame(jid, sender, senderPn, isGroup, now, expectedType) {
    const game = games.get(jid)
    if (!game) return
    if (expectedType && gameTypes.get(jid) !== expectedType) return
    const groupAdmins = await groupAdminsFor(jid, isGroup)
    const allowed = sender === starters.get(jid) || isBotAdminEither(sender, senderPn, isGroup, groupAdmins, jid)
    if (!allowed) {
      enqueue(jid, { text: `Only the player who started the game or a group admin can end it.`, mentions: [], kind: 'misc' })
      return
    }
    sendEvents(enqueue, jid, game.end(now), undefined, now, db)
    if (game.state === 'over') {
      games.delete(jid)
      starters.delete(jid)
      gameTypes.delete(jid)
    }
  }

  async function startLogoGame(jid, sender, senderPn, now, isGroup) {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start a game.`, mentions: [], kind: 'misc' })
      return
    }
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. End it first.`, mentions: [], kind: 'misc' })
      return
    }
    
    let pool = [];
    try {
      const files = readdirSync(join('data', 'logos')).filter(f => f.endsWith('.jpg'))
      pool = files.map(f => ({
        answer: f.replace('.jpg', ''),
        path: join(process.cwd(), 'data', 'logos', f)
      }))
    } catch (e) {
      logger?.error({ err: e }, 'Failed to read data/logos')
    }

    if (pool.length === 0) {
      enqueue(jid, { text: `The logo quiz is currently unavailable — no images found.`, mentions: [], kind: 'misc' })
      return
    }

    // Shuffle the pool and pick LOGO_COUNT logos
    pool.sort(() => Math.random() - 0.5)
    const gameLogos = pool.slice(0, LOGO_COUNT)

    const game = createLogoGame({ logos: gameLogos, now, random: Math.random })
    games.set(jid, game)
    starters.set(jid, sender)
    gameTypes.set(jid, 'logo')
    try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }

    enqueue(jid, {
      text: `🖼️ *LOGO QUIZ* starting!\nGet ready to guess the brand. ${LOGO_COUNT} rounds.`,
      mentions: [], kind: 'misc',
    })
    sendEvents(enqueue, jid, game.join(sender, now), undefined, now, db)
  }

  async function startFlagGame(jid, sender, senderPn, now, isGroup) {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start a game.`, mentions: [], kind: 'misc' })
      return
    }
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. Use ${PREFIX}flag end to stop it first.`, mentions: [], kind: 'misc' })
      return
    }

    let exclude
    try {
      exclude = db?.askedFlagCodes(jid) ?? new Set()
    } catch (e) {
      logger?.error({ err: e }, 'Failed loading asked flags')
      exclude = new Set()
    }

    let gameFlags = flagBank.pickFlags({ count: FLAG_COUNT, exclude, random: Math.random })
    if (gameFlags.length === 0) {
      try {
        db?.clearAskedFlags(jid)
      } catch (e) {
        logger?.error({ err: e }, 'Failed clearing asked flags')
      }
      gameFlags = flagBank.pickFlags({ count: FLAG_COUNT, exclude: new Set(), random: Math.random })
    }

    if (gameFlags.length === 0) {
      enqueue(jid, { text: `Guess the Flag is currently unavailable — no flag data found.`, mentions: [], kind: 'misc' })
      return
    }

    const game = createFlagGame({ flags: gameFlags, now, random: Math.random })
    games.set(jid, game)
    starters.set(jid, sender)
    gameTypes.set(jid, 'flag')
    try {
      db?.markAskedFlags(jid, gameFlags, now)
    } catch (e) {
      logger?.error({ err: e }, 'Failed recording asked flags')
    }
    try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }

    enqueue(jid, {
      text: `🏳️ *GUESS THE FLAG* starting!\nName the country. ${FLAG_COUNT} flags, ${FLAG_CLOCK_SECONDS}s each.`,
      mentions: [], kind: 'misc',
    })
    sendEvents(enqueue, jid, game.join(sender, now), undefined, now, db)
  }

  async function startRiddleGame(jid, sender, senderPn, now, isGroup) {
    if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
      enqueue(jid, { text: `Only a group admin can start a game.`, mentions: [], kind: 'misc' })
      return
    }
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. Use ${PREFIX}riddle end to stop it first.`, mentions: [], kind: 'misc' })
      return
    }

    let exclude
    try {
      exclude = db?.askedRiddleIds(jid) ?? new Set()
    } catch (e) {
      logger?.error({ err: e }, 'Failed loading asked riddles')
      exclude = new Set()
    }

    let picked = riddleBank.pickRiddles({ count: RIDDLE_COUNT, exclude, random: Math.random })
    if (picked.length === 0) {
      try {
        db?.clearAskedRiddles(jid)
      } catch (e) {
        logger?.error({ err: e }, 'Failed clearing asked riddles')
      }
      picked = riddleBank.pickRiddles({ count: RIDDLE_COUNT, exclude: new Set(), random: Math.random })
    }

    if (picked.length === 0) {
      enqueue(jid, { text: `Riddles are currently unavailable.`, mentions: [], kind: 'misc' })
      return
    }

    const game = createRiddleGame({ riddles: picked, now, random: Math.random })
    games.set(jid, game)
    starters.set(jid, sender)
    gameTypes.set(jid, 'riddle')
    gameMeta.set(jid, { mode: 'mixed', type: 'riddle', startedAt: now, players: [], eliminated: [], pnMap: new Map() })
    if (senderPn) gameMeta.get(jid).pnMap.set(sender, senderPn)
    try {
      db?.markAskedRiddles(jid, picked, now)
    } catch (e) {
      logger?.error({ err: e }, 'Failed recording asked riddles')
    }
    try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
    sendEvents(enqueue, jid, game.tick(now), undefined, now, db)
  }

  async function handleCommand(jid, sender, senderPn, isGroup, cmd, args, now, raw) {
    if (cmd === 'ping') {
      enqueue(jid, { text: 'pong', mentions: [], kind: 'misc' })
      return
    }

    // A ban blocks every game command, not just /trivia. Reading a leaderboard
    // is harmless, so `<mode> stats` stays open — the ban is about playing.
    if (GAME_COMMANDS.has(cmd) && (args[0] ?? '').toLowerCase() !== 'stats' && isBanned(jid, sender, senderPn)) {
      enqueue(jid, { text: `You're banned from games here.`, mentions: [], kind: 'misc' })
      return
    }

    if (cmd === 'help') {
      const groupAdmins = await groupAdminsFor(jid, isGroup)
      const isAdmin = isBotAdminEither(sender, senderPn, isGroup, groupAdmins, jid)
      const isOwner = isOwnerOrGlobalAdmin(sender, senderPn)

      const lines = [
        `🎮 *W·C·G  B·O·T*`,
        `━━━━━━━━━━━━━━━━`,
        ``,
        `*🔤 WORD CHAIN* _(start: admins only)_`,
        `▸ ${PREFIX}wcg start`,
        `▸ ${PREFIX}wcg easy|medium|hard`,
        `▸ ${PREFIX}wrg start`,
        `▸ ${PREFIX}wcg end`,
        ``,
        `*🧠 TRIVIA* _(start: admins only)_`,
        `▸ ${PREFIX}trivia`,
        `▸ ${PREFIX}trivia <category>`,
        `▸ ${PREFIX}trivia categories`,
        `▸ ${PREFIX}trivia end`,
        ``,
        `*🔀 SCRAMBLE* _(start: admins only)_`,
        `▸ ${PREFIX}scramble start`,
        `▸ ${PREFIX}scramble end`,
        ``,
        `*🖼️ LOGO QUIZ* _(start: admins only)_`,
        `▸ ${PREFIX}logo start`,
        `▸ ${PREFIX}logo end`,
        ``,
        `*🏳️ GUESS THE FLAG* _(start: admins only)_`,
        `▸ ${PREFIX}flag start`,
        `▸ ${PREFIX}flag end`,
        ``,
        `*🧩 RIDDLE QUEST* _(start: admins only)_`,
        `▸ ${PREFIX}riddle`,
        `▸ ${PREFIX}riddle end`,
        ``,
        `*🏆 TOURNAMENT* _(start/next/end: admins only)_`,
        `▸ ${PREFIX}tourney status`,
        `▸ ${PREFIX}tourney stats`,
        ``,
        `*🔤 WORDLE TOURNAMENT* _(start/next/end: admins only)_`,
        `▸ ${PREFIX}wordle start [easy|medium|hard]`,
        `▸ ${PREFIX}wordle status`,
        `▸ ${PREFIX}wordle stats`,
        ``,
        `*📊 SCORES*`,
        `▸ ${PREFIX}stats [all]`,
        `▸ ${PREFIX}trivia stats [all]`,
        `▸ ${PREFIX}scramble stats [all]`,
        `▸ ${PREFIX}logo stats [all]`,
        `▸ ${PREFIX}flag stats [all]`,
        `▸ ${PREFIX}riddle stats [all]`,
      ]

      // Hidden from players who cannot use them: no point listing a command
      // whose only possible response is "Admins only."
      if (isAdmin) {
        lines.push(
          ``,
          `*⚙️ ADMIN*`,
          `▸ ${PREFIX}pending`,
          `▸ ${PREFIX}addword <word>|all`,
          `▸ ${PREFIX}delword <word>`,
          `▸ ${PREFIX}admin`,
          `▸ ${PREFIX}tourney start [category]`,
          `▸ ${PREFIX}tourney next`,
          `▸ ${PREFIX}tourney end`,
        )
      }
      if (isOwner) {
        lines.push(
          ``,
          `*👑 OWNER*`,
          `▸ ${PREFIX}promote @user`,
          `▸ ${PREFIX}demote @user`,
          `▸ ${PREFIX}ban @user`,
          `▸ ${PREFIX}unban @user`,
          `▸ ${PREFIX}bans`,
        )
      }

      lines.push(
        ``,
        `_In game:_ send join, then`,
        `your word — or A–D for trivia`,
      )

      enqueue(jid, { text: lines.join('\n'), mentions: [], kind: 'misc' })
      return
    }

    if (cmd === 'admin') {
      const lines = [`*Admins here:*`]
      const mentions = []
      if (OWNER) {
        lines.push(`Owner: @${toNumber(OWNER)}`)
        mentions.push(`${OWNER}@s.whatsapp.net`)
      } else {
        lines.push(`Owner: not set`)
      }
      if (ADMINS.length > 0) {
        lines.push(`Global: ${ADMINS.map((a) => `@${toNumber(a)}`).join(' ')}`)
        mentions.push(...ADMINS.map((a) => `${a}@s.whatsapp.net`))
      } else {
        lines.push(`Global: none`)
      }
      if (isGroup) {
        const groupAdmins = await groupAdminsFor(jid, isGroup)
        if (groupAdmins.length > 0) {
          lines.push(`Group: ${groupAdmins.map((a) => `@${toNumber(a)}`).join(' ')}`)
          mentions.push(...groupAdmins)
        } else {
          lines.push(`Group: none`)
        }
        const botAdmins = db.botAdmins?.(jid) ?? []
        if (botAdmins.length > 0) {
          lines.push(`Bot admins: ${botAdmins.map((n) => `@${n}`).join(' ')}`)
          mentions.push(...botAdmins.map((n) => `${n}@s.whatsapp.net`))
        } else {
          lines.push(`Bot admins: none`)
        }
      } else {
        lines.push(`Group admins do not apply in a DM.`)
      }
      enqueue(jid, { text: lines.join('\n'), mentions, kind: 'misc' })
      return
    }

    if (cmd === 'stats') {
      const all = args[0] === 'all'
      const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10, type: 'chain' })
      const { text, mentions } = formatLeaderboard(board, all ? '🏆 WCG — all-time' : '🏆 WCG — this week')
      enqueue(jid, { text, mentions, kind: 'misc' })
      return
    }

    if (cmd === 'pending' || cmd === 'addword' || cmd === 'delword') {
      const groupAdmins = await groupAdminsFor(jid, isGroup)
      if (!isBotAdminEither(sender, senderPn, isGroup, groupAdmins, jid)) {
        enqueue(jid, { text: `Admins only.`, mentions: [], kind: 'misc' })
        return
      }

      if (cmd === 'pending') {
        const { text, mentions } = formatPending(db.pending(jid, 10))
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (cmd === 'addword') {
        if (args[0] === 'all') {
          const rows = db.pending(jid, 10)
          for (const { word } of rows) {
            dict.add(word)
            db.addWord(word, { jid, addedBy: sender, ts: now })
          }
          enqueue(jid, { text: `Added ${rows.length} word(s).`, mentions: [], kind: 'misc' })
          return
        }
        const word = fold(args[0] ?? '')
        if (!isWord(word)) {
          enqueue(jid, { text: `Words must be 3+ letters, a-z only.`, mentions: [], kind: 'misc' })
          return
        }
        dict.add(word)
        const added = db.addWord(word, { jid, addedBy: sender, ts: now })
        enqueue(jid, { text: added ? `Added "${word}".` : `"${word}" is already in the list.`, mentions: [], kind: 'misc' })
        return
      }

      // delword
      const word = fold(args[0] ?? '')
      if (!isWord(word)) {
        enqueue(jid, { text: `Words must be 3+ letters, a-z only.`, mentions: [], kind: 'misc' })
        return
      }
      dict.remove(word)
      db.delWord(word)
      enqueue(jid, { text: `Removed "${word}".`, mentions: [], kind: 'misc' })
      return
    }

    if (cmd === 'promote' || cmd === 'demote') {
      if (!isGroup) {
        enqueue(jid, { text: `${PREFIX}${cmd} only works inside a group.`, mentions: [], kind: 'misc' })
        return
      }
      if (!isOwnerOrGlobalAdmin(sender, senderPn)) {
        enqueue(jid, { text: `Only the owner can ${cmd}.`, mentions: [], kind: 'misc' })
        return
      }
      const target = resolveTarget(raw, args)
      if (!target) {
        enqueue(jid, { text: `Mention who you want to ${cmd}.`, mentions: [], kind: 'misc' })
        return
      }
      if (cmd === 'promote') {
        const added = db.addBotAdmin(jid, target, { addedBy: toNumber(sender), ts: now })
        enqueue(jid, { text: added ? `Promoted @${target}.` : `@${target} is already a bot admin.`, mentions: [`${target}@s.whatsapp.net`], kind: 'misc' })
      } else {
        const removed = db.delBotAdmin(jid, target)
        enqueue(jid, { text: removed ? `Demoted @${target}.` : `@${target} is not a bot admin.`, mentions: [`${target}@s.whatsapp.net`], kind: 'misc' })
      }
      return
    }

    if (cmd === 'ban' || cmd === 'unban' || cmd === 'bans') {
      if (!isGroup) {
        enqueue(jid, { text: `${PREFIX}${cmd} only works inside a group.`, mentions: [], kind: 'misc' })
        return
      }
      if (!isOwnerOrGlobalAdmin(sender, senderPn)) {
        enqueue(jid, { text: `Only the owner can ${cmd}.`, mentions: [], kind: 'misc' })
        return
      }
      if (cmd === 'bans') {
        const list = db.bans(jid)
        if (list.length === 0) {
          enqueue(jid, { text: `No one is banned here.`, mentions: [], kind: 'misc' })
        } else {
          enqueue(jid, { text: `*Banned from games:*\n${list.map((n) => `@${n}`).join('\n')}`, mentions: list.map((n) => `${n}@s.whatsapp.net`), kind: 'misc' })
        }
        return
      }
      const target = resolveTarget(raw, args)
      if (!target) {
        enqueue(jid, { text: `Mention who you want to ${cmd}.`, mentions: [], kind: 'misc' })
        return
      }
      if (cmd === 'ban') {
        const added = db.addBan(jid, target)
        enqueue(jid, { text: added ? `Banned @${target} from games.` : `@${target} is already banned.`, mentions: [`${target}@s.whatsapp.net`], kind: 'misc' })
      } else {
        const removed = db.delBan(jid, target)
        enqueue(jid, { text: removed ? `Unbanned @${target}.` : `@${target} is not banned.`, mentions: [`${target}@s.whatsapp.net`], kind: 'misc' })
      }
      return
    }

    if (cmd === 'trivia') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'categories') {
        const emojis = {
          'general': '🌍', 'football': '⚽', 'fpl': '📈', 'sports': '🏅',
          'science': '🔬', 'tech': '💻', 'movies': '🍿', 'tv-shows': '📺', 'geography': '🗺️',
          'history': '🏛️', 'anime': '🍥', 'animals': '🐘', 'videogames': '🎮',
          'cartoons': '🐭', 'art': '🎨', 'mythology': '⚡', 'vehicles': '🚗',
          'nigerian-music': '🎵', 'nigerian-entertainment': '🎬', 'nigerian-history': '🇳🇬',
          'nigerian-food': '🍲', 'pidgin-english': '🗣️', 'web3': '🪙', 'bible': '📖',
          'music': '🎧', 'food': '🍔', 'got': '🐉', 'naruto': '🦊',
          'health': '🏥', 'tech-gadgets': '📱'
        }
        const available = bank ? bank.categories() : []
        enqueue(jid, { text: `*Categories*\n${available.map((c) => `▸ ${emojis[c] || '▪️'} ${c}`).join('\n') || 'none'}\n\n${PREFIX}trivia for a mix of all.`, mentions: [], kind: 'misc' })
        return
      }

      if (sub === 'stats') {
        const all = args[1] === 'all'
        const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10, type: 'trivia' })
        const { text, mentions } = formatLeaderboard(board, all ? '🏆 Trivia — all-time' : '🏆 Trivia — this week')
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }

      if (sub === 'end') {
        await endGame(jid, sender, senderPn, isGroup, now, 'trivia')
        return
      }

      await startTrivia(jid, sender, senderPn, args, now, isGroup)
      return
    }

    if (cmd === 'scramble') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'stats') {
        const all = args[1] === 'all'
        const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10, type: 'scramble' })
        const { text, mentions } = formatLeaderboard(board, all ? '🏆 Scramble — all-time' : '🏆 Scramble — this week')
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }

      if (sub === 'end') {
        await endGame(jid, sender, senderPn, isGroup, now, 'scramble')
        return
      }

      await startScramble(jid, sender, senderPn, args, now, isGroup)
      return
    }

    if (cmd === 'logo') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'stats') {
        const all = args[1] === 'all'
        const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10, type: 'logo' })
        const { text, mentions } = formatLeaderboard(board, all ? '🏆 Logo Quiz — all-time' : '🏆 Logo Quiz — this week')
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }

      if (sub === 'end') {
        await endGame(jid, sender, senderPn, isGroup, now, 'logo')
        return
      }

      await startLogoGame(jid, sender, senderPn, now, isGroup)
      return
    }

    if (cmd === 'flag') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'stats') {
        const all = args[1] === 'all'
        const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10, type: 'flag' })
        const { text, mentions } = formatLeaderboard(board, all ? '🏆 Guess the Flag — all-time' : '🏆 Guess the Flag — this week')
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }

      if (sub === 'end') {
        await endGame(jid, sender, senderPn, isGroup, now, 'flag')
        return
      }

      await startFlagGame(jid, sender, senderPn, now, isGroup)
      return
    }

    if (cmd === 'riddle') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'stats') {
        const all = args[1] === 'all'
        const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10, type: 'riddle' })
        const { text, mentions } = formatLeaderboard(board, all ? '🏆 Riddle Quest — all-time' : '🏆 Riddle Quest — this week')
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }

      if (sub === 'end' || sub === 'stop') {
        await endGame(jid, sender, senderPn, isGroup, now, 'riddle')
        return
      }

      await startRiddleGame(jid, sender, senderPn, now, isGroup)
      return
    }

    if (cmd === 'tourney') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'stats') {
        const board = db.tournamentStats?.(jid, 10) ?? []
        const { text, mentions } = formatTournamentStats(board)
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }

      // A restart drops the in-memory tournament; try to resume it from the
      // store before acting like nothing is running. Every sub-command except
      // stats (handled above, no game/jid dependency beyond a db read) needs this.
      if (!games.has(jid)) resumeTournament(jid, sender, now)

      if (sub === 'status') {
        const tourney = games.get(jid)
        if (!tourney || gameTypes.get(jid) !== 'tournament') {
          enqueue(jid, { text: `No tournament running here.`, mentions: [], kind: 'misc' })
          return
        }
        const { text, mentions } = render({ type: 'tournament_status', ...tourney.status() })
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (sub === 'end') {
        if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
          enqueue(jid, { text: `Only a group admin can end the tournament.`, mentions: [], kind: 'misc' })
          return
        }
        const tourney = games.get(jid)
        if (!tourney || gameTypes.get(jid) !== 'tournament') {
          enqueue(jid, { text: `No tournament running here.`, mentions: [], kind: 'misc' })
          return
        }
        sendEvents(enqueue, jid, tourney.end(now), undefined, now, db)
        if (tourney.state === 'over') { games.delete(jid); starters.delete(jid); gameTypes.delete(jid) }
        return
      }

      if (sub === 'next') {
        if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
          enqueue(jid, { text: `Only a group admin can advance the tournament.`, mentions: [], kind: 'misc' })
          return
        }
        const tourney = games.get(jid)
        if (!tourney || gameTypes.get(jid) !== 'tournament') {
          enqueue(jid, { text: `No tournament running here. ${PREFIX}tourney start to begin one.`, mentions: [], kind: 'misc' })
          return
        }
        try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
        sendEvents(enqueue, jid, tourney.next(now), undefined, now, db)
        if (tourney.state === 'over') { games.delete(jid); starters.delete(jid); gameTypes.delete(jid) }
        return
      }

      if (sub === 'start') {
        await startTournament(jid, sender, senderPn, args.slice(1), now, isGroup)
        return
      }

      enqueue(jid, { text: `Unknown ${PREFIX}tourney command. Try start, next, status, end or stats.`, mentions: [], kind: 'misc' })
      return
    }

    if (cmd === 'wordle') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'stats') {
        const board = db.tournamentStats?.(jid, 10, 'wordle') ?? []
        const { text, mentions } = formatTournamentStats(board, 'Wordle')
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }

      if (!games.has(jid)) resumeWordleTournament(jid, sender, now)

      if (sub === 'status') {
        const wt = games.get(jid)
        if (!wt || gameTypes.get(jid) !== 'wordle_tournament') {
          enqueue(jid, { text: `No Wordle Tournament running here.`, mentions: [], kind: 'misc' })
          return
        }
        const { text, mentions } = render({ type: 'wordle_tournament_status', ...wt.status() })
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (sub === 'end') {
        if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
          enqueue(jid, { text: `Only a group admin can end the tournament.`, mentions: [], kind: 'misc' })
          return
        }
        const wt = games.get(jid)
        if (!wt || gameTypes.get(jid) !== 'wordle_tournament') {
          enqueue(jid, { text: `No Wordle Tournament running here.`, mentions: [], kind: 'misc' })
          return
        }
        sendEvents(enqueue, jid, wt.end(now), undefined, now, db)
        if (wt.state === 'over') { games.delete(jid); starters.delete(jid); gameTypes.delete(jid) }
        return
      }

      if (sub === 'next') {
        if (!(await mayStartGame(jid, sender, senderPn, isGroup))) {
          enqueue(jid, { text: `Only a group admin can advance the tournament.`, mentions: [], kind: 'misc' })
          return
        }
        const wt = games.get(jid)
        if (!wt || gameTypes.get(jid) !== 'wordle_tournament') {
          enqueue(jid, { text: `No Wordle Tournament running here. ${PREFIX}wordle start to begin one.`, mentions: [], kind: 'misc' })
          return
        }
        try { db?.recordGameActivity?.(jid, now) } catch (e) { /* store failure must never break gameplay */ }
        sendEvents(enqueue, jid, wt.next(now), undefined, now, db)
        if (wt.state === 'over') { games.delete(jid); starters.delete(jid); gameTypes.delete(jid) }
        return
      }

      if (sub === 'start' || MODE_NAMES.has(sub) || sub === '') {
        // /wordle start [tier], or bare /wordle [tier] as a shortcut.
        const tierArgs = sub === 'start' ? args.slice(1) : args
        await startWordleTournament(jid, sender, senderPn, tierArgs, now, isGroup)
        return
      }

      enqueue(jid, { text: `Unknown ${PREFIX}wordle command. Try start, next, status, end or stats.`, mentions: [], kind: 'misc' })
      return
    }

    if (cmd === 'wcg' || cmd === 'wrg') {
      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }
      const sub = args[0]
      if (sub === 'end') {
        await endGame(jid, sender, senderPn, isGroup, now, 'wcg')
        return
      }
      await startGame(jid, sender, senderPn, args, cmd === 'wrg' ? 'random' : 'chain', now, isGroup)
      return
    }

    // unknown command: ignore silently, this group may have other bots
  }

  return {
    async handleMessage({ jid, sender, senderPn, text, isGroup, raw }, now) {
      const parsed = parseCommand(text, PREFIX)
      if (parsed) {
        if (TRACE_LOG) logger?.info(`TRACE: cmd=${parsed.cmd} args=${parsed.args.join(' ')}`)
        if (overCommandLimit(sender, now)) {
          if (TRACE_LOG) logger?.info(`TRACE: DROP rate-limit sender=${sender}`)
          return // silent by design, see overCommandLimit
        }
        const groupAdmins = await groupAdminsFor(jid, isGroup)
        if (TRACE_LOG) logger?.info(`TRACE: groupAdmins n=${groupAdmins?.length ?? 0}`)
        if (!isBotAdminEither(sender, senderPn, isGroup, groupAdmins, jid) && !isOwnerOrGlobalAdmin(sender, senderPn)) {
          if (TRACE_LOG) logger?.info(`TRACE: DENY not-admin sender=${sender} pn=${senderPn} owner=${OWNER}`)
          enqueue(jid, { text: `Only admins and owners can use bot commands.`, mentions: [], kind: 'misc' })
          return
        }
        if (TRACE_LOG) logger?.info(`TRACE: dispatching ${parsed.cmd}`)
        await handleCommand(jid, sender, senderPn, isGroup, parsed.cmd, parsed.args, now, raw)
        if (TRACE_LOG) logger?.info(`TRACE: handled ${parsed.cmd}`)
        return
      }
      if (TRACE_LOG) logger?.info('TRACE: not-a-command')

      const game = games.get(jid)
      if (!game) {
        // Only a bare A-D/1-4 is unambiguous enough to answer. A lone word could
        // be any chat message; nobody types a lone "C" into a group by accident.
        // Gated on recent game activity in THIS chat (ORPHAN_GATE_MS) so a bare
        // "4" typed in some unrelated group the bot merely sits in stays silent —
        // only a chat that was actually mid-game recently gets the notice.
        if (parseAnswer(text)) {
          let lastActivity
          try {
            lastActivity = db.lastGameActivity?.(jid)
          } catch (e) {
            lastActivity = undefined
          }
          if (lastActivity !== undefined && now - lastActivity < ORPHAN_GATE_MS) {
            const last = lastOrphanNotice.get(jid)
            if (last === undefined || now - last >= ORPHAN_NOTICE_MS) {
              lastOrphanNotice.set(jid, now)
              enqueue(jid, { text: `No trivia game running here — the bot restarted. ${PREFIX}trivia to start a new one.`, mentions: [], kind: 'misc' })
            }
          }
        }
        return
      }

      const trimmed = text.trim()
      let events = []
      // One ban check for every path below. A banned player must not be able to
      // join a lobby either: the tournament's own submit() ignores
      // non-contestants, but joining is exactly what made them a contestant,
      // so gating submit alone left the hole open.
      const banned = isBanned(jid, sender, senderPn)

      if (banned) {
        // Silently ignored rather than answered — a ban that argues back every
        // time the player types gives them a way to spam the group.
      } else if (trimmed.toLowerCase() === 'join') {
        events = game.join(sender, now)
      } else if (gameTypes.get(jid) === 'tournament') {
        // Tournament states are registering/awaiting/match/over, not 'playing'.
        if (game.state === 'match' && trimmed.length > 0 && !/\s/.test(trimmed)) {
          events = game.submit(sender, trimmed, now)
        }
      } else if (gameTypes.get(jid) === 'wordle_tournament') {
        // Same registering/awaiting/match/over shape; a guess is a bare word.
        if (game.state === 'match' && trimmed.length > 0 && !/\s/.test(trimmed)) {
          events = game.submit(sender, trimmed, now)
        }
      } else if ((game.state === 'playing' || (gameTypes.get(jid) === 'riddle' && game.state === 'active')) && trimmed.length > 0) {
        const type = gameTypes.get(jid)

        // Single-word games (Word Chain and Scramble) drop multi-word messages entirely.
        // This prevents the bot from spamming "Not a word" in response to normal group
        // conversation while a game is running. Logo Quiz and Trivia answers can contain spaces.
        if (/\s/.test(trimmed) && (type === 'wcg' || type === 'scramble')) {
          // ignore silently
        } else {
          events = game.submit(sender, trimmed, now)
        }
      }

      // Record sender's phone-form JID for leaderboard aggregation.
      // Done before sendEvents so the pnMap is populated when a winner
      // event is processed in the same batch.
      if (senderPn) {
        const meta = gameMeta.get(jid)
        if (meta?.pnMap) meta.pnMap.set(sender, senderPn)
      }

      sendEvents(enqueue, jid, events, raw, now, db)
      if (game.state === 'over') {
        games.delete(jid)
        starters.delete(jid)
        gameTypes.delete(jid)
      }
    },
  }
}
