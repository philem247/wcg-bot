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
// 1. ICONIC WORLD CUP MATCHES & UNFORGETTABLE UPSETS (1950 - 2022)
// =========================================================================
const classicWcMatches = [
  makeQ('In the 1954 World Cup Final ("Miracle of Bern"), which country ended Hungary\'s legendary 31-game unbeaten streak with a 3-2 comeback victory?', 'West Germany', ['Uruguay', 'Austria', 'Brazil'], 'world', 'wc-classics'),
  makeQ('In the 1966 World Cup quarter-final, Portugal came back from 3-0 down to beat North Korea 5-3. Who scored 4 goals for Portugal that day?', 'Eusébio', ['José Augusto', 'Torres', 'Simões'], 'world', 'wc-classics'),
  makeQ('Which 1970 World Cup semi-final at Estadio Azteca, won 4-3 by Italy in extra time with 5 extra-time goals, is known as the "Game of the Century"?', 'Italy vs West Germany', ['Brazil vs Italy', 'Brazil vs Uruguay', 'West Germany vs England'], 'world', 'wc-classics'),
  makeQ('Which Italian striker scored a famous hat-trick in 1982 to knock out the iconic Zico and Sócrates Brazil team in a 3-2 thriller in Barcelona?', 'Paolo Rossi', ['Bruno Conti', 'Francesco Graziani', 'Alessandro Altobelli'], 'world', 'wc-classics'),
  makeQ('Who scored the 67th-minute header for 9-man Cameroon to stun reigning champions Argentina 1-0 in the opening match of the 1990 World Cup?', 'François Omam-Biyik', ['Roger Milla', 'Cyrille Makanaky', 'Thomas N\'Kono'], 'world', 'wc-classics'),
  makeQ('Which Saudi Arabian forward scored an astonishing 70-yard solo goal after dribbling past 4 defenders against Belgium at USA 1994?', 'Saeed Al-Owairan', ['Sami Al-Jaber', 'Fahad Al-Bishi', 'Majed Abdullah'], 'world', 'wc-classics'),
  makeQ('Who scored a stunning 18-year-old solo goal for England against Argentina at the 1998 World Cup in Saint-Étienne before David Beckham\'s red card?', 'Michael Owen', ['Paul Scholes', 'Alan Shearer', 'Teddy Sheringham'], 'world', 'wc-classics'),
  makeQ('Who scored the historic 30th-minute opening goal for Senegal in their shocking 1-0 victory over reigning champions France at the 2002 World Cup?', 'Papa Bouba Diop', ['El Hadji Diouf', 'Henri Camara', 'Khalilou Fadiga'], 'world', 'wc-classics'),
  makeQ('Which South Korean forward scored the 117th-minute Golden Goal header to eliminate Italy in the Round of 16 of the 2002 World Cup?', 'Ahn Jung-hwan', ['Park Ji-sung', 'Seol Ki-hyeon', 'Hwang Sun-hong'], 'world', 'wc-classics'),
  makeQ('Which ill-tempered 2006 World Cup match saw Russian referee Valentin Ivanov issue a record 4 red cards and 16 yellow cards?', 'Portugal vs Netherlands ("Battle of Nuremberg")', ['Italy vs Australia', 'Argentina vs Mexico', 'Germany vs Poland'], 'world', 'wc-classics'),
  makeQ('Which nation topped their 2014 World Cup "Group of Death" unbeaten ahead of former champions Uruguay, Italy, and England?', 'Costa Rica', ['Chile', 'Colombia', 'Greece'], 'world', 'wc-classics'),
  makeQ('Which French full-back won the 2018 World Cup Goal of the Tournament for his sensational spinning half-volley vs Argentina (4-3)?', 'Benjamin Pavard', ['Lucas Hernández', 'Kylian Mbappé', 'Antoine Griezmann'], 'world', 'wc-classics'),
  makeQ('Who scored the breathtaking 53rd-minute curling winner for Saudi Arabia to defeat eventual champions Argentina 2-1 at Qatar 2022?', 'Salem Al-Dawsari', ['Saleh Al-Shehri', 'Firas Al-Buraikan', 'Mohammed Al-Owais'], 'world', 'wc-classics'),
  makeQ('Who scored the 42nd-minute towering header for Morocco against Portugal to make them the first African nation to reach a World Cup semi-final?', 'Youssef En-Nesyri', ['Hakim Ziyech', 'Sofiane Boufal', 'Azzedine Ounahi'], 'world', 'wc-classics'),
  makeQ('Who scored a dramatic 101st-minute equalizer from a clever free-kick routine for Netherlands vs Argentina in the 2022 World Cup quarter-final?', 'Wout Weghorst', ['Teun Koopmeiners', 'Cody Gakpo', 'Memphis Depay'], 'world', 'wc-classics')
];

