import { readFileSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';

const allTimeClutches = [
  {
    template: 'match-drama',
    league: 'football',
    q: "Who scored a legendary 35-yard stoppage-time equalizer in the 91st minute against West Ham United to rescue Liverpool in the 2006 FA Cup Final ('The Gerrard Final')?",
    correct: "Steven Gerrard",
    wrong: ["Xabi Alonso", "Djibril Cissé", "Peter Crouch"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "Who curled in a stunning 119th-minute extra-time winner for Italy against hosts Germany in Dortmund during the 2006 World Cup semifinal?",
    correct: "Fabio Grosso",
    wrong: ["Alessandro Del Piero", "Andrea Pirlo", "Francesco Totti"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "Against which country did David Beckham score a legendary 93rd-minute curling free-kick at Old Trafford to send England directly to the 2002 FIFA World Cup?",
    correct: "Greece",
    wrong: ["Germany", "Finland", "Albania"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "Which Manchester City substitute scored two goals in five minutes against Aston Villa on the final day of the 2021/22 season to overturn a 0-2 deficit and clinch the Premier League title?",
    correct: "İlkay Gündoğan",
    wrong: ["Kevin De Bruyne", "Rodri", "Gabriel Jesus"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the 96th minute of the December 2018 Merseyside derby, which Everton goalkeeper misjudged a looping ball off the crossbar, allowing Divock Origi to head in an extraordinary winner?",
    correct: "Jordan Pickford",
    wrong: ["Robin Olsen", "Maarten Stekelenburg", "Asmir Begović"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the 120th minute of the 2010 World Cup quarterfinal, which Ghanaian striker struck the crossbar with a penalty after Luis Suárez's infamous goal-line handball?",
    correct: "Asamoah Gyan",
    wrong: ["Sulley Muntari", "Kevin-Prince Boateng", "André Ayew"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "After Juventus lost 2-0 to Atlético Madrid in the first leg of the 2018/19 Champions League round of 16, who scored a sensational second-leg hat-trick in Turin to overturn the tie 3-2 on aggregate?",
    correct: "Cristiano Ronaldo",
    wrong: ["Paulo Dybala", "Mario Mandžukić", "Gonzalo Higuaín"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "With Argentina on the brink of missing the 2018 World Cup, who scored a heroic hat-trick in high-altitude Quito against Ecuador to seal qualification?",
    correct: "Lionel Messi",
    wrong: ["Sergio Agüero", "Ángel Di María", "Gonzalo Higuaín"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the Euro 2000 Final, which French forward scored a dramatic 93rd-minute equalizer against Italy before David Trezeguet won it with a golden goal?",
    correct: "Sylvain Wiltord",
    wrong: ["Thierry Henry", "Nicolas Anelka", "Christophe Dugarry"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the 93rd minute of the 2008/09 Champions League semifinal at Stamford Bridge, who scored a dramatic outside-the-box equalizer against Chelsea to send 10-man Barcelona into the final?",
    correct: "Andrés Iniesta",
    wrong: ["Lionel Messi", "Samuel Eto'o", "Xavi Hernández"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "After losing 4-1 at San Siro in the first leg, which Spanish club pulled off a legendary 4-0 second-leg comeback at the Riazor to eliminate reigning champions AC Milan in the 2003/04 Champions League?",
    correct: "Deportivo La Coruña",
    wrong: ["Valencia CF", "Celta Vigo", "Real Sociedad"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the 89th minute on the final day of the 2000/01 La Liga season, which Brazilian legend completed an unforgettable hat-trick with a 20-yard bicycle kick against Valencia to seal Champions League qualification for Barcelona?",
    correct: "Rivaldo",
    wrong: ["Ronaldo Nazário", "Romário", "Ronaldinho"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In Barcelona's historic 6-1 'Remontada' comeback against PSG in 2017, who scored an 88th-minute free-kick, a 91st-minute penalty, and provided the 95th-minute chipped assist for Sergi Roberto's winner?",
    correct: "Neymar",
    wrong: ["Lionel Messi", "Luis Suárez", "Andrés Iniesta"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the epic 2014 World Cup qualifying playoff second leg in Solna where Zlatan Ibrahimović scored twice, who scored an unforgettable hat-trick to send Portugal to the World Cup?",
    correct: "Cristiano Ronaldo",
    wrong: ["Nani", "Hélder Postiga", "Hugo Almeida"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In stoppage time of France's Euro 2004 group stage clash with England, which French superstar scored a 91st-minute free-kick and a 93rd-minute penalty to turn a 0-1 deficit into a 2-1 victory?",
    correct: "Zinedine Zidane",
    wrong: ["Thierry Henry", "David Trezeguet", "Robert Pires"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "Which 17-year-old Italian striker scored a sensational 92nd-minute curling winner on his Premier League debut for Manchester United against Aston Villa in April 2009?",
    correct: "Federico Macheda",
    wrong: ["Danny Welbeck", "Darron Gibson", "Giuseppe Rossi"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In February 2011, which Newcastle midfielder scored an astonishing 87th-minute 30-yard volley to complete the greatest 4-goal comeback in Premier League history (4-4 against Arsenal)?",
    correct: "Cheick Tioté",
    wrong: ["Yohan Cabaye", "Joey Barton", "Kevin Nolan"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In April 2014, which Chelsea striker capitalized on Steven Gerrard's tragic slip at Anfield to race clear and score, dealing a fatal blow to Liverpool's title hopes?",
    correct: "Demba Ba",
    wrong: ["Samuel Eto'o", "Fernando Torres", "Willian"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "Who curled in a deflected 92nd-minute free-kick winner for Manchester United to defeat Manchester City 3-2 in a breathless derby at the Etihad in December 2012?",
    correct: "Robin van Persie",
    wrong: ["Wayne Rooney", "Ashley Young", "Tom Cleverley"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the 91st minute of Liverpool's chaotic 2016 Europa League quarterfinal second leg at Anfield, who headed home the dramatic winner to complete a 4-3 comeback over Borussia Dortmund?",
    correct: "Dejan Lovren",
    wrong: ["Mamadou Sakho", "Divock Origi", "Philippe Coutinho"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "Which American forward scored an exquisite 82nd-minute chipped goal from the edge of the box to complete Fulham's historic 4-1 comeback over Juventus in the 2010 Europa League?",
    correct: "Clint Dempsey",
    wrong: ["Brian McBride", "Bobby Zamora", "Zoltán Gera"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the 123rd minute (120+3) of the 2022 FIFA World Cup Final, which Argentine goalkeeper made one of the greatest saves in football history by sticking out his left leg to deny Randal Kolo Muani?",
    correct: "Emiliano Martínez",
    wrong: ["Franco Armani", "Gerónimo Rulli", "Nahuel Guzmán"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In the 62nd minute of the 2010 FIFA World Cup Final, which goalkeeper famously stuck out his right boot to deny Arjen Robben on a clean 1v1 breakaway?",
    correct: "Iker Casillas",
    wrong: ["Víctor Valdés", "Pepe Reina", "David de Gea"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "In extra time of the 2006 FIFA World Cup Final in Berlin, which Italian goalkeeper tipped Zinedine Zidane's point-blank header over the crossbar with an extraordinary reflex save?",
    correct: "Gianluigi Buffon",
    wrong: ["Angelo Peruzzi", "Marco Amelia", "Francesco Toldo"],
  },
  {
    template: 'match-drama',
    league: 'football',
    q: "Trailing 4-0 at San Siro in October 2010, which 10-man Tottenham winger scored an astonishing second-half hat-trick against European champions Inter Milan?",
    correct: "Gareth Bale",
    wrong: ["Aaron Lennon", "Luka Modrić", "Peter Crouch"],
  },
];

console.log('Validating all-time clutches:', allTimeClutches.length);

const trivia = JSON.parse(readFileSync('data/trivia.json', 'utf8'));
const fb = trivia.categories.football || [];
const existingIds = new Set();
for (const cat of Object.values(trivia.categories)) {
  for (const q of cat) existingIds.add(q.id);
}
const existingQuestions = new Set(fb.map(q => q.q.toLowerCase().trim()));

const validToAppend = [];
for (const raw of allTimeClutches) {
  if (!raw.q || !raw.correct || !Array.isArray(raw.wrong) || raw.wrong.length !== 3) {
    throw new Error(`Invalid schema for question: ${raw.q}`);
  }
  const opts = [raw.correct, ...raw.wrong];
  const uniqueOpts = new Set(opts.map(o => o.toLowerCase().trim()));
  if (uniqueOpts.size !== 4) {
    throw new Error(`Duplicate options in question: ${raw.q} -> ${JSON.stringify(opts)}`);
  }

  if (existingQuestions.has(raw.q.toLowerCase().trim())) {
    console.warn('Skipping duplicate question:', raw.q);
    continue;
  }

  const id = crypto.createHash('md5').update(`${raw.q}|${raw.correct}`).digest('hex').slice(0, 12);
  if (existingIds.has(id)) {
    throw new Error(`Collision on id: ${id} for question: ${raw.q}`);
  }

  const qObj = {
    id,
    q: raw.q,
    correct: raw.correct,
    wrong: raw.wrong,
    league: raw.league || 'football',
    template: raw.template,
  };

  existingIds.add(id);
  existingQuestions.add(raw.q.toLowerCase().trim());
  validToAppend.push(qObj);
}

console.log(`Verified ${validToAppend.length} all-time clutches.`);
trivia.categories.football.push(...validToAppend);
writeFileSync('data/trivia.json', JSON.stringify(trivia, null, 2) + '\n');
console.log(`Updated data/trivia.json. Total football questions now: ${trivia.categories.football.length}`);
