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

// -------------------------------------------------------------------------
// TIME-PROOFING PASS ON EXISTING QUESTIONS
// -------------------------------------------------------------------------
for (const q of rawData.categories.football || []) {
  if (q.template === 'shirt-number' && q.q.includes('does') && q.q.includes('wear')) {
    q.q = q.q.replace(/What shirt number does (.*) wear for (.*)\?/i, 'What shirt number did $1 wear for $2?');
    q.q = q.q.replace(/What iconic shirt number does (.*) wear for (.*)\?/i, 'What iconic shirt number did $1 famously wear for $2?');
  }
  if (q.template === 'record-transfer' && q.q.startsWith('Who is the all-time record signing in the history of')) {
    q.q = q.q.replace(/Who is the all-time record signing in the history of (.*)\?/i, 'As of 2024, who is the record transfer signing in the history of $1?');
  }
}

const pool = [];

// =========================================================================
// 1. COMPLETE BALLON D'OR WINNERS CHRONOLOGY (1956 to 2024)
// =========================================================================
const allBallonDor = [
  ['2024', 'Rodri (Manchester City & Spain)', ['Vinícius Júnior', 'Jude Bellingham', 'Dani Carvajal']],
  ['2023', 'Lionel Messi (Inter Miami/PSG & Argentina)', ['Erling Haaland', 'Kylian Mbappé', 'Kevin De Bruyne']],
  ['2022', 'Karim Benzema (Real Madrid & France)', ['Sadio Mané', 'Kevin De Bruyne', 'Robert Lewandowski']],
  ['2021', 'Lionel Messi (PSG/Barcelona & Argentina)', ['Robert Lewandowski', 'Jorginho', 'Karim Benzema']],
  ['2019', 'Lionel Messi (FC Barcelona & Argentina)', ['Virgil van Dijk', 'Cristiano Ronaldo', 'Sadio Mané']],
  ['2018', 'Luka Modrić (Real Madrid & Croatia)', ['Cristiano Ronaldo', 'Antoine Griezmann', 'Kylian Mbappé']],
  ['2017', 'Cristiano Ronaldo (Real Madrid & Portugal)', ['Lionel Messi', 'Neymar', 'Gianluigi Buffon']],
  ['2016', 'Cristiano Ronaldo (Real Madrid & Portugal)', ['Lionel Messi', 'Antoine Griezmann', 'Luis Suárez']],
  ['2015', 'Lionel Messi (FC Barcelona & Argentina)', ['Cristiano Ronaldo', 'Neymar', 'Robert Lewandowski']],
  ['2014', 'Cristiano Ronaldo (Real Madrid & Portugal)', ['Lionel Messi', 'Manuel Neuer', 'Arjen Robben']],
  ['2013', 'Cristiano Ronaldo (Real Madrid & Portugal)', ['Lionel Messi', 'Franck Ribéry', 'Zlatan Ibrahimović']],
  ['2012', 'Lionel Messi (FC Barcelona & Argentina, 91 goals)', ['Cristiano Ronaldo', 'Andrés Iniesta', 'Xavi Hernández']],
  ['2011', 'Lionel Messi (FC Barcelona & Argentina)', ['Cristiano Ronaldo', 'Xavi Hernández', 'Andrés Iniesta']],
  ['2010', 'Lionel Messi (FC Barcelona & Argentina)', ['Andrés Iniesta', 'Xavi Hernández', 'Wesley Sneijder']],
  ['2009', 'Lionel Messi (FC Barcelona & Argentina)', ['Cristiano Ronaldo', 'Xavi Hernández', 'Kaká']],
  ['2008', 'Cristiano Ronaldo (Manchester United & Portugal)', ['Lionel Messi', 'Fernando Torres', 'Iker Casillas']],
  ['2007', 'Kaká (AC Milan & Brazil)', ['Cristiano Ronaldo', 'Lionel Messi', 'Didier Drogba']],
  ['2006', 'Fabio Cannavaro (Juventus/Real Madrid & Italy)', ['Gianluigi Buffon', 'Thierry Henry', 'Ronaldinho']],
  ['2005', 'Ronaldinho (FC Barcelona & Brazil)', ['Frank Lampard', 'Steven Gerrard', 'Thierry Henry']],
  ['2004', 'Andriy Shevchenko (AC Milan & Ukraine)', ['Deco', 'Ronaldinho', 'Thierry Henry']],
  ['2003', 'Pavel Nedvěd (Juventus & Czech Republic)', ['Thierry Henry', 'Paolo Maldini', 'Andriy Shevchenko']],
  ['2002', 'Ronaldo Nazário (Inter/Real Madrid & Brazil)', ['Roberto Carlos', 'Oliver Kahn', 'Zinedine Zidane']],
  ['2001', 'Michael Owen (Liverpool & England)', ['Raúl González', 'Oliver Kahn', 'David Beckham']],
  ['2000', 'Luís Figo (Barcelona/Real Madrid & Portugal)', ['Zinedine Zidane', 'Andriy Shevchenko', 'Thierry Henry']],
  ['1999', 'Rivaldo (FC Barcelona & Brazil)', ['David Beckham', 'Andriy Shevchenko', 'Gabriel Batistuta']],
  ['1998', 'Zinedine Zidane (Juventus & France)', ['Davor Šuker', 'Ronaldo Nazário', 'Michael Owen']],
  ['1997', 'Ronaldo Nazário (Barcelona/Inter Milan & Brazil)', ['Predrag Mijatović', 'Zinedine Zidane', 'Dennis Bergkamp']],
  ['1996', 'Matthias Sammer (Borussia Dortmund & Germany)', ['Ronaldo Nazário', 'Alan Shearer', 'Hristo Stoichkov']],
  ['1995', 'George Weah (PSG/AC Milan & Liberia, First African winner)', ['Jürgen Klinsmann', 'Jari Litmanen', 'Alessandro Del Piero']],
  ['1994', 'Hristo Stoichkov (FC Barcelona & Bulgaria)', ['Roberto Baggio', 'Paolo Maldini', 'Gheorghe Hagi']],
  ['1993', 'Roberto Baggio (Juventus & Italy)', ['Dennis Bergkamp', 'Eric Cantona', 'Alen Bokšić']],
  ['1992', 'Marco van Basten (AC Milan & Netherlands)', ['Hristo Stoichkov', 'Dennis Bergkamp', 'Thomas Häßler']],
  ['1991', 'Jean-Pierre Papin (Olympique de Marseille & France)', ['Dejan Savićević', 'Darko Pančev', 'Lothar Matthäus']],
  ['1990', 'Lothar Matthäus (Inter Milan & West Germany)', ['Salvatore Schillaci', 'Andreas Brehme', 'Paul Gascoigne']],
  ['1989', 'Marco van Basten (AC Milan & Netherlands)', ['Franco Baresi', 'Frank Rijkaard', 'Lothar Matthäus']],
  ['1988', 'Marco van Basten (AC Milan & Netherlands)', ['Ruud Gullit', 'Frank Rijkaard', 'Gianluca Vialli']],
  ['1987', 'Ruud Gullit (PSV/AC Milan & Netherlands)', ['Paulo Futre', 'Emilio Butragueño', 'Míchel']],
  ['1986', 'Igor Belanov (Dynamo Kyiv & USSR)', ['Gary Lineker', 'Emilio Butragueño', 'Manuel Amoros']],
  ['1985', 'Michel Platini (Juventus & France)', ['Preben Elkjær', 'Bernd Schuster', 'Michael Laudrup']],
  ['1984', 'Michel Platini (Juventus & France)', ['Jean Tigana', 'Preben Elkjær', 'Ian Rush']],
  ['1983', 'Michel Platini (Juventus & France)', ['Kenny Dalglish', 'Allan Simonsen', 'Bryan Robson']],
  ['1982', 'Paolo Rossi (Juventus & Italy)', ['Alain Giresse', 'Zbigniew Boniek', 'Michel Platini']],
  ['1981', 'Karl-Heinz Rummenigge (Bayern Munich & West Germany)', ['Paul Breitner', 'Bernd Schuster', 'Michel Platini']],
  ['1980', 'Karl-Heinz Rummenigge (Bayern Munich & West Germany)', ['Bernd Schuster', 'Michel Platini', 'Hansi Müller']],
  ['1979', 'Kevin Keegan (Hamburger SV & England)', ['Karl-Heinz Rummenigge', 'Ruud Krol', 'Michel Platini']],
  ['1978', 'Kevin Keegan (Hamburger SV & England)', ['Hans Krankl', 'Rob Rensenbrink', 'Mario Kempes']],
  ['1977', 'Allan Simonsen (Borussia Mönchengladbach & Denmark)', ['Kevin Keegan', 'Michel Platini', 'Roberto Bettega']],
  ['1976', 'Franz Beckenbauer (Bayern Munich & West Germany)', ['Rob Rensenbrink', 'Ivo Viktor', 'Kevin Keegan']],
  ['1975', 'Oleg Blokhin (Dynamo Kyiv & USSR)', ['Franz Beckenbauer', 'Johan Cruyff', 'Sepp Maier']],
  ['1974', 'Johan Cruyff (FC Barcelona & Netherlands)', ['Franz Beckenbauer', 'Kazimierz Deyna', 'Paul Breitner']],
  ['1973', 'Johan Cruyff (Ajax/Barcelona & Netherlands)', ['Dino Zoff', 'Gerd Müller', 'Franz Beckenbauer']],
  ['1972', 'Franz Beckenbauer (Bayern Munich & West Germany)', ['Gerd Müller', 'Günter Netzer', 'Johan Cruyff']],
  ['1971', 'Johan Cruyff (Ajax & Netherlands)', ['Sandro Mazzola', 'George Best', 'Gerd Müller']],
  ['1970', 'Gerd Müller (Bayern Munich & West Germany)', ['Bobby Moore', 'Luigi Riva', 'Pelé']],
  ['1969', 'Gianni Rivera (AC Milan & Italy)', ['Luigi Riva', 'Gerd Müller', 'Johan Cruyff']],
  ['1968', 'George Best (Manchester United & Northern Ireland)', ['Bobby Charlton', 'Dragan Džajić', 'Franz Beckenbauer']],
  ['1967', 'Flórián Albert (Ferencváros & Hungary)', ['Bobby Charlton', 'Jimmy Johnstone', 'Franz Beckenbauer']],
  ['1966', 'Sir Bobby Charlton (Manchester United & England)', ['Eusébio', 'Franz Beckenbauer', 'Bobby Moore']],
  ['1965', 'Eusébio (Benfica & Portugal)', ['Giacinto Facchetti', 'Luis Suárez', 'Bobby Charlton']],
  ['1964', 'Denis Law (Manchester United & Scotland)', ['Luis Suárez', 'Amancio Amaro', 'Eusébio']],
  ['1963', 'Lev Yashin (Dynamo Moscow & USSR, Only GK winner)', ['Gianni Rivera', 'Jimmy Greaves', 'Denis Law']],
  ['1962', 'Josef Masopust (Dukla Prague & Czechoslovakia)', ['Eusébio', 'Karl-Heinz Schnellinger', 'Josip Skoblar']],
  ['1961', 'Omar Sívori (Juventus & Italy)', ['Luis Suárez', 'Johnny Haynes', 'Lev Yashin']],
  ['1960', 'Luis Suárez (FC Barcelona & Spain)', ['Ferenc Puskás', 'Uwe Seeler', 'Alfredo Di Stéfano']],
  ['1959', 'Alfredo Di Stéfano (Real Madrid & Spain)', ['Raymond Kopa', 'John Charles', 'Luis Suárez']],
  ['1958', 'Raymond Kopa (Real Madrid & France)', ['Helmut Rahn', 'Just Fontaine', 'John Charles']],
  ['1957', 'Alfredo Di Stéfano (Real Madrid & Spain)', ['Billy Wright', 'Duncan Edwards', 'Raymond Kopa']],
  ['1956', 'Stanley Matthews (Blackpool & England, First-ever winner)', ['Alfredo Di Stéfano', 'Raymond Kopa', 'Ferenc Puskás']]
];

