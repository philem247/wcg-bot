import assert from 'node:assert/strict'

const { shouldForceReconnect, armGraceFallback } = await import('./wa.js')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const tests = [
  {
    name: 'silent past timeout, traffic expected, connected -> reconnect',
    fn: () => {
      assert.equal(shouldForceReconnect({ connected: true, trafficExpected: true, msSinceLastDispatch: 200_000, timeoutMs: 180_000 }), true)
    },
  },
  {
    name: 'silent past timeout but no traffic expected -> do nothing',
    fn: () => {
      assert.equal(shouldForceReconnect({ connected: true, trafficExpected: false, msSinceLastDispatch: 200_000, timeoutMs: 180_000 }), false)
    },
  },
  {
    name: 'silent past timeout but not connected -> do nothing',
    fn: () => {
      assert.equal(shouldForceReconnect({ connected: false, trafficExpected: true, msSinceLastDispatch: 200_000, timeoutMs: 180_000 }), false)
    },
  },
  {
    name: 'recent traffic -> do nothing',
    fn: () => {
      assert.equal(shouldForceReconnect({ connected: true, trafficExpected: true, msSinceLastDispatch: 5_000, timeoutMs: 180_000 }), false)
    },
  },
  {
    name: 'timeout of 0 -> never reconnect, whatever the other inputs',
    fn: () => {
      assert.equal(shouldForceReconnect({ connected: true, trafficExpected: true, msSinceLastDispatch: 999_999_999, timeoutMs: 0 }), false)
    },
  },
  // Traffic-probe rule (index.js): playing, or lobby with >=1 joined, counts as
  // expected traffic; an empty lobby does not. These feed trafficExpected below.
  {
    name: 'playing, silent past timeout -> reconnect',
    fn: () => {
      const trafficExpected = 'playing' === 'playing' || false
      assert.equal(shouldForceReconnect({ connected: true, trafficExpected, msSinceLastDispatch: 200_000, timeoutMs: 180_000 }), true)
    },
  },
  {
    name: 'lobby with >=1 joined, silent past timeout -> reconnect',
    fn: () => {
      const state = 'lobby', playerCount = 1
      const trafficExpected = state === 'playing' || (state === 'lobby' && playerCount >= 1)
      assert.equal(shouldForceReconnect({ connected: true, trafficExpected, msSinceLastDispatch: 200_000, timeoutMs: 180_000 }), true)
    },
  },
  {
    name: 'lobby with 0 joined, silent past timeout -> do NOT reconnect',
    fn: () => {
      const state = 'lobby', playerCount = 0
      const trafficExpected = state === 'playing' || (state === 'lobby' && playerCount >= 1)
      assert.equal(shouldForceReconnect({ connected: true, trafficExpected, msSinceLastDispatch: 200_000, timeoutMs: 180_000 }), false)
    },
  },
  // Widened watchdog (Change 3): no game running, but messages are visibly
  // ARRIVING and nothing is dispatching — an idle-bot hang, not a quiet group.
  {
    name: 'no game running, notify traffic recent, silent past timeout -> reconnect',
    fn: () => {
      assert.equal(shouldForceReconnect({
        connected: true, trafficExpected: false,
        msSinceLastDispatch: 200_000, msSinceLastNotify: 5_000, timeoutMs: 180_000,
      }), true)
    },
  },
  {
    name: 'no game running, no notify traffic, silent past timeout -> do NOT reconnect (must never regress: a genuinely idle bot stays idle)',
    fn: () => {
      assert.equal(shouldForceReconnect({
        connected: true, trafficExpected: false,
        msSinceLastDispatch: 200_000, msSinceLastNotify: 200_000, timeoutMs: 180_000,
      }), false)
    },
  },
  {
    name: 'notify traffic recent, silent past timeout, timeoutMs 0 -> never reconnects',
    fn: () => {
      assert.equal(shouldForceReconnect({
        connected: true, trafficExpected: false,
        msSinceLastDispatch: 999_999_999, msSinceLastNotify: 0, timeoutMs: 0,
      }), false)
    },
  },
  // Grace-timer fallback (sock.end() -> close may never arrive): armGraceFallback
  // schedules onForce() unless cancelled first.
  {
    name: 'grace fallback: cancelled before it elapses -> onForce never runs (no double-reconnect)',
    fn: async () => {
      let forced = false
      const cancel = armGraceFallback(10, () => { forced = true })
      cancel()
      await sleep(30)
      assert.equal(forced, false)
    },
  },
  {
    name: 'grace fallback: not cancelled -> onForce runs once the window elapses',
    fn: async () => {
      let forced = false
      armGraceFallback(10, () => { forced = true })
      await sleep(30)
      assert.equal(forced, true)
    },
  },
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    await test.fn()
    console.log(`✓ ${test.name}`)
    passed++
  } catch (e) {
    console.error(`✗ ${test.name}: ${e.message}`)
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
