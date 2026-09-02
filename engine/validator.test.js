import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createValidator } from './validator.js'

function tempPaths() {
  const dir = mkdtempSync(join(tmpdir(), 'concentration-validator-'))
  return { cachePath: join(dir, 'cache.json'), approvedPath: join(dir, 'approved.json'), dir }
}

function fakeFetch(reply, { ok = true, status = 200 } = {}) {
  return async () => ({
    ok,
    status,
    json: async () => ({ content: [{ text: reply }] }),
  })
}

test('validator: returns null immediately with no token, never calls fetch', async () => {
  let called = false
  const { cachePath, approvedPath, dir } = tempPaths()
  const v = createValidator({ token: '', cachePath, approvedPath, fetchFn: async () => { called = true } })
  const result = await v.check('Birds', 'Dove')
  assert.equal(result, null)
  assert.equal(called, false)
  rmSync(dir, { recursive: true, force: true })
})

test('validator: a "yes" reply resolves true and is cached to disk', async () => {
  const { cachePath, approvedPath, dir } = tempPaths()
  const v = createValidator({ token: 'tok', model: 'claude-haiku-4-5-20251001', cachePath, approvedPath, fetchFn: fakeFetch('yes') })
  const result = await v.check('Birds', 'Dove')
  assert.equal(result, true)

  const cached = JSON.parse(readFileSync(cachePath, 'utf8'))
  assert.equal(cached['birds::dove'], true)

  const approved = JSON.parse(readFileSync(approvedPath, 'utf8'))
  assert.equal(approved.length, 1)
  assert.equal(approved[0].category, 'Birds')
  assert.equal(approved[0].answer, 'Dove')
  rmSync(dir, { recursive: true, force: true })
})

test('validator: a "no" reply resolves false and is cached, but not recorded as approved', async () => {
  const { cachePath, approvedPath, dir } = tempPaths()
  const v = createValidator({ token: 'tok', cachePath, approvedPath, fetchFn: fakeFetch('no') })
  const result = await v.check('Mammals', 'Unicorn')
  assert.equal(result, false)

  const cached = JSON.parse(readFileSync(cachePath, 'utf8'))
  assert.equal(cached['mammals::unicorn'], false)
  assert.equal(existsSync(approvedPath), false, 'a rejected answer must never touch the approved-review file')
  rmSync(dir, { recursive: true, force: true })
})

test('validator: a cached answer never calls fetch again', async () => {
  const { cachePath, approvedPath, dir } = tempPaths()
  let calls = 0
  const fetchFn = async (...args) => { calls++; return fakeFetch('yes')(...args) }
  const v = createValidator({ token: 'tok', cachePath, approvedPath, fetchFn })
  await v.check('Birds', 'Dove')
  await v.check('Birds', 'dove') // case-insensitive same key
  assert.equal(calls, 1)
  rmSync(dir, { recursive: true, force: true })
})

test('validator: a non-OK response resolves null', async () => {
  const { cachePath, approvedPath, dir } = tempPaths()
  const v = createValidator({ token: 'tok', cachePath, approvedPath, fetchFn: fakeFetch('yes', { ok: false, status: 401 }) })
  const result = await v.check('Birds', 'Dove')
  assert.equal(result, null)
  rmSync(dir, { recursive: true, force: true })
})

test('validator: an ambiguous reply resolves null rather than guessing', async () => {
  const { cachePath, approvedPath, dir } = tempPaths()
  const v = createValidator({ token: 'tok', cachePath, approvedPath, fetchFn: fakeFetch('maybe, hard to say') })
  const result = await v.check('Birds', 'Dove')
  assert.equal(result, null)
  rmSync(dir, { recursive: true, force: true })
})

test('validator: a thrown/aborted fetch resolves null, never throws', async () => {
  const { cachePath, approvedPath, dir } = tempPaths()
  const v = createValidator({ token: 'tok', cachePath, approvedPath, fetchFn: async () => { throw new Error('network down') } })
  const result = await v.check('Birds', 'Dove')
  assert.equal(result, null)
  rmSync(dir, { recursive: true, force: true })
})

test('validator: a slow response past timeoutMs resolves null', async () => {
  const { cachePath, approvedPath, dir } = tempPaths()
  const fetchFn = (url, opts) => new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve({ ok: true, json: async () => ({ content: [{ text: 'yes' }] }) }), 200)
    opts.signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')) })
  })
  const v = createValidator({ token: 'tok', timeoutMs: 20, cachePath, approvedPath, fetchFn })
  const result = await v.check('Birds', 'Dove')
  assert.equal(result, null)
  rmSync(dir, { recursive: true, force: true })
})

test('validator: existing cache/approved files load on construction', async () => {
  const { cachePath, approvedPath, dir } = tempPaths()
  const fs = await import('node:fs')
  fs.writeFileSync(cachePath, JSON.stringify({ 'birds::dove': true }))
  fs.writeFileSync(approvedPath, JSON.stringify([{ category: 'Birds', answer: 'Dove', ts: 1 }]))

  let called = false
  const v = createValidator({ token: 'tok', cachePath, approvedPath, fetchFn: async () => { called = true } })
  const result = await v.check('Birds', 'Dove')
  assert.equal(result, true)
  assert.equal(called, false, 'a pre-seeded cache hit must not call fetch')
  rmSync(dir, { recursive: true, force: true })
})
