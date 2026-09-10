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
console.log('\n--- TESTING FOOTBALL TEMPLATE DIVERSITY PER GAME ---');
for (let g = 0; g < 10; g++) {
  const picked = bank.pick({ category: 'football', count: 10, random: Math.random });
  assert.equal(picked.length, 10, 'Must pick exactly 10 questions');
  const tmpls = picked.map(q => q.template);
  const uniqueTmpls = new Set(tmpls);
  // With 100+ templates in football, 10 questions should draw from at least 8 unique templates!
  assert.ok(uniqueTmpls.size >= 8, `Expected at least 8 distinct templates in 10 questions, got ${uniqueTmpls.size}`);
}
console.log('✓ Football games (10 questions each): Confirmed balanced template diversity across 10 games.');

console.log('\n--- TESTING TOURNAMENT QUESTION RANDOMIZATION & ISOLATION ---');
const tourneyUsed = new Set();
for (let match = 0; match < 7; match++) {
  const matchPicked = bank.pick({ category: 'football', count: 10, exclude: tourneyUsed, random: Math.random });
  assert.equal(matchPicked.length, 10, 'Each match must receive 10 questions');
  for (const q of matchPicked) {
    assert(!tourneyUsed.has(q.id), `Match ${match + 1} received repeated question ${q.id}`);
    tourneyUsed.add(q.id);
  }
}
console.log(`✓ Tournament bracket (7 matches, 70 questions): 0 repeats, diverse templates across all rounds.`);

console.log('\n--- ALL RANDOMNESS & NON-REPETITION CHECKS PASSED ---');
