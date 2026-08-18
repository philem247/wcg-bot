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
// 1. PREMIER LEAGUE CHAMPIONS & HISTORIC SEASONS (1992/93 to 2023/24)
// =========================================================================
const plSeasons = [
  ['2023/24', 'Manchester City (91 pts)', ['Arsenal (89 pts)', 'Liverpool (82 pts)', 'Aston Villa (68 pts)']],
  ['2022/23', 'Manchester City (89 pts)', ['Arsenal (84 pts)', 'Manchester United (75 pts)', 'Newcastle United (71 pts)']],
  ['2021/22', 'Manchester City (93 pts)', ['Liverpool (92 pts)', 'Chelsea (74 pts)', 'Tottenham Hotspur (71 pts)']],
  ['2020/21', 'Manchester City (86 pts)', ['Manchester United (74 pts)', 'Liverpool (69 pts)', 'Chelsea (67 pts)']],
  ['2019/20', 'Liverpool (99 pts)', ['Manchester City (81 pts)', 'Manchester United (66 pts)', 'Chelsea (66 pts)']],
  ['2018/19', 'Manchester City (98 pts)', ['Liverpool (97 pts)', 'Chelsea (72 pts)', 'Tottenham Hotspur (71 pts)']],
  ['2017/18', 'Manchester City (100 pts)', ['Manchester United (81 pts)', 'Tottenham Hotspur (77 pts)', 'Liverpool (75 pts)']],
  ['2016/17', 'Chelsea (93 pts)', ['Tottenham Hotspur (86 pts)', 'Manchester City (78 pts)', 'Liverpool (76 pts)']],
  ['2015/16', 'Leicester City (81 pts)', ['Arsenal (71 pts)', 'Tottenham Hotspur (70 pts)', 'Manchester City (66 pts)']],
  ['2014/15', 'Chelsea (87 pts)', ['Manchester City (79 pts)', 'Arsenal (75 pts)', 'Manchester United (70 pts)']],
  ['2013/14', 'Manchester City (86 pts)', ['Liverpool (84 pts)', 'Chelsea (82 pts)', 'Arsenal (79 pts)']],
  ['2012/13', 'Manchester United (89 pts)', ['Manchester City (78 pts)', 'Chelsea (75 pts)', 'Arsenal (73 pts)']],
  ['2011/12', 'Manchester City (89 pts, +64 GD)', ['Manchester United (89 pts, +56 GD)', 'Arsenal (70 pts)', 'Tottenham Hotspur (69 pts)']],
  ['2010/11', 'Manchester United (80 pts)', ['Chelsea (71 pts)', 'Manchester City (71 pts)', 'Arsenal (68 pts)']],
  ['2009/10', 'Chelsea (86 pts)', ['Manchester United (85 pts)', 'Arsenal (75 pts)', 'Tottenham Hotspur (70 pts)']],
  ['2008/09', 'Manchester United (90 pts)', ['Liverpool (86 pts)', 'Chelsea (83 pts)', 'Arsenal (72 pts)']],
  ['2007/08', 'Manchester United (87 pts)', ['Chelsea (85 pts)', 'Arsenal (83 pts)', 'Liverpool (76 pts)']],
  ['2006/07', 'Manchester United (89 pts)', ['Chelsea (83 pts)', 'Liverpool (68 pts)', 'Arsenal (68 pts)']],
  ['2005/06', 'Chelsea (91 pts)', ['Manchester United (83 pts)', 'Liverpool (82 pts)', 'Arsenal (67 pts)']],
  ['2004/05', 'Chelsea (95 pts)', ['Arsenal (83 pts)', 'Manchester United (77 pts)', 'Everton (61 pts)']],
  ['2003/04', 'Arsenal (90 pts, Unbeaten)', ['Chelsea (79 pts)', 'Manchester United (75 pts)', 'Liverpool (60 pts)']],
  ['2002/03', 'Manchester United (83 pts)', ['Arsenal (78 pts)', 'Newcastle United (69 pts)', 'Chelsea (67 pts)']],
  ['2001/02', 'Arsenal (87 pts)', ['Liverpool (80 pts)', 'Manchester United (77 pts)', 'Newcastle United (71 pts)']],
  ['2000/01', 'Manchester United (80 pts)', ['Arsenal (70 pts)', 'Liverpool (69 pts)', 'Leeds United (68 pts)']],
  ['1999/00', 'Manchester United (91 pts)', ['Arsenal (73 pts)', 'Leeds United (69 pts)', 'Liverpool (67 pts)']],
  ['1998/99', 'Manchester United (79 pts)', ['Arsenal (78 pts)', 'Chelsea (75 pts)', 'Leeds United (67 pts)']],
  ['1997/98', 'Arsenal (78 pts)', ['Manchester United (77 pts)', 'Liverpool (65 pts)', 'Chelsea (63 pts)']],
  ['1996/97', 'Manchester United (75 pts)', ['Newcastle United (68 pts)', 'Arsenal (68 pts)', 'Liverpool (68 pts)']],
  ['1995/96', 'Manchester United (82 pts)', ['Newcastle United (78 pts)', 'Liverpool (71 pts)', 'Aston Villa (63 pts)']],
  ['1994/95', 'Blackburn Rovers (89 pts)', ['Manchester United (88 pts)', 'Nottingham Forest (77 pts)', 'Liverpool (74 pts)']],
  ['1993/94', 'Manchester United (92 pts)', ['Blackburn Rovers (84 pts)', 'Newcastle United (77 pts)', 'Arsenal (71 pts)']],
  ['1992/93', 'Manchester United (84 pts)', ['Aston Villa (74 pts)', 'Norwich City (72 pts)', 'Blackburn Rovers (71 pts)']]
];

