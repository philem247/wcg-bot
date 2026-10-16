// Hand-written hard movies questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'movies',
  questions: [
    // ── Oscars ─────────────────────────────
    q('hard-oscars', 'Which film won the very first Academy Award for Best Picture?', 'Wings', ['Sunrise', 'The Jazz Singer', '7th Heaven']),
    q('hard-oscars', 'Which was the first non-English-language film to win Best Picture?', 'Parasite', ['Roma', 'Amour', 'Life Is Beautiful']),
    q('hard-oscars', 'Who was the first Black woman to win the Oscar for Best Actress?', 'Halle Berry', ['Whoopi Goldberg', 'Viola Davis', "Lupita Nyong'o"]),
    q('hard-oscars', 'Which Steven Spielberg film received 11 Oscar nominations but won none?', 'The Color Purple', ['Empire of the Sun', 'Amistad', 'War Horse']),
    q('hard-oscars', 'Which of these films did NOT win 11 Academy Awards?', 'West Side Story', ['Titanic', 'Ben-Hur', 'The Return of the King']),
    q('hard-oscars', 'Who is the youngest winner of the Oscar for Best Actress?', 'Marlee Matlin', ['Jennifer Lawrence', 'Audrey Hepburn', 'Grace Kelly']),
    q('hard-oscars', 'As of 2025, who has won the most Academy Awards for acting?', 'Katharine Hepburn', ['Meryl Streep', 'Jack Nicholson', 'Daniel Day-Lewis']),
    q('hard-oscars', 'Which actor of Nigerian descent was nominated for Best Actor for 12 Years a Slave?', 'Chiwetel Ejiofor', ['David Oyelowo', 'John Boyega', 'Daniel Kaluuya']),
    q('hard-oscars', 'Daniel Kaluuya won his Oscar for playing which character?', 'Fred Hampton', ['Chris Washington', 'OJ Haywood', "W'Kabi"]),
    q('hard-oscars', "For which film did Lupita Nyong'o win her Oscar?", '12 Years a Slave', ['Black Panther', 'Us', 'Queen of Katwe']),
    q('hard-oscars', 'Which film beat Pulp Fiction to Best Picture at the 1995 Oscars?', 'Forrest Gump', ['The Shawshank Redemption', 'Quiz Show', 'Four Weddings and a Funeral']),

    // ── Which year ─────────────────────────────
    q('hard-year', 'In which year was the first Star Wars film released?', '1977', ['1976', '1979', '1980']),
    q('hard-year', "In which year was James Cameron's Titanic released?", '1997', ['1996', '1998', '1999']),
    q('hard-year', 'In which year was the first Harry Potter film released?', '2001', ['2000', '2002', '2003']),
    q('hard-year', "In which year was Spielberg's Jurassic Park released?", '1993', ['1992', '1994', '1995']),
    q('hard-year', 'In which year was Toy Story, the first fully computer-animated feature, released?', '1995', ['1994', '1996', '1993']),
    q('hard-year', "In which year was Marvel's first Avengers film released?", '2012', ['2011', '2013', '2010']),
    q('hard-year', 'In which year was Black Panther released in cinemas?', '2018', ['2017', '2019', '2016']),

    // ── Directors ─────────────────────────────
    q('hard-directors', 'Who directed the 1975 shark thriller Jaws?', 'Steven Spielberg', ['George Lucas', 'Brian De Palma', 'John Carpenter']),
    q('hard-directors', 'Who directed both Black Panther films?', 'Ryan Coogler', ['Jordan Peele', 'Barry Jenkins', 'F. Gary Gray']),
    q('hard-directors', 'Who directed Moonlight, the Best Picture winner announced after the La La Land mix-up?', 'Barry Jenkins', ['Jordan Peele', 'Damien Chazelle', 'Steve McQueen']),
    q('hard-directors', 'Who directed The Lord of the Rings film trilogy?', 'Peter Jackson', ['Guillermo del Toro', 'Sam Raimi', 'Chris Columbus']),
    q('hard-directors', 'Who directed the 2013 space thriller Gravity?', 'Alfonso Cuarón', ['Alejandro G. Iñárritu', 'Guillermo del Toro', 'Ridley Scott']),
    q('hard-directors', 'Who directed Selma (2014)?', 'Ava DuVernay', ['Lee Daniels', 'Gina Prince-Bythewood', 'Kasi Lemmons']),
    q('hard-directors', 'Who directed Boyz n the Hood (1991)?', 'John Singleton', ['Spike Lee', 'F. Gary Gray', 'Antoine Fuqua']),
    q('hard-directors', 'Which director made both Alien and Gladiator?', 'Ridley Scott', ['Tony Scott', 'James Cameron', 'Ron Howard']),

    // ── Film facts ─────────────────────────────
    q('hard-film-facts', 'Which was the first feature-length "talkie" with synchronised dialogue?', 'The Jazz Singer', ['Wings', 'Metropolis', 'The Broadway Melody']),
    q('hard-film-facts', "What was Disney's first full-length animated feature?", 'Snow White', ['Pinocchio', 'Fantasia', 'Bambi']),
    q('hard-film-facts', 'Which Fast & Furious film was the first to feature Dwayne Johnson?', 'Fast Five', ['Furious 7', 'Fast & Furious', 'Tokyo Drift']),
    q('hard-film-facts', 'In The Godfather, what does film producer Jack Woltz wake up to find in his bed?', "A horse's head", ['A dead fish', 'A severed hand', 'A bloody knife']),
    q('hard-film-facts', 'What is the name of the hotel in The Shining?', 'The Overlook', ['The Stanley', 'The Bates', 'The Grand Budapest']),
    q('hard-film-facts', 'Who voiced Mufasa in the 1994 Lion King?', 'James Earl Jones', ['Morgan Freeman', 'Samuel L. Jackson', 'Danny Glover']),
    q('hard-film-facts', 'Which film features the mysterious criminal Keyser Söze?', 'The Usual Suspects', ['Se7en', 'Memento', 'Fight Club']),
    q('hard-film-facts', 'In Citizen Kane, what turns out to be "Rosebud"?', 'A sled', ['A horse', 'A woman', 'A house']),
    q('hard-film-facts', 'In Back to the Future, what speed must the DeLorean reach to time travel?', '88 mph', ['77 mph', '99 mph', '121 mph']),
    q('hard-film-facts', 'How many Infinity Stones are there in the Marvel films?', 'Six', ['Five', 'Seven', 'Eight']),
    q('hard-film-facts', 'Which actor won a posthumous Oscar for playing the Joker?', 'Heath Ledger', ['Joaquin Phoenix', 'Jack Nicholson', 'Jared Leto']),
    q('hard-film-facts', 'Which film regained the title of highest-grossing film of all time in 2021?', 'Avatar', ['Titanic', 'Avengers: Endgame', 'The Force Awakens']),
    q('hard-film-facts', 'In which 2022 film does Viola Davis lead the Agojie warriors of Dahomey?', 'The Woman King', ['Harriet', 'Fences', 'Widows']),
    q('hard-film-facts', 'John Boyega made his feature film debut in which 2011 film?', 'Attack the Block', ['Detroit', 'Pacific Rim Uprising', 'Imperial Dreams']),

    // ── Odd one out ─────────────────────────────
    q('hard-odd-one-out', 'Which of these films was NOT directed by Christopher Nolan?', 'Shutter Island', ['Memento', 'Interstellar', 'Dunkirk']),
    q('hard-odd-one-out', 'Which of these films was NOT directed by Quentin Tarantino?', 'Snatch', ['Jackie Brown', 'Death Proof', 'Django Unchained']),
    q('hard-odd-one-out', 'Which of these actors has NEVER played James Bond?', 'Clive Owen', ['Timothy Dalton', 'George Lazenby', 'Roger Moore']),
    q('hard-odd-one-out', 'Which of these actors has NEVER played Batman in a live-action film?', 'Henry Cavill', ['George Clooney', 'Val Kilmer', 'Michael Keaton']),
    q('hard-odd-one-out', 'Which of these is NOT a Pixar film?', 'Shrek', ['Ratatouille', 'Up', 'Coco']),
    q('hard-odd-one-out', 'Which of these films did NOT win Best Picture?', 'Pulp Fiction', ['Gladiator', 'Braveheart', 'Chicago']),

    // ── Nollywood ─────────────────────────────
    q('hard-nollywood', 'Which 1992 film is credited with launching the Nollywood home-video boom?', 'Living in Bondage', ['Glamour Girls', 'Osuofia in London', 'Saworoide']),
    q('hard-nollywood', 'Who directed The Wedding Party (2016)?', 'Kemi Adetiba', ['Kunle Afolayan', 'Funke Akindele', 'Mo Abudu']),
    q('hard-nollywood', 'Which was the first Nollywood film to gross over ₦1 billion at the Nigerian box office?', 'A Tribe Called Judah', ['Battle on Buka Street', 'Omo Ghetto: The Saga', 'The Wedding Party']),
    q('hard-nollywood', 'Who directed the 2014 period thriller October 1?', 'Kunle Afolayan', ['Tunde Kelani', 'Kemi Adetiba', 'Izu Ojukwu']),
    q('hard-nollywood', "Which film was Nigeria's first-ever submission for the Best International Feature Oscar?", 'Lionheart', ['The Milkmaid', 'King of Boys', 'Citation']),
    q('hard-nollywood', 'Who directed and starred in Lionheart (2018)?', 'Genevieve Nnaji', ['Omotola Jalade-Ekeinde', 'Funke Akindele', 'Rita Dominic']),
    q('hard-nollywood', 'In which year was King of Boys: The Return of the King released on Netflix?', '2021', ['2020', '2022', '2019']),
    q('hard-nollywood', 'Which actress played Eniola Salami in King of Boys?', 'Sola Sobowale', ['Toyin Abraham', 'Joke Silva', 'Kate Henshaw']),
    q('hard-nollywood', 'Which comic actor starred in Osuofia in London (2003)?', 'Nkem Owoh', ['Chinedu Ikedieze', 'John Okafor', 'Osita Iheme']),
    q('hard-nollywood', 'The comedy duo Aki and Pawpaw are Chinedu Ikedieze and which actor?', 'Osita Iheme', ['Nkem Owoh', 'John Okafor', 'Zubby Michael']),
    q('hard-nollywood', 'Who played Andy Okeke in the original Living in Bondage?', 'Kenneth Okonkwo', ['Bob-Manuel Udokwu', 'Kanayo O. Kanayo', 'Francis Agu']),
  ],
}
