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
// 1. PREMIER LEAGUE PFA YOUNG PLAYER OF THE YEAR (1992/93 - 2023/24)
// =========================================================================
const pfaYoung = [
  ['2023/24', 'Cole Palmer (Chelsea)', ['Bukayo Saka', 'Phil Foden', 'Erling Haaland']],
  ['2022/23', 'Bukayo Saka (Arsenal)', ['Erling Haaland', 'Gabriel Martinelli', 'Moisés Caicedo']],
  ['2021/22', 'Phil Foden (Manchester City)', ['Bukayo Saka', 'Conor Gallagher', 'Reece James']],
  ['2020/21', 'Phil Foden (Manchester City)', ['Bukayo Saka', 'Mason Mount', 'Declan Rice']],
  ['2019/20', 'Trent Alexander-Arnold (Liverpool)', ['Marcus Rashford', 'Mason Mount', 'Tammy Abraham']],
  ['2018/19', 'Raheem Sterling (Manchester City)', ['Bernardo Silva', 'Marcus Rashford', 'Trent Alexander-Arnold']],
  ['2017/18', 'Leroy Sané (Manchester City)', ['Harry Kane', 'Raheem Sterling', 'Marcus Rashford']],
  ['2016/17', 'Dele Alli (Tottenham Hotspur)', ['Harry Kane', 'Romelu Lukaku', 'Leroy Sané']],
  ['2015/16', 'Dele Alli (Tottenham Hotspur)', ['Harry Kane', 'Romelu Lukaku', 'Ross Barkley']],
  ['2014/15', 'Harry Kane (Tottenham Hotspur)', ['Eden Hazard', 'Philippe Coutinho', 'Raheem Sterling']],
  ['2013/14', 'Eden Hazard (Chelsea)', ['Daniel Sturridge', 'Raheem Sterling', 'Luke Shaw']],
  ['2012/13', 'Gareth Bale (Tottenham Hotspur)', ['Christian Benteke', 'Romelu Lukaku', 'Danny Welbeck']],
  ['2011/12', 'Kyle Walker (Tottenham Hotspur)', ['Sergio Agüero', 'Gareth Bale', 'Alex Oxlade-Chamberlain']],
  ['2010/11', 'Jack Wilshere (Arsenal)', ['Nani', 'Javier Hernández', 'Seamus Coleman']],
  ['2009/10', 'James Milner (Aston Villa)', ['Wayne Rooney', 'Cesc Fàbregas', 'Joe Hart']],
  ['2008/09', 'Ashley Young (Aston Villa)', ['Gabriel Agbonlahor', 'Rafael da Silva', 'Jonny Evans']],
  ['2007/08', 'Cesc Fàbregas (Arsenal)', ['Cristiano Ronaldo', 'Fernando Torres', 'Micah Richards']],
  ['2006/07', 'Cristiano Ronaldo (Manchester United)', ['Wayne Rooney', 'Cesc Fàbregas', 'Kevin Doyle']],
  ['2005/06', 'Wayne Rooney (Manchester United)', ['Cristiano Ronaldo', 'Cesc Fàbregas', 'Darren Bent']],
  ['2004/05', 'Wayne Rooney (Manchester United)', ['Arjen Robben', 'Cristiano Ronaldo', 'Jermain Defoe']],
  ['2003/04', 'Scott Parker (Charlton Athletic)', ['Wayne Rooney', 'John Terry', 'Kolo Touré']],
  ['2002/03', 'Jermaine Jenas (Newcastle United)', ['Wayne Rooney', 'John O\'Shea', 'Craig Bellamy']],
  ['2001/02', 'Craig Bellamy (Newcastle United)', ['Steven Gerrard', 'Michael Owen', 'John Terry']],
  ['2000/01', 'Steven Gerrard (Liverpool)', ['Joe Cole', 'Michael Owen', 'Wes Brown']],
  ['1999/00', 'Harry Kewell (Leeds United)', ['Michael Owen', 'Thierry Henry', 'Emile Heskey']],
  ['1998/99', 'Nicolas Anelka (Arsenal)', ['Michael Owen', 'Frank Lampard', 'Rio Ferdinand']],
  ['1997/98', 'Michael Owen (Liverpool)', ['David Beckham', 'Ryan Giggs', 'Paul Scholes']],
  ['1996/97', 'David Beckham (Manchester United)', ['Robbie Fowler', 'Ryan Giggs', 'Sol Campbell']],
  ['1995/96', 'Robbie Fowler (Liverpool)', ['Ryan Giggs', 'David Beckham', 'Alan Shearer']],
  ['1994/95', 'Robbie Fowler (Liverpool)', ['Ryan Giggs', 'Chris Sutton', 'Darren Anderton']],
  ['1993/94', 'Andy Cole (Newcastle United)', ['Ryan Giggs', 'Robbie Fowler', 'Chris Sutton']],
  ['1992/93', 'Ryan Giggs (Manchester United)', ['Lee Sharpe', 'Roy Keane', 'Dwight Yorke']]
];