for (const [season, champion, runners] of plSeasons) {
  pool.push(makeQ(`Who won the Premier League in the ${season} season?`, champion, runners, 'pl', 'pl-champions'));
}

// =========================================================================
// 2. ICONIC CHAMPIONS LEAGUE MATCHES & RECORDS
// =========================================================================
const uclMoments = [
  makeQ('In the 2019 Champions League semi-final second leg, Lucas Moura scored a 96th-minute hat-trick for Tottenham against which club?', 'Ajax', ['Barcelona', 'Borussia Dortmund', 'Manchester City'], 'ucl', 'ucl-drama'),
  makeQ('Who scored the 92nd-minute breakaway goal for Chelsea against Barcelona at Camp Nou in the 2012 UCL semi-final?', 'Fernando Torres', ['Didier Drogba', 'Ramires', 'Frank Lampard'], 'ucl', 'ucl-drama'),
  makeQ('In 2018, AS Roma completed a legendary Champions League comeback against Barcelona (3-0). Who scored the historic 82nd-minute header?', 'Kostas Manolas', ['Edin Džeko', 'Daniele De Rossi', 'Radja Nainggolan'], 'ucl', 'ucl-drama'),
  makeQ('Who scored Real Madrid\'s 93rd-minute equalising header in the 2014 Champions League Final against Atlético Madrid?', 'Sergio Ramos', ['Cristiano Ronaldo', 'Gareth Bale', 'Karim Benzema'], 'ucl', 'ucl-drama'),
  makeQ('In 2022, Rodrygo scored two goals in minutes 90 and 91 for Real Madrid to force extra time in the UCL semi-final against which team?', 'Manchester City', ['Chelsea', 'Paris Saint-Germain', 'Liverpool'], 'ucl', 'ucl-drama'),
  makeQ('Who is the all-time leading goalscorer in UEFA Champions League history?', 'Cristiano Ronaldo (140 goals)', ['Lionel Messi (129 goals)', 'Robert Lewandowski (94 goals)', 'Karim Benzema (90 goals)'], 'ucl', 'ucl-records'),
  makeQ('Who is the all-time leading assist provider in UEFA Champions League history?', 'Cristiano Ronaldo (42 assists)', ['Lionel Messi (40 assists)', 'Ángel Di María (38 assists)', 'Neymar (33 assists)'], 'ucl', 'ucl-records'),
  makeQ('Which player has won the most UEFA Champions League / European Cup titles in history (6 titles)?', 'Paco Gento, Dani Carvajal, Luka Modrić, Toni Kroos & Nacho', ['Cristiano Ronaldo', 'Paolo Maldini', 'Lionel Messi'], 'ucl', 'ucl-records'),
  makeQ('Which manager has won the most UEFA Champions League titles in history (5 titles)?', 'Carlo Ancelotti', ['Pep Guardiola', 'Zinedine Zidane', 'Bob Paisley'], 'ucl', 'ucl-records'),
  makeQ('Who scored the fastest goal in UEFA Champions League history (10.12 seconds, for Bayern Munich vs Real Madrid in 2007)?', 'Roy Makaay', ['Clarence Seedorf', 'Alessandro Del Piero', 'Alexandre Pato'], 'ucl', 'ucl-records'),
  makeQ('Which player scored a stunning bicycle kick in the 2002 Champions League Final for Real Madrid against Bayer Leverkusen?', 'Zinedine Zidane', ['Raúl', 'Fernando Morientes', 'Luís Figo'], 'ucl', 'ucl-drama'),
  makeQ('Which French club reached the Champions League final in 2004 under Didier Deschamps before losing to José Mourinho\'s FC Porto?', 'AS Monaco', ['Olympique Lyonnais', 'Paris Saint-Germain', 'Marseille'], 'ucl', 'ucl-history'),
  makeQ('Which club is the only French side to have ever won the UEFA Champions League / European Cup (in 1993)?', 'Olympique de Marseille', ['Paris Saint-Germain', 'AS Monaco', 'Saint-Étienne'], 'ucl', 'ucl-history')
];

for (const q of uclMoments) pool.push(q);