for (const q of classicWcMatches) pool.push(q);

// =========================================================================
// 2. ICONIC UEFA EUROS MOMENTS & HISTORIC UPSETS (1968 - 2024)
// =========================================================================
const classicEuroMatches = [
  makeQ('Which Czechoslovakian player invented the chipped penalty down the middle in the Euro 1976 final shootout vs West Germany\'s Sepp Maier?', 'Antonín Panenka', ['Zdeněk Nehoda', 'Ivo Viktor', 'Karol Dobiaš'], 'world', 'euro-classics'),
  makeQ('Who scored an astonishing 9 goals in 5 matches (including two perfect hat-tricks) to lead France to the UEFA Euro 1984 title?', 'Michel Platini', ['Alain Giresse', 'Jean Tigana', 'Luis Fernández'], 'world', 'euro-classics'),
  makeQ('Who scored one of the greatest volleys in football history from an impossible acute angle in the Euro 1988 Final for Netherlands vs USSR?', 'Marco van Basten', ['Ruud Gullit', 'Frank Rijkaard', 'Ronald Koeman'], 'world', 'euro-classics'),
  makeQ('Which English superstar scored an unforgettable flick-and-volley against Scotland at Euro 1996 before celebrating with the "Dentist\'s Chair"?', 'Paul Gascoigne', ['Alan Shearer', 'Teddy Sheringham', 'Darren Anderton'], 'world', 'euro-classics'),
  makeQ('Who scored France\'s 103rd-minute Golden Goal extra-time volley to defeat Italy in the UEFA Euro 2000 Final in Rotterdam?', 'David Trezeguet', ['Sylvain Wiltord', 'Thierry Henry', 'Zinedine Zidane'], 'world', 'euro-classics'),
  makeQ('Who scored the towering 57th-minute header for Greece in the Euro 2004 final to shock hosts Portugal 1-0 in Lisbon?', 'Angelos Charisteas', ['Theodoros Zagorakis', 'Angelos Basinas', 'Georgios Karagounis'], 'world', 'euro-classics'),
  makeQ('Which Turkish striker scored two dramatic goals in minutes 87 and 89 to complete a stunning 3-2 comeback over Czech Republic at Euro 2008?', 'Nihat Kahveci', ['Arda Turan', 'Semih Şentürk', 'Tuncay Şanlı'], 'world', 'euro-classics'),
  makeQ('Who scored two thunderous goals for Italy against Germany in the Euro 2012 semi-final, followed by an iconic shirtless flex celebration?', 'Mario Balotelli', ['Antonio Cassano', 'Andrea Pirlo', 'Claudio Marchisio'], 'world', 'euro-classics'),
  makeQ('Which Welsh striker executed a world-famous Cruyff turn inside the box to send three Belgian defenders the wrong way in the Euro 2016 quarter-final (3-1)?', 'Hal Robson-Kanu', ['Gareth Bale', 'Aaron Ramsey', 'Sam Vokes'], 'world', 'euro-classics'),
  makeQ('Who scored the 109th-minute long-range extra-time winner for Portugal against France in the Euro 2016 final in Paris after Ronaldo was injured?', 'Eder', ['Ricardo Quaresma', 'Nani', 'Renato Sanches'], 'world', 'euro-classics'),
  makeQ('Which Czech striker scored from 49.7 yards (the longest goal in European Championship history) against Scotland at Euro 2020?', 'Patrik Schick', ['Tomáš Souček', 'Vladimír Darida', 'Adam Hložek'], 'world', 'euro-classics'),
  makeQ('Who became the youngest goalscorer in European Championship history with his 25-yard curling wonder-goal for Spain vs France at Euro 2024 (age 16)?', 'Lamine Yamal', ['Nico Williams', 'Pedri', 'Gavi'], 'world', 'euro-classics'),
  makeQ('Who scored the 86th-minute sliding winner for Spain against England in the UEFA Euro 2024 Final in Berlin (2-1)?', 'Mikel Oyarzabal', ['Nico Williams', 'Dani Olmo', 'Álvaro Morata'], 'world', 'euro-classics')
];

