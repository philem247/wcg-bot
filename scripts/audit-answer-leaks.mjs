import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

const leaks = [];

for (const [catName, qs] of Object.entries(rawData.categories)) {
  for (const q of qs) {
    const qLower = q.q.toLowerCase();
    const cLower = q.correct.toLowerCase().trim();
    
    // Ignore trivial short words like "yes", "no", "7", etc., but check significant answer words
    // If cLower is more than 3 chars and is an exact word in qLower
    if (cLower.length > 3) {
      // Check if exact correct answer is contained in question
      // Avoid false positives like "Which animal is the..." containing "animal" if correct is something else
      const regex = new RegExp(`\\b${cLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(qLower)) {
        leaks.push({
          cat: catName,
          id: q.id,
          q: q.q,
          correct: q.correct
        });
      }
    }
  }
}

console.log(`Found ${leaks.length} potential answer leak questions across the database.`);
console.table(leaks.slice(0, 30));