// =========================================================================
// 3. AFRICAN FOOTBALL LORE & AFCON LEGENDS
// =========================================================================
const africanLore = [
  makeQ('Who is the all-time leading top goalscorer in Africa Cup of Nations (AFCON) history?', 'Samuel Eto\'o (18 goals)', ['Laurent Pokou (14 goals)', 'Rashidi Yekini (13 goals)', 'Didier Drogba (11 goals)'], 'world', 'afcon-lore'),
  makeQ('Who scored Nigeria\'s first-ever goal in FIFA World Cup history against Bulgaria at USA 1994?', 'Rashidi Yekini', ['Daniel Amokachi', 'Emmanuel Amunike', 'Sunday Oliseh'], 'world', 'afcon-lore'),
  makeQ('Who scored the 90th-minute Golden Goal winner for Nigeria against Argentina to win the 1996 Olympic Men\'s Football Gold medal?', 'Emmanuel Amunike', ['Nwankwo Kanu', 'Daniel Amokachi', 'Sunday Oliseh'], 'world', 'afcon-lore'),
  makeQ('Who won the 2023 African Men\'s Footballer of the Year award after leading Napoli to their first Serie A title in 33 years?', 'Victor Osimhen', ['Mohamed Salah', 'Achraf Hakimi', 'Sadio Mané'], 'world', 'afcon-awards'),
  makeQ('Who won the 2024 UEFA Europa League Final Player of the Match after scoring a historic hat-trick for Atalanta against Bayer Leverkusen?', 'Ademola Lookman', ['Victor Boniface', 'Gianluca Scamacca', 'Charles De Ketelaere'], 'world', 'afcon-lore'),
  makeQ('Which legendary Nigerian midfielder was known for his dazzling dribbling and played for Bolton Wanderers, PSG, and Eintracht Frankfurt?', 'Jay-Jay Okocha', ['Sunday Oliseh', 'Finidi George', 'Mutiu Adepoju'], 'world', 'afcon-lore'),
  makeQ('Which African nation was the first in history to reach the semi-finals of a FIFA World Cup (Qatar 2022)?', 'Morocco', ['Senegal', 'Ghana', 'Cameroon'], 'world', 'afcon-lore'),
  makeQ('Which African player won 4 consecutive African Footballer of the Year awards between 2011 and 2014 while starring for Manchester City?', 'Yaya Touré', ['Didier Drogba', 'Samuel Eto\'o', 'John Obi Mikel'], 'world', 'afcon-awards'),
  makeQ('Who was the Chelsea midfielder who captained Nigeria to their 2013 Africa Cup of Nations triumph in South Africa?', 'John Obi Mikel', ['Vincent Enyeama', 'Joseph Yobo', 'Victor Moses'], 'world', 'afcon-lore'),
  makeQ('Who scored the winning goal for Nigeria in the 2013 AFCON final against Burkina Faso?', 'Sunday Mba', ['Emmanuel Emenike', 'Victor Moses', 'Ahmed Musa'], 'world', 'afcon-lore'),
  makeQ('Which nation has won the most Africa Cup of Nations (AFCON) titles in history (7 titles)?', 'Egypt', ['Cameroon (5)', 'Ghana (4)', 'Nigeria (3)'], 'world', 'afcon-records'),
  makeQ('Which Cameroonian icon famously celebrated his 1990 World Cup goals by dancing at the corner flag at the age of 38?', 'Roger Milla', ['Samuel Eto\'o', 'Rigobert Song', 'Patrick Mboma'], 'world', 'afcon-lore')
];

for (const q of africanLore) pool.push(q);

// =========================================================================
// 4. PREMIER LEAGUE ALL-TIME STATS & RECORDS
// =========================================================================
const plRecords = [
  makeQ('Who holds the record for the most appearances in Premier League history (653 matches)?', 'Gareth Barry', ['Ryan Giggs (632)', 'Frank Lampard (609)', 'James Milner (630+)'], 'pl', 'pl-records'),
  makeQ('Who is the all-time top goalscorer in Premier League history with 260 goals?', 'Alan Shearer', ['Harry Kane (213)', 'Wayne Rooney (208)', 'Andy Cole (187)'], 'pl', 'pl-records'),
  makeQ('Who holds the all-time record for the most assists in Premier League history with 162 assists?', 'Ryan Giggs', ['Cesc Fàbregas (111)', 'Kevin De Bruyne (110+)', 'Wayne Rooney (103)'], 'pl', 'pl-records'),
  makeQ('Who holds the record for the most clean sheets in Premier League history (202 clean sheets)?', 'Petr Čech', ['David James (169)', 'Mark Schwarzer (151)', 'David Seaman (141)'], 'pl', 'pl-records'),
  makeQ('Who scored the fastest hat-trick in Premier League history (2 minutes 56 seconds for Southampton in 2015)?', 'Sadio Mané', ['Robbie Fowler', 'Sergio Agüero', 'Jermain Defoe'], 'pl', 'pl-records'),
  makeQ('Who scored the fastest goal in Premier League history (7.69 seconds for Southampton vs Watford in 2019)?', 'Shane Long', ['Ledley King', 'Philip Billing', 'Alan Shearer'], 'pl', 'pl-records'),
  makeQ('Which player holds the record for the most Premier League Player of the Month awards (7 awards, shared)?', 'Sergio Agüero & Harry Kane', ['Steven Gerrard (6)', 'Cristiano Ronaldo (6)', 'Wayne Rooney (5)'], 'pl', 'pl-records'),
  makeQ('Who holds the record for the most goals scored as a substitute in Premier League history (24 goals)?', 'James Milner & Jermain Defoe', ['Ole Gunnar Solskjær', 'Olivier Giroud', 'Nwankwo Kanu'], 'pl', 'pl-records'),
  makeQ('Which club holds the record for the biggest Premier League win in history (9-0, achieved by three teams)?', 'Man United (twice), Southampton (lost twice) & Liverpool', ['Chelsea & Man City', 'Arsenal & Tottenham', 'Newcastle & Aston Villa'], 'pl', 'pl-records'),
  makeQ('Which player scored 5 goals in a single Premier League match for Manchester United against Blackburn in 2010?', 'Dimitar Berbatov', ['Wayne Rooney', 'Robin van Persie', 'Ruud van Nistelrooy'], 'pl', 'pl-records')
];

for (const q of plRecords) pool.push(q);

