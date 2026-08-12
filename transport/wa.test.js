import assert from 'node:assert/strict'

const { shouldForceReconnect, shouldPurgeOnStall, armGraceFallback, withTimeout } = await import('./wa.js')

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
  // Self-heal purge (Change: watchdog trips + traffic is arriving but not
  // dispatching -> ratchet-desync signature -> purge before reconnecting).
  {
    name: 'purge: traffic arriving, no prior purge -> purge',
    fn: () => {
      assert.equal(shouldPurgeOnStall({ msSinceLastNotify: 5_000, timeoutMs: 180_000, msSinceLastPurge: 999_999_999 }), true)
    },
  },
  {
    name: 'purge: no traffic arriving (trafficExpected-only trip) -> do NOT purge',
    fn: () => {
      assert.equal(shouldPurgeOnStall({ msSinceLastNotify: 200_000, timeoutMs: 180_000, msSinceLastPurge: 999_999_999 }), false)
    },
  },
  {
    name: 'purge: traffic arriving but within cooldown of last purge -> do NOT purge (no purge loop)',
    fn: () => {
      assert.equal(shouldPurgeOnStall({ msSinceLastNotify: 5_000, timeoutMs: 180_000, msSinceLastPurge: 60_000 }), false)
    },
  },
  {
    name: 'purge: traffic arriving, exactly at cooldown boundary -> purge',
    fn: () => {
      assert.equal(shouldPurgeOnStall({ msSinceLastNotify: 5_000, timeoutMs: 180_000, msSinceLastPurge: 10 * 60 * 1000 }), true)
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
  // getGroupAdmins hang guard: withTimeout must resolve to the fallback when
  // the raced promise never settles, and pass through a normal resolution.
  {
    name: 'withTimeout: promise never settles -> resolves to fallback within timeout',
    fn: async () => {
      const hung = new Promise(() => {})
      const result = await withTimeout(hung, 10, [])
      assert.deepEqual(result, [])
    },
  },
  {
    name: 'withTimeout: promise resolves normally -> unaffected',
    fn: async () => {
      const result = await withTimeout(Promise.resolve(['ok']), 10, [])
      assert.deepEqual(result, ['ok'])
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
