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
// 1. EFL / CARABAO CUP FINALS (1995 - 2024)
// =========================================================================
const eflFinals = [
  ['2024', 'Liverpool (1-0 AET vs Chelsea, Van Dijk 118th min header)', ['Chelsea', 'Fulham', 'Middlesbrough']],
  ['2023', 'Manchester United (2-0 vs Newcastle United, Casemiro & Rashford)', ['Newcastle United', 'Southampton', 'Nottingham Forest']],
  ['2022', 'Liverpool (11-10 penalties vs Chelsea, 0-0 AET)', ['Chelsea', 'Arsenal', 'Tottenham Hotspur']],
  ['2021', 'Manchester City (1-0 vs Tottenham Hotspur, Laporte 82nd min)', ['Tottenham Hotspur', 'Manchester United', 'Brentford']],
  ['2020', 'Manchester City (2-1 vs Aston Villa, Agüero & Rodri)', ['Aston Villa', 'Manchester United', 'Leicester City']],
  ['2019', 'Manchester City (penalties vs Chelsea, 0-0 AET, Kepa substitution saga)', ['Chelsea', 'Burton Albion', 'Tottenham Hotspur']],
  ['2018', 'Manchester City (3-0 vs Arsenal, Agüero, Kompany & Silva)', ['Arsenal', 'Bristol City', 'Chelsea']],
  ['2017', 'Manchester United (3-2 vs Southampton, Ibrahimović 87th min winner)', ['Southampton', 'Hull City', 'Liverpool']],
  ['2016', 'Manchester City (penalties vs Liverpool, Caballero 3 shootout saves)', ['Liverpool', 'Everton', 'Stoke City']],
  ['2015', 'Chelsea (2-0 vs Tottenham Hotspur, Terry & Costa)', ['Tottenham Hotspur', 'Liverpool', 'Sheffield United']],
  ['2014', 'Manchester City (3-1 vs Sunderland, Touré, Nasri & Navas)', ['Sunderland', 'West Ham United', 'Manchester United']],
  ['2013', 'Swansea City (5-0 vs Bradford City, Dyer brace & Michu)', ['Bradford City', 'Chelsea', 'Aston Villa']],
  ['2012', 'Liverpool (penalties vs Cardiff City, Gerrard cousins shootout)', ['Cardiff City', 'Manchester City', 'Crystal Palace']],
  ['2011', 'Birmingham City (2-1 vs Arsenal, Obafemi Martins 89th min winner)', ['Arsenal', 'West Ham United', 'Ipswich Town']],
  ['2010', 'Manchester United (2-1 vs Aston Villa, Owen & Rooney)', ['Aston Villa', 'Manchester City', 'Blackburn Rovers']],
  ['2009', 'Manchester United (penalties vs Tottenham Hotspur, Ben Foster iPod saves)', ['Tottenham Hotspur', 'Derby County', 'Burnley']],
  ['2008', 'Tottenham Hotspur (2-1 AET vs Chelsea, Woodgate extra-time header)', ['Chelsea', 'Arsenal', 'Everton']],
  ['2007', 'Chelsea (2-1 vs Arsenal, Drogba brace)', ['Arsenal', 'Wycombe Wanderers', 'Tottenham Hotspur']],
  ['2006', 'Manchester United (4-0 vs Wigan Athletic, Rooney brace, Saha & Ronaldo)', ['Wigan Athletic', 'Blackburn Rovers', 'Arsenal']],
  ['2005', 'Chelsea (3-2 AET vs Liverpool, Drogba & Kežman in Cardiff)', ['Liverpool', 'Manchester United', 'Watford']],
  ['2004', 'Middlesbrough (2-1 vs Bolton Wanderers, First major trophy in club history)', ['Bolton Wanderers', 'Arsenal', 'Aston Villa']],
  ['2003', 'Liverpool (2-0 vs Manchester United, Gerrard & Owen)', ['Manchester United', 'Sheffield United', 'Blackburn Rovers']],
  ['2002', 'Blackburn Rovers (2-1 vs Tottenham Hotspur, Andy Cole 68th min winner)', ['Tottenham Hotspur', 'Sheffield Wednesday', 'Chelsea']],
  ['2001', 'Liverpool (penalties vs Birmingham City, Westerveld shootout save)', ['Birmingham City', 'Crystal Palace', 'Ipswich Town']],
  ['2000', 'Leicester City (2-1 vs Tranmere Rovers, Matt Elliott brace)', ['Tranmere Rovers', 'Aston Villa', 'Bolton Wanderers']]
];

