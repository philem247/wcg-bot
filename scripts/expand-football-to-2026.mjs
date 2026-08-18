import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

function qId(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
}

function makeQ(q, correct, wrong, league = 'pl', template = 'curated') {
  if (!q || !correct || !wrong || !Array.isArray(wrong)) {
    throw new Error(`Malformed question parameters: ${q}`);
  }
  const cleanCorrect = correct.trim();
  const cleanWrong = wrong
    .map(w => w.trim())
    .filter(w => w.length > 0 && w.toLowerCase() !== cleanCorrect.toLowerCase());
  const uniqueWrong = [...new Set(cleanWrong)].slice(0, 3);
  if (uniqueWrong.length < 3) {
    throw new Error(`Question "${q}" has fewer than 3 unique wrong answers! (found: ${JSON.stringify(uniqueWrong)}, correct: ${cleanCorrect})`);
  }
  return {
    id: qId(q.trim() + '|' + cleanCorrect),
    q: q.trim(),
    correct: cleanCorrect,
    wrong: uniqueWrong,
    league,
    template,
  };
}

const pool = [];

// =========================================================================
// 1. 2026 FIFA WORLD CUP (USA, CANADA, MEXICO) FACTS & FORMAT
// =========================================================================
const wc2026 = [
  makeQ('Which three nations are the joint co-hosts of the 2026 FIFA World Cup?', 'USA, Canada, and Mexico', ['USA, Canada, and Costa Rica', 'USA, Mexico, and Panama', 'USA, Canada, and Jamaica'], 'world', 'wc-2026'),
  makeQ('How many national teams are competing in the expanded 2026 FIFA World Cup, the largest in tournament history?', '48 teams', ['32 teams', '40 teams', '64 teams'], 'world', 'wc-2026'),
  makeQ('Which stadium was selected to host the Final of the 2026 FIFA World Cup in July 2026?', 'MetLife Stadium (New York / New Jersey)', ['SoFi Stadium (Los Angeles)', 'AT&T Stadium (Dallas)', 'Estadio Azteca (Mexico City)'], 'world', 'wc-2026'),
  makeQ('Which historic stadium became the first venue in football history to host matches in three separate Men\'s World Cups (1970, 1986, 2026)?', 'Estadio Azteca (Mexico City)', ['Maracanã (Rio de Janeiro)', 'Rose Bowl (Pasadena)', 'Wembley Stadium (London)'], 'world', 'wc-2026'),
  makeQ('How many total matches will be played across the entire 2026 FIFA World Cup under the 48-team 12-group format?', '104 matches', ['64 matches', '80 matches', '96 matches'], 'world', 'wc-2026'),
  makeQ('Which two Canadian cities are official host cities for the 2026 FIFA World Cup?', 'Toronto and Vancouver', ['Montreal and Toronto', 'Vancouver and Montreal', 'Calgary and Edmonton'], 'world', 'wc-2026'),
  makeQ('Which three Mexican cities are official host cities for the 2026 FIFA World Cup?', 'Mexico City, Guadalajara, and Monterrey', ['Mexico City, Tijuana, and Cancún', 'Guadalajara, Monterrey, and Puebla', 'Mexico City, León, and Toluca'], 'world', 'wc-2026'),
  makeQ('What is the group stage structure for the 2026 FIFA World Cup?', '12 groups of 4 teams each', ['16 groups of 3 teams each', '8 groups of 6 teams each', '6 groups of 8 teams each'], 'world', 'wc-2026')
];

for (const q of wc2026) pool.push(q);

// =========================================================================
// 2. NEW 36-TEAM UEFA CHAMPIONS LEAGUE "SWISS SYSTEM" (2024/25 ONWARDS)
// =========================================================================
const uclNewFormat = [
  makeQ('Starting in the 2024/25 season, how many clubs compete in the UEFA Champions League main phase (expanded from 32)?', '36 teams', ['40 teams', '48 teams', '34 teams'], 'ucl', 'ucl-new-format'),
  makeQ('Under the new Champions League "Swiss-system" single-league phase, how many matches does each team play against 8 different opponents?', '8 matches (4 home, 4 away)', ['6 matches (3 home, 3 away)', '10 matches (5 home, 5 away)', '7 matches'], 'ucl', 'ucl-new-format'),
  makeQ('In the new 36-team Champions League format, which finishing positions in the league table qualify directly for the Round of 16?', 'Top 8 (1st to 8th)', ['Top 4 (1st to 4th)', 'Top 16 (1st to 16th)', 'Top 12 (1st to 12th)'], 'ucl', 'ucl-new-format'),
  makeQ('In the new 36-team Champions League format, which teams contest the two-legged knockout play-offs to reach the Round of 16?', 'Teams finishing 9th to 24th', ['Teams finishing 9th to 16th', 'Teams finishing 17th to 24th', 'Teams finishing 5th to 20th'], 'ucl', 'ucl-new-format'),
  makeQ('Which iconic German stadium hosted the 2025 UEFA Champions League Final in May 2025?', 'Allianz Arena (Munich)', ['Signal Iduna Park (Dortmund)', 'Olympiastadion (Berlin)', 'MHPArena (Stuttgart)'], 'ucl', 'ucl-new-format'),
  makeQ('Which venue was chosen to host the 2026 UEFA Champions League Final in May 2026?', 'Puskás Aréna (Budapest, Hungary)', ['San Siro (Milan)', 'Wembley Stadium (London)', 'Stade de France (Paris)'], 'ucl', 'ucl-new-format')
];

