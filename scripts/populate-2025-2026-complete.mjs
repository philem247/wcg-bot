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
// 1. 2026 FIFA WORLD CUP COMPREHENSIVE PACK
// =========================================================================
const wc2026Full = [
  makeQ('On which exact date is the 2026 FIFA World Cup Final scheduled to take place at MetLife Stadium?', 'July 19, 2026', ['July 12, 2026', 'July 26, 2026', 'June 28, 2026'], 'world', 'wc-2026-full'),
  makeQ('Which stadium is the venue for the opening match of the 2026 FIFA World Cup on June 11, 2026?', 'Estadio Azteca (Mexico City)', ['MetLife Stadium (New York)', 'SoFi Stadium (Los Angeles)', 'BMO Field (Toronto)'], 'world', 'wc-2026-full'),
  makeQ('Which two US stadiums were selected to host the semi-finals of the 2026 FIFA World Cup?', 'AT&T Stadium (Dallas) and Mercedes-Benz Stadium (Atlanta)', ['SoFi Stadium (LA) and MetLife Stadium (NY)', 'Hard Rock Stadium (Miami) and Gillette Stadium (Boston)', 'NRG Stadium (Houston) and Lincoln Financial Field (Philly)'], 'world', 'wc-2026-full'),
  makeQ('Which Florida stadium was chosen to host the Bronze Medal (third-place playoff) match of the 2026 FIFA World Cup?', 'Hard Rock Stadium (Miami)', ['Camping World Stadium (Orlando)', 'Raymond James Stadium (Tampa)', 'Mercedes-Benz Stadium (Atlanta)'], 'world', 'wc-2026-full'),
  makeQ('In the 2026 FIFA World Cup 48-team format, how many third-placed group stage teams advance to the Round of 32?', 'The 8 best third-placed teams', ['The 4 best third-placed teams', 'All 12 third-placed teams', 'No third-placed teams advance'], 'world', 'wc-2026-full'),
  makeQ('What is the total number of host cities across USA, Canada, and Mexico for the 2026 FIFA World Cup?', '16 host cities (11 in USA, 3 in Mexico, 2 in Canada)', ['12 host cities', '18 host cities', '20 host cities'], 'world', 'wc-2026-full'),
  makeQ('How many automatic qualification spots were allocated to Africa (CAF) for the expanded 2026 FIFA World Cup (up from 5)?', '9 direct spots (+1 playoff tournament spot)', ['7 direct spots', '8 direct spots', '11 direct spots'], 'world', 'wc-2026-full'),
  makeQ('How many direct qualification spots were allocated to Asia (AFC) for the 2026 FIFA World Cup (up from 4.5)?', '8 direct spots (+1 playoff tournament spot)', ['6 direct spots', '10 direct spots', '7 direct spots'], 'world', 'wc-2026-full'),
  makeQ('How many direct qualification spots were allocated to South America (CONMEBOL) for the 2026 FIFA World Cup (out of 10 member nations)?', '6 direct spots (+1 playoff tournament spot)', ['5 direct spots', '7 direct spots', '8 direct spots'], 'world', 'wc-2026-full'),
  makeQ('How many direct qualification spots were allocated to Europe (UEFA) for the 2026 FIFA World Cup (up from 13)?', '16 direct spots', ['14 direct spots', '18 direct spots', '20 direct spots'], 'world', 'wc-2026-full'),
  makeQ('Which confederation was guaranteed an automatic direct World Cup spot for the first time in history for the 2026 tournament?', 'OFC (Oceania Football Confederation)', ['CONCACAF', 'CAF', 'AFC'], 'world', 'wc-2026-full')
];

for (const q of wc2026Full) pool.push(q);

