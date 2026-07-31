// Paces outbound sends. WhatsApp bans on send RATE, not CPU — this is the real
// ceiling on how many groups the bot can serve (see PLAN.md phase 4). Every
// event used to go out with an immediate `await send(...)`; this replaces that
// with a per-chat FIFO queue drained under a global rate limit.

// ponytail: fixed cap, not a constructor param — a chat this far behind has
// already lost the plot, no need to make the number tunable.
const QUEUE_CAP = 50

// ponytail: fixed threshold, not a constructor param — same reasoning as QUEUE_CAP.
const COSMETIC_QUEUE_THRESHOLD = 5

export function createOutbox({ sendFn, logger, perChatGapMs = 400, globalPerSecond = 8, maxConcurrent = 4 }) {
  // ponytail: queues/lastSentAt entries are never removed for a jid that goes
  // idle (same unbounded-but-bounded-by-distinct-jids pattern as router.js's
  // `starters` map) — fine at group-chat scale, revisit if jid churn is high.
  const queues = new Map() // jid -> [{ text, mentions, quoted, react, kind, notBefore, attempts }]
  const lastSentAt = new Map() // jid -> ms timestamp of last dispatch
  const inFlightChats = new Set()
  let inFlightCount = 0
  let tokens = globalPerSecond
  let lastRefill = null // null = unset; first pump(now) seeds it without granting a backlog burst
  let droppedCosmetic = 0 // count of 'cosmetic' entries shed at enqueue time, see enqueue()

  function enqueue(jid, { text, mentions, quoted, react, kind, notBefore }) {
    let q = queues.get(jid)
    if (!q) { q = []; queues.set(jid, q) }
    if (kind === 'cosmetic' && q.length > COSMETIC_QUEUE_THRESHOLD) {
      // Chat is already behind - shed cosmetics first, gameplay messages keep flowing.
      droppedCosmetic++
      return
    }
    if (kind === 'turn') {
      // Stale-turn coalescing: only the newest turn prompt still describes the
      // current turn. Never touches other kinds.
      for (let i = q.length - 1; i >= 0; i--) {
        if (q[i].kind === 'turn') q.splice(i, 1)
      }
    }
    q.push({ text, mentions, quoted, react, kind, notBefore, attempts: 0 })
    while (q.length > QUEUE_CAP) {
      // Prefer dropping cosmetics over other non-turn kinds when shedding load.
      let idx = q.findIndex((m) => m.kind === 'cosmetic')
      if (idx === -1) idx = q.findIndex((m) => m.kind !== 'turn')
      if (idx === -1) break // nothing safe to drop (shouldn't happen: turns stay coalesced to <=1)
      q.splice(idx, 1)
      logger?.warn(`outbox: ${jid} queue over cap (${QUEUE_CAP}), dropped oldest non-turn message`)
    }
  }

  // First entry in `q` that is due (no notBefore, or notBefore <= now); -1 if none.
  // A not-yet-due entry must not block due entries behind it, so this scans past it
  // rather than treating the queue head as the only candidate.
  function dueIndex(q, now) {
    for (let i = 0; i < q.length; i++) {
      if (q[i].notBefore === undefined || q[i].notBefore <= now) return i
    }
    return -1
  }

  function pickNext(now) {
    for (const [jid, q] of queues) {
      if (q.length === 0) continue
      if (inFlightChats.has(jid)) continue // never two in flight for the same chat
      const last = lastSentAt.get(jid)
      if (last !== undefined && now - last < perChatGapMs) continue
      if (dueIndex(q, now) === -1) continue
      return jid
    }
    return undefined
  }

  function dispatch(jid, now) {
    const q = queues.get(jid)
    const msg = q.splice(dueIndex(q, now), 1)[0]
    inFlightChats.add(jid)
    inFlightCount++
    lastSentAt.set(jid, now)
    sendFn(jid, { text: msg.text, mentions: msg.mentions, quoted: msg.quoted, react: msg.react })
      .then(() => {
        inFlightChats.delete(jid)
        inFlightCount--
      })
      .catch((e) => {
        inFlightChats.delete(jid)
        inFlightCount--
        if (msg.attempts < 1) {
          logger?.warn({ err: e }, `outbox: send to ${jid} failed, retrying once`)
          msg.attempts++
          // No new timer here: lastSentAt was just set above, so perChatGapMs
          // itself is the "short delay" before the next pump() retries this jid.
          const q2 = queues.get(jid) || (queues.set(jid, []), queues.get(jid))
          q2.unshift(msg)
        } else {
          logger?.error({ err: e }, `outbox: send to ${jid} failed twice, dropping message`)
        }
      })
  }

  // Pure w.r.t. time: takes `now`, never reads the clock itself. Callers (start(),
  // tests) supply it.
  function pump(now) {
    if (lastRefill === null) lastRefill = now
    const elapsed = now - lastRefill
    if (elapsed > 0) {
      tokens = Math.min(globalPerSecond, tokens + (elapsed / 1000) * globalPerSecond)
      lastRefill = now
    }
    while (inFlightCount < maxConcurrent && tokens >= 1) {
      const jid = pickNext(now)
      if (!jid) break
      tokens -= 1
      dispatch(jid, now)
    }
  }

  let timer = null
  function start() {
    if (timer) return
    timer = setInterval(() => pump(Date.now()), 250)
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null }
  }

  function stats() {
    let queued = 0
    for (const q of queues.values()) queued += q.length
    return { queued, inFlight: inFlightCount, droppedCosmetic }
  }

  return { enqueue, pump, start, stop, stats }
}