for (const [year, winner, wrong] of eflFinals) {
  pool.push(makeQ(`Who won the English League Cup (Carabao / EFL Cup) in ${year}?`, winner, wrong, 'pl', 'efl-winner'));
}

// =========================================================================
// 2. BALLON D'OR RUNNERS-UP & PODIUM FINISHES
// =========================================================================
const ballonDorRunners = [
  ['2024', 'Vinícius Júnior (Real Madrid)', ['Jude Bellingham (3rd)', 'Dani Carvajal (4th)', 'Erling Haaland (5th)']],
  ['2023', 'Erling Haaland (Manchester City)', ['Kylian Mbappé (3rd)', 'Kevin De Bruyne (4th)', 'Rodri (5th)']],
  ['2022', 'Sadio Mané (Liverpool/Bayern)', ['Kevin De Bruyne (3rd)', 'Robert Lewandowski (4th)', 'Mohamed Salah (5th)']],
  ['2021', 'Robert Lewandowski (Bayern Munich)', ['Jorginho (3rd)', 'Karim Benzema (4th)', 'N\'Golo Kanté (5th)']],
  ['2019', 'Virgil van Dijk (Liverpool, missed by 7 pts)', ['Cristiano Ronaldo (3rd)', 'Sadio Mané (4th)', 'Mohamed Salah (5th)']],
  ['2018', 'Cristiano Ronaldo (Real Madrid/Juventus)', ['Antoine Griezmann (3rd)', 'Kylian Mbappé (4th)', 'Lionel Messi (5th)']],
  ['2017', 'Lionel Messi (FC Barcelona)', ['Neymar (3rd)', 'Gianluigi Buffon (4th)', 'Luka Modrić (5th)']],
  ['2016', 'Lionel Messi (FC Barcelona)', ['Antoine Griezmann (3rd)', 'Luis Suárez (4th)', 'Neymar (5th)']],
  ['2015', 'Cristiano Ronaldo (Real Madrid)', ['Neymar (3rd)', 'Robert Lewandowski (4th)', 'Luis Suárez (5th)']],
  ['2014', 'Lionel Messi (FC Barcelona)', ['Manuel Neuer (3rd)', 'Arjen Robben (4th)', 'Thomas Müller (5th)']],
  ['2013', 'Lionel Messi (FC Barcelona)', ['Franck Ribéry (3rd)', 'Zlatan Ibrahimović (4th)', 'Neymar (5th)']],
  ['2012', 'Cristiano Ronaldo (Real Madrid)', ['Andrés Iniesta (3rd)', 'Xavi Hernández (4th)', 'Radamel Falcao (5th)']],
  ['2011', 'Cristiano Ronaldo (Real Madrid)', ['Xavi Hernández (3rd)', 'Andrés Iniesta (4th)', 'Wayne Rooney (5th)']],
  ['2010', 'Andrés Iniesta (FC Barcelona, all-Barca podium)', ['Xavi Hernández (3rd)', 'Wesley Sneijder (4th)', 'Diego Forlán (5th)']],
  ['2005', 'Frank Lampard (Chelsea)', ['Steven Gerrard (3rd)', 'Thierry Henry (4th)', 'Andriy Shevchenko (5th)']],
  ['2004', 'Deco (Porto/Barcelona)', ['Ronaldinho (3rd)', 'Thierry Henry (4th)', 'Theodoros Zagorakis (5th)']],
  ['2003', 'Thierry Henry (Arsenal)', ['Paolo Maldini (3rd)', 'Andriy Shevchenko (4th)', 'Zinedine Zidane (5th)']],
  ['2002', 'Roberto Carlos (Real Madrid & Brazil)', ['Oliver Kahn (3rd)', 'Zinedine Zidane (4th)', 'Michael Ballack (5th)']],
  ['2001', 'Raúl González (Real Madrid)', ['Oliver Kahn (3rd)', 'David Beckham (4th)', 'Francesco Totti (5th)']],
  ['1999', 'David Beckham (Manchester United)', ['Andriy Shevchenko (3rd)', 'Gabriel Batistuta (4th)', 'Luís Figo (5th)']],
  ['1998', 'Davor Šuker (Real Madrid & Croatia)', ['Ronaldo Nazário (3rd)', 'Michael Owen (4th)', 'Lilian Thuram (5th)']]
];

