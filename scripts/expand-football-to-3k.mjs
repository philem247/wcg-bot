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
// 1. LA LIGA CHAMPIONS & HISTORIC SEASONS (1990/91 to 2023/24)
// =========================================================================
const laLigaSeasons = [
  ['2023/24', 'Real Madrid (95 pts)', ['FC Barcelona (85 pts)', 'Girona (81 pts)', 'Atlético Madrid (76 pts)']],
  ['2022/23', 'FC Barcelona (88 pts)', ['Real Madrid (78 pts)', 'Atlético Madrid (77 pts)', 'Real Sociedad (71 pts)']],
  ['2021/22', 'Real Madrid (86 pts)', ['FC Barcelona (73 pts)', 'Atlético Madrid (71 pts)', 'Sevilla (70 pts)']],
  ['2020/21', 'Atlético Madrid (86 pts)', ['Real Madrid (84 pts)', 'FC Barcelona (79 pts)', 'Sevilla (77 pts)']],
  ['2019/20', 'Real Madrid (87 pts)', ['FC Barcelona (82 pts)', 'Atlético Madrid (70 pts)', 'Sevilla (70 pts)']],
  ['2018/19', 'FC Barcelona (87 pts)', ['Atlético Madrid (76 pts)', 'Real Madrid (68 pts)', 'Valencia (61 pts)']],
  ['2017/18', 'FC Barcelona (93 pts)', ['Atlético Madrid (79 pts)', 'Real Madrid (76 pts)', 'Valencia (73 pts)']],
  ['2016/17', 'Real Madrid (93 pts)', ['FC Barcelona (90 pts)', 'Atlético Madrid (78 pts)', 'Sevilla (72 pts)']],
  ['2015/16', 'FC Barcelona (91 pts)', ['Real Madrid (90 pts)', 'Atlético Madrid (88 pts)', 'Villarreal (64 pts)']],
  ['2014/15', 'FC Barcelona (94 pts)', ['Real Madrid (92 pts)', 'Atlético Madrid (78 pts)', 'Valencia (77 pts)']],
  ['2013/14', 'Atlético Madrid (90 pts, Godín header GW38)', ['FC Barcelona (87 pts)', 'Real Madrid (87 pts)', 'Athletic Bilbao (70 pts)']],
  ['2012/13', 'FC Barcelona (100 pts record under Tito Vilanova)', ['Real Madrid (85 pts)', 'Atlético Madrid (72 pts)', 'Real Sociedad (66 pts)']],
  ['2011/12', 'Real Madrid (100 pts record, 121 goals under Mourinho)', ['FC Barcelona (91 pts)', 'Valencia (61 pts)', 'Málaga (58 pts)']],
  ['2010/11', 'FC Barcelona (96 pts)', ['Real Madrid (92 pts)', 'Valencia (71 pts)', 'Villarreal (62 pts)']],
  ['2009/10', 'FC Barcelona (99 pts)', ['Real Madrid (96 pts)', 'Valencia (71 pts)', 'Sevilla (63 pts)']],
  ['2008/09', 'FC Barcelona (87 pts, Treble season)', ['Real Madrid (78 pts)', 'Sevilla (70 pts)', 'Atlético Madrid (67 pts)']],
  ['2007/08', 'Real Madrid (85 pts)', ['Villarreal (77 pts)', 'FC Barcelona (67 pts)', 'Atlético Madrid (64 pts)']],
  ['2006/07', 'Real Madrid (76 pts, H2H over Barca)', ['FC Barcelona (76 pts)', 'Sevilla (71 pts)', 'Valencia (66 pts)']],
  ['2005/06', 'FC Barcelona (82 pts)', ['Real Madrid (70 pts)', 'Valencia (69 pts)', 'Osasuna (68 pts)']],
  ['2004/05', 'FC Barcelona (84 pts)', ['Real Madrid (80 pts)', 'Villarreal (65 pts)', 'Real Betis (62 pts)']],
  ['2003/04', 'Valencia (77 pts under Rafa Benítez)', ['FC Barcelona (72 pts)', 'Deportivo La Coruña (71 pts)', 'Real Madrid (70 pts)']],
  ['2002/03', 'Real Madrid (78 pts)', ['Real Sociedad (76 pts)', 'Deportivo La Coruña (72 pts)', 'Celta Vigo (61 pts)']],
  ['2001/02', 'Valencia (75 pts under Rafa Benítez)', ['Deportivo La Coruña (68 pts)', 'Real Madrid (66 pts)', 'FC Barcelona (64 pts)']],
  ['2000/01', 'Real Madrid (80 pts)', ['Deportivo La Coruña (73 pts)', 'Mallorca (71 pts)', 'FC Barcelona (63 pts)']],
  ['1999/00', 'Deportivo La Coruña (69 pts under Javier Irureta)', ['FC Barcelona (64 pts)', 'Valencia (64 pts)', 'Real Zaragoza (63 pts)']],
  ['1998/99', 'FC Barcelona (79 pts under Van Gaal)', ['Real Madrid (68 pts)', 'Mallorca (66 pts)', 'Valencia (65 pts)']],
  ['1997/98', 'FC Barcelona (74 pts)', ['Athletic Bilbao (65 pts)', 'Real Sociedad (63 pts)', 'Real Madrid (63 pts)']],
  ['1996/97', 'Real Madrid (92 pts under Capello)', ['FC Barcelona (90 pts)', 'Deportivo La Coruña (77 pts)', 'Real Betis (77 pts)']],
  ['1995/96', 'Atlético Madrid (87 pts, Double under Radomir Antić)', ['Valencia (83 pts)', 'FC Barcelona (80 pts)', 'Espanyol (74 pts)']]
];

