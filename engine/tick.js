// The one global scheduler. 500 concurrent games cost ONE timer, not 500.

export function createScheduler({ games, onEvents, intervalMs = 1000 }) {
  let timer = null

  function pump(now) {
    for (const [jid, game] of games) {
      const events = game.tick(now)
      if (events.length) onEvents(jid, events)
      if (game.state === 'over') games.delete(jid)
    }
  }

  function start() {
    if (timer) return
    timer = setInterval(() => pump(Date.now()), intervalMs)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { pump, start, stop }
}
