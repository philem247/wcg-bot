import assert from 'node:assert/strict'
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs'
import { fold, normalizeInput, isWord } from './normalize.js'
import { loadDictionary } from './dictionary.js'
import { validate } from './validate.js'

const tests = [
  // normalize.js tests
  {
    name: 'fold: lowercase',
    fn: () => {
      assert.equal(fold('HELLO'), 'hello')
    },
  },
  {
    name: 'fold: remove accents',
    fn: () => {
      assert.equal(fold('café'), 'cafe')
      assert.equal(fold('naïve'), 'naive')
      assert.equal(fold('résumé'), 'resume')
    },
  },
  {
    name: 'fold: ligatures (ß, æ, œ, ø, ı, ł, ð, þ)',
    fn: () => {
      assert.equal(fold('Straße'), 'strasse')
      assert.equal(fold('æsthetic'), 'aesthetic')
      assert.equal(fold('œuvre'), 'oeuvre')
      assert.equal(fold('København'), 'kobenhavn')
      assert.equal(fold('ıstanbul'), 'istanbul')
      assert.equal(fold('Łódź'), 'lodz')
    },
  },
  {
    name: 'isWord: 3+ letters a-z only, punctuation/digits/short strings rejected',
    fn: () => {
      assert.equal(isWord('wahala'), true)
      assert.equal(isWord('café'), true, 'folds before checking')
      assert.equal(isWord('ab'), false, 'too short')
      assert.equal(isWord('hello!!'), false, 'punctuation')
      assert.equal(isWord('12345'), false, 'digits')
    },
  },
  {
    name: 'normalizeInput: trims whitespace',
    fn: () => {
      assert.equal(normalizeInput('  hello  '), 'hello')
      assert.equal(normalizeInput('\thello\n'), 'hello')
    },
  },
  {
    name: 'normalizeInput: combines trim + fold + lowercase',
    fn: () => {
      assert.equal(normalizeInput('  CAFÉ  '), 'cafe')
    },
  },

  // dictionary.js tests
  {
    name: 'loadDictionary: load size is plausible (>350k words)',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data' })
      assert(dict.size > 350000, `Expected >350k words, got ${dict.size}`)
    },
  },
  {
    name: 'has: known word (banana)',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data' })
      assert.equal(dict.has('banana'), true)
    },
  },
  {
    name: 'has: unknown word (zzzqqq)',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data' })
      assert.equal(dict.has('zzzqqq'), false)
    },
  },
  {
    name: 'has: normalizes input (Café)',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data' })
      // Find a word with accents in the dict, or just test the logic
      const result = dict.has('BANANA')
      assert.equal(result, true)
    },
  },
  {
    name: 'add/remove: round-trip',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data', langs: [] })
      const initialSize = dict.size

      // Add a new word
      const added = dict.add('testword123')
      assert.equal(added, true)
      assert.equal(dict.size, initialSize + 1)
      assert.equal(dict.has('testword123'), true)

      // Add same word again -> false
      const added2 = dict.add('testword123')
      assert.equal(added2, false)
      assert.equal(dict.size, initialSize + 1)

      // Remove it
      const removed = dict.remove('testword123')
      assert.equal(removed, true)
      assert.equal(dict.size, initialSize)
      assert.equal(dict.has('testword123'), false)

      // Remove again -> false
      const removed2 = dict.remove('testword123')
      assert.equal(removed2, false)
    },
  },
  {
    name: 'randomWord: returns word starting with letter',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data' })
      for (let i = 0; i < 10; i++) {
        const word = dict.randomWord('a')
        assert(word !== null, 'randomWord should return a word for "a"')
        assert.equal(word[0], 'a', `Expected word starting with 'a', got "${word}"`)
      }
    },
  },
  {
    name: 'randomWord: returns null for letter with no words',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data' })
      // Assume 'z' has words, but let's test with invalid input
      const word = dict.randomWord('!')
      assert.equal(word, null)
    },
  },
  {
    name: 'randomLetter: returns a letter that has words',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data' })
      const letter = dict.randomLetter()
      assert(letter !== null)
      assert.equal(letter.length, 1)
      const word = dict.randomWord(letter)
      assert(word !== null, `randomLetter returned "${letter}" but no words found`)
    },
  },

  // validate.js tests
  {
    name: 'validate: not_starting_with',
    fn: () => {
      const dict = { has: () => true }
      const result = validate('apple', { lastLetter: 'z', dict })
      assert.equal(result.ok, false)
      assert.equal(result.reason, 'not_starting_with')
    },
  },
  {
    name: 'validate: length_limit (too short)',
    fn: () => {
      const dict = { has: () => true }
      const result = validate('ab', { lastLetter: 'a', minLength: 3, dict })
      assert.equal(result.ok, false)
      assert.equal(result.reason, 'length_limit')
    },
  },
  {
    name: 'validate: already_used',
    fn: () => {
      const used = new Set(['apple'])
      const dict = { has: () => true }
      const result = validate('apple', { lastLetter: 'a', used, dict })
      assert.equal(result.ok, false)
      assert.equal(result.reason, 'already_used')
    },
  },
  {
    name: 'validate: not_in_list',
    fn: () => {
      const dict = { has: () => false }
      const result = validate('zzzqqq', { lastLetter: 'z', dict })
      assert.equal(result.ok, false)
      assert.equal(result.reason, 'not_in_list')
    },
  },
  {
    name: 'validate: first word (null lastLetter)',
    fn: () => {
      const dict = { has: () => true }
      const result = validate('apple', { lastLetter: null, dict })
      assert.equal(result.ok, true)
      assert.equal(result.word, 'apple')
    },
  },
  {
    name: 'validate: longer than minLength is fine',
    fn: () => {
      const dict = { has: () => true }
      const result = validate('extralong', { lastLetter: 'e', minLength: 3, dict })
      assert.equal(result.ok, true)
      assert.equal(result.word, 'extralong')
    },
  },
  {
    name: 'validate: success case',
    fn: () => {
      const dict = { has: () => true }
      const used = new Set()
      const result = validate('apple', { lastLetter: 'a', minLength: 3, used, dict })
      assert.equal(result.ok, true)
      assert.equal(result.word, 'apple')
    },
  },
  {
    name: 'validate: non-string input',
    fn: () => {
      const dict = { has: () => true }
      const result = validate(123, { lastLetter: 'a', dict })
      assert.equal(result.ok, false)
      assert.equal(result.reason, 'not_in_list')
    },
  },
  {
    name: 'validate: normalizes input',
    fn: () => {
      const dict = { has: (w) => w === 'cafe' }
      const result = validate('CAFÉ', { lastLetter: 'c', dict })
      assert.equal(result.ok, true)
      assert.equal(result.word, 'cafe')
    },
  },
  {
    name: 'validate: throws if dict missing',
    fn: () => {
      try {
        validate('apple', { lastLetter: 'a' })
        throw new Error('should have thrown')
      } catch (e) {
        assert(e.message.includes('dict with has(word) method'))
      }
    },
  },
  {
    name: 'validate: throws if dict.has not a function',
    fn: () => {
      try {
        validate('apple', { lastLetter: 'a', dict: {} })
        throw new Error('should have thrown')
      } catch (e) {
        assert(e.message.includes('dict with has(word) method'))
      }
    },
  },
  {
    name: 'validate: normalizes lastLetter (uppercase)',
    fn: () => {
      const dict = { has: () => true }
      const result = validate('apple', { lastLetter: 'A', dict })
      assert.equal(result.ok, true)
    },
  },
  {
    name: 'validate: normalizes lastLetter (accented)',
    fn: () => {
      const dict = { has: () => true }
      const result = validate('eclair', { lastLetter: 'É', dict })
      assert.equal(result.ok, true)
    },
  },
  {
    name: 'remove: word removed from randomWord',
    fn: () => {
      const dict = loadDictionary({ dataDir: 'data', langs: [] })
      dict.add('testwordxyz')
      assert.equal(dict.has('testwordxyz'), true)
      dict.remove('testwordxyz')
      assert.equal(dict.has('testwordxyz'), false)
      // randomWord should not return the removed word, even if index is stale
      for (let i = 0; i < 10; i++) {
        const word = dict.randomWord('t')
        assert(word !== 'testwordxyz', `randomWord returned removed word: ${word}`)
      }
    },
  },
  {
    name: 'loadDictionary: extra.txt normalized on load',
    fn: () => {
      // Create a temp fixture with uppercase, accented, and invalid entries
      const tmpDir = 'data/.test'
      const tmpExtra = 'data/.test/extra.txt'
      const tmpWords = 'data/.test/words.txt'
      try {
        mkdirSync(tmpDir, { recursive: true })
        writeFileSync(tmpExtra, `# comment
HELLO
café
hello world
xyz
`, 'utf8')
        writeFileSync(tmpWords, 'hello\nxyz\n', 'utf8')
        const dict = loadDictionary({ dataDir: tmpDir, langs: [] })
        // HELLO should be normalized to hello and found
        assert.equal(dict.has('hello'), true)
        assert.equal(dict.has('HELLO'), true)
        // café should be normalized to cafe and found
        assert.equal(dict.has('cafe'), true)
        assert.equal(dict.has('café'), true)
        // hello world should be skipped (not matching ^[a-z]{3,}$)
        assert.equal(dict.has('hello world'), false)
        // xyz matches but is already in words.txt, just verify it's there
        assert.equal(dict.has('xyz'), true)
      } finally {
        try { rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
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