for (const [season, champion, runners] of laLigaSeasons) {
  pool.push(makeQ(`Who won the Spanish La Liga title in the ${season} season?`, champion, runners, 'other', 'laliga-champions'));
}

// =========================================================================
// 2. SERIE A CHAMPIONS & HISTORIC SEASONS (1990/91 to 2023/24)
// =========================================================================
const serieASeasons = [
  ['2023/24', 'Inter Milan (94 pts, 20th Scudetto / Second Star)', ['AC Milan (75 pts)', 'Juventus (71 pts)', 'Atalanta (69 pts)']],
  ['2022/23', 'Napoli (90 pts, first Scudetto in 33 years)', ['Lazio (74 pts)', 'Inter Milan (72 pts)', 'AC Milan (70 pts)']],
  ['2021/22', 'AC Milan (86 pts under Stefano Pioli)', ['Inter Milan (84 pts)', 'Napoli (79 pts)', 'Juventus (70 pts)']],
  ['2020/21', 'Inter Milan (91 pts under Antonio Conte)', ['AC Milan (79 pts)', 'Atalanta (78 pts)', 'Juventus (78 pts)']],
  ['2019/20', 'Juventus (83 pts under Maurizio Sarri)', ['Inter Milan (82 pts)', 'Atalanta (78 pts)', 'Lazio (78 pts)']],
  ['2018/19', 'Juventus (90 pts under Allegri)', ['Napoli (79 pts)', 'Atalanta (69 pts)', 'Inter Milan (69 pts)']],
  ['2017/18', 'Juventus (95 pts)', ['Napoli (91 pts)', 'AS Roma (77 pts)', 'Inter Milan (72 pts)']],
  ['2016/17', 'Juventus (91 pts)', ['AS Roma (87 pts)', 'Napoli (86 pts)', 'Atalanta (72 pts)']],
  ['2015/16', 'Juventus (91 pts)', ['Napoli (82 pts)', 'AS Roma (80 pts)', 'Inter Milan (67 pts)']],
  ['2014/15', 'Juventus (87 pts)', ['AS Roma (70 pts)', 'Lazio (69 pts)', 'Fiorentina (64 pts)']],
  ['2013/14', 'Juventus (record 102 pts under Conte)', ['AS Roma (85 pts)', 'Napoli (78 pts)', 'Fiorentina (65 pts)']],
  ['2012/13', 'Juventus (87 pts)', ['Napoli (78 pts)', 'AC Milan (72 pts)', 'Fiorentina (70 pts)']],
  ['2011/12', 'Juventus (84 pts, Unbeaten under Conte)', ['AC Milan (80 pts)', 'Udinese (64 pts)', 'Lazio (62 pts)']],
  ['2010/11', 'AC Milan (82 pts under Allegri)', ['Inter Milan (76 pts)', 'Napoli (70 pts)', 'Udinese (66 pts)']],
  ['2009/10', 'Inter Milan (82 pts, Treble season under Mourinho)', ['AS Roma (80 pts)', 'AC Milan (70 pts)', 'Sampdoria (67 pts)']],
  ['2008/09', 'Inter Milan (84 pts under Mourinho)', ['Juventus (74 pts)', 'AC Milan (74 pts)', 'Fiorentina (68 pts)']],
  ['2007/08', 'Inter Milan (85 pts under Mancini)', ['AS Roma (82 pts)', 'Juventus (72 pts)', 'Fiorentina (66 pts)']],
  ['2006/07', 'Inter Milan (97 pts under Mancini)', ['AS Roma (75 pts)', 'Lazio (62 pts)', 'AC Milan (61 pts)']],
  ['2003/04', 'AC Milan (82 pts under Ancelotti, Shevchenko 24 goals)', ['AS Roma (71 pts)', 'Juventus (69 pts)', 'Inter Milan (59 pts)']],
  ['2002/03', 'Juventus (72 pts under Lippi)', ['Inter Milan (65 pts)', 'AC Milan (61 pts)', 'Lazio (60 pts)']],
  ['2001/02', 'Juventus (71 pts, 5th May drama over Inter)', ['AS Roma (70 pts)', 'Inter Milan (69 pts)', 'AC Milan (55 pts)']],
  ['2000/01', 'AS Roma (75 pts under Fabio Capello, Totti & Batistuta)', ['Juventus (73 pts)', 'Lazio (69 pts)', 'Parma (56 pts)']],
  ['1999/00', 'Lazio (72 pts under Sven-Göran Eriksson)', ['Juventus (71 pts, Perugia storm defeat)', 'AC Milan (61 pts)', 'Inter Milan (58 pts)']],
  ['1998/99', 'AC Milan (70 pts under Alberto Zaccheroni)', ['Lazio (69 pts)', 'Fiorentina (55 pts)', 'Parma (55 pts)']],
  ['1997/98', 'Juventus (74 pts under Lippi)', ['Inter Milan (69 pts, Ronaldo Iuliano match)', 'Lazio (60 pts)', 'Parma (57 pts)']],
  ['1990/91', 'Sampdoria (51 pts under Boskov, Vialli & Mancini)', ['AC Milan (46 pts)', 'Inter Milan (46 pts)', 'Genoa (40 pts)']]
];

