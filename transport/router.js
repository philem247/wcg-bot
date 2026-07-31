// Group-only game commands routed to the engine. No transport connection here.
import { parseCommand } from './commands.js'
import { render } from './render.js'
import { isAdminEither, toNumber } from './admin.js'
import { createGame } from '../engine/game.js'
import { LIVES_WHEN_ON } from '../engine/modes.js'
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
const gameMeta = new Map() // jid -> { mode, type, startedAt, players, eliminated }

// How long the ✅ reaction sits on an accepted word before its clearing (empty-text)
// reaction is due. Baileys clears a reaction by re-sending the same key with text: ''
// (see node_modules/baileys/lib/Utils/messages.js updateMessageWithReaction).
export const REACTION_TTL_MS = 8000

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
  life_lost: 'result',
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
  let reactKey = null
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
    } else if (event.type === 'accepted' && quoted?.key) {
      reactKey = quoted.key
    } else if (event.type === 'lobby_open') {
      gameMeta.set(jid, { mode: event.mode, type: event.gameType, eliminated: [] })
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
        const results = [{ player: event.player, placement: 1 }]
        for (let i = meta.eliminated.length - 1; i >= 0; i--) {
          results.push({ player: meta.eliminated[i], placement: results.length + 1 })
        }
        const accounted = new Set(results.map((r) => r.player))
        for (const p of meta.players ?? []) {
          if (!accounted.has(p)) {
            results.push({ player: p, placement: results.length + 1 })
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
  if (reactKey) {
    enqueue(jid, { react: { text: '✅', key: reactKey }, kind: 'cosmetic' })
    enqueue(jid, { react: { text: '', key: reactKey }, kind: 'cosmetic', notBefore: now + REACTION_TTL_MS })
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

export function createRouter({ dict, games, enqueue, logger, getGroupAdmins, db }) {
  // Engine games don't expose who started them; track it here, mirroring `games`.
  // ponytail: scheduler-driven deletions (timeout/lobby-fail) don't clean this map,
  // it's overwritten on the jid's next game — bounded leak, fix if it ever matters.
  const starters = new Map()

  async function startGame(jid, sender, args, type, now) {
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. Use ${PREFIX}wcg end to stop it first.`, mentions: [], kind: 'misc' })
      return
    }
    const mode = MODE_NAMES.has(args[0]) ? args[0] : undefined
    const lives = db.getSetting(jid, 'lives', 'off') === 'on' ? LIVES_WHEN_ON : 0
    const game = createGame({ mode, type, dict, starter: sender, lives, now, random: Math.random })
    games.set(jid, game)
    starters.set(jid, sender)
    sendEvents(enqueue, jid, game.tick(now), undefined, now, db)
  }

  async function endGame(jid, sender, senderPn, isGroup, now) {
    const game = games.get(jid)
    if (!game) return
    const groupAdmins = await getGroupAdmins(jid)
    const allowed = sender === starters.get(jid) || isAdminEither({ sender, senderPn, isGroup, groupAdmins })
    if (!allowed) {
      enqueue(jid, { text: `Only the player who started the game or a group admin can end it.`, mentions: [], kind: 'misc' })
      return
    }
    sendEvents(enqueue, jid, game.end(now), undefined, now, db)
    if (game.state === 'over') {
      games.delete(jid)
      starters.delete(jid)
    }
  }

  async function handleCommand(jid, sender, senderPn, isGroup, cmd, args, now) {
    if (cmd === 'ping') {
      enqueue(jid, { text: 'pong', mentions: [], kind: 'misc' })
      return
    }

    if (cmd === 'help') {
      enqueue(jid, {
        text: `Commands:\n${PREFIX}ping - check the bot is alive\n${PREFIX}wcg start|easy|medium|hard - start a chain game (group only)\n${PREFIX}wrg start - start a random-letter game (group only)\n${PREFIX}wcg end - end the current game (starter or admin)\n${PREFIX}stats [all] - weekly or all-time leaderboard\n${PREFIX}pending - most-rejected words (admin)\n${PREFIX}addword <word>|all - approve a word (admin)\n${PREFIX}delword <word> - remove a word (admin)\n${PREFIX}lives [on|off] - toggle lives mode (admin to change)\n${PREFIX}admin - who can run admin commands here\njoin - join the lobby\n<word> - submit a word on your turn`,
        mentions: [],
        kind: 'misc',
      })
      return
    }

    if (cmd === 'lives') {
      const sub = args[0]
      if (sub === 'on' || sub === 'off') {
        const groupAdmins = await getGroupAdmins(jid)
        if (!isAdminEither({ sender, senderPn, isGroup, groupAdmins })) {
          enqueue(jid, { text: `Admins only.`, mentions: [], kind: 'misc' })
          return
        }
        db.setSetting(jid, 'lives', sub)
        enqueue(jid, { text: `Lives ${sub}.`, mentions: [], kind: 'misc' })
        return
      }
      const state = db.getSetting(jid, 'lives', 'off')
      enqueue(jid, { text: `Lives: ${state}.`, mentions: [], kind: 'misc' })
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
        const groupAdmins = await getGroupAdmins(jid)
        if (groupAdmins.length > 0) {
          lines.push(`Group: ${groupAdmins.map((a) => `@${toNumber(a)}`).join(' ')}`)
          mentions.push(...groupAdmins)
        } else {
          lines.push(`Group: none`)
        }
      } else {
        lines.push(`Group admins do not apply in a DM.`)
      }
      enqueue(jid, { text: lines.join('\n'), mentions, kind: 'misc' })
      return
    }

    if (cmd === 'stats') {
      const all = args[0] === 'all'
      const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10 })
      const { text, mentions } = formatLeaderboard(board, all ? '🏆 All-time' : '🏆 This week')
      enqueue(jid, { text, mentions, kind: 'misc' })
      return
    }

    if (cmd === 'pending' || cmd === 'addword' || cmd === 'delword') {
      const groupAdmins = await getGroupAdmins(jid)
      if (!isAdminEither({ sender, senderPn, isGroup, groupAdmins })) {
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

    if (cmd === 'wcg' || cmd === 'wrg') {
      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }
      const sub = args[0]
      if (sub === 'end') {
        await endGame(jid, sender, senderPn, isGroup, now)
        return
      }
      await startGame(jid, sender, args, cmd === 'wrg' ? 'random' : 'chain', now)
      return
    }

    // unknown command: ignore silently, this group may have other bots
  }

  return {
    async handleMessage({ jid, sender, senderPn, text, isGroup, raw }, now) {
      const parsed = parseCommand(text, PREFIX)
      if (parsed) {
        await handleCommand(jid, sender, senderPn, isGroup, parsed.cmd, parsed.args, now)
        return
      }

      const game = games.get(jid)
      if (!game) return // hot path: no game here, nothing to do

      const trimmed = text.trim()
      let events = []
      if (trimmed.toLowerCase() === 'join') {
        events = game.join(sender, now)
      } else if (game.state === 'playing' && trimmed.length > 0 && !/\s/.test(trimmed)) {
        events = game.submit(sender, trimmed, now)
      }

      sendEvents(enqueue, jid, events, raw, now, db)
      if (game.state === 'over') {
        games.delete(jid)
        starters.delete(jid)
      }
    },
  }
}