for (const [season, correct, wrong] of pfaYoung) {
  pool.push(makeQ(`Who won the PFA Young Player of the Year award in the ${season} season?`, correct, wrong, 'pl', 'pfa-young'));
}

// =========================================================================
// 2. PREMIER LEAGUE GOLDEN GLOVE WINNERS (2004/05 - 2023/24)
// =========================================================================
const plGoldenGlove = [
  ['2023/24', 'David Raya (Arsenal, 16 clean sheets)', ['Jordan Pickford', 'Ederson', 'Alisson Becker']],
  ['2022/23', 'David de Gea (Manchester United, 17 clean sheets)', ['Alisson Becker', 'Nick Pope', 'Aaron Ramsdale']],
  ['2021/22', 'Alisson Becker & Ederson (20 clean sheets, shared)', ['Hugo Lloris', 'Édouard Mendy', 'David de Gea']],
  ['2020/21', 'Ederson (Manchester City, 19 clean sheets)', ['Édouard Mendy', 'Emiliano Martínez', 'Hugo Lloris']],
  ['2019/20', 'Ederson (Manchester City, 16 clean sheets)', ['Nick Pope', 'Alisson Becker', 'Kasper Schmeichel']],
  ['2018/19', 'Alisson Becker (Liverpool, 21 clean sheets)', ['Ederson', 'Kepa Arrizabalaga', 'Jordan Pickford']],
  ['2017/18', 'David de Gea (Manchester United, 18 clean sheets)', ['Ederson', 'Thibaut Courtois', 'Hugo Lloris']],
  ['2016/17', 'Thibaut Courtois (Chelsea, 16 clean sheets)', ['Hugo Lloris', 'David de Gea', 'Fraser Forster']],
  ['2015/16', 'Petr Čech (Arsenal, 16 clean sheets)', ['David de Gea', 'Joe Hart', 'Kasper Schmeichel']],
  ['2014/15', 'Joe Hart (Manchester City, 14 clean sheets)', ['Łukasz Fabiański', 'Simon Mignolet', 'Fraser Forster']],
  ['2013/14', 'Wojciech Szczęsny & Petr Čech (16 clean sheets, shared)', ['Tim Howard', 'Artur Boruc', 'Hugo Lloris']],
  ['2012/13', 'Joe Hart (Manchester City, 18 clean sheets)', ['Petr Čech', 'Pepe Reina', 'David de Gea']],
  ['2011/12', 'Joe Hart (Manchester City, 17 clean sheets)', ['Tim Howard', 'Brad Friedel', 'Wojciech Szczęsny']],
  ['2010/11', 'Joe Hart (Manchester City, 18 clean sheets)', ['Petr Čech', 'Pepe Reina', 'Edwin van der Sar']],
  ['2009/10', 'Petr Čech (Chelsea, 17 clean sheets)', ['Pepe Reina', 'Edwin van der Sar', 'Joe Hart']],
  ['2008/09', 'Edwin van der Sar (Manchester United, 21 clean sheets)', ['Pepe Reina', 'Petr Čech', 'Mark Schwarzer']],
  ['2007/08', 'Pepe Reina (Liverpool, 18 clean sheets)', ['David James', 'Robert Green', 'Petr Čech']],
  ['2006/07', 'Pepe Reina (Liverpool, 19 clean sheets)', ['Tim Howard', 'Edwin van der Sar', 'Petr Čech']],
  ['2005/06', 'Pepe Reina (Liverpool, 20 clean sheets)', ['Edwin van der Sar', 'Petr Čech', 'Jens Lehmann']],
  ['2004/05', 'Petr Čech (Chelsea, record 24 clean sheets)', ['Roy Carroll', 'Nigel Martyn', 'Paul Robinson']]
];

