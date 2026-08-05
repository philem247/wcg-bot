import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { useSingleFileAuthState } = await import('./auth.js')

function tmpFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wcg-auth-'))
  return path.join(dir, 'creds.json')
}

const tests = [
  {
    name: 'persist writes atomically (no leftover .tmp file after a normal save)',
    fn: async () => {
      const filePath = tmpFile()
      try {
        const { flush } = useSingleFileAuthState(filePath)
        flush()
        assert.equal(fs.existsSync(filePath), true)
        assert.equal(fs.existsSync(`${filePath}.tmp`), false)
      } finally {
        fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
      }
    },
  },
  {
    name: 'a corrupted session file is preserved as .corrupt-* and the loader starts fresh',
    fn: async () => {
      const filePath = tmpFile()
      try {
        // Write a valid state via the returned handle, then flush to disk.
        const { state, flush } = useSingleFileAuthState(filePath)
        state.keys.set({ 'pre-key': { '1': { some: 'value' } } })
        flush()
        assert.equal(fs.existsSync(filePath), true)

        // Corrupt the file on disk (simulates a crash mid-write on old code).
        fs.writeFileSync(filePath, '{ not valid json')

        // Reopen: should not throw, should start fresh, and should preserve the bad file.
        const reopened = useSingleFileAuthState(filePath)
        assert.equal(reopened.state.creds.registered, false) // fresh initAuthCreds()
        assert.deepEqual(reopened.state.keys.get('pre-key', ['1']), {})

        const dir = path.dirname(filePath)
        const corruptFiles = fs.readdirSync(dir).filter((f) => f.includes('.corrupt-'))
        assert.equal(corruptFiles.length, 1)
      } finally {
        fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
      }
    },
  },
  {
    name: 'app-state-sync-key values come back as proto messages, not plain objects',
    fn: async () => {
      const filePath = tmpFile()
      try {
        const { state } = useSingleFileAuthState(filePath)
        state.keys.set({
          'app-state-sync-key': {
            '1': {
              keyData: new Uint8Array([1, 2, 3]),
              fingerprint: { rawId: 1, currentIndex: 1, deviceIndexes: [0] },
              timestamp: 123,
            },
          },
          session: { a: { some: 'value' } },
        })

        const [syncKey] = Object.values(state.keys.get('app-state-sync-key', ['1']))
        assert.notEqual(Object.getPrototypeOf(syncKey), Object.prototype)

        const session = state.keys.get('session', ['a'])
        assert.deepEqual(session, { a: { some: 'value' } })
      } finally {
        fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
      }
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