for (const [year, winner, wrong] of allBallonDor) {
  pool.push(makeQ(`Who won the Men's Ballon d'Or award in ${year}?`, winner, wrong, 'world', 'ballon-dor-all'));
}

// =========================================================================
// 2. COMPLETE EUROPEAN CUP & UEFA CHAMPIONS LEAGUE FINALS (1956 to 2024)
// =========================================================================
const allUclFinals = [
  ['2024 (Wembley, London)', 'Real Madrid (2-0 vs Borussia Dortmund)', ['Borussia Dortmund', 'Bayern Munich', 'Paris Saint-Germain']],
  ['2023 (Istanbul)', 'Manchester City (1-0 vs Inter Milan, Rodri 68th min)', ['Inter Milan', 'Real Madrid', 'AC Milan']],
  ['2022 (Stade de France, Paris)', 'Real Madrid (1-0 vs Liverpool, Vinícius Jr 59th min)', ['Liverpool', 'Manchester City', 'Villarreal']],
  ['2021 (Porto)', 'Chelsea (1-0 vs Manchester City, Kai Havertz 42nd min)', ['Manchester City', 'Real Madrid', 'Paris Saint-Germain']],
  ['2020 (Lisbon)', 'Bayern Munich (1-0 vs PSG, Kingsley Coman 59th min)', ['Paris Saint-Germain', 'Lyon', 'RB Leipzig']],
  ['2019 (Madrid)', 'Liverpool (2-0 vs Tottenham Hotspur, Salah & Origi)', ['Tottenham Hotspur', 'Barcelona', 'Ajax']],
  ['2018 (Kyiv)', 'Real Madrid (3-1 vs Liverpool, Bale overhead & Benzema)', ['Liverpool', 'Bayern Munich', 'AS Roma']],
  ['2017 (Cardiff)', 'Real Madrid (4-1 vs Juventus, Ronaldo brace & Casemiro)', ['Juventus', 'Atlético Madrid', 'Monaco']],
  ['2016 (Milan)', 'Real Madrid (penalties vs Atlético Madrid, 1-1 AET)', ['Atlético Madrid', 'Manchester City', 'Bayern Munich']],
  ['2015 (Berlin)', 'FC Barcelona (3-1 vs Juventus, Rakitić, Suárez & Neymar)', ['Juventus', 'Real Madrid', 'Bayern Munich']],
  ['2014 (Lisbon)', 'Real Madrid (4-1 AET vs Atlético Madrid, Ramos 93rd min "La Décima")', ['Atlético Madrid', 'Bayern Munich', 'Chelsea']],
  ['2013 (Wembley, London)', 'Bayern Munich (2-1 vs Borussia Dortmund, Robben 89th min)', ['Borussia Dortmund', 'Barcelona', 'Real Madrid']],
  ['2012 (Munich)', 'Chelsea (penalties vs Bayern Munich, Drogba header & winning penalty)', ['Bayern Munich', 'Barcelona', 'Real Madrid']],
  ['2011 (Wembley, London)', 'FC Barcelona (3-1 vs Manchester United, Pedro, Messi & Villa)', ['Manchester United', 'Real Madrid', 'Schalke 04']],
  ['2010 (Madrid)', 'Inter Milan (2-0 vs Bayern Munich, Diego Milito brace - Treble)', ['Bayern Munich', 'Barcelona', 'Lyon']],
  ['2009 (Rome)', 'FC Barcelona (2-0 vs Manchester United, Eto\'o & Messi header - Treble)', ['Manchester United', 'Chelsea', 'Arsenal']],
  ['2008 (Moscow)', 'Manchester United (penalties vs Chelsea, 1-1 AET, Van der Sar save vs Anelka)', ['Chelsea', 'Barcelona', 'Liverpool']],
  ['2007 (Athens)', 'AC Milan (2-1 vs Liverpool, Filippo Inzaghi brace)', ['Liverpool', 'Manchester United', 'Chelsea']],
  ['2006 (Paris)', 'FC Barcelona (2-1 vs Arsenal, Eto\'o & Belletti vs 10-man Arsenal)', ['Arsenal', 'AC Milan', 'Villarreal']],
  ['2005 (Istanbul)', 'Liverpool (penalties vs AC Milan, from 3-0 down at half-time)', ['AC Milan', 'Chelsea', 'PSV Eindhoven']],
  ['2004 (Gelsenkirchen)', 'FC Porto (3-0 vs AS Monaco, Carlos Alberto, Deco & Alenichev under Mourinho)', ['AS Monaco', 'Deportivo La Coruña', 'Chelsea']],
  ['2003 (Old Trafford, Manchester)', 'AC Milan (penalties vs Juventus, 0-0 AET, Shevchenko winning penalty)', ['Juventus', 'Inter Milan', 'Real Madrid']],
  ['2002 (Glasgow)', 'Real Madrid (2-1 vs Bayer Leverkusen, Zidane iconic volley & Raúl)', ['Bayer Leverkusen', 'Barcelona', 'Manchester United']],
  ['2001 (Milan)', 'Bayern Munich (penalties vs Valencia, 1-1 AET, Oliver Kahn 3 shootout saves)', ['Valencia', 'Real Madrid', 'Leeds United']],
  ['2000 (Paris)', 'Real Madrid (3-0 vs Valencia, Morientes, McManaman & Raúl)', ['Valencia', 'Bayern Munich', 'Barcelona']],
  ['1999 (Barcelona)', 'Manchester United (2-1 vs Bayern Munich, Sheringham 91\' & Solskjær 93\' - Treble)', ['Bayern Munich', 'Juventus', 'Dynamo Kyiv']],
  ['1998 (Amsterdam)', 'Real Madrid (1-0 vs Juventus, Predrag Mijatović 66th min)', ['Juventus', 'Borussia Dortmund', 'Monaco']],
  ['1997 (Munich)', 'Borussia Dortmund (3-1 vs Juventus, Riedle brace & Ricken chip)', ['Juventus', 'Manchester United', 'Ajax']],
  ['1996 (Rome)', 'Juventus (penalties vs Ajax, 1-1 AET, Jugović winning penalty)', ['Ajax', 'Nantes', 'Panathinaikos']],
  ['1995 (Vienna)', 'Ajax (1-0 vs AC Milan, Patrick Kluivert 85th min, unbeaten champions)', ['AC Milan', 'Bayern Munich', 'Paris Saint-Germain']],
  ['1994 (Athens)', 'AC Milan (4-0 vs FC Barcelona "Dream Team", Massaro brace, Savićević & Desailly)', ['FC Barcelona', 'Monaco', 'Porto']],
  ['1993 (Munich)', 'Olympique de Marseille (1-0 vs AC Milan, Basile Boli 43rd min header)', ['AC Milan', 'Rangers', 'Club Brugge']],
  ['1992 (Wembley, London)', 'FC Barcelona (1-0 AET vs Sampdoria, Ronald Koeman 112th min free-kick)', ['Sampdoria', 'Red Star Belgrade', 'Sparta Prague']],
  ['1991 (Bari)', 'Red Star Belgrade (penalties vs Marseille, 0-0 AET)', ['Olympique de Marseille', 'Bayern Munich', 'Spartak Moscow']],
  ['1990 (Vienna)', 'AC Milan (1-0 vs Benfica, Frank Rijkaard 68th min under Arrigo Sacchi)', ['Benfica', 'Bayern Munich', 'Marseille']],
  ['1989 (Barcelona)', 'AC Milan (4-0 vs Steaua Bucharest, Gullit brace & Van Basten brace)', ['Steaua Bucharest', 'Real Madrid', 'Galatasaray']],
  ['1988 (Stuttgart)', 'PSV Eindhoven (penalties vs Benfica, 0-0 AET under Guus Hiddink - Treble)', ['Benfica', 'Real Madrid', 'Steaua Bucharest']],
  ['1987 (Vienna)', 'FC Porto (2-1 vs Bayern Munich, Rabah Madjer backheel & Juary)', ['Bayern Munich', 'Dynamo Kyiv', 'Real Madrid']],
  ['1986 (Seville)', 'Steaua Bucharest (penalties vs Barcelona, Duckadam saved all 4 Barca penalties)', ['FC Barcelona', 'Anderlecht', 'IFK Göteborg']],
  ['1985 (Brussels - Heysel)', 'Juventus (1-0 vs Liverpool, Michel Platini penalty)', ['Liverpool', 'Bordeaux', 'Panathinaikos']],
  ['1984 (Rome)', 'Liverpool (penalties vs AS Roma on Roma\'s home ground, Bruce Grobbelaar wobbly legs)', ['AS Roma', 'Dundee United', 'Dinamo București']],
  ['1983 (Athens)', 'Hamburger SV (1-0 vs Juventus, Felix Magath 9th min screamer)', ['Juventus', 'Real Sociedad', 'Widzew Łódź']],
  ['1982 (Rotterdam)', 'Aston Villa (1-0 vs Bayern Munich, Peter Withe 67th min winner)', ['Bayern Munich', 'Anderlecht', 'CSKA Sofia']],
  ['1981 (Paris)', 'Liverpool (1-0 vs Real Madrid, Alan Kennedy 82nd min winner)', ['Real Madrid', 'Bayern Munich', 'Inter Milan']],
  ['1980 (Madrid)', 'Nottingham Forest (1-0 vs Hamburger SV, John Robertson 20th min - Back-to-back)', ['Hamburger SV', 'Ajax', 'Real Madrid']],
  ['1979 (Munich)', 'Nottingham Forest (1-0 vs Malmö FF, Trevor Francis £1m header under Brian Clough)', ['Malmö FF', 'Köln', 'Austria Wien']],
  ['1978 (Wembley, London)', 'Liverpool (1-0 vs Club Brugge, Kenny Dalglish 64th min chip)', ['Club Brugge', 'Borussia Mönchengladbach', 'Juventus']],
  ['1977 (Rome)', 'Liverpool (3-1 vs Borussia Mönchengladbach, McDermott, Smith & Neal)', ['Borussia Mönchengladbach', 'Zürich', 'Dynamo Kyiv']],
  ['1976 (Glasgow)', 'Bayern Munich (1-0 vs Saint-Étienne, Franz Roth 57th min - 3-peat)', ['Saint-Étienne', 'Real Madrid', 'PSV Eindhoven']],
  ['1975 (Paris)', 'Bayern Munich (2-0 vs Leeds United, Franz Roth & Gerd Müller)', ['Leeds United', 'Saint-Étienne', 'Barcelona']],
  ['1974 (Brussels)', 'Bayern Munich (4-0 replay vs Atlético Madrid, Hoeness brace & Müller brace)', ['Atlético Madrid', 'Újpest', 'Celtic']],
  ['1973 (Belgrade)', 'Ajax (1-0 vs Juventus, Johnny Rep 5th min - 3-peat under Stefan Kovacs)', ['Juventus', 'Real Madrid', 'Derby County']],
  ['1972 (Rotterdam)', 'Ajax (2-0 vs Inter Milan, Johan Cruyff brace - Treble)', ['Inter Milan', 'Benfica', 'Celtic']],
  ['1971 (Wembley, London)', 'Ajax (2-0 vs Panathinaikos, Dick van Dijk & Arie Haan under Rinus Michels)', ['Panathinaikos', 'Atlético Madrid', 'Red Star Belgrade']],
  ['1970 (Milan)', 'Feyenoord (2-1 AET vs Celtic, Rinus Israël & Ove Kindvall 117th min)', ['Celtic', 'Legia Warsaw', 'Leeds United']],
  ['1969 (Madrid)', 'AC Milan (4-1 vs Ajax, Pierino Prati hat-trick & Sormani)', ['Ajax', 'Manchester United', 'Spartak Trnava']],
  ['1968 (Wembley, London)', 'Manchester United (4-1 AET vs Benfica, Charlton brace, Best & Kidd under Busby)', ['Benfica', 'Real Madrid', 'Juventus']],
  ['1967 (Lisbon)', 'Celtic (2-1 vs Inter Milan, Tommy Gemmell & Stevie Chalmers "Lisbon Lions" - Treble)', ['Inter Milan', 'Dukla Prague', 'CSKA Sofia']],
  ['1966 (Brussels)', 'Real Madrid (2-1 vs Partizan Belgrade, Amancio & Serena "Yé-yé" team)', ['Partizan Belgrade', 'Inter Milan', 'Manchester United']],
  ['1965 (San Siro, Milan)', 'Inter Milan (1-0 vs Benfica, Jair 42nd min under Helenio Herrera)', ['Benfica', 'Liverpool', 'Győri ETO']],
  ['1964 (Vienna)', 'Inter Milan (3-1 vs Real Madrid, Sandro Mazzola brace & Milani)', ['Real Madrid', 'Borussia Dortmund', 'Zürich']],
  ['1963 (Wembley, London)', 'AC Milan (2-1 vs Benfica, José Altafini brace under Nereo Rocco)', ['Benfica', 'Dundee', 'Feyenoord']],
  ['1962 (Amsterdam)', 'Benfica (5-3 vs Real Madrid, Eusébio brace & Águas under Béla Guttmann)', ['Real Madrid', 'Tottenham Hotspur', 'Standard Liège']],
  ['1961 (Bern)', 'Benfica (3-2 vs FC Barcelona, José Águas, Ramallets OG & Coluna)', ['FC Barcelona', 'Rapid Wien', 'Hamburger SV']],
  ['1960 (Hampden Park, Glasgow)', 'Real Madrid (7-3 vs Eintracht Frankfurt, Puskás 4 goals & Di Stéfano 3 goals)', ['Eintracht Frankfurt', 'Barcelona', 'Rangers']],
  ['1959 (Stuttgart)', 'Real Madrid (2-0 vs Stade de Reims, Mateos & Di Stéfano)', ['Stade de Reims', 'Atlético Madrid', 'Young Boys']],
  ['1958 (Brussels)', 'Real Madrid (3-2 AET vs AC Milan, Di Stéfano, Rial & Gento 107th min)', ['AC Milan', 'Vasas', 'Manchester United']],
  ['1957 (Santiago Bernabéu, Madrid)', 'Real Madrid (2-0 vs Fiorentina, Di Stéfano pen & Gento)', ['Fiorentina', 'Manchester United', 'Red Star Belgrade']],
  ['1956 (Parc des Princes, Paris)', 'Real Madrid (4-3 vs Stade de Reims, First-ever European Cup Final)', ['Stade de Reims', 'Milan', 'Hibernian']]
];