for (const [year, runnerUp, wrong] of ballonDorRunners) {
  pool.push(makeQ(`Who finished as the runner-up (2nd place) for the Ballon d'Or in ${year}?`, runnerUp, wrong, 'world', 'ballon-dor-runner'));
}

// =========================================================================
// 3. HISTORIC AFCON FINALS & HEROES (1970 - 1994)
// =========================================================================
const historicAfcon = [
  ['1980', 'Nigeria (3-0 vs Algeria in Lagos, Segun Odegbami brace & Muda Lawal)', ['Algeria', 'Egypt', 'Morocco']],
  ['1992', 'Ivory Coast (11-10 penalty shootout vs Ghana, Alain Gouaméné saves)', ['Ghana', 'Nigeria', 'Cameroon']],
  ['1990', 'Algeria (1-0 vs Nigeria in Algiers, Cherif Oudjani winner)', ['Nigeria', 'Zambia', 'Senegal']],
  ['1988', 'Cameroon (1-0 vs Nigeria in Casablanca, Emmanuel Kundé penalty)', ['Nigeria', 'Algeria', 'Morocco']],
  ['1986', 'Egypt (penalties vs Cameroon in Cairo, 0-0 AET)', ['Cameroon', 'Ivory Coast', 'Morocco']],
  ['1984', 'Cameroon (3-1 vs Nigeria in Abidjan, René Ndjeya, Abega & Ebongué)', ['Nigeria', 'Algeria', 'Egypt']],
  ['1982', 'Ghana (penalties vs Libya in Tripoli, George Alhassan top scorer)', ['Libya', 'Zambia', 'Algeria']],
  ['1978', 'Ghana (2-0 vs Uganda in Accra, Opoku Afriyie brace)', ['Uganda', 'Nigeria', 'Tunisia']],
  ['1976', 'Morocco (Final group stage triumph in Ethiopia, Ahmed Faras)', ['Guinea', 'Nigeria', 'Egypt']],
  ['1974', 'Zaire / DR Congo (2-0 replay vs Zambia in Cairo, Ndaye Mulamba record 9 goals)', ['Zambia', 'Egypt', 'Congo']],
  ['1972', 'Congo (3-2 vs Mali in Yaoundé, François M\'Pelé & Jean-Michel M\'Bono)', ['Mali', 'Cameroon', 'Zaire']],
  ['1970', 'Sudan (1-0 vs Ghana in Khartoum, Hasabu El-Sagheer winner)', ['Ghana', 'Egypt', 'Ivory Coast']]
];

for (const [year, winner, wrong] of historicAfcon) {
  pool.push(makeQ(`Who won the Africa Cup of Nations (AFCON) in ${year}?`, winner, wrong, 'world', 'afcon-historic'));
}

