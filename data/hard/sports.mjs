// Hand-written hard sports questions (2026-10), football left to its own
// category. Plausible decoys, settled facts only; records pinned to a date.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'sports',
  questions: [
    // ── Athletics ─────────────────────────────
    q('hard-athletics', 'In which city did Usain Bolt run his 9.58 world record in 2009?', 'Berlin', ['Beijing', 'London', 'Osaka']),
    q('hard-athletics', "As of 2025, what is the men's 100m world record?", '9.58', ['9.63', '9.69', '9.72']),
    q('hard-athletics', "As of 2025, who holds the women's 100m world record?", 'Florence Griffith-Joyner', ['Shelly-Ann Fraser-Pryce', 'Elaine Thompson-Herah', 'Marion Jones']),
    q('hard-athletics', 'Which Nigerian won Olympic long jump gold at Atlanta 1996?', 'Chioma Ajunwa', ['Blessing Okagbare', 'Mary Onyali', 'Glory Alozie']),
    q('hard-athletics', 'Which Nigerian won the 2022 world 100m hurdles title with a world record?', 'Tobi Amusan', ['Blessing Okagbare', 'Ese Brume', 'Favour Ofili']),
    q('hard-athletics', 'What time did Tobi Amusan set as the 100m hurdles world record in 2022?', '12.12', ['12.20', '12.06', '12.26']),
    q('hard-athletics', 'Which Nigerian won a long jump bronze medal at the Tokyo 2020 Olympics?', 'Ese Brume', ['Chioma Ajunwa', 'Blessing Okagbare', 'Tobi Amusan']),
    q('hard-athletics', 'Who was the first man to run a mile in under four minutes?', 'Roger Bannister', ['John Landy', 'Sebastian Coe', 'Jim Ryun']),
    q('hard-athletics', 'Who became the first person to run a marathon in under two hours, in 2019?', 'Eliud Kipchoge', ['Kelvin Kiptum', 'Kenenisa Bekele', 'Haile Gebrselassie']),

    // ── Combat sports ─────────────────────────────
    q('hard-combat', 'Who did Muhammad Ali beat in the "Rumble in the Jungle"?', 'George Foreman', ['Joe Frazier', 'Sonny Liston', 'Ken Norton']),
    q('hard-combat', 'In which city was the "Rumble in the Jungle" held?', 'Kinshasa', ['Lagos', 'Nairobi', 'Accra']),
    q('hard-combat', 'Which boxer of Nigerian descent won Olympic super-heavyweight gold in 2012?', 'Anthony Joshua', ['Joe Joyce', 'Dillian Whyte', 'Efe Ajagba']),
    q('hard-combat', "Who was Nigeria's first world boxing champion?", 'Hogan Bassey', ['Dick Tiger', 'Samuel Peter', 'Bash Ali']),
    q('hard-combat', 'What is Kamaru Usman\'s fighting nickname?', 'The Nigerian Nightmare', ['The Last Stylebender', 'The Predator', 'The Notorious']),
    q('hard-combat', 'What is Israel Adesanya\'s fighting nickname?', 'The Last Stylebender', ['The Nigerian Nightmare', 'The Predator', 'The Notorious']),
    q('hard-combat', 'Which UFC heavyweight champion was born in Cameroon?', 'Francis Ngannou', ['Kamaru Usman', 'Israel Adesanya', 'Sodiq Yusuff']),

    // ── Basketball ─────────────────────────────
    q('hard-basketball', 'Which team drafted Hakeem Olajuwon first overall in 1984?', 'Houston Rockets', ['Portland Trail Blazers', 'Chicago Bulls', 'Philadelphia 76ers']),
    q('hard-basketball', 'Who was drafted second in 1984, one pick ahead of Michael Jordan?', 'Sam Bowie', ['Charles Barkley', 'John Stockton', 'Patrick Ewing']),
    q('hard-basketball', "From which country did Giannis Antetokounmpo's parents emigrate to Greece?", 'Nigeria', ['Ghana', 'Senegal', 'Cameroon']),
    q('hard-basketball', 'As of 2025, who is the NBA\'s all-time leading scorer?', 'LeBron James', ['Kareem Abdul-Jabbar', 'Karl Malone', 'Kobe Bryant']),
    q('hard-basketball', 'How many points did Wilt Chamberlain score in a single NBA game in 1962?', '100', ['81', '92', '73']),
    q('hard-basketball', 'How many NBA championships did Michael Jordan win?', '6', ['5', '4', '7']),
    q('hard-basketball', 'With which team did Michael Jordan end his playing career?', 'Washington Wizards', ['Chicago Bulls', 'Charlotte Hornets', 'Miami Heat']),

    // ── Tennis ─────────────────────────────
    q('hard-tennis', "As of 2025, who has won the most men's Grand Slam singles titles?", 'Novak Djokovic', ['Rafael Nadal', 'Roger Federer', 'Pete Sampras']),
    q('hard-tennis', 'How many French Open singles titles did Rafael Nadal win?', '14', ['12', '13', '15']),
    q('hard-tennis', "Who won the most women's Grand Slam singles titles of the Open Era?", 'Serena Williams', ['Steffi Graf', 'Martina Navratilova', 'Chris Evert']),
    q('hard-tennis', 'Which Grand Slam tournament is played on clay?', 'French Open', ['Wimbledon', 'US Open', 'Australian Open']),
    q('hard-tennis', 'Which Grand Slam tournament is played first each year?', 'Australian Open', ['French Open', 'Wimbledon', 'US Open']),

    // ── Motorsport and golf ─────────────────────────────
    q('hard-motor-golf', 'As of 2025, how many F1 world titles has Lewis Hamilton won?', '7', ['6', '8', '5']),
    q('hard-motor-golf', 'Which F1 team did Lewis Hamilton join for the 2025 season?', 'Ferrari', ['Red Bull', 'McLaren', 'Aston Martin']),
    q('hard-motor-golf', 'Who won the 2021 Formula One drivers\' championship?', 'Max Verstappen', ['Lewis Hamilton', 'Valtteri Bottas', 'Sergio Pérez']),
    q('hard-motor-golf', 'How many major championships has Tiger Woods won?', '15', ['14', '18', '13']),
    q('hard-motor-golf', "Who holds the record for the most men's golf majors?", 'Jack Nicklaus', ['Tiger Woods', 'Arnold Palmer', 'Gary Player']),
    q('hard-motor-golf', 'In golf, what is a score of two under par on a hole?', 'Eagle', ['Birdie', 'Albatross', 'Bogey']),
    q('hard-motor-golf', 'In golf, what is a score of three under par on a hole?', 'Albatross', ['Eagle', 'Condor', 'Birdie']),

    // ── Olympics ─────────────────────────────
    q('hard-olympics', 'Which city will host the 2028 Summer Olympics?', 'Los Angeles', ['Brisbane', 'Paris', 'Madrid']),
    q('hard-olympics', 'Which city will host the 2032 Summer Olympics?', 'Brisbane', ['Los Angeles', 'Doha', 'Madrid']),
    q('hard-olympics', 'Who has won the most Olympic medals of all time?', 'Michael Phelps', ['Larisa Latynina', 'Usain Bolt', 'Carl Lewis']),
    q('hard-olympics', 'How many Olympic gold medals did Michael Phelps win?', '23', ['18', '21', '28']),
    q('hard-olympics', 'Which Nigerian table tennis star reached the Rio 2016 Olympic quarter-finals?', 'Quadri Aruna', ['Segun Toriola', 'Bode Abiodun', 'Olajide Omotayo']),
    q('hard-olympics', 'In which city were the 2024 Summer Olympics held?', 'Paris', ['London', 'Los Angeles', 'Rome']),

    // ── Cricket and rugby ─────────────────────────────
    q('hard-cricket-rugby', 'How many balls are bowled in a standard cricket over?', 'Six', ['Five', 'Eight', 'Ten']),
    q('hard-cricket-rugby', 'Which team won the first Cricket World Cup in 1975?', 'West Indies', ['Australia', 'England', 'India']),
    q('hard-cricket-rugby', 'As of 2023, which country has won the most Rugby World Cups?', 'South Africa', ['New Zealand', 'Australia', 'England']),
    q('hard-cricket-rugby', 'Which country won the 2011 Cricket World Cup on home soil?', 'India', ['Sri Lanka', 'Australia', 'Pakistan']),
    q('hard-cricket-rugby', 'Which famous trophy is contested in Test cricket between England and Australia?', 'The Ashes', ['The Wisden Trophy', 'The Frank Worrell Trophy', 'The Basil D\'Oliveira Trophy']),
    q('hard-cricket-rugby', 'Which country won the first Rugby World Cup in 1987?', 'New Zealand', ['Australia', 'South Africa', 'France']),
    q('hard-motor-golf', 'In which sport is the Ryder Cup contested?', 'Golf', ['Tennis', 'Polo', 'Sailing']),
    q('hard-tennis', 'As of 2025, which country has won the most Davis Cup titles?', 'United States', ['Australia', 'France', 'Spain']),
    q('hard-athletics', 'In which event would you perform a Fosbury Flop?', 'High jump', ['Pole vault', 'Diving', 'Gymnastics']),
  ],
}
