// One-off: 1999-2014 football moments, checked against the existing bank
// first to avoid near-duplicates (Istanbul 2005, Zidane's headbutt, Greece's
// Euro 2004 win, and the 2014 Mineirazo were already covered by earlier
// batches or pre-existing questions — skipped here). Every fact verified live
// via you.com before writing (see session notes).
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
  makeQ('Manchester United completed a historic treble in 1999, scoring twice in injury time to beat Bayern Munich 2-1 in the Champions League final. Who scored the dramatic late winner?',
    'Ole Gunnar Solskjær', ['Teddy Sheringham', 'Ryan Giggs', 'David Beckham'], 'ucl', 'modern-classics'),
  makeQ('AC Milan beat Juventus in an all-Italian 2003 Champions League final, with a 0-0 draw settled 3-2 on penalties. Who scored the decisive spot-kick for Milan?',
    'Andriy Shevchenko', ['Filippo Inzaghi', 'Paolo Maldini', 'Rui Costa'], 'ucl', 'modern-classics'),
  makeQ('José Mourinho won the 2004 Champions League with unfancied Porto, beating Monaco 3-0 in the final, before leaving to join Chelsea that summer. Who was named man of the match for Porto?',
    'Deco', ['Carlos Alberto', 'Dmitri Alenichev', 'Ricardo Carvalho'], 'ucl', 'modern-classics'),
  makeQ('Pep Guardiola won the treble in his very first season as a manager, leading Barcelona to a 2-0 win over Manchester United in the 2009 Champions League final. Who scored Barcelona\'s second goal with a header?',
    'Lionel Messi', ['Samuel Eto\'o', 'Thierry Henry', 'Xavi'], 'ucl', 'modern-classics'),
  makeQ('Bayern Munich won the 2013 Champions League final — an all-German final against Borussia Dortmund — with a late winner from which Dutch winger?',
    'Arjen Robben', ['Franck Ribéry', 'Thomas Müller', 'Mario Götze'], 'ucl', 'modern-classics'),
]

const existingIds = new Set((rawData.categories.football || []).map((q) => q.id))
let added = 0
for (const q of pool) {
  if (!existingIds.has(q.id)) {
    rawData.categories.football.push(q)
    existingIds.add(q.id)
    added++
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2))
console.log(`Added ${added}/${pool.length} question(s). New football total: ${rawData.categories.football.length}`)