// =========================================================================
// 5. ICONIC SHIRT NUMBERS
// =========================================================================
const shirtNumbers = [
  ['Trent Alexander-Arnold', 'Liverpool', '66', ['2', '12', '26']],
  ['Phil Foden', 'Manchester City', '47', ['10', '11', '8']],
  ['Declan Rice', 'Arsenal', '41', ['4', '6', '8']],
  ['Mario Balotelli', 'Manchester City & Liverpool', '45', ['9', '19', '99']],
  ['Bruno Fernandes', 'Manchester United', '8', ['10', '18', '7']],
  ['Bukayo Saka', 'Arsenal', '7', ['14', '77', '11']],
  ['Martin Ødegaard', 'Arsenal', '8', ['10', '11', '21']],
  ['William Saliba', 'Arsenal', '2', ['4', '12', '5']],
  ['Virgil van Dijk', 'Liverpool', '4', ['5', '3', '2']],
  ['Mohamed Salah', 'Liverpool', '11', ['10', '7', '9']],
  ['Cole Palmer', 'Chelsea', '20', ['10', '7', '80']],
  ['Erling Haaland', 'Manchester City', '9', ['10', '15', '23']],
  ['Kevin De Bruyne', 'Manchester City', '17', ['10', '8', '7']],
  ['Rodri', 'Manchester City', '16', ['6', '8', '4']],
  ['Luka Modrić', 'Real Madrid', '10', ['19', '8', '14']],
  ['Jude Bellingham', 'Real Madrid', '5', ['10', '7', '22']],
  ['Vinícius Júnior', 'Real Madrid', '7', ['11', '20', '28']],
  ['Kylian Mbappé', 'Real Madrid', '9', ['7', '10', '29']],
  ['Lamine Yamal', 'Barcelona', '19', ['10', '17', '27']],
  ['Robert Lewandowski', 'Barcelona', '9', ['10', '11', '12']],
  ['Antoine Griezmann', 'Atlético Madrid', '7', ['8', '17', '10']],
  ['Harry Kane', 'Bayern Munich', '9', ['10', '18', '20']],
  ['Florian Wirtz', 'Bayer Leverkusen', '10', ['7', '27', '8']],
  ['Lautaro Martínez', 'Inter Milan', '10', ['9', '22', '11']],
  ['Rafael Leão', 'AC Milan', '10', ['17', '7', '11']],
  ['Victor Osimhen', 'Galatasaray / Napoli', '45 / 9', ['10', '14', '77']]
];

for (const [player, club, correct, wrong] of shirtNumbers) {
  pool.push(makeQ(`What iconic shirt number does ${player} wear for ${club}?`, correct, wrong, 'other', 'shirt-number'));
}

// =========================================================================
// 6. CLUB & NATIONAL TEAM NICKNAMES
// =========================================================================
const nicknames = [
  ['Arsenal', 'The Gunners', ['The Citizens', 'The Toffees', 'The Cottagers']],
  ['Chelsea', 'The Blues', ['The Villans', 'The Cherries', 'The Saints']],
  ['Liverpool', 'The Reds', ['The Red Devils', 'The Red and Whites', 'The Robins']],
  ['Manchester United', 'The Red Devils', ['The Citizens', 'The Reds', 'The Saints']],
  ['Manchester City', 'The Citizens (or Cityzens)', ['The Red Devils', 'The Gunners', 'The Magpies']],
  ['Tottenham Hotspur', 'Spurs (or The Lilywhites)', ['The Hammers', 'The Bees', 'The Canaries']],
  ['Newcastle United', 'The Magpies (or The Toon)', ['The Black Cats', 'The Blades', 'The Seagulls']],
  ['Aston Villa', 'The Villans (or The Lions)', ['The Saints', 'The Bees', 'The Baggies']],
  ['Everton', 'The Toffees (or The Blues)', ['The Hammers', 'The Cherries', 'The Cottagers']],
  ['West Ham United', 'The Hammers (or The Irons)', ['The Toffees', 'The Tricky Trees', 'The Bees']],
  ['Brighton & Hove Albion', 'The Seagulls', ['The Swans', 'The Robins', 'The Canaries']],
  ['Brentford', 'The Bees', ['The Wasps', 'The Hornets', 'The Terriers']],
  ['Crystal Palace', 'The Eagles (formerly The Glaziers)', ['The Owls', 'The Magpies', 'The Robins']],
  ['Fulham', 'The Cottagers (or The Whites)', ['The Villans', 'The Saints', 'The Baggies']],
  ['Wolverhampton Wanderers', 'Wolves', ['The Foxes', 'The Terriers', 'The Rams']],
  ['Bournemouth', 'The Cherries', ['The Berries', 'The Apples', 'The Peaches']],
  ['Nottingham Forest', 'The Tricky Trees (or The Reds)', ['The Woodmen', 'The Archers', 'The Oaks']],
  ['Leicester City', 'The Foxes', ['The Wolves', 'The Terriers', 'The Lions']],
  ['Southampton', 'The Saints', ['The Sinners', 'The Monks', 'The Priests']],
  ['Juventus', 'The Old Lady (La Vecchia Signora)', ['The Blue Goddess', 'The Black Stars', 'The Bull']],
  ['AC Milan', 'I Rossoneri (The Red and Blacks)', ['I Nerazzurri', 'I Bianconeri', 'I Giallorossi']],
  ['Inter Milan', 'I Nerazzurri (The Black and Blues)', ['I Rossoneri', 'I Bianconeri', 'I Giallorossi']],
  ['AS Roma', 'I Giallorossi (The Yellow and Reds)', ['I Rossoneri', 'I Bianconeri', 'I Nerazzurri']],
  ['Nigeria men\'s national team', 'Super Eagles', ['Black Stars', 'Indomitable Lions', 'Les Éléphants']],
  ['Ghana men\'s national team', 'Black Stars', ['Super Eagles', 'Harambee Stars', 'Bafana Bafana']],
  ['Cameroon men\'s national team', 'Indomitable Lions', ['Atlas Lions', 'Teranga Lions', 'Desert Warriors']],
  ['Ivory Coast men\'s national team', 'Les Éléphants (The Elephants)', ['Indomitable Lions', 'Black Stars', 'Super Eagles']],
  ['Senegal men\'s national team', 'Lions of Teranga', ['Atlas Lions', 'Super Eagles', 'Indomitable Lions']],
  ['Morocco men\'s national team', 'Atlas Lions', ['Desert Warriors', 'Pharaohs', 'Carthage Eagles']],
  ['Egypt men\'s national team', 'The Pharaohs', ['Desert Warriors', 'Atlas Lions', 'Carthage Eagles']],
  ['Algeria men\'s national team', 'The Desert Warriors (or The Fennecs)', ['The Pharaohs', 'Atlas Lions', 'Carthage Eagles']],
  ['South Africa men\'s national team', 'Bafana Bafana', ['Chipolopolo', 'Taifa Stars', 'Harambee Stars']],
  ['Zambia men\'s national team', 'Chipolopolo (The Copper Bullets)', ['Bafana Bafana', 'Taifa Stars', 'Super Eagles']]
];

