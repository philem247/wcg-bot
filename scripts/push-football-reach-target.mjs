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
// 1. FIFA WORLD CUP BEST YOUNG PLAYER AWARD WINNERS (1958 - 2022)
// =========================================================================
const wcYoungPlayers = [
  ['2022 (Qatar)', 'Enzo Fernández (Argentina)', ['Jude Bellingham', 'Aurélien Tchouaméni', 'Josko Gvardiol']],
  ['2018 (Russia)', 'Kylian Mbappé (France)', ['Trent Alexander-Arnold', 'Rodrigo Bentancur', 'Benjamin Pavard']],
  ['2014 (Brazil)', 'Paul Pogba (France)', ['Memphis Depay', 'Raphaël Varane', 'Julian Green']],
  ['2010 (South Africa)', 'Thomas Müller (Germany)', ['André Ayew', 'Giovani dos Santos', 'Javier Hernández']],
  ['2006 (Germany)', 'Lukas Podolski (Germany)', ['Cristiano Ronaldo', 'Lionel Messi', 'Cesc Fàbregas']],
  ['2002 (South Korea & Japan)', 'Landon Donovan (USA)', ['Joaquín', 'Kaká', 'Alou Diarra']],
  ['1998 (France)', 'Michael Owen (England)', ['Thierry Henry', 'Ronaldo', 'Samuel Eto\'o']],
  ['1994 (USA)', 'Marc Overmars (Netherlands)', ['Ronaldo', 'Daniel Amokachi', 'Ariel Ortega']],
  ['1990 (Italy)', 'Robert Prosinečki (Yugoslavia)', ['Paul Gascoigne', 'Thomas Brolin', 'Diego Fuser']],
  ['1986 (Mexico)', 'Enzo Scifo (Belgium)', ['Emilio Butragueño', 'Gary Lineker', 'Manuel Amoros']],
  ['1982 (Spain)', 'Manuel Amoros (France)', ['Giuseppe Bergomi', 'Norman Whiteside', 'Alain Giresse']],
  ['1978 (Argentina)', 'Antonio Cabrini (Italy)', ['Hans Krankl', 'Michel Platini', 'Paolo Rossi']],
  ['1974 (West Germany)', 'Władysław Żmuda (Poland)', ['Paul Breitner', 'Uli Hoeness', 'Grzegorz Lato']],
  ['1970 (Mexico)', 'Teófilo Cubillas (Peru)', ['Carlos Alberto', 'Gerd Müller', 'Jairzinho']],
  ['1966 (England)', 'Franz Beckenbauer (West Germany)', ['Eusébio', 'Geoff Hurst', 'Bobby Moore']],
  ['1962 (Chile)', 'Flórián Albert (Hungary)', ['Garrincha', 'Amarildo', 'Vavá']],
  ['1958 (Sweden)', 'Pelé (Brazil, age 17)', ['Just Fontaine', 'Kurt Hamrin', 'Gunnar Gren']]
];

for (const [edition, correct, wrong] of wcYoungPlayers) {
  pool.push(makeQ(`Who won the Best Young Player award at the ${edition} FIFA World Cup?`, correct, wrong, 'world', 'wc-best-young'));
}

