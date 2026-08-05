// Group-only game commands routed to the engine. No transport connection here.
import { parseCommand } from './commands.js'
import { render } from './render.js'
import { isAdmin, isAdminEither, toNumber } from './admin.js'
import { createGame } from '../engine/game.js'
import { createTriviaGame, QUESTION_COUNT, parseAnswer } from '../engine/trivia.js'
import { fold, isWord } from '../engine/normalize.js'
import { startOfWeek } from '../store/db.js'
import { PREFIX, OWNER, ADMINS } from '../config.js'

const MODE_NAMES = new Set(['easy', 'medium', 'hard'])

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
    }
    const rendered = render(toRender)
    if (rendered) {
      enqueue(jid, {
        text: rendered.text,
        mentions: rendered.mentions,
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

function formatPending(rows) {
  if (rows.length === 0) return { text: `No pending words.`, mentions: [] }
  return { text: `📝 Most-rejected words here:\n${rows.map((r) => `${r.word} x${r.count}`).join('\n')}`, mentions: [] }
}

export function createRouter({ dict, games, enqueue, logger, getGroupAdmins, db, bank = null, resolvePn = () => undefined }) {
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
  const ORPHAN_NOTICE_MS = 5 * 60 * 1000
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

  // Starting a game is now admin-only: group admins, /promote'd bot admins, the
  // OWNER, or a global ADMIN. Everyone can still play, answer and read stats.
  async function mayStartGame(jid, sender, senderPn, isGroup) {
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
    sendEvents(enqueue, jid, game.tick(now), undefined, now, db)
    // Record starter's phone-form JID for leaderboard aggregation
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
    sendEvents(enqueue, jid, game.tick(now), undefined, now, db)
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

  async function handleCommand(jid, sender, senderPn, isGroup, cmd, args, now, raw) {
    if (cmd === 'ping') {
      enqueue(jid, { text: 'pong', mentions: [], kind: 'misc' })
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
        `*📊 SCORES*`,
        `▸ ${PREFIX}stats [all]`,
        `▸ ${PREFIX}trivia stats [all]`,
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
        )
      }
      if (isOwner) {
        lines.push(
          ``,
          `*👑 OWNER*`,
          `▸ ${PREFIX}promote @user`,
          `▸ ${PREFIX}demote @user`,
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
      const { text, mentions } = formatLeaderboard(board, all ? '🏆 All-time' : '🏆 This week')
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

    if (cmd === 'trivia') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'categories') {
        const available = bank ? bank.categories() : []
        enqueue(jid, { text: `*Categories*\n${available.map((c) => `▸ ${c}`).join('\n') || 'none'}\n\n${PREFIX}trivia for a mix of all.`, mentions: [], kind: 'misc' })
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
        if (overCommandLimit(sender, now)) return // silent by design, see overCommandLimit
        await handleCommand(jid, sender, senderPn, isGroup, parsed.cmd, parsed.args, now, raw)
        return
      }

      const game = games.get(jid)
      if (!game) {
        // Only a bare A-D/1-4 is unambiguous enough to answer. A lone word could
        // be any chat message; nobody types a lone "C" into a group by accident.
        if (parseAnswer(text)) {
          const last = lastOrphanNotice.get(jid)
          if (last === undefined || now - last >= ORPHAN_NOTICE_MS) {
            lastOrphanNotice.set(jid, now)
            enqueue(jid, { text: `No trivia game running here — the bot restarted. ${PREFIX}trivia to start a new one.`, mentions: [], kind: 'misc' })
          }
        }
        return
      }

      const trimmed = text.trim()
      let events = []
      if (trimmed.toLowerCase() === 'join') {
        events = game.join(sender, now)
      } else if (game.state === 'playing' && trimmed.length > 0 && !/\s/.test(trimmed)) {
        events = game.submit(sender, trimmed, now)
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
