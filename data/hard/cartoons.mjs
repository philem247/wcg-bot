// Hand-written hard cartoons questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'cartoons',
  questions: [
    // ── SpongeBob ─────────────────────────────
    q('hard-spongebob', "What is the name of Plankton's restaurant?", 'The Chum Bucket', ['The Rusty Anchor', 'The Salty Spitoon', 'Weenie Hut Jr']),
    q('hard-spongebob', "What is the name of Plankton's computer wife?", 'Karen', ['Pearl', 'Sandy', 'Mindy']),
    q('hard-spongebob', "What is the name of Mr. Krabs' daughter?", 'Pearl', ['Karen', 'Mindy', 'Betsy']),
    q('hard-spongebob', 'Which US state is Sandy Cheeks from?', 'Texas', ['Florida', 'Alaska', 'Nevada']),

    // ── The Simpsons and Family Guy ─────────────────────────────
    q('hard-simpsons', 'At which bar does Homer Simpson usually drink?', "Moe's Tavern", ['The Leftorium', 'Krusty Burger', 'Kwik-E-Mart']),
    q('hard-simpsons', "What is Homer Simpson's middle name?", 'Jay', ['James', 'John', 'Joseph']),
    q('hard-simpsons', "What is Bart Simpson's full first name?", 'Bartholomew', ['Bartley', 'Barton', 'Bartram']),
    q('hard-simpsons', 'Who voices Bart Simpson?', 'Nancy Cartwright', ['Yeardley Smith', 'Julie Kavner', 'Pamela Hayden']),
    q('hard-simpsons', 'Who owns the Springfield Nuclear Power Plant?', 'Mr. Burns', ['Mr. Smithers', 'Mayor Quimby', 'Krusty']),
    q('hard-simpsons', "What is the name of Stewie Griffin's teddy bear?", 'Rupert', ['Robert', 'Ralph', 'Reginald']),
    q('hard-simpsons', "What is Rick's surname in Rick and Morty?", 'Sanchez', ['Smith', 'Sanderson', 'Santos']),

    // ── Classic cartoons ─────────────────────────────
    q('hard-classics', 'Which film studio first released Tom and Jerry cartoons?', 'MGM', ['Warner Bros.', 'Disney', 'Paramount']),
    q('hard-classics', "What was Tom's name in his 1940 debut cartoon?", 'Jasper', ['Tommy', 'Felix', 'Butch']),
    q('hard-classics', 'Who was the original voice of Bugs Bunny?', 'Mel Blanc', ['Daws Butler', 'June Foray', 'Don Messick']),
    q('hard-classics', 'Which company makes the gadgets Wile E. Coyote buys?', 'Acme', ['Ajax', 'Apex', 'Zenith']),
    q('hard-classics', 'Which Looney Tunes character says "Sufferin\' succotash"?', 'Sylvester', ['Daffy Duck', 'Porky Pig', 'Foghorn Leghorn']),
    q('hard-classics', 'Which 1928 short was the first Mickey Mouse cartoon released with sound?', 'Steamboat Willie', ['Plane Crazy', "The Gallopin' Gaucho", "Mickey's Revue"]),
    q('hard-classics', 'Which rabbit character did Walt Disney create before Mickey Mouse?', 'Oswald', ['Roger', 'Thumper', 'Bugs']),
    q('hard-classics', "What is Scooby-Doo's full name?", 'Scoobert Doo', ['Scooby Dooby Doo', 'Scoobington Doo', 'Scooter Doo']),
    q('hard-classics', "What is Shaggy's real first name?", 'Norville', ['Norman', 'Neville', 'Nigel']),

    // ── Avatar ─────────────────────────────
    q('hard-avatar', "What is the name of Aang's sky bison?", 'Appa', ['Momo', 'Naga', 'Pabu']),
    q('hard-avatar', "What is the name of Zuko's uncle?", 'Iroh', ['Ozai', 'Zhao', 'Bumi']),
    q('hard-avatar', 'Who invented metalbending in Avatar?', 'Toph Beifong', ['Bumi', 'Lin Beifong', 'Kuvira']),
    q('hard-avatar', 'Who is the Avatar in the sequel series to Avatar: The Last Airbender?', 'Korra', ['Asami', 'Jinora', 'Kyoshi']),
    q('hard-avatar', "What is the name of Aang's winged lemur?", 'Momo', ['Appa', 'Pabu', 'Naga']),

    // ── Cartoon Network ─────────────────────────────
    q('hard-cartoon-network', 'Which ingredient was spilled into the mix that created the Powerpuff Girls?', 'Chemical X', ['Compound V', 'Element Z', 'Formula 86']),
    q('hard-cartoon-network', 'Who is the Powerpuff Girls\' monkey arch-villain?', 'Mojo Jojo', ['HIM', 'Fuzzy Lumpkins', 'Princess Morbucks']),
    q('hard-cartoon-network', "What is the name of Dexter's sister in Dexter's Laboratory?", 'Dee Dee', ['Didi', 'Debbie', 'Daisy']),
    q('hard-cartoon-network', 'Which sweets are the Eds always trying to buy in Ed, Edd n Eddy?', 'Jawbreakers', ['Gumballs', 'Lollipops', 'Candy canes']),
    q('hard-cartoon-network', "Who is Courage the Cowardly Dog's kind owner?", 'Muriel', ['Eustace', 'Shirley', 'Katz']),
    q('hard-cartoon-network', 'What is the name of the device Ben Tennyson finds in Ben 10?', 'Omnitrix', ['Ultimatrix', 'Nemetrix', 'Biomnitrix']),
    q('hard-cartoon-network', "What is the name of Ben Tennyson's cousin?", 'Gwen', ['Kevin', 'Julie', 'Max']),
    q('hard-cartoon-network', 'In Adventure Time, which princess is made of candy?', 'Princess Bubblegum', ['Lumpy Space Princess', 'Flame Princess', 'Marceline']),
    q('hard-cartoon-network', 'Which triangular villain haunts Gravity Falls?', 'Bill Cipher', ['Gideon Gleeful', 'Blendin Blandin', 'Robbie Valentino']),
    q('hard-cartoon-network', 'In Samurai Jack, what is the name of the shape-shifting demon Jack fights?', 'Aku', ['Mojo', 'Vilgax', 'Hexxus']),
    q('hard-cartoon-network', 'What is the name of the alien villain who keeps trying to take the Omnitrix?', 'Vilgax', ['Aku', 'Kevin 11', 'Zs\'Skayr']),

    // ── Disney Channel and Nickelodeon ─────────────────────────────
    q('hard-disney-nick', "What is Perry the Platypus's secret agent codename?", 'Agent P', ['Agent X', 'Agent F', 'Agent D']),
    q('hard-disney-nick', "Who is Perry the Platypus's nemesis?", 'Dr. Doofenshmirtz', ['Dr. Drakken', 'Professor Chaos', 'Dr. Blowhole']),
    q('hard-disney-nick', "What is Ron Stoppable's pet naked mole-rat called in Kim Possible?", 'Rufus', ['Rudy', 'Rocky', 'Rex']),
    q('hard-disney-nick', 'Which Teenage Mutant Ninja Turtle wears a purple mask?', 'Donatello', ['Raphael', 'Michelangelo', 'Leonardo']),
    q('hard-disney-nick', 'Which Teenage Mutant Ninja Turtle wears a red mask?', 'Raphael', ['Donatello', 'Michelangelo', 'Leonardo']),
    q('hard-disney-nick', 'What is the name of the Ninja Turtles\' rat sensei?', 'Splinter', ['Shredder', 'Krang', 'Bebop']),
    q('hard-disney-nick', "In The Fairly OddParents, what are the names of Timmy's fairy godparents?", 'Cosmo and Wanda', ['Jorgen and Wanda', 'Cosmo and Poof', 'Binky and Wanda']),
    q('hard-disney-nick', 'Which Rugrats character is the bossy three-year-old cousin?', 'Angelica', ['Susie', 'Lil', 'Kimi']),
    q('hard-disney-nick', "What is the name of Jimmy Neutron's robot dog?", 'Goddard', ['Gizmo', 'K-9', 'Bolt']),
    q('hard-disney-nick', 'In Danny Phantom, what is the name of the town Danny protects?', 'Amity Park', ['Dimmsdale', 'Retroville', 'Danville']),
    q('hard-disney-nick', 'In Hey Arnold!, what is unusual about the shape of Arnold\'s head?', 'It is football-shaped', ['It is square', 'It is a triangle', 'It is star-shaped']),
    q('hard-disney-nick', 'Which Nickelodeon cartoon follows twins Phil and Lil DeVille among others?', 'Rugrats', ['Hey Arnold!', 'The Wild Thornberrys', 'As Told by Ginger']),
    q('hard-disney-nick', 'In Phineas and Ferb, what is the name of the boys\' older sister?', 'Candace', ['Isabella', 'Stacy', 'Vanessa']),
    q('hard-disney-nick', 'Which Disney Channel cartoon features the twins Dipper and Mabel?', 'Gravity Falls', ['Phineas and Ferb', 'Star vs. the Forces of Evil', 'The Owl House']),
  ],
}
