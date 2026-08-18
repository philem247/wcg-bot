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
    throw new Error(`Question "${q}" has fewer than 3 unique wrong answers! (found: ${JSON.stringify(uniqueWrong)}, correct: ${correct})`);
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

const questions = [];

// ==========================================
// A. WORLD CUP FINALS & HOSTS (1930 - 2022)
// ==========================================
const candidateHosts = ['France', 'Germany', 'USA', 'Brazil', 'Italy', 'Japan', 'South Africa', 'England', 'Qatar', 'Spain', 'Mexico', 'Sweden', 'Argentina', 'Chile', 'Switzerland', 'Uruguay'];

const worldCups = [
  ['2022', 'Argentina', ['France', 'Croatia', 'Morocco'], 'Qatar', 'Lionel Messi', 'Kylian Mbappé (8 goals)'],
  ['2018', 'France', ['Croatia', 'Belgium', 'England'], 'Russia', 'Luka Modrić', 'Harry Kane (6 goals)'],
  ['2014', 'Germany', ['Argentina', 'Netherlands', 'Brazil'], 'Brazil', 'Lionel Messi', 'James Rodríguez (6 goals)'],
  ['2010', 'Spain', ['Netherlands', 'Germany', 'Uruguay'], 'South Africa', 'Diego Forlán', 'Thomas Müller (5 goals)'],
  ['2006', 'Italy', ['France', 'Germany', 'Portugal'], 'Germany', 'Zinedine Zidane', 'Miroslav Klose (5 goals)'],
  ['2002', 'Brazil', ['Germany', 'Turkey', 'South Korea'], 'Japan & South Korea', 'Oliver Kahn', 'Ronaldo (8 goals)'],
  ['1998', 'France', ['Brazil', 'Croatia', 'Netherlands'], 'France', 'Ronaldo', 'Davor Šuker (6 goals)'],
  ['1994', 'Brazil', ['Italy', 'Sweden', 'Bulgaria'], 'USA', 'Romário', 'Hristo Stoichkov & Oleg Salenko (6 goals)'],
  ['1990', 'West Germany', ['Argentina', 'Italy', 'England'], 'Italy', 'Salvatore Schillaci', 'Salvatore Schillaci (6 goals)'],
  ['1986', 'Argentina', ['West Germany', 'France', 'Belgium'], 'Mexico', 'Diego Maradona', 'Gary Lineker (6 goals)'],
  ['1982', 'Italy', ['West Germany', 'Poland', 'France'], 'Spain', 'Paolo Rossi', 'Paolo Rossi (6 goals)'],
  ['1978', 'Argentina', ['Netherlands', 'Brazil', 'Italy'], 'Argentina', 'Mario Kempes', 'Mario Kempes (6 goals)'],
  ['1974', 'West Germany', ['Netherlands', 'Poland', 'Brazil'], 'West Germany', 'Johan Cruyff', 'Grzegorz Lato (7 goals)'],
  ['1970', 'Brazil', ['Italy', 'West Germany', 'Uruguay'], 'Mexico', 'Pelé', 'Gerd Müller (10 goals)'],
  ['1966', 'England', ['West Germany', 'Portugal', 'Soviet Union'], 'England', 'Bobby Charlton', 'Eusébio (9 goals)'],
  ['1962', 'Brazil', ['Czechoslovakia', 'Chile', 'Yugoslavia'], 'Chile', 'Garrincha', 'Garrincha & Vavá (4 goals)'],
  ['1958', 'Brazil', ['Sweden', 'France', 'West Germany'], 'Sweden', 'Didi', 'Just Fontaine (13 goals)'],
  ['1954', 'West Germany', ['Hungary', 'Austria', 'Uruguay'], 'Switzerland', 'Ferenc Puskás', 'Sándor Kocsis (11 goals)'],
  ['1950', 'Uruguay', ['Brazil', 'Sweden', 'Spain'], 'Brazil', 'Zizinho', 'Ademir (8 goals)'],
  ['1938', 'Italy', ['Hungary', 'Brazil', 'Sweden'], 'France', 'Leônidas', 'Leônidas (7 goals)'],
  ['1934', 'Italy', ['Czechoslovakia', 'Germany', 'Austria'], 'Italy', 'Giuseppe Meazza', 'Oldřich Nejedlý (5 goals)'],
  ['1930', 'Uruguay', ['Argentina', 'USA', 'Yugoslavia'], 'Uruguay', 'José Nasazzi', 'Guillermo Stábile (8 goals)']
];