// =========================================================================
// 2. 2025 FIFA CLUB WORLD CUP IN USA (32 TEAMS)
// =========================================================================
const cwc2025Full = [
  makeQ('Which stadium in the United States was chosen to host the Final of the inaugural 32-team 2025 FIFA Club World Cup in July 2025?', 'MetLife Stadium (New Jersey)', ['Rose Bowl (Pasadena)', 'Mercedes-Benz Stadium (Atlanta)', 'Hard Rock Stadium (Miami)'], 'world', 'cwc-2025-full'),
  makeQ('Which Major League Soccer club was awarded the host nation invitation slot for the 2025 FIFA Club World Cup after winning the 2024 MLS Supporters\' Shield?', 'Inter Miami CF (Lionel Messi)', ['Columbus Crew', 'LA Galaxy', 'Seattle Sounders'], 'world', 'cwc-2025-full'),
  makeQ('Which four African clubs qualified for the 32-team 2025 FIFA Club World Cup in the USA?', 'Al Ahly, Wydad Casablanca, Espérance de Tunis, Mamelodi Sundowns', ['Zamalek, Raja Casablanca, TP Mazembe, Pyramids FC', 'Al Ahly, Kaizer Chiefs, Orlando Pirates, Enyimba', 'Wydad, FAR Rabat, USM Alger, ES Sétif'], 'world', 'cwc-2025-full'),
  makeQ('Which four clubs represented the Asian Football Confederation (AFC) at the 2025 FIFA Club World Cup in the USA?', 'Al Hilal, Urawa Red Diamonds, Al Ain, and Ulsan HD', ['Al Nassr, Yokohama F. Marinos, Jeonbuk, Persepolis', 'Al Sadd, Al Ittihad, Pohang Steelers, Kawasaki Frontale', 'Al Ahli, Shanghai Port, Guangzhou, Vissel Kobe'], 'world', 'cwc-2025-full'),
  makeQ('Which four CONCACAF clubs qualified through the CONCACAF Champions Cup for the 2025 FIFA Club World Cup?', 'Monterrey, Seattle Sounders, León, and Pachuca', ['Club América, Tigres UANL, LAFC, Philadelphia Union', 'Cruz Azul, Toluca, Columbus Crew, Vancouver Whitecaps', 'Pumas UNAM, Chivas Guadalajara, Atlanta United, Toronto FC'], 'world', 'cwc-2025-full'),
  makeQ('Which Oceania club qualified as the OFC representative for the 2025 FIFA Club World Cup in the USA?', 'Auckland City FC (New Zealand)', ['Wellington Olympic', 'Hekari United', 'AS Magenta'], 'world', 'cwc-2025-full')
];

for (const q of cwc2025Full) pool.push(q);

// =========================================================================
// 3. 2025 & 2026 EUROPEAN CLUB FINALS & VENUES
// =========================================================================
const europeanVenues2025_2026 = [
  makeQ('Which iconic stadium in Munich, Germany hosted the 2025 UEFA Champions League Final in May 2025?', 'Allianz Arena (Munich)', ['Olympiastadion (Berlin)', 'Signal Iduna Park (Dortmund)', 'MHPArena (Stuttgart)'], 'ucl', 'euro-venues-25-26'),
  makeQ('Which stadium in Budapest, Hungary was selected by UEFA to host the 2026 UEFA Champions League Final in May 2026?', 'Puskás Aréna (Budapest)', ['Groupama Arena (Budapest)', 'National Stadium (Warsaw)', 'Ernst Happel Stadion (Vienna)'], 'ucl', 'euro-venues-25-26'),
  makeQ('Which historic Spanish stadium in Bilbao hosted the 2025 UEFA Europa League Final in May 2025?', 'San Mamés (Bilbao, Spain)', ['Estadio de La Cartuja (Seville)', 'Mestalla (Valencia)', 'Metropolitano (Madrid)'], 'ucl', 'euro-venues-25-26'),
  makeQ('Which Turkish stadium in Istanbul was selected to host the 2026 UEFA Europa League Final in May 2026?', 'Beşiktaş Stadium / Tüpraş Stadium (Istanbul)', ['Atatürk Olympic Stadium (Istanbul)', 'Rams Park (Galatasaray)', 'Şükrü Saracoğlu Stadium (Fenerbahçe)'], 'ucl', 'euro-venues-25-26'),
  makeQ('Which Polish stadium in Wrocław hosted the 2025 UEFA Conference League Final in May 2025?', 'Tarczyński Arena Wrocław (Poland)', ['PGE Narodowy (Warsaw)', 'Stadion Śląski (Chorzów)', 'Stadion Miejski (Poznań)'], 'ucl', 'euro-venues-25-26'),
  makeQ('Which German stadium in Leipzig was chosen to host the 2026 UEFA Conference League Final in May 2026?', 'Red Bull Arena (Leipzig, Germany)', ['Deutsche Bank Park (Frankfurt)', 'BayArena (Leverkusen)', 'Volksparkstadion (Hamburg)'], 'ucl', 'euro-venues-25-26')
];

