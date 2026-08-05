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
