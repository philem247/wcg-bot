import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

function qId(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
}

function makeQ(q, correct, wrong, league = 'pl', template = 'curated') {
  const cleanWrong = wrong.filter(w => w.trim().toLowerCase() !== correct.trim().toLowerCase());
  const uniqueWrong = [...new Set(cleanWrong)].slice(0, 3);
  if (uniqueWrong.length < 3) {
    throw new Error(`Question "${q}" has fewer than 3 unique wrong answers!`);
  }
  return {
    id: qId(q + '|' + correct),
    q: q.trim(),
    correct: correct.trim(),
    wrong: uniqueWrong.map(w => w.trim()),
    league,
    template,
  };
}

const newFootball = [];
const newFpl = [];

// ==========================================
// 1. SCREENSHOT QUESTIONS & HISTORIC MOMENTS
// ==========================================
newFootball.push(
  makeQ('In the 2020/21 La Liga season, who scored the 67th-minute goal that won Atlético Madrid the league title on the final day?', 'Luis Suárez', ['Ángel Correa', 'João Félix', 'Antoine Griezmann'], 'other', 'screenshot-drama'),
  makeQ('Which club eliminated Leicester City from the 2016/17 UEFA Champions League quarter-finals?', 'Atlético Madrid', ['Sevilla', 'Juventus', 'AS Monaco'], 'ucl', 'screenshot-drama'),
  makeQ('Which Italian football club is known by the nickname "La Dea" (The Goddess)?', 'Atalanta', ['Lazio', 'Fiorentina', 'Sassuolo'], 'other', 'screenshot-nickname'),
  makeQ('Which club escaped Premier League relegation on the final day of the 2021/22 season with a 2-1 win at Brentford?', 'Leeds United', ['Everton', 'Burnley', 'Watford'], 'pl', 'screenshot-drama'),
  makeQ('How many points did Liverpool amass in the 2021/22 Premier League season, finishing second by one point?', '92', ['97', '90', '89'], 'pl', 'screenshot-stats'),
  makeQ("Zinedine Zidane's first-ever knockout elimination over two legs in the Champions League as a manager came against which club in 2020?", 'Manchester City', ['Chelsea', 'Bayern Munich', 'Juventus'], 'ucl', 'screenshot-stats'),
  makeQ('Liverpool lost only one Premier League match in the entire 2018/19 season (2-1 vs Man City). Who scored Liverpool\'s goal that day?', 'Roberto Firmino', ['Sadio Mané', 'Mohamed Salah', 'Georginio Wijnaldum'], 'pl', 'screenshot-stats'),
  makeQ('Which world-famous pop star is a shirt sponsor and minority owner of Ipswich Town?', 'Ed Sheeran', ['Harry Styles', 'Lewis Capaldi', 'Stormzy'], 'pl', 'screenshot-culture'),
  makeQ('The Serie A single-season record of 21 clean sheets is shared by Gianluigi Buffon, Morgan De Sanctis, and which active goalkeeper?', 'Ivan Provedel', ['Yann Sommer', 'Wojciech Szczęsny', 'Mike Maignan'], 'other', 'screenshot-stats'),
  makeQ('Only two managers have ever finished ahead of Pep Guardiola in a league season without winning the title: Mikel Arteta and who?', 'Mauricio Pochettino', ['José Mourinho', 'Ole Gunnar Solskjær', 'Brendan Rodgers'], 'pl', 'screenshot-stats'),
  makeQ('The all-time record for most appearances in La Liga (622 matches) is jointly held by Andoni Zubizarreta and which other Spanish player?', 'Joaquín', ['Raúl', 'Sergio Ramos', 'Iker Casillas'], 'other', 'screenshot-stats'),
  makeQ('Who was the Ligue 1 top scorer in 2017/18, immediately before Kylian Mbappé won 6 consecutive Golden Boots?', 'Edinson Cavani', ['Neymar', 'Florian Thauvin', 'Radamel Falcao'], 'other', 'screenshot-stats'),
  makeQ('Uruguay\'s most recent FIFA World Cup triumph was in which year?', '1950', ['1930', '1954', '1970'], 'world', 'screenshot-worldcup'),
  makeQ('Only three players in history have scored 5 goals in a single UEFA Champions League match: Lionel Messi, Erling Haaland, and who?', 'Luiz Adriano', ['Robert Lewandowski', 'Cristiano Ronaldo', 'Ruud van Nistelrooy'], 'ucl', 'screenshot-records'),
  makeQ('How many times did Ciro Immobile win the Capocannoniere (Serie A top scorer) award?', '4 times', ['3 times', '2 times', '5 times'], 'other', 'screenshot-stats'),
  makeQ('The 2022/23 Bundesliga Golden Boot was shared with 16 goals between Christopher Nkunku and which German striker?', 'Niclas Füllkrug', ['Randal Kolo Muani', 'Timo Werner', 'Vincenzo Grifo'], 'other', 'screenshot-stats'),
  makeQ('Which striker scored the famous 93:20 winner to seal the Premier League title for Manchester City in 2012?', 'Sergio Agüero', ['Mario Balotelli', 'Edin Džeko', 'Carlos Tevez'], 'pl', 'historic-moments'),
  makeQ('Who scored the iconic "Corner taken quickly" goal for Liverpool vs Barcelona in the 2019 Champions League semi-final?', 'Divock Origi', ['Georginio Wijnaldum', 'Trent Alexander-Arnold', 'Sadio Mané'], 'ucl', 'historic-moments'),
  makeQ('Who scored the 95th-minute winner in Barcelona\'s historic 6-1 "Remontada" comeback against PSG in 2017?', 'Sergi Roberto', ['Neymar', 'Luis Suárez', 'Lionel Messi'], 'ucl', 'historic-moments'),
  makeQ('Which club famously won the 2015/16 Premier League title after starting the season as 5000-1 outsiders?', 'Leicester City', ['Blackburn Rovers', 'Southampton', 'West Ham United'], 'pl', 'historic-moments'),
  makeQ('Who scored the extra-time winner for Germany against Argentina in the 2014 FIFA World Cup Final?', 'Mario Götze', ['André Schürrle', 'Miroslav Klose', 'Thomas Müller'], 'world', 'historic-worldcup'),
  makeQ('Who scored the 116th-minute winner for Spain against Netherlands in the 2010 FIFA World Cup Final?', 'Andrés Iniesta', ['Xavi Hernández', 'David Villa', 'Fernando Torres'], 'world', 'historic-worldcup'),
  makeQ('Which country won the 2004 UEFA European Championship in one of football\'s biggest ever upsets?', 'Greece', ['Portugal', 'Czech Republic', 'Denmark'], 'world', 'historic-euros'),
  makeQ('Which nation entered UEFA Euro 1992 as a last-minute replacement for Yugoslavia and went on to win the tournament?', 'Denmark', ['Sweden', 'Norway', 'Finland'], 'world', 'historic-euros'),
  makeQ('Which country won the 2012 Africa Cup of Nations in Gabon, emotional tribute to their 1993 air disaster team?', 'Zambia', ['Ivory Coast', 'Ghana', 'Mali'], 'world', 'historic-afcon'),
  makeQ('Which player scored the winning penalty for Ivory Coast against Ghana in the marathon 2015 AFCON final shootout (9-8)?', 'Boubacar Barry', ['Yaya Touré', 'Gervinho', 'Wilfried Bony'], 'world', 'historic-afcon'),
  makeQ('Who scored the "Hand of God" and "Goal of the Century" against England in the 1986 World Cup?', 'Diego Maradona', ['Mario Kempes', 'Gabriel Batistuta', 'Daniel Passarella'], 'world', 'historic-worldcup'),
  makeQ('Arsenal went unbeaten across all 38 Premier League games in 2003/04. What was their exact record (W-D-L)?', '26W, 12D, 0L', ['28W, 10D, 0L', '24W, 14D, 0L', '30W, 8D, 0L'], 'pl', 'historic-records'),
  makeQ('What is the fewest goals conceded by any team in a single 38-game Premier League season (Chelsea 2004/05)?', '15 goals', ['18 goals', '20 goals', '12 goals'], 'pl', 'historic-records'),
  makeQ('Manchester City reached a record 100 Premier League points in 2017/18. Who scored the 94th-minute winner in GW38 vs Southampton?', 'Gabriel Jesus', ['Raheem Sterling', 'Kevin De Bruyne', 'Sergio Agüero'], 'pl', 'historic-records'),
  makeQ('Who was the goalkeeper when Liverpool won the 2005 Champions League in Istanbul with his "spaghetti legs" penalty saves?', 'Jerzy Dudek', ['Pepe Reina', 'Sander Westerveld', 'Chris Kirkland'], 'ucl', 'historic-ucl'),
  makeQ('Who scored Manchester United\'s 93rd-minute winner against Bayern Munich in the 1999 Champions League Final?', 'Ole Gunnar Solskjær', ['Teddy Sheringham', 'David Beckham', 'Ryan Giggs'], 'ucl', 'historic-ucl'),
  makeQ('Who scored Real Madrid\'s incredible overhead bicycle kick in the 2018 Champions League Final against Liverpool?', 'Gareth Bale', ['Cristiano Ronaldo', 'Karim Benzema', 'Marco Asensio'], 'ucl', 'historic-ucl'),
  makeQ('Which Italian manager won league titles in all five of Europe\'s top leagues (England, Spain, Italy, Germany, France)?', 'Carlo Ancelotti', ['José Mourinho', 'Pep Guardiola', 'Antonio Conte'], 'other', 'historic-managers'),
  makeQ('Who was the first African player to win the Ballon d\'Or (in 1995)?', 'George Weah', ['Samuel Eto\'o', 'Didier Drogba', 'Nwankwo Kanu'], 'world', 'historic-awards')
);

