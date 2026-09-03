// Concentration's answer validator: an LLM fallback for a locally-rejected
// answer. Never the primary path — engine/concentration.js's own JSON-backed
// matchItem() decides every answer instantly and for free; this only gets
// asked about a 'wrong' rejection, in the background, during the pause that
// already exists after every elimination (see engine/concentration.js).
//
// `fetchFn` is injected (same rule as `now`/`random` elsewhere in engine/) so
// tests never make a real network call. Every failure mode — no token, a
// timeout, a non-200 response, an unparseable reply — resolves to `null`,
// never throws: the caller's contract is "null means leave the elimination
// as it is," so a flaky network can never make gameplay worse than doing
// nothing.
import { readFileSync, writeFileSync, renameSync } from 'node:fs'

const API_URL = 'https://api.anthropic.com/v1/messages'

function loadJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

// Atomic write: a crash mid-writeFileSync on `path` directly would leave a
// truncated/corrupt file, and loadJson()'s silent fallback would then reset
// the whole accumulated map on next read. Write to a tmp file in the same
// dir, then rename over the target — rename is atomic (same pattern as
// data/football/build-career-paths.mjs).
function writeJsonAtomic(path, data) {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, data)
  renameSync(tmp, path)
}

function cacheKey(categoryLabel, answer) {
  return `${categoryLabel.toLowerCase()}::${answer.trim().toLowerCase()}`
}

export function createValidator({
  token,
  model,
  timeoutMs = 3000,
  fetchFn = fetch,
  cachePath = 'data/validator-cache.json',
  approvedPath = 'data/validator-approved.json',
} = {}) {
  const cache = new Map(Object.entries(loadJson(cachePath, {})))
  const approved = loadJson(approvedPath, [])

  function saveCache() {
    try {
      writeJsonAtomic(cachePath, JSON.stringify(Object.fromEntries(cache), null, 2) + '\n')
    } catch {
      // Best-effort — a failed write only costs a re-check next time, never breaks gameplay.
    }
  }

  function recordApproved(categoryLabel, answer) {
    if (approved.some((a) => a.category === categoryLabel && a.answer.toLowerCase() === answer.toLowerCase())) return
    approved.push({ category: categoryLabel, answer, ts: Date.now() })
    try {
      writeJsonAtomic(approvedPath, JSON.stringify(approved, null, 2) + '\n')
    } catch {
      // Best-effort — this file is a human review aid, not gameplay state.
    }
  }

  return {
    // True if this category+answer was already resolved (cache hit) — lets a
    // caller skip charging its own call budget for what will be a free,
    // no-network check() resolution.
    has(categoryLabel, answer) {
      return cache.has(cacheKey(categoryLabel, answer))
    },

    // Returns true/false once resolved from cache or the API, or null if the
    // check could not be made (disabled, timed out, or errored) — the caller
    // must treat null exactly like false (leave the elimination standing).
    async check(categoryLabel, answer) {
      if (!token) return null

      const key = cacheKey(categoryLabel, answer)
      if (cache.has(key)) return cache.get(key)

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const res = await fetchFn(API_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${token}`,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'oauth-2025-04-20',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 8,
            messages: [{
              role: 'user',
              content: `Category: "${categoryLabel}". Proposed answer: "${answer}". Is this a real, correct, unambiguous member of that category? Reply with exactly one word: yes or no.`,
            }],
          }),
        })

        if (!res.ok) return null

        const data = await res.json()
        const text = (data.content?.[0]?.text ?? '').trim().toLowerCase()
        let valid
        if (text.startsWith('yes')) valid = true
        else if (text.startsWith('no')) valid = false
        else return null // ambiguous reply — fail open, don't guess

        cache.set(key, valid)
        saveCache()
        if (valid) recordApproved(categoryLabel, answer)
        return valid
      } catch {
        return null
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