for (const q of uclNewFormat) pool.push(q);

// =========================================================================
// 3. 2025 FIFA CLUB WORLD CUP (32-TEAM EXPANSION IN USA)
// =========================================================================
const cwc2025 = [
  makeQ('In June–July 2025, FIFA launched the first edition of the massive 32-team Club World Cup. Which country hosted the tournament?', 'United States', ['Saudi Arabia', 'Morocco', 'Japan'], 'world', 'cwc-32'),
  makeQ('How often will the expanded 32-team FIFA Club World Cup be held following the 2025 edition?', 'Every 4 years', ['Every year', 'Every 2 years', 'Every 3 years'], 'world', 'cwc-32'),
  makeQ('How many clubs from UEFA (Europe) qualified for the inaugural 32-team 2025 FIFA Club World Cup?', '12 clubs', ['8 clubs', '16 clubs', '10 clubs'], 'world', 'cwc-32'),
  makeQ('How many clubs from CONMEBOL (South America) qualified for the 32-team 2025 FIFA Club World Cup?', '6 clubs', ['4 clubs', '8 clubs', '5 clubs'], 'world', 'cwc-32'),
  makeQ('How many clubs from CAF (Africa) qualified for the 32-team 2025 FIFA Club World Cup (Al Ahly, Wydad, Espérance, Mamelodi Sundowns)?', '4 clubs', ['2 clubs', '6 clubs', '3 clubs'], 'world', 'cwc-32')
];

for (const q of cwc2025) pool.push(q);

// =========================================================================
// 4. 2024 - 2026 MANAGERIAL MOVES & REVOLUTIONS
// =========================================================================
const recentManagers = [
  makeQ('Which Portuguese manager left Sporting CP in November 2024 to become the head coach of Manchester United?', 'Rúben Amorim', ['Sergio Conceição', 'Marco Silva', 'André Villas-Boas'], 'pl', 'recent-managers'),
  makeQ('Which German manager was appointed head coach of FC Barcelona in summer 2024, succeeding Xavi Hernández?', 'Hansi Flick', ['Thomas Tuchel', 'Julian Nagelsmann', 'Jürgen Klopp'], 'other', 'recent-managers'),
  makeQ('Which former Feyenoord manager took over as Liverpool manager in summer 2024 following the departure of Jürgen Klopp?', 'Arne Slot', ['Xabi Alonso', 'Rúben Amorim', 'Thomas Frank'], 'pl', 'recent-managers'),
  makeQ('Which former Burnley and Manchester City captain was surprisingly appointed as manager of Bayern Munich in summer 2024?', 'Vincent Kompany', ['Zinedine Zidane', 'Julian Nagelsmann', 'Erik ten Hag'], 'other', 'recent-managers'),
  makeQ('Which Italian manager left Leicester City after winning the Championship to become Chelsea head coach in summer 2024?', 'Enzo Maresca', ['Roberto De Zerbi', 'Maurizio Sarri', 'Kieran McKenna'], 'pl', 'recent-managers'),
  makeQ('Which German manager was appointed as the permanent head coach of the England men\'s national team starting in 2025?', 'Thomas Tuchel', ['Jürgen Klopp', 'Eddie Howe', 'Graham Potter'], 'world', 'recent-managers')
];

for (const q of recentManagers) pool.push(q);