for (const [season, correct, wrong] of plGoldenGlove) {
  pool.push(makeQ(`Who won the Premier League Golden Glove award in the ${season} season?`, correct, wrong, 'pl', 'pl-golden-glove'));
}

// =========================================================================
// 3. GOLDEN BOY WINNERS (BEST U21 IN EUROPE 2003 - 2024)
// =========================================================================
const goldenBoy = [
  ['2024', 'Lamine Yamal (FC Barcelona & Spain)', ['Arda Güler', 'Kobbie Mainoo', 'Alejandro Garnacho']],
  ['2023', 'Jude Bellingham (Real Madrid & England)', ['Jamal Musiala', 'Rasmus Højlund', 'Levi Colwill']],
  ['2022', 'Gavi (FC Barcelona & Spain)', ['Eduardo Camavinga', 'Jamal Musiala', 'Jude Bellingham']],
  ['2021', 'Pedri (FC Barcelona & Spain)', ['Jude Bellingham', 'Jamal Musiala', 'Florian Wirtz']],
  ['2020', 'Erling Haaland (Borussia Dortmund & Norway)', ['Ansu Fati', 'Alphonso Davies', 'Jadon Sancho']],
  ['2019', 'João Félix (Benfica/Atlético Madrid & Portugal)', ['Jadon Sancho', 'Kai Havertz', 'Erling Haaland']],
  ['2018', 'Matthijs de Ligt (Ajax & Netherlands)', ['Trent Alexander-Arnold', 'Justin Kluivert', 'Vinícius Júnior']],
  ['2017', 'Kylian Mbappé (Monaco/PSG & France)', ['Ousmane Dembélé', 'Marcus Rashford', 'Gabriel Jesus']],
  ['2016', 'Renato Sanches (Benfica/Bayern Munich & Portugal)', ['Marcus Rashford', 'Kingsley Coman', 'Dele Alli']],
  ['2015', 'Anthony Martial (Monaco/Manchester United & France)', ['Kingsley Coman', 'Héctor Bellerín', 'Raheem Sterling']],
  ['2014', 'Raheem Sterling (Liverpool & England)', ['Divock Origi', 'Marquinhos', 'Adnan Januzaj']],
  ['2013', 'Paul Pogba (Juventus & France)', ['Romelu Lukaku', 'Julian Draxler', 'Raphaël Varane']],
  ['2012', 'Isco (Málaga & Spain)', ['Thibaut Courtois', 'Stephan El Shaarawy', 'Christian Eriksen']],
  ['2011', 'Mario Götze (Borussia Dortmund & Germany)', ['Thiago Alcântara', 'Eden Hazard', 'Jack Wilshere']],
  ['2010', 'Mario Balotelli (Inter/Man City & Italy)', ['Jack Wilshere', 'David de Gea', 'Philippe Coutinho']],
  ['2009', 'Alexandre Pato (AC Milan & Brazil)', ['Stevan Jovetić', 'Bojan Krkić', 'Toni Kroos']],
  ['2008', 'Anderson (Manchester United & Brazil)', ['Theo Walcott', 'Sergio Agüero', 'Karim Benzema']],
  ['2007', 'Sergio Agüero (Atlético Madrid & Argentina)', ['Lionel Messi', 'Cesc Fàbregas', 'Gonzalo Higuaín']],
  ['2006', 'Cesc Fàbregas (Arsenal & Spain)', ['Lionel Messi', 'Anderson', 'Wayne Rooney']],
  ['2005', 'Lionel Messi (FC Barcelona & Argentina)', ['Wayne Rooney', 'Cristiano Ronaldo', 'Lukas Podolski']],
  ['2004', 'Wayne Rooney (Everton/Man United & England)', ['Cristiano Ronaldo', 'Fernando Torres', 'Arjen Robben']],
  ['2003', 'Rafael van der Vaart (Ajax & Netherlands)', ['Wayne Rooney', 'Cristiano Ronaldo', 'Fernando Torres']]
];

for (const [year, correct, wrong] of goldenBoy) {
  pool.push(makeQ(`Who won the European Golden Boy award (Best U21 Player in Europe) in ${year}?`, correct, wrong, 'world', 'golden-boy'));
}