// =========================================================================
// 2. CHAMPIONSHIP PLAY-OFF FINAL WINNERS (THE £100M+ MATCH 2000 - 2024)
// =========================================================================
const playoffFinals = [
  ['2024', 'Southampton (1-0 vs Leeds United, Adam Armstrong winner)', ['Leeds United', 'West Brom', 'Norwich City']],
  ['2023', 'Luton Town (penalties vs Coventry City, 1-1 AET)', ['Coventry City', 'Middlesbrough', 'Sunderland']],
  ['2022', 'Nottingham Forest (1-0 vs Huddersfield Town, Colwill OG)', ['Huddersfield Town', 'Sheffield United', 'Luton Town']],
  ['2021', 'Brentford (2-0 vs Swansea City, Ivan Toney & Emiliano Marcondes)', ['Swansea City', 'Bournemouth', 'Barnsley']],
  ['2020', 'Fulham (2-1 AET vs Brentford, Joe Bryan extra-time brace)', ['Brentford', 'Cardiff City', 'Swansea City']],
  ['2019', 'Aston Villa (2-1 vs Derby County, El Ghazi & McGinn)', ['Derby County', 'West Brom', 'Leeds United']],
  ['2018', 'Fulham (1-0 vs Aston Villa, Tom Cairney 23rd min winner)', ['Aston Villa', 'Middlesbrough', 'Derby County']],
  ['2017', 'Huddersfield Town (penalties vs Reading, 0-0 AET, Schindler winner)', ['Reading', 'Sheffield Wednesday', 'Fulham']],
  ['2016', 'Hull City (1-0 vs Sheffield Wednesday, Mohamed Diamé 72nd min screamer)', ['Sheffield Wednesday', 'Brighton', 'Derby County']],
  ['2015', 'Norwich City (2-0 vs Middlesbrough, Cameron Jerome & Nathan Redmond)', ['Middlesbrough', 'Brentford', 'Ipswich Town']],
  ['2014', 'Queens Park Rangers (1-0 vs Derby County, Bobby Zamora 90th min winner)', ['Derby County', 'Wigan Athletic', 'Brighton']],
  ['2013', 'Crystal Palace (1-0 AET vs Watford, Kevin Phillips extra-time penalty)', ['Watford', 'Brighton', 'Leicester City']],
  ['2012', 'West Ham United (2-1 vs Blackpool, Ricardo Vaz Tê 87th min winner)', ['Blackpool', 'Birmingham City', 'Cardiff City']],
  ['2011', 'Swansea City (4-2 vs Reading, Scott Sinclair hat-trick)', ['Reading', 'Cardiff City', 'Nottingham Forest']],
  ['2010', 'Blackpool (3-2 vs Cardiff City, Brett Ormerod 45th min winner)', ['Cardiff City', 'Leicester City', 'Nottingham Forest']],
  ['2009', 'Burnley (1-0 vs Sheffield United, Wade Elliott 13th min curler)', ['Sheffield United', 'Reading', 'Preston North End']],
  ['2008', 'Hull City (1-0 vs Bristol City, Dean Windass 38th min volley)', ['Bristol City', 'Watford', 'Crystal Palace']],
  ['2007', 'Derby County (1-0 vs West Brom, Stephen Pearson 61st min winner)', ['West Bromwich Albion', 'Wolves', 'Southampton']],
  ['2006', 'Watford (3-0 vs Leeds United, Jay DeMerit header)', ['Leeds United', 'Crystal Palace', 'Preston North End']],
  ['2005', 'West Ham United (1-0 vs Preston North End, Bobby Zamora winner)', ['Preston North End', 'Ipswich Town', 'Derby County']]
];

for (const [year, winner, wrong] of playoffFinals) {
  pool.push(makeQ(`Which club won the Championship Play-off Final at Wembley in ${year} to earn promotion to the Premier League?`, winner, wrong, 'pl', 'playoff-winner'));
}

// =========================================================================
// 3. OFFICIAL FOOTBALL RULES & PITCH DIMENSIONS
// =========================================================================
const rulesTrivia = [
  makeQ('What is the official distance from the penalty spot to the goal line in association football?', '12 yards (11 meters)', ['10 yards (9.15 meters)', '15 yards (13.7 meters)', '18 yards (16.5 meters)'], 'other', 'football-rules'),
  makeQ('What are the official dimensions of a standard adult association football goal (width x height)?', '8 yards wide by 8 feet high (7.32m x 2.44m)', ['7 yards wide by 7 feet high', '10 yards wide by 8 feet high', '8 yards wide by 10 feet high'], 'other', 'football-rules'),
  makeQ('What is the radius of the centre circle on a standard football pitch?', '10 yards (9.15 meters)', ['8 yards (7.32 meters)', '12 yards (11 meters)', '15 yards (13.7 meters)'], 'other', 'football-rules'),
  makeQ('Under IFAB Laws of the Game, what is the minimum number of players a team must have on the pitch for a match to continue?', '7 players', ['8 players', '9 players', '6 players'], 'other', 'football-rules'),
  makeQ('How many substitutions is a team permitted to make in standard regulation time in modern top-flight football (across 3 stoppage windows)?', '5 substitutions', ['3 substitutions', '4 substitutions', '6 substitutions'], 'other', 'football-rules'),
  makeQ('Can a player be called offside directly from a throw-in, goal kick, or corner kick?', 'No (never offside from these three restarts)', ['Yes (offside applies on throw-ins)', 'Yes (offside applies on goal kicks)', 'Only in the penalty area'], 'other', 'football-rules'),
  makeQ('If a player takes a throw-in directly into the opponent\'s goal without touching anyone, what is awarded?', 'Goal kick to the defending team', ['Goal counts', 'Corner kick', 'Retake throw-in'], 'other', 'football-rules'),
  makeQ('If a player takes a throw-in directly into their own goal without touching anyone, what is awarded?', 'Corner kick to the opponent', ['Own goal counts', 'Goal kick', 'Retake throw-in'], 'other', 'football-rules')
];