for (const [year, winner, runners, host, bestPlayer, topScorer] of worldCups) {
  questions.push(makeQ(`Which country won the ${year} FIFA World Cup?`, winner, runners, 'world', 'wc-winner'));
  const wrongHosts = candidateHosts.filter(h => h !== host).slice(0, 3);
  questions.push(makeQ(`Which nation hosted the ${year} FIFA World Cup?`, host, wrongHosts, 'world', 'wc-host'));
  questions.push(makeQ(`Who won the Golden Ball (Best Player) at the ${year} FIFA World Cup?`, bestPlayer, ['Pelé', 'Maradona', 'Zidane', 'Cruyff', 'Ronaldo'].filter(x => x !== bestPlayer).slice(0,3), 'world', 'wc-golden-ball'));
  questions.push(makeQ(`Who was the top goalscorer at the ${year} FIFA World Cup?`, topScorer, ['Miroslav Klose', 'Ronaldo', 'Thomas Müller', 'Gary Lineker'].filter(x => !topScorer.includes(x)).slice(0,3), 'world', 'wc-top-scorer'));
}

// ==========================================
// B. UEFA EUROS FINALS & WINNERS (1960 - 2024)
// ==========================================
const euros = [
  ['2024', 'Spain', ['England', 'France', 'Netherlands'], 'Germany'],
  ['2020', 'Italy', ['England', 'Spain', 'Denmark'], 'Pan-European'],
  ['2016', 'Portugal', ['France', 'Wales', 'Germany'], 'France'],
  ['2012', 'Spain', ['Italy', 'Germany', 'Portugal'], 'Poland & Ukraine'],
  ['2008', 'Spain', ['Germany', 'Russia', 'Turkey'], 'Austria & Switzerland'],
  ['2004', 'Greece', ['Portugal', 'Czech Republic', 'Netherlands'], 'Portugal'],
  ['2000', 'France', ['Italy', 'Netherlands', 'Portugal'], 'Belgium & Netherlands'],
  ['1996', 'Germany', ['Czech Republic', 'England', 'France'], 'England'],
  ['1992', 'Denmark', ['Germany', 'Sweden', 'Netherlands'], 'Sweden'],
  ['1988', 'Netherlands', ['Soviet Union', 'West Germany', 'Italy'], 'West Germany'],
  ['1984', 'France', ['Spain', 'Denmark', 'Portugal'], 'France'],
  ['1980', 'West Germany', ['Belgium', 'Czechoslovakia', 'Italy'], 'Italy'],
  ['1976', 'Czechoslovakia', ['West Germany', 'Netherlands', 'Yugoslavia'], 'Yugoslavia'],
  ['1972', 'West Germany', ['Soviet Union', 'Belgium', 'Hungary'], 'Belgium'],
  ['1968', 'Italy', ['Yugoslavia', 'England', 'Soviet Union'], 'Italy'],
  ['1964', 'Spain', ['Soviet Union', 'Hungary', 'Denmark'], 'Spain'],
  ['1960', 'Soviet Union', ['Yugoslavia', 'Czechoslovakia', 'France'], 'France']
];

for (const [year, winner, runners, host] of euros) {
  questions.push(makeQ(`Which country won the UEFA European Championship in ${year}?`, winner, runners, 'world', 'euro-winner'));
  const wrongHosts = candidateHosts.filter(h => h !== host).slice(0, 3);
  questions.push(makeQ(`Which country hosted UEFA Euro ${year}?`, host, wrongHosts, 'world', 'euro-host'));
}

// ==========================================
// C. AFRICA CUP OF NATIONS (AFCON) WINNERS
// ==========================================
const candidateAfconHosts = ['Egypt', 'Ghana', 'Nigeria', 'South Africa', 'Ivory Coast', 'Cameroon', 'Gabon', 'Angola', 'Tunisia', 'Equatorial Guinea', 'Mali', 'Burkina Faso'];

