// Hand-written hard Game of Thrones questions (2026-10). Show facts unless
// a question says "in the books". Plausible decoys, settled facts only.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'got',
  questions: [
    // ── Houses ─────────────────────────────
    q('hard-houses', 'What are the words of House Greyjoy?', 'We Do Not Sow', ['Ours Is the Fury', 'Growing Strong', 'Hear Me Roar']),
    q('hard-houses', 'What are the words of House Tyrell?', 'Growing Strong', ['Hear Me Roar', 'Ours Is the Fury', 'As High as Honor']),
    q('hard-houses', 'What are the words of House Baratheon?', 'Ours Is the Fury', ['Growing Strong', 'We Do Not Sow', 'Hear Me Roar']),
    q('hard-houses', "Which house's sigil is a kraken?", 'Greyjoy', ['Tully', 'Arryn', 'Martell']),
    q('hard-houses', "Which house's sigil is a flayed man?", 'Bolton', ['Frey', 'Karstark', 'Umber']),
    q('hard-houses', "Which house's sigil is a leaping trout?", 'Tully', ['Frey', 'Arryn', 'Mormont']),
    q('hard-houses', 'Which castle is the ancestral seat of House Lannister?', 'Casterly Rock', ["Storm's End", 'Highgarden', 'Riverrun']),
    q('hard-houses', 'Which castle is the seat of House Arryn?', 'The Eyrie', ['Riverrun', 'Pyke', 'Sunspear']),
    q('hard-houses', 'Which castle is the seat of House Greyjoy?', 'Pyke', ['Harrenhal', 'Dragonstone', 'Sunspear']),
    q('hard-houses', 'Which castle is the seat of House Baratheon?', "Storm's End", ['Casterly Rock', 'Highgarden', 'Dragonstone']),

    // ── Swords ─────────────────────────────
    q('hard-swords', 'Who forged Arya\'s sword Needle?', 'Mikken', ['Gendry', 'Tobho Mott', 'Donal Noye']),
    q('hard-swords', "What is the name of Jon Snow's Valyrian steel sword?", 'Longclaw', ['Ice', 'Heartsbane', 'Oathkeeper']),
    q('hard-swords', 'Heartsbane is the ancestral sword of which house?', 'Tarly', ['Tyrell', 'Dayne', 'Mormont']),
    q('hard-swords', 'Which sword did Jaime Lannister give to Brienne?', 'Oathkeeper', ["Widow's Wail", 'Longclaw', 'Dawn']),
    q('hard-swords', "What was Joffrey's sword, forged from Ice, called?", "Widow's Wail", ['Oathkeeper', "Lion's Tooth", 'Hearteater']),

    // ── Deaths ─────────────────────────────
    q('hard-deaths', 'Who killed the Night King?', 'Arya Stark', ['Jon Snow', 'Bran Stark', 'Daenerys Targaryen']),
    q('hard-deaths', 'Who confessed to Jaime that she poisoned Joffrey?', 'Olenna Tyrell', ['Margaery Tyrell', 'Cersei Lannister', 'Sansa Stark']),
    q('hard-deaths', 'Who killed Tywin Lannister?', 'Tyrion Lannister', ['Jaime Lannister', 'Varys', 'Bronn']),
    q('hard-deaths', 'Who executed Petyr Baelish at Winterfell?', 'Arya Stark', ['Sansa Stark', 'Bran Stark', 'Brienne of Tarth']),
    q('hard-deaths', "Who sentenced Ramsay Bolton to be eaten by his own hounds?", 'Sansa Stark', ['Jon Snow', 'Arya Stark', 'Theon Greyjoy']),
    q('hard-deaths', 'Who killed Oberyn Martell in their trial by combat?', 'Gregor Clegane', ['Sandor Clegane', 'Jaime Lannister', 'Meryn Trant']),
    q('hard-deaths', 'Who killed Robb Stark at the Red Wedding?', 'Roose Bolton', ['Walder Frey', 'Black Walder', 'Lothar Frey']),
    q('hard-deaths', 'Who led the mutiny that killed Jon Snow, saying "For the Watch"?', 'Alliser Thorne', ['Olly', 'Bowen Marsh', 'Janos Slynt']),
    q('hard-deaths', 'Who brought Jon Snow back to life?', 'Melisandre', ['Thoros of Myr', 'Bran Stark', 'Qyburn']),

    // ── Dragons and Essos ─────────────────────────────
    q('hard-essos', "What is the name of Daenerys's largest dragon?", 'Drogon', ['Rhaegal', 'Viserion', 'Balerion']),
    q('hard-essos', 'Which dragon did the Night King raise as an ice dragon?', 'Viserion', ['Rhaegal', 'Drogon', 'Vhagar']),
    q('hard-essos', 'Which dragon does Jon Snow ride?', 'Rhaegal', ['Viserion', 'Drogon', 'Syrax']),
    q('hard-essos', "What was the name of Daenerys's first husband?", 'Khal Drogo', ['Khal Moro', 'Khal Jhaqo', 'Daario Naharis']),
    q('hard-essos', "Who was Daenerys's trusted translator and adviser?", 'Missandei', ['Doreah', 'Irri', 'Jhiqui']),
    q('hard-essos', 'Who commands the Unsullied?', 'Grey Worm', ['Daario Naharis', 'Barristan Selmy', 'Jorah Mormont']),
    q('hard-essos', 'In which city does Daenerys acquire the Unsullied?', 'Astapor', ['Yunkai', 'Meereen', 'Qarth']),
    q('hard-essos', 'Which city does Daenerys rule for several seasons in Slaver\'s Bay?', 'Meereen', ['Astapor', 'Yunkai', 'Volantis']),

    // ── Characters ─────────────────────────────
    q('hard-characters', 'Who is named king at the end of the show?', 'Bran Stark', ['Jon Snow', 'Tyrion Lannister', 'Sansa Stark']),
    q('hard-characters', 'What title does Sansa take in the final episode?', 'Queen in the North', ['Lady of Winterfell', 'Warden of the North', 'Lady Paramount']),
    q('hard-characters', "What is Jon Snow's true name, revealed in season 7?", 'Aegon Targaryen', ['Rhaegar Targaryen', 'Viserys Targaryen', 'Daeron Targaryen']),
    q('hard-characters', "Whose death leads Ned Stark to become Hand of the King?", 'Jon Arryn', ['Robert Baratheon', 'Stannis Baratheon', 'Tywin Lannister']),
    q('hard-characters', 'Which god does Melisandre serve?', 'The Lord of Light', ['The Many-Faced God', 'The Drowned God', 'The Seven']),
    q('hard-characters', 'Which god do the Faceless Men serve?', 'The Many-Faced God', ['The Lord of Light', 'The Drowned God', 'The Old Gods']),
    q('hard-characters', 'Which Faceless Man does Arya first meet on the road to Harrenhal?', "Jaqen H'ghar", ['Syrio Forel', 'Gendry', 'Hot Pie']),
    q('hard-characters', 'Who was Arya\'s "dancing master" in season 1?', 'Syrio Forel', ["Jaqen H'ghar", 'Rodrik Cassel', 'Barristan Selmy']),
    q('hard-characters', "Who was Lord Commander of the Night's Watch when Jon joined?", 'Jeor Mormont', ['Alliser Thorne', 'Benjen Stark', 'Aemon Targaryen']),
    q('hard-characters', 'Maester Aemon of Castle Black was born into which house?', 'Targaryen', ['Stark', 'Tarly', 'Baratheon']),

    // ── The show and the books ─────────────────────────────
    q('hard-production', 'In which year did Game of Thrones premiere on HBO?', '2011', ['2010', '2012', '2009']),
    q('hard-production', 'How many Emmys did Peter Dinklage win for playing Tyrion?', '4', ['3', '2', '5']),
    q('hard-production', 'Which episode of season 6 is "Battle of the Bastards"?', 'Episode 9', ['Episode 10', 'Episode 8', 'Episode 7']),
    q('hard-production', 'In the books, which novel contains the Red Wedding?', 'A Storm of Swords', ['A Clash of Kings', 'A Feast for Crows', 'A Dance with Dragons']),
    q('hard-production', 'Which Game of Thrones prequel series premiered in 2022?', 'House of the Dragon', ['A Knight of the Seven Kingdoms', 'Blood of My Blood', 'The Long Night']),
    q('hard-production', 'How many seasons did Game of Thrones run for?', '8', ['7', '9', '10']),
    q('hard-production', 'Where were the Winterfell exteriors in season 1 mainly filmed?', 'Northern Ireland', ['Scotland', 'Iceland', 'Croatia']),
    q('hard-production', 'Which Croatian city stood in for King\'s Landing?', 'Dubrovnik', ['Split', 'Zagreb', 'Zadar']),
  ],
}