for (const [match, champion, runners] of allUclFinals) {
  pool.push(makeQ(`Who won the European Cup / UEFA Champions League in the ${match} final?`, champion, runners, 'ucl', 'ucl-all-finals'));
}

// =========================================================================
// 3. HISTORIC FA CUP FINALS (1970 to 2004)
// =========================================================================
const historicFaCups = [
  ['2004', 'Manchester United (3-0 vs Millwall in Cardiff, Ronaldo & Van Nistelrooy brace)', ['Millwall', 'Arsenal', 'Sunderland']],
  ['2003', 'Arsenal (1-0 vs Southampton in Cardiff, Robert Pires 38th min)', ['Southampton', 'Sheffield United', 'Watford']],
  ['2002', 'Arsenal (2-0 vs Chelsea in Cardiff, Ray Parlour & Freddie Ljungberg)', ['Chelsea', 'Middlesbrough', 'Fulham']],
  ['2001', 'Liverpool (2-1 vs Arsenal in Cardiff, Michael Owen late 83\' & 88\' double)', ['Arsenal', 'Wycombe Wanderers', 'Tottenham Hotspur']],
  ['2000', 'Chelsea (1-0 vs Aston Villa, Roberto Di Matteo 73rd min - Last final at old Wembley)', ['Aston Villa', 'Newcastle United', 'Bolton Wanderers']],
  ['1999', 'Manchester United (2-0 vs Newcastle United, Sheringham & Scholes - Treble part 2)', ['Newcastle United', 'Arsenal', 'Tottenham Hotspur']],
  ['1998', 'Arsenal (2-0 vs Newcastle United, Overmars & Anelka - Double winners)', ['Newcastle United', 'Wolverhampton Wanderers', 'Sheffield United']],
  ['1997', 'Chelsea (2-0 vs Middlesbrough, Di Matteo 42-second goal & Newton under Gullit)', ['Middlesbrough', 'Wimbledon', 'Chesterfield']],
  ['1996', 'Manchester United (1-0 vs Liverpool, Eric Cantona 85th min volley)', ['Liverpool', 'Chelsea', 'Aston Villa']],
  ['1995', 'Everton (1-0 vs Manchester United, Paul Rideout 30th min header "Dogs of War")', ['Manchester United', 'Tottenham Hotspur', 'Crystal Palace']],
  ['1994', 'Manchester United (4-0 vs Chelsea, Cantona two pens, Hughes & McClair - Double)', ['Chelsea', 'Oldham Athletic', 'Luton Town']],
  ['1993', 'Arsenal (2-1 AET replay vs Sheffield Wednesday, Andy Linighan 119th min header)', ['Sheffield Wednesday', 'Tottenham Hotspur', 'Sheffield United']],
  ['1992', 'Liverpool (2-0 vs Sunderland, Michael Thomas & Ian Rush)', ['Sunderland', 'Portsmouth', 'Norwich City']],
  ['1991', 'Tottenham Hotspur (2-1 AET vs Nottingham Forest, Des Walker OG under Terry Venables)', ['Nottingham Forest', 'Arsenal', 'West Ham United']],
  ['1990', 'Manchester United (1-0 replay vs Crystal Palace, Lee Martin 59th min - Ferguson\'s 1st trophy)', ['Crystal Palace', 'Oldham Athletic', 'Liverpool']],
  ['1989', 'Liverpool (3-2 AET vs Everton in emotional post-Hillsborough final, Rush brace)', ['Everton', 'Nottingham Forest', 'Norwich City']],
  ['1988', 'Wimbledon (1-0 vs Liverpool, Lawrie Sanchez header & Dave Beasant penalty save "Crazy Gang")', ['Liverpool', 'Luton Town', 'Watford']],
  ['1987', 'Coventry City (3-2 AET vs Tottenham Hotspur, Keith Houchen diving header)', ['Tottenham Hotspur', 'Leeds United', 'Watford']],
  ['1986', 'Liverpool (3-1 vs Everton, Rush brace & Johnston - First Merseyside Double)', ['Everton', 'Southampton', 'Sheffield Wednesday']],
  ['1985', 'Manchester United (1-0 AET vs Everton, Norman Whiteside 110th min curler with 10 men)', ['Everton', 'Liverpool', 'Luton Town']],
  ['1984', 'Everton (2-0 vs Watford, Graeme Sharp & Andy Gray under Howard Kendall)', ['Watford', 'Southampton', 'Plymouth Argyle']],
  ['1983', 'Manchester United (4-0 replay vs Brighton, Robson brace, Whiteside & Mühren)', ['Brighton & Hove Albion', 'Arsenal', 'Sheffield Wednesday']],
  ['1982', 'Tottenham Hotspur (1-0 replay vs QPR, Glenn Hoddle 6th min penalty)', ['Queens Park Rangers', 'Leicester City', 'West Bromwich Albion']],
  ['1981', 'Tottenham Hotspur (3-2 replay vs Manchester City, Ricky Villa iconic solo goal)', ['Manchester City', 'Wolverhampton Wanderers', 'Ipswich Town']],
  ['1980', 'West Ham United (1-0 vs Arsenal, Trevor Brooking header - Last non-top-flight winner)', ['Arsenal', 'Everton', 'Liverpool']],
  ['1979', 'Arsenal (3-2 vs Manchester United "Five-Minute Final", Alan Sunderland 89th min winner)', ['Manchester United', 'Wolverhampton Wanderers', 'Liverpool']],
  ['1978', 'Ipswich Town (1-0 vs Arsenal, Roger Osborne 77th min under Bobby Robson)', ['Arsenal', 'West Bromwich Albion', 'Leyton Orient']],
  ['1977', 'Manchester United (2-1 vs Liverpool, Greenhoff winner stopping Liverpool\'s treble)', ['Liverpool', 'Leeds United', 'Everton']],
  ['1976', 'Southampton (1-0 vs Manchester United, Bobby Stokes 83rd min upset as 2nd tier club)', ['Manchester United', 'Crystal Palace', 'Derby County']],
  ['1975', 'West Ham United (2-0 vs Fulham, Alan Taylor brace - all-English lineup)', ['Fulham', 'Ipswich Town', 'Birmingham City']],
  ['1974', 'Liverpool (3-0 vs Newcastle United, Kevin Keegan brace & Steve Heighway)', ['Newcastle United', 'Leicester City', 'Burnley']],
  ['1973', 'Sunderland (1-0 vs Leeds United, Ian Porterfield & Jim Montgomery double save)', ['Leeds United', 'Arsenal', 'Wolverhampton Wanderers']],
  ['1972', 'Leeds United (1-0 vs Arsenal in centenary final, Allan Clarke 53rd min header)', ['Arsenal', 'Birmingham City', 'Stoke City']],
  ['1971', 'Arsenal (2-1 AET vs Liverpool, Charlie George 111th min thunderbolt - Double winners)', ['Liverpool', 'Stoke City', 'Everton']],
  ['1970', 'Chelsea (2-1 AET replay vs Leeds United at Old Trafford, David Webb 104th min)', ['Leeds United', 'Watford', 'Manchester United']]
];