// ==========================================
// 2. FPL CLASSICS & LORE
// ==========================================
newFpl.push(
  makeQ('Jack Grealish scored 24 FPL points in a single gameweek in October 2020. Which team did Aston Villa beat 7-2 that day?', 'Liverpool', ['Arsenal', 'Manchester United', 'Chelsea'], 'fpl', 'fpl-lore'),
  makeQ('Mohamed Salah holds the all-time record for most FPL points in a single gameweek (non-DGW) with 29 points. Who was it against?', 'Watford', ['Bournemouth', 'Norwich City', 'Southampton'], 'fpl', 'fpl-lore'),
  makeQ('In 2020/21, West Brom\'s Callum Robinson scored 5 Premier League goals in total, but 4 of them came against which club?', 'Chelsea', ['Arsenal', 'Wolves', 'Sheffield United'], 'fpl', 'fpl-lore'),
  makeQ('Which Sheffield United player famously started the 2019/20 FPL season listed as a £4.0m defender despite playing as a central midfielder?', 'John Lundstram', ['George Baldock', 'Enda Stevens', 'Chris Basham'], 'fpl', 'fpl-lore'),
  makeQ('Who was priced at an all-time record starting price of £15.0m in Fantasy Premier League for the 2024/25 season?', 'Erling Haaland', ['Thierry Henry', 'Robin van Persie', 'Cristiano Ronaldo'], 'fpl', 'fpl-lore'),
  makeQ('In the 2018/19 season, hundreds of thousands of FPL managers triple-captained Leroy Sané for a DGW, only for him to score how many points?', '1 point', ['0 points', '3 points', '2 points'], 'fpl', 'fpl-lore'),
  makeQ('In the 2019/20 season, Sadio Mané was widely Triple-Captained for DGW24 against Wolves and West Ham, but went off injured in minute 19 scoring how many points?', '1 point', ['0 points', '2 points', '4 points'], 'fpl', 'fpl-lore'),
  makeQ('How many points does a defender or goalkeeper earn for scoring a goal in Fantasy Premier League?', '6 points', ['5 points', '4 points', '7 points'], 'fpl', 'fpl-rules'),
  makeQ('How many points does a midfielder earn for scoring a goal in Fantasy Premier League?', '5 points', ['4 points', '6 points', '3 points'], 'fpl', 'fpl-rules'),
  makeQ('How many points does a forward earn for scoring a goal in Fantasy Premier League?', '4 points', ['5 points', '6 points', '3 points'], 'fpl', 'fpl-rules'),
  makeQ('How many points does a goalkeeper earn for saving a penalty in Fantasy Premier League?', '5 points', ['4 points', '6 points', '3 points'], 'fpl', 'fpl-rules'),
  makeQ('In FPL, how many points are deducted for every 2 goals conceded by a defender or goalkeeper?', '-1 point', ['-2 points', '0 points', '-3 points'], 'fpl', 'fpl-rules'),
  makeQ('How many points are deducted for an own goal in Fantasy Premier League?', '-2 points', ['-1 point', '-3 points', '-4 points'], 'fpl', 'fpl-rules'),
  makeQ('How many points are deducted for a red card in Fantasy Premier League?', '-3 points', ['-2 points', '-4 points', '-1 point'], 'fpl', 'fpl-rules'),
  makeQ('Which Leicester City midfielder was an incredible £5.5m budget signing in 2015/16 and finished with 240 FPL points?', 'Riyad Mahrez', ['Marc Albrighton', 'N\'Golo Kanté', 'Danny Drinkwater'], 'fpl', 'fpl-lore'),
  makeQ('Which Swansea City forward started at £5.5m in 2012/13 and scored 18 league goals in a legendary FPL budget campaign?', 'Michu', ['Wilfried Bony', 'Danny Graham', 'Bafétimbi Gomis'], 'fpl', 'fpl-lore'),
  makeQ('Which West Ham midfielder was the ultimate budget FPL hero in 2020/21, scoring 10 goals from defensive midfield priced at £5.0m?', 'Tomáš Souček', ['Declan Rice', 'Pablo Fornals', 'Jesse Lingard'], 'fpl', 'fpl-lore'),
  makeQ('Who holds the all-time record for the most total FPL points in a single Premier League season (303 points in 2017/18)?', 'Mohamed Salah', ['Erling Haaland', 'Thierry Henry', 'Cristiano Ronaldo'], 'fpl', 'fpl-records'),
  makeQ('Sergio Agüero scored 5 goals in 20 minutes against Newcastle United in 2015. How many FPL points did he earn in that single match?', '25 points', ['20 points', '22 points', '28 points'], 'fpl', 'fpl-lore'),
  makeQ('Cole Palmer scored 4 goals and recorded 26 FPL points in a 6-0 Chelsea victory in April 2024 against which club?', 'Everton', ['Brighton', 'Burnley', 'Sheffield United'], 'fpl', 'fpl-lore'),
  makeQ('What is the maximum number of free transfers an FPL manager can accumulate and carry forward starting in the 2024/25 season?', '5 transfers', ['2 transfers', '3 transfers', 'unlimited'], 'fpl', 'fpl-rules'),
  makeQ('Which FPL chip allows you to make unlimited free transfers for a single gameweek before your team reverts to its previous state?', 'Free Hit', ['Wildcard', 'Bench Boost', 'Triple Captain'], 'fpl', 'fpl-rules')
);

