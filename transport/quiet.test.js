import assert from 'node:assert/strict'
import { isSignalNoise, installQuietSignalNoise, getDecryptFailCount } from './quiet.js'

const tests = [
  {
    name: 'matches the exact "Failed to decrypt" line',
    fn: () => {
      assert.equal(isSignalNoise(['Failed to decrypt message with any known session...']), true)
    },
  },
  {
    name: 'matches "Session error:" + Bad MAC (concatenated first arg, second arg is stack)',
    fn: () => {
      assert.equal(isSignalNoise(['Session error:Error: Bad MAC', 'fake stack trace']), true)
    },
  },
  {
    name: 'does not match "Session error:" without Bad MAC',
    fn: () => {
      assert.equal(isSignalNoise(['Session error:Error: something else']), false)
    },
  },
  {
    name: 'matches "Closing open session in favor of incoming prekey bundle"',
    fn: () => {
      assert.equal(isSignalNoise(['Closing open session in favor of incoming prekey bundle']), true)
    },
  },
  {
    name: 'matches "Closing session:" with a second-arg object dump',
    fn: () => {
      assert.equal(isSignalNoise(['Closing session:', { some: 'SessionEntry-like object' }]), true)
    },
  },
  {
    name: 'does not match an unrelated error string',
    fn: () => {
      assert.equal(isSignalNoise(['ECONNREFUSED: connect failed']), false)
    },
  },
  {
    name: 'a non-string first argument does not throw and does not match',
    fn: () => {
      assert.equal(isSignalNoise([{ err: 'oops' }]), false)
      assert.equal(isSignalNoise([undefined]), false)
      assert.equal(isSignalNoise([42]), false)
      assert.equal(isSignalNoise([]), false)
    },
  },
  {
    name: 'getDecryptFailCount: counts only genuine decrypt-fail patterns, not other suppressed noise',
    fn: () => {
      const fakeLogger = { info: () => {} }
      const uninstall = installQuietSignalNoise(fakeLogger, { enabled: true, intervalMs: 1_000_000 })
      try {
        const before = getDecryptFailCount()
        console.error('Failed to decrypt message with any known session...')
        console.error('Session error:Error: Bad MAC', 'fake stack')
        console.warn('Closing open session in favor of incoming prekey bundle') // suppressed, but not a decrypt fail
        assert.equal(getDecryptFailCount(), before + 2)
      } finally {
        uninstall()
      }
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
