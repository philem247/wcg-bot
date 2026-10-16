import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const { acquireLock, releaseLock, isProcessAlive, isLikelyThisBot } = await import('./lock.js')

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
    name: 'acquireLock fails while another live bot process holds the lock',
    fn: async () => {
      const dir = tmpDir()
      // A real second process whose cmdline contains "wcg", standing in for a
      // running instance.
      const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)', 'wcg-bot'], { stdio: 'ignore' })
      try {
        await new Promise((resolve) => child.once('spawn', resolve))
        fs.writeFileSync(path.join(dir, '.lock'), String(child.pid))
        assert.throws(() => acquireLock(dir), /already running/)
      } finally {
        child.kill()
        fs.rmSync(dir, { recursive: true, force: true })
      }
    },
  },
  {
    name: 'a lock naming our own pid (recycled after a container restart) is retaken',
    fn: async () => {
      const dir = tmpDir()
      try {
        fs.writeFileSync(path.join(dir, '.lock'), String(process.pid))
        acquireLock(dir, silentLogger)
        assert.equal(fs.readFileSync(path.join(dir, '.lock'), 'utf8'), String(process.pid))
      } finally {
        releaseLock()
        fs.rmSync(dir, { recursive: true, force: true })
      }
    },
  },
  {
    name: 'isLikelyThisBot: matches the bot cmdline, rejects unrelated, holds on unreadable',
    fn: async () => {
      assert.equal(isLikelyThisBot(1, () => '/usr/bin/node\0/app/index.js\0'), true)
      assert.equal(isLikelyThisBot(1, () => 'node\0/home/container/wcg-bot/start.js\0'), true)
      assert.equal(isLikelyThisBot(1, () => '/bin/sh\0-c\0sleep 100\0'), false)
      assert.equal(isLikelyThisBot(1, () => { throw new Error('ENOENT') }), true)
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
  {
    name: 'acquireLock creates the directory if it does not exist and writes our pid',
    fn: async () => {
      const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'wcg-lock-'))
      const dir = path.join(tmpBase, 'nonexistent-dir')
      try {
        assert.equal(fs.existsSync(dir), false)
        acquireLock(dir)
        assert.equal(fs.existsSync(dir), true)
        const contents = fs.readFileSync(path.join(dir, '.lock'), 'utf8')
        assert.equal(contents, String(process.pid))
      } finally {
        releaseLock()
        fs.rmSync(tmpBase, { recursive: true, force: true })
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
