# Trivia Mode Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable multiple-choice trivia race on six categories sourced from Open Trivia DB, plus a redesigned role-aware `/help`.

**Architecture:** Trivia is a sibling game object, not a mode of the existing chain game. `engine/tick.js` only calls `game.tick(now)` and reads `game.state`, so a new object honouring that contract drops into the existing scheduler, outbox and router. Questions are baked offline into `data/trivia.json` by a build script, exactly as `data/build.mjs` bakes `data/words.txt`.

**Tech Stack:** Node 22+ ESM, `node:sqlite`, `node:assert/strict`. No new dependencies.

Spec: [`docs/superpowers/specs/2026-08-05-trivia-mode-design.md`](../specs/2026-08-05-trivia-mode-design.md)

Football is **out of scope** — it is Phase 2. Phase 1 ships six categories and is fully playable without it.

## Global Constraints

- **Never read, write, create, delete or rename anything under `session/`.** It holds live WhatsApp account credentials.
- **Never write to `data/words.txt`, `data/common.txt`, `data/extra.txt` or `data/lang/`.** Read-only. Only `data/trivia.json` is new.
- No new npm dependencies. No changes to `package.json` `dependencies` or `overrides`.
- **No `Date.now()` or `Math.random()` anywhere in `engine/`.** Time arrives via `now` arguments, randomness via an injected `random` function. This is what makes the suite reproducible.
- Every new test file must be added to the `test` script in `package.json`.
- `npm test` must pass with 0 failures at the end of every task. Baseline is **164 passing**.
- Categories are exactly: `general`, `football`, `science`, `tech`, `entertainment`, `geography`, `history`. Mixed mode is `mixed` and is **not** a category.
- Attribution for Open Trivia DB is **CC BY-SA 4.0** and is mandatory.
- Commit after every task.

---

### Task 1: Build script — bake Open Trivia DB into `data/trivia.json`

**Files:**
- Create: `data/build-trivia.mjs`
- Create: `data/build-trivia.test.js`
- Create: `LICENSES.md`
- Modify: `package.json` (add `build:trivia` script, register test)

**Interfaces:**
- Consumes: nothing.
- Produces: `data/trivia.json` with shape
  `{ generated: string, attribution: string, categories: { [name]: Question[] } }`
  where `Question` is `{ id: string, q: string, correct: string, wrong: [string, string, string] }`.
  Exports pure helpers `decodeEntities(s)`, `questionId(q)`, `normalizeQuestion(raw)`.

`id` must be **stable across rebuilds** — it is the key `asked_questions` stores. It is a SHA-1 of the question text, truncated to 12 hex chars.

- [ ] **Step 1: Write the failing test**

Create `data/build-trivia.test.js`:

```js
import assert from 'node:assert/strict'
import { decodeEntities, questionId, normalizeQuestion } from './build-trivia.mjs'

const tests = [
  {
    name: 'decodeEntities: OpenTDB double-encodes HTML entities',
    fn: () => {
      assert.equal(decodeEntities('Who wrote &quot;Hamlet&quot;?'), 'Who wrote "Hamlet"?')
      assert.equal(decodeEntities('Tom &amp; Jerry'), 'Tom & Jerry')
      assert.equal(decodeEntities('5 &lt; 10 &gt; 2'), '5 < 10 > 2')
      assert.equal(decodeEntities('It&#039;s here'), "It's here")
      assert.equal(decodeEntities('caf&eacute;'), 'café')
    },
  },
  {
    name: 'questionId: stable for the same text, different for different text',
    fn: () => {
      const a = questionId('What is the capital of France?')
      assert.equal(a, questionId('What is the capital of France?'), 'must be stable across runs')
      assert.notEqual(a, questionId('What is the capital of Spain?'))
      assert.match(a, /^[0-9a-f]{12}$/)
    },
  },
  {
    name: 'normalizeQuestion: decodes entities in question and all answers',
    fn: () => {
      const out = normalizeQuestion({
        type: 'multiple',
        question: 'Tom &amp; who?',
        correct_answer: 'Jerry &quot;J&quot;',
        incorrect_answers: ['A&amp;B', 'C', 'D'],
      })
      assert.equal(out.q, 'Tom & who?')
      assert.equal(out.correct, 'Jerry "J"')
      assert.deepEqual(out.wrong, ['A&B', 'C', 'D'])
      assert.equal(out.id, questionId('Tom & who?'))
    },
  },
  {
    name: 'normalizeQuestion: rejects true/false and malformed entries',
    fn: () => {
      assert.equal(normalizeQuestion({ type: 'boolean', question: 'x', correct_answer: 'True', incorrect_answers: ['False'] }), null)
      assert.equal(normalizeQuestion({ type: 'multiple', question: 'x', correct_answer: 'a', incorrect_answers: ['b'] }), null, 'needs exactly 3 wrong answers')
      assert.equal(normalizeQuestion({ type: 'multiple', question: '', correct_answer: 'a', incorrect_answers: ['b', 'c', 'd'] }), null)
    },
  },
  {
    name: 'normalizeQuestion: rejects a question whose answer is not unique',
    fn: () => {
      // Duplicate option text means two correct answers once shuffled.
      const out = normalizeQuestion({
        type: 'multiple',
        question: 'Pick one',
        correct_answer: 'Paris',
        incorrect_answers: ['Paris', 'Rome', 'Madrid'],
      })
      assert.equal(out, null, 'a duplicated option makes the answer ambiguous')
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}\n  ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node data/build-trivia.test.js`
Expected: FAIL — `Cannot find module` or `decodeEntities is not a function`.

- [ ] **Step 3: Write the build script**

Create `data/build-trivia.mjs`:

```js
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

const get = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// OpenTDB rate-limits to one request per 5s per IP.
async function fetchCategory(id) {
  const out = []
  const body = await get(`https://opentdb.com/api.php?amount=50&category=${id}&type=multiple`)
  if (body.response_code === 0) out.push(...body.results)
  return out
}

