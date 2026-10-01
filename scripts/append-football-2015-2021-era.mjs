// One-off: fresh 2015-2021 football moments, filling the gap the user flagged
// between the "golden oldies" batch and the 2022-2026 batch. Every fact here
// verified live via you.com before writing (see session notes).
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
  // --- 2016: Leicester's fairy tale & Iceland's shock ---
  makeQ('Iceland, playing at their first ever major tournament, stunned England 2-1 at Euro 2016, with the match-winning goal and a crucial equaliser both coming from the same player family surname. Who scored Iceland\'s winner?',
    'Kolbeinn Sigþórsson', ['Ragnar Sigurðsson', 'Gylfi Sigurðsson', 'Birkir Bjarnason'], 'world', 'modern-classics'),

  // --- 2018 World Cup ---
  makeQ('France beat Croatia 4-2 in the 2018 World Cup final, with Kylian Mbappé becoming the youngest player to score in a World Cup final since which Brazilian legend in 1958?',
    'Pelé', ['Garrincha', 'Ronaldo', 'Zico'], 'world', 'modern-classics'),
  makeQ('The 2018 World Cup was the first to use Video Assistant Referee (VAR) technology. A VAR review awarded the first ever VAR-given penalty in World Cup history, against which country, for a foul on Antoine Griezmann?',
    'Australia', ['Peru', 'Denmark', 'Argentina'], 'world', 'modern-classics'),

  // --- 2017-18 domestic records ---
  makeQ('Manchester City became the first Premier League team to reach 100 points in a single season, winning the 2017-18 title under which manager?',
    'Pep Guardiola', ['José Mourinho', 'Jürgen Klopp', 'Antonio Conte'], 'pl', 'modern-classics'),

  // --- 2019 Champions League: two miracle comebacks in 24 hours ---
  makeQ('Liverpool overturned a 3-0 first-leg deficit against Barcelona in the 2019 Champions League semi-final, winning 4-0 at Anfield thanks partly to a quickly-taken corner. Who scored the decisive fourth goal from that corner?',
    'Divock Origi', ['Georginio Wijnaldum', 'Roberto Firmino', 'Mohamed Salah'], 'ucl', 'modern-classics'),
  makeQ('Just a day after Liverpool\'s comeback against Barcelona, Tottenham overturned a 1-0 deficit to beat Ajax 3-2 in Amsterdam and reach the 2019 Champions League final on away goals. Who scored a stoppage-time hat-trick winner?',
    'Lucas Moura', ['Son Heung-min', 'Harry Kane', 'Dele Alli'], 'ucl', 'modern-classics'),

  // --- 2020: Liverpool's long-awaited title ---
  makeQ('Liverpool won the Premier League in 2019-20, ending a 30-year wait for the English top-flight title, under which manager?',
    'Jürgen Klopp', ['Brendan Rodgers', 'Rafael Benítez', 'Kenny Dalglish'], 'pl', 'modern-classics'),

  // --- 2021: a dramatic year ---
  makeQ('Kai Havertz scored the only goal as Chelsea beat Manchester City 1-0 to win the 2021 Champions League final. Who was Chelsea\'s manager at the time?',
    'Thomas Tuchel', ['Frank Lampard', 'Maurizio Sarri', 'Graham Potter'], 'ucl', 'modern-classics'),
  makeQ('Villarreal won the 2021 Europa League final in a marathon penalty shootout against Manchester United, in which every single outfield player plus both goalkeepers took a kick before anyone missed. Which Manchester United goalkeeper finally missed the decisive 22nd penalty?',
    'David de Gea', ['Dean Henderson', 'Tom Heaton', 'Sergio Romero'], 'world', 'modern-classics'),
  makeQ('Italy beat England on penalties to win Euro 2020 (played in 2021) at Wembley, extending England\'s wait for a major trophy to how many years?',
    '55', ['50', '60', '45'], 'world', 'modern-classics'),
  makeQ('Denmark midfielder Christian Eriksen suffered a cardiac arrest on the pitch during Denmark\'s opening Euro 2020 match, shocking the football world. Which team were Denmark playing when it happened?',
    'Finland', ['Belgium', 'Russia', 'Wales'], 'world', 'modern-classics'),
  makeQ('In April 2021, twelve of Europe\'s biggest clubs announced a breakaway "European Super League" that collapsed within 48 hours after massive fan backlash. How many founding clubs were originally involved?',
    '12', ['10', '14', '8'], 'ucl', 'modern-classics'),

  // --- More Champions League finals, 2015-2020 ---
  makeQ('Barcelona completed the treble in 2015 behind their famous "MSN" attacking trio, beating Juventus 3-1 in the Champions League final. Which two of the trio scored in that final?',
    'Suárez and Neymar', ['Messi and Suárez', 'Messi and Neymar', 'Neymar and Iniesta'], 'ucl', 'modern-classics'),
  makeQ('Real Madrid won the 2016 Champions League final on penalties against city rivals Atlético Madrid, after Atlético\'s Juanfran hit the post with their fourth spot-kick. Who scored Real Madrid\'s decisive winning penalty?',
    'Cristiano Ronaldo', ['Sergio Ramos', 'Gareth Bale', 'Marcelo'], 'ucl', 'modern-classics'),
  makeQ('Mario Mandžukić scored an outrageous bicycle kick for Juventus in the 2017 Champions League final, only for Real Madrid to win 4-1 with a brace from which player?',
    'Cristiano Ronaldo', ['Karim Benzema', 'Gareth Bale', 'Toni Kroos'], 'ucl', 'modern-classics'),
  makeQ('Gareth Bale scored a spectacular overhead kick as a substitute in the 2018 Champions League final, as Real Madrid beat Liverpool 3-1 despite two costly errors from which Liverpool goalkeeper?',
    'Loris Karius', ['Simon Mignolet', 'Alisson Becker', 'Adrián'], 'ucl', 'modern-classics'),
  makeQ('Liverpool won the 2019 Champions League final 2-0 against Tottenham in an all-English final, with Mohamed Salah scoring from the penalty spot after just 22 seconds. Who scored Liverpool\'s second goal?',
    'Divock Origi', ['Sadio Mané', 'Roberto Firmino', 'Georginio Wijnaldum'], 'ucl', 'modern-classics'),
  makeQ('Bayern Munich demolished Barcelona 8-2 in the 2020 Champions League quarter-final, one of the most lopsided results in the competition\'s history. In which city, due to COVID-19 restrictions, was that match played as a one-off tie?',
    'Lisbon', ['Munich', 'Barcelona', 'Porto'], 'ucl', 'modern-classics'),
  makeQ('Bayern Munich completed a treble in 2020, beating PSG 1-0 in the Champions League final with a goal from a player who grew up in the French capital and came through PSG\'s own academy. Who scored it?',
    'Kingsley Coman', ['Thomas Müller', 'Serge Gnabry', 'Robert Lewandowski'], 'ucl', 'modern-classics'),
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