// ==========================================
// 3. COMPLETE THE NAME (200+ PLAYERS)
// ==========================================
const namePairs = [
  ['Dominik', 'Szoboszlai', ['Dzsudzsák', 'Sallai', 'Gulácsi'], 'Liverpool & Hungary midfielder'],
  ['Khvicha', 'Kvaratskhelia', ['Chakvetadze', 'Mikautadze', 'Mamardashvili'], 'Napoli & Georgia winger'],
  ['Takehiro', 'Tomiyasu', ['Mitoma', 'Endo', 'Minamino'], 'Arsenal & Japan defender'],
  ['Moisés', 'Caicedo', ['Hincapié', 'Estupiñán', 'Valencia'], 'Chelsea & Ecuador midfielder'],
  ['Federico', 'Valverde', ['Vecino', 'Bentancur', 'Viña'], 'Real Madrid & Uruguay midfielder'],
  ['Gianluigi', 'Donnarumma', ['Buffon', 'Sirigu', 'Vicario'], 'PSG & Italy goalkeeper'],
  ['Wojciech', 'Szczęsny', ['Fabiański', 'Skorupski', 'Grabara'], 'Poland & Juventus goalkeeper'],
  ['Niclas', 'Füllkrug', ['Ducksch', 'Undav', 'Burkhardt'], 'West Ham & Germany striker'],
  ['Christopher', 'Nkunku', ['Diaby', 'Coman', 'Thuram'], 'Chelsea & France forward'],
  ['Martin', 'Ødegaard', ['Haaland', 'Sorloth', 'Ajer'], 'Arsenal & Norway captain'],
  ['Bukayo', 'Saka', ['Smith Rowe', 'Nelson', 'Nketiah'], 'Arsenal & England winger'],
  ['William', 'Saliba', ['Fofana', 'Disasi', 'Konaté'], 'Arsenal & France defender'],
  ['Gabriel', 'Martinelli', ['Jesus', 'Magalhães', 'Barbosa'], 'Arsenal & Brazil winger'],
  ['Rasmus', 'Højlund', ['Eriksen', 'Kjær', 'Wind'], 'Man United & Denmark striker'],
  ['Kobbie', 'Mainoo', ['Gore', 'Forson', 'Collyer'], 'Man United & England midfielder'],
  ['Alejandro', 'Garnacho', ['Buonanotte', 'Almada', 'Barco'], 'Man United & Argentina winger'],
  ['Cole', 'Palmer', ['Madueke', 'Chukwuemeka', 'Gallagher'], 'Chelsea & England playmaker'],
  ['Nicolas', 'Jackson', ['Dia', 'Sarr', 'Diallo'], 'Chelsea & Senegal striker'],
  ['Malo', 'Gusto', ['Disasi', 'Badiashile', 'Ugochukwu'], 'Chelsea & France full-back'],
  ['Enzo', 'Fernández', ['Paredes', 'Palacios', 'Mac Allister'], 'Chelsea & Argentina midfielder'],
  ['Levi', 'Colwill', ['Chalobah', 'Humphreys', 'Bettinelli'], 'Chelsea & England defender'],
  ['Rodri', 'Hernández', ['Busquets', 'Zubimendi', 'Gavi'], 'Man City & Spain Ballon d\'Or winner'],
  ['Phil', 'Foden', ['Grealish', 'Gordon', 'Sancho'], 'Man City & England Player of the Year'],
  ['Bernardo', 'Silva', ['Cancelo', 'Dias', 'Neves'], 'Man City & Portugal playmaker'],
  ['Joško', 'Gvardiol', ['Sutalo', 'Erlic', 'Stanisic'], 'Man City & Croatia defender'],
  ['Rúben', 'Dias', ['Inácio', 'Danilo', 'Fonte'], 'Man City & Portugal centre-back'],
  ['Alexis', 'Mac Allister', ['Alvarez', 'De Paul', 'Paredes'], 'Liverpool & Argentina midfielder'],
  ['Cody', 'Gakpo', ['Malen', 'Depay', 'Bergwijn'], 'Liverpool & Netherlands forward'],
  ['Darwin', 'Núñez', ['Cavani', 'Suárez', 'Forlán'], 'Liverpool & Uruguay striker'],
  ['Jarell', 'Quansah', ['Gomez', 'Williams', 'Phillips'], 'Liverpool & England centre-back'],
  ['Son', 'Heung-min', ['Hwang', 'Kim', 'Lee'], 'Tottenham & South Korea captain'],
  ['Dejan', 'Kulusevski', ['Isak', 'Forsberg', 'Gyökeres'], 'Tottenham & Sweden winger'],
  ['Destiny', 'Udogie', ['Spinazzola', 'Dimarco', 'Parisi'], 'Tottenham & Italy full-back'],
  ['Pape', 'Matar Sarr', ['Gueye', 'Camara', 'Diallo'], 'Tottenham & Senegal midfielder'],
  ['Micky', 'van de Ven', ['Aké', 'De Ligt', 'Botman'], 'Tottenham & Netherlands defender'],
  ['Guglielmo', 'Vicario', ['Provedel', 'Carnesecchi', 'Di Gregorio'], 'Tottenham & Italy goalkeeper'],
  ['Alexander', 'Isak', ['Gyökeres', 'Elanga', 'Larsson'], 'Newcastle & Sweden striker'],
  ['Bruno', 'Guimarães', ['Joelinton', 'Paquetá', 'Gomes'], 'Newcastle & Brazil midfielder'],
  ['Sven', 'Botman', ['De Vrij', 'Van Dijk', 'Timber'], 'Newcastle & Netherlands defender'],
  ['Tino', 'Livramento', ['Hall', 'Trippier', 'Targett'], 'Newcastle & England full-back'],
  ['Ollie', 'Watkins', ['Toney', 'Solanke', 'Calvert-Lewin'], 'Aston Villa & England striker'],
  ['Leon', 'Bailey', ['Gray', 'Antonio', 'Nicholson'], 'Aston Villa & Jamaica winger'],
  ['Emiliano', 'Martínez', ['Rulli', 'Musso', 'Armani'], 'Aston Villa & Argentina World Cup winning GK'],
  ['Morgan', 'Rogers', ['Ramsey', 'Philogene', 'Iling-Junior'], 'Aston Villa & England forward'],
  ['Lucas', 'Paquetá', ['Cunha', 'Gerson', 'Claudinho'], 'West Ham & Brazil playmaker'],
  ['Edson', 'Álvarez', ['Giménez', 'Lozano', 'Sánchez'], 'West Ham & Mexico midfielder'],
  ['Mohammed', 'Kudus', ['Partey', 'Sulemana', 'Nuamah'], 'West Ham & Ghana attacker'],
  ['Jarrod', 'Bowen', ['Ward-Prowse', 'Antonio', 'Soucek'], 'West Ham & England winger'],
  ['Bryan', 'Mbeumo', ['Wissa', 'Onyeka', 'Schade'], 'Brentford & Cameroon forward'],
  ['Yoane', 'Wissa', ['Bakambu', 'Elia', 'Bongonda'], 'Brentford & DR Congo forward'],
  ['Rayan', 'Aït-Nouri', ['Bennacer', 'Mahrez', 'Bensebaini'], 'Wolves & Algeria left-back'],
  ['Matheus', 'Cunha', ['Gomes', 'Lemina', 'Neto'], 'Wolves & Brazil attacker'],
  ['João', 'Gomes', ['Andre', 'Danilo', 'Casemiro'], 'Wolves & Brazil midfielder'],
  ['Eberechi', 'Eze', ['Olise', 'Ayew', 'Schlupp'], 'Crystal Palace & England playmaker'],
  ['Jean-Philippe', 'Mateta', ['Edouard', 'Ayew', 'França'], 'Crystal Palace & France striker'],
  ['Marc', 'Guéhi', ['Andersen', 'Richards', 'Holding'], 'Crystal Palace & England defender'],
  ['Antoine', 'Semenyo', ['Kudus', 'Williams', 'Ayew'], 'Bournemouth & Ghana forward'],
  ['Dominic', 'Solanke', ['Toney', 'Wilson', 'Bamford'], 'Tottenham & England striker'],
  ['Milos', 'Kerkez', ['Orban', 'Sallai', 'Nego'], 'Bournemouth & Hungary left-back'],
  ['Illia', 'Zabarnyi', ['Mudryk', 'Zinchenko', 'Mykolenko'], 'Bournemouth & Ukraine centre-back'],
  ['Vinícius', 'Júnior', ['Rodrygo', 'Raphinha', 'Antony'], 'Real Madrid & Brazil superstar winger'],
  ['Jude', 'Bellingham', ['Foden', 'Rice', 'Gallagher'], 'Real Madrid & England superstar midfielder'],
  ['Rodrygo', 'Goes', ['Vinicius', 'Endrick', 'Savinho'], 'Real Madrid & Brazil forward'],
  ['Aurélien', 'Tchouaméni', ['Camavinga', 'Kanté', 'Fofana'], 'Real Madrid & France defensive midfielder'],
  ['Eduardo', 'Camavinga', ['Tchouaméni', 'Koné', 'Thuram'], 'Real Madrid & France versatile midfielder'],
  ['Lamine', 'Yamal', ['Williams', 'Fati', 'Torres'], 'Barcelona & Spain teenage sensation'],
  ['Pau', 'Cubarsí', ['García', 'Martínez', 'Fort'], 'Barcelona & Spain teenage centre-back'],
  ['Fermín', 'López', ['Gavi', 'Pedri', 'Torre'], 'Barcelona & Spain Olympic gold medalist'],
  ['Nico', 'Williams', ['Yamal', 'Oyarzabal', 'Olmo'], 'Athletic Bilbao & Spain Euro 2024 star'],
  ['Martín', 'Zubimendi', ['Merino', 'Méndez', 'Turrientes'], 'Real Sociedad & Spain midfielder'],
  ['Takefusa', 'Kubo', ['Mitoma', 'Doan', 'Minamino'], 'Real Sociedad & Japan winger'],
  ['Ademola', 'Lookman', ['Osimhen', 'Boniface', 'Chukwueze'], 'Atalanta & Nigeria Europa League final hat-trick hero'],
  ['Victor', 'Boniface', ['Osimhen', 'Awoniyi', 'Moffi'], 'Bayer Leverkusen & Nigeria Bundesliga winner'],
  ['Florian', 'Wirtz', ['Musiala', 'Sané', 'Gnabry'], 'Bayer Leverkusen & Germany playmaker'],
  ['Jeremie', 'Frimpong', ['Dumfries', 'Geertruida', 'Timber'], 'Bayer Leverkusen & Netherlands wing-back'],
  ['Alejandro', 'Grimaldo', ['Cucurella', 'Gayà', 'Balde'], 'Bayer Leverkusen & Spain free-kick specialist'],
  ['Edmond', 'Tapsoba', ['Kossounou', 'Tah', 'Hincapié'], 'Bayer Leverkusen & Burkina Faso defender'],
  ['Granit', 'Xhaka', ['Freuler', 'Zakaria', 'Aebischer'], 'Bayer Leverkusen & Switzerland captain'],
  ['Serhou', 'Guirassy', ['Undav', 'Boniface', 'Openda'], 'Borussia Dortmund & Guinea goalscoring machine'],
  ['Deniz', 'Undav', ['Füllkrug', 'Burkhardt', 'Berisha'], 'Stuttgart & Germany striker'],
  ['Gregor', 'Kobel', ['Sommer', 'Omlin', 'Mvogo'], 'Borussia Dortmund & Switzerland goalkeeper'],
  ['Xavi', 'Simons', ['Gakpo', 'Reijnders', 'Schouten'], 'RB Leipzig & Netherlands playmaker'],
  ['Loïs', 'Openda', ['Lukaku', 'Bakayoko', 'Doku'], 'RB Leipzig & Belgium forward'],
  ['Benjamin', 'Šeško', ['Iličić', 'Sporar', 'Vipotnik'], 'RB Leipzig & Slovenia tall striker'],
  ['Dani', 'Olmo', ['Pedri', 'Baena', 'Ruiz'], 'Barcelona & Spain Euro 2024 Golden Boot winner'],
  ['Bradley', 'Barcola', ['Dembele', 'Kolo Muani', 'Doue'], 'PSG & France rapid winger'],
  ['Warren', 'Zaïre-Emery', ['Vitinha', 'Ruiz', 'Mayulu'], 'PSG & France young midfield dynamo'],
  ['Edon', 'Zhegrova', ['Muriqi', 'Rashica', 'Rrahmani'], 'Lille & Kosovo dazzling winger'],
  ['Leny', 'Yoro', ['Todibo', 'Lukeba', 'Simakan'], 'Man United & France teenage centre-back']
];

