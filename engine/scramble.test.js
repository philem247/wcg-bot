import assert from 'node:assert/strict'
import { createScrambleGame } from './scramble.js'

const tests = [
  {
    name: 'scramble: the picked word scores',
    fn: () => {
      const g = createScrambleGame({ words: [{ correct: 'stop' }], now: 0 })
      g.join('a', 0)
      const ev = g.submit('a', 'STOP', 1000)
      assert.equal(ev[0].type, 'scramble_answer')
      assert.equal(ev[0].winner, 'a')
    },
  },
  {
    name: 'scramble: a different real word from the same letters scores when isValidWord accepts it',
    fn: () => {
      const valid = new Set(['stop', 'pots', 'tops'])
      const g = createScrambleGame({ words: [{ correct: 'stop' }], now: 0, isValidWord: (w) => valid.has(w) })
      g.join('a', 0)
      assert.deepEqual(g.submit('a', 'psto', 1000), [], 'non-word anagram ignored')
      assert.deepEqual(g.submit('a', 'post', 1000), [], 'anagram not in the word list ignored')
      const ev = g.submit('b', 'pots', 1000)
      assert.equal(ev[0].winner, 'b')
      assert.equal(ev[0].correct, 'stop')
    },
  },
  {
    name: 'scramble: without isValidWord only the exact word scores (unchanged default)',
    fn: () => {
      const g = createScrambleGame({ words: [{ correct: 'stop' }], now: 0 })
      g.join('a', 0)
      assert.deepEqual(g.submit('a', 'pots', 1000), [])
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
