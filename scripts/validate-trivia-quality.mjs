import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

let errors = 0;
let totalChecked = 0;

for (const [catName, questions] of Object.entries(rawData.categories || {})) {
  const seenIds = new Set();
  const seenQText = new Set();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    totalChecked++;

    if (!q.id || typeof q.id !== 'string') {
      console.error(`[${catName} #${i}] Missing or invalid id:`, q);
      errors++;
    }
    if (seenIds.has(q.id)) {
      console.error(`[${catName} #${i}] Duplicate id found: ${q.id}`);
      errors++;
    }
    seenIds.add(q.id);

    if (!q.q || typeof q.q !== 'string' || q.q.trim().length === 0) {
      console.error(`[${catName} #${i}] Empty or invalid question text:`, q);
      errors++;
    }

    if (!q.correct || typeof q.correct !== 'string' || q.correct.trim().length === 0) {
      console.error(`[${catName} #${i}] Empty or invalid correct answer:`, q);
      errors++;
    }

    if (!Array.isArray(q.wrong) || q.wrong.length !== 3) {
      console.error(`[${catName} #${i}] Wrong answers array must have exactly 3 items (found ${q.wrong?.length}):`, q);
      errors++;
    } else {
      const wrongSet = new Set(q.wrong.map(w => w.trim().toLowerCase()));
      if (wrongSet.size !== 3) {
        console.error(`[${catName} #${i}] Duplicate options in wrong answers:`, q.wrong);
        errors++;
      }
      if (wrongSet.has(q.correct.trim().toLowerCase())) {
        console.error(`[${catName} #${i}] Correct answer is included in wrong options:`, q.correct, q.wrong);
        errors++;
      }
    }
  }
}

console.log(`\nValidation complete: Checked ${totalChecked} total questions across ${Object.keys(rawData.categories).length} categories.`);
if (errors === 0) {
  console.log('PASSED: 0 errors, 0 duplicates, 0 malformed questions!');
} else {
  console.error(`FAILED: Found ${errors} validation errors.`);
  process.exit(1);
}