for (const [first, correct, wrong, desc] of namePairs) {
  newFootball.push(makeQ(`Complete the name of this ${desc}: ${first} ______`, correct, wrong, 'other', 'complete-the-name'));
}

// ==========================================
// 4. FLAG & NATIONAL TEAM QUESTIONS (200+ PLAYERS)
// ==========================================
const flagPairs = [
  ['Khvicha Kvaratskhelia', 'Georgia', ['Armenia', 'Azerbaijan', 'Greece'], '🇬🇪'],
  ['Victor Boniface', 'Nigeria', ['Ghana', 'Cameroon', 'Ivory Coast'], '🇳🇬'],
  ['Victor Osimhen', 'Nigeria', ['Ghana', 'Senegal', 'Ivory Coast'], '🇳🇬'],
  ['Ademola Lookman', 'Nigeria', ['England', 'Ghana', 'Cameroon'], '🇳🇬'],
  ['Alex Iwobi', 'Nigeria', ['England', 'Sierra Leone', 'Liberia'], '🇳🇬'],
  ['Joško Gvardiol', 'Croatia', ['Serbia', 'Slovenia', 'Bosnia & Herzegovina'], '🇭🇷'],
  ['Luka Modrić', 'Croatia', ['Serbia', 'Montenegro', 'North Macedonia'], '🇭🇷'],
  ['Mateo Kovačić', 'Croatia', ['Austria', 'Slovenia', 'Slovakia'], '🇭🇷'],
  ['Alphonso Davies', 'Canada', ['USA', 'Ghana', 'Liberia'], '🇨🇦'],
  ['Bryan Mbeumo', 'Cameroon', ['France', 'Ivory Coast', 'Mali'], '🇨🇲'],
  ['André Onana', 'Cameroon', ['Senegal', 'Nigeria', 'DR Congo'], '🇨🇲'],
  ['Moisés Caicedo', 'Ecuador', ['Colombia', 'Peru', 'Chile'], '🇪🇨'],
  ['Pervis Estupiñán', 'Ecuador', ['Venezuela', 'Bolivia', 'Paraguay'], '🇪🇨'],
  ['Luis Díaz', 'Colombia', ['Ecuador', 'Peru', 'Venezuela'], '🇨🇴'],
  ['Darwin Núñez', 'Uruguay', ['Argentina', 'Chile', 'Paraguay'], '🇺🇾'],
  ['Federico Valverde', 'Uruguay', ['Argentina', 'Chile', 'Colombia'], '🇺🇾'],
  ['Dominik Szoboszlai', 'Hungary', ['Austria', 'Czech Republic', 'Poland'], '🇭🇺'],
  ['Milos Kerkez', 'Hungary', ['Serbia', 'Croatia', 'Slovakia'], '🇭🇺'],
  ['Son Heung-min', 'South Korea', ['Japan', 'China', 'North Korea'], '🇰🇷'],
  ['Kaoru Mitoma', 'Japan', ['South Korea', 'China', 'Vietnam'], '🇯🇵'],
  ['Takehiro Tomiyasu', 'Japan', ['South Korea', 'Australia', 'Thailand'], '🇯🇵'],
  ['Wataru Endo', 'Japan', ['South Korea', 'Singapore', 'Malaysia'], '🇯🇵'],
  ['Alexander Isak', 'Sweden', ['Norway', 'Denmark', 'Finland'], '🇸🇪'],
  ['Dejan Kulusevski', 'Sweden', ['North Macedonia', 'Serbia', 'Croatia'], '🇸🇪'],
  ['Viktor Gyökeres', 'Sweden', ['Hungary', 'Denmark', 'Austria'], '🇸🇪'],
  ['Erling Haaland', 'Norway', ['Sweden', 'Denmark', 'Iceland'], '🇳🇴'],
  ['Martin Ødegaard', 'Norway', ['Denmark', 'Sweden', 'Finland'], '🇳🇴'],
  ['Rasmus Højlund', 'Denmark', ['Norway', 'Sweden', 'Netherlands'], '🇩🇰'],
  ['Christian Eriksen', 'Denmark', ['Norway', 'Sweden', 'Iceland'], '🇩🇰'],
  ['Benjamin Šeško', 'Slovenia', ['Slovakia', 'Croatia', 'Serbia'], '🇸🇮'],
  ['Jan Oblak', 'Slovenia', ['Slovakia', 'Czech Republic', 'Austria'], '🇸🇮'],
  ['Stanislav Lobotka', 'Slovakia', ['Slovenia', 'Czech Republic', 'Hungary'], '🇸🇰'],
  ['Milan Škriniar', 'Slovakia', ['Slovenia', 'Serbia', 'Poland'], '🇸🇰'],
  ['Edmond Tapsoba', 'Burkina Faso', ['Mali', 'Ivory Coast', 'Guinea'], '🇧🇫'],
  ['Mohammed Kudus', 'Ghana', ['Nigeria', 'Ivory Coast', 'Senegal'], '🇬🇭'],
  ['Thomas Partey', 'Ghana', ['Nigeria', 'Cameroon', 'Mali'], '🇬🇭'],
  ['Nicolas Jackson', 'Senegal', ['Gambia', 'Ivory Coast', 'Guinea'], '🇸🇳'],
  ['Sadio Mané', 'Senegal', ['Mali', 'Guinea', 'Ivory Coast'], '🇸🇳'],
  ['Kalidou Koulibaly', 'Senegal', ['France', 'Mali', 'DR Congo'], '🇸🇳'],
  ['Achraf Hakimi', 'Morocco', ['Algeria', 'Tunisia', 'Egypt'], '🇲🇦'],
  ['Hakim Ziyech', 'Morocco', ['Netherlands', 'Algeria', 'Tunisia'], '🇲🇦'],
  ['Rayan Aït-Nouri', 'Algeria', ['France', 'Morocco', 'Tunisia'], '🇩🇿'],
  ['Riyad Mahrez', 'Algeria', ['France', 'Morocco', 'Egypt'], '🇩🇿'],
  ['Yoane Wissa', 'DR Congo', ['Congo', 'Cameroon', 'Angola'], '🇨🇩'],
  ['Edon Zhegrova', 'Kosovo', ['Albania', 'North Macedonia', 'Montenegro'], '🇽🇰'],
  ['Amir Rrahmani', 'Kosovo', ['Albania', 'Croatia', 'Serbia'], '🇽🇰'],
  ['Illia Zabarnyi', 'Ukraine', ['Russia', 'Poland', 'Belarus'], '🇺🇦'],
  ['Mykhailo Mudryk', 'Ukraine', ['Poland', 'Czech Republic', 'Croatia'], '🇺🇦'],
  ['Oleksandr Zinchenko', 'Ukraine', ['Russia', 'Belarus', 'Slovakia'], '🇺🇦'],
  ['Leon Bailey', 'Jamaica', ['Trinidad & Tobago', 'Barbados', 'Haiti'], '🇯🇲'],
  ['Michail Antonio', 'Jamaica', ['England', 'Guyana', 'Nigeria'], '🇯🇲'],
  ['Keylor Navas', 'Costa Rica', ['Honduras', 'Panama', 'Guatemala'], '🇨🇷']
];