for (const [season, champion, runners] of serieASeasons) {
  pool.push(makeQ(`Who won the Italian Serie A title (Scudetto) in the ${season} season?`, champion, runners, 'other', 'seriea-champions'));
}

// =========================================================================
// 3. BUNDESLIGA & LIGUE 1 HISTORIC CHAMPIONS
// =========================================================================
const bundesligaSeasons = [
  ['2023/24', 'Bayer Leverkusen (90 pts, First-ever Unbeaten German Champion)', ['VfB Stuttgart (73 pts)', 'Bayern Munich (72 pts)', 'RB Leipzig (65 pts)']],
  ['2022/23', 'Bayern Munich (71 pts, Musiala 89th min GW34 winner)', ['Borussia Dortmund (71 pts)', 'RB Leipzig (66 pts)', 'Union Berlin (62 pts)']],
  ['2021/22', 'Bayern Munich (77 pts)', ['Borussia Dortmund (69 pts)', 'Bayer Leverkusen (64 pts)', 'RB Leipzig (58 pts)']],
  ['2020/21', 'Bayern Munich (78 pts)', ['RB Leipzig (65 pts)', 'Borussia Dortmund (64 pts)', 'VfL Wolfsburg (61 pts)']],
  ['2019/20', 'Bayern Munich (82 pts, Sextuple under Hansi Flick)', ['Borussia Dortmund (69 pts)', 'RB Leipzig (66 pts)', 'Bayer Leverkusen (63 pts)']],
  ['2018/19', 'Bayern Munich (78 pts)', ['Borussia Dortmund (76 pts)', 'RB Leipzig (66 pts)', 'Bayer Leverkusen (58 pts)']],
  ['2011/12', 'Borussia Dortmund (81 pts under Jürgen Klopp)', ['Bayern Munich (73 pts)', 'Schalke 04 (64 pts)', 'Borussia Mönchengladbach (60 pts)']],
  ['2010/11', 'Borussia Dortmund (75 pts under Jürgen Klopp)', ['Bayer Leverkusen (68 pts)', 'Bayern Munich (65 pts)', 'Hannover 96 (60 pts)']],
  ['2008/09', 'VfL Wolfsburg (69 pts under Magath, Grafite & Džeko 54 goals)', ['Bayern Munich (67 pts)', 'VfB Stuttgart (64 pts)', 'Hertha BSC (63 pts)']],
  ['2006/07', 'VfB Stuttgart (70 pts under Armin Veh)', ['Schalke 04 (68 pts)', 'Werder Bremen (66 pts)', 'Bayern Munich (60 pts)']],
  ['2003/04', 'Werder Bremen (74 pts under Schaaf, Double winners)', ['Bayern Munich (68 pts)', 'Bayer Leverkusen (65 pts)', 'VfB Stuttgart (64 pts)']],
  ['1997/98', '1. FC Kaiserslautern (promoted champions under Otto Rehhagel)', ['Bayern Munich', 'Bayer Leverkusen', 'VfB Stuttgart']]
];

for (const [season, champion, runners] of bundesligaSeasons) {
  pool.push(makeQ(`Who won the German Bundesliga in the ${season} season?`, champion, runners, 'other', 'bundesliga-champions'));
}

const ligue1Seasons = [
  ['2023/24', 'Paris Saint-Germain (76 pts)', ['AS Monaco (67 pts)', 'Brest (61 pts)', 'Lille (59 pts)']],
  ['2022/23', 'Paris Saint-Germain (85 pts)', ['RC Lens (84 pts)', 'Marseille (73 pts)', 'Rennes (68 pts)']],
  ['2020/21', 'Lille OSC (83 pts under Christophe Galtier)', ['Paris Saint-Germain (82 pts)', 'Monaco (78 pts)', 'Lyon (76 pts)']],
  ['2016/17', 'AS Monaco (95 pts under Jardim, Mbappé & Falcao 107 goals)', ['Paris Saint-Germain (87 pts)', 'Nice (78 pts)', 'Lyon (67 pts)']],
  ['2011/12', 'Montpellier HSC (82 pts under Girard, Giroud 21 goals)', ['Paris Saint-Germain (79 pts)', 'Lille (74 pts)', 'Lyon (64 pts)']],
  ['2010/11', 'Lille OSC (76 pts under Rudi Garcia, Eden Hazard)', ['Marseille (70 pts)', 'Lyon (64 pts)', 'Paris Saint-Germain (49 pts)']],
  ['2009/10', 'Olympique de Marseille (78 pts under Didier Deschamps)', ['Lyon (72 pts)', 'Auxerre (71 pts)', 'Lille (70 pts)']],
  ['2008/09', 'Girondins de Bordeaux (80 pts under Laurent Blanc, Gourcuff)', ['Marseille (77 pts)', 'Lyon (71 pts)', 'Toulouse (64 pts)']],
  ['2001/02 to 2007/08', 'Olympique Lyonnais (Record 7 consecutive Ligue 1 titles)', ['Paris Saint-Germain', 'Marseille', 'Monaco']]
];

