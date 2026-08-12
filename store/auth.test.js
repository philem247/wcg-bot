import assert from 'node:assert/strict'
import { useSqliteAuthState } from './auth.js'

const tests = [
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
    name: 'purgeSignalSessions deletes session/sender-key rows but leaves creds intact',
    fn: async () => {
      const { state, purgeSignalSessions, getSessionId } = useSqliteAuthState({ dbPath: ':memory:' })
      const sidBefore = getSessionId()
      await state.keys.set({
        session: { 's-1': { x: 1 } },
        'sender-key': { 'sk-1': { y: 1 } },
        'pre-key': { 'pk-1': { z: 1 } }, // untouched category, sanity check
      })
      const changes = purgeSignalSessions()
      assert.equal(changes, 2, 'deletes exactly the session + sender-key rows')
      assert.deepEqual(await state.keys.get('session', ['s-1']), {})
      assert.deepEqual(await state.keys.get('sender-key', ['sk-1']), {})
      assert.deepEqual(await state.keys.get('pre-key', ['pk-1']), { 'pk-1': { z: 1 } }, 'other categories untouched')
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