// =========================================================================
// 4. DRAMATIC PENALTY SHOOTOUT DECIDERS
// =========================================================================
const shootouts = [
  makeQ('Which Italian goalkeeper saved penalties from Jadon Sancho and Bukayo Saka to win the UEFA Euro 2020 Final shootout against England?', 'Gianluigi Donnarumma', ['Gianluigi Buffon', 'Salvatore Sirigu', 'Alex Meret'], 'world', 'penalty-shootouts'),
  makeQ('In the 2008 UEFA Champions League Final in Moscow, which Chelsea captain famously slipped on the wet turf, missing the title-winning penalty?', 'John Terry', ['Frank Lampard', 'Didier Drogba', 'Ashley Cole'], 'ucl', 'penalty-shootouts'),
  makeQ('Who scored Chelsea\'s decisive 5th penalty in the 2012 Champions League Final shootout against Bayern Munich in Munich?', 'Didier Drogba', ['David Luiz', 'Frank Lampard', 'Ashley Cole'], 'ucl', 'penalty-shootouts'),
  makeQ('Which goalkeeper performed his famous "spaghetti legs" dance on the goal line to help Liverpool win the 2005 UCL final shootout vs AC Milan?', 'Jerzy Dudek', ['Pepe Reina', 'Sander Westerveld', 'David James'], 'ucl', 'penalty-shootouts'),
  makeQ('Which Italian superstar famously skied his penalty over the crossbar in the 1994 World Cup Final shootout against Brazil in Pasadena?', 'Roberto Baggio', ['Franco Baresi', 'Daniele Massaro', 'Paolo Maldini'], 'world', 'penalty-shootouts'),
  makeQ('Which French striker struck the crossbar with his penalty in the 2006 World Cup Final shootout against Italy in Berlin?', 'David Trezeguet', ['Thierry Henry', 'Sylvain Wiltord', 'Florent Malouda'], 'world', 'penalty-shootouts'),
  makeQ('Which current England manager famously had his crucial sudden-death penalty saved by Andreas Köpke in the Euro 1996 semi-final shootout vs Germany?', 'Gareth Southgate', ['Stuart Pearce', 'Paul Ince', 'Tony Adams'], 'world', 'penalty-shootouts'),
  makeQ('In the marathon 2021 UEFA Europa League Final shootout (11-10), which Manchester United goalkeeper saw his penalty saved by Gerónimo Rulli?', 'David de Gea', ['Dean Henderson', 'Sergio Romero', 'Tom Heaton'], 'ucl', 'penalty-shootouts'),
  makeQ('Which Arsenal striker scored the 89th-minute winner against Arsenal for Birmingham City in the 2011 League Cup final after a mix-up between Koscielny and Szczęsny?', 'Obafemi Martins', ['Nikola Žigić', 'Craig Gardner', 'Sebastian Larsson'], 'pl', 'historic-moments')
];

for (const q of shootouts) pool.push(q);

