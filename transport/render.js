// Pure event -> WhatsApp text renderer. No side effects, no sending, no wa.js import.
import { toNumber } from './admin.js'
import { LOBBY_WINDOW_MS } from '../engine/modes.js'

const mention = (jid) => `@${toNumber(jid)}`

// HH:MM:SS, zero-padded (matches upstream `winner` string, e.g. "00:07:19").
function formatElapsed(ms) {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

// `letter`/`minLength` come from the rejected event when the router has enriched it
// (see transport/router.js sendEvents) from the most recent `turn` event for this jid.
// Falls back to '?' if missing rather than inventing a value.
const REJECTION_TEXT = {
  already_used: () => `_This word is already used!_`,
  not_starting_with: (event) => `_${event.word} is not starting with_ ${event.letter ? event.letter.toUpperCase() : '?'}`,
  length_limit: (event) => `_This word is below ${event.minLength ?? '?'} length_`,
  not_in_list: () => `_This word is not in my list_`,
}

export function render(event) {
  switch (event.type) {
    case 'lobby_open': {
      const seconds = Math.round(LOBBY_WINDOW_MS / 1000)
      return {
        text: `🎮 Game starting...\n👥 Need 2 or more players\n⏳ You have ${seconds} seconds to join ⏳\n🧩 Mode ${event.mode}`,
        mentions: [],
      }
    }

    case 'joined':
      return { text: `${mention(event.player)} joined 👏`, mentions: [event.player] }

    case 'lobby_reminder':
      return {
        text: `🎮 Game starts in ${event.secondsLeft} seconds ⏳\nType *join* to play 🙋‍♂️🙋‍♀️\n🧩 Mode ${event.mode}\n\n👥 ${event.count} players joined.`,
        mentions: [],
      }

    case 'terminated':
      return { text: `_Not enough players to start. Game terminated._`, mentions: [] }

    case 'game_start':
      // Upstream omits this message; its lobby countdown flows straight into the first turn.
      return null

    case 'turn': {
      const letterPart = event.letter ? event.letter.toUpperCase() : '?'
      return {
        text: `🎲Turn : ${mention(event.player)}\n🙌Next : ${mention(event.next)}\n🆎Starts with ${letterPart} (at least ${event.minLength} letters)\n🏆Players left : ${event.alive}/${event.total}\n⏳ You have *${event.seconds}* seconds to reply\n📝Total words : ${event.totalWords}`,
        mentions: [event.player, event.next],
      }
    }

    case 'accepted':
      // Silent on every accepted word — the following `turn` event already names the
      // next player, letter and clock. A per-word message is pure noise.
      return null

    case 'rejected': {
      const fn = REJECTION_TEXT[event.reason]
      return { text: fn ? fn(event) : event.reason, mentions: [], quote: true }
    }

    case 'ramp':
      // Deleted: the very next turn_info already shows the new minLength/seconds.
      return null

    case 'eliminated':
      return { text: `Time out ${mention(event.player)}! You are out! 🚫`, mentions: [event.player] }

    case 'winner':
      return {
        text: `${mention(event.player)} won the game 🏆\nWords : *${event.totalWords}*\nLongest word : *${event.longestWord} (${event.longestWord.length})* by ${mention(event.longestBy)} 📚\nTime : *${formatElapsed(event.elapsedMs)}* ⏱️`,
        mentions: [event.player, event.longestBy],
      }

    case 'queued':
      return { text: `🕒 ${mention(event.player)} queued for next game.`, mentions: [event.player] }

    case 'ended':
      return { text: `Game Ends`, mentions: [] }

    default:
      return null
  }
}
