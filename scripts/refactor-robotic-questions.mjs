import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

let techCount = 0;
let web3Count = 0;

for (const q of rawData.categories.tech || []) {
  if (q.q.startsWith('What is the name of the tech/programming language that is: "') || q.q.startsWith('What is the name of the tech/computing term that is: "')) {
    const match = q.q.match(/"([^"]+)"/);
    if (match) {
      const desc = match[1].replace(/\.$/, '');
      q.q = `Which technology, tool, or language is defined as: ${desc}?`;
      techCount++;
    }
  }
}

for (const q of rawData.categories.web3 || []) {
  if (q.q.startsWith('This definition matches which crypto terminology: "') || q.q.startsWith('Which crypto terminology matches: "')) {
    const match = q.q.match(/"([^"]+)"/);
    if (match) {
      const desc = match[1].replace(/\.$/, '');
      q.q = `In cryptocurrency and blockchain, which term is defined as: ${desc}?`;
      web3Count++;
    }
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Refactored ${techCount} tech questions and ${web3Count} web3 questions to natural phrasing!`);