for (const q of classicEuroMatches) pool.push(q);

// =========================================================================
// 3. COPA LIBERTADORES HISTORIC FINALS (2000 - 2024)
// =========================================================================
const libertadoresFinals = [
  ['2023 (Maracanã)', 'Fluminense (2-1 AET vs Boca Juniors, John Kennedy 99th min winner)', ['Boca Juniors', 'Palmeiras', 'Internacional']],
  ['2022 (Guayaquil)', 'Flamengo (1-0 vs Athletico Paranaense, Gabriel Barbosa winner)', ['Athletico Paranaense', 'Palmeiras', 'Vélez Sarsfield']],
  ['2021 (Montevideo)', 'Palmeiras (2-1 AET vs Flamengo, Deyverson 95th min winner)', ['Flamengo', 'Atlético Mineiro', 'Barcelona SC']],
  ['2020 (Maracanã)', 'Palmeiras (1-0 vs Santos, Breno Lopes 99th min header under Abel Ferreira)', ['Santos', 'River Plate', 'Boca Juniors']],
  ['2019 (Lima)', 'Flamengo (2-1 vs River Plate, Gabigol dramatic 89th & 92nd min brace under Jorge Jesus)', ['River Plate', 'Grêmio', 'Boca Juniors']],
  ['2018 (Madrid - Bernabéu)', 'River Plate (3-1 AET vs Boca Juniors in historic "Superclásico de Madrid")', ['Boca Juniors', 'Grêmio', 'Palmeiras']],
  ['2017 (Lanús)', 'Grêmio (3-1 agg vs Lanús, Luan chip under Renato Gaúcho)', ['Lanús', 'Barcelona SC', 'River Plate']],
  ['2016 (Medellín)', 'Atlético Nacional (2-1 agg vs Independiente del Valle, Borja winner)', ['Independiente del Valle', 'São Paulo', 'Boca Juniors']],
  ['2015 (Buenos Aires)', 'River Plate (3-0 agg vs Tigres UANL, Alario & Sánchez under Marcelo Gallardo)', ['Tigres UANL', 'Guaraní', 'Internacional']],
  ['2014 (Buenos Aires)', 'San Lorenzo (2-1 agg vs Nacional of Paraguay, First title in Pope Francis\' club history)', ['Nacional (Paraguay)', 'Bolívar', 'Defensor Sporting']],
  ['2013 (Belo Horizonte)', 'Atlético Mineiro (penalties vs Olimpia, Ronaldinho & Victor penalty heroics)', ['Olimpia', 'Newell\'s Old Boys', 'Santa Fe']],
  ['2012 (São Paulo)', 'Corinthians (3-1 agg vs Boca Juniors, Emerson Sheik brace in Pacaembu)', ['Boca Juniors', 'Santos', 'Universidad de Chile']],
  ['2011 (São Paulo)', 'Santos (2-1 agg vs Peñarol, Neymar & Danilo under Muricy Ramalho)', ['Peñarol', 'Cerro Porteño', 'Vélez Sarsfield']],
  ['2008 (Rio de Janeiro)', 'LDU Quito (penalties vs Fluminense at Maracanã, Cevallos 3 shootout saves - 1st Ecuadorian winner)', ['Fluminense', 'América', 'Boca Juniors']],
  ['2007 (Porto Alegre)', 'Boca Juniors (5-0 agg vs Grêmio, Juan Román Riquelme 3 goals over two legs)', ['Grêmio', 'Santos', 'Cúcuta Deportivo']]
];

for (const [match, champion, runners] of libertadoresFinals) {
  pool.push(makeQ(`Who won the Copa Libertadores in the ${match} final?`, champion, runners, 'world', 'libertadores-winner'));
}