// =========================================================================
// 5. STADIUM CAPACITIES & RECORD HOMES
// =========================================================================
const stadiumTrivia = [
  makeQ('Which iconic stadium holds the all-time official world record for the highest attendance in football history (~199,854 spectators for 1950 World Cup final)?', 'Maracanã Stadium (Rio de Janeiro)', ['Camp Nou (Barcelona)', 'Wembley Stadium (London)', 'Estadio Azteca (Mexico City)'], 'world', 'stadium-trivia'),
  makeQ('Which is the largest club football stadium in Europe by seating capacity (~99,354 seats)?', 'Spotify Camp Nou (FC Barcelona)', ['Santiago Bernabéu (Real Madrid)', 'Wembley Stadium (London)', 'San Siro (Milan)'], 'other', 'stadium-trivia'),
  makeQ('Which is the largest club football stadium in England by seating capacity (~74,310 seats)?', 'Old Trafford (Manchester United)', ['Tottenham Hotspur Stadium', 'Emirates Stadium', 'Anfield'], 'pl', 'stadium-trivia'),
  makeQ('Which German stadium is world-famous for its massive 25,000-capacity standing terrace known as the "Yellow Wall" (Die Gelbe Wand)?', 'Signal Iduna Park (Borussia Dortmund)', ['Allianz Arena (Bayern Munich)', 'Veltins-Arena (Schalke 04)', 'Deutsche Bank Park (Frankfurt)'], 'other', 'stadium-trivia'),
  makeQ('Which stadium is the only venue in history to have hosted two Men\'s FIFA World Cup Finals (1970 and 1986)?', 'Estadio Azteca (Mexico City)', ['Maracanã (Rio de Janeiro)', 'Wembley Stadium (London)', 'Olympiastadion (Berlin)'], 'world', 'stadium-trivia'),
  makeQ('Which iconic stadium in Milan is officially named Stadio Giuseppe Meazza when Inter play at home and San Siro when AC Milan play?', 'San Siro / Stadio Giuseppe Meazza', ['Stadio Olimpico', 'Allianz Stadium', 'Stadio Diego Armando Maradona'], 'other', 'stadium-trivia'),
  makeQ('In 2020, Napoli officially renamed their home stadium (formerly Stadio San Paolo) in honour of which legendary player?', 'Diego Armando Maradona', ['Careca', 'Ciro Ferrara', 'Marek Hamšík'], 'other', 'stadium-trivia')
];

for (const q of stadiumTrivia) pool.push(q);

