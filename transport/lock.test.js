import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { acquireLock, releaseLock, isProcessAlive } = await import('./lock.js')

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wcg-lock-'))
}

const silentLogger = { warn: () => {} }

const tests = [
  {
    name: 'acquireLock succeeds in a fresh temp dir and writes our pid',
    fn: async () => {
      const dir = tmpDir()
      try {
        acquireLock(dir)
        const contents = fs.readFileSync(path.join(dir, '.lock'), 'utf8')
        assert.equal(contents, String(process.pid))
      } finally {
        releaseLock()
        fs.rmSync(dir, { recursive: true, force: true })
      }
    },
  },
  {
    name: 'a second acquireLock in the same dir fails while the first is held',
    fn: async () => {
      const dir = tmpDir()
      try {
        acquireLock(dir)
        assert.throws(() => acquireLock(dir), /already running/)
      } finally {
        releaseLock()
        fs.rmSync(dir, { recursive: true, force: true })
      }
    },
  },
  {
    name: 'a stale lock naming a dead pid is cleared and acquisition succeeds',
    fn: async () => {
      const dir = tmpDir()
      try {
        // A pid that (almost certainly) does not exist: current pid range plus a
        // large offset. isProcessAlive is exercised for real here, not mocked.
        const deadPid = process.pid + 1_000_000
        fs.writeFileSync(path.join(dir, '.lock'), String(deadPid))
        acquireLock(dir, silentLogger) // should log+clear the stale lock, not throw
        const contents = fs.readFileSync(path.join(dir, '.lock'), 'utf8')
        assert.equal(contents, String(process.pid))
      } finally {
        releaseLock()
        fs.rmSync(dir, { recursive: true, force: true })
      }
    },
  },
  {
    name: 'release removes the lock file',
    fn: async () => {
      const dir = tmpDir()
      try {
        acquireLock(dir)
        const file = path.join(dir, '.lock')
        assert.equal(fs.existsSync(file), true)
        releaseLock()
        assert.equal(fs.existsSync(file), false)
      } finally {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    },
  },
  {
    name: 'isProcessAlive: true for our own pid, false for a made-up dead pid',
    fn: async () => {
      assert.equal(isProcessAlive(process.pid), true)
      assert.equal(isProcessAlive(process.pid + 1_000_000), false)
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
