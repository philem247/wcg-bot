// One-off: adds the Ronaldo Nazário 2003 UCL quarterfinal hat-trick question
// (the trivia template the user flagged from a WhatsApp screenshot). Fact
// verified live via you.com before writing this — see session notes: Real
// Madrid won 6-5 on aggregate despite losing 4-3 on the night at Old Trafford,
// Ronaldo scoring a hat-trick and receiving a standing ovation when subbed off.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

function qId(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
}

function makeQ(q, correct, wrong, league, template) {
  const cleanCorrect = correct.trim();
  const uniqueWrong = [...new Set(wrong.map((w) => w.trim()))].slice(0, 3);
  if (uniqueWrong.length < 3) throw new Error(`Question "${q}" has fewer than 3 unique wrong answers`);
  return { id: qId(q.trim() + '|' + cleanCorrect), q: q.trim(), correct: cleanCorrect, wrong: uniqueWrong, league, template };
}

const pool = [
  makeQ(
    'In the 2002-03 Champions League quarterfinal second leg at Old Trafford, which Real Madrid striker scored a hat-trick in a 4-3 loss to Manchester United, with Real still advancing 6-5 on aggregate?',
    'Ronaldo (Ronaldo Nazário)',
    ['Raúl', 'Fernando Morientes', 'Luís Figo'],
    'ucl',
    'ucl-drama',
  ),
]

const existingIds = new Set((rawData.categories.football || []).map((q) => q.id));
let added = 0
for (const q of pool) {
  if (!existingIds.has(q.id)) {
    rawData.categories.football.push(q)
    existingIds.add(q.id)
    added++
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2))
console.log(`Added ${added} question(s). New football total: ${rawData.categories.football.length}`)