// =========================================================================
// 6. MORE COMPLETE THE NAME & INTERNATIONAL FLAGS
// =========================================================================
const namesFinal = [
  ['Nico', 'Williams', ['Iñaki', 'Vivian', 'Sancet'], 'Athletic Bilbao & Spain Euro 2024 final scorer'],
  ['Iñaki', 'Williams', ['Nico', 'Berenguer', 'Guruzeta'], 'Athletic Bilbao & Ghana lightning forward'],
  ['Oihan', 'Sancet', ['Prados', 'Herrera', 'Galarreta'], 'Athletic Bilbao & Spain attacking midfielder'],
  ['Unai', 'Simón', ['Agirrezabala', 'Raya', 'Remiro'], 'Athletic Bilbao & Spain Euro 2024 number 1 GK'],
  ['Dani', 'Vivian', ['Paredes', 'Yeray', 'Lekue'], 'Athletic Bilbao & Spain centre-back'],
  ['Gorka', 'Guruzeta', ['Berenguer', 'Williams', 'Villalibre'], 'Athletic Bilbao & Spain striker'],
  ['Álex', 'Berenguer', ['Sancet', 'Djaló', 'Gómez'], 'Athletic Bilbao & Spain versatile winger'],
  ['Brais', 'Méndez', ['Zubimendi', 'Merino', 'Turrientes'], 'Real Sociedad & Spain creative midfielder'],
  ['Beñat', 'Turrientes', ['Zubimendi', 'Olasagasti', 'Urko'], 'Real Sociedad & Spain Olympic champion midfielder'],
  ['Jon', 'Aramburu', ['Traoré', 'Muñoz', 'Odriozola'], 'Real Sociedad & Venezuela energetic right-back'],
  ['Luka', 'Sučić', ['Zubimendi', 'Méndez', 'Barrenetxea'], 'Real Sociedad & Croatia talented midfielder'],
  ['Sergio', 'Gómez', ['Barrenetxea', 'Becker', 'Sadiq'], 'Real Sociedad & Spain Olympic gold hero winger'],
  ['Sheraldo', 'Becker', ['Sadiq', 'Óskarsson', 'Gómez'], 'Real Sociedad & Suriname rapid forward'],
  ['Orri', 'Óskarsson', ['Sadiq', 'Becker', 'Oyarzabal'], 'Real Sociedad & Iceland tall striker'],
  ['Samu', 'Omorodion (Aghehowa)', ['Galeno', 'Pepê', 'Navarro'], 'FC Porto & Spain Olympic gold striker'],
  ['Wenderson', 'Galeno', ['Pepê', 'Gonçalo', 'Varela'], 'FC Porto & Brazil electric winger'],
  ['Alan', 'Varela', ['Eustáquio', 'Nico', 'Grujić'], 'FC Porto & Argentina midfield controller'],
  ['Nico', 'González', ['Varela', 'Grujić', 'Eustáquio'], 'FC Porto & Spain midfielder'],
  ['Diogo', 'Costa', ['Cláudio Ramos', 'Samuel', 'Meixedo'], 'FC Porto & Portugal penalty-saving specialist goalkeeper'],
  ['Orkun', 'Kökçü', ['Aursnes', 'Florentino', 'Rollheiser'], 'Benfica & Turkey dynamic midfielder'],
  ['Kerem', 'Aktürkoğlu', ['Kökçü', 'Di María', 'Pavlos'], 'Benfica & Turkey wizard winger'],
  ['Fredrik', 'Aursnes', ['Kökçü', 'Florentino', 'Barreiro'], 'Benfica & Norway versatile midfielder'],
  ['Florentino', 'Luís', ['Aursnes', 'Kökçü', 'Barreiro'], 'Benfica & Portugal defensive anchor'],
  ['Leandro', 'Barreiro', ['Aursnes', 'Florentino', 'Kökçü'], 'Benfica & Luxembourg tireless midfielder'],
  ['Gianluca', 'Prestianni', ['Rollheiser', 'Schelderup', 'Beste'], 'Benfica & Argentina wonderkid'],
  ['Vangelis', 'Pavlidis', ['Cabral', 'Amdouni', 'Rollheiser'], 'Benfica & Greece prolific striker'],
  ['Zeno', 'Debast', ['Inácio', 'Diomande', 'St. Juste'], 'Sporting CP & Belgium modern centre-back'],
  ['Ousmane', 'Diomande', ['Inácio', 'Debast', 'Quaresma'], 'Sporting CP & Ivory Coast AFCON champion centre-back'],
  ['Gonçalo', 'Inácio', ['Diomande', 'Debast', 'Quaresma'], 'Sporting CP & Portugal left-footed centre-back'],
  ['Morten', 'Hjulmand', ['Morita', 'Bragança', 'Simões'], 'Sporting CP & Denmark Euro 2024 screamer scorer'],
  ['Hidemasa', 'Morita', ['Hjulmand', 'Bragança', 'Kovacevic'], 'Sporting CP & Japan midfield conductor'],
  ['Geovany', 'Quenda', ['Catamo', 'Trincão', 'Santos'], 'Sporting CP & Portugal wonderkid wing-back'],
  ['Geny', 'Catamo', ['Quenda', 'Trincão', 'Edwards'], 'Sporting CP & Mozambique match-winning wing-back'],
  ['Francisco', 'Trincão', ['Quenda', 'Catamo', 'Edwards'], 'Sporting CP & Portugal skilled winger'],
  ['Marcus', 'Edwards', ['Trincão', 'Quenda', 'Catamo'], 'Sporting CP & England tricky winger'],
  ['Conrad', 'Harder', ['Gyökeres', 'Trincão', 'Edwards'], 'Sporting CP & Denmark young powerhouse striker']
];

for (const [first, correct, wrong, desc] of namesFinal) {
  pool.push(makeQ(`Complete the name of this ${desc}: ${first} ______`, correct, wrong, 'other', 'complete-the-name'));
}