for (const [season, champion, runners] of ligue1Seasons) {
  pool.push(makeQ(`Who won the French Ligue 1 championship in the ${season} season?`, champion, runners, 'other', 'ligue1-champions'));
}

// =========================================================================
// 4. UEFA EUROPA LEAGUE / UEFA CUP FINALS (2000 - 2024)
// =========================================================================
const europaFinals = [
  ['2024 (Dublin)', 'Atalanta (3-0 vs Bayer Leverkusen, Lookman hat-trick)', ['Bayer Leverkusen', 'Roma', 'Marseille']],
  ['2023 (Budapest)', 'Sevilla (penalties vs AS Roma, 1-1 AET)', ['AS Roma', 'Juventus', 'Bayer Leverkusen']],
  ['2022 (Seville)', 'Eintracht Frankfurt (penalties vs Rangers, 1-1 AET)', ['Rangers', 'West Ham United', 'RB Leipzig']],
  ['2021 (Gdańsk)', 'Villarreal (11-10 penalty shootout vs Manchester United)', ['Manchester United', 'Arsenal', 'AS Roma']],
  ['2020 (Cologne)', 'Sevilla (3-2 vs Inter Milan, Diego Carlos overhead kick)', ['Inter Milan', 'Manchester United', 'Shakhtar Donetsk']],
  ['2019 (Baku)', 'Chelsea (4-1 vs Arsenal, Hazard brace & Giroud)', ['Arsenal', 'Eintracht Frankfurt', 'Valencia']],
  ['2018 (Lyon)', 'Atlético Madrid (3-0 vs Marseille, Griezmann brace)', ['Marseille', 'Arsenal', 'Red Bull Salzburg']],
  ['2017 (Stockholm)', 'Manchester United (2-0 vs Ajax, Pogba & Mkhitaryan)', ['Ajax', 'Celta Vigo', 'Lyon']],
  ['2016 (Basel)', 'Sevilla (3-1 vs Liverpool, Coke brace & Gameiro)', ['Liverpool', 'Villarreal', 'Shakhtar Donetsk']],
  ['2015 (Warsaw)', 'Sevilla (3-2 vs Dnipro, Bacca brace)', ['Dnipro Dnipropetrovsk', 'Fiorentina', 'Napoli']],
  ['2014 (Turin)', 'Sevilla (penalties vs Benfica, 0-0 AET)', ['Benfica', 'Valencia', 'Juventus']],
  ['2013 (Amsterdam)', 'Chelsea (2-1 vs Benfica, Ivanović 93rd min header)', ['Benfica', 'Basel', 'Fenerbahçe']],
  ['2012 (Bucharest)', 'Atlético Madrid (3-0 vs Athletic Bilbao, Falcao brace)', ['Athletic Bilbao', 'Valencia', 'Sporting CP']],
  ['2011 (Dublin)', 'FC Porto (1-0 vs Braga, Falcao record 17th goal)', ['SC Braga', 'Villarreal', 'Benfica']],
  ['2010 (Hamburg)', 'Atlético Madrid (2-1 AET vs Fulham, Forlán 116th min winner)', ['Fulham', 'Liverpool', 'Hamburg']],
  ['2003 (Seville)', 'FC Porto (3-2 AET vs Celtic, Derlei 115th min under Mourinho)', ['Celtic', 'Lazio', 'Boavista']],
  ['2001 (Dortmund)', 'Liverpool (5-4 AET Golden Goal vs Deportivo Alavés)', ['Deportivo Alavés', 'Barcelona', 'Kaiserslautern']]
];

for (const [year, winner, wrong] of europaFinals) {
  pool.push(makeQ(`Who won the UEFA Europa League (or UEFA Cup) in ${year}?`, winner, wrong, 'other', 'europa-winner'));
}

// =========================================================================
// 5. EUROPEAN GOLDEN SHOE WINNERS
// =========================================================================
const goldenShoe = [
  ['2023/24', 'Harry Kane (Bayern Munich, 36 goals)', ['Serhou Guirassy (28 goals)', 'Kylian Mbappé (27 goals)', 'Erling Haaland (27 goals)']],
  ['2022/23', 'Erling Haaland (Manchester City, 36 goals)', ['Harry Kane (30 goals)', 'Kylian Mbappé (29 goals)', 'Alexandre Lacazette (27 goals)']],
  ['2021/22', 'Robert Lewandowski (Bayern Munich, 35 goals)', ['Kylian Mbappé (28 goals)', 'Ciro Immobile (27 goals)', 'Karim Benzema (27 goals)']],
  ['2020/21', 'Robert Lewandowski (Bayern Munich, 41 goals - Bundesliga record)', ['Lionel Messi (30 goals)', 'Cristiano Ronaldo (29 goals)', 'André Silva (28 goals)']],
  ['2019/20', 'Ciro Immobile (Lazio, 36 goals - Serie A record)', ['Robert Lewandowski (34 goals)', 'Cristiano Ronaldo (31 goals)', 'Timo Werner (28 goals)']],
  ['2018/19', 'Lionel Messi (FC Barcelona, 36 goals)', ['Kylian Mbappé (33 goals)', 'Fabio Quagliarella (26 goals)', 'Duván Zapata (23 goals)']],
  ['2017/18', 'Lionel Messi (FC Barcelona, 34 goals)', ['Mohamed Salah (32 goals)', 'Harry Kane (30 goals)', 'Ciro Immobile (29 goals)']],
  ['2016/17', 'Lionel Messi (FC Barcelona, 37 goals)', ['Bas Dost (34 goals)', 'Pierre-Emerick Aubameyang (31 goals)', 'Robert Lewandowski (30 goals)']],
  ['2015/16', 'Luis Suárez (FC Barcelona, 40 goals)', ['Gonzalo Higuaín (36 goals)', 'Cristiano Ronaldo (35 goals)', 'Jonas (32 goals)']],
  ['2014/15', 'Cristiano Ronaldo (Real Madrid, 48 goals)', ['Lionel Messi (43 goals)', 'Sergio Agüero (26 goals)', 'Jonathan Soriano (31 goals)']],
  ['2013/14', 'Cristiano Ronaldo (Real Madrid) & Luis Suárez (Liverpool) - 31 goals', ['Lionel Messi (28 goals)', 'Diego Costa (27 goals)', 'Zlatan Ibrahimović (26 goals)']]
];