for (const [team, correct, wrong] of nicknames) {
  pool.push(makeQ(`What is the official nickname of ${team}?`, correct, wrong, 'other', 'nickname'));
}

// =========================================================================
// 7. RECORD TRANSFERS BY CLUB
// =========================================================================
const recordTransfers = [
  ['Arsenal', 'Declan Rice (£105m)', ['Nicolas Pépé (£72m)', 'Kai Havertz (£65m)', 'Pierre-Emerick Aubameyang (£56m)']],
  ['Chelsea', 'Moisés Caicedo (£115m)', ['Enzo Fernández (£106.8m)', 'Romelu Lukaku (£97.5m)', 'Kai Havertz (£72m)']],
  ['Manchester City', 'Jack Grealish (£100m)', ['Josko Gvardiol (£77m)', 'Kevin De Bruyne (£55m)', 'Rodri (£62.8m)']],
  ['Manchester United', 'Paul Pogba (£89m)', ['Antony (£82m)', 'Harry Maguire (£80m)', 'Jadon Sancho (£73m)']],
  ['Liverpool', 'Virgil van Dijk (£75m)', ['Darwin Núñez (£64m + add-ons)', 'Alisson Becker (£65m)', 'Dominik Szoboszlai (£60m)']],
  ['Tottenham Hotspur', 'Dominic Solanke (£65m)', ['Tanguy Ndombele (£63m)', 'Richarlison (£60m)', 'Brennan Johnson (£47.5m)']],
  ['Newcastle United', 'Alexander Isak (£63m)', ['Sandro Tonali (£55m)', 'Bruno Guimarães (£40m)', 'Anthony Gordon (£45m)']],
  ['Aston Villa', 'Amadou Onana (£50m)', ['Moussa Diaby (£51.9m)', 'Emiliano Buendía (£38m)', 'Pau Torres (£31.5m)']],
  ['West Ham United', 'Sébastien Haller (£45m)', ['Lucas Paquetá (£51m inc add-ons)', 'Mohammed Kudus (£38m)', 'Gianluca Scamacca (£35.5m)']],
  ['Real Madrid', 'Jude Bellingham / Eden Hazard (€103m - €115m)', ['Gareth Bale (€101m)', 'Cristiano Ronaldo (€94m)', 'Aurélien Tchouaméni (€80m)']],
  ['Barcelona', 'Philippe Coutinho (€135m - €160m)', ['Ousmane Dembélé (€135m)', 'Antoine Griezmann (€120m)', 'Neymar (€88m)']],
  ['Paris Saint-Germain', 'Neymar (€222m World Record)', ['Kylian Mbappé (€180m)', 'Randal Kolo Muani (€95m)', 'Achraf Hakimi (€68m)']],
  ['Bayern Munich', 'Harry Kane (€95m + add-ons)', ['Lucas Hernández (€80m)', 'Matthijs de Ligt (€67m)', 'Min-jae Kim (€50m)']]
];

for (const [club, correct, wrong] of recordTransfers) {
  pool.push(makeQ(`Who is the all-time record signing in the history of ${club}?`, correct, wrong, 'other', 'record-transfer'));
}

// =========================================================================
// 8. WORLD CUP GOLDEN GLOVE WINNERS (1994 - 2022)
// =========================================================================
const wcGoldenGloves = [
  ['2022 Qatar', 'Emiliano Martínez (Argentina)', ['Dominik Livaković (Croatia)', 'Hugo Lloris (France)', 'Yassine Bounou (Morocco)']],
  ['2018 Russia', 'Thibaut Courtois (Belgium)', ['Hugo Lloris (France)', 'Danijel Subašić (Croatia)', 'Jordan Pickford (England)']],
  ['2014 Brazil', 'Manuel Neuer (Germany)', ['Sergio Romero (Argentina)', 'Keylor Navas (Costa Rica)', 'Tim Howard (USA)']],
  ['2010 South Africa', 'Iker Casillas (Spain)', ['Maarten Stekelenburg (Netherlands)', 'Manuel Neuer (Germany)', 'Eduardo (Portugal)']],
  ['2006 Germany', 'Gianluigi Buffon (Italy)', ['Fabien Barthez (France)', 'Jens Lehmann (Germany)', 'Ricardo (Portugal)']],
  ['2002 South Korea & Japan', 'Oliver Kahn (Germany)', ['Marcos (Brazil)', 'Rüștü Reçber (Turkey)', 'Lee Woon-jae (South Korea)']],
  ['1998 France', 'Fabien Barthez (France)', ['Cláudio Taffarel (Brazil)', 'Edwin van der Sar (Netherlands)', 'Dražen Ladić (Croatia)']],
  ['1994 USA', 'Michel Preud\'homme (Belgium)', ['Cláudio Taffarel (Brazil)', 'Gianluca Pagliuca (Italy)', 'Thomas Ravelli (Sweden)']]
];