// =========================================================================
// 4. CAF CHAMPIONS LEAGUE HISTORIC FINALS (2000 - 2024)
// =========================================================================
const cafClFinals = [
  ['2024', 'Al Ahly (1-0 agg vs Espérance de Tunis, Rami Rabia header in Cairo)', ['Espérance de Tunis', 'Mamelodi Sundowns', 'TP Mazembe']],
  ['2023', 'Al Ahly (3-2 agg vs Wydad Casablanca, Mohamed Abdelmonem 78th min header in Casablanca)', ['Wydad Casablanca', 'Mamelodi Sundowns', 'Espérance de Tunis']],
  ['2022 (Casablanca)', 'Wydad Casablanca (2-0 vs Al Ahly, Zouhair El Moutaraji long-range brace)', ['Al Ahly', 'Petro de Luanda', 'ES Sétif']],
  ['2021 (Casablanca)', 'Al Ahly (3-0 vs Kaizer Chiefs, Sherif, Magdy Afsha & El Solia under Pitso Mosimane)', ['Kaizer Chiefs', 'Espérance de Tunis', 'Wydad Casablanca']],
  ['2020 (Cairo - "Century Derby")', 'Al Ahly (2-1 vs Zamalek, Mohamed Magdy Afsha 86th min volley "Kadhia Momkna")', ['Zamalek', 'Raja Casablanca', 'Wydad Casablanca']],
  ['2019', 'Espérance de Tunis (vs Wydad Casablanca in controversial VAR final)', ['Wydad Casablanca', 'TP Mazembe', 'Mamelodi Sundowns']],
  ['2018', 'Espérance de Tunis (4-3 agg vs Al Ahly, dramatic 3-0 second leg comeback in Radès)', ['Al Ahly', 'Primeiro de Agosto', 'ES Sétif']],
  ['2017', 'Wydad Casablanca (2-1 agg vs Al Ahly, Walid El Karti 69th min header)', ['Al Ahly', 'USM Alger', 'Étoile du Sahel']],
  ['2016', 'Mamelodi Sundowns (3-1 agg vs Zamalek, Billiat, Dolly & Laffor under Pitso Mosimane)', ['Zamalek', 'ZESCO United', 'Wydad Casablanca']],
  ['2015', 'TP Mazembe (4-1 agg vs USM Alger, Samatta & Kalaba in Lubumbashi)', ['USM Alger', 'Al-Merrikh', 'Al-Hilal']],
  ['2014', 'ES Sétif (3-3 agg away goals vs AS Vita Club, 1st Algerian winner in 26 years)', ['AS Vita Club', 'TP Mazembe', 'CS Sfaxien']],
  ['2013', 'Al Ahly (3-1 agg vs Orlando Pirates, Mohamed Aboutrika farewell goal)', ['Orlando Pirates', 'Coton Sport', 'Espérance de Tunis']],
  ['2012', 'Al Ahly (3-2 agg vs Espérance de Tunis, Gedo & Soliman in Radès post-Port Said)', ['Espérance de Tunis', 'TP Mazembe', 'Sunshine Stars']],
  ['2006 (Sfax)', 'Al Ahly (2-1 agg vs CS Sfaxien, Mohamed Aboutrika 92nd min left-foot volley in Sfax)', ['CS Sfaxien', 'ASEC Mimosas', 'Orlando Pirates']],
  ['2004', 'Enyimba of Nigeria (penalties vs Étoile du Sahel in Abuja, Back-to-back African champions)', ['Étoile du Sahel', 'Espérance de Tunis', 'Jeanne d\'Arc']],
  ['2003', 'Enyimba of Nigeria (2-1 agg vs Ismaily, Vincent Enyeama & Obinna Nwaneri - 1st Nigerian winner)', ['Ismaily', 'USM Alger', 'Espérance de Tunis']]
];

for (const [year, champion, runners] of cafClFinals) {
  pool.push(makeQ(`Who won the CAF Champions League in ${year}?`, champion, runners, 'world', 'caf-cl-winner'));
}

