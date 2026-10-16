// Second batch of hand-written hard football questions (2026-10). Same rules
// as hard-pack.mjs: plausible decoys, settled history only, grouped by
// template so they spread across games. Anything that could still change
// (a scoring record being chased) is pinned to a date or phrased as history.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const HARD_PACK_2 = [
  // ── Odd one out ────────────────────────────────────────────────────────
  q('hard-odd-one-out', 'Which of these players never played for Real Madrid?', 'Ronaldinho', ['Michael Owen', 'Robinho', 'Nicolas Anelka']),
  q('hard-odd-one-out', 'Which of these players never played for Barcelona?', 'Kaká', ['Thierry Henry', 'Zlatan Ibrahimović', 'Luís Figo']),
  q('hard-odd-one-out', 'Which of these players never played for AC Milan?', 'Francesco Totti', ['Ronaldo Nazário', 'David Beckham', 'Ronaldinho']),
  q('hard-odd-one-out', 'Which of these players never played for Juventus?', 'Roberto Mancini', ['Roberto Baggio', 'Zinedine Zidane', 'Edgar Davids']),
  q('hard-odd-one-out', "Which of these Ballon d'Or winners never played in the Premier League?", 'Kaká', ['George Weah', 'Michael Owen', 'Luka Modrić']),
  q('hard-odd-one-out', 'Which of these clubs has never been relegated from the Premier League?', 'Tottenham Hotspur', ['Newcastle United', 'Aston Villa', 'Leeds United']),
  q('hard-odd-one-out', 'Which of these countries has never won the Copa América?', 'Ecuador', ['Peru', 'Colombia', 'Bolivia']),
  q('hard-odd-one-out', 'Which of these nations has never won the Africa Cup of Nations?', 'Mali', ['Zambia', 'Sudan', 'Congo']),
  q('hard-odd-one-out', 'Which of these clubs has never won the Bundesliga (founded 1963)?', 'Schalke 04', ['VfL Wolfsburg', 'Eintracht Braunschweig', '1860 Munich']),
  q('hard-odd-one-out', 'Which of these clubs has never won Serie A?', 'Atalanta', ['Hellas Verona', 'Sampdoria', 'Cagliari']),
  q('hard-odd-one-out', 'Which of these clubs has never won La Liga?', 'Villarreal', ['Deportivo La Coruña', 'Real Sociedad', 'Real Betis']),
  q('hard-odd-one-out', 'Which of these goalkeepers never won the World Cup?', 'Oliver Kahn', ['Iker Casillas', 'Gianluigi Buffon', 'Fabien Barthez']),
  q('hard-odd-one-out', 'Which of these midfielders never won the Premier League?', 'Steven Gerrard', ['Frank Lampard', 'James Milner', 'Michael Carrick']),

  // ── Which year ─────────────────────────────────────────────────────────
  q('hard-year', 'In which year was the European Cup rebranded as the UEFA Champions League?', '1992', ['1990', '1994', '1995']),
  q('hard-year', 'In which year did Sir Alex Ferguson retire as Manchester United manager?', '2013', ['2012', '2011', '2014']),
  q('hard-year', 'In which year did Arsène Wenger leave Arsenal after 22 years in charge?', '2018', ['2017', '2016', '2019']),
  q('hard-year', 'In which year did Nigeria first qualify for the men\'s World Cup?', '1994', ['1990', '1998', '1986']),
  q('hard-year', 'In which year did Nigeria win the first-ever FIFA U-16/U-17 World Championship?', '1985', ['1987', '1993', '2007']),
  q('hard-year', 'At which World Cup were three points first awarded for a win?', '1994', ['1990', '1998', '1986']),
  q('hard-year', 'In which year did Brazil win their third World Cup and keep the Jules Rimet Trophy for good?', '1970', ['1962', '1974', '1966']),
  q('hard-year', 'In which year did Real Madrid win the last of their five straight European Cups?', '1960', ['1959', '1961', '1958']),

  // ── Finals and big moments ─────────────────────────────────────────────
  q('hard-final-moments', "Who scored Barcelona's extra-time winner in the 1992 European Cup final at Wembley?", 'Ronald Koeman', ['Hristo Stoichkov', 'Michael Laudrup', 'José Mari Bakero']),
  q('hard-final-moments', 'Which club did Barcelona beat in the 1992 European Cup final?', 'Sampdoria', ['Benfica', 'Red Star Belgrade', 'Marseille']),
  q('hard-final-moments', "Who scored Ajax's late winner against AC Milan in the 1995 Champions League final?", 'Patrick Kluivert', ['Jari Litmanen', 'Marc Overmars', 'Finidi George']),
  q('hard-final-moments', 'Which club did Borussia Dortmund beat in the 1997 Champions League final?', 'Juventus', ['Ajax', 'Manchester United', 'Barcelona']),
  q('hard-final-moments', 'Which Dortmund substitute chipped a goal with almost his first touch in the 1997 Champions League final?', 'Lars Ricken', ['Karl-Heinz Riedle', 'Andreas Möller', 'Stéphane Chapuisat']),
  q('hard-final-moments', "Who scored Real Madrid's winner against Juventus in the 1998 Champions League final?", 'Predrag Mijatović', ['Raúl', 'Fernando Morientes', 'Clarence Seedorf']),
  q('hard-final-moments', "Who scored both of Inter's goals in the 2010 Champions League final?", 'Diego Milito', ['Wesley Sneijder', "Samuel Eto'o", 'Goran Pandev']),
  q('hard-final-moments', 'Which club did Manchester City beat in the 2023 Champions League final?', 'Inter Milan', ['Real Madrid', 'AC Milan', 'Bayern Munich']),
  q('hard-final-moments', "Who scored Germany's golden goal in the Euro 96 final?", 'Oliver Bierhoff', ['Jürgen Klinsmann', 'Andreas Möller', 'Matthias Sammer']),
  q('hard-final-moments', 'By what score did Spain beat Italy in the Euro 2012 final?', '4-0', ['3-0', '2-0', '4-1']),
  q('hard-final-moments', "Who scored Italy's equaliser against England in the Euro 2020 final?", 'Leonardo Bonucci', ['Federico Chiesa', 'Lorenzo Insigne', 'Giorgio Chiellini']),
  q('hard-final-moments', "Who scored England's second-minute opener in the Euro 2020 final?", 'Luke Shaw', ['Kieran Trippier', 'Harry Kane', 'Raheem Sterling']),
  q('hard-final-moments', "Who scored England's equaliser in the Euro 2024 final?", 'Cole Palmer', ['Jude Bellingham', 'Harry Kane', 'Ollie Watkins']),
  q('hard-final-moments', "Who scored West Germany's winning penalty in the 1990 World Cup final?", 'Andreas Brehme', ['Lothar Matthäus', 'Rudi Völler', 'Jürgen Klinsmann']),

  // ── Managers ───────────────────────────────────────────────────────────
  q('hard-managers', 'Who managed Chelsea to the 2012 Champions League title?', 'Roberto Di Matteo', ['André Villas-Boas', 'Guus Hiddink', 'Rafael Benítez']),
  q('hard-managers', 'Who managed Porto to the 1987 European Cup?', 'Artur Jorge', ['José Mourinho', 'Bobby Robson', 'Fernando Santos']),
  q('hard-managers', 'Who managed Liverpool to European Cups in 1977, 1978 and 1981?', 'Bob Paisley', ['Bill Shankly', 'Joe Fagan', 'Kenny Dalglish']),
  q('hard-managers', 'Who managed Brazil to the 2002 World Cup?', 'Luiz Felipe Scolari', ['Carlos Alberto Parreira', 'Mário Zagallo', 'Tite']),
  q('hard-managers', 'Who managed Brazil to the 1994 World Cup?', 'Carlos Alberto Parreira', ['Luiz Felipe Scolari', 'Telê Santana', 'Mário Zagallo']),
  q('hard-managers', 'Who managed Spain to the 2010 World Cup?', 'Vicente del Bosque', ['Luis Aragonés', 'Javier Clemente', 'Luis Enrique']),
  q('hard-managers', 'Who managed Spain to the Euro 2008 title?', 'Luis Aragonés', ['Vicente del Bosque', 'José Antonio Camacho', 'Iñaki Sáez']),
  q('hard-managers', 'Who managed Argentina to the 2022 World Cup?', 'Lionel Scaloni', ['Jorge Sampaoli', 'Gerardo Martino', 'Alejandro Sabella']),
  q('hard-managers', 'Who managed Argentina in the 2014 World Cup final?', 'Alejandro Sabella', ['Diego Maradona', 'Gerardo Martino', 'Jorge Sampaoli']),
  q('hard-managers', 'Who managed France to the Euro 1984 title?', 'Michel Hidalgo', ['Aimé Jacquet', 'Michel Platini', 'Henri Michel']),
  q('hard-managers', 'Who managed France to the 1998 World Cup?', 'Aimé Jacquet', ['Roger Lemerre', 'Michel Hidalgo', 'Raymond Domenech']),
  q('hard-managers', 'Who managed France to the Euro 2000 title?', 'Roger Lemerre', ['Aimé Jacquet', 'Jacques Santini', 'Raymond Domenech']),
  q('hard-managers', 'Who managed Nigeria at the 1998 World Cup?', 'Bora Milutinović', ['Jo Bonfrere', 'Philippe Troussier', 'Clemens Westerhof']),
  q('hard-managers', 'Who managed Nigeria at the 2014 World Cup?', 'Stephen Keshi', ['Gernot Rohr', 'Samson Siasia', 'Lars Lagerbäck']),
  q('hard-managers', 'Who managed Nigeria at the 2018 World Cup?', 'Gernot Rohr', ['Stephen Keshi', 'Sunday Oliseh', 'José Peseiro']),
  q('hard-managers', 'Who coached the Cameroon side that reached the 1990 World Cup quarter-finals?', 'Valeri Nepomniachi', ['Claude Le Roy', 'Henri Michel', 'Winfried Schäfer']),
  q('hard-managers', 'Who coached Senegal to their first Africa Cup of Nations title?', 'Aliou Cissé', ['Bruno Metsu', 'Alain Giresse', 'Claude Le Roy']),

  // ── Records and numbers ────────────────────────────────────────────────
  q('hard-records', 'How many Premier League goals did Alan Shearer score?', '260', ['250', '248', '265']),
  q('hard-records', "Who is Chelsea's all-time top scorer?", 'Frank Lampard', ['Bobby Tambling', 'Didier Drogba', 'Kerry Dixon']),
  q('hard-records', "Who is Arsenal's all-time top scorer?", 'Thierry Henry', ['Ian Wright', 'Cliff Bastin', 'Robin van Persie']),
  q('hard-records', "Who is Liverpool's all-time top scorer?", 'Ian Rush', ['Roger Hunt', 'Mohamed Salah', 'Kenny Dalglish']),
  q('hard-records', "Who set Nigeria's long-standing men's scoring record of 37 international goals?", 'Rashidi Yekini', ['Segun Odegbami', 'Obafemi Martins', 'Nwankwo Kanu']),
  q('hard-records', "Who overtook Pelé in 2023 to become Brazil's men's all-time top scorer?", 'Neymar', ['Ronaldo Nazário', 'Romário', 'Zico']),
  q('hard-records', "Who is Germany's men's all-time top scorer, with 71 goals?", 'Miroslav Klose', ['Gerd Müller', 'Lukas Podolski', 'Thomas Müller']),
  q('hard-records', "Who is Italy's men's all-time top scorer, with 35 goals?", 'Luigi Riva', ['Giuseppe Meazza', 'Silvio Piola', 'Roberto Baggio']),
  q('hard-records', "Who is Spain's men's all-time top scorer, with 59 goals?", 'David Villa', ['Raúl', 'Fernando Torres', 'Álvaro Morata']),
  q('hard-records', "How many Ballon d'Or awards had Lionel Messi won by the end of 2025?", '8', ['7', '9', '6']),

  // ── Firsts ─────────────────────────────────────────────────────────────
  q('hard-firsts', "Who was the first player to win the Ballon d'Or three years in a row?", 'Michel Platini', ['Johan Cruyff', 'Marco van Basten', 'Lionel Messi']),

  // ── World Cup deep cuts ────────────────────────────────────────────────
  q('hard-wc-deep', 'Which country knocked holders Germany out of the 2018 World Cup with a 2-0 group-stage win?', 'South Korea', ['Mexico', 'Sweden', 'Japan']),
  q('hard-wc-deep', 'Which country beat Brazil 2-1 in the 2018 World Cup quarter-finals?', 'Belgium', ['France', 'Croatia', 'Uruguay']),
  q('hard-wc-deep', 'The Netherlands thrashed which team 5-1 at the 2014 World Cup, in a rematch of the 2010 final?', 'Spain', ['Australia', 'Chile', 'Mexico']),
  q('hard-wc-deep', 'Ghana reached the 2010 World Cup quarter-finals by beating which country after extra time?', 'United States', ['South Korea', 'Japan', 'Serbia']),
  q('hard-wc-deep', 'Which African team took Germany to extra time in the 2014 World Cup round of 16?', 'Algeria', ['Nigeria', 'Ghana', 'Ivory Coast']),

  // ── Euros deep cuts ────────────────────────────────────────────────────
  q('hard-euro-deep', 'Who was named Player of the Tournament at Euro 2004?', 'Theodoros Zagorakis', ['Angelos Charisteas', 'Cristiano Ronaldo', 'Milan Baroš']),
  q('hard-euro-deep', 'Who was named Player of the Tournament at Euro 2012?', 'Andrés Iniesta', ['Xavi', 'Andrea Pirlo', 'Cristiano Ronaldo']),
  q('hard-euro-deep', 'Who was named Player of the Tournament at Euro 2016?', 'Antoine Griezmann', ['Cristiano Ronaldo', 'Gareth Bale', 'Dimitri Payet']),
  q('hard-euro-deep', 'Who was named Player of the Tournament at Euro 2020?', 'Gianluigi Donnarumma', ['Jorginho', 'Leonardo Bonucci', 'Federico Chiesa']),
  q('hard-euro-deep', 'Who was named Player of the Tournament at Euro 2024?', 'Rodri', ['Lamine Yamal', 'Dani Olmo', 'Nico Williams']),
  q('hard-euro-deep', 'Greece beat which team with a silver goal in the Euro 2004 semi-finals?', 'Czech Republic', ['France', 'Netherlands', 'Spain']),
  q('hard-euro-deep', "Who scored Greece's silver goal against the Czech Republic at Euro 2004?", 'Traianos Dellas', ['Angelos Charisteas', 'Zisis Vryzas', 'Giorgos Karagounis']),

  // ── Africa and Nigeria deep cuts ───────────────────────────────────────
  q('hard-africa-deep', 'Who scored the only goal of the 2019 Africa Cup of Nations final?', 'Baghdad Bounedjah', ['Riyad Mahrez', 'Islam Slimani', 'Youcef Belaïli']),
  q('hard-africa-deep', "Who scored Senegal's winning penalty in the shoot-out of the AFCON final played in February 2022?", 'Sadio Mané', ['Kalidou Koulibaly', 'Idrissa Gueye', 'Ismaïla Sarr']),
  q('hard-africa-deep', 'Senegal won their first Africa Cup of Nations by beating which country in the final?', 'Egypt', ['Cameroon', 'Burkina Faso', 'Tunisia']),
  q('hard-africa-deep', 'Ivory Coast won the 2015 Africa Cup of Nations by beating which country on penalties?', 'Ghana', ['DR Congo', 'Equatorial Guinea', 'Algeria']),
  q('hard-africa-deep', 'With which club did Vincent Enyeama set a Ligue 1 clean-sheet record in 2013–14?', 'Lille', ['Nice', 'Monaco', 'Marseille']),
  q('hard-africa-deep', 'Which Nigerian was named African Footballer of the Year in both 1996 and 1999?', 'Nwankwo Kanu', ['Jay-Jay Okocha', 'Victor Ikpeba', 'Finidi George']),
  q('hard-africa-deep', 'While at Eintracht Frankfurt in 1993, Jay-Jay Okocha famously dribbled past which goalkeeper twice before scoring?', 'Oliver Kahn', ['Bodo Illgner', 'Andreas Köpke', 'Jens Lehmann']),

  // ── Transfers ──────────────────────────────────────────────────────────
  q('hard-transfers', 'Which club sold Cristiano Ronaldo to Manchester United in 2003?', 'Sporting CP', ['Benfica', 'Porto', 'Nacional']),
  q('hard-transfers', 'Which club sold Luis Suárez to Liverpool in 2011?', 'Ajax', ['Groningen', 'PSV Eindhoven', 'Nacional']),
  q('hard-transfers', 'Paul Pogba rejoined Manchester United in 2016 from which club?', 'Juventus', ['Le Havre', 'Monaco', 'Marseille']),
  q('hard-transfers', 'Eden Hazard joined Chelsea in 2012 from which club?', 'Lille', ['Lyon', 'Lens', 'Tubize']),
  q('hard-transfers', 'Sadio Mané joined Liverpool in 2016 from which club?', 'Southampton', ['Red Bull Salzburg', 'Metz', 'Bayern Munich']),
  q('hard-transfers', 'Riyad Mahrez joined Leicester City in 2014 from which club?', 'Le Havre', ['Quimper', 'Lyon', 'Lille']),
  q('hard-transfers', "N'Golo Kanté joined Leicester City in 2015 from which club?", 'Caen', ['Boulogne', 'Lille', 'Lorient']),
  q('hard-transfers', 'Robert Lewandowski joined Borussia Dortmund in 2010 from which club?', 'Lech Poznań', ['Legia Warsaw', 'Znicz Pruszków', 'Wisła Kraków']),
  q('hard-transfers', 'Erling Haaland joined Borussia Dortmund in January 2020 from which club?', 'Red Bull Salzburg', ['Molde', 'Bryne', 'RB Leipzig']),
  q('hard-transfers', 'Gareth Bale joined Tottenham in 2007 from which club?', 'Southampton', ['Cardiff City', 'Swansea City', 'Bristol City']),
  q('hard-transfers', 'Neymar joined Barcelona in 2013 from which club?', 'Santos', ['São Paulo', 'Flamengo', 'Corinthians']),

  // ── Club history and grounds ───────────────────────────────────────────
  q('hard-club-history', 'Which club played at Upton Park (the Boleyn Ground) until 2016?', 'West Ham United', ['Millwall', 'Charlton Athletic', 'Fulham']),
  q('hard-club-history', 'Which club played at Filbert Street until 2002?', 'Leicester City', ['Derby County', 'Nottingham Forest', 'Coventry City']),
  q('hard-club-history', 'Which club played at Ayresome Park until 1995?', 'Middlesbrough', ['Sunderland', 'Hartlepool United', 'Darlington']),
  q('hard-club-history', 'Which club played at the Baseball Ground until 1997?', 'Derby County', ['Leicester City', 'Stoke City', 'Nottingham Forest']),
  q('hard-club-history', "Which club's home is the Estádio da Luz in Lisbon?", 'Benfica', ['Sporting CP', 'Belenenses', 'Porto']),
  q('hard-club-history', 'Which Spanish club fields only players from the Basque Country or trained there?', 'Athletic Club', ['Real Sociedad', 'Osasuna', 'Eibar']),
  q('hard-club-history', 'Which club had played every Bundesliga season until its first relegation in 2018?', 'Hamburger SV', ['Werder Bremen', 'Bayern Munich', 'Borussia Dortmund']),

  // ── Nicknames ──────────────────────────────────────────────────────────
  q('hard-nicknames', "Which Portuguese club is nicknamed 'Os Leões' (The Lions)?", 'Sporting CP', ['Benfica', 'Porto', 'Braga']),
  q('hard-nicknames', "Which club is nicknamed 'Die Knappen' (The Miners)?", 'Schalke 04', ['Borussia Dortmund', 'VfL Bochum', 'Hertha BSC']),
  q('hard-nicknames', "Which Spanish club is nicknamed 'Los Che'?", 'Valencia', ['Villarreal', 'Levante', 'Sevilla']),
  q('hard-nicknames', "Which club was nicknamed 'The Pensioners' in its early years?", 'Chelsea', ['Fulham', 'Crystal Palace', 'Brentford']),
  q('hard-nicknames', "Which national team is known as 'The Lions of Teranga'?", 'Senegal', ['Cameroon', 'Morocco', 'Guinea']),
  q('hard-nicknames', "Which national team is nicknamed 'Chipolopolo' (Copper Bullets)?", 'Zambia', ['Zimbabwe', 'Malawi', 'Angola']),
  q('hard-nicknames', "Which national team is nicknamed 'The Desert Foxes'?", 'Algeria', ['Tunisia', 'Libya', 'Egypt']),
  q('hard-nicknames', "Which striker was nicknamed 'Batigol'?", 'Gabriel Batistuta', ['Hernán Crespo', 'Claudio Caniggia', 'Ariel Ortega']),
  q('hard-nicknames', "Which legend was nicknamed 'The Galloping Major'?", 'Ferenc Puskás', ['Sándor Kocsis', 'Nándor Hidegkuti', 'Zoltán Czibor']),
  q('hard-nicknames', "Which Brazilian winger was nicknamed 'The Little Bird' and 'The Joy of the People'?", 'Garrincha', ['Didi', 'Zagallo', 'Jairzinho']),
  q('hard-nicknames', "Which Brazilian forward of the 1970 World Cup was nicknamed 'The Hurricane'?", 'Jairzinho', ['Rivelino', 'Tostão', 'Gérson']),

  // ── Rules ──────────────────────────────────────────────────────────────
  q('hard-rules', 'How far does the penalty area extend from the goal line?', '18 yards (16.5 m)', ['16 yards (14.6 m)', '20 yards (18.3 m)', '12 yards (11 m)']),
  q('hard-rules', 'What is the radius of the centre circle?', '10 yards (9.15 m)', ['8 yards (7.32 m)', '12 yards (11 m)', '9 yards (8.23 m)']),
  q('hard-rules', 'Under the law change from 2025, what is awarded when a goalkeeper holds the ball for more than eight seconds?', 'A corner kick', ['An indirect free kick', 'A penalty kick', 'A yellow card']),
]