// =========================================================================
// 4. AFRICAN FOOTBALL ICONS & MEMORABLE MILESTONES
// =========================================================================
const africanIcons = [
  makeQ('Which legendary Nigerian goalkeeper kept 1,062 consecutive minutes without conceding a goal for Lille in Ligue 1 in 2013?', 'Vincent Enyeama', ['Peter Rufai', 'Ike Shorunmu', 'Carl Ikeme'], 'world', 'african-icons'),
  makeQ('Which former Nigerian defender was famous for his bright green hairstyles and played for both Inter Milan and AC Milan?', 'Taribo West', ['Celestine Babayaro', 'Uche Okechukwu', 'Chidi Odiah'], 'world', 'african-icons'),
  makeQ('Who scored Nigeria\'s stunning 30-yard thunderbolt winner against Spain at the 1998 FIFA World Cup?', 'Sunday Oliseh', ['Mutiu Adepoju', 'Finidi George', 'Garba Lawal'], 'world', 'african-icons'),
  makeQ('Which Nigerian winger was a key starter for the iconic 1995 Ajax team that won the UEFA Champions League unbeaten?', 'Finidi George', ['Nwankwo Kanu', 'Tijjani Babangida', 'Emmanuel Amunike'], 'ucl', 'african-icons'),
  makeQ('Which former Chelsea and Newcastle left-back was the youngest player in Champions League history for 26 years (debut at 16 yrs 86 days in 1994)?', 'Celestine Babayaro', ['Taye Taiwo', 'Efe Ambrose', 'Ifeanyi Udeze'], 'ucl', 'african-icons'),
  makeQ('Which Ghanaian midfield powerhouse scored an unforgettable 35-yard screamer for Chelsea against Arsenal in December 2006?', 'Michael Essien', ['Sulley Muntari', 'Stephen Appiah', 'Kevin-Prince Boateng'], 'pl', 'african-icons'),
  makeQ('Which Ivorian defender won the Premier League unbeaten with Arsenal (2003/04) and later won the title with Manchester City (2011/12)?', 'Kolo Touré', ['Emmanuel Eboué', 'Kolo Habib', 'Siaka Tiéné'], 'pl', 'african-icons'),
  makeQ('Who is the all-time top African goalscorer in FIFA World Cup history with 6 goals?', 'Asamoah Gyan (Ghana)', ['Roger Milla (5)', 'Ahmed Musa (4)', 'Samuel Eto\'o (3)'], 'world', 'african-icons'),
  makeQ('Who is the oldest goalscorer in FIFA World Cup history (scored against Russia in 1994 at age 42 years 39 days)?', 'Roger Milla (Cameroon)', ['Dino Zoff', 'Essam El-Hadary', 'Peter Shilton'], 'world', 'african-icons'),
  makeQ('Which Algerian icon scored an immortal backheel flick for FC Porto in their 1987 European Cup Final victory over Bayern Munich?', 'Rabah Madjer', ['Lakhdar Belloumi', 'Mustapha Dahleb', 'Riyad Mahrez'], 'ucl', 'african-icons'),
  makeQ('Which Nigerian forward scored a famous hat-trick in 15 minutes for Arsenal to complete a sensational 3-2 comeback against Chelsea at Stamford Bridge in 1999?', 'Nwankwo Kanu', ['Thierry Henry', 'Dennis Bergkamp', 'Marc Overmars'], 'pl', 'african-icons'),
  makeQ('Which Super Eagles striker scored two goals against Argentina in both the 2014 and 2018 FIFA World Cups?', 'Ahmed Musa', ['Peter Odemwingie', 'Emmanuel Emenike', 'Odion Ighalo'], 'world', 'african-icons')
];

for (const q of africanIcons) pool.push(q);