// =========================================================================
// 5. ICONIC PREMIER LEAGUE & WORLD DERBIES (MORE RIVALRIES)
// =========================================================================
const moreDerbies = [
  ['Tyne-Wear Derby', 'Newcastle United vs Sunderland', ['Middlesbrough vs Newcastle', 'Sunderland vs Middlesbrough', 'Leeds vs Newcastle']],
  ['Second City Derby', 'Aston Villa vs Birmingham City', ['Wolves vs West Brom', 'Coventry vs Villa', 'Stoke vs Port Vale']],
  ['Black Country Derby', 'Wolverhampton Wanderers vs West Bromwich Albion', ['Aston Villa vs Birmingham', 'Stoke vs Wolves', 'Coventry vs West Brom']],
  ['East Midlands Derby', 'Nottingham Forest vs Derby County', ['Leicester vs Forest', 'Derby vs Leicester', 'Forest vs Notts County']],
  ['Steel City Derby', 'Sheffield United vs Sheffield Wednesday', ['Leeds vs Sheffield United', 'Barnsley vs Wednesday', 'Rotherham vs Doncaster']],
  ['South Coast Derby', 'Southampton vs Portsmouth', ['Brighton vs Palace', 'Bournemouth vs Southampton', 'Plymouth vs Exeter']],
  ['A23 Derby (M23 Derby)', 'Crystal Palace vs Brighton & Hove Albion', ['Palace vs Charlton', 'Brighton vs Southampton', 'Chelsea vs Palace']],
  ['East London Derby', 'West Ham United vs Millwall', ['Leyton Orient vs West Ham', 'Charlton vs Millwall', 'West Ham vs Chelsea']],
  ['Dockers Derby', 'Millwall vs West Ham United', ['Charlton vs Millwall', 'Chelsea vs Fulham', 'Brentford vs Fulham']],
  ['West London Derby', 'Chelsea, Fulham, Brentford & QPR', ['Arsenal, Spurs & Chelsea', 'West Ham, Charlton & Palace', 'Millwall, Palace & Charlton']],
  ['The Cairo Derby', 'Al Ahly vs Zamalek', ['Pyramids vs Al Ahly', 'Zamalek vs Ismaily', 'Al Ahly vs Al Masry']],
  ['The Casablanca Derby', 'Raja Casablanca vs Wydad Casablanca', ['FAR Rabat vs Wydad', 'Raja vs FAR Rabat', 'FUS Rabat vs Wydad']],
  ['The Soweto Derby', 'Kaizer Chiefs vs Orlando Pirates', ['Mamelodi Sundowns vs Chiefs', 'Pirates vs Sundowns', 'SuperSport vs Sundowns']],
  ['The Eternal Enemies Derby', 'Olympiacos vs Panathinaikos (Greece)', ['AEK Athens vs PAOK', 'Olympiacos vs AEK', 'PAOK vs Aris']],
  ['The Belgrade Eternal Derby', 'Red Star Belgrade vs Partizan Belgrade (Serbia)', ['Vojvodina vs Red Star', 'Partizan vs Rad', 'Cukaricki vs Partizan']],
  ['Derby of the Eternal Enemies', 'Fenerbahçe vs Galatasaray (Turkey)', ['Beşiktaş vs Fenerbahçe', 'Trabzonspor vs Galatasaray', 'Beşiktaş vs Galatasaray']],
  ['The Clásico Capitalino', 'Millonarios vs Santa Fe (Colombia)', ['Atlético Nacional vs DIM', 'América vs Deportivo Cali', 'Junior vs Unión Magdalena']],
  ['The Clásico Paisa', 'Atlético Nacional vs Independiente Medellín (Colombia)', ['Millonarios vs Santa Fe', 'América vs Cali', 'Junior vs Nacional']]
];

for (const [name, correct, wrong] of moreDerbies) {
  pool.push(makeQ(`Which teams contest "${name}"?`, correct, wrong, 'other', 'rivalry-derby'));
}

