// The one global scheduler. 500 concurrent games cost ONE timer, not 500.

export function createScheduler({ games, onEvents, onError, intervalMs = 1000 }) {
  let timer = null

  function pump(now) {
    for (const [jid, game] of games) {
      try {
        const events = game.tick(now)
        if (events.length) onEvents(jid, events)
        if (game.state === 'over') games.delete(jid)
      } catch (e) {
        // A throw here escaped setInterval as an uncaughtException, which
        // index.js treats as fatal — one broken game took down every chat.
        // Drop just that game instead; the rest keep their clocks.
        games.delete(jid)
        onError?.(jid, e)
      }
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