for (const q of rulesTrivia) pool.push(q);

// =========================================================================
// 4. PREMIER LEAGUE SHIRT NUMBERS EXPANSION
// =========================================================================
const shirtExpansion = [
  ['Bruno Guimarães', 'Newcastle United', '39', ['8', '10', '4']],
  ['Alexander Isak', 'Newcastle United', '14', ['9', '11', '19']],
  ['Anthony Gordon', 'Newcastle United', '10', ['8', '11', '7']],
  ['Ollie Watkins', 'Aston Villa', '11', ['9', '10', '7']],
  ['Leon Bailey', 'Aston Villa', '31', ['7', '10', '19']],
  ['Morgan Rogers', 'Aston Villa', '27', ['10', '11', '19']],
  ['Lucas Paquetá', 'West Ham United', '10', ['11', '8', '20']],
  ['Mohammed Kudus', 'West Ham United', '14', ['10', '7', '20']],
  ['Jarrod Bowen', 'West Ham United', '20', ['7', '11', '9']],
  ['Bryan Mbeumo', 'Brentford', '19', ['10', '11', '7']],
  ['Yoane Wissa', 'Brentford', '11', ['9', '10', '19']],
  ['Eberechi Eze', 'Crystal Palace', '10', ['7', '11', '8']],
  ['Jean-Philippe Mateta', 'Crystal Palace', '14', ['9', '11', '19']],
  ['Matheus Cunha', 'Wolves', '10', ['9', '11', '12']],
  ['Hwang Hee-chan', 'Wolves', '11', ['9', '7', '10']],
  ['Dominic Solanke', 'Tottenham Hotspur', '19', ['9', '10', '11']],
  ['James Maddison', 'Tottenham Hotspur', '10', ['8', '7', '14']],
  ['Cristian Romero', 'Tottenham Hotspur', '17', ['4', '6', '13']],
  ['Micky van de Ven', 'Tottenham Hotspur', '37', ['4', '5', '6']],
  ['Guglielmo Vicario', 'Tottenham Hotspur', '1', ['13', '21', '30']],
  ['Kai Havertz', 'Arsenal', '29', ['9', '10', '11']],
  ['Gabriel Jesus', 'Arsenal', '9', ['11', '19', '10']],
  ['Gabriel Martinelli', 'Arsenal', '11', ['7', '35', '14']],
  ['Jurriën Timber', 'Arsenal', '12', ['2', '4', '6']],
  ['David Raya', 'Arsenal', '22', ['1', '13', '31']],
  ['Alejandro Garnacho', 'Manchester United', '17', ['49', '7', '11']],
  ['Kobbie Mainoo', 'Manchester United', '37', ['73', '8', '6']],
  ['Rasmus Højlund', 'Manchester United', '9', ['11', '19', '21']],
  ['Marcus Rashford', 'Manchester United', '10', ['19', '7', '9']],
  ['Lisandro Martínez', 'Manchester United', '6', ['2', '4', '5']],
  ['André Onana', 'Manchester United', '24', ['1', '13', '22']],
  ['Nicolas Jackson', 'Chelsea', '15', ['9', '11', '19']],
  ['Christopher Nkunku', 'Chelsea', '18', ['10', '11', '8']],
  ['Enzo Fernández', 'Chelsea', '8', ['5', '6', '24']],
  ['Moisés Caicedo', 'Chelsea', '25', ['8', '6', '4']],
  ['Robert Sánchez', 'Chelsea', '1', ['13', '28', '31']],
  ['Alexis Mac Allister', 'Liverpool', '10', ['8', '7', '6']],
  ['Dominik Szoboszlai', 'Liverpool', '8', ['10', '7', '14']],
  ['Luis Díaz', 'Liverpool', '7', ['11', '23', '14']],
  ['Darwin Núñez', 'Liverpool', '9', ['27', '11', '19']],
  ['Cody Gakpo', 'Liverpool', '18', ['11', '9', '19']],
  ['Alisson Becker', 'Liverpool', '1', ['13', '22', '30']]
];

for (const [player, club, correct, wrong] of shirtExpansion) {
  pool.push(makeQ(`What shirt number does ${player} wear for ${club}?`, correct, wrong, 'pl', 'shirt-number'));
}