// =========================================================================
// 5. BLOCKBUSTER 2024 - 2026 TRANSFERS
// =========================================================================
const recentTransfers = [
  makeQ('Which French superstar completed a sensational free transfer to Real Madrid in summer 2024 after seven seasons at PSG?', 'Kylian Mbappé', ['Ousmane Dembélé', 'Antoine Griezmann', 'Marcus Thuram'], 'other', 'recent-transfers'),
  makeQ('Which Argentine World Cup and Copa América winning striker moved from Manchester City to Atlético Madrid in summer 2024 for a fee of up to €95m?', 'Julián Álvarez', ['Lautaro Martínez', 'Paulo Dybala', 'Ángel Correa'], 'other', 'recent-transfers'),
  makeQ('Which Nigerian superstar striker joined Turkish giants Galatasaray on loan from Napoli in September 2024 in a shock transfer move?', 'Victor Osimhen', ['Victor Boniface', 'Taiwo Awoniyi', 'Ademola Lookman'], 'other', 'recent-transfers'),
  makeQ('Which Spanish Euro 2024 star returned to his boyhood club FC Barcelona from RB Leipzig in summer 2024 for €55m?', 'Dani Olmo', ['Nico Williams', 'Mikel Merino', 'Martín Zubimendi'], 'other', 'recent-transfers'),
  makeQ('Which French teenage defensive prodigy signed for Manchester United from Lille for €62m in July 2024?', 'Leny Yoro', ['Jean-Clair Todibo', 'Castello Lukeba', 'Mohamed Simakan'], 'pl', 'recent-transfers'),
  makeQ('Which French winger completed a €60m transfer from Crystal Palace to Bayern Munich in summer 2024?', 'Michael Olise', ['Eberechi Eze', 'Jean-Philippe Mateta', 'Marc Guéhi'], 'other', 'recent-transfers'),
  makeQ('Which English striker completed a club-record £65m transfer from Bournemouth to Tottenham Hotspur in August 2024?', 'Dominic Solanke', ['Ivan Toney', 'Ollie Watkins', 'Callum Wilson'], 'pl', 'recent-transfers'),
  makeQ('Which Portuguese winger signed for Chelsea from Wolves for £54m in August 2024?', 'Pedro Neto', ['Francisco Trincão', 'Gonçalo Guedes', 'Daniel Podence'], 'pl', 'recent-transfers'),
  makeQ('Which Italian Euro 2020 champion winger joined Liverpool from Juventus for an initial £10m in August 2024?', 'Federico Chiesa', ['Domenico Berardi', 'Nicolò Zaniolo', 'Stephan El Shaarawy'], 'pl', 'recent-transfers'),
  makeQ('Which Spanish midfielder signed for Arsenal from Real Sociedad for €32m in August 2024 after winning Euro 2024?', 'Mikel Merino', ['Martín Zubimendi', 'Brais Méndez', 'Álex Baena'], 'pl', 'recent-transfers'),
  makeQ('Which Brazilian teenage sensation, nicknamed "Messinho", agreed a €65m deal to join Chelsea from Palmeiras in summer 2025?', 'Estêvão Willian', ['Endrick', 'Vitor Roque', 'Savinho'], 'pl', 'recent-transfers')
];

for (const q of recentTransfers) pool.push(q);

// =========================================================================
// 6. AFCON 2025 / 2026 IN MOROCCO
// =========================================================================
const afcon2025 = [
  makeQ('Which North African country is the host nation for the 35th edition of the Africa Cup of Nations (AFCON 2025/2026)?', 'Morocco', ['Algeria', 'Tunisia', 'Egypt'], 'world', 'afcon-2025'),
  makeQ('Which stadium in Rabat underwent massive reconstruction to be a primary venue for AFCON 2025 and the 2030 World Cup?', 'Prince Moulay Abdellah Stadium (Rabat)', ['Stade Mohammed V (Casablanca)', 'Grand Stade de Tanger', 'Grand Stade de Marrakech'], 'world', 'afcon-2025'),
  makeQ('Which three nations were awarded the joint co-hosting rights for the 2030 FIFA Centenary World Cup?', 'Spain, Portugal, and Morocco (with 3 opening games in Uruguay, Argentina, Paraguay)', ['USA, Canada, Mexico', 'Saudi Arabia, Greece, Egypt', 'England, Scotland, Wales'], 'world', 'world-cup-future'),
  makeQ('Which nation is scheduled to host the 2034 FIFA World Cup after running unopposed in the bidding process?', 'Saudi Arabia', ['Australia', 'Qatar', 'China'], 'world', 'world-cup-future')
];

for (const q of afcon2025) pool.push(q);

console.log(`Generated ${pool.length} 2024-2026 modern era questions.`);

// Merge into trivia.json football category ensuring zero duplicate IDs
const existingIds = new Set((rawData.categories.football || []).map(q => q.id));
let added = 0;

for (const q of pool) {
  if (!existingIds.has(q.id)) {
    rawData.categories.football.push(q);
    existingIds.add(q.id);
    added++;
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Successfully added ${added} unique questions! New total for football: ${rawData.categories.football.length}`);
