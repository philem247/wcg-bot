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

// Historic Ballon d'Or winners (1956 to 1995)
const classicBallon = [
  ['1956', 'Stanley Matthews (Blackpool & England, First-ever winner)', ['Alfredo Di Stéfano', 'Raymond Kopa', 'Ferenc Puskás']],
  ['1957', 'Alfredo Di Stéfano (Real Madrid & Spain)', ['Billy Wright', 'Duncan Edwards', 'Raymond Kopa']],
  ['1958', 'Raymond Kopa (Real Madrid & France)', ['Helmut Rahn', 'Just Fontaine', 'John Charles']],
  ['1959', 'Alfredo Di Stéfano (Real Madrid & Spain)', ['Raymond Kopa', 'John Charles', 'Luis Suárez']],
  ['1960', 'Luis Suárez (FC Barcelona & Spain)', ['Ferenc Puskás', 'Uwe Seeler', 'Alfredo Di Stéfano']],
  ['1961', 'Omar Sívori (Juventus & Italy)', ['Luis Suárez', 'Johnny Haynes', 'Lev Yashin']],
  ['1962', 'Josef Masopust (Dukla Prague & Czechoslovakia)', ['Eusébio', 'Karl-Heinz Schnellinger', 'Josip Skoblar']],
  ['1963', 'Lev Yashin (Dynamo Moscow & USSR, Only goalkeeper to ever win)', ['Gianni Rivera', 'Jimmy Greaves', 'Denis Law']],
  ['1964', 'Denis Law (Manchester United & Scotland)', ['Luis Suárez', 'Amancio Amaro', 'Eusébio']],
  ['1965', 'Eusébio (Benfica & Portugal)', ['Giacinto Facchetti', 'Luis Suárez', 'Bobby Charlton']],
  ['1966', 'Sir Bobby Charlton (Manchester United & England)', ['Eusébio', 'Franz Beckenbauer', 'Bobby Moore']],
  ['1967', 'Flórián Albert (Ferencváros & Hungary)', ['Bobby Charlton', 'Jimmy Johnstone', 'Franz Beckenbauer']],
  ['1968', 'George Best (Manchester United & Northern Ireland)', ['Bobby Charlton', 'Dragan Džajić', 'Franz Beckenbauer']],
  ['1969', 'Gianni Rivera (AC Milan & Italy)', ['Luigi Riva', 'Gerd Müller', 'Johan Cruyff']],
  ['1970', 'Gerd Müller (Bayern Munich & West Germany)', ['Bobby Moore', 'Luigi Riva', 'Pelé']],
  ['1971', 'Johan Cruyff (Ajax & Netherlands)', ['Sandro Mazzola', 'George Best', 'Gerd Müller']],
  ['1972', 'Franz Beckenbauer (Bayern Munich & West Germany)', ['Gerd Müller', 'Günter Netzer', 'Johan Cruyff']],
  ['1973', 'Johan Cruyff (Ajax/Barcelona & Netherlands)', ['Dino Zoff', 'Gerd Müller', 'Franz Beckenbauer']],
  ['1974', 'Johan Cruyff (FC Barcelona & Netherlands)', ['Franz Beckenbauer', 'Kazimierz Deyna', 'Paul Breitner']],
  ['1975', 'Oleg Blokhin (Dynamo Kyiv & USSR)', ['Franz Beckenbauer', 'Johan Cruyff', 'Sepp Maier']],
  ['1976', 'Franz Beckenbauer (Bayern Munich & West Germany)', ['Rob Rensenbrink', 'Ivo Viktor', 'Kevin Keegan']],
  ['1977', 'Allan Simonsen (Borussia Mönchengladbach & Denmark)', ['Kevin Keegan', 'Michel Platini', 'Roberto Bettega']],
  ['1978', 'Kevin Keegan (Hamburger SV & England)', ['Hans Krankl', 'Rob Rensenbrink', 'Mario Kempes']],
  ['1979', 'Kevin Keegan (Hamburger SV & England)', ['Karl-Heinz Rummenigge', 'Ruud Krol', 'Michel Platini']],
  ['1980', 'Karl-Heinz Rummenigge (Bayern Munich & West Germany)', ['Bernd Schuster', 'Michel Platini', 'Hansi Müller']],
  ['1981', 'Karl-Heinz Rummenigge (Bayern Munich & West Germany)', ['Paul Breitner', 'Bernd Schuster', 'Michel Platini']],
  ['1982', 'Paolo Rossi (Juventus & Italy)', ['Alain Giresse', 'Zbigniew Boniek', 'Michel Platini']],
  ['1983', 'Michel Platini (Juventus & France)', ['Kenny Dalglish', 'Allan Simonsen', 'Bryan Robson']],
  ['1984', 'Michel Platini (Juventus & France)', ['Jean Tigana', 'Preben Elkjær', 'Ian Rush']],
  ['1985', 'Michel Platini (Juventus & France, 3rd consecutive Ballon d\'Or)', ['Preben Elkjær', 'Bernd Schuster', 'Michael Laudrup']],
  ['1986', 'Igor Belanov (Dynamo Kyiv & USSR)', ['Gary Lineker', 'Emilio Butragueño', 'Manuel Amoros']],
  ['1987', 'Ruud Gullit (PSV/AC Milan & Netherlands)', ['Paulo Futre', 'Emilio Butragueño', 'Míchel']],
  ['1988', 'Marco van Basten (AC Milan & Netherlands)', ['Ruud Gullit', 'Frank Rijkaard', 'Gianluca Vialli']],
  ['1989', 'Marco van Basten (AC Milan & Netherlands)', ['Franco Baresi', 'Frank Rijkaard', 'Lothar Matthäus']],
  ['1990', 'Lothar Matthäus (Inter Milan & West Germany)', ['Salvatore Schillaci', 'Andreas Brehme', 'Paul Gascoigne']],
  ['1991', 'Jean-Pierre Papin (Marseille & France)', ['Dejan Savićević', 'Darko Pančev', 'Lothar Matthäus']],
  ['1992', 'Marco van Basten (AC Milan & Netherlands)', ['Hristo Stoichkov', 'Dennis Bergkamp', 'Thomas Häßler']],
  ['1993', 'Roberto Baggio (Juventus & Italy)', ['Dennis Bergkamp', 'Eric Cantona', 'Alen Bokšić']],
  ['1994', 'Hristo Stoichkov (FC Barcelona & Bulgaria)', ['Roberto Baggio', 'Paolo Maldini', 'Gheorghe Hagi']],
  ['1995', 'George Weah (PSG/AC Milan & Liberia, First non-European winner)', ['Jürgen Klinsmann', 'Jari Litmanen', 'Alessandro Del Piero']]
];

for (const [year, correct, wrong] of classicBallon) {
  pool.push(makeQ(`Who won the Ballon d'Or in ${year}?`, correct, wrong, 'world', 'ballon-dor-historic'));
}

console.log(`Generated ${pool.length} total questions in final cross.`);

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