// =========================================================================
// 5. MORE COMPLETE THE NAME & INTERNATIONAL FLAGS (100+ STARS)
// =========================================================================
const extraNames = [
  ['Federico', 'Dimarco', ['Bastoni', 'Darmian', 'Carlos Augusto'], 'Inter Milan & Italy left-back with a wand of a left foot'],
  ['Alessandro', 'Bastoni', ['Dimarco', 'Acerbi', 'Darmian'], 'Inter Milan & Italy elegant ball-playing centre-back'],
  ['Nicolò', 'Barella', ['Frattesi', 'Pellegrini', 'Cristante'], 'Inter Milan & Italy engine midfielder'],
  ['Hakan', 'Çalhanoğlu', ['Asllani', 'Zieliński', 'Mkhitaryan'], 'Inter Milan & Turkey set-piece and penalty specialist'],
  ['Marcus', 'Thuram', ['Arnautović', 'Taremi', 'Correa'], 'Inter Milan & France dynamic striker'],
  ['Davide', 'Frattesi', ['Barella', 'Mkhitaryan', 'Asllani'], 'Inter Milan & Italy super-sub goalscoring midfielder'],
  ['Yann', 'Sommer', ['Martinez', 'Di Gennaro', 'Audero'], 'Inter Milan & Switzerland veteran goalkeeper'],
  ['Christian', 'Pulisic', ['Chukwueze', 'Okafor', 'Saelemaekers'], 'AC Milan & USA superstar winger'],
  ['Ruben', 'Loftus-Cheek', ['Musah', 'Fofana', 'Reijnders'], 'AC Milan & England powerhouse midfielder'],
  ['Tijjani', 'Reijnders', ['Fofana', 'Bennacer', 'Musah'], 'AC Milan & Netherlands silky midfielder'],
  ['Youssouf', 'Fofana', ['Musah', 'Bennacer', 'Reijnders'], 'AC Milan & France ball-winning midfielder'],
  ['Strahinja', 'Pavlović', ['Tomori', 'Thiaw', 'Gabbia'], 'AC Milan & Serbia warrior centre-back'],
  ['Álvaro', 'Morata', ['Abraham', 'Jović', 'Okafor'], 'AC Milan & Spain Euro 2024 captain and striker'],
  ['Teun', 'Koopmeiners', ['Locatelli', 'Thuram', 'Fagioli'], 'Juventus & Netherlands midfield maestro'],
  ['Douglas', 'Luiz', ['Koopmeiners', 'Thuram', 'Locatelli'], 'Juventus & Brazil midfielder'],
  ['Khéphren', 'Thuram', ['Koopmeiners', 'Luiz', 'Locatelli'], 'Juventus & France powerful midfielder'],
  ['Kenan', 'Yıldız', ['Mbangula', 'Conceição', 'Weah'], 'Juventus & Turkey dazzling number 10'],
  ['Francisco', 'Conceição', ['Weah', 'González', 'Yıldız'], 'Juventus & Portugal rapid winger'],
  ['Nicolás', 'González', ['Conceição', 'Weah', 'Yıldız'], 'Juventus & Argentina winger'],
  ['Michele', 'Di Gregorio', ['Perin', 'Pinsoglio', 'Szczęsny'], 'Juventus & Italy agile goalkeeper'],
  ['Artem', 'Dovbyk', ['Shomurodov', 'Dybala', 'Soulé'], 'AS Roma & Ukraine 2023/24 La Liga Pichichi winner striker'],
  ['Matías', 'Soulé', ['Dybala', 'Baldanzi', 'El Shaarawy'], 'AS Roma & Argentina young playmaker'],
  ['Enzo', 'Le Fée', ['Cristante', 'Pellegrini', 'Koné'], 'AS Roma & France midfielder'],
  ['Manu', 'Koné', ['Cristante', 'Pellegrini', 'Le Fée'], 'AS Roma & France Olympic midfielder'],
  ['Mile', 'Svilar', ['Ryan', 'Marin', 'Boer'], 'AS Roma & Serbia goalkeeper'],
  ['Charles', 'De Ketelaere', ['Retegui', 'Lookman', 'Samardžić'], 'Atalanta & Belgium creative forward'],
  ['Mateo', 'Retegui', ['Lookman', 'De Ketelaere', 'Scamacca'], 'Atalanta & Italy prolific striker'],
  ['Lazar', 'Samardžić', ['De Ketelaere', 'Pašalić', 'Brescianini'], 'Atalanta & Serbia set-piece technician'],
  ['Marco', 'Brescianini', ['Samardžić', 'Ederson', 'De Roon'], 'Atalanta & Italy box-to-box midfielder'],
  ['Raoul', 'Bellanova', ['Zappacosta', 'Ruggeri', 'Palestra'], 'Atalanta & Italy rapid wing-back'],
  ['Mattia', 'Zaccagni', ['Castellanos', 'Dia', 'Noslin'], 'Lazio & Italy Euro 2024 98th min hero winger vs Croatia'],
  ['Valentín', 'Castellanos', ['Dia', 'Noslin', 'Pedro'], 'Lazio & Argentina striker'],
  ['Boulaye', 'Dia', ['Castellanos', 'Noslin', 'Tchaouna'], 'Lazio & Senegal forward'],
  ['Nuno', 'Tavares', ['Pellegrini', 'Lazzari', 'Marušić'], 'Lazio & Portugal assist-machine left-back']
];