async function main() {
  const categories = {}
  for (const [name, ids] of Object.entries(CATEGORY_SOURCES)) {
    const seen = new Set()
    const list = []
    for (const id of ids) {
      // OpenTDB caps a single request at 50; loop until the pool stops yielding new ids.
      for (let attempt = 0; attempt < 40; attempt++) {
        let raw = []
        try {
          raw = await fetchCategory(id)
        } catch (e) {
          console.log(`  category ${id} attempt ${attempt}: ${e.message}`)
        }
        let added = 0
        for (const r of raw) {
          const q = normalizeQuestion(r)
          if (q && !seen.has(q.id)) {
            seen.add(q.id)
            list.push(q)
            added++
          }
        }
        await sleep(5200)
        if (added === 0) break
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node data/build-trivia.test.js`
Expected: PASS — `5 passed, 0 failed`.

- [ ] **Step 5: Register the script and the test**

In `package.json`, add to `scripts`:

```json
"build:trivia": "node data/build-trivia.mjs",
```

and append ` && node data/build-trivia.test.js` to the existing `test` script value.

- [ ] **Step 6: Create `LICENSES.md`**

```markdown
# Third-party content licenses

## Trivia questions — `data/trivia.json`

Questions sourced from [Open Trivia DB](https://opentdb.com), licensed
**CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/).

Regenerate with `npm run build:trivia`.

## Dictionary — `data/words.txt`, `data/common.txt`, `data/lang/`

Built from public-domain word lists. See `data/build.mjs` for exact sources.
```

- [ ] **Step 7: Generate the real bank**

Run: `npm run build:trivia`

Expected: takes several minutes (OpenTDB rate-limits to one request per 5 seconds). Prints a per-category count then a total. Expect roughly 2,800 questions.

If the network is unavailable, create a minimal `data/trivia.json` by hand so later tasks can proceed — `{"generated":"","attribution":"","categories":{"general":[],"science":[],"tech":[],"entertainment":[],"geography":[],"history":[]}}` — and note that the real build must be run before shipping.

- [ ] **Step 8: Verify the whole suite still passes**

Run: `npm test`
Expected: `169 passed, 0 failed` (164 baseline + 5 new).

- [ ] **Step 9: Commit**

```bash
git add data/build-trivia.mjs data/build-trivia.test.js data/trivia.json LICENSES.md package.json
git commit -m "feat: bake Open Trivia DB question bank at build time

Six curated categories. Video games, anime, cartoons, comics and board games
are excluded — ~1,650 of OpenTDB's 5,298 questions, enough to dominate mixed
mode by weight alone.

Question ids are a truncated SHA-1 of the question text so they stay stable
across rebuilds, which is what makes per-group repeat avoidance meaningful.

Network fetching is untested, same as data/build.mjs. The pure transforms are
tested, including the rejection of questions with duplicate options — those
would otherwise ship with two correct answers and mark one of them wrong."
```

---

### Task 2: `engine/bank.js` — question selection

**Files:**
- Create: `engine/bank.js`
- Create: `engine/bank.test.js`
- Modify: `package.json` (register test)

**Interfaces:**
- Consumes: `data/trivia.json` from Task 1.
- Produces:
  - `CATEGORIES` — `['general','football','science','tech','entertainment','geography','history']`
  - `shuffle(array, random)` — pure Fisher-Yates, returns a new array
  - `loadBank({ path, data })` → `{ attribution, categories(), size(category), pick({ category, count, exclude, random }) }`
  - `pick` returns an array of `{ id, q, correct, wrong }`. `category` is a category name or `'mixed'`. `exclude` is a `Set` of ids. Returns fewer than `count` if the pool is short.

- [ ] **Step 1: Write the failing test**

Create `engine/bank.test.js`:

```js
import assert from 'node:assert/strict'
import { loadBank, shuffle, CATEGORIES } from './bank.js'

// Deterministic stand-in for Math.random: cycles a fixed sequence.
function seeded(seq = [0.1, 0.7, 0.3, 0.9, 0.5]) {
  let i = 0
  return () => seq[i++ % seq.length]
}

const q = (id, n) => ({ id, q: `q${n}`, correct: 'c', wrong: ['w1', 'w2', 'w3'] })

const fixture = {
  attribution: 'test',
  categories: {
    general: [q('g1', 1), q('g2', 2), q('g3', 3)],
    science: [q('s1', 4), q('s2', 5)],
    tech: [],
    entertainment: [q('e1', 6)],
    geography: [],
    history: [],
    football: [],
  },
}

const tests = [
  {
    name: 'CATEGORIES lists all seven, with football included',
    fn: () => {
      assert.equal(CATEGORIES.length, 7)
      assert.ok(CATEGORIES.includes('football'))
      assert.ok(!CATEGORIES.includes('mixed'), 'mixed is a mode, not a category')
    },
  },
  {
    name: 'shuffle: returns a permutation and does not mutate the input',
    fn: () => {
      const src = [1, 2, 3, 4, 5]
      const out = shuffle(src, seeded())
      assert.deepEqual(src, [1, 2, 3, 4, 5], 'input untouched')
      assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5], 'same members')
    },
  },
  {
    name: 'shuffle: identical seeds give identical output',
    fn: () => {
      assert.deepEqual(shuffle([1, 2, 3, 4, 5], seeded()), shuffle([1, 2, 3, 4, 5], seeded()))
    },
  },
  {
    name: 'categories(): only non-empty ones are playable',
    fn: () => {
      const bank = loadBank({ data: fixture })
      assert.deepEqual(bank.categories().sort(), ['entertainment', 'general', 'science'])
    },
  },
  {
    name: 'pick: named category returns only that category, no duplicates',
    fn: () => {
      const bank = loadBank({ data: fixture })
      const got = bank.pick({ category: 'general', count: 3, random: seeded() })
      assert.equal(got.length, 3)
      assert.deepEqual(got.map((x) => x.id).sort(), ['g1', 'g2', 'g3'])
    },
  },
  {
    name: 'pick: exclude keeps already-asked questions out',
    fn: () => {
      const bank = loadBank({ data: fixture })
      const got = bank.pick({ category: 'general', count: 3, exclude: new Set(['g1', 'g2']), random: seeded() })
      assert.deepEqual(got.map((x) => x.id), ['g3'])
    },
  },
  {
    name: 'pick: returns fewer than requested rather than repeating',
    fn: () => {
      const bank = loadBank({ data: fixture })
      const got = bank.pick({ category: 'science', count: 10, random: seeded() })
      assert.equal(got.length, 2)
      assert.equal(new Set(got.map((x) => x.id)).size, 2)
    },
  },
  {
    name: 'pick: mixed draws across categories, not proportional to size',
    fn: () => {
      // general has 3, science 2, entertainment 1. Proportional drawing would
      // give general half of everything; equal weighting must not.
      const bank = loadBank({ data: fixture })
      const got = bank.pick({ category: 'mixed', count: 3, random: seeded() })
      assert.equal(got.length, 3)
      const ids = got.map((x) => x.id)
      assert.equal(new Set(ids).size, 3, 'no duplicates')
      const prefixes = new Set(ids.map((i) => i[0]))
      assert.equal(prefixes.size, 3, 'one from each non-empty category before any repeats')
    },
  },
  {
    name: 'pick: unknown category yields nothing',
    fn: () => {
      const bank = loadBank({ data: fixture })
      assert.deepEqual(bank.pick({ category: 'football', count: 5, random: seeded() }), [])
      assert.deepEqual(bank.pick({ category: 'nonsense', count: 5, random: seeded() }), [])
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}\n  ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node engine/bank.test.js`
Expected: FAIL — `Cannot find module './bank.js'`.

- [ ] **Step 3: Write the implementation**

Create `engine/bank.js`:

```js
// Question bank: loads data/trivia.json and picks unasked questions.
// No Date.now(), no Math.random() — randomness is injected so the suite is
// reproducible, same rule as the rest of engine/.
import { readFileSync } from 'node:fs'

export const CATEGORIES = ['general', 'football', 'science', 'tech', 'entertainment', 'geography', 'history']

// Fisher-Yates. Returns a new array; the caller's is untouched.
export function shuffle(array, random) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

export function loadBank({ path = 'data/trivia.json', data = null } = {}) {
  const bank = data ?? JSON.parse(readFileSync(path, 'utf8'))
  const byCategory = bank.categories ?? {}

  const poolOf = (category, exclude) =>
    (byCategory[category] ?? []).filter((q) => !exclude.has(q.id))

  return {
    get attribution() {
      return bank.attribution ?? ''
    },

    // Only categories that actually have questions are offerable.
    categories() {
      return CATEGORIES.filter((c) => (byCategory[c] ?? []).length > 0)
    },

    size(category) {
      return (byCategory[category] ?? []).length
    },

    pick({ category, count, exclude = new Set(), random }) {
      if (category !== 'mixed') {
        return shuffle(poolOf(category, exclude), random).slice(0, count)
      }

      // Mixed: round-robin one question from each non-empty category in turn.
      // Drawing uniformly from a pooled list would let the largest category
      // supply a third of every game purely for being large.
      const pools = this.categories().map((c) => shuffle(poolOf(c, exclude), random))
      const order = shuffle(pools, random)
      const out = []
      for (let round = 0; out.length < count; round++) {
        let addedThisRound = 0
        for (const pool of order) {
          if (out.length >= count) break
          if (round < pool.length) {
            out.push(pool[round])
            addedThisRound++
          }
        }
        if (addedThisRound === 0) break // every pool exhausted
      }
      return out
    },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node engine/bank.test.js`
Expected: PASS — `9 passed, 0 failed`.

- [ ] **Step 5: Register the test**

Append ` && node engine/bank.test.js` to the `test` script in `package.json`.

- [ ] **Step 6: Verify the whole suite**

Run: `npm test`
Expected: `178 passed, 0 failed`.

- [ ] **Step 7: Commit**

```bash
git add engine/bank.js engine/bank.test.js package.json
git commit -m "feat: add trivia question bank with weighted mixed-mode selection

Mixed mode round-robins one question per category rather than drawing from a
pooled list. Pooled drawing would let entertainment supply roughly a third of
every game purely because it is the largest bank, which is not what 'mixed'
should mean.

Randomness is injected rather than taken from Math.random, matching the rest
of engine/, so selection is reproducible under test."
```

---

### Task 3: `engine/trivia.js` — the game state machine

**Files:**
- Create: `engine/trivia.js`
- Create: `engine/trivia.test.js`
- Modify: `package.json` (register test)

**Interfaces:**
- Consumes: `shuffle` from `engine/bank.js`; question objects `{ id, q, correct, wrong }`.
- Produces:
  - Constants `QUESTION_COUNT = 10`, `CLOCK_SECONDS = 15`, `LETTERS = ['A','B','C','D']`
  - `parseAnswer(text)` → `'A'|'B'|'C'|'D'|null`
  - `createTriviaGame({ questions, category, clockSeconds, now, random })` →
    `{ state, tick(now), submit(player, text, now), join(), end(now) }`
  - Events: `trivia_question`, `trivia_over`, `trivia_terminated`

`state` is `'playing' | 'over'` and `join()` returns `[]`. Both are deliberate: they let the router's existing bare-message path route answers to `submit()` with no modification, and let `engine/tick.js` reap finished games unchanged.

- [ ] **Step 1: Write the failing test**

Create `engine/trivia.test.js`:

```js
import assert from 'node:assert/strict'
import { createTriviaGame, parseAnswer, LETTERS, QUESTION_COUNT, CLOCK_SECONDS } from './trivia.js'

const fixed = (v = 0) => () => v

// With random() === 0 the Fisher-Yates loop swaps every element with index 0,
// which is deterministic — we assert against whatever it produces rather than
// assuming a particular order.
function makeQs(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i}`, q: `Question ${i}?`, correct: `right${i}`, wrong: [`w${i}a`, `w${i}b`, `w${i}c`],
  }))
}

function startGame(n = 3, opts = {}) {
  const g = createTriviaGame({ questions: makeQs(n), category: 'general', now: 0, random: fixed(0), ...opts })
  const ev = g.tick(0)
  return { g, first: ev[0] }
}

const tests = [
  {
    name: 'parseAnswer: accepts a-d and 1-4 in any case, rejects everything else',
    fn: () => {
      assert.equal(parseAnswer('a'), 'A')
      assert.equal(parseAnswer('D'), 'D')
      assert.equal(parseAnswer(' b '), 'B')
      assert.equal(parseAnswer('1'), 'A')
      assert.equal(parseAnswer('4'), 'D')
      assert.equal(parseAnswer('e'), null)
      assert.equal(parseAnswer('5'), null)
      assert.equal(parseAnswer('abc'), null)
      assert.equal(parseAnswer('lol'), null)
      assert.equal(parseAnswer(''), null)
    },
  },
  {
    name: 'first tick emits question 1 with four options and no previous result',
    fn: () => {
      const { first } = startGame(3)
      assert.equal(first.type, 'trivia_question')
      assert.equal(first.index, 1)
      assert.equal(first.total, 3)
      assert.equal(first.category, 'general')
      assert.equal(first.options.length, 4)
      assert.equal(first.previous, undefined, 'nothing precedes the first question')
      assert.equal(first.endsAt, CLOCK_SECONDS * 1000)
      assert.deepEqual(first.options.map((o) => o.letter), LETTERS)
    },
  },
  {
    name: 'options contain the correct answer exactly once',
    fn: () => {
      const { first } = startGame(1)
      const texts = first.options.map((o) => o.text)
      assert.equal(texts.filter((t) => t === 'right0').length, 1)
      assert.equal(new Set(texts).size, 4)
    },
  },
  {
    name: 'correct answer scores and advances immediately, carrying the result forward',
    fn: () => {
      const { g, first } = startGame(3)
      const correct = first.options.find((o) => o.text === 'right0').letter
      const ev = g.submit('alice', correct, 1000)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'trivia_question')
      assert.equal(ev[0].index, 2, 'advanced without waiting out the clock')
      assert.deepEqual(ev[0].previous, { outcome: 'correct', player: 'alice', letter: correct, answer: 'right0' })
    },
  },
  {
    name: 'wrong answer emits nothing and does not advance',
    fn: () => {
      const { g, first } = startGame(3)
      const wrong = first.options.find((o) => o.text !== 'right0').letter
      assert.deepEqual(g.submit('bob', wrong, 1000), [], 'silent — no scolding in a busy group')
      assert.equal(g.state, 'playing')
    },
  },
  {
    name: 'a player gets one attempt per question: a wrong answer locks them out',
    fn: () => {
      const { g, first } = startGame(3)
      const correct = first.options.find((o) => o.text === 'right0').letter
      const wrong = first.options.find((o) => o.text !== 'right0').letter
      g.submit('bob', wrong, 1000)
      assert.deepEqual(g.submit('bob', correct, 1100), [], 'second attempt ignored')
      assert.equal(g.state, 'playing', 'still on question 1')
    },
  },
  {
    name: 'spamming every letter cannot win the point',
    fn: () => {
      const { g, first } = startGame(3)
      const results = LETTERS.map((l) => g.submit('cheat', l, 1000))
      assert.equal(results.filter((r) => r.length > 0).length, results[0].length > 0 ? 1 : 0)
      // Only the very first submission counted; if it was wrong, none advanced.
      const advanced = results.filter((r) => r.length > 0)
      assert.ok(advanced.length <= 1, 'at most the first submission can score')
    },
  },
  {
    name: 'non-answer chatter is ignored entirely',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.submit('alice', 'lol what', 1000), [])
      assert.deepEqual(g.submit('alice', 'hello', 1100), [])
      // Chatter must not consume the player's one attempt.
      const q = g.tick(CLOCK_SECONDS * 1000)
      assert.equal(q[0].previous.outcome, 'timeout')
    },
  },
  {
    name: 'clock expiry reveals the answer and advances',
    fn: () => {
      const { g, first } = startGame(3)
      const correctText = 'right0'
      const correctLetter = first.options.find((o) => o.text === correctText).letter
      const ev = g.tick(CLOCK_SECONDS * 1000)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].index, 2)
      assert.deepEqual(ev[0].previous, { outcome: 'timeout', letter: correctLetter, answer: correctText })
    },
  },
  {
    name: 'tick before the deadline emits nothing',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.tick(CLOCK_SECONDS * 1000 - 1), [])
    },
  },
  {
    name: 'game ends after the last question with ranked standings',
    fn: () => {
      const { g } = startGame(2)
      let ev = g.tick(CLOCK_SECONDS * 1000)      // Q1 times out -> Q2
      assert.equal(ev[0].index, 2)
      const correct = ev[0].options.find((o) => o.text === 'right1').letter
      ev = g.submit('alice', correct, 20_000)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].type, 'trivia_over')
      assert.equal(g.state, 'over')
      assert.deepEqual(ev[0].standings, [{ player: 'alice', score: 1 }])
      assert.equal(ev[0].category, 'general')
      assert.equal(ev[0].total, 2)
    },
  },
  {
    name: 'standings rank by score, ties broken by who scored first',
    fn: () => {
      const g = createTriviaGame({ questions: makeQs(3), category: 'general', now: 0, random: fixed(0) })
      let ev = g.tick(0)
      const letterFor = (q, text) => q.options.find((o) => o.text === text).letter
      ev = g.submit('bob', letterFor(ev[0], 'right0'), 1000)      // bob scores at 1000
      ev = g.submit('alice', letterFor(ev[0], 'right1'), 2000)    // alice scores at 2000
      ev = g.submit('bob', letterFor(ev[0], 'right2'), 3000)      // bob scores again
      assert.equal(ev[0].type, 'trivia_over')
      assert.deepEqual(ev[0].standings, [
        { player: 'bob', score: 2 },
        { player: 'alice', score: 1 },
      ])
    },
  },
  {
    name: 'players who never answered are absent from standings',
    fn: () => {
      const { g, first } = startGame(1)
      const wrong = first.options.find((o) => o.text !== 'right0').letter
      const ev = g.submit('ghost', wrong, 1000)
      assert.deepEqual(ev, [], 'wrong answer is silent')
      const over = g.tick(CLOCK_SECONDS * 1000)
      assert.equal(over[0].type, 'trivia_over')
      assert.deepEqual(over[0].standings, [], 'nobody scored, nobody ranks')
    },
  },
  {
    name: 'end() terminates without standings and marks the game over',
    fn: () => {
      const { g } = startGame(5)
      const ev = g.end(5000)
      assert.deepEqual(ev, [{ type: 'trivia_terminated' }])
      assert.equal(g.state, 'over')
      assert.deepEqual(g.tick(99_999), [], 'no events after it is over')
      assert.deepEqual(g.submit('alice', 'a', 99_999), [])
    },
  },
  {
    name: 'join() is a no-op so the router bare-message path needs no branch',
    fn: () => {
      const { g } = startGame(3)
      assert.deepEqual(g.join('alice', 0), [])
    },
  },
  {
    name: 'identical seeds produce identical games',
    fn: () => {
      const a = createTriviaGame({ questions: makeQs(3), category: 'general', now: 0, random: fixed(0.42) })
      const b = createTriviaGame({ questions: makeQs(3), category: 'general', now: 0, random: fixed(0.42) })
      assert.deepEqual(a.tick(0), b.tick(0))
    },
  },
  {
    name: 'QUESTION_COUNT and CLOCK_SECONDS are the documented defaults',
    fn: () => {
      assert.equal(QUESTION_COUNT, 10)
      assert.equal(CLOCK_SECONDS, 15)
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}\n  ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node engine/trivia.test.js`
Expected: FAIL — `Cannot find module './trivia.js'`.

- [ ] **Step 3: Write the implementation**

Create `engine/trivia.js`:

```js
// Trivia race. Bot posts a question, everyone answers, first correct takes the
// point and the game advances immediately.
//
// Race rather than survival because in a WhatsApp group every answer is public
// the moment it is sent — any format where players answer the same question
// independently is trivially copied. A race is immune: being first IS the game.
//
// No Date.now(), no Math.random(). Time arrives via `now`, randomness via
// `random`. Same contract as engine/game.js.
import { shuffle } from './bank.js'

export const QUESTION_COUNT = 10
export const CLOCK_SECONDS = 15
export const LETTERS = ['A', 'B', 'C', 'D']

const DIGITS = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }

// Only a bare letter or digit counts as an answer. Everything else is chatter
// and must be ignored — people talk in these groups, and a bot that replies to
// every message is unusable.
export function parseAnswer(text) {
  const t = String(text ?? '').trim().toUpperCase()
  if (LETTERS.includes(t)) return t
  return DIGITS[t] ?? null
}

export function createTriviaGame({ questions, category, clockSeconds = CLOCK_SECONDS, now = 0, random = () => 0.5 }) {
  const clockMs = clockSeconds * 1000
  const scores = new Map()      // player -> points
  const scoredAt = new Map()    // player -> ms of their first correct answer, for tie-breaks

  let state = 'playing'
  let index = -1                // index of the question currently being asked
  let current = null            // { id, q, options, correctLetter, correctText }
  let deadline = 0
  let answered = new Set()      // players who have used their one attempt this question

  function build(q) {
    const texts = shuffle([q.correct, ...q.wrong], random)
    return {
      id: q.id,
      q: q.q,
      options: texts.map((text, i) => ({ letter: LETTERS[i], text })),
      correctLetter: LETTERS[texts.indexOf(q.correct)],
      correctText: q.correct,
    }
  }

  function standings() {
    return Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score || scoredAt.get(a.player) - scoredAt.get(b.player))
  }

  function finish() {
    state = 'over'
    return [{ type: 'trivia_over', category, total: questions.length, standings: standings() }]
  }

  // Move to the next question, attaching how the previous one resolved so the
  // renderer can produce a single message instead of two.
  function advance(at, previous) {
    index++
    if (index >= questions.length) return finish()
    current = build(questions[index])
    deadline = at + clockMs
    answered = new Set()
    const event = {
      type: 'trivia_question',
      index: index + 1,
      total: questions.length,
      category,
      question: current.q,
      options: current.options,
      endsAt: deadline,
      clockSeconds,
    }
    if (previous) event.previous = previous
    return [event]
  }

  return {
    get state() {
      return state
    },

    tick(at) {
      if (state === 'over') return []
      if (index === -1) return advance(at)
      if (at < deadline) return []
      return advance(at, { outcome: 'timeout', letter: current.correctLetter, answer: current.correctText })
    },

    submit(player, text, at) {
      if (state === 'over' || !current) return []
      const letter = parseAnswer(text)
      if (!letter) return []            // chatter: does not consume the attempt
      if (answered.has(player)) return [] // one attempt each, right or wrong
      answered.add(player)
      if (letter !== current.correctLetter) return []
      scores.set(player, (scores.get(player) ?? 0) + 1)
      if (!scoredAt.has(player)) scoredAt.set(player, at)
      return advance(at, { outcome: 'correct', player, letter, answer: current.correctText })
    },

    // No lobby: answering is joining. Present so the router's existing
    // bare-message path works unchanged.
    join() {
      return []
    },

    end() {
      if (state === 'over') return []
      state = 'over'
      return [{ type: 'trivia_terminated' }]
    },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node engine/trivia.test.js`
Expected: PASS — `17 passed, 0 failed`.

- [ ] **Step 5: Register the test**

Append ` && node engine/trivia.test.js` to the `test` script in `package.json`.

- [ ] **Step 6: Verify the whole suite**

Run: `npm test`
Expected: `195 passed, 0 failed`.

- [ ] **Step 7: Commit**

```bash
git add engine/trivia.js engine/trivia.test.js package.json
git commit -m "feat: add trivia race state machine

First correct answer takes the point and advances immediately — no reason to
wait out a clock nobody can still win.

Two rules that matter in a busy group: only a bare letter or digit counts as
an answer, so chatter is ignored rather than scolded; and each player gets one
attempt per question, without which anyone spams a b c d and is guaranteed the
point.

state is 'playing'|'over' and join() is a no-op so the router's existing
bare-message path routes answers to submit() with no modification, and
engine/tick.js reaps finished games unchanged."
```

---

### Task 4: `store/db.js` — repeat avoidance and separate leaderboards

**Files:**
- Modify: `store/db.js`
- Modify: `store/db.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces on the object returned by `openDb`:
  - `markAsked(jid, category, ids, ts)` — records question ids as seen by a group
  - `askedIds(jid, category)` → `Set<string>`
  - `clearAsked(jid, category)` — wipes that group's history for one category
  - `leaderboard({ jid, since, limit, type })` — `type` is `'trivia'` or `'chain'`;
    `'chain'` means every non-trivia game.

- [ ] **Step 1: Write the failing test**

Append these cases to the `tests` array in `store/db.test.js`, before the closing `]`:

```js
  {
    name: 'asked_questions: markAsked then askedIds round-trips, scoped per category',
    fn: () => {
      const db = openDb(':memory:')
      db.markAsked('jid-a', 'general', ['q1', 'q2'], 1000)
      db.markAsked('jid-a', 'science', ['q9'], 1000)
      assert.deepEqual([...db.askedIds('jid-a', 'general')].sort(), ['q1', 'q2'])
      assert.deepEqual([...db.askedIds('jid-a', 'science')], ['q9'])
      assert.equal(db.askedIds('jid-b', 'general').size, 0, 'scoped per group')
      db.close()
    },
  },
  {
    name: 'asked_questions: re-marking the same id does not throw or duplicate',
    fn: () => {
      const db = openDb(':memory:')
      db.markAsked('jid-a', 'general', ['q1'], 1000)
      db.markAsked('jid-a', 'general', ['q1', 'q2'], 2000)
      assert.deepEqual([...db.askedIds('jid-a', 'general')].sort(), ['q1', 'q2'])
      db.close()
    },
  },
  {
    name: 'asked_questions: clearAsked recycles one category without touching others',
    fn: () => {
      const db = openDb(':memory:')
      db.markAsked('jid-a', 'general', ['q1'], 1000)
      db.markAsked('jid-a', 'science', ['q9'], 1000)
      db.clearAsked('jid-a', 'general')
      assert.equal(db.askedIds('jid-a', 'general').size, 0)
      assert.deepEqual([...db.askedIds('jid-a', 'science')], ['q9'])
      db.close()
    },
  },
  {
    name: 'leaderboard: trivia and chain results never appear on each other s board',
    fn: () => {
      const db = openDb(':memory:')
      db.recordGame({
        jid: 'g', mode: 'easy', type: 'chain', startedAt: 0, endedAt: 1000, words: 5,
        results: [{ player: 'wordy', placement: 1 }, { player: 'other', placement: 2 }],
      })
      db.recordGame({
        jid: 'g', mode: 'general', type: 'trivia', startedAt: 0, endedAt: 1000, words: 10,
        results: [{ player: 'quizzy', placement: 1 }, { player: 'other', placement: 2 }],
      })

      const chain = db.leaderboard({ jid: 'g', since: 0, type: 'chain' })
      const trivia = db.leaderboard({ jid: 'g', since: 0, type: 'trivia' })

      assert.deepEqual(chain.map((r) => r.player).sort(), ['other', 'wordy'])
      assert.deepEqual(trivia.map((r) => r.player).sort(), ['other', 'quizzy'])
      assert.equal(chain.find((r) => r.player === 'other').games, 1, 'one chain game only')
      assert.equal(trivia.find((r) => r.player === 'other').games, 1, 'one trivia game only')
      db.close()
    },
  },
  {
    name: 'leaderboard: chain board includes legacy rows recorded as type random',
    fn: () => {
      const db = openDb(':memory:')
      db.recordGame({
        jid: 'g', mode: 'easy', type: 'random', startedAt: 0, endedAt: 1000, words: 5,
        results: [{ player: 'wordy', placement: 1 }],
      })
      const chain = db.leaderboard({ jid: 'g', since: 0, type: 'chain' })
      assert.deepEqual(chain.map((r) => r.player), ['wordy'], 'chain means every non-trivia type')
      db.close()
    },
  },
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node store/db.test.js`
Expected: FAIL — `db.markAsked is not a function`.

- [ ] **Step 3: Add the table**

In `store/db.js`, inside the `db.exec(...)` block that creates the other tables, add:

```sql
    CREATE TABLE IF NOT EXISTS asked_questions (
      jid TEXT NOT NULL, category TEXT NOT NULL, qid TEXT NOT NULL, ts INTEGER NOT NULL,
      PRIMARY KEY (jid, qid)
    );
```

The primary key is `(jid, qid)` and not `(jid, category, qid)` on purpose: a question seen in mixed mode should not be served again under its own category to the same group.

- [ ] **Step 4: Add the prepared statements**

Next to the other `db.prepare(...)` calls:

```js
  const stmtMarkAsked = db.prepare(
    'INSERT OR IGNORE INTO asked_questions (jid, category, qid, ts) VALUES (?, ?, ?, ?)'
  )
  const stmtAskedIds = db.prepare(
    'SELECT qid FROM asked_questions WHERE jid = ? AND category = ?'
  )
  const stmtClearAsked = db.prepare(
    'DELETE FROM asked_questions WHERE jid = ? AND category = ?'
  )
```

- [ ] **Step 5: Replace the leaderboard query with a type-aware pair**

Replace the existing `stmtSelectResults` declaration with two statements. The
existing one selects from `results` alone; the board must now join `games` to
reach `type`:

```js
  const stmtSelectResultsTrivia = db.prepare(`
    SELECT COALESCE(r.player_pn, r.player) AS player, r.placement, r.player_count
    FROM results r JOIN games g ON g.id = r.game_id
    WHERE r.jid = ? AND r.ended_at >= ? AND g.type = 'trivia'
    ORDER BY player
  `)
  const stmtSelectResultsChain = db.prepare(`
    SELECT COALESCE(r.player_pn, r.player) AS player, r.placement, r.player_count
    FROM results r JOIN games g ON g.id = r.game_id
    WHERE r.jid = ? AND r.ended_at >= ? AND g.type IS NOT 'trivia'
    ORDER BY player
  `)
```

`IS NOT` rather than `!=` because SQL `!=` is never true against `NULL`, and any
pre-existing row with a null `type` belongs on the chain board.

- [ ] **Step 6: Update `leaderboard` and add the three methods**

Change the first line of `leaderboard` from `const rows = stmtSelectResults.all(jid, since)` to accept and use the type:

```js
    leaderboard({ jid, since = 0, limit = 10, type = 'chain' }) {
      const stmt = type === 'trivia' ? stmtSelectResultsTrivia : stmtSelectResultsChain
      const rows = stmt.all(jid, since)
```

The rest of the method body is unchanged. Then add these three methods alongside `getSetting`/`setSetting`:

```js
    markAsked(jid, category, ids, ts) {
      for (const id of ids) stmtMarkAsked.run(jid, category, id, ts)
    },

    askedIds(jid, category) {
      return new Set(stmtAskedIds.all(jid, category).map((r) => r.qid))
    },

    clearAsked(jid, category) {
      stmtClearAsked.run(jid, category)
    },
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `node store/db.test.js`
Expected: PASS — `21 passed, 0 failed`.

- [ ] **Step 8: Verify the whole suite**

Run: `npm test`
Expected: `200 passed, 0 failed`.

If `transport/router.test.js` fails here, it is because a call site passes no `type`
to `leaderboard`. The default is `'chain'`, which is the correct behaviour for
existing `/stats` calls — investigate rather than changing the default.

- [ ] **Step 9: Commit**

```bash
git add store/db.js store/db.test.js
git commit -m "feat: add trivia repeat avoidance and split the two leaderboards

asked_questions tracks what each group has already seen, keyed (jid, qid) so a
question served in mixed mode is not served again under its own category.

leaderboard() now takes a type. The previous query read from results alone and
had no type filter at all, so trivia results would have started appearing on
the word chain board silently. Uses IS NOT rather than != because SQL != never
matches NULL, and any legacy row with a null type belongs on the chain board."
```

---

### Task 5: `transport/render.js` — trivia message rendering

**Files:**
- Modify: `transport/render.js`
- Modify: `transport/render.test.js`

**Interfaces:**
- Consumes: `trivia_question`, `trivia_over`, `trivia_terminated` events from Task 3.
- Produces: rendered `{ text, mentions }`. No new exports.

Options are stacked one per line, never in columns: WhatsApp uses a proportional font, so columns cannot align and look ragged differently on every device.

- [ ] **Step 1: Write the failing test**

Append to the `tests` array in `transport/render.test.js`:

```js
  {
    name: 'trivia_question: first question has no result header',
    fn: () => {
      const out = render({
        type: 'trivia_question', index: 1, total: 10, category: 'general',
        question: 'Capital of France?', clockSeconds: 15, endsAt: 15000,
        options: [
          { letter: 'A', text: 'Paris' }, { letter: 'B', text: 'Rome' },
          { letter: 'C', text: 'Madrid' }, { letter: 'D', text: 'Berlin' },
        ],
      })
      assert.ok(out.text.includes('*Q1/10*'))
      assert.ok(out.text.includes('*Capital of France?*'))
      assert.ok(out.text.includes('*A)*  Paris'))
      assert.ok(out.text.includes('*D)*  Berlin'))
      assert.ok(!out.text.includes('━'), 'no divider without a previous result')
      assert.deepEqual(out.mentions, [])
    },
  },
  {
    name: 'trivia_question: a correct previous result mentions the scorer',
    fn: () => {
      const out = render({
        type: 'trivia_question', index: 2, total: 10, category: 'football',
        question: 'Who?', clockSeconds: 15, endsAt: 30000,
        options: [
          { letter: 'A', text: 'a' }, { letter: 'B', text: 'b' },
          { letter: 'C', text: 'c' }, { letter: 'D', text: 'd' },
        ],
        previous: { outcome: 'correct', player: '234111@s.whatsapp.net', letter: 'B', answer: 'Lille' },
      })
      assert.ok(out.text.startsWith('✅'))
      assert.ok(out.text.includes('@234111'))
      assert.ok(out.text.includes('*B)* Lille'))
      assert.ok(out.text.includes('━'), 'divider separates result from question')
      assert.deepEqual(out.mentions, ['234111@s.whatsapp.net'])
    },
  },
  {
    name: 'trivia_question: a timed-out previous result reveals the answer and mentions nobody',
    fn: () => {
      const out = render({
        type: 'trivia_question', index: 3, total: 10, category: 'science',
        question: 'Q?', clockSeconds: 15, endsAt: 45000,
        options: [
          { letter: 'A', text: 'a' }, { letter: 'B', text: 'b' },
          { letter: 'C', text: 'c' }, { letter: 'D', text: 'd' },
        ],
        previous: { outcome: 'timeout', letter: 'C', answer: 'Helium' },
      })
      assert.ok(out.text.includes('Nobody got it'))
      assert.ok(out.text.includes('*C)* Helium'))
      assert.deepEqual(out.mentions, [], 'no player to mention on a timeout')
    },
  },
  {
    name: 'trivia_over: standings are medalled and every player is mentioned',
    fn: () => {
      const out = render({
        type: 'trivia_over', category: 'general', total: 10,
        standings: [
          { player: '1@s.whatsapp.net', score: 5 },
          { player: '2@s.whatsapp.net', score: 3 },
          { player: '3@s.whatsapp.net', score: 2 },
          { player: '4@s.whatsapp.net', score: 1 },
        ],
      })
      assert.ok(out.text.includes('🥇'))
      assert.ok(out.text.includes('🥈'))
      assert.ok(out.text.includes('🥉'))
      assert.ok(out.text.includes('@4'), 'fourth place still listed')
      assert.equal(out.mentions.length, 4)
    },
  },
  {
    name: 'trivia_over: nobody scoring still renders without crashing',
    fn: () => {
      const out = render({ type: 'trivia_over', category: 'general', total: 10, standings: [] })
      assert.ok(out.text.length > 0)
      assert.deepEqual(out.mentions, [])
    },
  },
  {
    name: 'trivia_terminated renders a stop message',
    fn: () => {
      const out = render({ type: 'trivia_terminated' })
      assert.ok(out.text.length > 0)
      assert.deepEqual(out.mentions, [])
    },
  },
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node transport/render.test.js`
Expected: FAIL — `render(...)` returns `null` for these types, so `out.text` throws.

- [ ] **Step 3: Add the cases**

In `transport/render.js`, add these constants above `export function render`:

```js
const CATEGORY_LABEL = {
  general: '🧠 GENERAL', football: '⚽ FOOTBALL', science: '🔬 SCIENCE',
  tech: '💻 TECH', entertainment: '🎬 ENTERTAINMENT', geography: '🌍 GEOGRAPHY',
  history: '📜 HISTORY', mixed: '🎲 MIXED',
}
const MEDALS = ['🥇', '🥈', '🥉']
```

Then add these cases to the `switch`, before `default`:

```js
    case 'trivia_question': {
      const lines = []
      const mentions = []
      if (event.previous) {
        if (event.previous.outcome === 'correct') {
          lines.push(`✅ ${mention(event.previous.player)} — *${event.previous.letter})* ${event.previous.answer}`)
          mentions.push(event.previous.player)
        } else {
          lines.push(`⏱ *Time!* Nobody got it — *${event.previous.letter})* ${event.previous.answer}`)
        }
        lines.push('━━━━━━━━━━━━━━━━', '')
      }
      lines.push(`${CATEGORY_LABEL[event.category] ?? event.category}  ·  *Q${event.index}/${event.total}*  ·  ⏱ *${event.clockSeconds}s*`, '')
      lines.push(`*${event.question}*`, '')
      // Stacked, never columns: WhatsApp's proportional font cannot align columns.
      for (const o of event.options) lines.push(`*${o.letter})*  ${o.text}`)
      lines.push('', '_Reply A, B, C or D_')
      return { text: lines.join('\n'), mentions }
    }

    case 'trivia_over': {
      if (event.standings.length === 0) {
        return { text: `🏁 *FINAL*\n━━━━━━━━━━━━━━━━\n\nNobody scored. Brutal.`, mentions: [] }
      }
      const lines = ['🏁 *FINAL*', '━━━━━━━━━━━━━━━━', '']
      event.standings.forEach((s, i) => {
        lines.push(`${MEDALS[i] ?? '　'} ${mention(s.player)} — *${s.score}*`)
      })
      return { text: lines.join('\n'), mentions: event.standings.map((s) => s.player) }
    }

    case 'trivia_terminated':
      return { text: `Trivia stopped.`, mentions: [] }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node transport/render.test.js`
Expected: PASS — `27 passed, 0 failed`.

- [ ] **Step 5: Verify the whole suite**

Run: `npm test`
Expected: `206 passed, 0 failed`.

- [ ] **Step 6: Commit**

```bash
git add transport/render.js transport/render.test.js
git commit -m "feat: render trivia questions, standings and termination

trivia_question carries how the previous question resolved, so one event
produces one message. The naive two-message-per-question approach would cost
20 messages a game, against playtest feedback that the bot already talks too
much; this is 11.

Options stack one per line rather than in columns because WhatsApp renders a
proportional font — columns cannot align, and misalign differently on every
device."
```

---

### Task 6: `transport/router.js` — `/trivia` commands and recording

**Files:**
- Modify: `transport/router.js`
- Modify: `index.js`
- Modify: `transport/router.test.js`

**Interfaces:**
- Consumes: `createTriviaGame`, `QUESTION_COUNT` from `engine/trivia.js`; `loadBank`, `CATEGORIES` from `engine/bank.js`; `markAsked`/`askedIds`/`clearAsked`/`leaderboard` from Task 4.
- Produces: `createRouter` gains a `bank` option. `/trivia`, `/trivia <category>`, `/trivia end`, `/trivia stats [all]`, `/trivia categories`.

- [ ] **Step 1: Write the failing test**

First, two additions to the top of `transport/router.test.js`. That file currently
builds fake db objects by hand (see `makeBotAdminDb`) and never imports the real
store, but these tests assert against real SQL, so add a static import **after** the
existing `process.env` lines and alongside the dynamic `router.js` import:

```js
import { openDb } from '../store/db.js'
```

`store/db.js` does not read `config.js`, so a static import is safe here even though
`router.js` needs a dynamic one.

The file sets `process.env.OWNER = '15550000000'`. There is no importable `OWNER`
binding, so add a matching constant near the top for the Task 7 tests to use:

```js
const OWNER_NUMBER = '15550000000'
```

Now append to the `tests` array:

```js
  {
    name: '/trivia starts a mixed game and posts the first question',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general', 'science'],
        pick: ({ count }) => Array.from({ length: count }, (_, i) => ({
          id: `q${i}`, q: `Q${i}?`, correct: 'right', wrong: ['a', 'b', 'c'],
        })),
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia', isGroup: true }, 0)
      assert.equal(games.size, 1, 'game registered so the scheduler ticks it')
      assert.ok(sent.some((t) => t.includes('*Q1/10*')), 'first question posted immediately, no lobby')
      db.close()
    },
  },
  {
    name: '/trivia rejects an unknown or empty category and lists what is available',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = { categories: () => ['general'], pick: () => [] }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia football', isGroup: true }, 0)
      assert.equal(games.size, 0, 'no unplayable game started')
      assert.ok(sent.some((t) => t.toLowerCase().includes('general')), 'tells the user what they can play')
      db.close()
    },
  },
  {
    name: '/trivia is refused in a DM',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = { categories: () => ['general'], pick: () => [{ id: 'q', q: 'Q?', correct: 'r', wrong: ['a', 'b', 'c'] }] }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'x@s.whatsapp.net', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia', isGroup: false }, 0)
      assert.equal(games.size, 0)
      db.close()
    },
  },
  {
    name: 'trivia_over records a game of type trivia, ranked by placement',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'] }],
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)

      // Find the correct letter from the posted question, then answer it.
      const posted = sent.find((t) => t.includes('*Q1/1*')) ?? sent[sent.length - 1]
      const letter = ['A', 'B', 'C', 'D'].find((l) => posted.includes(`*${l})*  right`))
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: letter, isGroup: true }, 1000)

      const board = db.leaderboard({ jid: 'g@g.us', since: 0, type: 'trivia' })
      assert.equal(board.length, 1)
      assert.equal(board[0].wins, 1)
      assert.equal(db.leaderboard({ jid: 'g@g.us', since: 0, type: 'chain' }).length, 0, 'must not touch the chain board')
      db.close()
    },
  },
  {
    name: 'asked questions are recorded so the next game does not repeat them',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      let excludeSeen = null
      const bank = {
        categories: () => ['general'],
        pick: ({ exclude }) => {
          excludeSeen = exclude
          return [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'] }]
        },
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)
      assert.deepEqual([...db.askedIds('g@g.us', 'general')], ['q0'])

      games.clear()
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 5000)
      assert.ok(excludeSeen.has('q0'), 'second game excludes what the first asked')
      db.close()
    },
  },
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node transport/router.test.js`
Expected: FAIL — no `/trivia` handling, `games.size` is 0.

- [ ] **Step 3: Add the imports and the bank option**

At the top of `transport/router.js`:

```js
import { createTriviaGame, QUESTION_COUNT } from '../engine/trivia.js'
```

Change the `createRouter` signature to accept `bank`:

```js
export function createRouter({ dict, games, enqueue, logger, getGroupAdmins, db, bank = null, resolvePn = () => undefined }) {
```

- [ ] **Step 4: Add the start function**

Inside `createRouter`, next to `startGame`:

```js
  // No lobby: the first question posts immediately and answering is joining.
  async function startTrivia(jid, sender, senderPn, args, now) {
    if (games.has(jid)) {
      enqueue(jid, { text: `A game is already running here. Use ${PREFIX}trivia end to stop it first.`, mentions: [], kind: 'misc' })
      return
    }
    const available = bank ? bank.categories() : []
    const requested = args[0]
    const category = requested ? requested.toLowerCase() : 'mixed'
    if (category !== 'mixed' && !available.includes(category)) {
      enqueue(jid, {
        text: `No questions for "${requested}" yet.\nAvailable: ${available.join(', ') || 'none'}`,
        mentions: [], kind: 'misc',
      })
      return
    }

    let exclude = db?.askedIds(jid, category) ?? new Set()
    let picked = bank.pick({ category, count: QUESTION_COUNT, exclude, random: Math.random })
    // Pool exhausted for this group: recycle rather than serving a short game.
    if (picked.length < QUESTION_COUNT) {
      db?.clearAsked(jid, category)
      picked = bank.pick({ category, count: QUESTION_COUNT, exclude: new Set(), random: Math.random })
    }
    if (picked.length === 0) {
      enqueue(jid, { text: `No questions available for that category.`, mentions: [], kind: 'misc' })
      return
    }

    const game = createTriviaGame({ questions: picked, category, now, random: Math.random })
    games.set(jid, game)
    starters.set(jid, sender)
    gameMeta.set(jid, { mode: category, type: 'trivia', startedAt: now, players: [], eliminated: [], pnMap: new Map() })
    if (senderPn) gameMeta.get(jid).pnMap.set(sender, senderPn)
    try {
      db?.markAsked(jid, category, picked.map((q) => q.id), now)
    } catch (e) {
      logger?.error({ err: e }, 'Failed recording asked questions')
    }
    sendEvents(enqueue, jid, game.tick(now), undefined, now, db)
  }
```

- [ ] **Step 5: Add the command branch**

In `handleCommand`, before the `wcg`/`wrg` branch:

```js
    if (cmd === 'trivia') {
      const sub = (args[0] ?? '').toLowerCase()

      if (sub === 'categories') {
        const available = bank ? bank.categories() : []
        enqueue(jid, { text: `*Categories*\n${available.map((c) => `▸ ${c}`).join('\n') || 'none'}\n\n${PREFIX}trivia for a mix of all.`, mentions: [], kind: 'misc' })
        return
      }

      if (sub === 'stats') {
        const all = args[1] === 'all'
        const board = db.leaderboard({ jid, since: all ? 0 : startOfWeek(now), limit: 10, type: 'trivia' })
        const { text, mentions } = formatLeaderboard(board, all ? '🏆 Trivia — all-time' : '🏆 Trivia — this week')
        enqueue(jid, { text, mentions, kind: 'misc' })
        return
      }

      if (!isGroup) {
        enqueue(jid, { text: `Game commands only work inside a group.`, mentions: [], kind: 'misc' })
        return
      }

      if (sub === 'end') {
        const game = games.get(jid)
        if (!game) return
        const groupAdmins = await groupAdminsFor(jid, isGroup)
        const allowed = sender === starters.get(jid) || isBotAdminEither(sender, senderPn, isGroup, groupAdmins, jid)
        if (!allowed) {
          enqueue(jid, { text: `Only the player who started the game or a group admin can end it.`, mentions: [], kind: 'misc' })
          return
        }
        sendEvents(enqueue, jid, game.end(now), undefined, now, db)
        games.delete(jid)
        starters.delete(jid)
        return
      }

      await startTrivia(jid, sender, senderPn, args, now)
      return
    }
```

- [ ] **Step 6: Record the finished game**

In `sendEvents`, add a branch alongside the existing `winner` handling:

```js
    } else if (event.type === 'trivia_over') {
      const meta = gameMeta.get(jid)
      const pnMap = meta?.pnMap || new Map()
      const results = event.standings.map((s, i) => ({
        player: s.player, placement: i + 1, player_pn: pnMap.get(s.player),
      }))
      if (results.length > 0) {
        try {
          db?.recordGame({
            jid, mode: event.category, type: 'trivia',
            startedAt: meta?.startedAt ?? now, endedAt: now,
            words: event.total, results,
          })
        } catch (e) {
          // store failure must never break gameplay
        }
      }
      gameMeta.delete(jid)
    } else if (event.type === 'trivia_terminated') {
      gameMeta.delete(jid)
```

- [ ] **Step 7: Update `/stats` to pass its type explicitly**

Find the existing `/stats` handler and add `type: 'chain'` to its `db.leaderboard({...})` call, so the intent is stated at the call site rather than relying on the default.

- [ ] **Step 8: Wire the bank in `index.js`**

Add the import:

```js
import { loadBank } from './engine/bank.js';
```

After the dictionary loads, add:

```js
let bank = null;
try {
  bank = loadBank();
  const counts = bank.categories().map((c) => `${c} ${bank.size(c)}`).join(', ');
  logger.info(`Trivia bank loaded: ${counts || 'empty'}`);
} catch (e) {
  logger.warn(`Trivia bank unavailable (${e.message}); /trivia will be disabled`);
}
```

and pass it into `createRouter`: add `bank` to the options object.

- [ ] **Step 9: Run the tests**

Run: `node transport/router.test.js`
Expected: PASS.

Run: `npm test`
Expected: `211 passed, 0 failed`.

- [ ] **Step 10: Commit**

```bash
git add transport/router.js transport/router.test.js index.js
git commit -m "feat: wire /trivia commands and record trivia games

No lobby — the first question posts immediately and answering is joining. When
a group exhausts a category the asked history is cleared and the pool recycles,
rather than serving a short game.

The bare-message path needed no changes at all: the trivia object uses
state 'playing' and a no-op join(), so answers already route to submit().

/stats now passes type 'chain' explicitly rather than leaning on the default,
so the intent is visible at the call site."
```

---

### Task 7: Role-aware `/help`

**Files:**
- Modify: `transport/router.js`
- Modify: `transport/router.test.js`

**Interfaces:**
- Consumes: `isBotAdminEither` and `isOwnerOrGlobalAdmin` from the existing router.
- Produces: no new exports. `/help` output varies by caller.

- [ ] **Step 1: Write the failing test**

Append to `transport/router.test.js`, using the `OWNER_NUMBER` constant and the
`openDb` import added in Task 6 Step 1.

```js
  {
    name: '/help hides admin and owner blocks from a normal player',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: '99999@s.whatsapp.net', senderPn: '99999@s.whatsapp.net', text: '/help', isGroup: true }, 0)
      const text = sent[0]
      assert.ok(text.includes('WORD CHAIN'))
      assert.ok(text.includes('TRIVIA'))
      assert.ok(!text.includes('ADMIN'), 'a player cannot use these')
      assert.ok(!text.includes('OWNER'))
      assert.ok(!text.includes('/promote'))
      db.close()
    },
  },
  {
    name: '/help shows the admin block to a group admin but not the owner block',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['77777@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: '77777@s.whatsapp.net', senderPn: '77777@s.whatsapp.net', text: '/help', isGroup: true }, 0)
      const text = sent[0]
      assert.ok(text.includes('ADMIN'))
      assert.ok(text.includes('/addword'))
      assert.ok(!text.includes('/promote'), 'group admins cannot mint bot admins')
      db.close()
    },
  },
  {
    name: '/help shows everything to the owner',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/help', isGroup: true }, 0)
      const text = sent[0]
      assert.ok(text.includes('ADMIN'))
      assert.ok(text.includes('OWNER'))
      assert.ok(text.includes('/promote'))
      db.close()
    },
  },
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node transport/router.test.js`
Expected: FAIL — the current `/help` is one flat string containing every command.

- [ ] **Step 3: Replace the `/help` handler**

Replace the whole `if (cmd === 'help') { ... }` block with:

```js
    if (cmd === 'help') {
      const groupAdmins = await groupAdminsFor(jid, isGroup)
      const isAdmin = isBotAdminEither(sender, senderPn, isGroup, groupAdmins, jid)
      const isOwner = isOwnerOrGlobalAdmin(sender, senderPn)

      const lines = [
        `🎮 *W·C·G  B·O·T*`,
        `━━━━━━━━━━━━━━━━`,
        ``,
        `*🔤 WORD CHAIN*`,
        `▸ ${PREFIX}wcg start`,
        `▸ ${PREFIX}wcg easy|medium|hard`,
        `▸ ${PREFIX}wrg start`,
        `▸ ${PREFIX}wcg end`,
        ``,
        `*🧠 TRIVIA*`,
        `▸ ${PREFIX}trivia`,
        `▸ ${PREFIX}trivia <category>`,
        `▸ ${PREFIX}trivia categories`,
        `▸ ${PREFIX}trivia end`,
        ``,
        `*📊 SCORES*`,
        `▸ ${PREFIX}stats [all]`,
        `▸ ${PREFIX}trivia stats [all]`,
      ]

      // Hidden from players who cannot use them: no point listing a command
      // whose only possible response is "Admins only."
      if (isAdmin) {
        lines.push(
          ``,
          `*⚙️ ADMIN*`,
          `▸ ${PREFIX}pending`,
          `▸ ${PREFIX}addword <word>|all`,
          `▸ ${PREFIX}delword <word>`,
          `▸ ${PREFIX}admin`,
        )
      }
      if (isOwner) {
        lines.push(
          ``,
          `*👑 OWNER*`,
          `▸ ${PREFIX}promote @user`,
          `▸ ${PREFIX}demote @user`,
        )
      }

      lines.push(
        ``,
        `_In game:_ send join, then`,
        `your word — or A–D for trivia`,
      )

      enqueue(jid, { text: lines.join('\n'), mentions: [], kind: 'misc' })
      return
    }
```

- [ ] **Step 4: Run the tests**

Run: `node transport/router.test.js`
Expected: PASS.

Run: `npm test`
Expected: `214 passed, 0 failed`.

- [ ] **Step 5: Update `README.md`**

Add `/trivia`, `/trivia <category>`, `/trivia end`, `/trivia stats [all]` and `/trivia categories` to the Commands table. Update the test count to 214. Add `engine/trivia.test.js`, `engine/bank.test.js` and `data/build-trivia.test.js` to the test-file list. Add a Trivia section next to Dictionary noting that questions live in `data/trivia.json`, are regenerated with `npm run build:trivia`, and are CC BY-SA 4.0 per `LICENSES.md`.

- [ ] **Step 6: Commit**

```bash
git add transport/router.js transport/router.test.js README.md
git commit -m "feat: redesign /help with sections and role-aware visibility

The old /help was 13 lines of undifferentiated text and trivia would have
pushed it past 18. Now grouped with headers and blank lines, and the admin and
owner blocks are omitted for callers who cannot use them — there is no point
listing a command whose only possible response is 'Admins only.'"
```

---

## Manual verification

The suite cannot prove the game is fun. After Task 7:

1. `npm start`, then in a test group: `/help` — confirm you see the owner block and a second account does not.
2. `/trivia` — first question posts with no lobby delay.
3. Answer correctly — it advances at once and the next message carries the result.
4. Answer wrong, then correctly — the second attempt is ignored.
5. Type chatter mid-question — the bot stays silent.
6. Let one question time out — the answer is revealed.
7. Play to the end — standings post, `/trivia stats` shows the game, `/stats` does **not**.
8. `/trivia football` — refused with the available list, since football is Phase 2.

## Out of scope — Phase 2

Football via Wikidata SPARQL and the FPL API, with the answer-uniqueness check the spec requires. Gets its own plan once a real round has been played.