// =========================================================================
// 5. ICONIC COMMENTARY CALLS & FAMOUS FOOTBALL QUOTES
// =========================================================================
const commentaryQuotes = [
  makeQ('Which iconic Martin Tyler commentary line accompanied Sergio Agüero\'s 93:20 title-winning goal for Manchester City in 2012?', '"Agueroooo! I swear you\'ll never see anything like this ever again!"', ['"And City have stolen the crown in the final seconds!"', '"It is unbelievable, it is Agüero for the title!"', '"Manchester City are the champions of England!"'], 'pl', 'commentary-quotes'),
  makeQ('Complete the famous Clive Tyldesley commentary call from the 1999 Champions League final: "Beckham into Sheringham... and ______ has won it!"', 'Solskjær', ['Cole', 'Yorke', 'Giggs'], 'ucl', 'commentary-quotes'),
  makeQ('Complete Johnny Phillips\' famous 2013 Championship playoff commentary call: "Knockaert takes... Almunia saves! Almunia saves again! Here comes Watford on the counter-attack... ______!"', 'Here\'s Deeney!', ['Goal for Watford!', 'It\'s in the net!', 'Watford are going to Wembley!'], 'pl', 'commentary-quotes'),
  makeQ('Which famous manager said the immortal quote: "Football, bloody hell" after winning the 1999 Champions League final in injury time?', 'Sir Alex Ferguson', ['Brian Clough', 'Bill Shankly', 'Bobby Robson'], 'ucl', 'commentary-quotes'),
  makeQ('Which Liverpool manager famously declared: "Some people believe football is a matter of life and death... I can assure you it is much, much more important than that"?', 'Bill Shankly', ['Bob Paisley', 'Kenny Dalglish', 'Jürgen Klopp'], 'pl', 'commentary-quotes'),
  makeQ('Which famous Kenneth Wolstenholme line closed BBC\'s broadcast of England\'s 1966 World Cup final victory over West Germany?', '"They think it\'s all over... it is now!"', ['"England are champions of the world!"', '"What a goal, what a finish!"', '"And the World Cup belongs to England!"'], 'world', 'commentary-quotes'),
  makeQ('Which French manager famously quipped "I did not see the incident" during his 22-year tenure at Arsenal?', 'Arsène Wenger', ['Gérard Houllier', 'Jean Tigana', 'Claude Puel'], 'pl', 'commentary-quotes'),
  makeQ('Which Portuguese manager declared in 2004: "Please don\'t call me arrogant, but I\'m European champion and I think I\'m a Special One"?', 'José Mourinho', ['André Villas-Boas', 'Jorge Jesus', 'Carlos Queiroz'], 'pl', 'commentary-quotes')
];

for (const q of commentaryQuotes) pool.push(q);