const afcon = [
  ['2023 (played 2024)', 'Ivory Coast', ['Nigeria', 'South Africa', 'DR Congo'], 'Ivory Coast'],
  ['2021 (played 2022)', 'Senegal', ['Egypt', 'Cameroon', 'Burkina Faso'], 'Cameroon'],
  ['2019', 'Algeria', ['Senegal', 'Nigeria', 'Tunisia'], 'Egypt'],
  ['2017', 'Cameroon', ['Egypt', 'Burkina Faso', 'Ghana'], 'Gabon'],
  ['2015', 'Ivory Coast', ['Ghana', 'DR Congo', 'Equatorial Guinea'], 'Equatorial Guinea'],
  ['2013', 'Nigeria', ['Burkina Faso', 'Mali', 'Ghana'], 'South Africa'],
  ['2012', 'Zambia', ['Ivory Coast', 'Mali', 'Ghana'], 'Gabon & Equatorial Guinea'],
  ['2010', 'Egypt', ['Ghana', 'Nigeria', 'Algeria'], 'Angola'],
  ['2008', 'Egypt', ['Cameroon', 'Ghana', 'Ivory Coast'], 'Ghana'],
  ['2006', 'Egypt', ['Ivory Coast', 'Nigeria', 'Senegal'], 'Egypt'],
  ['2004', 'Tunisia', ['Morocco', 'Nigeria', 'Mali'], 'Tunisia'],
  ['2002', 'Cameroon', ['Senegal', 'Nigeria', 'Mali'], 'Mali'],
  ['2000', 'Cameroon', ['Nigeria', 'South Africa', 'Tunisia'], 'Ghana & Nigeria'],
  ['1998', 'Egypt', ['South Africa', 'DR Congo', 'Burkina Faso'], 'Burkina Faso'],
  ['1996', 'South Africa', ['Tunisia', 'Zambia', 'Ghana'], 'South Africa'],
  ['1994', 'Nigeria', ['Zambia', 'Ivory Coast', 'Mali'], 'Tunisia']
];

for (const [year, winner, runners, host] of afcon) {
  questions.push(makeQ(`Which national team won the ${year} Africa Cup of Nations (AFCON)?`, winner, runners, 'world', 'afcon-winner'));
  const wrongHosts = candidateAfconHosts.filter(h => h !== host).slice(0, 3);
  questions.push(makeQ(`Which country hosted the ${year} Africa Cup of Nations?`, host, wrongHosts, 'world', 'afcon-host'));
}

// ==========================================
// D. PREMIER LEAGUE PLAYER OF THE SEASON
// ==========================================
const plPots = [
  ['2023/24', 'Phil Foden', ['Erling Haaland', 'Cole Palmer', 'Rodri']],
  ['2022/23', 'Erling Haaland', ['Kevin De Bruyne', 'Martin Ødegaard', 'Bukayo Saka']],
  ['2021/22', 'Kevin De Bruyne', ['Mohamed Salah', 'Son Heung-min', 'Trent Alexander-Arnold']],
  ['2020/21', 'Rúben Dias', ['Harry Kane', 'Kevin De Bruyne', 'Bruno Fernandes']],
  ['2019/20', 'Kevin De Bruyne', ['Jordan Henderson', 'Sadio Mané', 'Trent Alexander-Arnold']],
  ['2018/19', 'Virgil van Dijk', ['Raheem Sterling', 'Sergio Agüero', 'Mohamed Salah']],
  ['2017/18', 'Mohamed Salah', ['Kevin De Bruyne', 'Harry Kane', 'David Silva']],
  ['2016/17', 'N\'Golo Kanté', ['Eden Hazard', 'Harry Kane', 'Alexis Sánchez']],
  ['2015/16', 'Jamie Vardy', ['Riyad Mahrez', 'N\'Golo Kanté', 'Mesut Özil']],
  ['2014/15', 'Eden Hazard', ['Diego Costa', 'Harry Kane', 'Sergio Agüero']],
  ['2013/14', 'Luis Suárez', ['Steven Gerrard', 'Yaya Touré', 'Daniel Sturridge']],
  ['2012/13', 'Gareth Bale', ['Robin van Persie', 'Luis Suárez', 'Juan Mata']],
  ['2011/12', 'Vincent Kompany', ['Robin van Persie', 'Wayne Rooney', 'Sergio Agüero']],
  ['2010/11', 'Nemanja Vidić', ['Carlos Tevez', 'Wayne Rooney', 'Luka Modrić']],
  ['2009/10', 'Wayne Rooney', ['Didier Drogba', 'Frank Lampard', 'Cesc Fàbregas']],
  ['2008/09', 'Nemanja Vidić', ['Steven Gerrard', 'Cristiano Ronaldo', 'Fernando Torres']],
  ['2007/08', 'Cristiano Ronaldo', ['Fernando Torres', 'Cesc Fàbregas', 'Emmanuel Adebayor']],
  ['2006/07', 'Cristiano Ronaldo', ['Didier Drogba', 'Paul Scholes', 'Ryan Giggs']],
  ['2005/06', 'Thierry Henry', ['Frank Lampard', 'Wayne Rooney', 'Steven Gerrard']],
  ['2004/05', 'Frank Lampard', ['John Terry', 'Thierry Henry', 'Petr Čech']],
  ['2003/04', 'Thierry Henry', ['Patrick Vieira', 'Robert Pires', 'Ruud van Nistelrooy']]
];

