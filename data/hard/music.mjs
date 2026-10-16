// Hand-written hard music questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'music',
  questions: [
    // ── Albums ─────────────────────────────
    q('hard-albums', 'Which Beatles album features "Here Comes the Sun"?', 'Abbey Road', ['Let It Be', 'Revolver', 'Help!']),
    q('hard-albums', 'In which year was Michael Jackson\'s Thriller released?', '1982', ['1983', '1980', '1984']),
    q('hard-albums', 'Which was Michael Jackson\'s first solo album with Quincy Jones producing?', 'Off the Wall', ['Bad', 'Thriller', 'Dangerous']),
    q('hard-albums', 'Which Taylor Swift album includes "Shake It Off"?', '1989', ['Red', 'Reputation', 'Fearless']),
    q('hard-albums', 'On which Queen album does "Bohemian Rhapsody" appear?', 'A Night at the Opera', ['News of the World', 'A Day at the Races', 'The Game']),
    q('hard-albums', 'Which band released The Dark Side of the Moon (1973)?', 'Pink Floyd', ['Led Zeppelin', 'The Who', 'Genesis']),
    q('hard-albums', 'Which 1991 album includes "Smells Like Teen Spirit"?', 'Nevermind', ['In Utero', 'Bleach', 'Incesticide']),
    q('hard-albums', 'Which Prince album and film came out in 1984?', 'Purple Rain', ['1999', "Sign o' the Times", 'Parade']),
    q('hard-albums', "What was the title of Tupac's 1996 double album?", 'All Eyez on Me', ['Me Against the World', '2Pacalypse Now', 'Makaveli']),
    q('hard-albums', "What was The Notorious B.I.G.'s debut album?", 'Ready to Die', ['Life After Death', 'Illmatic', 'Reasonable Doubt']),
    q('hard-albums', 'Which album by The Weeknd contains "Blinding Lights"?', 'After Hours', ['Starboy', 'Dawn FM', 'Kiss Land']),
    q('hard-albums', 'Which Adele album includes "Hello"?', '25', ['21', '19', '30']),
    q('hard-albums', 'Which Ed Sheeran album includes "Shape of You"?', 'Divide', ['Multiply', 'Plus', 'Equals']),
    q('hard-albums', 'Which Beyoncé album won Album of the Year at the 2025 Grammys?', 'Cowboy Carter', ['Renaissance', 'Lemonade', '4']),

    // ── Real names ─────────────────────────────
    q('hard-real-names', 'Which singer was born Stefani Germanotta?', 'Lady Gaga', ['Gwen Stefani', 'Katy Perry', 'Pink']),
    q('hard-real-names', 'Which singer was born Robyn Fenty?', 'Rihanna', ['Beyoncé', 'Ciara', 'Brandy']),
    q('hard-real-names', 'Which rapper was born Shawn Carter?', 'Jay-Z', ['Diddy', 'Nas', 'Busta Rhymes']),
    q('hard-real-names', 'Which rapper was born Aubrey Graham?', 'Drake', ['The Weeknd', 'J. Cole', 'Future']),
    q('hard-real-names', 'Which singer was born Abel Tesfaye?', 'The Weeknd', ['Frank Ocean', 'Miguel', 'Daniel Caesar']),

    // ── Firsts and records ─────────────────────────────
    q('hard-records', 'Who was the first rapper to win the Pulitzer Prize for Music?', 'Kendrick Lamar', ['J. Cole', 'Jay-Z', 'Kanye West']),
    q('hard-records', 'As of 2025, who has won the most Grammy Awards ever?', 'Beyoncé', ['Georg Solti', 'Quincy Jones', 'Alison Krauss']),
    q('hard-records', 'Which band\'s video was the first ever played on MTV in 1981?', 'The Buggles', ['Duran Duran', 'The Police', 'Pat Benatar']),
    q('hard-records', 'Which music streaming service was launched in Sweden in 2008?', 'Spotify', ['Deezer', 'Pandora', 'Napster']),
    q('hard-records', 'Who was the Beatles\' drummer before Ringo Starr?', 'Pete Best', ['Stuart Sutcliffe', 'Tommy Moore', 'Brian Epstein']),
    q('hard-records', 'Which Nirvana drummer went on to found Foo Fighters?', 'Dave Grohl', ['Krist Novoselic', 'Chad Channing', 'Pat Smear']),
    q('hard-records', 'In which year did Michael Jackson die?', '2009', ['2008', '2010', '2011']),
    q('hard-records', 'In which year did Bob Marley die?', '1981', ['1980', '1983', '1979']),

    // ── Songs ─────────────────────────────
    q('hard-songs', 'Which 1985 charity single was recorded by USA for Africa?', 'We Are the World', ["Do They Know It's Christmas?", 'Heal the World', 'Sun City']),
    q('hard-songs', 'Who co-wrote "We Are the World" with Michael Jackson?', 'Lionel Richie', ['Quincy Jones', 'Stevie Wonder', 'Harry Belafonte']),
    q('hard-songs', 'Who wrote "I Will Always Love You", later a Whitney Houston hit?', 'Dolly Parton', ['Diane Warren', 'Carole King', 'Tracy Chapman']),
    q('hard-songs', 'Whitney Houston\'s "I Will Always Love You" was recorded for which film?', 'The Bodyguard', ['Waiting to Exhale', "The Preacher's Wife", 'Sparkle']),
    q('hard-songs', 'Which female rapper released "Super Bass"?', 'Nicki Minaj', ['Cardi B', 'Iggy Azalea', 'Missy Elliott']),
    q('hard-songs', 'Which singer was known as the "Queen of Soul"?', 'Aretha Franklin', ['Diana Ross', 'Tina Turner', 'Whitney Houston']),
    q('hard-songs', 'Chester Bennington was the lead singer of which band?', 'Linkin Park', ['Limp Bizkit', 'Evanescence', 'Papa Roach']),
    q('hard-songs', 'Bob Marley recorded with which backing band?', 'The Wailers', ['The Skatalites', 'The Maytals', 'Black Uhuru']),

    // ── African music ─────────────────────────────
    q('hard-african', 'Which South African singer made "Pata Pata" famous?', 'Miriam Makeba', ['Brenda Fassie', 'Angélique Kidjo', 'Yvonne Chaka Chaka']),
    q('hard-african', 'Which Senegalese singer recorded "7 Seconds" with Neneh Cherry?', "Youssou N'Dour", ['Baaba Maal', 'Ismaël Lô', 'Salif Keita']),
    q('hard-african', 'Koffi Olomide and Papa Wemba are stars of which genre?', 'Soukous', ['Mbalax', 'Kwaito', 'Highlife']),
    q('hard-african', 'In which country did amapiano originate?', 'South Africa', ['Kenya', 'Zimbabwe', 'Ghana']),
    q('hard-african', 'E.T. Mensah of Ghana was known as the king of which genre?', 'Highlife', ['Hiplife', 'Kwaito', 'Afrobeat']),
    q('hard-african', 'Angélique Kidjo is from which country?', 'Benin', ['Togo', 'Senegal', 'Cameroon']),
    q('hard-african', 'Which Cameroonian saxophonist recorded "Soul Makossa"?', 'Manu Dibango', ['Francis Bebey', 'Richard Bona', 'Sam Fan Thomas']),
    q('hard-african', 'Which Malian singer is known as the "Golden Voice of Africa"?', 'Salif Keita', ['Ali Farka Touré', 'Oumou Sangaré', 'Toumani Diabaté']),

    // ── Classical and jazz ─────────────────────────────
    q('hard-classical', 'Which jazz trumpeter recorded the album Kind of Blue?', 'Miles Davis', ['Louis Armstrong', 'Dizzy Gillespie', 'Chet Baker']),
    q('hard-classical', 'Who composed The Four Seasons?', 'Antonio Vivaldi', ['Johann Sebastian Bach', 'George Frideric Handel', 'Wolfgang Amadeus Mozart']),
    q('hard-classical', 'How many symphonies did Beethoven complete?', 'Nine', ['Seven', 'Eleven', 'Five']),
    q('hard-classical', 'Who composed the opera The Magic Flute?', 'Mozart', ['Beethoven', 'Haydn', 'Wagner']),
    q('hard-classical', 'Which composer kept writing music after going almost completely deaf?', 'Beethoven', ['Mozart', 'Chopin', 'Tchaikovsky']),
    q('hard-classical', 'Who composed the ballet Swan Lake?', 'Tchaikovsky', ['Stravinsky', 'Prokofiev', 'Rachmaninoff']),
    q('hard-classical', 'Which instrument did jazz legend Thelonious Monk play?', 'Piano', ['Saxophone', 'Trumpet', 'Double bass']),
    q('hard-classical', 'Which instrument is John Coltrane best known for?', 'Saxophone', ['Trumpet', 'Piano', 'Clarinet']),
  ],
}