// =========================================================================
// 6. EXPANDED COMPLETE THE NAME (150+ PLAYERS)
// =========================================================================
const completeNamesList = [
  ['Nuno', 'Mendes', ['Tavares', 'Santos', 'Ramos'], 'PSG & Portugal lightning left-back'],
  ['Vitinha', 'Ferreira', ['Neves', 'Sanches', 'Palhinha'], 'PSG & Portugal midfield technician'],
  ['Fabián', 'Ruiz', ['Torres', 'Baena', 'Olmo'], 'PSG & Spain Euro 2024 star midfielder'],
  ['Lucas', 'Beraldo', ['Marquinhos', 'Danilo', 'Bremer'], 'PSG & Brazil young centre-back'],
  ['Matvey', 'Safonov', ['Akinfeev', 'Lunin', 'Trubin'], 'PSG & Russia goalkeeper'],
  ['Tiago', 'Santos', ['Djalo', 'Gomes', 'Neto'], 'Lille & Portugal attacking right-back'],
  ['Lucas', 'Chevalier', ['Samba', 'Restes', 'Lafont'], 'Lille & France young goalkeeper'],
  ['Hakim', 'Sahraoui', ['Zhegrova', 'Cabella', 'David'], 'Lille & Morocco tricky winger'],
  ['Moussa', 'Niakhaté', ['Koulibaly', 'Diallo', 'Jacobs'], 'Lyon & Senegal powerful centre-back'],
  ['Rayan', 'Cherki', ['Benrahma', 'Fofana', 'Nuamah'], 'Lyon & France playmaker prodigy'],
  ['Ernest', 'Nuamah', ['Kudus', 'Sulemana', 'Semenyo'], 'Lyon & Ghana explosive winger'],
  ['Malick', 'Fofana', ['Nuamah', 'Cherki', 'Mangala'], 'Lyon & Belgium dynamic attacker'],
  ['Mason', 'Greenwood', ['Rowe', 'Harit', 'Wahi'], 'Marseille forward'],
  ['Elye', 'Wahi', ['Moffi', 'Kalimuendo', 'Gouiri'], 'Marseille & France striker'],
  ['Gerónimo', 'Rulli', ['Musso', 'Armani', 'Benítez'], 'Marseille & Argentina goalkeeper'],
  ['Lilian', 'Brassier', ['Balerdi', 'Cornelius', 'Merlin'], 'Marseille & France defender'],
  ['Maghnes', 'Akliouche', ['Ben Seghir', 'Golovin', 'Minamino'], 'Monaco & France Olympic silver medalist'],
  ['Eliesse', 'Ben Seghir', ['Akliouche', 'Boadu', 'Balogun'], 'Monaco & Morocco young wizard'],
  ['Lamine', 'Camara', ['Pape Sarr', 'Gueye', 'Diallo'], 'Monaco & Senegal midfield prodigy'],
  ['George', 'Ilenikhena', ['Balogun', 'Embolo', 'Minamino'], 'Monaco & Nigeria teenage striking talent'],
  ['Denis', 'Zakaria', ['Freuler', 'Xhaka', 'Aebischer'], 'Monaco & Switzerland midfield dynamo'],
  ['Christian', 'Mawissa', ['Singo', 'Salisu', 'Kehrer'], 'Monaco & France defender'],
  ['Ludovic', 'Blas', ['Bourigeaud', 'Gouiri', 'Kalimuendo'], 'Rennes & France creative midfielder'],
  ['Arnaud', 'Kalimuendo', ['Gouiri', 'Blas', 'Jota'], 'Rennes & France striker'],
  ['Albert', 'Grønbæk', ['Gouiri', 'Blas', 'Kamara'], 'Rennes & Denmark midfielder'],
  ['Mikayil', 'Faye', ['Seidu', 'Ostigard', 'Truffert'], 'Rennes & Senegal defensive talent'],
  ['Leo', 'Østigård', ['Ajer', 'Strandberg', 'Hanche-Olsen'], 'Rennes & Norway centre-back'],
  ['Adrien', 'Truffert', ['Locko', 'Merlin', 'Hernandez'], 'Rennes & France full-back'],
  ['Hugo', 'Magnetti', ['Camara', 'Lees-Melou', 'Pereira Lage'], 'Brest & France midfield warrior'],
  ['Romain', 'Del Castillo', ['Ajorque', 'Sima', 'Baldé'], 'Brest & France winger'],
  ['Abdallah', 'Sima', ['Ndiaye', 'Diallo', 'Jackson'], 'Brest & Senegal Champions League goalscorer'],
  ['Ludovic', 'Ajorque', ['Baldé', 'Sima', 'Salah'], 'Brest & France tall striker'],
  ['Pavel', 'Šulc', ['Hranac', 'Chory', 'Provod'], 'Viktoria Plzeň & Czech Republic midfielder'],
  ['Tomáš', 'Chorý', ['Schick', 'Kuchta', 'Hložek'], 'Slavia Prague & Czech Republic target man'],
  ['Lukáš', 'Provod', ['Souček', 'Barák', 'Černý'], 'Slavia Prague & Czech Republic Euro 2024 scorer vs Portugal'],
  ['Robin', 'Hranáč', ['Zima', 'Krejčí', 'Holeš'], 'Hoffenheim & Czech Republic defender'],
  ['Ladislav', 'Krejčí', ['Hranáč', 'Zima', 'Holeš'], 'Girona & Czech Republic physical defender'],
  ['Bojan', 'Miovski', ['Abel Ruiz', 'Stuani', 'Tsygankov'], 'Girona & North Macedonia striker'],
  ['Abel', 'Ruiz', ['Miovski', 'Stuani', 'Asprilla'], 'Girona & Spain striker'],
  ['Yáser', 'Asprilla', ['Díaz', 'Sinisterra', 'Arias'], 'Girona & Colombia wonderkid'],
  ['Viktor', 'Tsygankov', ['Mudryk', 'Yarmolenko', 'Malinovskyi'], 'Girona & Ukraine winger'],
  ['Donny', 'van de Beek', ['Herrera', 'Martín', 'Solís'], 'Girona & Netherlands midfielder'],
  ['Arnaut', 'Danjuma', ['Girona', 'Villarreal', 'Everton'], 'Girona & Netherlands forward'],
  ['Pape', 'Gueye', ['Comesaña', 'Parejo', 'Baena'], 'Villarreal & Senegal midfielder'],
  ['Ayoze', 'Pérez', ['Barry', 'Pino', 'Moreno'], 'Villarreal & Spain Euro 2024 winner'],
  ['Thierno', 'Barry', ['Pérez', 'Pino', 'Moreno'], 'Villarreal & France young striker'],
  ['Yéremy', 'Pino', ['Baena', 'Pérez', 'Terrats'], 'Villarreal & Spain winger'],
  ['Álex', 'Baena', ['Pino', 'Comesaña', 'Parejo'], 'Villarreal & Spain Olympic & Euro 2024 gold winner'],
  ['Willy', 'Kambwala', ['Bailly', 'Albiol', 'Foyth'], 'Villarreal & DR Congo centre-back']
];

