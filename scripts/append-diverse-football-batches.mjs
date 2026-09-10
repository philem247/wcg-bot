import { readFileSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';

const questions = [
  // --- BATCH 1: SHARED DRESSING ROOM / RIVAL CONNECTIONS (35 questions) ---
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Argentine legend shared a dressing room as teammates with Diego Simeone at Sevilla during the 1992/93 season?",
    correct: "Diego Maradona",
    wrong: ["Gabriel Batistuta", "Claudio Caniggia", "Jorge Valdano"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "At which club were Ronaldinho and future manager Mauricio Pochettino teammates between 2001 and 2003?",
    correct: "Paris Saint-Germain",
    wrong: ["RCD Espanyol", "Tottenham Hotspur", "Southampton"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "At which Italian club were Pep Guardiola and Francesco Totti teammates during the 2002/03 Serie A season?",
    correct: "AS Roma",
    wrong: ["Brescia Calcio", "SS Lazio", "UC Sampdoria"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Pep Guardiola famously shared a dressing room with which Italian legend at Brescia between 2001 and 2003?",
    correct: "Roberto Baggio",
    wrong: ["Alessandro Del Piero", "Gianfranco Zola", "Christian Vieri"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Before managing Arsenal, Mikel Arteta was teammates with Ronaldinho at which European club during the 2001/02 season?",
    correct: "Paris Saint-Germain",
    wrong: ["FC Barcelona", "Rangers FC", "Real Sociedad"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Pierre-Emerick Aubameyang and Eden Hazard were teammates in French football during the 2009/10 season at which club?",
    correct: "Lille OSC",
    wrong: ["AS Monaco", "AS Saint-Étienne", "Olympique Lyonnais"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Brazilian midfielder played alongside Cristiano Ronaldo in his solitary senior appearance for Real Madrid in 2013 before moving to Monaco and Liverpool?",
    correct: "Fabinho",
    wrong: ["Casemiro", "Fernandinho", "Fred"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Swedish striker and Brazilian left-back Maxwell famously played together at FOUR different European clubs (Ajax, Inter, Barcelona, PSG)?",
    correct: "Zlatan Ibrahimović",
    wrong: ["Henrik Larsson", "Alexander Isak", "Marcus Berg"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Thierry Henry and David Trezeguet began their senior professional careers as strike partners at which French club in the late 1990s?",
    correct: "AS Monaco",
    wrong: ["Arsenal F.C.", "Juventus FC", "FC Nantes"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Ronaldo Nazário (R9) and Andrea Pirlo shared a dressing room at which Italian club during the 1998/99 season?",
    correct: "Inter Milan",
    wrong: ["AC Milan", "Juventus FC", "Brescia Calcio"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Colombian duo played together at FC Porto, AS Monaco, and the Colombia national team?",
    correct: "Radamel Falcao & James Rodríguez",
    wrong: ["Luis Díaz & Duván Zapata", "Carlos Bacca & Juan Cuadrado", "Jackson Martínez & Fredy Guarín"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Son Heung-min broke into European football as a teenager at Hamburger SV playing alongside which legendary Dutch striker?",
    correct: "Ruud van Nistelrooy",
    wrong: ["Robin van Persie", "Klaas-Jan Huntelaar", "Roy Makaay"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Luka Modrić and Dimitar Berbatov were teammates at Tottenham Hotspur in 2008 before Berbatov moved to which club?",
    correct: "Manchester United",
    wrong: ["Fulham F.C.", "AS Monaco", "Bayer Leverkusen"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Gareth Bale and Dutch midfield enforcer Edgar Davids were teammates at which club during the 2007/08 season?",
    correct: "Tottenham Hotspur",
    wrong: ["Southampton F.C.", "AFC Ajax", "Juventus FC"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Cesc Fàbregas made his Arsenal senior debut playing alongside which Dutch master in the mid-2000s?",
    correct: "Dennis Bergkamp",
    wrong: ["Robin van Persie", "Marc Overmars", "Patrick Kluivert"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "David Beckham and Roberto Carlos shared the pitch for four seasons as teammates at which club?",
    correct: "Real Madrid",
    wrong: ["AC Milan", "LA Galaxy", "Paris Saint-Germain"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Nigerian maestro Jay-Jay Okocha famously mentored a young Ronaldinho when they were teammates at which club in 2001/02?",
    correct: "Paris Saint-Germain",
    wrong: ["Bolton Wanderers", "Fenerbahçe", "Eintracht Frankfurt"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Jay-Jay Okocha and French striker Nicolas Anelka were teammates at two different clubs: Paris Saint-Germain and which English side?",
    correct: "Bolton Wanderers",
    wrong: ["Arsenal F.C.", "Manchester City", "Chelsea F.C."],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "During the 2012/13 Championship playoff semifinals, which future England strike duo famously sat together on the Leicester City substitutes bench?",
    correct: "Jamie Vardy & Harry Kane",
    wrong: ["Wayne Rooney & Daniel Sturridge", "Marcus Rashford & Danny Welbeck", "Dominic Calvert-Lewin & Ivan Toney"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which two players formed the spine of Leicester City's miraculous 2015/16 Premier League title before both moving on to win further major honors at Man City and Chelsea?",
    correct: "Riyad Mahrez & N'Golo Kanté",
    wrong: ["Jamie Vardy & Kasper Schmeichel", "Danny Drinkwater & Wes Morgan", "Shinji Okazaki & Marc Albrighton"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Dani Alves and Neymar shared dressing rooms at which two European clubs in addition to the Brazil national team?",
    correct: "FC Barcelona & Paris Saint-Germain",
    wrong: ["Real Madrid & Juventus", "Sevilla FC & PSG", "FC Barcelona & Juventus"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Erling Haaland and Dominik Szoboszlai were breakout teammates at which Austrian club in 2019 before their Premier League moves?",
    correct: "Red Bull Salzburg",
    wrong: ["RB Leipzig", "Borussia Dortmund", "Rapid Vienna"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Jude Bellingham and Erling Haaland played together for two seasons at which German club before their respective blockbuster transfers?",
    correct: "Borussia Dortmund",
    wrong: ["Bayern Munich", "RB Leipzig", "Bayer Leverkusen"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Virgil van Dijk and Sadio Mané were teammates at Southampton under Ronald Koeman before both reuniting at which club?",
    correct: "Liverpool F.C.",
    wrong: ["Celtic F.C.", "Bayern Munich", "Arsenal F.C."],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Kevin De Bruyne and Mohamed Salah were teammates under José Mourinho in 2014 at which Premier League club?",
    correct: "Chelsea F.C.",
    wrong: ["Manchester City", "Liverpool F.C.", "VfL Wolfsburg"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Toni Kroos and Chilean midfielder Arturo Vidal were teammates on loan together in 2009/10 at which German club?",
    correct: "Bayer Leverkusen",
    wrong: ["Bayern Munich", "Juventus FC", "Borussia Dortmund"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Robert Lewandowski and Marco Reus formed a lethal partnership at Borussia Dortmund reaching which major final together in 2013?",
    correct: "UEFA Champions League Final",
    wrong: ["UEFA Europa League Final", "FIFA Club World Cup Final", "UEFA Super Cup"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "England defenders Kyle Walker and Harry Maguire were teammates early in their careers at which Yorkshire club?",
    correct: "Sheffield United",
    wrong: ["Hull City", "Leeds United", "Sheffield Wednesday"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Argentine winger was teammates with BOTH Cristiano Ronaldo at Manchester United and Lionel Messi at Paris Saint-Germain?",
    correct: "Ángel Di María",
    wrong: ["Karim Benzema", "Antoine Griezmann", "Kylian Mbappé"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Costa Rican goalkeeper won three Champions Leagues with Cristiano Ronaldo at Real Madrid and later played with Lionel Messi at PSG?",
    correct: "Keylor Navas",
    wrong: ["Thibaut Courtois", "Gianluigi Donnarumma", "Claudio Bravo"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Spanish defender captained Cristiano Ronaldo at Real Madrid and later became teammates with Lionel Messi at Paris Saint-Germain?",
    correct: "Sergio Ramos",
    wrong: ["Gerard Piqué", "Jordi Alba", "Dani Carvajal"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Moroccan right-back played with Cristiano Ronaldo at Real Madrid as a teenager and later with Lionel Messi at Paris Saint-Germain?",
    correct: "Achraf Hakimi",
    wrong: ["Noussair Mazraoui", "Nayef Aguerd", "Sofyan Amrabat"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Brazilian midfielder was teammates with Lionel Messi at Barcelona and Cristiano Ronaldo at Juventus in back-to-back seasons (2019-2021)?",
    correct: "Arthur Melo",
    wrong: ["Paulinho", "Philippe Coutinho", "Douglas Costa"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which Bosnian midfielder swapped clubs with Arthur Melo in 2020, playing with Cristiano Ronaldo at Juventus then Lionel Messi at Barcelona?",
    correct: "Miralem Pjanić",
    wrong: ["Edin Džeko", "Sead Kolašinac", "Senad Lulić"],
  },
  {
    template: 'shared-dressing-room',
    league: 'football',
    q: "Which legendary Spanish center-back won the Champions League with Cristiano Ronaldo at Manchester United (2008) and multiple Champions Leagues with Lionel Messi at Barcelona?",
    correct: "Gerard Piqué",
    wrong: ["Carles Puyol", "Sergio Ramos", "Cesc Fàbregas"],
  },

  // --- BATCH 2: WHO ASSISTED THE GOAL? (25 questions) ---
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who provided the cross from the left wing for Mario Götze's 113th-minute World Cup-winning volley for Germany against Argentina in 2014?",
    correct: "André Schürrle",
    wrong: ["Toni Kroos", "Mesut Özil", "Thomas Müller"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who provided the sliding pass assist for Sergio Agüero's dramatic 93:20 title-winning goal against QPR in 2012?",
    correct: "Mario Balotelli",
    wrong: ["David Silva", "Yaya Touré", "Samir Nasri"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who took the famous 'corner taken quickly' that assisted Divock Origi's 4th goal in Liverpool's 4-0 comeback against Barcelona in 2019?",
    correct: "Trent Alexander-Arnold",
    wrong: ["Jordan Henderson", "James Milner", "Sadio Mané"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who looped the high cross from the left wing that Zinedine Zidane volleyed with his left foot in the 2002 Champions League final?",
    correct: "Roberto Carlos",
    wrong: ["Raúl", "Luís Figo", "Santiago Solari"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who took the 88th-minute corner that Didier Drogba headed in to equalize against Bayern Munich in the 2012 Champions League Final?",
    correct: "Juan Mata",
    wrong: ["Frank Lampard", "Ashley Cole", "Florent Malouda"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who played the sensational first-time diagonal pass across the penalty box for Ángel Di María's goal in the 2022 World Cup Final?",
    correct: "Alexis Mac Allister",
    wrong: ["Lionel Messi", "Julián Álvarez", "Rodrigo De Paul"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who played the lofted through-ball that Andrés Iniesta controlled and scored in the 116th minute of the 2010 World Cup Final against Netherlands?",
    correct: "Cesc Fàbregas",
    wrong: ["Xavi Hernández", "Jesús Navas", "Fernando Torres"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who crossed the ball that Wayne Rooney converted with his legendary bicycle kick against Manchester City in February 2011?",
    correct: "Nani",
    wrong: ["Ryan Giggs", "Paul Scholes", "Patrice Evra"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who provided the low driven cross-shot assist for Vinícius Júnior's winning goal in the 2022 Champions League Final against Liverpool?",
    correct: "Federico Valverde",
    wrong: ["Karim Benzema", "Luka Modrić", "Casemiro"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who delivered the deflected pull-back pass that set up Rodri's winning goal in the 2023 Champions League Final against Inter Milan?",
    correct: "Bernardo Silva",
    wrong: ["Kevin De Bruyne", "İlkay Gündoğan", "Jack Grealish"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who provided the cut-back assist for Lionel Messi's iconic 92nd-minute 500th career goal celebration at the Santiago Bernabéu in April 2017?",
    correct: "Jordi Alba",
    wrong: ["Luis Suárez", "Andrés Iniesta", "Sergi Roberto"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who played the through-ball down the left touchline that launched Gareth Bale's blistering sprint past Marc Bartra in the 2014 Copa del Rey Final?",
    correct: "Fábio Coentrão",
    wrong: ["Xabi Alonso", "Luka Modrić", "Ángel Di María"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who crossed the ball for Cristiano Ronaldo's legendary overhead bicycle kick against Juventus in Turin in the 2018 Champions League quarterfinals?",
    correct: "Dani Carvajal",
    wrong: ["Marcelo", "Luka Modrić", "Isco"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who delivered the inch-perfect 50-yard diagonal pass for Robin van Persie's 'Flying Dutchman' diving header against Spain at the 2014 World Cup?",
    correct: "Daley Blind",
    wrong: ["Wesley Sneijder", "Arjen Robben", "Nigel de Jong"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who played the legendary 60-yard cross-field pass that Dennis Bergkamp controlled in three touches to score against Argentina at the 1998 World Cup?",
    correct: "Frank de Boer",
    wrong: ["Ronald de Boer", "Edgar Davids", "Wim Jonk"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who took the 92:48 corner kick that Sergio Ramos headed in to save 'La Décima' for Real Madrid in the 2014 Champions League Final?",
    correct: "Luka Modrić",
    wrong: ["Ángel Di María", "Cristiano Ronaldo", "Xabi Alonso"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who headed down the cushioned layoff that set up Cole Palmer's equalizing goal for England against Spain in the Euro 2024 Final?",
    correct: "Jude Bellingham",
    wrong: ["Bukayo Saka", "Harry Kane", "Ollie Watkins"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who crossed the low ball from the left wing that Mikel Oyarzabal poked home for Spain's 86th-minute winner against England in the Euro 2024 Final?",
    correct: "Marc Cucurella",
    wrong: ["Nico Williams", "Dani Olmo", "Fabián Ruiz"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who provided the cross from the left that Steven Gerrard headed in to start Liverpool's 'Miracle of Istanbul' comeback in the 2005 Champions League Final?",
    correct: "John Arne Riise",
    wrong: ["Xabi Alonso", "Luis García", "Dietmar Hamann"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who slipped the through-ball for Fernando Torres to outmuscle Philipp Lahm and score Spain's winning goal in the Euro 2008 Final?",
    correct: "Xavi Hernández",
    wrong: ["Andrés Iniesta", "Cesc Fàbregas", "David Silva"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who delivered the curling corner that Marco Materazzi headed in for Italy's equalizer against France in the 2006 World Cup Final?",
    correct: "Andrea Pirlo",
    wrong: ["Francesco Totti", "Mauro Camoranesi", "Alessandro Del Piero"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Which goalkeeper headed a poor clearance out of his penalty box that allowed Zlatan Ibrahimović to score his iconic 30-yard bicycle kick in 2012?",
    correct: "Joe Hart",
    wrong: ["Jordan Pickford", "Robert Green", "Jack Butland"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who chipped the clever pass over Colin Hendry that set up Paul Gascoigne's legendary volley against Scotland at Euro 1996?",
    correct: "Darren Anderton",
    wrong: ["Teddy Sheringham", "Alan Shearer", "Steve McManaman"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who played the 5-yard square pass inside his own half that sparked Diego Maradona's 'Goal of the Century' against England in 1986?",
    correct: "Héctor Enrique",
    wrong: ["Jorge Burruchaga", "Jorge Valdano", "Sergio Batista"],
  },
  {
    template: 'who-assisted',
    league: 'football',
    q: "Who provided the chipped assist over the defense for Lionel Messi's famous chip over Arsenal goalkeeper Manuel Almunia at Camp Nou in 2011?",
    correct: "Andrés Iniesta",
    wrong: ["Xavi Hernández", "Dani Alves", "Pedro Rodríguez"],
  },

  // --- BATCH 3: ICONIC COMMENTARY QUOTES (15 questions) ---
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Peter Drury's immortal commentary 'Roma have risen from their ruins! Manolas, the Greek god in Rome!' followed Kostas Manolas's 82nd-minute header against which club in 2018?",
    correct: "FC Barcelona",
    wrong: ["Real Madrid", "Liverpool F.C.", "Bayern Munich"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Gary Neville's famous reaction on Sky Sports as Fernando Torres rounded Victor Valdés at Camp Nou in 2012: 'Unbelievable! Torres... ______!'",
    correct: "Ohhhhhh! (un-ghhh groan)",
    wrong: ["It's a goal!", "He's done it!", "Chelsea are through!"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Which commentator uttered the poetic line 'Montiel... Argentina, champions of the world! Again! At last! And the nation will dance tango tonight!' at the 2022 World Cup Final?",
    correct: "Peter Drury",
    wrong: ["Martin Tyler", "Clive Tyldesley", "Jon Champion"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Clive Tyldesley's famous 2002 commentary on a 16-year-old striking sensation against Arsenal: 'Remember the name... ______!'",
    correct: "Wayne Rooney",
    wrong: ["Michael Owen", "Theo Walcott", "James Milner"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Martin Tyler's famous call 'Gerrard... Oh lovely cushioned header... for GERRARD! What a hit son, what a hit!' occurred in 2004 against which Greek club?",
    correct: "Olympiacos",
    wrong: ["Panathinaikos", "AEK Athens", "PAOK FC"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Guy Mowbray's commentary on Gareth Bale's bicycle kick in the 2018 Champions League final: 'Oh, it's unbelievable! An absolute ______ from Gareth Bale!'",
    correct: "stunner",
    wrong: ["screamer", "miracle", "wonder"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Which commentator shouted 'Here's Lucas Moura... OH THEY'VE DONE IT! I CANNOT BELIEVE IT! LUCAS MOURA WITH THE FINAL KICK OF THE GAME!' in the 2019 Champions League semifinal?",
    correct: "Darren Fletcher",
    wrong: ["Martin Tyler", "Peter Drury", "Clive Tyldesley"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Peter Drury's euphoric commentary from the 2010 World Cup opening match: 'Tshabalala! Goal Bafana Bafana! Goal for South Africa! Goal for ______!'",
    correct: "all of Africa",
    wrong: ["the host nation", "the whole world", "the continent"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Ian Darke's famous American broadcast call as Landon Donovan scored in the 91st minute against Algeria at the 2010 World Cup: 'Go, go, USA! Landon Donovan has scored! Oh can you ______ this?!'",
    correct: "believe",
    wrong: ["imagine", "see", "feel"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Which commentator was famous for describing Lionel Messi with wild colorful metaphors like 'Magisterial Lionel Messi! As clean as a whistle, as sharp as a needle!'?",
    correct: "Ray Hudson",
    wrong: ["Martin Tyler", "Andy Gray", "Alan Smith"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Which Scottish commentator famously coined the phrase 'Take a bow, son!' on UK television during Premier League broadcasts in the 1990s and 2000s?",
    correct: "Andy Gray",
    wrong: ["Graeme Souness", "Alan Hansen", "Ally McCoist"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Jon Champion's poignant 2012 commentary on Thierry Henry's return goal for Arsenal against Leeds United: 'He may be cast in bronze, but he's still capable of producing truly ______ moments!'",
    correct: "golden",
    wrong: ["magical", "special", "unbelievable"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Clive Tyldesley's dramatic 1999 Champions League semifinal line as Roy Keane inspired Manchester United in Turin: 'Full steam ahead in Turin! A captain's ______ from Roy Keane!'",
    correct: "goal",
    wrong: ["performance", "effort", "tackle"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Peter Drury's commentary on Jude Bellingham's 95th-minute overhead kick against Slovakia at Euro 2024: 'Here is your moment... Bellingham! The boy has ______!'",
    correct: "done it again",
    wrong: ["saved his country", "scored a wonder", "rescued England"],
  },
  {
    template: 'commentary-quotes',
    league: 'football',
    q: "Complete Brian Moore's historic 1989 commentary as Michael Thomas scored in stoppage time at Anfield: 'It's up for grabs now... ______!'",
    correct: "Thomas!",
    wrong: ["Arsenal!", "He scores!", "Winner!"],
  },

  // --- BATCH 4: 2024–2026 MATCH DRAMA & CLUTCHES (20 questions) ---
  {
    template: 'modern-moments',
    league: 'football',
    q: "Which Real Madrid substitute scored two goals in the 88th and 91st minutes to shock Bayern Munich in the 2023/24 Champions League semifinal second leg?",
    correct: "Joselu",
    wrong: ["Brahim Díaz", "Arda Güler", "Rodrygo"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Who scored a 95th-minute bicycle kick equalizer for England against Slovakia in the Euro 2024 round of 16 to prevent a shock elimination?",
    correct: "Jude Bellingham",
    wrong: ["Harry Kane", "Bukayo Saka", "Phil Foden"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Who scored a stunning 90th-minute turn-and-shoot winner for England against the Netherlands in the Euro 2024 semifinal?",
    correct: "Ollie Watkins",
    wrong: ["Ivan Toney", "Cole Palmer", "Eberechi Eze"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "At age 16 years and 362 days, who became the youngest goalscorer in European Championship history with a 25-yard curling strike against France at Euro 2024?",
    correct: "Lamine Yamal",
    wrong: ["Pedri", "Gavi", "Pau Cubarsí"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Which Spanish midfielder made a dramatic 89th-minute goal-line headed clearance from Marc Guéhi to protect Spain's 2-1 lead over England in the Euro 2024 Final?",
    correct: "Dani Olmo",
    wrong: ["Rodri", "Robin Le Normand", "Martín Zubimendi"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "How many consecutive matches did Xabi Alonso's Bayer Leverkusen go unbeaten across all competitions in their historic 2023/24 season before losing in the Europa League final?",
    correct: "51 matches",
    wrong: ["43 matches", "48 matches", "55 matches"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Who scored an unforgettable hat-trick for Atalanta to demolish Bayer Leverkusen 3-0 in the 2024 UEFA Europa League final in Dublin?",
    correct: "Ademola Lookman",
    wrong: ["Gianluca Scamacca", "Charles De Ketelaere", "Teun Koopmeiners"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Who scored the 112th-minute extra-time winner for Argentina against Colombia in the 2024 Copa América Final in Miami?",
    correct: "Lautaro Martínez",
    wrong: ["Lionel Messi", "Ángel Di María", "Julián Álvarez"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Who scored Real Madrid's second goal against Borussia Dortmund at Wembley to seal their 15th UEFA Champions League title in June 2024?",
    correct: "Vinícius Júnior",
    wrong: ["Dani Carvajal", "Jude Bellingham", "Rodrygo"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Which Chelsea star made Premier League history in September 2024 by becoming the first player ever to score four goals in the first half of a Premier League match (against Brighton)?",
    correct: "Cole Palmer",
    wrong: ["Nicolas Jackson", "Noni Madueke", "Christopher Nkunku"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Who won the 2024 Men's Ballon d'Or, becoming the first Premier League player to win the award since Cristiano Ronaldo in 2008?",
    correct: "Rodri",
    wrong: ["Vinícius Júnior", "Jude Bellingham", "Dani Carvajal"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "In how many games did Erling Haaland reach 100 goals for Manchester City in all competitions, equaling Cristiano Ronaldo's European record at Real Madrid?",
    correct: "105 games",
    wrong: ["98 games", "112 games", "120 games"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Viktor Gyökeres scored a sensational Champions League hat-trick in November 2024 for Sporting CP against which giant club in Rúben Amorim's farewell home match?",
    correct: "Manchester City",
    wrong: ["Arsenal F.C.", "Real Madrid", "Bayern Munich"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Which Portuguese manager left Sporting CP in November 2024 to take over as Manchester United manager following Erik ten Hag's sacking?",
    correct: "Rúben Amorim",
    wrong: ["Sérgio Conceição", "Marco Silva", "André Villas-Boas"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Under Hansi Flick, FC Barcelona dismantled Real Madrid by what emphatic scoreline at the Santiago Bernabéu in October 2024?",
    correct: "4–0",
    wrong: ["3–1", "5–0", "3–0"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Who scored a dramatic 98th-minute equalizer for Manchester City to salvage a 2-2 draw against 10-man Arsenal at the Etihad in September 2024?",
    correct: "John Stones",
    wrong: ["Erling Haaland", "Mateo Kovačić", "Bernardo Silva"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Harry Kane won the 2023/24 European Golden Shoe by scoring how many Bundesliga goals in his debut season for Bayern Munich?",
    correct: "36 goals",
    wrong: ["32 goals", "34 goals", "38 goals"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Which French superstar officially joined Real Madrid on a free transfer in July 2024 after seven seasons at Paris Saint-Germain?",
    correct: "Kylian Mbappé",
    wrong: ["Antoine Griezmann", "Ousmane Dembélé", "Eduardo Camavinga"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Which Premier League club won the inaugural expanded 32-team FIFA Club World Cup in the United States in July 2025?",
    correct: "Chelsea F.C.",
    wrong: ["Manchester City", "Real Madrid", "Bayern Munich"],
  },
  {
    template: 'modern-moments',
    league: 'football',
    q: "Which Argentine goalkeeper won the Lev Yashin Trophy at the Ballon d'Or ceremony in both 2023 and 2024?",
    correct: "Emiliano Martínez",
    wrong: ["Alisson Becker", "Ederson", "Unai Simón"],
  },

  // --- BATCH 5: TACTICAL LORE & SYSTEMS (12 questions) ---
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which short-passing, possession-dominant football philosophy was famously perfected by Pep Guardiola at Barcelona and Spain's golden generation?",
    correct: "Tiki-taka",
    wrong: ["Catenaccio", "Gegenpressing", "Sarriball"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which ultra-defensive Italian tactical system featuring a sweeper (libero) behind a man-marking defense was popularized by Helenio Herrera at Inter Milan in the 1960s?",
    correct: "Catenaccio",
    wrong: ["Zona Mista", "Tiki-taka", "Total Football"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which revolutionary fluid tactical philosophy, where any outfield player can take over the role of any other player, was pioneered by Rinus Michels and Johan Cruyff in the 1970s?",
    correct: "Total Football",
    wrong: ["Gegenpressing", "Catenaccio", "Tiki-taka"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which high-intensity tactical concept popularized in Germany by Ralf Rangnick and Jürgen Klopp focuses on aggressively winning the ball back immediately upon losing possession?",
    correct: "Gegenpressing",
    wrong: ["Catenaccio", "Tiki-taka", "Bielsa ball"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "What tactical term describes a nominal center-forward who regularly drops deep into midfield to draw defenders out of position and create overloads?",
    correct: "False 9",
    wrong: ["Target Man", "Poacher", "Shadow Striker"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which modern tactical role sees full-backs tuck into central midfield during possession rather than overlapping down the flanks?",
    correct: "Inverted Full-backs",
    wrong: ["Wing-backs", "Sweeper-backs", "Overlapping Center-backs"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which revolutionary 3-2-2-3 formation was created in the 1920s by legendary Arsenal manager Herbert Chapman to counter the new offside rule?",
    correct: "WM Formation",
    wrong: ["Metodo", "Catenaccio", "4-4-2 Diamond"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "What was the famous nickname for Marcelo Bielsa's notoriously intense, uninterrupted 11v11 training sessions without referee whistles at Leeds United?",
    correct: "Murderball",
    wrong: ["Deathmatch", "The Grind", "Chaos Ball"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which Italian manager revolutionized modern defending with his zonally compact, high-pressing 4-4-2 system at AC Milan in the late 1980s?",
    correct: "Arrigo Sacchi",
    wrong: ["Fabio Capello", "Giovanni Trapattoni", "Marcello Lippi"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which fast-paced, vertical, short-passing possession system was developed by Maurizio Sarri during his spell at Napoli?",
    correct: "Sarriball",
    wrong: ["Tiki-taka", "Gegenpressing", "Cholismo"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "Which famous phrase did José Mourinho coin in English football in 2004 when accusing Tottenham Hotspur of ultra-negative defending against Chelsea?",
    correct: "Park the Bus",
    wrong: ["Build a Wall", "Lock the Gates", "Bury the Game"],
  },
  {
    template: 'tactical-lore',
    league: 'football',
    q: "What is the traditional circular passing and keep-away training drill that forms the core of FC Barcelona's La Masia academy training?",
    correct: "El Rondo",
    wrong: ["El Giro", "El Toro", "El Circulo"],
  },
];

console.log('Total questions to append:', questions.length);

const trivia = JSON.parse(readFileSync('data/trivia.json', 'utf8'));
const existingFootball = trivia.categories.football || [];
const existingIds = new Set();
for (const cat of Object.values(trivia.categories)) {
  for (const q of cat) existingIds.add(q.id);
}

const existingQuestions = new Set(existingFootball.map(q => q.q.toLowerCase().trim()));

const validToAppend = [];
for (const raw of questions) {
  // Check schema
  if (!raw.q || !raw.correct || !Array.isArray(raw.wrong) || raw.wrong.length !== 3) {
    throw new Error(`Invalid schema for question: ${raw.q}`);
  }
  const opts = [raw.correct, ...raw.wrong];
  const uniqueOpts = new Set(opts.map(o => o.toLowerCase().trim()));
  if (uniqueOpts.size !== 4) {
    throw new Error(`Duplicate options in question: ${raw.q} -> ${JSON.stringify(opts)}`);
  }

  // Check duplicate question
  if (existingQuestions.has(raw.q.toLowerCase().trim())) {
    console.warn('Skipping existing question:', raw.q);
    continue;
  }

  // Deterministic ID
  const id = crypto.createHash('md5').update(raw.q + '|' + raw.correct).digest('hex').slice(0, 12);
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

console.log(`Successfully verified ${validToAppend.length} questions.`);

trivia.categories.football.push(...validToAppend);
writeFileSync('data/trivia.json', JSON.stringify(trivia, null, 2) + '\n');
console.log(`Updated data/trivia.json. Total football questions now: ${trivia.categories.football.length}`);