for (const [first, correct, wrong, desc] of extraNames) {
  pool.push(makeQ(`Complete the name of this ${desc}: ${first} ______`, correct, wrong, 'other', 'complete-the-name'));
}

const extraFlags = [
  ['Artem Dovbyk', 'Ukraine', ['Poland', 'Russia', 'Belarus'], '🇺🇦'],
  ['Viktor Tsygankov', 'Ukraine', ['Poland', 'Czech Republic', 'Croatia'], '🇺🇦'],
  ['Vitaliy Mykolenko', 'Ukraine', ['Poland', 'Czech Republic', 'Belarus'], '🇺🇦'],
  ['Mykola Shaparenko', 'Ukraine', ['Poland', 'Czech Republic', 'Croatia'], '🇺🇦'],
  ['Georgiy Sudakov', 'Ukraine', ['Poland', 'Czech Republic', 'Slovakia'], '🇺🇦'],
  ['Anatoliy Trubin', 'Ukraine', ['Poland', 'Belarus', 'Russia'], '🇺🇦'],
  ['Andriy Lunin', 'Ukraine', ['Poland', 'Czech Republic', 'Belarus'], '🇺🇦'],
  ['Amadou Onana', 'Belgium', ['Senegal', 'Cameroon', 'France'], '🇧🇪'],
  ['Romelu Lukaku', 'Belgium', ['DR Congo', 'France', 'Netherlands'], '🇧🇪'],
  ['Loïs Openda', 'Belgium', ['DR Congo', 'France', 'Morocco'], '🇧🇪'],
  ['Jérémy Doku', 'Belgium', ['Ghana', 'France', 'Ivory Coast'], '🇧🇪'],
  ['Johan Bakayoko', 'Belgium', ['Ivory Coast', 'France', 'DR Congo'], '🇧🇪'],
  ['Arthur Vermeeren', 'Belgium', ['Netherlands', 'France', 'Germany'], '🇧🇪'],
  ['Zeno Debast', 'Belgium', ['Netherlands', 'France', 'Germany'], '🇧🇪'],
  ['Wout Faes', 'Belgium', ['Netherlands', 'Germany', 'France'], '🇧🇪'],
  ['Koen Casteels', 'Belgium', ['Netherlands', 'Germany', 'Austria'], '🇧🇪'],
  ['Xavi Simons', 'Netherlands', ['Suriname', 'Belgium', 'Curacao'], '🇳🇱'],
  ['Jeremie Frimpong', 'Netherlands', ['Ghana', 'England', 'Suriname'], '🇳🇱'],
  ['Donyell Malen', 'Netherlands', ['Suriname', 'Belgium', 'France'], '🇳🇱'],
  ['Tijjani Reijnders', 'Netherlands', ['Indonesia', 'Suriname', 'Belgium'], '🇳🇱'],
  ['Ryan Gravenberch', 'Netherlands', ['Suriname', 'Belgium', 'Germany'], '🇳🇱'],
  ['Jurriën Timber', 'Netherlands', ['Curacao', 'Suriname', 'Belgium'], '🇳🇱'],
  ['Quinten Timber', 'Netherlands', ['Curacao', 'Suriname', 'Belgium'], '🇳🇱'],
  ['Bart Verbruggen', 'Netherlands', ['Belgium', 'Germany', 'Austria'], '🇳🇱'],
  ['Micky van de Ven', 'Netherlands', ['Belgium', 'Germany', 'Suriname'], '🇳🇱'],
  ['Lutsharel Geertruida', 'Netherlands', ['Curacao', 'Suriname', 'Belgium'], '🇳🇱']
];

for (const [player, correct, wrong, flag] of extraFlags) {
  pool.push(makeQ(`Which national team does ${player} represent internationally? ${flag}`, correct, wrong, 'world', 'country-flag'));
}

console.log(`Generated ${pool.length} total questions in final reach-target.`);

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