for (const [season, correct, wrong] of goldenShoe) {
  pool.push(makeQ(`Who won the European Golden Shoe (top league goalscorer in Europe) for ${season}?`, correct, wrong, 'world', 'golden-shoe'));
}

// =========================================================================
// 6. ICONIC FORWARD TRIOS & MIDFIELD PARTNERSHIPS
// =========================================================================
const trios = [
  makeQ('Which legendary Barcelona attacking trio scored 131 goals combined in the 2015/16 season?', 'MSN (Messi, Suárez, Neymar)', ['BBC (Bale, Benzema, Cristiano)', 'MCN (Mbappé, Cavani, Neymar)', 'SMF (Salah, Mané, Firmino)'], 'other', 'legendary-trios'),
  makeQ('Which Real Madrid attacking trio won 4 Champions League titles together between 2014 and 2018?', 'BBC (Bale, Benzema, Cristiano Ronaldo)', ['MSN (Messi, Suárez, Neymar)', 'RKK (Raúl, Kaká, Benzema)', 'CR7, Özil, Higuaín'], 'ucl', 'legendary-trios'),
  makeQ('Which Real Madrid midfield trio dominated European football winning 4 Champions Leagues together?', 'Kroos, Casemiro, Modrić (KCM)', ['Xavi, Busquets, Iniesta', 'Pirlo, Gattuso, Seedorf', 'Alonso, Khedira, Özil'], 'ucl', 'legendary-trios'),
  makeQ('Which iconic midfield trio was the engine of Pep Guardiola\'s Barcelona and Spain\'s golden generation?', 'Xavi Hernández, Sergio Busquets, Andrés Iniesta', ['Kroos, Casemiro, Modrić', 'Pirlo, Gattuso, Seedorf', 'Alonso, Silva, Fàbregas'], 'other', 'legendary-trios'),
  makeQ('Which AC Milan midfield trio won Champions League titles in 2003 and 2007 under Carlo Ancelotti?', 'Andrea Pirlo, Gennaro Gattuso, Clarence Seedorf', ['Xavi, Busquets, Iniesta', 'Kroos, Casemiro, Modrić', 'Kaká, Ambrosini, Redondo'], 'ucl', 'legendary-trios'),
  makeQ('Which famous Liverpool forward trio scored a combined 91 goals in all competitions in 2017/18?', 'Mohamed Salah, Roberto Firmino, Sadio Mané', ['MSN (Messi, Suárez, Neymar)', 'Torres, Gerrard, Kuyt', 'Suárez, Sturridge, Sterling (SAS)'], 'pl', 'legendary-trios'),
  makeQ('Which Brazilian attacking trio (the "Three Rs") scored 15 of Brazil\'s 18 goals to win the 2002 World Cup?', 'Ronaldo, Rivaldo, Ronaldinho', ['Romário, Bebeto, Raí', 'Robinho, Ronaldinho, Ronaldo', 'Pelé, Rivelino, Tostão'], 'world', 'legendary-trios'),
  makeQ('Which Liverpool striking duo was nicknamed the "SAS" during their thrilling 2013/14 title charge?', 'Luis Suárez & Daniel Sturridge', ['Alan Shearer & Chris Sutton', 'Mohamed Salah & Sadio Mané', 'Fernando Torres & Steven Gerrard'], 'pl', 'legendary-trios'),
  makeQ('Which Blackburn Rovers striking partnership was originally known as the "SAS" when winning the 1994/95 Premier League?', 'Alan Shearer & Chris Sutton', ['Luis Suárez & Daniel Sturridge', 'Dwight Yorke & Andy Cole', 'Teddy Sheringham & Robbie Fowler'], 'pl', 'legendary-trios'),
  makeQ('Which Manchester United strike partnership famously developed an almost telepathic understanding during the 1998/99 Treble?', 'Dwight Yorke & Andy Cole', ['Teddy Sheringham & Ole Gunnar Solskjær', 'Eric Cantona & Mark Hughes', 'Ruud van Nistelrooy & Wayne Rooney'], 'pl', 'legendary-trios')
];

for (const q of trios) pool.push(q);

