// Regenerate the trivia question bank. Run: npm run build:trivia
// Downloads Open Trivia DB (CC BY-SA 4.0), decodes entities, discards true/false
// and ambiguous questions, writes data/trivia.json.
//
// Network fetching is untested by design, same as data/build.mjs. The pure
// transforms below ARE tested — they are where bad questions come from.
import { writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// Our seven curated categories -> Open Trivia DB category ids.
// Video games (15), anime (31), cartoons (32), comics (29) and board games (16)
// are deliberately excluded: ~1,650 of OpenTDB's 5,298 questions, enough to
// dominate mixed mode by sheer weight. Football is Phase 2, hence absent.
export const CATEGORY_SOURCES = {
  general: [9],
  science: [17, 19, 30],
  tech: [18],
  entertainment: [11, 12, 14],
  geography: [22],
  history: [23],
}

const ENTITIES = {
  '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&#039;': "'", '&apos;': "'", '&eacute;': 'é', '&egrave;': 'è',
  '&uuml;': 'ü', '&ouml;': 'ö', '&auml;': 'ä', '&ntilde;': 'ñ',
  '&ccedil;': 'ç', '&nbsp;': ' ', '&hellip;': '…', '&rsquo;': '’',
  '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&ndash;': '–', '&mdash;': '—',
}

// OpenTDB double-encodes, so run twice. Numeric entities handled generically.
export function decodeEntities(s) {
  let out = String(s)
  for (let pass = 0; pass < 2; pass++) {
    out = out.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    out = out.replace(/&[a-zA-Z]+;|&#\d+;/g, (m) => ENTITIES[m] ?? m)
  }
  return out
}

export function questionId(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 12)
}

export function normalizeQuestion(raw) {
  if (!raw || raw.type !== 'multiple') return null
  const q = decodeEntities(raw.question ?? '').trim()
  const correct = decodeEntities(raw.correct_answer ?? '').trim()
  const wrong = (raw.incorrect_answers ?? []).map((w) => decodeEntities(w).trim())
  if (!q || !correct || wrong.length !== 3) return null
  if (wrong.some((w) => !w)) return null
  // Answer uniqueness: a duplicated option means two correct answers once shuffled.
  const all = [correct, ...wrong].map((s) => s.toLowerCase())
  if (new Set(all).size !== 4) return null
  return { id: questionId(q), q, correct, wrong }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const MAX_CONSECUTIVE_BACKOFFS = 5 // give up on a category after this many in a row
const BACKOFF_START_MS = 10_000
const BACKOFF_CAP_MS = 120_000

// Session token: ties requests to this run so OpenTDB tracks what it has
// already served us and never repeats a question (response_code 4 = that
// category's pool is exhausted for this token — our stop signal).
async function requestToken() {
  const r = await fetch('https://opentdb.com/api_token.php?command=request')
  if (!r.ok) throw new Error(`${r.status} token request failed`)
  const body = await r.json()
  if (body.response_code !== 0 || !body.token) throw new Error('failed to obtain session token')
  return body.token
}

// One page for a category. Returns the raw response, or 'rate_limited' for
// HTTP 429 / response_code 5 (OpenTDB's own soft rate-limit signal) so the
// caller can back off and retry the same page rather than move on.
async function fetchPage(id, token) {
  const r = await fetch(`https://opentdb.com/api.php?amount=50&category=${id}&type=multiple&token=${token}`)
  if (r.status === 429) return 'rate_limited'
  if (!r.ok) throw new Error(`${r.status} category ${id}`)
  const body = await r.json()
  if (body.response_code === 5) return 'rate_limited'
  return body
}

// Pages a category to exhaustion (response_code 4) via the session token,
// backing off exponentially on rate-limit signals and giving up on the
// category (not the whole run) after too many in a row.
async function fetchCategory(id, token) {
  const out = []
  let backoff = BACKOFF_START_MS
  let consecutiveBackoffs = 0
  for (;;) {
    let body
    try {
      body = await fetchPage(id, token)
    } catch (e) {
      console.log(`  category ${id}: ${e.message}`)
      break
    }
    if (body === 'rate_limited') {
      consecutiveBackoffs++
      if (consecutiveBackoffs >= MAX_CONSECUTIVE_BACKOFFS) {
        console.log(`  category ${id}: giving up after ${consecutiveBackoffs} consecutive rate-limit responses`)
        break
      }
      console.log(`  category ${id}: rate limited, backing off ${backoff}ms`)
      await sleep(backoff)
      backoff = Math.min(backoff * 2, BACKOFF_CAP_MS)
      continue // retry the same page
    }
    consecutiveBackoffs = 0
    backoff = BACKOFF_START_MS
    if (body.response_code === 4) break // token empty: category exhausted
    if (body.response_code !== 0) break // any other non-success: stop
    out.push(...body.results)
    await sleep(5200) // base OpenTDB cadence: one request per 5s per IP
  }
  return out
}

async function main() {
  const token = await requestToken()
  const categories = {}
  for (const [name, ids] of Object.entries(CATEGORY_SOURCES)) {
    const seen = new Set()
    const list = []
    for (const id of ids) {
      const raw = await fetchCategory(id, token)
      for (const r of raw) {
        const q = normalizeQuestion(r)
        if (q && !seen.has(q.id)) {
          seen.add(q.id)
          list.push(q)
        }
      }
    }
    categories[name] = list
    console.log(`${name}: ${list.length}`)
  }

  const bank = {
    generated: new Date().toISOString(),
    attribution: 'Questions from Open Trivia DB (https://opentdb.com), CC BY-SA 4.0',
    categories,
  }
  await writeFile('data/trivia.json', JSON.stringify(bank))
  const total = Object.values(categories).reduce((n, l) => n + l.length, 0)
  console.log(`data/trivia.json: ${total} questions`)
}

// Only run the network build when executed directly, so the test file can import
// the pure helpers without triggering a download.
if (process.argv[1] && process.argv[1].endsWith('build-trivia.mjs')) {
  await main()
}