// =========================================================================
// 6. EXPANDED COMPLETE THE NAME & COUNTRY FLAGS (100+ MORE STARS)
// =========================================================================
const namesSuper = [
  ['Castello', 'Lukeba', ['Simakan', 'Klostermann', 'Bitshiabu'], 'RB Leipzig & France young centre-back'],
  ['Lutsharel', 'Geertruida', ['Klostermann', 'Henrichs', 'Seiwald'], 'RB Leipzig & Netherlands versatile defender'],
  ['Nicolas', 'Seiwald', ['Schlager', 'Haidara', 'Kampl'], 'RB Leipzig & Austria midfield engine'],
  ['Amadou', 'Haidara', ['Seiwald', 'Schlager', 'Kampl'], 'RB Leipzig & Mali box-to-box midfielder'],
  ['Christoph', 'Baumgartner', ['Schlager', 'Seiwald', 'Gregoritsch'], 'RB Leipzig & Austria playmaker'],
  ['Kevin', 'Kampl', ['Haidara', 'Seiwald', 'Baumgartner'], 'RB Leipzig & Slovenia veteran midfielder'],
  ['Enzo', 'Millot', ['Stiller', 'Karazor', 'Leweling'], 'VfB Stuttgart & France Olympic silver medalist playmaker'],
  ['Atakan', 'Karazor', ['Stiller', 'Millot', 'Keitel'], 'VfB Stuttgart & Turkey midfield destroyer'],
  ['Jamie', 'Leweling', ['Führich', 'Undav', 'Demirović'], 'VfB Stuttgart & Germany winger'],
  ['Alexander', 'Nübel', ['Bredlow', 'Seimen', 'Schock'], 'VfB Stuttgart & Germany goalkeeper'],
  ['Hugo', 'Larsson', ['Skhiri', 'Chaïbi', 'Götze'], 'Eintracht Frankfurt & Sweden midfield wonderkid'],
  ['Farès', 'Chaïbi', ['Larsson', 'Skhiri', 'Götze'], 'Eintracht Frankfurt & Algeria creative midfielder'],
  ['Omar', 'Marmoush', ['Ekitiké', 'Matanović', 'Knauff'], 'Eintracht Frankfurt & Egypt electric striker'],
  ['Hugo', 'Ekitiké', ['Marmoush', 'Matanović', 'Bahoya'], 'Eintracht Frankfurt & France dynamic striker'],
  ['Igor', 'Matanović', ['Ekitiké', 'Marmoush', 'Ngankam'], 'Eintracht Frankfurt & Croatia tall striker'],
  ['Jean-Mattéo', 'Bahoya', ['Ekitiké', 'Knauff', 'Ebimbe'], 'Eintracht Frankfurt & France young attacker'],
  ['Ansgar', 'Knauff', ['Bahoya', 'Ebimbe', 'Nkounkou'], 'Eintracht Frankfurt & Germany winger'],
  ['Niels', 'Nkounkou', ['Theate', 'Tuta', 'Koch'], 'Eintracht Frankfurt & France attacking left-back'],
  ['Robin', 'Koch', ['Theate', 'Tuta', 'Amenda'], 'Eintracht Frankfurt & Germany defender'],
  ['Can', 'Uzun', ['Götze', 'Chaïbi', 'Dahoud'], 'Eintracht Frankfurt & Turkey teenage wonderkid'],
  ['Kaua', 'Santos', ['Trapp', 'Grahl', 'Simoni'], 'Eintracht Frankfurt & Brazil athletic goalkeeper'],
  ['Rocco', 'Reitz', ['Weigl', 'Sander', 'Neuhaus'], 'Borussia Mönchengladbach & Germany midfielder'],
  ['Franck', 'Honorat', ['Hack', 'Plea', 'Cvancara'], 'Borussia Mönchengladbach & France winger'],
  ['Robin', 'Hack', ['Honorat', 'Plea', 'Ngoumou'], 'Borussia Mönchengladbach & Germany winger'],
  ['Alassane', 'Pléa', ['Cvancara', 'Hack', 'Honorat'], 'Borussia Mönchengladbach & France striker'],
  ['Tomás', 'Cvancara', ['Pléa', 'Hack', 'Honorat'], 'Borussia Mönchengladbach & Czech Republic tall striker'],
  ['Ko', 'Itakura', ['Elvedi', 'Friedrich', 'Chiarodia'], 'Borussia Mönchengladbach & Japan centre-back'],
  ['Nico', 'Elvedi', ['Itakura', 'Friedrich', 'Netz'], 'Borussia Mönchengladbach & Switzerland defender'],
  ['Luca', 'Netz', ['Scally', 'Elvedi', 'Ullrich'], 'Borussia Mönchengladbach & Germany full-back'],
  ['Joe', 'Scally', ['Netz', 'Elvedi', 'Itakura'], 'Borussia Mönchengladbach & USA right-back']
];