for (const q of europeanVenues2025_2026) pool.push(q);

// =========================================================================
// 4. AFCON 2025/2026 IN MOROCCO
// =========================================================================
const afcon2025Morocco = [
  makeQ('In which North African nation is the 2025/2026 Africa Cup of Nations (AFCON) held across 6 host cities?', 'Morocco', ['Algeria', 'Tunisia', 'Egypt'], 'world', 'afcon-2025-details'),
  makeQ('Which Moroccan cities are official host cities for AFCON 2025/2026?', 'Casablanca, Rabat, Tangier, Marrakech, Agadir, and Fez', ['Casablanca, Marrakech, Oujda, Meknes, Tetouan, Salé', 'Rabat, Casablanca, Kenitra, Nador, Safi, El Jadida', 'Tangier, Agadir, Beni Mellal, Taza, Essaouira, Larache'], 'world', 'afcon-2025-details'),
  makeQ('Which modernized stadium in Rabat is the centerpiece venue for the AFCON 2025/2026 Final?', 'Prince Moulay Abdellah Stadium (Rabat)', ['Stade Mohammed V (Casablanca)', 'Grand Stade de Tanger', 'Grand Stade de Marrakech'], 'world', 'afcon-2025-details')
];

for (const q of afcon2025Morocco) pool.push(q);

// =========================================================================
// 5. 2024/25 & 2025/26 FOOTBALL SUPERSTARS, PRODIGIES & RECORDS
// =========================================================================
const modernRecords = [
  makeQ('Which Portuguese sensation scored 43+ goals across all competitions in 2023/24 and continued his insane goalscoring form into 2024/25 & 2025/26 for Sporting CP?', 'Viktor Gyökeres', ['Gonçalo Inácio', 'Francisco Trincão', 'Marcus Edwards'], 'other', 'modern-prodigies'),
  makeQ('Which Barcelona teenage sensation won the 2024 Kopa Trophy and European Golden Boy award at age 17 after shining at Euro 2024?', 'Lamine Yamal', ['Pau Cubarsí', 'Fermín López', 'Marc Casadó'], 'other', 'modern-prodigies'),
  makeQ('Which Barcelona teenage centre-back established himself as a world-class ball-playing defender for club and country throughout 2024–2026?', 'Pau Cubarsí', ['Héctor Fort', 'Eric García', 'Gerard Martín'], 'other', 'modern-prodigies'),
  makeQ('Which Barcelona midfield academy graduate became Hansi Flick\'s indispensable defensive midfield anchor in the 2024/25 season?', 'Marc Casadó', ['Marc Bernal', 'Pablo Torre', 'Fermín López'], 'other', 'modern-prodigies'),
  makeQ('Which Chelsea sensation scored 4 goals in the first half against Brighton in September 2024, becoming the first player in Premier League history to do so?', 'Cole Palmer', ['Nicolas Jackson', 'Noni Madueke', 'Christopher Nkunku'], 'pl', 'modern-prodigies'),
  makeQ('Which Egyptian forward began the 2024/25 Bundesliga season on fire for Eintracht Frankfurt, registering double-digit goals and assists before winter?', 'Omar Marmoush', ['Hugo Ekitiké', 'Mostafa Mohamed', 'Trézéguet'], 'other', 'modern-prodigies'),
  makeQ('Which Bayern Munich signing became an instant fan favorite in 2024/25 with his dazzling dribbling and goal contributions after joining from Crystal Palace?', 'Michael Olise', ['Bryan Zaragoza', 'Mathys Tel', 'Kingsley Coman'], 'other', 'modern-prodigies'),
  makeQ('Which Italian striker joined Atalanta in summer 2024 and became Serie A\'s leading goalscorer in the 2024/25 campaign?', 'Mateo Retegui', ['Gianluca Scamacca', 'Ciro Immobile', 'Andrea Belotti'], 'other', 'modern-prodigies'),
  makeQ('Which PSG forward stepped up as the team\'s primary attacking talisman in 2024/25 following the departure of Kylian Mbappé?', 'Bradley Barcola', ['Randal Kolo Muani', 'Marco Asensio', 'Gonçalo Ramos'], 'other', 'modern-prodigies')
];

for (const q of modernRecords) pool.push(q);

console.log(`Generated ${pool.length} 2025-2026 era complete questions.`);

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
