import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { useSqliteAuthState } from '../store/auth.js'

const { shouldForceReconnect, shouldRepairPreKeys, armGraceFallback, withTimeout, wipeAllForReset } = await import('./wa.js')

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
  {
    name: 'wipeAllForReset removes the creds row so the next useSqliteAuthState() generates a fresh identity',
    fn: () => {
      const db = new DatabaseSync(':memory:')
      const before = useSqliteAuthState({ existingDb: db })
      const oldSessionId = before.getSessionId()

      wipeAllForReset(db) // must run before any new auth state is constructed on this db

      const after = useSqliteAuthState({ existingDb: db })
      const newSessionId = after.getSessionId()
      assert.notEqual(newSessionId, oldSessionId, 'fresh creds generated, not the old identity reused')
    },
  },
  {
    name: 'wipeAllForReset does not throw when wa_keys does not exist yet (fresh DB, no table)',
    fn: () => {
      const db = new DatabaseSync(':memory:')
      assert.doesNotThrow(() => wipeAllForReset(db))
    },
  },
  // Deaf-socket detector (Change 3): connected + silent past timeout + at
  // least one libsignal decrypt failure -> repair. Any one condition missing
  // -> false.
  {
    name: 'shouldRepairPreKeys: not connected -> false',
    fn: () => {
      assert.equal(shouldRepairPreKeys({ connected: false, msSinceLastNotify: 999_999, decryptFails: 1, timeoutMs: 900_000 }), false)
    },
  },
  {
    name: 'shouldRepairPreKeys: timeoutMs 0 -> false (disabled)',
    fn: () => {
      assert.equal(shouldRepairPreKeys({ connected: true, msSinceLastNotify: 999_999_999, decryptFails: 1, timeoutMs: 0 }), false)
    },
  },
  {
    name: 'shouldRepairPreKeys: no decrypt failures -> false',
    fn: () => {
      assert.equal(shouldRepairPreKeys({ connected: true, msSinceLastNotify: 999_999, decryptFails: 0, timeoutMs: 900_000 }), false)
    },
  },
  {
    name: 'shouldRepairPreKeys: silence still under timeout -> false',
    fn: () => {
      assert.equal(shouldRepairPreKeys({ connected: true, msSinceLastNotify: 100_000, decryptFails: 1, timeoutMs: 900_000 }), false)
    },
  },
  {
    name: 'shouldRepairPreKeys: connected, past timeout, decrypt failures present -> true',
    fn: () => {
      assert.equal(shouldRepairPreKeys({ connected: true, msSinceLastNotify: 900_001, decryptFails: 3, timeoutMs: 900_000 }), true)
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