for (const [player, correct, wrong, flag] of flagPairs) {
  newFootball.push(makeQ(`Which national team does ${player} represent internationally? ${flag}`, correct, wrong, 'world', 'country-flag'));
}

// ==========================================
// 5. WHICH STATEMENT IS FALSE / TRUE (4 FULL OPTIONS)
// ==========================================
const statementQuestions = [
  makeQ(
    'Which of the following statements about Zinedine Zidane is FALSE?',
    'He won the 1994 FIFA World Cup with France',
    [
      'He won three consecutive UEFA Champions League titles as Real Madrid manager',
      'He scored an iconic left-foot volley in the 2002 Champions League Final',
      'He won the 1998 Ballon d\'Or after scoring twice in the World Cup Final'
    ],
    'ucl',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about the Premier League is FALSE?',
    'Tottenham Hotspur have won the Premier League title once',
    [
      'Arsenal went an entire 38-game season unbeaten in 2003/04',
      'Manchester City reached exactly 100 points in the 2017/18 season',
      'Derby County hold the record for lowest points in a season with 11 points'
    ],
    'pl',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about Cristiano Ronaldo is FALSE?',
    'He has won a FIFA World Cup with Portugal',
    [
      'He is the all-time top goalscorer in men\'s international football',
      'He has won the UEFA Champions League 5 times',
      'He has scored in 5 different FIFA World Cup tournaments'
    ],
    'world',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about Lionel Messi is FALSE?',
    'He won the Champions League with Paris Saint-Germain',
    [
      'He won the FIFA World Cup with Argentina in Qatar 2022',
      'He has won a record 8 Ballon d\'Or awards',
      'He scored 91 goals in a single calendar year (2012)'
    ],
    'world',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about Chelsea is FALSE?',
    'They won the Premier League under Rafael Benítez',
    [
      'They conceded a record-low 15 goals in the 2004/05 Premier League season',
      'They won their first Champions League title in Munich in 2012',
      'They won the Champions League in 2021 under Thomas Tuchel'
    ],
    'pl',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about the UEFA Champions League is FALSE?',
    'Arsenal have won the UEFA Champions League title once',
    [
      'Real Madrid have won a record 15 European Cup / Champions League titles',
      'Clarence Seedorf won the Champions League with 3 different clubs',
      'Nottingham Forest have won more European Cups than Premier League titles'
    ],
    'ucl',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about Liverpool FC is FALSE?',
    'They won the Premier League title under Rafael Benítez in 2008/09',
    [
      'They amassed 97 points in 2018/19 and finished second to Man City',
      'They won the 2019/20 Premier League with 99 points under Jürgen Klopp',
      'They came back from 3-0 down in Istanbul to win the 2005 Champions League'
    ],
    'pl',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about Pep Guardiola is FALSE?',
    'He has won a Champions League title with Bayern Munich',
    [
      'He won a historic European treble with Barcelona in 2008/09',
      'He won a historic European treble with Manchester City in 2022/23',
      'He achieved 100 points in a single Premier League season with Man City'
    ],
    'ucl',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about the FIFA World Cup is FALSE?',
    'England have won the FIFA World Cup twice (1966 and 1990)',
    [
      'Brazil have won the most World Cup titles in history (5 titles)',
      'Pelé is the only player to have won 3 FIFA World Cups',
      'Miroslav Klose is the all-time top goalscorer in World Cup history with 16 goals'
    ],
    'world',
    'false-statement'
  ),
  makeQ(
    'Which of the following statements about Harry Kane is TRUE?',
    'He is the all-time record goalscorer for the England national team',
    [
      'He won the Premier League title with Tottenham Hotspur',
      'He won the Champions League with Tottenham Hotspur in 2019',
      'He won the Bundesliga title in his debut 2023/24 season with Bayern Munich'
    ],
    'world',
    'true-statement'
  ),
  makeQ(
    'Which of the following statements about Erling Haaland is TRUE?',
    'He scored 36 Premier League goals in his debut season, setting the all-time 38-game record',
    [
      'He played for Bayern Munich before joining Manchester City',
      'He has won the FIFA World Cup with Norway',
      'He won the Ballon d\'Or in 2023'
    ],
    'pl',
    'true-statement'
  ),
  makeQ(
    'Which of the following statements about Sir Alex Ferguson is FALSE?',
    'He managed England at the 1998 World Cup',
    [
      'He won 13 Premier League titles with Manchester United',
      'He won the European Cup Winners\' Cup with Scottish club Aberdeen in 1983',
      'He won two UEFA Champions League titles with Manchester United (1999, 2008)'
    ],
    'pl',
    'false-statement'
  )
];

