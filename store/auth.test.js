import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { useSqliteAuthState } from './auth.js'

const tests = [
  {
    name: 'a SESSION_ID marked logged-out is ignored on the next boot: fresh creds, never the dead ones',
    fn: async () => {
      const db = new DatabaseSync(':memory:')
      const first = useSqliteAuthState({ existingDb: db })
      const deadSid = first.getSessionId()
      // Unmarked: the SESSION_ID is honoured.
      assert.equal(useSqliteAuthState({ sessionId: deadSid, existingDb: db }).sessionIdIgnored, false)

      first.markLoggedOut()
      first.wipeAll() // the 401 path: mark survives the wa_keys wipe
      const reboot = useSqliteAuthState({ sessionId: deadSid, existingDb: db })
      assert.equal(reboot.sessionIdIgnored, true)
      assert.notEqual(reboot.getSessionId(), deadSid, 'fresh identity generated')

      // After re-pairing, the stale SESSION_ID must not overwrite the new creds either.
      const newSid = reboot.getSessionId()
      const later = useSqliteAuthState({ sessionId: deadSid, existingDb: db })
      assert.equal(later.getSessionId(), newSid)
      db.close()
    },
  },
  {
    name: 'keys.set batch round-trips all keys across multiple categories in one call',
    fn: async () => {
      const { state } = useSqliteAuthState({ dbPath: ':memory:' })
      await state.keys.set({
        session: { 'a-1': { foo: 1 }, 'a-2': { foo: 2 } },
        'sender-key': { 'b-1': { bar: 3 } },
      })
      const got = await state.keys.get('session', ['a-1', 'a-2'])
      assert.deepEqual(got, { 'a-1': { foo: 1 }, 'a-2': { foo: 2 } })
      const got2 = await state.keys.get('sender-key', ['b-1'])
      assert.deepEqual(got2, { 'b-1': { bar: 3 } })
    },
  },
  {
    name: 'purgePairwiseSessions deletes only session rows, leaving sender-key/creds/pre-key/app-state-sync-key intact',
    fn: async () => {
      const { state, purgePairwiseSessions, getSessionId } = useSqliteAuthState({ dbPath: ':memory:' })
      const sidBefore = getSessionId()
      await state.keys.set({
        session: { 's-1': { x: 1 } },
        'sender-key': { 'sk-1': { y: 1 } },
        'pre-key': { 'pk-1': { z: 1 } }, // untouched category, sanity check
        'app-state-sync-key': { 'ak-1': { keyData: Buffer.from('k') } }, // untouched category, sanity check
      })
      const changes = purgePairwiseSessions()
      assert.equal(changes, 1, 'deletes exactly the session row')
      assert.deepEqual(await state.keys.get('session', ['s-1']), {})
      const senderKey = await state.keys.get('sender-key', ['sk-1'])
      assert.ok(senderKey['sk-1'], 'sender-key untouched — self-heal never removes it')
      assert.deepEqual(await state.keys.get('pre-key', ['pk-1']), { 'pk-1': { z: 1 } }, 'other categories untouched')
      const asyncKey = await state.keys.get('app-state-sync-key', ['ak-1'])
      assert.ok(asyncKey['ak-1'], 'app-state-sync-key untouched')
      assert.equal(getSessionId(), sidBefore, 'creds untouched — no forced re-pair')
    },
  },
  {
    name: 'purgeAllSignalSessions deletes session/sender-key rows but leaves creds intact',
    fn: async () => {
      const { state, purgeAllSignalSessions, getSessionId } = useSqliteAuthState({ dbPath: ':memory:' })
      const sidBefore = getSessionId()
      await state.keys.set({
        session: { 's-1': { x: 1 } },
        'sender-key': { 'sk-1': { y: 1 } },
        'pre-key': { 'pk-1': { z: 1 } }, // untouched category, sanity check
        'app-state-sync-key': { 'ak-1': { keyData: Buffer.from('k') } }, // untouched category, sanity check
      })
      const changes = purgeAllSignalSessions()
      assert.equal(changes, 2, 'deletes exactly the session + sender-key rows')
      assert.deepEqual(await state.keys.get('session', ['s-1']), {})
      assert.deepEqual(await state.keys.get('sender-key', ['sk-1']), {})
      assert.deepEqual(await state.keys.get('pre-key', ['pk-1']), { 'pk-1': { z: 1 } }, 'other categories untouched')
      const asyncKey = await state.keys.get('app-state-sync-key', ['ak-1'])
      assert.ok(asyncKey['ak-1'], 'app-state-sync-key untouched')
      assert.equal(getSessionId(), sidBefore, 'creds untouched — no forced re-pair')
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
