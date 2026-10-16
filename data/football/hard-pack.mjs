// Hand-written hard football questions. Every decoy is chosen to be plausible
// (a team-mate, the other finalist, a near-miss year), not filler. Grouped by
// `template` so engine/bank.js's per-template round-robin spreads them across
// games instead of serving five in a row. Added to the bank by
// data/add-football-variety.mjs.
//
// Keep to facts that are settled history. Anything that can change (a record
// still being chased, a current squad) goes stale and becomes wrong.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const HARD_PACK = [
  // ── Odd one out ────────────────────────────────────────────────────────
  q('hard-odd-one-out', 'Which of these players never won the Champions League?', 'Zlatan Ibrahimović', ['Wesley Sneijder', "Samuel Eto'o", 'Clarence Seedorf']),
  q('hard-odd-one-out', 'Which of these Brazilians never won the Champions League?', 'Ronaldo Nazário', ['Kaká', 'Ronaldinho', 'Roberto Carlos']),
  q('hard-odd-one-out', 'Which of these legends never won the World Cup?', 'Johan Cruyff', ['Franz Beckenbauer', 'Zinedine Zidane', 'Andrés Iniesta']),
  q('hard-odd-one-out', "Which of these players never won the Ballon d'Or?", 'Thierry Henry', ['Michael Owen', 'Pavel Nedvěd', 'Andriy Shevchenko']),
  q('hard-odd-one-out', "Which of these midfielders never won the Ballon d'Or?", 'Xavi', ['Luka Modrić', 'Kaká', 'Fabio Cannavaro']),
  q('hard-odd-one-out', 'Which of these goalkeepers never won the Champions League?', 'Gianluigi Buffon', ['Iker Casillas', 'Petr Čech', 'Edwin van der Sar']),
  q('hard-odd-one-out', 'Which of these clubs has never won the European Cup / Champions League?', 'Atlético Madrid', ['Steaua Bucharest', 'Red Star Belgrade', 'PSV Eindhoven']),
  q('hard-odd-one-out', 'Which of these British clubs has never won the European Cup / Champions League?', 'Arsenal', ['Aston Villa', 'Nottingham Forest', 'Celtic']),
  q('hard-odd-one-out', 'Which of these countries has never reached a men\'s World Cup final?', 'Portugal', ['Sweden', 'Czechoslovakia', 'Croatia']),
  q('hard-odd-one-out', 'Which of these nations has never won the European Championship?', 'England', ['Greece', 'Denmark', 'Czechoslovakia']),
  q('hard-odd-one-out', 'Which of these managers never won the Champions League?', 'Arsène Wenger', ['Roberto Di Matteo', 'Rafael Benítez', 'Jupp Heynckes']),
  q('hard-odd-one-out', 'Which of these strikers never won the Premier League Golden Boot?', 'Wayne Rooney', ['Dimitar Berbatov', 'Robin van Persie', 'Jamie Vardy']),
  q('hard-odd-one-out', 'Which of these has won the World Cup as both a player and a manager?', 'Didier Deschamps', ['Carlos Bilardo', 'Vicente del Bosque', 'Joachim Löw']),

  // ── Which year ─────────────────────────────────────────────────────────
  q('hard-year', 'In which year did the European Court of Justice deliver the Bosman ruling?', '1995', ['1993', '1997', '1999']),
  q('hard-year', 'In which year did Arsenal leave Highbury for the Emirates Stadium?', '2006', ['2004', '2005', '2008']),
  q('hard-year', 'In which year did Real Madrid win their first European Cup?', '1956', ['1955', '1958', '1960']),
  q('hard-year', 'In which year did Manchester United win their first European Cup?', '1968', ['1966', '1970', '1958']),
  q('hard-year', "In which year did Celtic's 'Lisbon Lions' win the European Cup?", '1967', ['1965', '1969', '1970']),
  q('hard-year', 'In which year was the back-pass rule introduced, stopping goalkeepers handling deliberate passes from team-mates?', '1992', ['1990', '1994', '1996']),
  q('hard-year', 'At which World Cup was VAR used for the first time?', '2018', ['2014', '2022', '2010']),
  q('hard-year', "In which year did Nigeria win their first Africa Cup of Nations?", '1980', ['1976', '1984', '1988']),
  q('hard-year', "Antonín Panenka's chipped penalty won Czechoslovakia which tournament?", 'Euro 1976', ['Euro 1972', 'Euro 1980', 'Euro 1984']),
  q('hard-year', 'At which tournament was a major international final first decided by a golden goal?', 'Euro 96', ['Euro 2000', '1998 World Cup', '2002 World Cup']),

  // ── Finals and big moments ─────────────────────────────────────────────
  q('hard-final-moments', "Who scored Liverpool's first goal in their 2005 Champions League final comeback against AC Milan?", 'Steven Gerrard', ['Vladimír Šmicer', 'Xabi Alonso', 'Djibril Cissé']),
  q('hard-final-moments', "Who scored Bayern Munich's goal in the 1999 Champions League final?", 'Mario Basler', ['Carsten Jancker', 'Stefan Effenberg', 'Mehmet Scholl']),
  q('hard-final-moments', 'Which club did Porto beat 3-0 in the 2004 Champions League final?', 'Monaco', ['Deportivo La Coruña', 'Chelsea', 'Lyon']),
  q('hard-final-moments', "Who headed Marseille's winner against AC Milan in the 1993 Champions League final?", 'Basile Boli', ['Rudi Völler', 'Alen Bokšić', 'Didier Deschamps']),
  q('hard-final-moments', 'Who scored the only goal of the Euro 2016 final?', 'Éder', ['Nani', 'Ricardo Quaresma', 'Renato Sanches']),
  q('hard-final-moments', 'Which country did Denmark beat in the Euro 92 final?', 'Germany', ['Netherlands', 'Sweden', 'CIS']),
  q('hard-final-moments', "Which goalkeeper was beaten by Diego Maradona's 'Hand of God' goal in 1986?", 'Peter Shilton', ['Gordon Banks', 'Ray Clemence', 'Chris Woods']),
  q('hard-final-moments', "Who scored Argentina's winning goal in the 1986 World Cup final?", 'Jorge Burruchaga', ['Diego Maradona', 'Jorge Valdano', 'José Luis Brown']),
  q('hard-final-moments', 'Who was the first player ever sent off in a World Cup final?', 'Pedro Monzón', ['Zinedine Zidane', 'John Heitinga', 'Marcel Desailly']),

  // ── Managers ───────────────────────────────────────────────────────────
  q('hard-managers', 'Who managed Liverpool in the 2005 Champions League final?', 'Rafael Benítez', ['Gérard Houllier', 'Roy Evans', 'Kenny Dalglish']),
  q('hard-managers', 'Who was Barcelona manager when they won the 2006 Champions League?', 'Frank Rijkaard', ['Louis van Gaal', 'Pep Guardiola', 'Carles Rexach']),
  q('hard-managers', 'Who managed Denmark to the Euro 92 title?', 'Richard Møller Nielsen', ['Sepp Piontek', 'Morten Olsen', 'Bo Johansson']),
  q('hard-managers', 'Who managed Blackburn Rovers to the 1994–95 Premier League title?', 'Kenny Dalglish', ['Ray Harford', 'Roy Hodgson', 'Graeme Souness']),
  q('hard-managers', "Who was Arsenal's permanent manager immediately before Arsène Wenger?", 'Bruce Rioch', ['George Graham', 'Terry Neill', 'Don Howe']),
  q('hard-managers', 'Which manager won the European Cup with both Feyenoord and Hamburg?', 'Ernst Happel', ['Ottmar Hitzfeld', 'Jupp Heynckes', 'Rinus Michels']),
  q('hard-managers', 'Ottmar Hitzfeld won the Champions League with Borussia Dortmund and which other club?', 'Bayern Munich', ['Grasshoppers', 'Juventus', 'Hamburg']),
  q('hard-managers', 'Who managed England at the 1990 World Cup?', 'Bobby Robson', ['Graham Taylor', 'Terry Venables', 'Ron Greenwood']),
  q('hard-managers', 'Who coached the Senegal side that beat holders France at the 2002 World Cup?', 'Bruno Metsu', ['Claude Le Roy', 'Aliou Cissé', 'Philippe Troussier']),
  q('hard-managers', 'Who coached Nigeria to Olympic football gold at Atlanta 1996?', 'Jo Bonfrere', ['Clemens Westerhof', 'Shuaibu Amodu', 'Bora Milutinović']),
  q('hard-managers', 'Who coached Nigeria to the 1994 Africa Cup of Nations title?', 'Clemens Westerhof', ['Jo Bonfrere', 'Stephen Keshi', 'Shuaibu Amodu']),
  q('hard-managers', 'Which coach led Egypt to three straight Africa Cup of Nations titles from 2006 to 2010?', 'Hassan Shehata', ['Mahmoud El-Gohary', 'Bob Bradley', 'Héctor Cúper']),
  q('hard-managers', 'Who coached Zambia to their 2012 Africa Cup of Nations win?', 'Hervé Renard', ['Claude Le Roy', 'Philippe Troussier', 'Henri Michel']),
  q('hard-managers', 'Hervé Renard won his second Africa Cup of Nations in 2015 with which nation?', 'Ivory Coast', ['Morocco', 'Ghana', 'Cameroon']),
  q('hard-managers', 'Which interim coach led Ivory Coast to the Africa Cup of Nations title they hosted (final in February 2024)?', 'Emerse Faé', ['Jean-Louis Gasset', 'Hervé Renard', 'Sabri Lamouchi']),
  q('hard-managers', 'Which coach is associated with popularising catenaccio at Inter in the 1960s?', 'Helenio Herrera', ['Nereo Rocco', 'Arrigo Sacchi', 'Giovanni Trapattoni']),
  q('hard-managers', "Which coach is most associated with the Netherlands' 'Total Football' of the 1970s?", 'Rinus Michels', ['Johan Cruyff', 'Louis van Gaal', 'Ernst Happel']),

  // ── Records and numbers ────────────────────────────────────────────────
  q('hard-records', 'How many World Cup goals did Miroslav Klose score in total?', '16', ['15', '14', '17']),
  q('hard-records', 'How many goals did Just Fontaine score at the 1958 World Cup, still a single-tournament record?', '13', ['11', '12', '10']),
  q('hard-records', "How many games did Arsenal draw in their unbeaten 'Invincibles' 2003–04 season?", '12', ['10', '11', '14']),
  q('hard-records', 'How many league goals did Chelsea concede in 2004–05, a Premier League record?', '15', ['17', '13', '21']),
  q('hard-records', 'Which goalkeeper set the Premier League record of 1,311 minutes without conceding?', 'Edwin van der Sar', ['Petr Čech', 'David de Gea', 'Ederson']),
  q('hard-records', "How many league games long was Arsenal's record unbeaten run that ended in October 2004?", '49', ['47', '51', '38']),
  q('hard-records', "Which club ended Arsenal's 49-match unbeaten league run?", 'Manchester United', ['Chelsea', 'Liverpool', 'Bolton Wanderers']),
  q('hard-records', 'How many goals did Lionel Messi score in the 2012 calendar year?', '91', ['86', '85', '96']),
  q('hard-records', "Whose 1972 record of 85 goals in a calendar year did Lionel Messi break in 2012?", 'Gerd Müller', ['Pelé', 'Eusébio', 'Ferenc Puskás']),
  q('hard-records', 'Who scored five goals in nine minutes after coming off the bench against Wolfsburg in 2015?', 'Robert Lewandowski', ['Thomas Müller', 'Arjen Robben', 'Mario Götze']),
  q('hard-records', 'Which two players shared the 34-goal Premier League season record that Haaland broke?', 'Andy Cole and Alan Shearer', ['Thierry Henry and Mohamed Salah', 'Luis Suárez and Cristiano Ronaldo', 'Didier Drogba and Robin van Persie']),
  q('hard-records', 'Until 2024, who alone held the record of six European Cup wins as a player?', 'Paco Gento', ['Paolo Maldini', 'Alfredo Di Stéfano', 'Cristiano Ronaldo']),
  q('hard-records', 'Which goalkeeper scored over 100 career goals, the most by any keeper?', 'Rogério Ceni', ['José Luis Chilavert', 'René Higuita', 'Jorge Campos']),
  q('hard-records', 'How old was Roger Milla when he scored at the 1994 World Cup, the oldest scorer in World Cup history?', '42', ['38', '40', '44']),

  // ── Firsts ─────────────────────────────────────────────────────────────
  q('hard-firsts', 'Which was the first English club to win the European Cup?', 'Manchester United', ['Liverpool', 'Nottingham Forest', 'Aston Villa']),
  q('hard-firsts', 'Which was the first African nation to reach a World Cup quarter-final?', 'Cameroon', ['Senegal', 'Ghana', 'Nigeria']),
  q('hard-firsts', 'Who scored the first-ever Premier League goal, in August 1992?', 'Brian Deane', ['Alan Shearer', 'Mark Hughes', 'Teddy Sheringham']),
  q('hard-firsts', 'Who scored the first hat-trick in Premier League history?', 'Eric Cantona', ['Alan Shearer', 'Ian Wright', 'Mark Hughes']),
  q('hard-firsts', 'Who was the first manager from outside the UK and Ireland to win the Premier League?', 'Arsène Wenger', ['Gérard Houllier', 'Ruud Gullit', 'Claudio Ranieri']),
  q('hard-firsts', 'Which was the first club to be relegated from the Premier League after winning it?', 'Blackburn Rovers', ['Leicester City', 'Aston Villa', 'Nottingham Forest']),
  q('hard-firsts', 'Who became Britain\'s first £1 million footballer in 1979?', 'Trevor Francis', ['Kevin Keegan', 'Kenny Dalglish', 'Andy Gray']),

  // ── World Cup deep cuts ────────────────────────────────────────────────
  q('hard-wc-deep', 'Which country finished third at the 2002 World Cup?', 'Turkey', ['South Korea', 'Senegal', 'United States']),
  q('hard-wc-deep', "Who scored Croatia's extra-time winner against England in the 2018 World Cup semi-final?", 'Mario Mandžukić', ['Ivan Perišić', 'Luka Modrić', 'Ante Rebić']),
  q('hard-wc-deep', 'Ahmed Musa scored both of Nigeria\'s goals in a 3-2 defeat at the 2014 World Cup. Against whom?', 'Argentina', ['Iran', 'Bosnia and Herzegovina', 'France']),
  q('hard-wc-deep', "Ahmed Musa's 2018 World Cup brace came against which country?", 'Iceland', ['Croatia', 'Argentina', 'Denmark']),
  q('hard-wc-deep', 'Which player scored in both the 1998 and 2006 World Cup finals?', 'Zinedine Zidane', ['Thierry Henry', 'Emmanuel Petit', 'Lilian Thuram']),

  // ── Euros deep cuts ────────────────────────────────────────────────────
  q('hard-euro-deep', 'Who won the Golden Boot at Euro 2004?', 'Milan Baroš', ['Wayne Rooney', 'Ruud van Nistelrooy', 'Thierry Henry']),
  q('hard-euro-deep', 'Wales beat which country 3-1 in the Euro 2016 quarter-finals?', 'Belgium', ['Northern Ireland', 'Russia', 'Portugal']),
  q('hard-euro-deep', 'Which team did Iceland knock out in the round of 16 at Euro 2016?', 'England', ['Austria', 'Portugal', 'Hungary']),

  // ── Africa and Nigeria deep cuts ───────────────────────────────────────
  q('hard-africa-deep', 'Zambia won the 2012 Africa Cup of Nations by beating which team in the final?', 'Ivory Coast', ['Ghana', 'Mali', 'Gabon']),
  q('hard-africa-deep', "In which city did Zambia win the 2012 AFCON final, near where their team's plane crashed in 1993?", 'Libreville', ['Bata', 'Malabo', 'Franceville']),
  q('hard-africa-deep', "Nigeria beat which team 4-3 with Kanu's golden goal in the 1996 Olympic semi-final?", 'Brazil', ['Argentina', 'Portugal', 'Mexico']),
  q('hard-africa-deep', 'Jay-Jay Okocha left Fenerbahçe in 1998 for a then-record fee for an African player. Which club signed him?', 'Paris Saint-Germain', ['Bolton Wanderers', 'Eintracht Frankfurt', 'Borussia Dortmund']),
  q('hard-africa-deep', 'Nwankwo Kanu won the 1995 Champions League with which club?', 'Ajax', ['Inter Milan', 'Arsenal', 'Portsmouth']),
  q('hard-africa-deep', 'In which year did Mikel John Obi win the Champions League with Chelsea?', '2012', ['2008', '2009', '2021']),
  q('hard-africa-deep', "Who scored Ivory Coast's winner against Nigeria in the AFCON final played in February 2024?", 'Sébastien Haller', ['Franck Kessié', 'Simon Adingra', 'Seko Fofana']),
  q('hard-africa-deep', "Who scored Nigeria's goal in the AFCON final against Ivory Coast in February 2024?", 'William Troost-Ekong', ['Victor Osimhen', 'Ademola Lookman', 'Alex Iwobi']),
  q('hard-africa-deep', 'Which Nigerian club won back-to-back CAF Champions League titles in 2003 and 2004?', 'Enyimba', ['Enugu Rangers', 'Shooting Stars', 'Kano Pillars']),
  q('hard-africa-deep', "Which Nigerian club is nicknamed 'The People's Elephant'?", 'Enyimba', ['Enugu Rangers', 'Kano Pillars', 'Shooting Stars']),

  // ── Transfers ──────────────────────────────────────────────────────────
  q('hard-transfers', 'Who became the world\'s most expensive player when he joined Real Madrid from Tottenham in 2013?', 'Gareth Bale', ['Luka Modrić', 'Mesut Özil', 'Kaká']),
  q('hard-transfers', 'Alan Shearer joined Newcastle for a world-record fee in 1996. Which club sold him?', 'Blackburn Rovers', ['Southampton', 'Manchester United', 'Leeds United']),
  q('hard-transfers', 'Ronaldo Nazário joined Barcelona in 1996 from which club?', 'PSV Eindhoven', ['Cruzeiro', 'Inter Milan', 'Ajax']),
  q('hard-transfers', 'Kevin De Bruyne joined Manchester City in 2015 from which club?', 'VfL Wolfsburg', ['Werder Bremen', 'Chelsea', 'Genk']),
  q('hard-transfers', 'Mohamed Salah joined Liverpool in 2017 from which club?', 'Roma', ['Fiorentina', 'Chelsea', 'Basel']),
  q('hard-transfers', 'Virgil van Dijk joined Liverpool in 2018 from which club?', 'Southampton', ['Celtic', 'Groningen', 'Ajax']),
  q('hard-transfers', 'Didier Drogba joined Chelsea in 2004 from which club?', 'Marseille', ['Guingamp', 'Le Mans', 'Lyon']),
  q('hard-transfers', 'Thierry Henry joined Arsenal in 1999 from which club?', 'Juventus', ['Monaco', 'Barcelona', 'Lyon']),
  q('hard-transfers', 'Andrea Pirlo joined Juventus on a free transfer in 2011 from which club?', 'AC Milan', ['Inter Milan', 'Brescia', 'Reggina']),

  // ── Club history ───────────────────────────────────────────────────────
  q('hard-club-history', "Which club was founded in 1886 as 'Dial Square'?", 'Arsenal', ['Fulham', 'Millwall', 'Charlton Athletic']),
  q('hard-club-history', 'Manchester City were originally founded under which name?', "St. Mark's (West Gorton)", ['Newton Heath', 'Dial Square', 'Thames Ironworks']),
  q('hard-club-history', 'West Ham United were originally founded as the works team of which company?', 'Thames Ironworks', ['Dial Square', 'Newton Heath', "St. Mark's (West Gorton)"]),
  q('hard-club-history', 'Which club played at Maine Road until 2003?', 'Manchester City', ['Manchester United', 'Stockport County', 'Bolton Wanderers']),
  q('hard-club-history', 'Which club played at The Dell until 2001?', 'Southampton', ['Portsmouth', 'Reading', 'Leicester City']),
  q('hard-club-history', 'Which club played at Highfield Road until 2005?', 'Coventry City', ['Leicester City', 'Derby County', 'Wolverhampton Wanderers']),
  q('hard-club-history', 'Which club played at Roker Park until 1997?', 'Sunderland', ['Newcastle United', 'Middlesbrough', 'Hartlepool United']),

  // ── Nicknames ──────────────────────────────────────────────────────────
  q('hard-nicknames', "Which club is known as 'Die Fohlen' (The Foals)?", 'Borussia Mönchengladbach', ['Schalke 04', 'Werder Bremen', 'Hertha BSC']),
  q('hard-nicknames', "Which club's fans and players are known as 'Los Colchoneros' (The Mattress Makers)?", 'Atlético Madrid', ['Real Betis', 'Valencia', 'Sevilla']),
  q('hard-nicknames', "Which Italian club is nicknamed 'I Lupi' (The Wolves)?", 'Roma', ['Lazio', 'Fiorentina', 'Torino']),
  q('hard-nicknames', "Which French club is nicknamed 'Les Canaris' (The Canaries)?", 'Nantes', ['Lens', 'Lille', 'Sochaux']),
  q('hard-nicknames', "Which player was nicknamed 'The Divine Ponytail'?", 'Roberto Baggio', ['Gianfranco Zola', 'Alessandro Del Piero', 'Andrea Pirlo']),
  q('hard-nicknames', "Which legend was nicknamed 'The Black Panther'?", 'Eusébio', ['Pelé', 'George Weah', 'Roger Milla']),
  q('hard-nicknames', "Which striker was known as 'Der Bomber'?", 'Gerd Müller', ['Karl-Heinz Rummenigge', 'Uwe Seeler', 'Rudi Völler']),
  q('hard-nicknames', "Who was known as 'Il Fenomeno'?", 'Ronaldo Nazário', ['Ronaldinho', 'Rivaldo', 'Adriano']),
  q('hard-nicknames', "Which Nigerian legend is nicknamed 'Papilo'?", 'Nwankwo Kanu', ['Jay-Jay Okocha', 'Daniel Amokachi', 'Rashidi Yekini']),
  q('hard-nicknames', "Daniel Amokachi was known by which nickname?", 'The Bull', ['The Panther', 'The Lion', 'The Rock']),

  // ── Who am I ───────────────────────────────────────────────────────────
  q('hard-who-am-i', 'I captained West Germany to the 1974 World Cup and managed them to the 1990 title. Who am I?', 'Franz Beckenbauer', ['Berti Vogts', 'Gerd Müller', 'Jürgen Klinsmann']),
  q('hard-who-am-i', 'I am a goalkeeper famous for a scorpion-kick clearance against England at Wembley in 1995. Who am I?', 'René Higuita', ['José Luis Chilavert', 'Jorge Campos', 'Rogério Ceni']),

  // ── Rules ──────────────────────────────────────────────────────────────
  q('hard-rules', 'How wide is a regulation football goal?', '8 yards (7.32 m)', ['7 yards (6.40 m)', '9 yards (8.23 m)', '8 metres']),
  q('hard-rules', 'What is the minimum number of players a team must have on the pitch for a match to continue?', '7', ['6', '8', '9']),
]