const flagsFinal = [
  ['Vangelis Pavlidis', 'Greece', ['Cyprus', 'Albania', 'Bulgaria'], '🇬🇷'],
  ['Konstantinos Tsimikas', 'Greece', ['Cyprus', 'Albania', 'Bulgaria'], '🇬🇷'],
  ['Odysseas Vlachodimos', 'Greece', ['Germany', 'Cyprus', 'Albania'], '🇬🇷'],
  ['Fotis Ioannidis', 'Greece', ['Cyprus', 'Bulgaria', 'Romania'], '🇬🇷'],
  ['Christos Tzolis', 'Greece', ['Cyprus', 'Albania', 'North Macedonia'], '🇬🇷'],
  ['Amir Rrahmani', 'Kosovo', ['Albania', 'North Macedonia', 'Montenegro'], '🇽🇰'],
  ['Milot Rashica', 'Kosovo', ['Albania', 'North Macedonia', 'Turkey'], '🇽🇰'],
  ['Vedat Muriqi', 'Kosovo', ['Albania', 'Turkey', 'North Macedonia'], '🇽🇰'],
  ['Edon Zhegrova', 'Kosovo', ['Albania', 'North Macedonia', 'Montenegro'], '🇽🇰'],
  ['Arijanet Muric', 'Kosovo', ['Montenegro', 'Switzerland', 'Albania'], '🇽🇰'],
  ['Berat Djimsiti', 'Albania', ['Kosovo', 'Switzerland', 'North Macedonia'], '🇦🇱'],
  ['Kristjan Asllani', 'Albania', ['Kosovo', 'Italy', 'North Macedonia'], '🇦🇱'],
  ['Nedim Bajrami', 'Albania', ['Switzerland', 'Kosovo', 'North Macedonia'], '🇦🇱'],
  ['Armando Broja', 'Albania', ['England', 'Kosovo', 'North Macedonia'], '🇦🇱'],
  ['Ernest Muçi', 'Albania', ['Kosovo', 'North Macedonia', 'Turkey'], '🇦🇱'],
  ['Thomas Strakosha', 'Albania', ['Greece', 'Kosovo', 'Cyprus'], '🇦🇱'],
  ['Ardian Ismajli', 'Albania', ['Kosovo', 'Croatia', 'North Macedonia'], '🇦🇱'],
  ['Geny Catamo', 'Mozambique', ['Angola', 'Cape Verde', 'Guinea-Bissau'], '🇲🇿'],
  ['Reinildo Mandava', 'Mozambique', ['Angola', 'Cape Verde', 'South Africa'], '🇲🇿'],
  ['Zito Luvumbo', 'Angola', ['Mozambique', 'DR Congo', 'Cape Verde'], '🇦🇴'],
  ['M\'Bala Nzola', 'Angola', ['France', 'DR Congo', 'Congo'], '🇦🇴'],
  ['Gelson Dala', 'Angola', ['Mozambique', 'Cape Verde', 'Portugal'], '🇦🇴'],
  ['Fredy', 'Angola', ['Mozambique', 'Cape Verde', 'Guinea-Bissau'], '🇦🇴'],
  ['Logan Costa', 'Cape Verde', ['France', 'Senegal', 'Guinea-Bissau'], '🇨🇻'],
  ['Bebé (Tiago Manuel)', 'Cape Verde', ['Portugal', 'Angola', 'Guinea-Bissau'], '🇨🇻'],
  ['Ryan Mendes', 'Cape Verde', ['France', 'Senegal', 'Angola'], '🇨🇻'],
  ['Jovane Cabral', 'Cape Verde', ['Portugal', 'Guinea-Bissau', 'Angola'], '🇨🇻'],
  ['Mama Baldé', 'Guinea-Bissau', ['Guinea', 'Senegal', 'Portugal'], '🇬🇼'],
  ['Franculino Djú', 'Guinea-Bissau', ['Guinea', 'Mali', 'Senegal'], '🇬🇼'],
  ['Carlos Mané', 'Guinea-Bissau', ['Portugal', 'Cape Verde', 'Angola'], '🇬🇼']
];

for (const [player, correct, wrong, flag] of flagsFinal) {
  pool.push(makeQ(`Which national team does ${player} represent internationally? ${flag}`, correct, wrong, 'world', 'country-flag'));
}

console.log(`Generated ${pool.length} total questions in final push to 3k.`);

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