for (const [season, correct, wrong] of plPots) {
  questions.push(makeQ(`Who won the Premier League Player of the Season award for ${season}?`, correct, wrong, 'pl', 'pl-pots'));
}

// ==========================================
// E. FAMOUS FOOTBALL DERBIES & RIVALRIES
// ==========================================
const derbies = [
  ['North London Derby', 'Arsenal vs Tottenham Hotspur', ['Chelsea vs Arsenal', 'Tottenham vs West Ham', 'Chelsea vs Fulham']],
  ['Merseyside Derby', 'Liverpool vs Everton', ['Manchester United vs Liverpool', 'Everton vs Tranmere', 'Liverpool vs Man City']],
  ['Manchester Derby', 'Manchester United vs Manchester City', ['Man United vs Leeds', 'Man City vs Liverpool', 'Man United vs Arsenal']],
  ['El Clásico', 'Real Madrid vs FC Barcelona', ['Atlético Madrid vs Real Madrid', 'Barcelona vs Espanyol', 'Sevilla vs Real Betis']],
  ['Derby della Madonnina', 'Inter Milan vs AC Milan', ['Juventus vs Inter Milan', 'Roma vs Lazio', 'Juventus vs Torino']],
  ['Derby d\'Italia', 'Juventus vs Inter Milan', ['AC Milan vs Juventus', 'Roma vs Napoli', 'Lazio vs Roma']],
  ['Derby della Capitale', 'AS Roma vs SS Lazio', ['Napoli vs Roma', 'Fiorentina vs Juventus', 'Inter vs Milan']],
  ['El Derbi Madrileño', 'Real Madrid vs Atlético Madrid', ['Real Madrid vs Getafe', 'Atlético vs Rayo Vallecano', 'Barcelona vs Real Madrid']],
  ['Der Klassiker', 'Bayern Munich vs Borussia Dortmund', ['Schalke 04 vs Dortmund', 'Bayern vs Leverkusen', 'Dortmund vs Leipzig']],
  ['Revierderby', 'Borussia Dortmund vs Schalke 04', ['Bayern Munich vs Dortmund', 'Köln vs Mönchengladbach', 'Bremen vs Hamburg']],
  ['Le Classique', 'Paris Saint-Germain vs Olympique de Marseille', ['Lyon vs Marseille', 'PSG vs Monaco', 'Saint-Étienne vs Lyon']],
  ['Derby du Rhône', 'Olympique Lyonnais vs AS Saint-Étienne', ['PSG vs Lyon', 'Marseille vs Nice', 'Monaco vs Nice']],
  ['O Clássico', 'FC Porto vs SL Benfica', ['Benfica vs Sporting CP', 'Porto vs Sporting CP', 'Braga vs Vitória']],
  ['Derby de Lisboa (Eternal Derby)', 'SL Benfica vs Sporting CP', ['Porto vs Benfica', 'Sporting vs Porto', 'Benfica vs Belenenses']],
  ['The Old Firm', 'Celtic vs Rangers', ['Hearts vs Hibernian', 'Aberdeen vs Celtic', 'Dundee vs Dundee United']],
  ['Superclásico', 'Boca Juniors vs River Plate', ['Racing Club vs Independiente', 'San Lorenzo vs Huracán', 'Flamengo vs Fluminense']],
  ['Fla-Flu', 'Flamengo vs Fluminense', ['Corinthians vs Palmeiras', 'Santos vs São Paulo', 'Grêmio vs Internacional']],
  ['The Intercontinental Derby', 'Galatasaray vs Fenerbahçe', ['Beşiktaş vs Galatasaray', 'Fenerbahçe vs Trabzonspor', 'Beşiktaş vs Fenerbahçe']]
];

