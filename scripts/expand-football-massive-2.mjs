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
// 1. ALL-TIME TOP SCORERS FOR ICONIC CLUBS
// =========================================================================
const clubTopScorers = [
  ['Arsenal', 'Thierry Henry (228 goals)', ['Ian Wright (185 goals)', 'Cliff Bastin (178 goals)', 'Robin van Persie (132 goals)']],
  ['Manchester United', 'Wayne Rooney (253 goals)', ['Sir Bobby Charlton (249 goals)', 'Denis Law (237 goals)', 'Ryan Giggs (168 goals)']],
  ['Chelsea', 'Frank Lampard (211 goals)', ['Bobby Tambling (202 goals)', 'Didier Drogba (164 goals)', 'Eden Hazard (110 goals)']],
  ['Manchester City', 'Sergio Agüero (260 goals)', ['Eric Brook (177 goals)', 'Tommy Johnson (166 goals)', 'Raheem Sterling (131 goals)']],
  ['Liverpool', 'Ian Rush (346 goals)', ['Roger Hunt (285 goals)', 'Gordon Hodgson (241 goals)', 'Mohamed Salah (210+ goals)']],
  ['Tottenham Hotspur', 'Harry Kane (280 goals)', ['Jimmy Greaves (268 goals)', 'Bobby Smith (208 goals)', 'Martin Chivers (174 goals)']],
  ['Real Madrid', 'Cristiano Ronaldo (450 goals)', ['Karim Benzema (354 goals)', 'Raúl (323 goals)', 'Alfredo Di Stéfano (308 goals)']],
  ['FC Barcelona', 'Lionel Messi (672 goals)', ['César Rodríguez (232 goals)', 'Luis Suárez (198 goals)', 'László Kubala (194 goals)']],
  ['Atlético Madrid', 'Antoine Griezmann (180+ goals)', ['Luis Aragonés (173 goals)', 'Adrián Escudero (169 goals)', 'Fernando Torres (129 goals)']],
  ['Juventus', 'Alessandro Del Piero (290 goals)', ['Giampiero Boniperti (179 goals)', 'Roberto Bettega (178 goals)', 'David Trezeguet (171 goals)']],
  ['AS Roma', 'Francesco Totti (307 goals)', ['Roberto Pruzzo (138 goals)', 'Edin Džeko (119 goals)', 'Amedeo Amadei (111 goals)']],
  ['AC Milan', 'Gunnar Nordahl (221 goals)', ['Andriy Shevchenko (175 goals)', 'Gianni Rivera (164 goals)', 'Marco van Basten (125 goals)']],
  ['Inter Milan', 'Giuseppe Meazza (284 goals)', ['Alessandro Altobelli (209 goals)', 'Roberto Boninsegna (171 goals)', 'Sandro Mazzola (160 goals)']],
  ['Bayern Munich', 'Gerd Müller (563 goals)', ['Robert Lewandowski (344 goals)', 'Thomas Müller (240+ goals)', 'Karl-Heinz Rummenigge (217 goals)']],
  ['Borussia Dortmund', 'Alfred Preissler (177 goals)', ['Michael Zorc (159 goals)', 'Marco Reus (170 goals)', 'Pierre-Emerick Aubameyang (141 goals)']],
  ['Paris Saint-Germain', 'Kylian Mbappé (256 goals)', ['Edinson Cavani (200 goals)', 'Zlatan Ibrahimović (156 goals)', 'Neymar (118 goals)']]
];

for (const [club, correct, wrong] of clubTopScorers) {
  pool.push(makeQ(`Who is the all-time leading goalscorer in the history of ${club}?`, correct, wrong, 'other', 'club-top-scorer'));
}