// =========================================================================
// 7. FAMOUS TRANSFER CONTROVERSIES & SHOCK MOVES
// =========================================================================
const transferSagas = [
  makeQ('Which Portuguese superstar made a shock world-record move directly from Barcelona to Real Madrid in 2000, leading to a pig\'s head being thrown at him?', 'Luís Figo', ['Ronaldo Nazário', 'Michael Laudrup', 'Javier Saviola'], 'other', 'transfer-sagas'),
  makeQ('Which England defender caused massive outrage in North London by moving from Tottenham Hotspur to Arsenal on a free transfer in 2001?', 'Sol Campbell', ['Ashley Cole', 'William Gallas', 'Kolo Touré'], 'pl', 'transfer-sagas'),
  makeQ('Which legendary Italian playmaker was allowed by AC Milan to join rivals Juventus on a free transfer in 2011, winning 4 straight Scudetti?', 'Andrea Pirlo', ['Clarence Seedorf', 'Gennaro Gattuso', 'Alessandro Nesta'], 'other', 'transfer-sagas'),
  makeQ('Which Polish striker joined Bayern Munich on a free transfer from Borussia Dortmund in summer 2014?', 'Robert Lewandowski', ['Mario Götze', 'Mats Hummels', 'Pierre-Emerick Aubameyang'], 'other', 'transfer-sagas'),
  makeQ('Manchester City famously put up a giant blue "Welcome to Manchester" billboard after signing which Argentine striker from Man United in 2009?', 'Carlos Tevez', ['Sergio Agüero', 'Pablo Zabaleta', 'Gonzalo Higuaín'], 'pl', 'transfer-sagas'),
  makeQ('Which Dutch striker left Arsenal to join Manchester United in 2012, wearing number 20 and firing United to their 20th league title?', 'Robin van Persie', ['Ruud van Nistelrooy', 'Dennis Bergkamp', 'Marc Overmars'], 'pl', 'transfer-sagas'),
  makeQ('Which French icon moved from Leeds United to Manchester United for just £1.2m in November 1992, transforming the club into champions?', 'Eric Cantona', ['David Ginola', 'Laurent Blanc', 'Fabien Barthez'], 'pl', 'transfer-sagas'),
  makeQ('Which Italian legend\'s world-record transfer from Fiorentina to Juventus in 1990 caused 3 days of riots in the streets of Florence?', 'Roberto Baggio', ['Gianluca Vialli', 'Salvatore Schillaci', 'Paolo Rossi'], 'other', 'transfer-sagas')
];

for (const q of transferSagas) pool.push(q);

// =========================================================================
// 8. WORLD CUP ALL-TIME TRIVIA (MORE CONTINENTAL NATIONS)
// =========================================================================
const wcNationalTeams = [
  makeQ('Which national team has participated in every single edition of the FIFA Men\'s World Cup in history?', 'Brazil (all 22 tournaments)', ['Germany (20)', 'Italy (18)', 'Argentina (18)'], 'world', 'wc-history'),
  makeQ('Which country holds the record for playing in the most World Cup finals without ever winning the trophy (3 finals: 1974, 1978, 2010)?', 'Netherlands', ['Hungary', 'Czechoslovakia', 'Sweden'], 'world', 'wc-history'),
  makeQ('Which nation became the first Asian country in history to reach the FIFA World Cup semi-finals (in 2002)?', 'South Korea', ['Japan', 'Saudi Arabia', 'Iran'], 'world', 'wc-history'),
  makeQ('Which player holds the record for the most World Cup matches played in history (26 matches)?', 'Lionel Messi', ['Lothar Matthäus (25)', 'Miroslav Klose (24)', 'Paolo Maldini (23)'], 'world', 'wc-history'),
  makeQ('Who is the only player in football history to have won three FIFA World Cup trophies (1958, 1962, 1970)?', 'Pelé', ['Garrincha', 'Cafu', 'Ronaldo Nazário'], 'world', 'wc-history'),
  makeQ('Who holds the record for the most goals scored in a single FIFA World Cup tournament (13 goals in 1958)?', 'Just Fontaine (France)', ['Gerd Müller (10 in 1970)', 'Sándor Kocsis (11 in 1954)', 'Ronaldo (8 in 2002)'], 'world', 'wc-history'),
  makeQ('Which player scored the winning penalty in the 2006 World Cup Final shootout for Italy against France?', 'Fabio Grosso', ['Andrea Pirlo', 'Marco Materazzi', 'Daniele De Rossi'], 'world', 'wc-history'),
  makeQ('Which goalkeeper saved 3 penalties in the quarter-final shootout for Portugal against England at the 2006 World Cup?', 'Ricardo', ['Vítor Baía', 'Eduardo', 'Rui Patrício'], 'world', 'wc-history'),
  makeQ('Which Croatian goalkeeper saved 3 penalties against Japan and 1 against Brazil in shootouts at the 2022 World Cup?', 'Dominik Livaković', ['Danijel Subašić', 'Lovre Kalinić', 'Stipe Pletikosa'], 'world', 'wc-history')
];

for (const q of wcNationalTeams) pool.push(q);

