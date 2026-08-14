// Silences known libsignal console noise (bypasses pino entirely - it writes straight
// to console.error/warn/log/info). Expected after re-pairing: peers still hold Signal
// sessions keyed to older device identities until baileys' retry receipts re-establish
// them. Harmless, but floods the terminal. Gated behind QUIET_SIGNAL_NOISE (config.js).
//
// Exact call sites (node_modules/libsignal/src/*.js), verified against the installed
// version:
//   session_cipher.js:  console.error("Failed to decrypt message with any known session...")
//   session_cipher.js:  console.error("Session error:" + e, e.stack)   // e.g. "...Bad MAC"
//   session_builder.js: console.warn("Closing open session in favor of incoming prekey bundle")
//   session_record.js:  console.info("Closing session:", session)      // + full SessionEntry dump

const NOISE_PATTERNS = [
  (s) => s === 'Failed to decrypt message with any known session...',
  (s) => s.startsWith('Session error:') && s.includes('Bad MAC'),
  (s) => s.startsWith('Session error:') && s.includes('MessageCounterError'),
  (s) => s === 'Closing open session in favor of incoming prekey bundle',
  (s) => s.startsWith('Closing session:'),
  (s) => s.startsWith('Removing old closed session:'),
  (s) => s === 'Decrypted message with closed session.',
  (s) => s === 'Session already open',
  (s) => s.startsWith('Opening session:'),
]

// Exported standalone so it's testable without touching the real console.
export function isSignalNoise(args) {
  const first = args[0]
  if (typeof first !== 'string') return false
  return NOISE_PATTERNS.some((matches) => matches(first))
}

let suppressedCount = 0

// Monotonic, never reset by the interval logger below — only the two patterns
// that mean a genuine decrypt failure (not routine ratchet-rotation noise).
// transport/wa.js reads this to tell "deaf socket" apart from a quiet group.
let decryptFailCount = 0

function isDecryptFail(first) {
  return first === 'Failed to decrypt message with any known session...' ||
    first.startsWith('Session error:')
}

export function getDecryptFailCount() {
  return decryptFailCount
}

// libsignal calls console.info for the "Closing session:" dump, not just
// error/warn/log, so all four are wrapped - anything not matching a pattern
// passes straight through to the real console, untouched.
const METHODS = ['error', 'warn', 'log', 'info']

export function installQuietSignalNoise(logger, { enabled = true, intervalMs = 5 * 60 * 1000 } = {}) {
  if (!enabled) return () => {}

  const real = {}
  for (const method of METHODS) real[method] = console[method]

  for (const method of METHODS) {
    console[method] = (...args) => {
      if (isSignalNoise(args)) {
        suppressedCount++
        if (typeof args[0] === 'string' && isDecryptFail(args[0])) decryptFailCount++
        return
      }
      real[method](...args)
    }
  }

  const timer = setInterval(() => {
    if (suppressedCount > 0) {
      logger.info(`suppressed ${suppressedCount} libsignal decrypt-noise lines (set QUIET_SIGNAL_NOISE=false to see them)`)
      suppressedCount = 0
    }
  }, intervalMs)
  timer.unref?.()

  return function uninstall() {
    clearInterval(timer)
    for (const method of METHODS) console[method] = real[method]
  }
}
