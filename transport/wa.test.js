import assert from 'node:assert/strict'

const { shouldForceReconnect } = await import('./wa.js')

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
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    test.fn()
    console.log(`✓ ${test.name}`)
    passed++
  } catch (e) {
    console.error(`✗ ${test.name}: ${e.message}`)
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
