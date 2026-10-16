import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { useSqliteAuthState } from '../store/auth.js'

const { shouldForceReconnect, shouldRepairPreKeys, shouldForceFlush, armGraceFallback, withTimeout, wipeAllForReset, shouldIgnoreJid, phoneFormOf, resolvePn, isStaleMessage, STALE_MESSAGE_MS, reconnectDelay, nextReplacedStreak, REPLACED_STABLE_MS } = await import('./wa.js')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const tests = [
  {
    name: '440 backoff: consecutive connectionReplaced doubles the wait (capped); other reasons stay at 3s',
    fn: () => {
      assert.equal(reconnectDelay({ reason: 428, streak: 0 }), 3000)
      assert.equal(reconnectDelay({ reason: 440, streak: 1 }), 6000)
      assert.equal(reconnectDelay({ reason: 440, streak: 2 }), 12000)
      assert.equal(reconnectDelay({ reason: 440, streak: 50 }), 10 * 60 * 1000)
    },
  },
  {
    name: '440 streak: grows on quick repeats, resets after a stable connection or any other reason',
    fn: () => {
      assert.equal(nextReplacedStreak({ reason: 440, streak: 0, upMs: 1000 }), 1)
      assert.equal(nextReplacedStreak({ reason: 440, streak: 3, upMs: 1000 }), 4)
      assert.equal(nextReplacedStreak({ reason: 440, streak: 3, upMs: REPLACED_STABLE_MS }), 1)
      assert.equal(nextReplacedStreak({ reason: 428, streak: 3, upMs: 1000 }), 0)
    },
  },
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
  // Stall watchdog: when no game/traffic is expected, the bot must stay idle.
  // Genuinely idle bots in active group chats must NOT be reconnected simply
  // because conversational messages arrive without triggering games.
  {
    name: 'no game running, notify traffic recent, silent past timeout -> do NOT reconnect on idle chatter',
    fn: () => {
      assert.equal(shouldForceReconnect({
        connected: true, trafficExpected: false,
        msSinceLastDispatch: 200_000, msSinceLastNotify: 5_000, timeoutMs: 180_000,
      }), false)
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
  {
    name: 'shouldForceFlush: defused watchdog always returns false',
    fn: () => {
      assert.equal(shouldForceFlush({ isBuffering: true, notifiedSinceConnect: false, timeoutMs: 0 }), false)
      assert.equal(shouldForceFlush({ isBuffering: true, notifiedSinceConnect: false, timeoutMs: 60_000 }), false)
      assert.equal(shouldForceFlush({ isBuffering: false, notifiedSinceConnect: false, timeoutMs: 60_000 }), false)
    },
  },
  // shouldIgnoreJid: skip decrypt for jids the bot has no sender-key for and
  // never will (status broadcasts, newsletters). Must stay false for real
  // traffic: groups, users, LIDs.
  {
    name: 'shouldIgnoreJid: status@broadcast -> true',
    fn: () => {
      assert.equal(shouldIgnoreJid('status@broadcast'), true)
    },
  },
  {
    name: 'shouldIgnoreJid: newsletter jid -> true',
    fn: () => {
      assert.equal(shouldIgnoreJid('120363012345678901@newsletter'), true)
    },
  },
  {
    name: 'shouldIgnoreJid: group jid -> false',
    fn: () => {
      assert.equal(shouldIgnoreJid('120363012345678901@g.us'), false)
    },
  },
  {
    name: 'shouldIgnoreJid: user jid -> false',
    fn: () => {
      assert.equal(shouldIgnoreJid('2348012345678@s.whatsapp.net'), false)
    },
  },
  {
    name: 'shouldIgnoreJid: lid jid -> false',
    fn: () => {
      assert.equal(shouldIgnoreJid('2348012345678@lid'), false)
    },
  },
  {
    name: 'shouldIgnoreJid: undefined/empty -> false, does not throw',
    fn: () => {
      assert.equal(shouldIgnoreJid(undefined), false)
      assert.equal(shouldIgnoreJid(''), false)
    },
  },
  {
    name: 'phoneFormOf: group @lid sender resolved from participantAlt and cached',
    fn: async () => {
      const key = { remoteJid: '1@g.us', participant: '111@lid', participantAlt: '2340000000001@s.whatsapp.net' }
      assert.equal(await phoneFormOf(key, '111@lid', null), '2340000000001@s.whatsapp.net')
      assert.equal(resolvePn('111@lid'), '2340000000001@s.whatsapp.net')
    },
  },
  {
    name: 'phoneFormOf: DM @lid sender resolved from remoteJidAlt',
    fn: async () => {
      const key = { remoteJid: '222@lid', remoteJidAlt: '2340000000002@s.whatsapp.net' }
      assert.equal(await phoneFormOf(key, '222@lid', null), '2340000000002@s.whatsapp.net')
    },
  },
  {
    name: 'phoneFormOf: phone-form sender returned as-is, its lid alt remembered',
    fn: async () => {
      const key = { remoteJid: '1@g.us', participant: '2340000000003@s.whatsapp.net', participantAlt: '333@lid' }
      assert.equal(await phoneFormOf(key, '2340000000003@s.whatsapp.net', null), '2340000000003@s.whatsapp.net')
      assert.equal(resolvePn('333@lid'), '2340000000003@s.whatsapp.net')
    },
  },
  {
    name: 'phoneFormOf: no alt -> falls back to the LID mapping store (device suffix stripped)',
    fn: async () => {
      const lidMapping = { getPNForLID: async (lid) => (lid === '444@lid' ? '2340000000004:12@s.whatsapp.net' : null) }
      assert.equal(await phoneFormOf({ remoteJid: '1@g.us', participant: '444@lid' }, '444@lid', lidMapping), '2340000000004@s.whatsapp.net')
      assert.equal(resolvePn('444@lid'), '2340000000004@s.whatsapp.net')
    },
  },
  {
    name: 'phoneFormOf: unknown lid with a throwing mapping store -> undefined',
    fn: async () => {
      const lidMapping = { getPNForLID: async () => { throw new Error('boom') } }
      assert.equal(await phoneFormOf({ remoteJid: '1@g.us', participant: '555@lid' }, '555@lid', lidMapping), undefined)
    },
  },
  {
    name: 'isStaleMessage: an offline message older than the cutoff is stale; a fresh or undated one is not',
    fn: () => {
      const now = 10_000_000_000
      assert.equal(isStaleMessage({ messageTimestamp: (now - STALE_MESSAGE_MS - 1000) / 1000 }, now), true)
      assert.equal(isStaleMessage({ messageTimestamp: (now - 5000) / 1000 }, now), false)
      assert.equal(isStaleMessage({}, now), false)
      // protobuf Long-like values coerce via Number()
      assert.equal(isStaleMessage({ messageTimestamp: { valueOf: () => (now - 3_600_000) / 1000 } }, now), true)
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
