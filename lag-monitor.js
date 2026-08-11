// Diagnostics only (see HANDOVER.md phase 7). If the event loop itself stalls
// (blocked by a long synchronous call anywhere in the process), no timer
// fires on time — this is what proves that definitively from the console log.
// Standard technique: schedule a callback every `intervalMs` and compare the
// ACTUAL elapsed time against what was scheduled. Any excess is lag.

// Pure so it's testable without a running timer.
export function computeLag(now, lastTick, intervalMs) {
  return now - lastTick - intervalMs
}

export function startLagMonitor(logger, { intervalMs = 500, thresholdMs = 500 } = {}) {
  let lastTick = Date.now()
  const timer = setInterval(() => {
    const now = Date.now()
    const lag = computeLag(now, lastTick, intervalMs)
    lastTick = now
    if (lag > thresholdMs) {
      logger.warn(`EVENT LOOP LAG: ${lag}ms`)
    }
  }, intervalMs)
  timer.unref?.()
  return timer
}