// =========================================================================
// 9. COMPLETE THE NAME EXPANSION (MORE STARS)
// =========================================================================
const namesExpansion = [
  ['Nico', 'Schlotterbeck', ['Süle', 'Anton', 'Hummels'], 'Borussia Dortmund & Germany centre-back'],
  ['Waldemar', 'Anton', ['Schlotterbeck', 'Tah', 'Koch'], 'Borussia Dortmund & Germany defender'],
  ['Maximilian', 'Mittelstädt', ['Raum', 'Henrichs', 'Gosens'], 'VfB Stuttgart & Germany left-back'],
  ['Angelo', 'Stiller', ['Karazor', 'Millot', 'Nübel'], 'VfB Stuttgart & Germany midfield maestro'],
  ['Chris', 'Führich', ['Leweling', 'Undav', 'Demirović'], 'VfB Stuttgart & Germany winger'],
  ['Ermedin', 'Demirović', ['Undav', 'Guirassy', 'Touré'], 'VfB Stuttgart & Bosnia striker'],
  ['Exequiel', 'Palacios', ['Andrich', 'Xhaka', 'García'], 'Bayer Leverkusen & Argentina World Cup winner'],
  ['Robert', 'Andrich', ['Palacios', 'Hofmann', 'García'], 'Bayer Leverkusen & Germany midfielder'],
  ['Amine', 'Adli', ['Tella', 'Hofmann', 'Schick'], 'Bayer Leverkusen & Morocco winger'],
  ['Nathan', 'Tella', ['Adli', 'Hofmann', 'Frimpong'], 'Bayer Leverkusen & Nigeria dynamic winger'],
  ['Patrik', 'Schick', ['Hložek', 'Boniface', 'Undav'], 'Bayer Leverkusen & Czech Republic Euro 2020 wonder-scorer'],
  ['Arthur', 'Vermeeren', ['Barrios', 'Koke', 'Gallagher'], 'Atlético Madrid & Belgium young midfielder'],
  ['Samuel', 'Lino', ['Riquelme', 'Galán', 'Molina'], 'Atlético Madrid & Brazil electric wing-back'],
  ['Rodrigo', 'Riquelme', ['Lino', 'Barrios', 'Correa'], 'Atlético Madrid & Spain attacker'],
  ['Robin', 'Le Normand', ['Laporte', 'Vivian', 'Pau Torres'], 'Atlético Madrid & Spain Euro 2024 champion defender'],
  ['Alexander', 'Sørloth', ['Haaland', 'Strand Larsen', 'Nusa'], 'Atlético Madrid & Norway powerful striker'],
  ['Jørgen', 'Strand Larsen', ['Sørloth', 'Haaland', 'Ajer'], 'Wolves & Norway tall forward'],
  ['Antonio', 'Nusa', ['Bobb', 'Schjelderup', 'Aasgaard'], 'RB Leipzig & Norway trickery winger'],
  ['Arthur', 'Theate', ['Faes', 'Debast', 'Vertonghen'], 'Eintracht Frankfurt & Belgium defender'],
  ['Wout', 'Weghorst', ['De Jong', 'Brobbey', 'Malen'], 'Ajax & Netherlands World Cup two-goal hero vs Argentina'],
  ['Brian', 'Brobbey', ['Weghorst', 'Zirkzee', 'Depay'], 'Ajax & Netherlands explosive striker'],
  ['Kenneth', 'Taylor', ['Hlynsson', 'Berghuis', 'Van den Boomen'], 'Ajax & Netherlands midfielder'],
  ['Joey', 'Veerman', ['Schouten', 'Til', 'Saibari'], 'PSV Eindhoven & Netherlands midfield playmaker'],
  ['Jerdy', 'Schouten', ['Veerman', 'Til', 'Babadi'], 'PSV Eindhoven & Netherlands midfield anchor'],
  ['Johan', 'Bakayoko', ['Lang', 'Lozano', 'Pepi'], 'PSV Eindhoven & Belgium dazzling winger'],
  ['Noa', 'Lang', ['Bakayoko', 'Tillman', 'Lozano'], 'PSV Eindhoven & Netherlands winger'],
  ['Malik', 'Tillman', ['Pepi', 'Dest', 'Lang'], 'PSV Eindhoven & USA attacking midfielder'],
  ['Ricardo', 'Pepi', ['Tillman', 'Balogun', 'Sargent'], 'PSV Eindhoven & USA striker']
];

for (const [first, correct, wrong, desc] of namesExpansion) {
  pool.push(makeQ(`Complete the name of this ${desc}: ${first} ______`, correct, wrong, 'other', 'complete-the-name'));
}