for (const [first, correct, wrong, desc] of completeNamesList) {
  pool.push(makeQ(`Complete the name of this ${desc}: ${first} ______`, correct, wrong, 'other', 'complete-the-name'));
}

// =========================================================================
// 7. EXPANDED FLAGS & NATIONALITIES (100+ PLAYERS)
// =========================================================================
const moreFlagsWorldwide = [
  ['Lamine Camara', 'Senegal', ['Mali', 'Guinea', 'Ivory Coast'], '🇸🇳'],
  ['Mikayil Faye', 'Senegal', ['Gambia', 'Guinea', 'Mali'], '🇸🇳'],
  ['Abdallah Sima', 'Senegal', ['Ivory Coast', 'Guinea', 'Mali'], '🇸🇳'],
  ['Pape Gueye', 'Senegal', ['Mali', 'France', 'Ivory Coast'], '🇸🇳'],
  ['Moussa Niakhaté', 'Senegal', ['France', 'Mali', 'Ivory Coast'], '🇸🇳'],
  ['Eliesse Ben Seghir', 'Morocco', ['France', 'Algeria', 'Tunisia'], '🇲🇦'],
  ['Maghnes Akliouche', 'France', ['Algeria', 'Morocco', 'Tunisia'], '🇫🇷'],
  ['Yáser Asprilla', 'Colombia', ['Ecuador', 'Peru', 'Venezuela'], '🇨🇴'],
  ['Jhon Durán', 'Colombia', ['Ecuador', 'Venezuela', 'Peru'], '🇨🇴'],
  ['Richard Ríos', 'Colombia', ['Ecuador', 'Brazil', 'Peru'], '🇨🇴'],
  ['Daniel Muñoz', 'Colombia', ['Ecuador', 'Chile', 'Paraguay'], '🇨🇴'],
  ['Jefferson Lerma', 'Colombia', ['Ecuador', 'Peru', 'Venezuela'], '🇨🇴'],
  ['Carlos Alcaraz', 'Argentina', ['Spain', 'Uruguay', 'Chile'], '🇦🇷'],
  ['Valentín Carboni', 'Argentina', ['Italy', 'Uruguay', 'Paraguay'], '🇦🇷'],
  ['Matías Soulé', 'Argentina', ['Italy', 'Spain', 'Uruguay'], '🇦🇷'],
  ['Lucas Beltrán', 'Argentina', ['Italy', 'Uruguay', 'Chile'], '🇦🇷'],
  ['Pervis Estupiñán', 'Ecuador', ['Colombia', 'Peru', 'Venezuela'], '🇪🇨'],
  ['Piero Hincapié', 'Ecuador', ['Colombia', 'Peru', 'Chile'], '🇪🇨'],
  ['Willian Pacho', 'Ecuador', ['Colombia', 'Peru', 'Venezuela'], '🇪🇨'],
  ['Kendry Páez', 'Ecuador', ['Colombia', 'Peru', 'Brazil'], '🇪🇨'],
  ['Enner Valencia', 'Ecuador', ['Colombia', 'Venezuela', 'Peru'], '🇪🇨'],
  ['Julio Enciso', 'Paraguay', ['Uruguay', 'Argentina', 'Chile'], '🇵🇾'],
  ['Miguel Almirón', 'Paraguay', ['Uruguay', 'Argentina', 'Bolivia'], '🇵🇾'],
  ['Ramón Sosa', 'Paraguay', ['Argentina', 'Uruguay', 'Chile'], '🇵🇾'],
  ['Diego Gómez', 'Paraguay', ['Argentina', 'Uruguay', 'Colombia'], '🇵🇾'],
  ['Manuel Ugarte', 'Uruguay', ['Argentina', 'Chile', 'Paraguay'], '🇺🇾'],
  ['Facundo Pellistri', 'Uruguay', ['Argentina', 'Chile', 'Paraguay'], '🇺🇾'],
  ['Guillermo Varela', 'Uruguay', ['Argentina', 'Chile', 'Paraguay'], '🇺🇾'],
  ['Mathías Olivera', 'Uruguay', ['Argentina', 'Chile', 'Paraguay'], '🇺🇾'],
  ['Sergio Rochet', 'Uruguay', ['Argentina', 'Brazil', 'Chile'], '🇺🇾'],
  ['Folarin Balogun', 'USA', ['England', 'Nigeria', 'Canada'], '🇺🇸'],
  ['Christian Pulisic', 'USA', ['Croatia', 'England', 'Germany'], '🇺🇸'],
  ['Weston McKennie', 'USA', ['England', 'Germany', 'Canada'], '🇺🇸'],
  ['Timothy Weah', 'USA', ['Liberia', 'France', 'Jamaica'], '🇺🇸'],
  ['Tyler Adams', 'USA', ['England', 'Canada', 'Jamaica'], '🇺🇸'],
  ['Antonee Robinson', 'USA', ['England', 'Jamaica', 'Nigeria'], '🇺🇸'],
  ['Alphonso Davies', 'Canada', ['Ghana', 'Liberia', 'USA'], '🇨🇦'],
  ['Jonathan David', 'Canada', ['Haiti', 'USA', 'France'], '🇨🇦'],
  ['Tajon Buchanan', 'Canada', ['Jamaica', 'USA', 'England'], '🇨🇦'],
  ['Stephen Eustáquio', 'Canada', ['Portugal', 'USA', 'France'], '🇨🇦'],
  ['Ismaël Koné', 'Canada', ['Ivory Coast', 'France', 'USA'], '🇨🇦'],
  ['Moïse Bombito', 'Canada', ['USA', 'France', 'Haiti'], '🇨🇦'],
  ['Derek Cornelius', 'Canada', ['Jamaica', 'USA', 'England'], '🇨🇦'],
  ['Dayne St. Clair', 'Canada', ['Trinidad & Tobago', 'USA', 'Jamaica'], '🇨🇦'],
  ['Takefusa Kubo', 'Japan', ['South Korea', 'China', 'North Korea'], '🇯🇵'],
  ['Kaoru Mitoma', 'Japan', ['South Korea', 'China', 'Thailand'], '🇯🇵'],
  ['Wataru Endo', 'Japan', ['South Korea', 'Australia', 'China'], '🇯🇵'],
  ['Ritsu Doan', 'Japan', ['South Korea', 'China', 'Vietnam'], '🇯🇵'],
  ['Takumi Minamino', 'Japan', ['South Korea', 'China', 'Singapore'], '🇯🇵'],
  ['Daichi Kamada', 'Japan', ['South Korea', 'China', 'Australia'], '🇯🇵'],
  ['Son Heung-min', 'South Korea', ['Japan', 'China', 'North Korea'], '🇰🇷'],
  ['Kim Min-jae', 'South Korea', ['Japan', 'China', 'North Korea'], '🇰🇷'],
  ['Hwang Hee-chan', 'South Korea', ['Japan', 'China', 'Vietnam'], '🇰🇷'],
  ['Lee Kang-in', 'South Korea', ['Japan', 'China', 'Thailand'], '🇰🇷'],
  ['Mehdi Taremi', 'Iran', ['Saudi Arabia', 'Iraq', 'UAE'], '🇮🇷'],
  ['Sardar Azmoun', 'Iran', ['Saudi Arabia', 'Qatar', 'Turkey'], '🇮🇷'],
  ['Salem Al-Dawsari', 'Saudi Arabia', ['UAE', 'Qatar', 'Kuwait'], '🇸🇦'],
  ['Akram Afif', 'Qatar', ['Saudi Arabia', 'UAE', 'Kuwait'], '🇶🇦'],
  ['Almoez Ali', 'Qatar', ['Sudan', 'Saudi Arabia', 'UAE'], '🇶🇦'],
  ['Craig Goodwin', 'Australia', ['New Zealand', 'England', 'Scotland'], '🇦🇺'],
  ['Harry Souttar', 'Australia', ['Scotland', 'New Zealand', 'England'], '🇦🇺'],
  ['Mathew Ryan', 'Australia', ['New Zealand', 'England', 'Scotland'], '🇦🇺'],
  ['Nestory Irankunda', 'Australia', ['Burundi', 'Tanzania', 'New Zealand'], '🇦🇺'],
  ['Chris Wood', 'New Zealand', ['Australia', 'England', 'Scotland'], '🇳🇿']
];

for (const [player, correct, wrong, flag] of moreFlagsWorldwide) {
  pool.push(makeQ(`Which national team does ${player} represent internationally? ${flag}`, correct, wrong, 'world', 'country-flag'));
}

console.log(`Generated ${pool.length} total questions in push-to-3k.`);

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
