// One-off: individual awards, career milestones, and famous substitute
// moments missing from the bank. Checked against existing questions first;
// everything here was verified live via you.com before writing.
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
  makeQ('Luka Modrić won the 2018 Ballon d\'Or after leading Real Madrid to the Champions League and Croatia to the World Cup final, ending a run of ten straight years in which only two players had won it. Who were those two players?',
    'Lionel Messi and Cristiano Ronaldo', ['Messi and Neymar', 'Ronaldo and Ronaldinho', 'Messi and Xavi'], 'world', 'modern-classics'),
  makeQ('The 2020 Ballon d\'Or was the only edition in the award\'s history to be cancelled outright, due to the disrupted COVID-19 season, despite one player being considered the clear favourite. Who was that player?',
    'Robert Lewandowski', ['Kevin De Bruyne', 'Thiago Alcântara', 'Manuel Neuer'], 'world', 'modern-classics'),
  makeQ('Karim Benzema won the 2022 Ballon d\'Or at age 34, becoming the oldest winner since the award\'s very first recipient in 1956. Who was that first ever winner?',
    'Stanley Matthews', ['Alfredo Di Stéfano', 'Raymond Kopa', 'Lev Yashin'], 'world', 'modern-classics'),
  makeQ('Gianluigi Buffon is widely considered one of the greatest goalkeepers ever, with a World Cup winner\'s medal and ten Serie A titles — but he never won which major trophy, despite reaching two finals with Juventus?',
    'The Champions League', ['The Coppa Italia', 'The UEFA Cup', 'The Ballon d\'Or'], 'world', 'modern-classics'),
  makeQ('Francesco Totti spent his entire 25-year professional career at a single club before retiring in 2017. Which club was it?',
    'Roma', ['Lazio', 'Napoli', 'Fiorentina'], 'world', 'modern-classics'),
  makeQ('Harry Kane finally left Tottenham in 2023 after 19 years at the club, joining which Bundesliga giant in a club-record transfer?',
    'Bayern Munich', ['Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig'], 'world', 'modern-classics'),
  makeQ('Kylian Mbappé finally completed his long-rumoured move to Real Madrid in the summer of 2024, joining as a free agent after his contract expired at which club?',
    'Paris Saint-Germain', ['AS Monaco', 'Borussia Dortmund', 'Manchester City'], 'world', 'modern-classics'),
  makeQ('Dutch coach Louis van Gaal made a bold substitution in the dying seconds of extra time in a 2014 World Cup quarter-final, bringing on a specialist goalkeeper purely for the penalty shootout. Who was that substitute, who went on to save two penalties against Costa Rica?',
    'Tim Krul', ['Jasper Cillessen', 'Michel Vorm', 'Maarten Stekelenburg'], 'world', 'modern-classics'),
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
