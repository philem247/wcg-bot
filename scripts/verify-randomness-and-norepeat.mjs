import { loadBank } from '../engine/bank.js';
import assert from 'node:assert';

const bank = loadBank({ path: 'data/trivia.json' });

console.log('--- TESTING SINGLE CATEGORY NON-REPETITION ---');
const cat = 'football';
const askedCat = new Set();
let catPicks = 0;
const targetPicks = 100; // 100 games = 500 questions

for (let i = 0; i < targetPicks; i++) {
  const picked = bank.pick({ category: cat, count: 5, exclude: askedCat, random: Math.random });
  assert.equal(picked.length, 5, 'Must pick exactly 5 questions');
  for (const q of picked) {
    assert(!askedCat.has(q.id), `Question ${q.id} was repeated!`);
    askedCat.add(q.id);
    catPicks++;
  }
}
console.log(`✓ Single category (${cat}): Picked ${catPicks} unique questions with 0 repetitions across 100 games.`);

console.log('\n--- TESTING MIXED MODE DIVERSITY & NON-REPETITION ---');
const askedMixed = new Set();
let mixedPicks = 0;
const catDistribution = {};

for (let i = 0; i < targetPicks; i++) {
  const picked = bank.pick({ category: 'mixed', count: 5, exclude: askedMixed, random: Math.random });
  assert.equal(picked.length, 5, 'Must pick exactly 5 questions in mixed');
  for (const q of picked) {
    assert(!askedMixed.has(q.id), `Mixed question ${q.id} was repeated!`);
    askedMixed.add(q.id);
    mixedPicks++;
    catDistribution[q.category] = (catDistribution[q.category] || 0) + 1;
  }
}
console.log(`✓ Mixed mode: Picked ${mixedPicks} unique questions with 0 repetitions across 100 games.`);
console.log('Category distribution in 100 mixed games (500 questions):');
console.table(catDistribution);

console.log('\n--- ALL RANDOMNESS & NON-REPETITION CHECKS PASSED ---');