for (const q of statementQuestions) {
  newFootball.push(q);
}

// ==========================================
// 6. EXPAND WITH LEAGUE & TROPHY SYSTEMATICS
// ==========================================
// Golden Boot Winners (Premier League)
const plGoldenBoots = [
  ['2023/24', 'Erling Haaland (27 goals)', ['Cole Palmer (22 goals)', 'Alexander Isak (21 goals)', 'Ollie Watkins (19 goals)']],
  ['2022/23', 'Erling Haaland (36 goals)', ['Harry Kane (30 goals)', 'Ivan Toney (20 goals)', 'Mohamed Salah (19 goals)']],
  ['2021/22', 'Mohamed Salah & Son Heung-min (23 goals)', ['Cristiano Ronaldo (18 goals)', 'Harry Kane (17 goals)', 'Sadio Mané (16 goals)']],
  ['2020/21', 'Harry Kane (23 goals)', ['Mohamed Salah (22 goals)', 'Bruno Fernandes (18 goals)', 'Son Heung-min (17 goals)']],
  ['2019/20', 'Jamie Vardy (23 goals)', ['Pierre-Emerick Aubameyang (22 goals)', 'Danny Ings (22 goals)', 'Raheem Sterling (20 goals)']],
  ['2018/19', 'Salah, Mané & Aubameyang (22 goals)', ['Sergio Agüero (21 goals)', 'Harry Kane (17 goals)', 'Raheem Sterling (17 goals)']],
  ['2017/18', 'Mohamed Salah (32 goals)', ['Harry Kane (30 goals)', 'Sergio Agüero (21 goals)', 'Jamie Vardy (20 goals)']],
  ['2016/17', 'Harry Kane (29 goals)', ['Romelu Lukaku (25 goals)', 'Alexis Sánchez (24 goals)', 'Sergio Agüero (20 goals)']],
  ['2015/16', 'Harry Kane (25 goals)', ['Sergio Agüero (24 goals)', 'Jamie Vardy (24 goals)', 'Romelu Lukaku (18 goals)']],
  ['2014/15', 'Sergio Agüero (26 goals)', ['Harry Kane (21 goals)', 'Diego Costa (20 goals)', 'Charlie Austin (18 goals)']],
  ['2013/14', 'Luis Suárez (31 goals)', ['Daniel Sturridge (21 goals)', 'Yaya Touré (20 goals)', 'Sergio Agüero (17 goals)']],
  ['2012/13', 'Robin van Persie (26 goals)', ['Luis Suárez (23 goals)', 'Gareth Bale (21 goals)', 'Christian Benteke (19 goals)']],
  ['2011/12', 'Robin van Persie (30 goals)', ['Wayne Rooney (27 goals)', 'Sergio Agüero (23 goals)', 'Yakubu Aiyegbeni (17 goals)']],
  ['2010/11', 'Dimitar Berbatov & Carlos Tevez (20 goals)', ['Robin van Persie (18 goals)', 'Darren Bent (17 goals)', 'Peter Odemwingie (15 goals)']],
  ['2009/10', 'Didier Drogba (29 goals)', ['Wayne Rooney (26 goals)', 'Darren Bent (24 goals)', 'Carlos Tevez (23 goals)']]
];