for (const [tournament, correct, wrong] of wcGoldenGloves) {
  pool.push(makeQ(`Who won the Golden Glove (Best Goalkeeper) at the ${tournament} FIFA World Cup?`, correct, wrong, 'world', 'wc-golden-glove'));
}

// =========================================================================
// 9. COPA AMÉRICA CHAMPIONS & TOP SCORERS
// =========================================================================
const copaAmerica = [
  ['2024 (USA)', 'Argentina (Lautaro Martínez 112th min winner)', ['Colombia', 'Uruguay', 'Canada']],
  ['2021 (Brazil)', 'Argentina (Ángel Di María 22nd min winner)', ['Brazil', 'Colombia', 'Peru']],
  ['2019 (Brazil)', 'Brazil', ['Peru', 'Argentina', 'Chile']],
  ['2016 (Centenario, USA)', 'Chile (penalties vs Argentina)', ['Argentina', 'Colombia', 'USA']],
  ['2015 (Chile)', 'Chile (penalties vs Argentina)', ['Argentina', 'Peru', 'Paraguay']],
  ['2011 (Argentina)', 'Uruguay', ['Paraguay', 'Peru', 'Venezuela']],
  ['2007 (Venezuela)', 'Brazil', ['Argentina', 'Mexico', 'Uruguay']],
  ['2004 (Peru)', 'Brazil (penalties vs Argentina, Adriano 93rd min)', ['Argentina', 'Uruguay', 'Colombia']],
  ['2001 (Colombia)', 'Colombia', ['Mexico', 'Honduras', 'Uruguay']],
  ['1999 (Paraguay)', 'Brazil', ['Uruguay', 'Mexico', 'Chile']]
];

for (const [edition, correct, wrong] of copaAmerica) {
  pool.push(makeQ(`Which country won the ${edition} Copa América?`, correct, wrong, 'world', 'copa-winner'));
}

// =========================================================================
// 10. TREBLE WINNERS & MANAGERIAL MILESTONES
// =========================================================================
const trebles = [
  makeQ('Which was the first English men\'s club to win the historic European Treble (League, FA Cup, UCL) in 1999?', 'Manchester United', ['Liverpool', 'Arsenal', 'Manchester City'], 'pl', 'treble-lore'),
  makeQ('Who is the only manager in European football history to win two continental Trebles (Barcelona 2008/09 & Man City 2022/23)?', 'Pep Guardiola', ['Sir Alex Ferguson', 'José Mourinho', 'Carlo Ancelotti'], 'other', 'treble-lore'),
  makeQ('Which Scottish club became the first British team to win the European Cup as part of a Treble in 1967 (The Lisbon Lions)?', 'Celtic', ['Rangers', 'Aberdeen', 'Hearts'], 'other', 'treble-lore'),
  makeQ('Which Italian club achieved the first Italian Treble (Serie A, Coppa Italia, Champions League) in 2010 under José Mourinho?', 'Inter Milan', ['AC Milan', 'Juventus', 'AS Roma'], 'other', 'treble-lore'),
  makeQ('Which German club won European Trebles in both 2012/13 (Jupp Heynckes) and 2019/20 (Hansi Flick)?', 'Bayern Munich', ['Borussia Dortmund', 'Bayer Leverkusen', 'Hamburg'], 'other', 'treble-lore'),
  makeQ('Which manager led Bayer Leverkusen to an incredible unbeaten domestic double (Bundesliga & DFB-Pokal) in 2023/24?', 'Xabi Alonso', ['Julian Nagelsmann', 'Thomas Tuchel', 'Roger Schmidt'], 'other', 'manager-milestone'),
  makeQ('Who was the manager when Arsenal completed their famous 2003/04 "Invincibles" Premier League season?', 'Arsène Wenger', ['George Graham', 'Unai Emery', 'Bruce Rioch'], 'pl', 'manager-milestone'),
  makeQ('Which manager guided Nottingham Forest to back-to-back European Cup triumphs in 1979 and 1980?', 'Brian Clough', ['Bob Paisley', 'Bill Shankly', 'Ron Saunders'], 'ucl', 'manager-milestone'),
  makeQ('Who is the only manager to win the European Cup / Champions League three consecutive times (2016, 2017, 2018)?', 'Zinedine Zidane', ['Pep Guardiola', 'Carlo Ancelotti', 'Sir Alex Ferguson'], 'ucl', 'manager-milestone')
];

for (const q of trebles) pool.push(q);