// =========================================================================
// 10. NATIONAL TEAMS & FLAGS EXPANSION
// =========================================================================
const flagsExpansion = [
  ['Alexander Sørloth', 'Norway', ['Sweden', 'Denmark', 'Iceland'], '🇳🇴'],
  ['Antonio Nusa', 'Norway', ['Sweden', 'Denmark', 'Finland'], '🇳🇴'],
  ['Jørgen Strand Larsen', 'Norway', ['Sweden', 'Denmark', 'Iceland'], '🇳🇴'],
  ['Viktor Gyökeres', 'Sweden', ['Hungary', 'Denmark', 'Norway'], '🇸🇪'],
  ['Anthony Elanga', 'Sweden', ['Cameroon', 'England', 'Nigeria'], '🇸🇪'],
  ['Jesper Lindstrøm', 'Denmark', ['Norway', 'Sweden', 'Iceland'], '🇩🇰'],
  ['Morten Hjulmand', 'Denmark', ['Norway', 'Sweden', 'Netherlands'], '🇩🇰'],
  ['Victor Kristiansen', 'Denmark', ['Norway', 'Sweden', 'Iceland'], '🇩🇰'],
  ['Adam Wharton', 'England', ['Scotland', 'Wales', 'Ireland'], '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['Archie Gray', 'England', ['Scotland', 'Wales', 'Northern Ireland'], '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['Billy Gilmour', 'Scotland', ['England', 'Northern Ireland', 'Ireland'], '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  ['Lewis Ferguson', 'Scotland', ['England', 'Northern Ireland', 'Ireland'], '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  ['Ben Doak', 'Scotland', ['England', 'Northern Ireland', 'Wales'], '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  ['Brennan Johnson', 'Wales', ['England', 'Jamaica', 'Scotland'], '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  ['Harry Wilson', 'Wales', ['England', 'Scotland', 'Ireland'], '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  ['Evan Ferguson', 'Republic of Ireland', ['Northern Ireland', 'England', 'Scotland'], '🇮🇪'],
  ['Nathan Collins', 'Republic of Ireland', ['Northern Ireland', 'England', 'Scotland'], '🇮🇪'],
  ['Caoimhín Kelleher', 'Republic of Ireland', ['Northern Ireland', 'England', 'Scotland'], '🇮🇪'],
  ['Shea Charles', 'Northern Ireland', ['Republic of Ireland', 'England', 'Scotland'], '🇬🇧'],
  ['Conor Bradley', 'Northern Ireland', ['Republic of Ireland', 'England', 'Scotland'], '🇬🇧'],
  ['Khvicha Kvaratskhelia', 'Georgia', ['Armenia', 'Azerbaijan', 'Greece'], '🇬🇪'],
  ['Giorgi Mamardashvili', 'Georgia', ['Armenia', 'Azerbaijan', 'Greece'], '🇬🇪'],
  ['Georges Mikautadze', 'Georgia', ['France', 'Armenia', 'Azerbaijan'], '🇬🇪'],
  ['Zuriko Davitashvili', 'Georgia', ['Armenia', 'Azerbaijan', 'Russia'], '🇬🇪'],
  ['Dominik Szoboszlai', 'Hungary', ['Austria', 'Czech Republic', 'Slovakia'], '🇭🇺'],
  ['Roland Sallai', 'Hungary', ['Austria', 'Romania', 'Slovakia'], '🇭🇺'],
  ['Péter Gulácsi', 'Hungary', ['Austria', 'Poland', 'Czech Republic'], '🇭🇺'],
  ['Willi Orbán', 'Hungary', ['Germany', 'Poland', 'Austria'], '🇭🇺'],
  ['Luka Modrić', 'Croatia', ['Serbia', 'Slovenia', 'Bosnia & Herzegovina'], '🇭🇷'],
  ['Mateo Kovačić', 'Croatia', ['Austria', 'Slovenia', 'Slovakia'], '🇭🇷'],
  ['Andrej Kramarić', 'Croatia', ['Serbia', 'Slovenia', 'Bosnia & Herzegovina'], '🇭🇷'],
  ['Dušan Vlahović', 'Serbia', ['Croatia', 'Montenegro', 'Bosnia & Herzegovina'], '🇷🇸'],
  ['Aleksandar Mitrović', 'Serbia', ['Croatia', 'Montenegro', 'North Macedonia'], '🇷🇸'],
  ['Sergej Milinković-Savić', 'Serbia', ['Spain', 'Croatia', 'Montenegro'], '🇷🇸'],
  ['Strahinja Pavlović', 'Serbia', ['Croatia', 'Bosnia & Herzegovina', 'Montenegro'], '🇷🇸'],
  ['Jan Oblak', 'Slovenia', ['Slovakia', 'Czech Republic', 'Austria'], '🇸🇮'],
  ['Benjamin Šeško', 'Slovenia', ['Slovakia', 'Croatia', 'Serbia'], '🇸🇮'],
  ['Jaka Bijol', 'Slovenia', ['Slovakia', 'Croatia', 'Serbia'], '🇸🇮'],
  ['Milan Škriniar', 'Slovakia', ['Slovenia', 'Czech Republic', 'Poland'], '🇸🇰'],
  ['Dávid Hancko', 'Slovakia', ['Slovenia', 'Czech Republic', 'Hungary'], '🇸🇰'],
  ['Martin Dúbravka', 'Slovakia', ['Slovenia', 'Czech Republic', 'Poland'], '🇸🇰'],
  ['Tomáš Souček', 'Czech Republic', ['Slovakia', 'Poland', 'Austria'], '🇨🇿'],
  ['Patrik Schick', 'Czech Republic', ['Slovakia', 'Poland', 'Austria'], '🇨🇿'],
  ['Piotr Zieliński', 'Poland', ['Czech Republic', 'Slovakia', 'Ukraine'], '🇵🇱'],
  ['Robert Lewandowski', 'Poland', ['Germany', 'Czech Republic', 'Slovakia'], '🇵🇱'],
  ['Wojciech Szczęsny', 'Poland', ['Czech Republic', 'Slovakia', 'Austria'], '🇵🇱'],
  ['Nicola Zalewski', 'Poland', ['Italy', 'Czech Republic', 'Slovakia'], '🇵🇱']
];

for (const [player, correct, wrong, flag] of flagsExpansion) {
  pool.push(makeQ(`Which national team does ${player} represent internationally? ${flag}`, correct, wrong, 'world', 'country-flag'));
}

console.log(`Generated ${pool.length} new high-quality football questions in final expansion.`);

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