for (const [first, correct, wrong, desc] of namesSuper) {
  pool.push(makeQ(`Complete the name of this ${desc}: ${first} ______`, correct, wrong, 'other', 'complete-the-name'));
}

const flagsSuper = [
  ['Hugo Larsson', 'Sweden', ['Norway', 'Denmark', 'Finland'], '🇸🇪'],
  ['Farès Chaïbi', 'Algeria', ['Morocco', 'Tunisia', 'France'], '🇩🇿'],
  ['Igor Matanović', 'Croatia', ['Germany', 'Serbia', 'Bosnia & Herzegovina'], '🇭🇷'],
  ['Can Uzun', 'Turkey', ['Germany', 'Austria', 'Azerbaijan'], '🇹🇷'],
  ['Ko Itakura', 'Japan', ['South Korea', 'China', 'North Korea'], '🇯🇵'],
  ['Joe Scally', 'USA', ['Canada', 'England', 'Germany'], '🇺🇸'],
  ['Atakan Karazor', 'Turkey', ['Germany', 'Austria', 'Switzerland'], '🇹🇷'],
  ['Ermedin Demirović', 'Bosnia & Herzegovina', ['Serbia', 'Croatia', 'Montenegro'], '🇧🇦'],
  ['Denis Huseinbašić', 'Bosnia & Herzegovina', ['Germany', 'Croatia', 'Serbia'], '🇧🇦'],
  ['Amar Dedić', 'Bosnia & Herzegovina', ['Austria', 'Slovenia', 'Croatia'], '🇧🇦'],
  ['Edin Džeko', 'Bosnia & Herzegovina', ['Croatia', 'Serbia', 'Montenegro'], '🇧🇦'],
  ['Miralem Pjanić', 'Bosnia & Herzegovina', ['Luxembourg', 'France', 'Croatia'], '🇧🇦'],
  ['Sead Kolašinac', 'Bosnia & Herzegovina', ['Germany', 'Croatia', 'Serbia'], '🇧🇦'],
  ['Benjamin Tahirović', 'Bosnia & Herzegovina', ['Sweden', 'Croatia', 'Serbia'], '🇧🇦'],
  ['Elif Elmas', 'North Macedonia', ['Albania', 'Turkey', 'Serbia'], '🇲🇰'],
  ['Enis Bardhi', 'North Macedonia', ['Kosovo', 'Albania', 'Turkey'], '🇲🇰'],
  ['Bojan Miovski', 'North Macedonia', ['Bulgaria', 'Serbia', 'Greece'], '🇲🇰'],
  ['Stole Dimitrievski', 'North Macedonia', ['Bulgaria', 'Serbia', 'Croatia'], '🇲🇰'],
  ['Goran Pandev', 'North Macedonia', ['Bulgaria', 'Serbia', 'Albania'], '🇲🇰'],
  ['Stefan Savić', 'Montenegro', ['Serbia', 'Croatia', 'Bosnia & Herzegovina'], '🇲🇪'],
  ['Stevan Jovetić', 'Montenegro', ['Serbia', 'Croatia', 'Italy'], '🇲🇪'],
  ['Adam Marušić', 'Montenegro', ['Serbia', 'Croatia', 'Belgium'], '🇲🇪'],
  ['Nikola Krstović', 'Montenegro', ['Serbia', 'Croatia', 'North Macedonia'], '🇲🇪'],
  ['Viktor Đukanović', 'Montenegro', ['Serbia', 'Croatia', 'Slovenia'], '🇲🇪'],
  ['Slobodan Rubežić', 'Montenegro', ['Serbia', 'Scotland', 'Croatia'], '🇲🇪']
];

for (const [player, correct, wrong, flag] of flagsSuper) {
  pool.push(makeQ(`Which national team does ${player} represent internationally? ${flag}`, correct, wrong, 'world', 'country-flag'));
}

console.log(`Generated ${pool.length} supermassive archive questions.`);

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