for (const [name, correct, wrong] of derbies) {
  questions.push(makeQ(`Which two clubs contest the famous "${name}"?`, correct, wrong, 'other', 'derby-match'));
}

// ==========================================
// F. ICONIC STADIUMS & VENUES
// ==========================================
const stadiums = [
  ['Camp Nou (Spotify Camp Nou)', 'FC Barcelona', ['Real Madrid', 'Atlético Madrid', 'Valencia']],
  ['Santiago Bernabéu', 'Real Madrid', ['Atlético Madrid', 'Sevilla', 'Athletic Bilbao']],
  ['San Siro (Stadio Giuseppe Meazza)', 'AC Milan & Inter Milan', ['Juventus & Torino', 'Roma & Lazio', 'Napoli & Fiorentina']],
  ['Old Trafford', 'Manchester United', ['Manchester City', 'Liverpool', 'Everton']],
  ['Anfield', 'Liverpool FC', ['Everton', 'Manchester United', 'Leeds United']],
  ['Allianz Arena', 'Bayern Munich', ['Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig']],
  ['Signal Iduna Park (Westfalenstadion)', 'Borussia Dortmund', ['Schalke 04', 'Eintracht Frankfurt', 'Stuttgart']],
  ['Parc des Princes', 'Paris Saint-Germain', ['Olympique de Marseille', 'AS Monaco', 'Lille OSC']],
  ['Estádio da Luz', 'SL Benfica', ['Sporting CP', 'FC Porto', 'SC Braga']],
  ['Estádio do Dragão', 'FC Porto', ['SL Benfica', 'Sporting CP', 'Boavista']],
  ['La Bombonera', 'Boca Juniors', ['River Plate', 'Racing Club', 'Independiente']],
  ['El Monumental', 'River Plate', ['Boca Juniors', 'San Lorenzo', 'Vélez Sarsfield']],
  ['Maracanã Stadium', 'Flamengo & Fluminense', ['Corinthians & Palmeiras', 'São Paulo & Santos', 'Cruzeiro & Atlético Mineiro']],
  ['Stamford Bridge', 'Chelsea FC', ['Fulham', 'Arsenal', 'Tottenham']],
  ['Emirates Stadium', 'Arsenal FC', ['Tottenham', 'Chelsea', 'West Ham']],
  ['Tottenham Hotspur Stadium', 'Tottenham Hotspur', ['Arsenal', 'West Ham', 'Crystal Palace']],
  ['St James\' Park', 'Newcastle United', ['Sunderland', 'Middlesbrough', 'Leeds United']],
  ['Villa Park', 'Aston Villa', ['Birmingham City', 'Wolves', 'West Bromwich Albion']],
  ['Goodison Park', 'Everton FC', ['Liverpool', 'Tranmere Rovers', 'Manchester City']],
  ['Craven Cottage', 'Fulham FC', ['Chelsea', 'Brentford', 'QPR']]
];

for (const [stadium, correct, wrong] of stadiums) {
  questions.push(makeQ(`Which football club plays its home matches at ${stadium}?`, correct, wrong, 'other', 'stadium-club'));
}

console.log(`Generated ${questions.length} additional curated football and FPL questions.`);

const finalBank = {
  ...rawData,
  categories: {
    ...rawData.categories,
    football: [...(rawData.categories.football || []), ...questions]
  }
};

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(finalBank, null, 2));
console.log(`Updated data/trivia.json! Total football questions: ${finalBank.categories.football.length}`);
