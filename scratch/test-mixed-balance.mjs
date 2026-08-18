import { loadBank } from '../engine/bank.js';

const bank = loadBank();
console.log('Available categories:', bank.categories().length);
console.log('Football pool size:', bank.size('football'));
console.log('FPL pool size:', bank.size('fpl'));

const animCategories = new Set(['anime', 'naruto', 'cartoons']);
let animOverCounts = 0;
let totalAnime = 0;
const catCounts = {};

for (let i = 0; i < 100; i++) {
  const picked = bank.pick({ category: 'mixed', count: 10, random: Math.random });
  let animInGame = 0;
  for (const q of picked) {
    catCounts[q.category] = (catCounts[q.category] || 0) + 1;
    if (animCategories.has(q.category)) {
      animInGame++;
      totalAnime++;
    }
  }
  if (animInGame > 1) {
    animOverCounts++;
  }
}

console.log(`\nSimulated 100 10-question mixed games (1,000 questions picked):`);
console.log(`Games with >1 anime/cartoon question: ${animOverCounts}`);
console.log(`Total anime/cartoon questions across all 1,000 questions: ${totalAnime} (${((totalAnime / 1000) * 100).toFixed(1)}%)`);
console.log(`\nSample category distribution across 100 games:`);
console.log(catCounts);
