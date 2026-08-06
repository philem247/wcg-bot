// SPARQL client for Wikidata (CC0). Build-time only — the bot never calls this.
// Network code is untested by design, same rule as data/build-trivia.mjs.
export const ENDPOINT = 'https://query.wikidata.org/sparql'

// Wikidata asks every automated client to identify itself. An anonymous or
// browser-spoofing agent gets throttled or blocked outright.
export const USER_AGENT = 'wcg-bot-trivia-build/1.0 (https://github.com/philem247/wcg-bot)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A 4xx other than 429 means the request itself is wrong — a malformed query, a
// bad endpoint. Retrying cannot fix it, and burning the backoff hides the real
// error for ~14s. Only throttling (429) and server faults (5xx) are worth a retry.
class PermanentError extends Error {}

// Serial by design with a delay between calls: WDQS is a shared public service
// and parallel bursts are what gets a client banned.
export async function runQuery(sparql, {
  endpoint = ENDPOINT,
  userAgent = USER_AGENT,
  fetchImpl = fetch,
  delayMs = 1000,
  maxAttempts = 4,
} = {}) {
  const url = `${endpoint}?format=json&query=${encodeURIComponent(sparql)}`
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/sparql-results+json' },
      })
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`WDQS ${res.status}`)
      }
      if (!res.ok) {
        throw new PermanentError(`WDQS ${res.status}: ${(await res.text()).slice(0, 200)}`)
      }
      const json = await res.json()
      await sleep(delayMs)
      return (json.results?.bindings ?? []).map((row) => {
        const out = {}
        for (const [k, v] of Object.entries(row)) out[k] = v.value
        return out
      })
    } catch (e) {
      if (e instanceof PermanentError) throw e
      lastErr = e
      if (attempt === maxAttempts) break
      // Exponential backoff: 2s, 4s, 8s.
      await sleep(1000 * 2 ** attempt)
    }
  }
  throw new Error(`SPARQL query failed after ${maxAttempts} attempts: ${lastErr?.message}`)
}
