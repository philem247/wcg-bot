import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

for (const q of rawData.categories['nigerian-entertainment'] || []) {
  if (q.id === '30b82d107a9a') {
    q.q = 'Which highly anticipated late-2024 album was released by Wizkid in heartfelt tribute to his beloved late mother, featuring the single "Piece of My Heart"?';
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log('Fixed Wizkid tribute leak successfully.');
