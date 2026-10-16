// Hand-written hard Nigerian music questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'nigerian-music',
  questions: [
    // ── Debut albums ─────────────────────────────
    q('hard-debuts', "What was Wizkid's debut studio album?", 'Superstar', ['Ayo', 'Made in Lagos', 'Sounds from the Other Side']),
    q('hard-debuts', "What was Davido's debut studio album?", 'Omo Baba Olowo', ['A Good Time', 'A Better Time', 'Timeless']),
    q('hard-debuts', "What was Burna Boy's debut studio album, released in 2013?", 'L.I.F.E', ['Outside', 'On a Spaceship', 'Redemption']),
    q('hard-debuts', "What was Olamide's debut studio album, released in 2011?", 'Rapsodi', ['YBNL', 'Street OT', 'Baddest Guy Ever Liveth']),
    q('hard-debuts', "What was Asake's debut studio album, released in 2022?", 'Mr. Money with the Vibe', ['Work of Art', 'Lungu Boy', 'Ololade Asake']),
    q('hard-debuts', "What was Wande Coal's debut album, released in 2009?", "Mushin 2 Mo'Hits", ['Wanted', 'Superstar', 'The Entertainer']),

    // ── Labels ─────────────────────────────
    q('hard-labels', "Which label did D'banj and Don Jazzy co-found in 2004?", "Mo' Hits Records", ['Mavin Records', 'Chocolate City', 'Kennis Music']),
    q('hard-labels', 'Which label did Don Jazzy launch in 2012?', 'Mavin Records', ["Mo' Hits Records", 'YBNL Nation', 'DMW']),
    q('hard-labels', 'Which artist founded the YBNL label?', 'Olamide', ['Lil Kesh', 'Phyno', 'Reminisce']),
    q('hard-labels', 'Which artist founded Starboy Entertainment?', 'Wizkid', ['Davido', 'Mr Eazi', 'Burna Boy']),
    q('hard-labels', "Which is Davido's record label?", 'DMW', ['YBNL', 'Starboy', 'Spaceship']),
    q('hard-labels', 'Which artist leads the Spaceship collective?', 'Burna Boy', ['Zlatan', 'Rema', 'Wizkid']),
    q('hard-labels', 'Rema rose to fame signed to which label?', 'Mavin Records', ['YBNL Nation', 'Chocolate City', 'Starboy']),
    q('hard-labels', 'Fireboy DML is signed to which label?', 'YBNL Nation', ['Mavin Records', 'DMW', 'Chocolate City']),

    // ── Real names ─────────────────────────────
    q('hard-real-names', 'Which artist was born Damini Ebunoluwa Ogulu?', 'Burna Boy', ['Davido', 'Wizkid', 'Rema']),
    q('hard-real-names', 'Which artist was born Ayodeji Ibrahim Balogun?', 'Wizkid', ['Davido', 'Wande Coal', 'Mr Eazi']),
    q('hard-real-names', 'Which artist was born Ahmed Ololade?', 'Asake', ['Seyi Vibez', 'Fireboy DML', 'Zinoleesky']),
    q('hard-real-names', 'Which artist was born Michael Collins Ajereh?', 'Don Jazzy', ["D'banj", 'Dr SID', "D'Prince"]),
    q('hard-real-names', 'Which artist was born Oladapo Oyebanjo?', "D'banj", ['Don Jazzy', 'Dr SID', 'Wande Coal']),
    q('hard-real-names', 'Which artist goes by the nickname "Odogwu"?', 'Burna Boy', ['Davido', 'Phyno', 'Flavour']),
    q('hard-real-names', 'Which artist goes by the nickname "OBO"?', 'Davido', ['Wizkid', 'Olamide', 'Peruzzi']),
    q('hard-real-names', 'P-Square are the twins Peter and which brother?', 'Paul', ['Jude', 'James', 'Patrick']),

    // ── Collaborations ─────────────────────────────
    q('hard-collabs', "Which Tems song was sampled on Future's \"Wait for U\"?", 'Higher', ['Free Mind', 'Damages', 'Crazy Tings']),
    q('hard-collabs', 'Tems earned an Oscar nomination for co-writing which song?', 'Lift Me Up', ['Born Again', 'Love Me JeJe', 'Me & U']),
    q('hard-collabs', 'Which American singer featured on the remix of Rema\'s "Calm Down"?', 'Selena Gomez', ['Chris Brown', 'Justin Bieber', 'Ariana Grande']),
    q('hard-collabs', 'Which singer featured on the original version of Wizkid\'s "Essence"?', 'Tems', ['Ayra Starr', 'Simi', 'Tiwa Savage']),
    q('hard-collabs', 'Which Wizkid album contains "Essence"?', 'Made in Lagos', ['Sounds from the Other Side', 'More Love, Less Ego', 'Ayo']),
    q('hard-collabs', 'Wizkid featured on which 2016 Drake global hit?', 'One Dance', ['Hotline Bling', 'Controlla', 'Passionfruit']),
    q('hard-collabs', 'Which UK rapper joined Drake on the remix of Wizkid\'s "Ojuelegba"?', 'Skepta', ['Stormzy', 'Wretch 32', 'Tinie Tempah']),
    q('hard-collabs', 'Who produced Davido\'s 2017 hit "If"?', 'Tekno', ['Kiddominant', 'Sarz', 'Shizzi']),

    // ── Grammys ─────────────────────────────
    q('hard-grammys', 'Which Burna Boy album won the Grammy for Best Global Music Album?', 'Twice as Tall', ['African Giant', 'Love, Damini', 'Outside']),
    q('hard-grammys', 'In which year did Burna Boy win his first Grammy?', '2021', ['2020', '2022', '2019']),
    q('hard-grammys', 'Burna Boy\'s "Ye" appears on which album?', 'Outside', ['African Giant', 'Twice as Tall', 'L.I.F.E']),

    // ── Classics ─────────────────────────────
    q('hard-classics', 'Which group were Eedris Abdulkareem, Tony Tetuila and Eddy Montana part of?', 'The Remedies', ['Plantashun Boiz', 'Styl-Plus', 'Trybesmen']),
    q('hard-classics', 'With which group did 2Baba first find fame?', 'Plantashun Boiz', ['The Remedies', 'Styl-Plus', 'Trybesmen']),
    q('hard-classics', 'Which drummer co-created Afrobeat alongside Fela Kuti?', 'Tony Allen', ['Femi Kuti', 'Ginger Baker', 'Seun Kuti']),
    q('hard-classics', 'King Sunny Adé is the best-known star of which genre?', 'Jùjú', ['Fuji', 'Highlife', 'Apala']),
    q('hard-classics', 'Sikiru Ayinde Barrister is credited with creating which genre?', 'Fuji', ['Jùjú', 'Apala', 'Waka']),
    q('hard-classics', 'Haruna Ishola was a leading star of which genre?', 'Apala', ['Fuji', 'Jùjú', 'Sakara']),
    q('hard-classics', 'Who sang the 1976 highlife classic "Sweet Mother"?', 'Prince Nico Mbarga', ['Oliver De Coque', 'Osita Osadebe', 'Victor Uwaifo']),
    q('hard-classics', 'Which highlife great was known as "Cardinal"?', 'Rex Lawson', ['Victor Olaiya', 'Osita Osadebe', 'Celestine Ukwu']),
    q('hard-classics', 'Who was called "the Evil Genius of Highlife"?', 'Victor Olaiya', ['Rex Lawson', 'Bobby Benson', 'Victor Uwaifo']),
    q('hard-classics', "Which singer is Femi Kuti's son?", 'Made Kuti', ['Seun Kuti', 'Fela Kuti', 'Yeni Kuti']),

    // ── Hits ─────────────────────────────
    q('hard-hits', 'Which artist released the 2016 hit "Wo!!"?', 'Olamide', ['Phyno', 'Lil Kesh', 'Reminisce']),
    q('hard-hits', 'Which artist released "Rush" in 2022?', 'Ayra Starr', ['Tems', 'Simi', 'Yemi Alade']),
    q('hard-hits', "What was Yemi Alade's 2014 breakout hit?", 'Johnny', ['Kissing', 'Ferrari', 'Shekere']),
    q('hard-hits', 'Which artist sang "Ojuelegba" (2014)?', 'Wizkid', ['Olamide', 'Davido', 'Phyno']),
    q('hard-hits', "What was Adekunle Gold's 2015 breakout single?", 'Sade', ['Orente', 'Pick Up', 'Ire']),
    q('hard-hits', 'Which CKay song went viral on TikTok in 2021?', 'Love Nwantiti', ['Emiliana', 'Felony', 'Watawi']),
    q('hard-hits', 'Which artist released "Joro" in 2019?', 'Wizkid', ['Davido', 'Burna Boy', 'Rema']),
    q('hard-hits', 'Which artist released "Dumebi" in 2019?', 'Rema', ['Fireboy DML', 'Joeboy', 'Oxlade']),
    q('hard-hits', 'Which artist sang "African Queen" (2004)?', '2face Idibia', ["D'banj", 'P-Square', 'Eedris Abdulkareem']),
    q('hard-hits', 'In 2019, Tiwa Savage signed a global deal with which music company?', 'Universal Music Group', ['Def Jam', 'Sony Music', 'Atlantic Records']),
  ],
}