// =========================================================================
// 2. FA CUP FINALS (2005 - 2024)
// =========================================================================
const faCupFinals = [
  ['2024', 'Manchester United (2-1 vs Manchester City)', ['Manchester City', 'Chelsea', 'Coventry City']],
  ['2023', 'Manchester City (2-1 vs Manchester United, Gündoğan 12s goal)', ['Manchester United', 'Brighton', 'Sheffield United']],
  ['2022', 'Liverpool (penalties vs Chelsea, 0-0 AET)', ['Chelsea', 'Crystal Palace', 'Manchester City']],
  ['2021', 'Leicester City (1-0 vs Chelsea, Tielemans long-range screamer)', ['Chelsea', 'Southampton', 'Manchester City']],
  ['2020', 'Arsenal (2-1 vs Chelsea, Aubameyang brace)', ['Chelsea', 'Manchester City', 'Manchester United']],
  ['2019', 'Manchester City (6-0 vs Watford, joint-record FA Cup final win)', ['Watford', 'Brighton', 'Wolves']],
  ['2018', 'Chelsea (1-0 vs Manchester United, Hazard penalty)', ['Manchester United', 'Tottenham', 'Southampton']],
  ['2017', 'Arsenal (2-1 vs Chelsea, Ramsey 79th min winner)', ['Chelsea', 'Manchester City', 'Tottenham']],
  ['2016', 'Manchester United (2-1 AET vs Crystal Palace, Lingard volley)', ['Crystal Palace', 'Everton', 'Watford']],
  ['2015', 'Arsenal (4-0 vs Aston Villa, Sánchez screamer)', ['Aston Villa', 'Reading', 'Liverpool']],
  ['2014', 'Arsenal (3-2 AET vs Hull City, Ramsey winner ending 9-yr drought)', ['Hull City', 'Wigan Athletic', 'Sheffield United']],
  ['2013', 'Wigan Athletic (1-0 vs Manchester City, Ben Watson 91st min header)', ['Manchester City', 'Chelsea', 'Millwall']],
  ['2012', 'Chelsea (2-1 vs Liverpool, Drogba final goal)', ['Liverpool', 'Tottenham', 'Everton']],
  ['2011', 'Manchester City (1-0 vs Stoke City, Yaya Touré winner)', ['Stoke City', 'Manchester United', 'Bolton Wanderers']],
  ['2010', 'Chelsea (1-0 vs Portsmouth, Drogba free-kick)', ['Portsmouth', 'Aston Villa', 'Tottenham']],
  ['2008', 'Portsmouth (1-0 vs Cardiff City, Nwankwo Kanu winner)', ['Cardiff City', 'West Brom', 'Barnsley']],
  ['2006', 'Liverpool (penalties vs West Ham, Steven Gerrard 91st min 35-yard screamer)', ['West Ham United', 'Chelsea', 'Middlesbrough']]
];

for (const [year, winner, wrong] of faCupFinals) {
  pool.push(makeQ(`Which club won the FA Cup in ${year}?`, winner, wrong, 'pl', 'fa-cup-winner'));
}

// =========================================================================
// 3. FIFA CLUB WORLD CUP CHAMPIONS
// =========================================================================
const cwcWinners = [
  ['2023', 'Manchester City (4-0 vs Fluminense in Jeddah)', ['Fluminense', 'Al Ahly', 'Urawa Red Diamonds']],
  ['2022', 'Real Madrid (5-3 vs Al Hilal in Morocco)', ['Al Hilal', 'Flamengo', 'Al Ahly']],
  ['2021', 'Chelsea (2-1 AET vs Palmeiras, Havertz 117th min pen)', ['Palmeiras', 'Al Ahly', 'Al Hilal']],
  ['2020', 'Bayern Munich (1-0 vs Tigres UANL, Pavard winner)', ['Tigres UANL', 'Al Ahly', 'Palmeiras']],
  ['2019', 'Liverpool (1-0 AET vs Flamengo, Firmino 99th min winner)', ['Flamengo', 'Monterrey', 'Al-Hilal']],
  ['2018', 'Real Madrid (4-1 vs Al Ain)', ['Al Ain', 'River Plate', 'Kashima Antlers']],
  ['2017', 'Real Madrid (1-0 vs Grêmio, Ronaldo free-kick)', ['Grêmio', 'Pachuca', 'Al Jazira']],
  ['2016', 'Real Madrid (4-2 AET vs Kashima Antlers, Ronaldo hat-trick)', ['Kashima Antlers', 'Atlético Nacional', 'Club América']],
  ['2015', 'Barcelona (3-0 vs River Plate, Messi & Suárez brace)', ['River Plate', 'Sanfrecce Hiroshima', 'Guangzhou Evergrande']],
  ['2014', 'Real Madrid (2-0 vs San Lorenzo, Ramos & Bale)', ['San Lorenzo', 'Auckland City', 'Cruz Azul']],
  ['2012', 'Corinthians (1-0 vs Chelsea, Paolo Guerrero header)', ['Chelsea', 'Monterrey', 'Al Ahly']],
  ['2005', 'São Paulo (1-0 vs Liverpool, Mineiro goal)', ['Liverpool', 'Deportivo Saprissa', 'Al Ittihad']]
];

for (const [year, correct, wrong] of cwcWinners) {
  pool.push(makeQ(`Who won the FIFA Club World Cup in ${year}?`, correct, wrong, 'world', 'cwc-winner'));
}

