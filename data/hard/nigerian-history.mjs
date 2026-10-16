// Hand-written hard Nigerian history questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'nigerian-history',
  questions: [
    // ── Independence and republics ─────────────────────────────
    q('hard-independence', 'In which year were the Northern and Southern Protectorates amalgamated?', '1914', ['1900', '1906', '1922']),
    q('hard-independence', 'Who was the first Nigerian to serve as Governor-General?', 'Nnamdi Azikiwe', ['Tafawa Balewa', 'Obafemi Awolowo', 'Ahmadu Bello']),
    q('hard-independence', "Who was Nigeria's only Prime Minister?", 'Tafawa Balewa', ['Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello']),
    q('hard-independence', 'In which year did Nigeria become a republic?', '1963', ['1960', '1962', '1966']),
    q('hard-independence', 'Who is called the father of Nigerian nationalism?', 'Herbert Macaulay', ['Nnamdi Azikiwe', 'Obafemi Awolowo', 'Anthony Enahoro']),
    q('hard-independence', 'Who moved the 1953 motion calling for self-government?', 'Anthony Enahoro', ['Obafemi Awolowo', 'Nnamdi Azikiwe', 'Ahmadu Bello']),
    q('hard-independence', 'Which party did Obafemi Awolowo found in 1951?', 'Action Group', ['NCNC', 'NPC', 'NEPU']),
    q('hard-independence', 'Which traditional title did Ahmadu Bello hold?', 'Sardauna of Sokoto', ['Sultan of Sokoto', 'Emir of Kano', 'Waziri of Sokoto']),
    q('hard-independence', 'Which party was led by Aminu Kano?', 'NEPU', ['NPC', 'NCNC', 'Action Group']),
    q('hard-independence', 'Which city was the capital of the old Northern Region?', 'Kaduna', ['Kano', 'Sokoto', 'Zaria']),
    q('hard-independence', 'Which city was the capital of the old Eastern Region?', 'Enugu', ['Port Harcourt', 'Onitsha', 'Aba']),
    q('hard-independence', "Which of these was NOT one of Nigeria's three regions at independence?", 'Mid-Western Region', ['Northern Region', 'Eastern Region', 'Western Region']),

    // ── Military era and civil war ─────────────────────────────
    q('hard-military', "In which year did Nigeria's first military coup take place?", '1966', ['1965', '1967', '1975']),
    q('hard-military', 'Who became head of state after the January 1966 coup?', 'Johnson Aguiyi-Ironsi', ['Yakubu Gowon', 'Murtala Mohammed', 'Olusegun Obasanjo']),
    q('hard-military', 'In which year did the Nigerian Civil War begin?', '1967', ['1966', '1968', '1965']),
    q('hard-military', 'In which year did the Nigerian Civil War end?', '1970', ['1969', '1971', '1968']),
    q('hard-military', 'Who declared the Republic of Biafra?', 'Odumegwu Ojukwu', ['Philip Effiong', 'Nnamdi Azikiwe', 'Alex Ekwueme']),
    q('hard-military', "Who announced Biafra's surrender in January 1970?", 'Philip Effiong', ['Odumegwu Ojukwu', 'Alexander Madiebo', 'Christopher Okigbo']),
    q('hard-military', 'Which head of state was assassinated in February 1976?', 'Murtala Mohammed', ['Johnson Aguiyi-Ironsi', 'Yakubu Gowon', 'Sani Abacha']),
    q('hard-military', 'Which military ruler handed power to an elected civilian government in 1979?', 'Olusegun Obasanjo', ['Yakubu Gowon', 'Murtala Mohammed', 'Ibrahim Babangida']),
    q('hard-military', 'In which year did Sani Abacha die?', '1998', ['1997', '1999', '1996']),
    q('hard-military', 'Who succeeded Sani Abacha as head of state?', 'Abdulsalami Abubakar', ['Oladipo Diya', 'Jerry Useni', 'Ibrahim Babangida']),
    q('hard-military', 'Who headed the Interim National Government in 1993?', 'Ernest Shonekan', ['Sani Abacha', 'Bashir Tofa', 'Ibrahim Babangida']),

    // ── Elections and democracy ─────────────────────────────
    q('hard-democracy', 'Who was president of the Second Republic?', 'Shehu Shagari', ['Alex Ekwueme', 'Nnamdi Azikiwe', 'Obafemi Awolowo']),
    q('hard-democracy', "Who was Shehu Shagari's vice president?", 'Alex Ekwueme', ['Umaru Dikko', 'Obafemi Awolowo', 'Joseph Wayas']),
    q('hard-democracy', 'On which date was the famous 1993 presidential election held?', 'June 12', ['May 29', 'October 1', 'June 4']),
    q('hard-democracy', 'Who was the presumed winner of the annulled 1993 election?', 'MKO Abiola', ['Bashir Tofa', 'Ernest Shonekan', 'Olu Falae']),
    q('hard-democracy', "Who was MKO Abiola's opponent in the 1993 election?", 'Bashir Tofa', ['Olu Falae', 'Ernest Shonekan', "Shehu Yar'Adua"]),
    q('hard-democracy', 'On which date did Nigeria return to civilian rule in 1999?', 'May 29', ['June 12', 'October 1', 'January 15']),
    q('hard-democracy', 'Which president died in office in 2010?', "Umaru Yar'Adua", ['Shehu Shagari', 'Olusegun Obasanjo', 'Goodluck Jonathan']),
    q('hard-democracy', 'Who was the first incumbent president to lose an election, in 2015?', 'Goodluck Jonathan', ['Olusegun Obasanjo', "Umaru Yar'Adua", 'Shehu Shagari']),

    // ── States ─────────────────────────────
    q('hard-states', 'How many states did Yakubu Gowon create in 1967?', '12', ['19', '21', '10']),
    q('hard-states', 'How many states did Murtala Mohammed create in 1976?', '19', ['21', '12', '30']),
    q('hard-states', 'Six new states in 1996 brought the total to how many?', '36', ['30', '33', '37']),
    q('hard-states', 'Which state was carved out of Ondo State in 1996?', 'Ekiti', ['Osun', 'Kogi', 'Edo']),
    q('hard-states', 'Bayelsa State was created out of which state?', 'Rivers', ['Delta', 'Akwa Ibom', 'Cross River']),
    q('hard-states', 'Akwa Ibom State was created out of which state in 1987?', 'Cross River', ['Rivers', 'Imo', 'Abia']),

    // ── Kingdoms and empires ─────────────────────────────
    q('hard-kingdoms', 'Who founded the Sokoto Caliphate?', 'Usman dan Fodio', ['Muhammad Bello', 'Ahmadu Bello', 'Abdullahi dan Fodio']),
    q('hard-kingdoms', "In which year did Usman dan Fodio's jihad begin?", '1804', ['1800', '1810', '1796']),
    q('hard-kingdoms', 'Which kingdom made the famous bronzes looted by the British in 1897?', 'Benin', ['Oyo', 'Ife', 'Nri']),
    q('hard-kingdoms', 'Which Oba of Benin was exiled after the 1897 British expedition?', 'Ovonramwen', ['Ewuare', 'Esigie', 'Akenzua']),
    q('hard-kingdoms', 'Which ancient culture, named after a village in southern Kaduna, made terracotta heads?', 'Nok', ['Igbo-Ukwu', 'Ife', 'Benin']),
    q('hard-kingdoms', 'Roughly which century are the Igbo-Ukwu bronzes dated to?', '9th century', ['13th century', '15th century', '5th century']),
    q('hard-kingdoms', 'What was the title of the king of the Oyo Empire?', 'Alaafin', ['Ooni', 'Oba', 'Olu']),

    // ── Social and economic history ─────────────────────────────
    q('hard-society', 'Which 1929 uprising by Igbo and Ibibio women protested colonial taxation?', "Aba Women's War", ["Egba Women's Revolt", 'Ogoni Uprising', 'Iva Valley Strike']),
    q('hard-society', "Who led the Egba (Abeokuta) Women's Revolt of the 1940s?", 'Funmilayo Ransome-Kuti', ['Margaret Ekpo', 'Gambo Sawaba', 'Flora Nwapa']),
    q('hard-society', 'Where was crude oil first found in commercial quantities in 1956?', 'Oloibiri', ['Bonny', 'Ogoni', 'Eket']),
    q('hard-society', 'In which year did Nigeria join OPEC?', '1971', ['1965', '1973', '1960']),
    q('hard-society', 'Which activist was executed with eight other Ogoni men in 1995?', 'Ken Saro-Wiwa', ['Ledum Mitee', 'Gani Fawehinmi', 'Beko Ransome-Kuti']),
    q('hard-society', 'In which year did Nigeria host FESTAC, the World Black Festival of Arts?', '1977', ['1975', '1979', '1973']),
    q('hard-society', 'Which country was handed the Bakassi Peninsula?', 'Cameroon', ['Equatorial Guinea', 'Benin', 'Gabon']),
    q('hard-society', 'In which year did the International Court of Justice rule on Bakassi?', '2002', ['2006', '1998', '2008']),
  ],
}