for (const [year, winner, wrong] of historicFaCups) {
  pool.push(makeQ(`Who won the English FA Cup in the ${year} final?`, winner, wrong, 'pl', 'fa-cup-all'));
}

// =========================================================================
// 4. HISTORIC LEAGUE CUP / CARABAO CUP FINALS (1970 to 1999)
// =========================================================================
const historicLeagueCups = [
  ['1999', 'Tottenham Hotspur (1-0 vs Leicester City, Allan Nielsen 92nd min diving header)', ['Leicester City', 'Wimbledon', 'Sunderland']],
  ['1998', 'Chelsea (2-0 AET vs Middlesbrough, Frank Sinclair & Roberto Di Matteo)', ['Middlesbrough', 'Arsenal', 'Liverpool']],
  ['1997', 'Leicester City (1-0 AET replay vs Middlesbrough, Steve Claridge 100th min)', ['Middlesbrough', 'Wimbledon', 'Stockport County']],
  ['1996', 'Aston Villa (3-0 vs Leeds United, Savo Milošević, Ian Taylor & Dwight Yorke)', ['Leeds United', 'Arsenal', 'Liverpool']],
  ['1995', 'Liverpool (2-1 vs Bolton Wanderers, Steve McManaman brace in Wembley masterclass)', ['Bolton Wanderers', 'Crystal Palace', 'Swindon Town']],
  ['1994', 'Aston Villa (3-1 vs Manchester United, Atkinson, Saunders brace stopping United treble)', ['Manchester United', 'Tranmere Rovers', 'Sheffield Wednesday']],
  ['1993', 'Arsenal (2-1 vs Sheffield Wednesday, Paul Merson & Steve Morrow - Cup Double)', ['Sheffield Wednesday', 'Crystal Palace', 'Blackburn Rovers']],
  ['1992', 'Manchester United (1-0 vs Nottingham Forest, Brian McClair 14th min)', ['Nottingham Forest', 'Middlesbrough', 'Tottenham Hotspur']],
  ['1991', 'Sheffield Wednesday (1-0 vs Manchester United, John Sheridan 37th min - 2nd tier upset)', ['Manchester United', 'Chelsea', 'Leeds United']],
  ['1990', 'Nottingham Forest (1-0 vs Oldham Athletic, Nigel Jemson 47th min under Brian Clough)', ['Oldham Athletic', 'Coventry City', 'West Ham United']],
  ['1989', 'Nottingham Forest (3-1 vs Luton Town, Nigel Clough brace & Neil Webb)', ['Luton Town', 'Bristol City', 'West Ham United']],
  ['1988', 'Luton Town (3-2 vs Arsenal, Danny Wilson & Brian Stein 90th min dramatic winner)', ['Arsenal', 'Oxford United', 'Everton']],
  ['1987', 'Arsenal (2-1 vs Liverpool, Charlie Nicholas brace ending Rush scoring omen)', ['Liverpool', 'Tottenham Hotspur', 'Southampton']],
  ['1986', 'Oxford United (3-0 vs Queens Park Rangers, Hebberd, Houghton & Charles)', ['Queens Park Rangers', 'Aston Villa', 'Liverpool']],
  ['1985', 'Norwich City (1-0 vs Sunderland, Asa Hartford shot deflected by Chisholm OG)', ['Sunderland', 'Manchester United', 'Chelsea']],
  ['1984', 'Liverpool (1-0 replay vs Everton at Maine Road, Graeme Souness 21st min)', ['Everton', 'Walsall', 'Aston Villa']],
  ['1983', 'Liverpool (2-1 AET vs Manchester United, Ronnie Whelan 98th min curling winner)', ['Manchester United', 'Burnley', 'Arsenal']],
  ['1982', 'Liverpool (3-1 AET vs Tottenham Hotspur, Ronnie Whelan brace & Ian Rush)', ['Tottenham Hotspur', 'West Bromwich Albion', 'Ipswich Town']],
  ['1981', 'Liverpool (2-1 replay vs West Ham United at Villa Park, Dalglish & Hansen)', ['West Ham United', 'Manchester City', 'Coventry City']],
  ['1980', 'Wolverhampton Wanderers (1-0 vs Nottingham Forest, Andy Gray 67th min winner)', ['Nottingham Forest', 'Swindon Town', 'Liverpool']],
  ['1979', 'Nottingham Forest (3-2 vs Southampton, Garry Birtles brace & Tony Woodcock)', ['Southampton', 'Watford', 'Leeds United']],
  ['1978', 'Nottingham Forest (1-0 replay vs Liverpool at Old Trafford, John Robertson penalty)', ['Liverpool', 'Leeds United', 'Arsenal']],
  ['1977', 'Aston Villa (3-2 after 2nd replay vs Everton at Old Trafford, Brian Little hat-trick hero)', ['Everton', 'Queens Park Rangers', 'Bolton Wanderers']],
  ['1976', 'Manchester City (2-1 vs Newcastle United, Dennis Tueart iconic overhead bicycle kick)', ['Newcastle United', 'Middlesbrough', 'Tottenham Hotspur']],
  ['1975', 'Aston Villa (1-0 vs Norwich City, Ray Graydon 81st min - 3rd tier Villa)', ['Norwich City', 'Chester', 'Manchester United']],
  ['1974', 'Wolverhampton Wanderers (2-1 vs Manchester City, Kenny Hibbitt & John Richards)', ['Manchester City', 'Norwich City', 'Plymouth Argyle']],
  ['1973', 'Tottenham Hotspur (1-0 vs Norwich City, Ralph Coates 72nd min diving header)', ['Norwich City', 'Wolverhampton Wanderers', 'Chelsea']],
  ['1972', 'Stoke City (2-1 vs Chelsea, Terry Conroy & George Eastham - Stoke\'s only major trophy)', ['Chelsea', 'West Ham United', 'Tottenham Hotspur']],
  ['1971', 'Tottenham Hotspur (2-0 vs Aston Villa, Martin Chivers late 78\' & 82\' brace)', ['Aston Villa', 'Bristol City', 'Manchester United']],
  ['1970', 'Manchester City (2-1 AET vs West Brom, Mike Doyle & Glyn Pardoe 102nd min)', ['West Bromwich Albion', 'Queens Park Rangers', 'Carlisle United']]
];