// =========================================================================
// 4. FAMOUS WORLD CUP MOMENTS & GOALS
// =========================================================================
const wcMoments = [
  makeQ('Who scored South Africa\'s iconic opening goal at the 2010 World Cup vs Mexico ("Goal for South Africa! Goal for all of Africa!")?', 'Siphiwe Tshabalala', ['Katlego Mphela', 'Steven Pienaar', 'Teko Modise'], 'world', 'wc-moments'),
  makeQ('Who scored the stunning diving "Flying Dutchman" header for Netherlands in their 5-1 thrashing of Spain in 2014?', 'Robin van Persie', ['Arjen Robben', 'Wesley Sneijder', 'Stefan de Vrij'], 'world', 'wc-moments'),
  makeQ('Who won the 2014 FIFA Puskás Award for his incredible chest-and-volley goal for Colombia against Uruguay?', 'James Rodríguez', ['Radamel Falcao', 'Juan Cuadrado', 'Jackson Martínez'], 'world', 'wc-moments'),
  makeQ('Who scored a hat-trick in the 2022 FIFA World Cup Final for France against Argentina?', 'Kylian Mbappé', ['Antoine Griezmann', 'Olivier Giroud', 'Karim Benzema'], 'world', 'wc-moments'),
  makeQ('Who was sent off for a headbutt on Marco Materazzi in extra time of the 2006 FIFA World Cup Final?', 'Zinedine Zidane', ['Patrick Vieira', 'Thierry Henry', 'David Trezeguet'], 'world', 'wc-moments'),
  makeQ('In 2010, Luis Suárez committed an infamous intentional handball on the goal line in the 120th minute against which African country?', 'Ghana', ['Nigeria', 'Ivory Coast', 'Algeria'], 'world', 'wc-moments'),
  makeQ('Following Luis Suárez\'s handball in 2010, which Ghanaian striker struck the crossbar with his 122nd-minute penalty kick?', 'Asamoah Gyan', ['Sulley Muntari', 'Kevin-Prince Boateng', 'Stephen Appiah'], 'world', 'wc-moments'),
  makeQ('Who scored the fastest goal in FIFA World Cup history (10.8 seconds for Turkey against South Korea in 2002)?', 'Hakan Şükür', ['İlhan Mansız', 'Nihat Kahveci', 'Emre Belözoğlu'], 'world', 'wc-moments'),
  makeQ('Who is the only player to have scored a hat-trick in a Men\'s FIFA World Cup final before Kylian Mbappé in 2022?', 'Geoff Hurst (1966 for England)', ['Pelé (1958)', 'Ronaldo (2002)', 'Gerd Müller (1974)'], 'world', 'wc-moments'),
  makeQ('Which nation suffered the shocking "Mineirazo" 7-1 defeat to Germany on home soil in the 2014 World Cup semi-final?', 'Brazil', ['Argentina', 'Colombia', 'Chile'], 'world', 'wc-moments')
];

for (const q of wcMoments) pool.push(q);

// =========================================================================
// 5. MANAGERIAL CLUBS & CAREER MILESTONES
// =========================================================================
const managerLore = [
  makeQ('José Mourinho famously called himself "The Special One" when taking charge of which English club in 2004?', 'Chelsea', ['Manchester United', 'Tottenham Hotspur', 'Real Madrid'], 'pl', 'manager-lore'),
  makeQ('Which manager won the Premier League with Manchester City in 2013/14, becoming the first non-European manager to win the title?', 'Manuel Pellegrini', ['Roberto Mancini', 'Mauricio Pochettino', 'Marcelo Bielsa'], 'pl', 'manager-lore'),
  makeQ('Which Italian manager guided Leicester City to their historic 2015/16 Premier League title?', 'Claudio Ranieri', ['Antonio Conte', 'Roberto Mancini', 'Carlo Ancelotti'], 'pl', 'manager-lore'),
  makeQ('Which manager won the Premier League with Chelsea in 2016/17 using a revolutionary 3-4-3 tactical system?', 'Antonio Conte', ['José Mourinho', 'Maurizio Sarri', 'Thomas Tuchel'], 'pl', 'manager-lore'),
  makeQ('Which manager led Liverpool to their first league championship in 30 years in 2019/20?', 'Jürgen Klopp', ['Rafael Benítez', 'Brendan Rodgers', 'Roy Hodgson'], 'pl', 'manager-lore'),
  makeQ('Which manager won 4 UEFA Europa League titles (3 with Sevilla, 1 with Villarreal)?', 'Unai Emery', ['José Mourinho', 'Diego Simeone', 'Julen Lopetegui'], 'other', 'manager-lore'),
  makeQ('Which manager took charge of Liverpool in summer 2024 following the departure of Jürgen Klopp?', 'Arne Slot', ['Xabi Alonso', 'Rúben Amorim', 'Julian Nagelsmann'], 'pl', 'manager-lore'),
  makeQ('Which Argentine manager has managed Atlético Madrid continuously since December 2011?', 'Diego Simeone', ['Marcelo Bielsa', 'Mauricio Pochettino', 'Jorge Sampaoli'], 'other', 'manager-lore'),
  makeQ('Who was the manager of Greece when they famously won UEFA Euro 2004 as massive underdogs?', 'Otto Rehhagel', ['Guus Hiddink', 'Dick Advocaat', 'Fernando Santos'], 'world', 'manager-lore')
];

for (const q of managerLore) pool.push(q);

console.log(`Generated ${pool.length} additional curated football questions in bank 2.`);

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