for (const [season, correct, wrong] of plGoldenBoots) {
  newFootball.push(makeQ(`Who won the Premier League Golden Boot in the ${season} season?`, correct, wrong, 'pl', 'golden-boot'));
}

// Ballon d'Or Winners
const ballonDor = [
  ['2024', 'Rodri (Manchester City & Spain)', ['Vinícius Júnior (Real Madrid)', 'Jude Bellingham (Real Madrid)', 'Dani Carvajal (Real Madrid)']],
  ['2023', 'Lionel Messi (Inter Miami & Argentina)', ['Erling Haaland (Manchester City)', 'Kylian Mbappé (PSG)', 'Kevin De Bruyne (Manchester City)']],
  ['2022', 'Karim Benzema (Real Madrid & France)', ['Sadio Mané (Liverpool)', 'Kevin De Bruyne (Manchester City)', 'Robert Lewandowski (Barcelona)']],
  ['2021', 'Lionel Messi (PSG & Argentina)', ['Robert Lewandowski (Bayern Munich)', 'Jorginho (Chelsea)', 'Karim Benzema (Real Madrid)']],
  ['2019', 'Lionel Messi (Barcelona & Argentina)', ['Virgil van Dijk (Liverpool)', 'Cristiano Ronaldo (Juventus)', 'Sadio Mané (Liverpool)']],
  ['2018', 'Luka Modrić (Real Madrid & Croatia)', ['Cristiano Ronaldo (Real Madrid)', 'Antoine Griezmann (Atlético Madrid)', 'Kylian Mbappé (PSG)']],
  ['2007', 'Kaká (AC Milan & Brazil)', ['Cristiano Ronaldo (Man United)', 'Lionel Messi (Barcelona)', 'Didier Drogba (Chelsea)']],
  ['2006', 'Fabio Cannavaro (Juventus/Real Madrid & Italy)', ['Gianluigi Buffon (Juventus)', 'Thierry Henry (Arsenal)', 'Ronaldinho (Barcelona)']],
  ['2005', 'Ronaldinho (Barcelona & Brazil)', ['Frank Lampard (Chelsea)', 'Steven Gerrard (Liverpool)', 'Thierry Henry (Arsenal)']],
  ['2004', 'Andriy Shevchenko (AC Milan & Ukraine)', ['Deco (Porto/Barcelona)', 'Ronaldinho (Barcelona)', 'Thierry Henry (Arsenal)']],
  ['2003', 'Pavel Nedvěd (Juventus & Czech Republic)', ['Thierry Henry (Arsenal)', 'Paolo Maldini (AC Milan)', 'Andriy Shevchenko (AC Milan)']]
];