// =========================================================================
// 11. COMPLETE THE NAME EXPANSION (MORE WORLD PLAYERS)
// =========================================================================
const moreNames = [
  ['Takefusa', 'Kubo', ['Mitoma', 'Minamino', 'Endo'], 'Real Sociedad & Japan creative winger'],
  ['Kaoru', 'Mitoma', ['Kubo', 'Doan', 'Tanaka'], 'Brighton & Japan dribbling sensation'],
  ['Wataru', 'Endo', ['Tomiyasu', 'Ito', 'Maeda'], 'Liverpool & Japan midfield anchor'],
  ['Hwang', 'Hee-chan', ['Son', 'Lee', 'Kim'], 'Wolves & South Korea forward'],
  ['Kim', 'Min-jae', ['Son', 'Hwang', 'Lee'], 'Bayern Munich & South Korea rock centre-back'],
  ['Lee', 'Kang-in', ['Son', 'Hwang', 'Cho'], 'PSG & South Korea playmaker'],
  ['Viktor', 'Gyökeres', ['Isak', 'Kulusevski', 'Elanga'], 'Sporting CP & Sweden goal machine'],
  ['Anthony', 'Gordon', ['Barnes', 'Murphy', 'Almiron'], 'Newcastle & England winger'],
  ['Sandro', 'Tonali', ['Guimarães', 'Joelinton', 'Willock'], 'Newcastle & Italy midfielder'],
  ['Harvey', 'Elliott', ['Jones', 'Bajcetic', 'Clark'], 'Liverpool & England midfielder'],
  ['Curtis', 'Jones', ['Elliott', 'Quansah', 'Bradley'], 'Liverpool & England midfielder'],
  ['Conor', 'Bradley', ['Gomez', 'Quansah', 'Beck'], 'Liverpool & Northern Ireland right-back'],
  ['Matheus', 'Nunes', ['Gomes', 'Paquetá', 'Cunha'], 'Manchester City & Portugal midfielder'],
  ['Oscar', 'Bobb', ['Haaland', 'Sorloth', 'Nusa'], 'Manchester City & Norway winger'],
  ['Savinho', 'Moreira', ['Rodrygo', 'Vinicius', 'Endrick'], 'Manchester City & Brazil winger'],
  ['Endrick', 'Felipe', ['Vitor Roque', 'Savinho', 'Estevao'], 'Real Madrid & Brazil teenage striker'],
  ['Vitor', 'Roque', ['Endrick', 'Estevao', 'Savinho'], 'Real Betis / Barcelona & Brazil young forward'],
  ['Estêvão', 'Willian', ['Endrick', 'Roque', 'Savinho'], 'Chelsea-bound Brazilian wonderkid "Messinho"'],
  ['Arda', 'Güler', ['Çalhanoğlu', 'Yıldız', 'Aktürkoğlu'], 'Real Madrid & Turkey midfield prodigy'],
  ['Kenan', 'Yıldız', ['Güler', 'Kökçü', 'Tosun'], 'Juventus & Turkey teenage attacker'],
  ['Pau', 'Víctor', ['Cubarsí', 'Fort', 'Torre'], 'Barcelona & Spain young striker'],
  ['Marc', 'Casadó', ['Bernal', 'Torre', 'Pedri'], 'Barcelona & Spain midfield pivot'],
  ['Marc', 'Bernal', ['Casadó', 'Gavi', 'Fort'], 'Barcelona & Spain midfield prodigy'],
  ['Malo', 'Gusto', ['Disasi', 'Fofana', 'Badiashile'], 'Chelsea & France dynamic full-back'],
  ['Romeo', 'Lavia', ['Ugochukwu', 'Caicedo', 'Santos'], 'Chelsea & Belgium midfielder'],
  ['Omari', 'Hutchinson', ['Philogene', 'Delap', 'Clarke'], 'Ipswich Town & Jamaica winger'],
  ['Liam', 'Delap', ['Hutchinson', 'Broadhead', 'Al-Hamadi'], 'Ipswich Town & England striker'],
  ['Mats', 'Wieffer', ['Timber', 'Schouten', 'Gravenberch'], 'Brighton & Netherlands midfielder'],
  ['Brajan', 'Gruda', ['Rutter', 'Adingra', 'Mitoma'], 'Brighton & Germany winger'],
  ['Georginio', 'Rutter', ['Gruda', 'Pedro', 'Ferguson'], 'Brighton & France attacker'],
  ['Carlos', 'Baleba', ['Gilmour', 'Wieffer', 'Moder'], 'Brighton & Cameroon midfielder'],
  ['Yankuba', 'Minteh', ['Adingra', 'Gruda', 'Mitoma'], 'Brighton & Gambia rapid winger'],
  ['Amad', 'Diallo', ['Garnacho', 'Antony', 'Pellistri'], 'Manchester United & Ivory Coast winger'],
  ['Joshua', 'Zirkzee', ['Højlund', 'Brobbey', 'Gakpo'], 'Manchester United & Netherlands striker'],
  ['Noussair', 'Mazraoui', ['Hakimi', 'Dalot', 'Malacia'], 'Manchester United & Morocco full-back'],
  ['Manuel', 'Ugarte', ['Casemiro', 'Mainoo', 'Eriksen'], 'Manchester United & Uruguay ball-winner']
];

for (const [first, correct, wrong, desc] of moreNames) {
  pool.push(makeQ(`Complete the name of this ${desc}: ${first} ______`, correct, wrong, 'other', 'complete-the-name'));
}

