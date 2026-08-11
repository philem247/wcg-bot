import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeLag } from './lag-monitor.js'

test('computeLag: no drift when tick fires exactly on schedule', () => {
  assert.equal(computeLag(1500, 1000, 500), 0)
})

test('computeLag: positive when the tick fires late (event loop lag)', () => {
  assert.equal(computeLag(2200, 1000, 500), 700)
})

test('computeLag: negative/zero-ish when the tick fires early or on time', () => {
  assert.equal(computeLag(1400, 1000, 500), -100)
})