for (const [year, correct, wrong] of ballonDor) {
  newFootball.push(makeQ(`Who won the prestigious Men's Ballon d'Or in ${year}?`, correct, wrong, 'world', 'ballon-dor'));
}

// Champions League Finals
const uclFinals = [
  ['2024', 'Real Madrid 2-0 Borussia Dortmund (Wembley)', ['Carvajal & Vinícius Jr', 'Bellingham & Rodrygo', 'Kroos & Modric', 'Joselu & Valverde']],
  ['2023', 'Manchester City 1-0 Inter Milan (Istanbul)', ['Rodri', 'Erling Haaland', 'Kevin De Bruyne', 'Bernardo Silva']],
  ['2022', 'Real Madrid 1-0 Liverpool (Paris)', ['Vinícius Júnior', 'Karim Benzema', 'Luka Modrić', 'Federico Valverde']],
  ['2021', 'Chelsea 1-0 Manchester City (Porto)', ['Kai Havertz', 'Mason Mount', 'Timo Werner', 'N\'Golo Kanté']],
  ['2020', 'Bayern Munich 1-0 PSG (Lisbon)', ['Kingsley Coman', 'Robert Lewandowski', 'Thomas Müller', 'Serge Gnabry']],
  ['2019', 'Liverpool 2-0 Tottenham (Madrid)', ['Salah (pen) & Origi', 'Mané & Firmino', 'Van Dijk & Henderson', 'Alexander-Arnold & Robertson']],
  ['2018', 'Real Madrid 3-1 Liverpool (Kyiv)', ['Benzema & Bale (2)', 'Ronaldo & Modric', 'Isco & Ramos', 'Asensio & Kroos']],
  ['2017', 'Real Madrid 4-1 Juventus (Cardiff)', ['Ronaldo (2), Casemiro & Asensio', 'Benzema (2) & Bale', 'Morata & Kroos', 'Modric & Ramos']],
  ['2015', 'Barcelona 3-1 Juventus (Berlin)', ['Rakitić, Suárez & Neymar', 'Messi (2) & Iniesta', 'Xavi & Pedro', 'Busquets & Piqué']],
  ['2014', 'Real Madrid 4-1 Atlético Madrid (AET, Lisbon)', ['Ramos, Bale, Marcelo & Ronaldo', 'Di María & Benzema', 'Modric & Alonso', 'Morata & Isco']],
  ['2013', 'Bayern Munich 2-1 Borussia Dortmund (Wembley)', ['Mandžukić & Robben', 'Ribéry & Müller', 'Schweinsteiger & Kroos', 'Gómez & Pizarro']]
];

for (const [year, match, [correct, ...wrong]] of uclFinals) {
  newFootball.push(makeQ(`Who scored the winning goal(s) in the ${year} UEFA Champions League Final (${match})?`, correct, wrong, 'ucl', 'ucl-final-scorers'));
}

console.log(`Generated ${newFootball.length} rich football questions and ${newFpl.length} rich FPL questions.`);

// Merge with existing bank
// Prune bad FPL templates from rawData
const existingFpl = (rawData.categories.fpl || []).filter(q => {
  // Prune nonsensical clean sheets and single-goal trivia
  if (q.template === 'fpl-cleansheets') return false;
  if (q.template === 'fpl-goals' && (q.correct === '0' || q.correct === '1' || q.correct === '2')) return false;
  return true;
});

const existingFootball = rawData.categories.football || [];

const combinedFootball = [...existingFootball, ...newFootball];
const combinedFpl = [...existingFpl, ...newFpl];

console.log(`Updated totals: Football = ${combinedFootball.length}, FPL = ${combinedFpl.length}`);

// Write back to trivia.json
rawData.categories.football = combinedFootball;
rawData.categories.fpl = combinedFpl;

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log('Successfully written updated trivia.json!');
