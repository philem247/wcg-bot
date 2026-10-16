// Hand-written hard anime questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'anime',
  questions: [
    // ── Films and studios ─────────────────────────────
    q('hard-studios', 'Which anime film won the Oscar for Best Animated Feature in 2003?', 'Spirited Away', ['Princess Mononoke', 'Akira', 'Your Name']),
    q('hard-studios', 'In 2024, which director won his second Oscar for Best Animated Feature?', 'Hayao Miyazaki', ['Makoto Shinkai', 'Mamoru Hosoda', 'Isao Takahata']),
    q('hard-studios', 'Which studio animated the final season of Attack on Titan?', 'MAPPA', ['Wit Studio', 'Ufotable', 'Bones']),
    q('hard-studios', 'Which studio animates Demon Slayer?', 'Ufotable', ['MAPPA', 'Bones', 'Madhouse']),
    q('hard-studios', 'Which studio animates My Hero Academia?', 'Bones', ['MAPPA', 'Ufotable', 'Toei Animation']),
    q('hard-studios', 'Which studio made the 2011 Hunter x Hunter series?', 'Madhouse', ['Nippon Animation', 'Bones', 'Pierrot']),
    q('hard-studios', 'In 2020, which Demon Slayer film became the highest-grossing film in Japanese history?', 'Mugen Train', ['Infinity Castle', 'Entertainment District', 'Swordsmith Village']),
    q('hard-studios', 'In which city is the 1988 film Akira set?', 'Neo-Tokyo', ['Neo-Osaka', 'New Kyoto', 'Tokyo-3']),

    // ── One Piece ─────────────────────────────
    q('hard-one-piece', 'In which year did the One Piece manga begin?', '1997', ['1999', '1995', '2001']),
    q('hard-one-piece', "What was the name of the Straw Hats' first ship?", 'Going Merry', ['Thousand Sunny', 'Red Force', 'Moby Dick']),
    q('hard-one-piece', 'Which Straw Hat is the crew\'s navigator?', 'Nami', ['Robin', 'Usopp', 'Sanji']),
    q('hard-one-piece', "What is Zoro's signature three-sword fighting style called?", 'Santoryu', ['Ittoryu', 'Nitoryu', 'Hiten Mitsurugi']),

    // ── Attack on Titan ─────────────────────────────
    q('hard-aot', "What is Eren's surname in Attack on Titan?", 'Yeager', ['Ackerman', 'Arlert', 'Braun']),
    q('hard-aot', 'Who is known as "humanity\'s strongest soldier" in Attack on Titan?', 'Levi', ['Mikasa', 'Erwin', 'Hange']),
    q('hard-aot', 'Which Titan does Reiner Braun inherit?', 'Armored Titan', ['Colossal Titan', 'Beast Titan', 'Jaw Titan']),
    q('hard-aot', 'Which Titan does Bertholdt Hoover inherit?', 'Colossal Titan', ['Armored Titan', 'Cart Titan', 'Female Titan']),
    q('hard-aot', 'Who is the Beast Titan?', 'Zeke Yeager', ['Reiner Braun', 'Porco Galliard', 'Eren Kruger']),

    // ── Death Note ─────────────────────────────
    q('hard-death-note', 'Which Shinigami drops the Death Note into the human world?', 'Ryuk', ['Rem', 'Sidoh', 'Gelus']),
    q('hard-death-note', "What is L's real name in Death Note?", 'L Lawliet', ['Nate River', 'Mihael Keehl', 'Quillsh Wammy']),
    q('hard-death-note', 'What name does the public give Light Yagami\'s killer persona?', 'Kira', ['Ryuk', 'Near', 'Mello']),

    // ── Dragon Ball ─────────────────────────────
    q('hard-dragon-ball', "What is Goku's Saiyan birth name?", 'Kakarot', ['Raditz', 'Bardock', 'Tarble']),
    q('hard-dragon-ball', 'In which year did Dragon Ball creator Akira Toriyama die?', '2024', ['2023', '2022', '2025']),
    q('hard-dragon-ball', "Who is Goku's first son?", 'Gohan', ['Goten', 'Trunks', 'Pan']),
    q('hard-dragon-ball', 'Which transformation did Goku first achieve on Namek?', 'Super Saiyan', ['Super Saiyan 2', 'Kaioken', 'Ultra Instinct']),

    // ── Demon Slayer ─────────────────────────────
    q('hard-demon-slayer', "What is Tanjiro's surname in Demon Slayer?", 'Kamado', ['Agatsuma', 'Hashibira', 'Tomioka']),
    q('hard-demon-slayer', 'Which breathing style does Tanjiro first learn?', 'Water Breathing', ['Flame Breathing', 'Thunder Breathing', 'Sun Breathing']),
    q('hard-demon-slayer', 'Which Demon Slayer character uses Thunder Breathing?', 'Zenitsu', ['Inosuke', 'Rengoku', 'Giyu']),
    q('hard-demon-slayer', 'Who is the Flame Hashira?', 'Kyojuro Rengoku', ['Giyu Tomioka', 'Sanemi Shinazugawa', 'Tengen Uzui']),

    // ── Jujutsu Kaisen and others ─────────────────────────────
    q('hard-shonen', 'Who is the "King of Curses" in Jujutsu Kaisen?', 'Ryomen Sukuna', ['Mahito', 'Jogo', 'Kenjaku']),
    q('hard-shonen', 'Which Jujutsu Kaisen sorcerer wears a blindfold?', 'Satoru Gojo', ['Megumi Fushiguro', 'Kento Nanami', 'Suguru Geto']),
    q('hard-shonen', "What is Gon's surname in Hunter x Hunter?", 'Freecss', ['Zoldyck', 'Kurta', 'Netero']),
    q('hard-shonen', 'Which family of assassins does Killua belong to?', 'Zoldyck', ['Freecss', 'Kurta', 'Lucilfer']),
    q('hard-shonen', 'Kurapika is the last survivor of which clan?', 'Kurta', ['Zoldyck', 'Freecss', 'Lucilfer']),
    q('hard-shonen', "In Fullmetal Alchemist, what does Edward give up to bind Alphonse's soul to the armour?", 'His right arm', ['His left leg', 'His left arm', 'His right leg']),
    q('hard-shonen', "What is Deku's real name in My Hero Academia?", 'Izuku Midoriya', ['Katsuki Bakugo', 'Shoto Todoroki', 'Tenya Iida']),
    q('hard-shonen', 'Which Quirk does All Might pass on to Deku?', 'One For All', ['All For One', 'Half-Cold Half-Hot', 'Explosion']),
    q('hard-shonen', "What is Saitama's official hero name in One Punch Man?", 'Caped Baldy', ['Silver Fang', 'Metal Knight', 'Blast']),
    q('hard-shonen', "Who is Saitama's cyborg disciple?", 'Genos', ['Mumen Rider', 'King', 'Sonic']),

    // ── Classics ─────────────────────────────
    q('hard-classics', "What is Sailor Moon's civilian name?", 'Usagi Tsukino', ['Ami Mizuno', 'Rei Hino', 'Makoto Kino']),
    q('hard-classics', 'In which region does Ash begin his Pokémon journey?', 'Kanto', ['Johto', 'Hoenn', 'Sinnoh']),
    q('hard-classics', 'Which town is Ash Ketchum from?', 'Pallet Town', ['Lavender Town', 'Viridian City', 'Cerulean City']),
    q('hard-classics', 'In Neon Genesis Evangelion, who pilots Eva Unit-01?', 'Shinji Ikari', ['Asuka Langley', 'Rei Ayanami', 'Toji Suzuhara']),
    q('hard-classics', 'Who is the main character of Cowboy Bebop?', 'Spike Spiegel', ['Jet Black', 'Vicious', 'Faye Valentine']),
    q('hard-classics', 'Who pilots the RX-78-2 in the original Mobile Suit Gundam?', 'Amuro Ray', ['Char Aznable', 'Kamille Bidan', 'Heero Yuy']),
    q('hard-classics', 'In Bleach, what is Ichigo\'s surname?', 'Kurosaki', ['Kuchiki', 'Abarai', 'Ishida']),
    q('hard-classics', "What is the name of Ichigo's Zanpakutō?", 'Zangetsu', ['Senbonzakura', 'Zabimaru', 'Hyōrinmaru']),
    q('hard-classics', 'In Fullmetal Alchemist, what is the name of the colonel known as the Flame Alchemist?', 'Roy Mustang', ['Alex Armstrong', 'Maes Hughes', 'King Bradley']),
    q('hard-classics', 'In Code Geass, what masked identity does Lelouch adopt?', 'Zero', ['Kira', 'Black King', 'The Joker']),
    q('hard-classics', 'Which anime follows the volleyball team of Karasuno High?', 'Haikyu!!', ['Kuroko no Basket', 'Blue Lock', 'Slam Dunk']),
    q('hard-classics', 'Which anime follows the football project to create Japan\'s best striker?', 'Blue Lock', ['Captain Tsubasa', 'Haikyu!!', 'Inazuma Eleven']),
  ],
}
