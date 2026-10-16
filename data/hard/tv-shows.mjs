// Hand-written hard TV shows questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'tv-shows',
  questions: [
    // ── Crime dramas ─────────────────────────────
    q('hard-crime', 'What is the name of the car wash Walter White buys in Breaking Bad?', 'A1A Car Wash', ['Bright Car Wash', 'Vamonos Wash', 'Sunset Car Wash']),
    q('hard-crime', "Which fast-food chain fronts Gus Fring's drug empire?", 'Los Pollos Hermanos', ['Pollos Locos', 'Taco Loco', 'El Pollo Grande']),
    q('hard-crime', "What is Saul Goodman's real name?", 'Jimmy McGill', ['Chuck McGill', 'Howard Hamlin', 'Mike Ehrmantraut']),
    q('hard-crime', "What is the name of Tony Soprano's strip club?", 'Bada Bing', ["Satriale's", 'Nuovo Vesuvio', 'The Crazy Horse']),
    q('hard-crime', 'Which actor played Omar Little in The Wire?', 'Michael K. Williams', ['Idris Elba', 'Wendell Pierce', 'Lance Reddick']),
    q('hard-crime', 'Which British actor played Stringer Bell in The Wire?', 'Idris Elba', ['Dominic West', 'Michael K. Williams', 'Lance Reddick']),
    q('hard-crime', 'Which city is the setting of The Wire?', 'Baltimore', ['Philadelphia', 'Detroit', 'Chicago']),
    q('hard-crime', 'What does Michael Scofield have tattooed on his body in Prison Break?', 'The building plans', ['A map of Chicago', 'Bible verses', "His brother's face"]),
    q('hard-crime', "Who is Michael Scofield's brother in Prison Break?", 'Lincoln Burrows', ['Fernando Sucre', 'Theodore Bagwell', 'Brad Bellick']),
    q('hard-crime', 'Which drug lord is the focus of the first two seasons of Narcos?', 'Pablo Escobar', ['El Chapo', 'Gilberto Rodríguez', 'Carlos Lehder']),
    q('hard-crime', 'In which city is Peaky Blinders set?', 'Birmingham', ['Manchester', 'Liverpool', 'Leeds']),
    q('hard-crime', 'What do the Peaky Blinders hide in the peaks of their caps?', 'Razor blades', ['Bullets', 'Coins', 'Knives']),
    q('hard-crime', 'What is the original Spanish title of Money Heist?', 'La casa de papel', ['El robo del siglo', 'La casa de las flores', 'Élite']),
    q('hard-crime', 'What is the name of the mastermind behind the heist in Money Heist?', 'The Professor', ['Berlin', 'Denver', 'Palermo']),
    q('hard-crime', 'Which Money Heist character narrates the story?', 'Tokyo', ['Nairobi', 'Rio', 'Lisbon']),
    q('hard-crime', "What is Ghost's real name in Power?", 'James St. Patrick', ['Tommy Egan', 'Kanan Stark', 'Tariq St. Patrick']),
    q('hard-crime', 'Which actor plays Assane Diop in Lupin?', 'Omar Sy', ['Vincent Cassel', 'Jean Dujardin', 'Tahar Rahim']),

    // ── Sitcoms ─────────────────────────────
    q('hard-sitcoms', "What is the name of Ross's pet monkey in Friends?", 'Marcel', ['Hugsy', 'Mr. Heckles', 'Gunther']),
    q('hard-sitcoms', "What is Chandler Bing's middle name?", 'Muriel', ['Marion', 'Monroe', 'Milton']),
    q('hard-sitcoms', "What is the name of Joey Tribbiani's agent?", 'Estelle Leonard', ['Janice Hosenstein', 'Carol Willick', 'Ursula Buffay']),
    q('hard-sitcoms', 'How many seasons did Friends run for?', '10', ['9', '8', '11']),
    q('hard-sitcoms', 'In which city is the Dunder Mifflin branch in The Office (US)?', 'Scranton', ['Stamford', 'Nashua', 'Utica']),
    q('hard-sitcoms', "What is the name of Dwight Schrute's family farm?", 'Schrute Farms', ['Schrute Acres', 'Beet Hollow', "Mose's Farm"]),
    q('hard-sitcoms', "What is Sheldon's surname in The Big Bang Theory?", 'Cooper', ['Hofstadter', 'Wolowitz', 'Koothrappali']),
    q('hard-sitcoms', 'What is the name of the bar in How I Met Your Mother?', "MacLaren's", ["Paddy's", 'Cheers', "Moe's"]),
    q('hard-sitcoms', "What is the Mother's name in How I Met Your Mother?", 'Tracy McConnell', ['Robin Scherbatsky', 'Stella Zinman', 'Victoria']),
    q('hard-sitcoms', "What is Kramer's first name in Seinfeld?", 'Cosmo', ['Kenny', 'Carl', 'Kevin']),
    q('hard-sitcoms', 'In The Fresh Prince of Bel-Air, where does Will move from?', 'West Philadelphia', ['Brooklyn', 'Compton', 'Detroit']),
    q('hard-sitcoms', 'Which actor played Uncle Phil in The Fresh Prince of Bel-Air?', 'James Avery', ['Alfonso Ribeiro', 'Joseph Marcell', 'Carl Weathers']),
    q('hard-sitcoms', 'Who played Aunt Viv in the first three seasons of The Fresh Prince?', 'Janet Hubert', ['Daphne Maxwell Reid', 'Tatyana Ali', 'Karyn Parsons']),
    q('hard-sitcoms', 'Who narrates Everybody Hates Chris?', 'Chris Rock', ['Chris Tucker', 'Tyler James Williams', 'Terry Crews']),

    // ── Sci-fi and fantasy ─────────────────────────────
    q('hard-scifi', 'In which fictional town is Stranger Things set?', 'Hawkins', ['Derry', 'Castle Rock', 'Riverdale']),
    q('hard-scifi', 'What is the alternate dimension in Stranger Things called?', 'The Upside Down', ['The Other Side', 'The Nether', 'The Shadow Realm']),
    q('hard-scifi', "What number is tattooed on Eleven's wrist?", '011', ['001', '008', '010']),
    q('hard-scifi', 'In season 1 of Stranger Things, the kids name the monster after which D&D creature?', 'Demogorgon', ['Mind Flayer', 'Vecna', 'Beholder']),
    q('hard-scifi', "What is Seong Gi-hun's player number in Squid Game?", '456', ['001', '067', '218']),
    q('hard-scifi', 'In Lost, what was the number of the flight that crashed?', 'Oceanic 815', ['Oceanic 316', 'Ajira 316', 'Oceanic 618']),
    q('hard-scifi', "What is the name of the Doctor's time machine in Doctor Who?", 'The TARDIS', ['The DeLorean', 'The Time Turner', 'The Stargate']),
    q('hard-scifi', 'Who leads the superhero team The Seven in The Boys?', 'Homelander', ['Queen Maeve', 'The Deep', 'A-Train']),
    q('hard-scifi', 'Which school does Wednesday Addams attend in Wednesday?', 'Nevermore Academy', ['Miskatonic Academy', 'Crestwood Prep', 'Riverdale High']),
    q('hard-scifi', 'What does Negan call his barbed-wire bat in The Walking Dead?', 'Lucille', ['Lucinda', 'Lula', 'Louise']),
    q('hard-scifi', "What was Rick Grimes' job before the outbreak in The Walking Dead?", "Sheriff's deputy", ['Doctor', 'Teacher', 'Firefighter']),

    // ── Dramas ─────────────────────────────
    q('hard-drama', 'What is the original name of the hospital in Grey\'s Anatomy?', 'Seattle Grace', ['Seattle Mercy', 'Sacred Heart', 'Princeton-Plainsboro']),
    q('hard-drama', 'At which hospital does Dr. Gregory House work?', 'Princeton-Plainsboro', ['Seattle Grace', 'Sacred Heart', 'County General']),
    q('hard-drama', 'Who played Queen Elizabeth II in the first two seasons of The Crown?', 'Claire Foy', ['Olivia Colman', 'Imelda Staunton', 'Helena Bonham Carter']),
    q('hard-drama', 'At which address does Sherlock live in the BBC series Sherlock?', '221B Baker Street', ['10 Downing Street', '12 Grimmauld Place', '4 Privet Drive']),
    q('hard-drama', 'What is the name of the Roy family company in Succession?', 'Waystar Royco', ['Pierce Global', 'GoJo', 'Vaulter']),
    q('hard-drama', 'Which character does Taraji P. Henson play in Empire?', 'Cookie Lyon', ['Anika Calhoun', 'Rhonda Lyon', 'Camilla Marks']),
    q('hard-drama', "What is the name of Kiefer Sutherland's character in 24?", 'Jack Bauer', ['Tony Almeida', 'David Palmer', "Chloe O'Brian"]),
    q('hard-drama', 'In 24, roughly how much real time does each season cover?', 'One day', ['One week', 'One month', 'One year']),
  ],
}
