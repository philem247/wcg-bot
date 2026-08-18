import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

for (const cat of ['football', 'fpl']) {
  const qs = rawData.categories[cat] || [];
  const leaks = [];
  for (const q of qs) {
    const cleanC = q.correct.toLowerCase().trim();
    // Ignore simple short answers, check multi-word or distinct terms
    if (cleanC.length > 3) {
      const esc = cleanC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${esc}\\b`, 'i');
      if (regex.test(q.q.toLowerCase())) {
        leaks.push({ id: q.id, q: q.q, correct: q.correct });
      }
    }
  }
  console.log(cat, 'Total leaks detected:', leaks.length);
  if (leaks.length > 0) {
    console.table(leaks.slice(0, 15));
  }
}