// =========================================================================
// 12. MORE COUNTRY & FLAGS 🇬🇪 🇳🇬 🇭🇷 🇨🇦 🇨🇲 🇸🇳 🇩🇿 🇲🇦 🇨🇮 🇬🇭 🇪🇨 🇨🇴 🇺🇾 🇯🇵 🇰🇷
// =========================================================================
const moreFlags = [
  ['Victor Osimhen', 'Nigeria', ['Ghana', 'Cameroon', 'Senegal'], '🇳🇬'],
  ['Alex Iwobi', 'Nigeria', ['England', 'Sierra Leone', 'Liberia'], '🇳🇬'],
  ['Wilfred Ndidi', 'Nigeria', ['Ghana', 'Mali', 'Ivory Coast'], '🇳🇬'],
  ['Samuel Chukwueze', 'Nigeria', ['Ivory Coast', 'Ghana', 'Cameroon'], '🇳🇬'],
  ['Calvin Bassey', 'Nigeria', ['England', 'Italy', 'Ghana'], '🇳🇬'],
  ['Ola Aina', 'Nigeria', ['England', 'Ghana', 'Sierra Leone'], '🇳🇬'],
  ['Taiwo Awoniyi', 'Nigeria', ['Ghana', 'Ivory Coast', 'Benin'], '🇳🇬'],
  ['Frank Onyeka', 'Nigeria', ['Ghana', 'Cameroon', 'Mali'], '🇳🇬'],
  ['Ademola Lookman', 'Nigeria', ['England', 'Ghana', 'Sierra Leone'], '🇳🇬'],
  ['Kelechi Iheanacho', 'Nigeria', ['Ghana', 'Cameroon', 'Liberia'], '🇳🇬'],
  ['Jordan Ayew', 'Ghana', ['Nigeria', 'Ivory Coast', 'Cameroon'], '🇬🇭'],
  ['Tariq Lamptey', 'Ghana', ['England', 'Nigeria', 'Sierra Leone'], '🇬🇭'],
  ['Simon Adingra', 'Ivory Coast', ['Ghana', 'Senegal', 'Nigeria'], '🇨🇮'],
  ['Amad Diallo', 'Ivory Coast', ['Senegal', 'Guinea', 'Mali'], '🇨🇮'],
  ['Odilon Kossounou', 'Ivory Coast', ['Burkina Faso', 'Mali', 'Ghana'], '🇨🇮'],
  ['Oumar Diakité', 'Ivory Coast', ['Mali', 'Senegal', 'Guinea'], '🇨🇮'],
  ['Ismaïla Sarr', 'Senegal', ['Gambia', 'Mali', 'Ivory Coast'], '🇸🇳'],
  ['Pape Gueye', 'Senegal', ['Mali', 'France', 'Ivory Coast'], '🇸🇳'],
  ['Brahim Díaz', 'Morocco', ['Spain', 'Algeria', 'Tunisia'], '🇲🇦'],
  ['Nayef Aguerd', 'Morocco', ['Algeria', 'Tunisia', 'Egypt'], '🇲🇦'],
  ['Yassine Bounou (Bono)', 'Morocco', ['Algeria', 'Tunisia', 'Canada'], '🇲🇦'],
  ['Sofyan Amrabat', 'Morocco', ['Netherlands', 'Algeria', 'Tunisia'], '🇲🇦'],
  ['Azzedine Ounahi', 'Morocco', ['Algeria', 'Tunisia', 'Egypt'], '🇲🇦'],
  ['André-Frank Zambo Anguissa', 'Cameroon', ['DR Congo', 'Senegal', 'Ivory Coast'], '🇨🇲'],
  ['Carlos Baleba', 'Cameroon', ['Ivory Coast', 'Nigeria', 'Ghana'], '🇨🇲'],
  ['Yankuba Minteh', 'Gambia', ['Senegal', 'Sierra Leone', 'Guinea'], '🇬🇲'],
  ['Ibrahim Sangaré', 'Ivory Coast', ['Mali', 'Senegal', 'Guinea'], '🇨🇮'],
  ['Edmond Tapsoba', 'Burkina Faso', ['Mali', 'Ivory Coast', 'Ghana'], '🇧🇫'],
  ['Dango Ouattara', 'Burkina Faso', ['Ghana', 'Ivory Coast', 'Mali'], '🇧🇫'],
  ['Lyle Foster', 'South Africa', ['Zimbabwe', 'Namibia', 'Zambia'], '🇿🇦'],
  ['Yoane Wissa', 'DR Congo', ['Congo', 'Cameroon', 'Angola'], '🇨🇩'],
  ['Chancel Mbemba', 'DR Congo', ['Angola', 'Cameroon', 'Congo'], '🇨🇩'],
  ['Arthur Masuaku', 'DR Congo', ['France', 'Cameroon', 'Ivory Coast'], '🇨🇩'],
  ['Yassine Meriah', 'Tunisia', ['Algeria', 'Morocco', 'Egypt'], '🇹🇳'],
  ['Ellyes Skhiri', 'Tunisia', ['France', 'Algeria', 'Morocco'], '🇹🇳'],
  ['Hannibal Mejbri', 'Tunisia', ['France', 'Algeria', 'Morocco'], '🇹🇳'],
  ['Omar Marmoush', 'Egypt', ['Tunisia', 'Morocco', 'Algeria'], '🇪🇬'],
  ['Trezeguet (Mahmoud Hassan)', 'Egypt', ['Tunisia', 'Morocco', 'Algeria'], '🇪🇬'],
  ['Mostafa Mohamed', 'Egypt', ['Morocco', 'Tunisia', 'Algeria'], '🇪🇬'],
  ['Rayan Aït-Nouri', 'Algeria', ['France', 'Morocco', 'Tunisia'], '🇩🇿'],
  ['Amine Gouiri', 'Algeria', ['France', 'Tunisia', 'Morocco'], '🇩🇿'],
  ['Ismaël Bennacer', 'Algeria', ['France', 'Morocco', 'Tunisia'], '🇩🇿'],
  ['Saïd Benrahma', 'Algeria', ['Tunisia', 'Morocco', 'Egypt'], '🇩🇿'],
  ['Arda Güler', 'Turkey', ['Germany', 'Azerbaijan', 'Greece'], '🇹🇷'],
  ['Hakan Çalhanoğlu', 'Turkey', ['Germany', 'Austria', 'Switzerland'], '🇹🇷'],
  ['Kenan Yıldız', 'Turkey', ['Germany', 'Austria', 'Albania'], '🇹🇷'],
  ['Ferdi Kadıoğlu', 'Turkey', ['Netherlands', 'Austria', 'Germany'], '🇹🇷'],
  ['Barış Alper Yılmaz', 'Turkey', ['Azerbaijan', 'Germany', 'Greece'], '🇹🇷']
];

for (const [player, correct, wrong, flag] of moreFlags) {
  pool.push(makeQ(`Which national team does ${player} represent internationally? ${flag}`, correct, wrong, 'world', 'country-flag'));
}

console.log(`Generated ${pool.length} new high-quality football questions.`);

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