for (const [year, winner, wrong] of historicLeagueCups) {
  pool.push(makeQ(`Who won the English League Cup (Carabao / League Cup) in the ${year} final?`, winner, wrong, 'pl', 'league-cup-all'));
}

// =========================================================================
// 5. ALL 34 AFRICA CUP OF NATIONS (AFCON) EDITIONS (1957 to 2024)
// =========================================================================
const allAfconEditions = [
  ['2023 (played 2024 in Ivory Coast)', 'Ivory Coast (2-1 vs Nigeria, Kessié & Haller)', ['Nigeria', 'South Africa', 'DR Congo']],
  ['2021 (played 2022 in Cameroon)', 'Senegal (penalties vs Egypt, Mané winning penalty)', ['Egypt', 'Cameroon', 'Burkina Faso']],
  ['2019 (Egypt)', 'Algeria (1-0 vs Senegal, Baghdad Bounedjah 2nd min winner)', ['Senegal', 'Nigeria', 'Tunisia']],
  ['2017 (Gabon)', 'Cameroon (2-1 vs Egypt, Vincent Aboubakar 88th min winner)', ['Egypt', 'Burkina Faso', 'Ghana']],
  ['2015 (Equatorial Guinea)', 'Ivory Coast (penalties vs Ghana, Boubacar Barry shootout hero)', ['Ghana', 'DR Congo', 'Equatorial Guinea']],
  ['2013 (South Africa)', 'Nigeria (1-0 vs Burkina Faso, Sunday Mba 40th min volley)', ['Burkina Faso', 'Mali', 'Ghana']],
  ['2012 (Gabon & Eq. Guinea)', 'Zambia (penalties vs Ivory Coast, emotional tribute to 1993 team)', ['Ivory Coast', 'Mali', 'Ghana']],
  ['2010 (Angola)', 'Egypt (1-0 vs Ghana, Gedo 85th min - 3-peat champions)', ['Ghana', 'Nigeria', 'Algeria']],
  ['2008 (Ghana)', 'Egypt (1-0 vs Cameroon, Mohamed Aboutrika 77th min winner)', ['Cameroon', 'Ghana', 'Ivory Coast']],
  ['2006 (Egypt)', 'Egypt (penalties vs Ivory Coast, 0-0 AET in Cairo)', ['Ivory Coast', 'Nigeria', 'Senegal']],
  ['2004 (Tunisia)', 'Tunisia (2-1 vs Morocco, Santos & Jaziri)', ['Morocco', 'Nigeria', 'Mali']],
  ['2002 (Mali)', 'Cameroon (penalties vs Senegal, 0-0 AET in Bamako)', ['Senegal', 'Nigeria', 'Mali']],
  ['2000 (Ghana & Nigeria)', 'Cameroon (penalties vs Nigeria in Lagos, 2-2 AET controversial shootout)', ['Nigeria', 'South Africa', 'Tunisia']],
  ['1998 (Burkina Faso)', 'Egypt (2-0 vs South Africa, Ahmed Hassan & Tarek Mostafa)', ['South Africa', 'DR Congo', 'Burkina Faso']],
  ['1996 (South Africa)', 'South Africa (2-0 vs Tunisia in Johannesburg, Mark Williams brace)', ['Tunisia', 'Zambia', 'Ghana']],
  ['1994 (Tunisia)', 'Nigeria (2-1 vs Zambia, Emmanuel Amunike brace)', ['Zambia', 'Ivory Coast', 'Mali']],
  ['1992 (Senegal)', 'Ivory Coast (11-10 penalties vs Ghana in Dakar, Alain Gouaméné saves)', ['Ghana', 'Nigeria', 'Cameroon']],
  ['1990 (Algeria)', 'Algeria (1-0 vs Nigeria in Algiers, Cherif Oudjani)', ['Nigeria', 'Zambia', 'Senegal']],
  ['1988 (Morocco)', 'Cameroon (1-0 vs Nigeria in Casablanca, Emmanuel Kundé penalty)', ['Nigeria', 'Algeria', 'Morocco']],
  ['1986 (Egypt)', 'Egypt (penalties vs Cameroon in Cairo, 0-0 AET)', ['Cameroon', 'Ivory Coast', 'Morocco']],
  ['1984 (Ivory Coast)', 'Cameroon (3-1 vs Nigeria in Abidjan, Ndjeya, Abega & Ebongué)', ['Nigeria', 'Algeria', 'Egypt']],
  ['1982 (Libya)', 'Ghana (penalties vs Libya in Tripoli, 1-1 AET)', ['Libya', 'Zambia', 'Algeria']],
  ['1980 (Nigeria)', 'Nigeria (3-0 vs Algeria in Lagos, Segun Odegbami brace & Muda Lawal)', ['Algeria', 'Egypt', 'Morocco']],
  ['1978 (Ghana)', 'Ghana (2-0 vs Uganda in Accra, Opoku Afriyie brace)', ['Uganda', 'Nigeria', 'Tunisia']],
  ['1976 (Ethiopia)', 'Morocco (Final group stage triumph in Addis Ababa, Ahmed Faras)', ['Guinea', 'Nigeria', 'Egypt']],
  ['1974 (Egypt)', 'Zaire / DR Congo (2-0 replay vs Zambia in Cairo, Ndaye Mulamba)', ['Zambia', 'Egypt', 'Congo']],
  ['1972 (Cameroon)', 'Congo (3-2 vs Mali in Yaoundé, M\'Bono brace & M\'Pelé)', ['Mali', 'Cameroon', 'Zaire']],
  ['1970 (Sudan)', 'Sudan (1-0 vs Ghana in Khartoum, Hasabu El-Sagheer)', ['Ghana', 'Egypt', 'Ivory Coast']],
  ['1968 (Ethiopia)', 'Congo-Kinshasa / DR Congo (1-0 vs Ghana in Addis Ababa, Kalala)', ['Ghana', 'Ivory Coast', 'Ethiopia']],
  ['1965 (Tunisia)', 'Ghana (3-2 AET vs Tunisia in Tunis, Frank Odoi extra-time winner)', ['Tunisia', 'Ivory Coast', 'Senegal']],
  ['1963 (Ghana)', 'Ghana (3-0 vs Sudan in Accra, Aggrey-Fynn & Mfum brace)', ['Sudan', 'United Arab Republic', 'Ethiopia']],
  ['1962 (Ethiopia)', 'Ethiopia (4-2 AET vs United Arab Republic in Addis Ababa, Worku)', ['United Arab Republic', 'Tunisia', 'Uganda']],
  ['1959 (United Arab Republic / Egypt)', 'United Arab Republic / Egypt (2-1 vs Sudan in Cairo, Mahmoud El-Gohary)', ['Sudan', 'Ethiopia', 'Uganda']],
  ['1957 (Sudan - Inaugural)', 'Egypt (4-0 vs Ethiopia in Khartoum, Ad-Diba all 4 goals)', ['Ethiopia', 'Sudan', 'South Africa']]
];

for (const [tournament, champion, runners] of allAfconEditions) {
  pool.push(makeQ(`Which national team won the ${tournament} Africa Cup of Nations (AFCON)?`, champion, runners, 'world', 'afcon-all-editions'));
}

console.log(`Generated ${pool.length} master archive questions.`);

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
