// Pure event -> WhatsApp text renderer. No side effects, no sending, no wa.js import.
import { toNumber } from './admin.js'
import { LOBBY_WINDOW_MS } from '../engine/modes.js'
import { PREFIX } from '../config.js'

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

const CATEGORY_LABEL = {
  general: '🧠 GENERAL', football: '⚽ FOOTBALL', science: '🔬 SCIENCE',
  tech: '💻 TECH', entertainment: '🎬 ENTERTAINMENT', geography: '🌍 GEOGRAPHY',
  history: '📜 HISTORY', mixed: '🎲 MIXED',
}
const MEDALS = ['🥇', '🥈', '🥉']

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

    case 'trivia_answer': {
      const mentions = []
      let text
      if (event.outcome === 'correct') {
        text = `✅ ${mention(event.player)} got it! — *${event.letter}) ${event.answer}*`
        mentions.push(event.player)
      } else {
        text = `⏱ Time's up! — *${event.letter}) ${event.answer}*`
      }
      return { text, mentions }
    }

    case 'trivia_question': {
      const lines = []
      lines.push(`${CATEGORY_LABEL[event.category] ?? event.category}  ·  *Q${event.index}/${event.total}*  ·  ⏱ *${event.clockSeconds}s*`, '')
      lines.push(`*${event.question}*`, '')
      // Stacked, never columns: WhatsApp's proportional font cannot align columns.
      for (const o of event.options) lines.push(`*${o.letter})*  ${o.text}`)
      lines.push('', '_Reply A, B, C or D_')
      return { text: lines.join('\n'), mentions: [] }
    }

    case 'trivia_over': {
      const lines = []
      const mentions = []
      if (event.standings.length === 0) {
        lines.push('🏁 *FINAL*', '━━━━━━━━━━━━━━━━', '', 'Nobody scored. Brutal.')
        return { text: lines.join('\n'), mentions }
      }
      lines.push('🏁 *FINAL*', '━━━━━━━━━━━━━━━━', '')
      event.standings.forEach((s, i) => {
        lines.push(`${MEDALS[i] ?? '　'} ${mention(s.player)} — *${s.score}*`)
        mentions.push(s.player)
      })
      return { text: lines.join('\n'), mentions }
    }

    case 'trivia_terminated':
      return { text: `Trivia stopped.`, mentions: [] }

    case 'tournament_registration_open':
      return {
        text: `🏆 *TOURNAMENT*\n━━━━━━━━━━━━━━━━\n${CATEGORY_LABEL[event.category] ?? event.category}\nType *join* — registration closes in ${event.seconds}s.`,
        mentions: [],
      }

    case 'tournament_joined':
      return { text: `${mention(event.player)} is in 🙋 (${event.count} joined)`, mentions: [event.player] }

    case 'tournament_cancelled':
      return { text: `🏆 Tournament cancelled — only ${event.count} joined, need at least 2.`, mentions: [] }

    case 'tournament_bracket_ready': {
      const lines = [`🏆 *BRACKET SET* — ${event.players.length} players, ${event.totalRounds} round${event.totalRounds === 1 ? '' : 's'}`, '']
      const mentions = []
      if (event.byes.length > 0) {
        lines.push(`_Byes:_ ${event.byes.map((p) => mention(p)).join(', ')}`)
        mentions.push(...event.byes)
      }
      for (const m of event.matches) {
        lines.push(`▸ ${mention(m.p1)} vs ${mention(m.p2)}`)
        mentions.push(m.p1, m.p2)
      }
      lines.push('', `Admin: run ${PREFIX}tourney next to start the first match.`)
      return { text: lines.join('\n'), mentions }
    }

    case 'tournament_match_start':
      return {
        text: `🏆 *ROUND ${event.round}/${event.totalRounds}*\n${mention(event.p1)} 🆚 ${mention(event.p2)}\n\nHighest score after 10 questions wins.`,
        mentions: [event.p1, event.p2],
      }

    case 'tournament_sudden_death':
      return {
        text: `⚔️ *Tied!* Sudden death — one question at a time until exactly one of you is right.\n${mention(event.p1)} 🆚 ${mention(event.p2)}`,
        mentions: [event.p1, event.p2],
      }

    case 'tournament_sudden_death_repeat':
      return {
        text: `⚔️ Still tied — another sudden-death question.\n${mention(event.p1)} 🆚 ${mention(event.p2)}`,
        mentions: [event.p1, event.p2],
      }

    case 'tournament_match_over': {
      const lines = [
        `🏁 *MATCH RESULT*${event.suddenDeath ? ' (sudden death)' : ''}`,
        `${mention(event.p1)} ${event.scoreP1} — ${event.scoreP2} ${mention(event.p2)}`,
        `Winner: ${mention(event.winner)} 🏆`,
        '',
        event.roundComplete
          ? `Round ${event.round} complete! Admin: run ${PREFIX}tourney next for round ${event.round + 1}.`
          : `Admin: run ${PREFIX}tourney next for the next match.`,
      ]
      return { text: lines.join('\n'), mentions: [event.p1, event.p2, event.winner] }
    }

    case 'tournament_champion':
      return {
        text: `👑 *TOURNAMENT CHAMPION*\n━━━━━━━━━━━━━━━━\n${mention(event.player)} takes it all after ${event.rounds} round${event.rounds === 1 ? '' : 's'}! 🏆🎉`,
        mentions: [event.player],
      }

    case 'tournament_ended':
      return { text: `Tournament cancelled.`, mentions: [] }

    case 'tournament_next_denied': {
      const TEXT = {
        still_registering: `Registration is still open — it closes on its own timer.`,
        match_in_progress: `A match is already in progress.`,
        no_active_tournament: `No tournament to advance here.`,
      }
      return { text: TEXT[event.reason] ?? `Can't advance the tournament right now.`, mentions: [] }
    }

    case 'tournament_status': {
      if (event.state === 'registering') {
        return { text: `🏆 *TOURNAMENT* — registration open\n${event.players.length} joined so far.`, mentions: [] }
      }
      if (event.state === 'over') {
        return event.champion
          ? { text: `🏆 Tournament over. Champion: ${mention(event.champion)}`, mentions: [event.champion] }
          : { text: `🏆 No tournament running here.`, mentions: [] }
      }
      const lines = [`🏆 *BRACKET* — round ${event.round}/${event.totalRounds}`, '']
      const mentions = []
      for (const f of event.fixtures) {
        if (f.type === 'bye') {
          lines.push(`　${mention(f.player)} (bye)`)
          mentions.push(f.player)
        } else {
          const decided = f.winner ? ` → ${mention(f.winner)}` : ''
          lines.push(`▸ ${mention(f.p1)} vs ${mention(f.p2)}${decided}`)
          mentions.push(f.p1, f.p2)
          if (f.winner) mentions.push(f.winner)
        }
      }
      return { text: lines.join('\n'), mentions }
    }

    default:
      return null
  }
}
