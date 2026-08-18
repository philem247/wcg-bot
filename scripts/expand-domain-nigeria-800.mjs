import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

function qId(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
}

function makeQ(q, correct, wrong, template = 'curated') {
  if (!q || !correct || !wrong || !Array.isArray(wrong)) {
    throw new Error(`Malformed question parameters: ${q}`);
  }
  const cleanCorrect = correct.trim();
  const cleanWrong = wrong
    .map(w => w.trim())
    .filter(w => w.length > 0 && w.toLowerCase() !== cleanCorrect.toLowerCase());
  const uniqueWrong = [...new Set(cleanWrong)].slice(0, 3);
  if (uniqueWrong.length < 3) {
    throw new Error(`Question "${q}" has fewer than 3 unique wrong answers! (found: ${JSON.stringify(uniqueWrong)}, correct: ${cleanCorrect})`);
  }
  return {
    id: qId(q.trim() + '|' + cleanCorrect),
    q: q.trim(),
    correct: cleanCorrect,
    wrong: uniqueWrong,
    template,
  };
}

const additions = {
  'nigerian-entertainment': [],
  'nigerian-music': [],
  'nigerian-history': [],
  'nigerian-food': [],
  'pidgin-english': []
};

// =========================================================================
// 1. NIGERIAN ENTERTAINMENT: COMPLETE PUSH TO 800+
// =========================================================================
const actors = [
  ['Genevieve Nnaji', 'Lionheart', ['The Wedding Party', 'Fifty', 'King of Boys'], 'Directed the first Nigerian Netflix Original film'],
  ['Omotola Jalade Ekeinde', 'Blood Sisters (2003)', ['Glamour Girls', 'Living in Bondage', 'Nneka The Pretty Serpent'], 'Veteran Nollywood screen diva named in TIME 100 in 2013'],
  ['Richard Mofe-Damijo (RMD)', 'Out of Bounds (1997)', ['Living in Bondage', 'Saworoide', 'Thunderbolt'], 'Iconic Nollywood heartthrob and former Commissioner in Delta State'],
  ['Ramsey Nouah', 'The Figurine (Araromire)', ['Osuofia in London', 'Aki na Ukwa', 'Blood Money'], 'Veteran romantic lead who directed the 2019 "Living in Bondage: Breaking Free"'],
  ['Olu Jacobs', 'The Royal Tears', ['Saworoide', 'Agogo Ewo', 'Thunderbolt'], 'Veteran iconic actor and husband to Joke Silva'],
  ['Joke Silva', 'The Secret Laughter of Women', ['Glamour Girls', 'Blood Money', 'Living in Bondage'], 'Multiple AMVCA-winning veteran theatre and screen icon'],
  ['Funke Akindele', 'Jenifa (2008)', ['Osuofia in London', 'Aki na Ukwa', 'Lionheart'], 'Creator of Jenifa and highest grossing Nollywood producer'],
  ['Sola Sobowale', 'Asewo To Re Mecca (1992)', ['Saworoide', 'Agogo Ewo', 'Thunderbolt'], 'Legendary actress known as Toyin Tomato'],
  ['Nkem Owoh', 'Osuofia in London', ['The Figurine', 'Lionheart', 'Saworoide'], 'Beloved comic actor famous for "I Go Chop Your Dollar"'],
  ['Chinedu Ikedieze', 'Aki na Ukwa', ['Saworoide', 'Lionheart', 'The Wedding Party'], 'Famous as Aki alongside Pawpaw'],
  ['Osita Iheme', 'Aki na Ukwa', ['Saworoide', 'Lionheart', 'Fifty'], 'Famous as Pawpaw and global meme legend'],
  ['Mercy Johnson Okojie', 'Dumebi the Dirty Girl', ['Lionheart', 'Fifty', 'The Figurine'], 'Prolific actress famous for emotional and comic roles'],
  ['Rita Dominic', 'The Meeting (2012)', ['Saworoide', 'Agogo Ewo', 'Thunderbolt'], 'Award-winning actress who played Clara Ikemba'],
  ['Ini Edo', 'World Apart (2004)', ['Saworoide', 'The Figurine', 'Fifty'], 'Nollywood star who starred in and co-produced "Shanty Town"'],
  ['Tonto Dikeh', 'Dirty Secret (2010)', ['Saworoide', 'Lionheart', 'Fifty'], 'Controversial and outspoken Nollywood star'],
  ['Jim Iyke', 'Last Flight to Abuja', ['Saworoide', 'The Figurine', 'Lionheart'], 'Nollywood bad boy actor who produced "Bad Comments"'],
  ['Nonso Diobi', 'Hatred (2001)', ['Saworoide', 'The Figurine', 'Fifty'], 'Popular 2000s Nollywood romantic lead actor'],
  ['Mike Ezuruonye', 'Critical Decision (2004)', ['Saworoide', 'The Figurine', 'Lionheart'], 'Prominent Nollywood actor and filmmaker'],
  ['Yul Edochie', 'Wind of Glory (2007)', ['Saworoide', 'Lionheart', 'Fifty'], 'Deep-voiced actor named after Russian-American actor Yul Brynner'],
  ['Odunlade Adekola', 'Sunday Dagboru', ['Saworoide', 'The Figurine', 'Lionheart'], 'King of Yoruba cinema and ubiquitous meme expression champion'],
  ['Femi Adebayo', 'Jelili (2011)', ['Saworoide', 'Lionheart', 'Fifty'], 'Star of Jagun Jagun and King of Thieves (Agesinkole)'],
  ['Lateef Adedimeji', 'Ayinla (2021)', ['Saworoide', 'The Figurine', 'Fifty'], 'Versatile actor who portrayed Apala legend Ayinla Omowura'],
  ['Bimbo Ademoye', 'Aníkúlápó (Arolake)', ['Saworoide', 'Lionheart', 'Fifty'], 'Popular actress celebrated for "Iya Barakat Teropi Secxxxy"'],
  ['Bisola Aiyeola', 'Sugar Rush (2019)', ['Saworoide', 'The Figurine', 'Fifty'], 'BBNaija star and AMVCA Trailblazer award winner'],
  ['Timini Egbuson', 'A Tribe Called Judah', ['Saworoide', 'Lionheart', 'The Figurine'], 'AMVCA winner dubbed Nollywood\'s most bankable leading man'],
  ['Tobi Bakre', 'Brotherhood & Gangs of Lagos', ['Saworoide', 'The Figurine', 'Fifty'], 'BBNaija finalist who became an AMVCA-winning action star'],
  ['Chidi Mokeme', 'Shanty Town (Scar)', ['Saworoide', 'Lionheart', 'Fifty'], 'Veteran actor who made a stunning comeback as Scar'],
  ['Zubby Michael', 'Omo Ghetto: The Saga', ['Saworoide', 'The Figurine', 'Fifty'], 'Famous for playing charismatic street lords'],
  ['Kunle Remi', 'Aníkúlápó (Saro)', ['Saworoide', 'Lionheart', 'Fifty'], 'Winner of Gulder Ultimate Search 7 who starred as Saro'],
  ['Deyemi Okanlawon', 'Blood Sisters (Kola Ademola)', ['Saworoide', 'Lionheart', 'Fifty'], 'Versatile leading man known for intense dramatic roles']
];

for (const [name, film, wrong, desc] of actors) {
  additions['nigerian-entertainment'].push(makeQ(`Which iconic Nollywood film or TV production featured ${name} (${desc})?`, film, wrong, 'nollywood-stars'));
  additions['nigerian-entertainment'].push(makeQ(`Who starred in the hit Nollywood production "${film}"?`, name, ['Kenneth Okonkwo', 'Fred Amata', 'Kanayo O. Kanayo'], 'nollywood-stars'));
}

// BBNaija seasons & key moments
const bbnSeasons = [
  ['Season 1 (2006)', 'Katung Aduwak', ['Francisca Owumi', 'Ify Ejikeme', 'Ebuka Obi-Uchendu']],
  ['Season 2 - See Gobe (2017)', 'Efe Ejeba ("Warri!")', ['Bisola Aiyeola', 'TBoss (Tokunbo Idowu)', 'Debie-Rise']],
  ['Season 3 - Double Wahala (2018)', 'Miracle Igbokwe', ['Cee-C (Cynthia Nwadiora)', 'Tobi Bakre', 'Alex Unusual']],
  ['Season 4 - Pepper Dem (2019)', 'Mercy Eke ("Lambo")', ['Mike Edwards', 'Frodd', 'Omashola']],
  ['Season 5 - Lockdown (2020)', 'Laycon (Olamilekan Agbeleshe)', ['Dorathy Bachor', 'Nengi Rebecca Hampson', 'Neo Akpofure']],
  ['Season 6 - Shine Ya Eye (2021)', 'Whitemoney (Hazel Oyeze Onou)', ['Liquorose (Roseline Afije)', 'Pere Egbi', 'Cross Okonkwo']],
  ['Season 7 - Level Up (2022)', 'Phyna (Ijeoma Otabor)', ['Bryann', 'Bella Okagbue', 'Adekunle Olopade']],
  ['Season 8 - All Stars (2023)', 'Ilebaye Odiniya ("Gen Z Baddie")', ['Mercy Eke', 'Cee-C', 'Adekunle Olopade']]
];

for (const [season, winner, wrong] of bbnSeasons) {
  additions['nigerian-entertainment'].push(makeQ(`Who was crowned the winner of Big Brother Naija ${season}?`, winner, wrong, 'bbnaija-winners'));
}

// =========================================================================
// 2. NIGERIAN MUSIC: COMPLETE PUSH TO 800+
// =========================================================================
const albumLore = [
  ['Wizkid', 'Superstar (2011)', ['Made in Lagos', 'Ayo', 'Sounds from the Other Side'], 'Featuring "Holla at Your Boy" on Empire Mates Entertainment'],
  ['Wizkid', 'Ayo (Joy, 2014)', ['Superstar', 'Made in Lagos', 'More Love, Less Ego'], 'Featuring "Ojuelegba" and "Jaiye Jaiye" with Femi Kuti'],
  ['Wizkid', 'More Love, Less Ego (2022)', ['Superstar', 'Ayo', 'Made in Lagos'], 'Featuring "Bad To Me" and "Money & Love"'],
  ['Davido', 'Omo Baba Olowo (2012)', ['A Good Time', 'A Better Time', 'Timeless'], 'Debut studio album featuring "Dami Duro"'],
  ['Davido', 'A Good Time (2019)', ['Omo Baba Olowo', 'A Better Time', 'Son of Mercy'], 'Featuring "Fall", "If", and "Blow My Mind" with Chris Brown'],
  ['Davido', 'A Better Time (2020)', ['Omo Baba Olowo', 'A Good Time', 'Timeless'], 'Featuring "Fem", "Jowo", and "Holy Ground" with Nicki Minaj'],
  ['Burna Boy', 'L.I.F.E (2013)', ['African Giant', 'Twice as Tall', 'Love, Damini'], 'Debut studio album featuring "Like to Party" and "Tonight"'],
  ['Burna Boy', 'African Giant (2019)', ['L.I.F.E', 'Twice as Tall', 'I Told Them...'], 'Breakthrough album featuring "Ye", "Anybody", and "On the Low"'],
  ['Burna Boy', 'Love, Damini (2022)', ['African Giant', 'Twice as Tall', 'L.I.F.E'], 'Featuring the global summer anthem "Last Last" (Breakfast)'],
  ['Burna Boy', 'I Told Them... (2023)', ['African Giant', 'Twice as Tall', 'Love, Damini'], 'Featuring "City Boys" and "Cheat on Me" with Dave'],
  ['Olamide', 'Rapsodi (2011)', ['YBNL', 'Baddest Guy Ever Liveth', 'Carpe Diem'], 'Debut album featuring "Eni Duro" on Coded Tunes'],
  ['Olamide', 'YBNL (2012)', ['Rapsodi', 'Street OT', 'Eyan Mayweather'], 'Second album featuring "First of All" and "Voice of the Street"'],
  ['Olamide', 'Baddest Guy Ever Liveth (2013)', ['Rapsodi', 'YBNL', 'Lagos Nawa'], 'Featuring "Durosoke", "Turn Up", and "Yemi My Lover"'],
  ['Olamide', 'Carpe Diem (2020)', ['Rapsodi', 'YBNL', 'Street OT'], 'Featuring "Infinity" with Omah Lay and "Loading" with Bad Boy Timz'],
  ['Tiwa Savage', 'Once Upon a Time (2013)', ['R.E.D', 'Celia', 'Water & Garri'], 'Debut album featuring "Kele Kele Love" and "Love Me (3x)"'],
  ['Tiwa Savage', 'Celia (2020)', ['Once Upon a Time', 'R.E.D', 'Sugarcane'], 'Named after her mother and featuring "Koroba" and "Dangerous Love"'],
  ['Asake', 'Mr. Money With The Vibe (2022)', ['Work of Art', 'Lungu Boy', 'Ololade Asake'], 'Debut blockbuster album featuring "Sungba", "Terminator", and "PBUY"'],
  ['Asake', 'Work of Art (2023)', ['Mr. Money With The Vibe', 'Lungu Boy', 'Ololade Asake'], 'Second album featuring "2:30", "Amapiano", and "Basquiat"'],
  ['Asake', 'Lungu Boy (2024)', ['Mr. Money With The Vibe', 'Work of Art', 'Ololade Asake'], 'Third album featuring "MMS" with Wizkid and "Active" with Travis Scott'],
  ['Rema', 'Rave & Roses (2022)', ['HEIS', 'Rema Compilation', 'Iron Man'], 'Debut album featuring "Calm Down", "Soundgasm", and "Charm"'],
  ['Rema', 'HEIS (2024)', ['Rave & Roses', 'Iron Man', 'Bad Commando'], 'High-energy rave album featuring "Benin Boys" with Shallipopi and "Ozeba"'],
  ['Ayra Starr', '19 & Dangerous (2021)', ['The Year I Turned 21', 'Ayra Starr EP', 'Celestial'], 'Debut album featuring "Bloody Samaritan" and "Fashion Killer"'],
  ['Ayra Starr', 'The Year I Turned 21 (2024)', ['19 & Dangerous', 'Celestial', 'Rush Hour'], 'Second album featuring "Santa", "Commas", and "Last Heartbreak Song"'],
  ['Fireboy DML', 'Apollo (2020)', ['Laughter, Tears and Goosebumps', 'Playboy', 'Adedamola'], 'Second album featuring "Champion", "Tattoo", and "Eli"'],
  ['Fireboy DML', 'Playboy (2022)', ['Laughter, Tears and Goosebumps', 'Apollo', 'Adedamola'], 'Featuring the worldwide smash hit "Peru" with Ed Sheeran'],
  ['Shallipopi', 'Presido La Pluto (2023)', ['Shakespopi', 'Planet Pluto', 'Elon Musk'], 'Debut album featuring "Cast" with Odumodublvck and "Ex Convict"'],
  ['Shallipopi', 'Shakespopi (2024)', ['Presido La Pluto', 'Planet Pluto', 'Evian'], 'Second album featuring the highlife-infused anthem "ASAP"'],
  ['Seyi Vibez', 'Billion Dollar Baby (2022)', ['Vibe Till Thy Kingdom Come', 'Thy Kingdom Come', 'Nahf Cos Nahf'], 'Breakout album featuring "Chance (Na Ham)", "Bullion Van", and "Kun Faya Kun"']
];

for (const [artist, album, wrong, desc] of albumLore) {
  additions['nigerian-music'].push(makeQ(`Which iconic Nigerian music album by ${artist} is described here: ${desc}?`, album, wrong, 'album-lore'));
  additions['nigerian-music'].push(makeQ(`Which Nigerian artist released the acclaimed album "${album}"?`, artist, ['Kizz Daniel', 'Flavour', 'Patoranking'], 'album-lore'));
}

// =========================================================================
// 3. NIGERIAN HISTORY: COMPLETE PUSH TO 800+
// =========================================================================
const statesCreation = [
  ['1967 (May 27)', 'General Yakubu Gowon', ['General Murtala Mohammed', 'Major General Aguiyi-Ironsi', 'General Olusegun Obasanjo'], 'Created 12 states from the 4 regions before the Civil War'],
  ['1976 (February 3)', 'General Murtala Ramat Mohammed', ['General Yakubu Gowon', 'General Olusegun Obasanjo', 'General Ibrahim Babangida'], 'Expanded Nigeria from 12 to 19 states and initiated Abuja FCT'],
  ['1987 (September 23)', 'General Ibrahim Babangida', ['General Muhammadu Buhari', 'General Sani Abacha', 'General Abdulsalami Abubakar'], 'Created Katsina and Akwa Ibom states (total 21 states)'],
  ['1991 (August 27)', 'General Ibrahim Babangida', ['General Sani Abacha', 'General Olusegun Obasanjo', 'Ernest Shonekan'], 'Created 9 new states to bring the total to 30 states'],
  ['1996 (October 1)', 'General Sani Abacha', ['General Ibrahim Babangida', 'General Abdulsalami Abubakar', 'General Olusegun Obasanjo'], 'Created the final 6 states (Bayelsa, Ebonyi, Ekiti, Gombe, Nasarawa, Zamfara) reaching 36 states']
];

for (const [date, leader, wrong, desc] of statesCreation) {
  additions['nigerian-history'].push(makeQ(`Which Nigerian Head of State ${desc} on ${date}?`, leader, wrong, 'states-creation'));
}

const governorsElections = [
  ['Babajide Sanwo-Olu', 'Lagos State', ['Ogun State', 'Oyo State', 'Osun State']],
  ['Seyi Makinde', 'Oyo State', ['Ogun State', 'Osun State', 'Ondo State']],
  ['Dapo Abiodun', 'Ogun State', ['Lagos State', 'Oyo State', 'Osun State']],
  ['Ademola Adeleke', 'Osun State', ['Oyo State', 'Ogun State', 'Ekiti State']],
  ['Lucky Aiyedatiwa', 'Ondo State', ['Ekiti State', 'Osun State', 'Edo State']],
  ['Biodun Oyebanji', 'Ekiti State', ['Ondo State', 'Osun State', 'Kogi State']],
  ['Godwin Obaseki / Monday Okpebholo', 'Edo State', ['Delta State', 'Ondo State', 'Rivers State']],
  ['Sheriff Oborevwori', 'Delta State', ['Edo State', 'Rivers State', 'Bayelsa State']],
  ['Siminalayi Fubara', 'Rivers State', ['Bayelsa State', 'Delta State', 'Akwa Ibom State']],
  ['Douye Diri', 'Bayelsa State', ['Rivers State', 'Delta State', 'Cross River State']],
  ['Umo Eno', 'Akwa Ibom State', ['Cross River State', 'Rivers State', 'Abia State']],
  ['Bassey Otu', 'Cross River State', ['Akwa Ibom State', 'Ebonyi State', 'Benue State']],
  ['Alex Otti', 'Abia State', ['Imo State', 'Enugu State', 'Anambra State']],
  ['Hope Uzodimma', 'Imo State', ['Abia State', 'Enugu State', 'Anambra State']],
  ['Peter Mbah', 'Enugu State', ['Anambra State', 'Ebonyi State', 'Abia State']],
  ['Charles Chukwuma Soludo', 'Anambra State', ['Enugu State', 'Imo State', 'Delta State']],
  ['Francis Nwifuru', 'Ebonyi State', ['Enugu State', 'Cross River State', 'Benue State']],
  ['Abba Kabir Yusuf', 'Kano State', ['Kaduna State', 'Katsina State', 'Jigawa State']],
  ['Uba Sani', 'Kaduna State', ['Kano State', 'Katsina State', 'Niger State']],
  ['Dikko Umaru Radda', 'Katsina State', ['Kano State', 'Kaduna State', 'Zamfara State']],
  ['Umar Namadi', 'Jigawa State', ['Kano State', 'Yobe State', 'Bauchi State']],
  ['Dauda Lawal', 'Zamfara State', ['Sokoto State', 'Kebbi State', 'Katsina State']],
  ['Ahmed Aliyu', 'Sokoto State', ['Kebbi State', 'Zamfara State', 'Niger State']],
  ['Nasir Idris', 'Kebbi State', ['Sokoto State', 'Niger State', 'Zamfara State']],
  ['Mohammed Umar Bago', 'Niger State', ['Kaduna State', 'Kwara State', 'Kogi State']],
  ['AbdulRahman AbdulRazaq', 'Kwara State', ['Kogi State', 'Niger State', 'Osun State']],
  ['Ahmed Usman Ododo', 'Kogi State', ['Kwara State', 'Benue State', 'Nasarawa State']],
  ['Hyacinth Alia', 'Benue State', ['Nasarawa State', 'Plateau State', 'Taraba State']],
  ['Abdullahi Sule', 'Nasarawa State', ['Plateau State', 'Benue State', 'Kaduna State']],
  ['Caleb Mutfwang', 'Plateau State', ['Nasarawa State', 'Bauchi State', 'Benue State']],
  ['Bala Mohammed', 'Bauchi State', ['Gombe State', 'Plateau State', 'Yobe State']],
  ['Inuwa Yahaya', 'Gombe State', ['Bauchi State', 'Taraba State', 'Adamawa State']],
  ['Ahmadu Umaru Fintiri', 'Adamawa State', ['Taraba State', 'Borno State', 'Gombe State']],
  ['Agbu Kefas', 'Taraba State', ['Adamawa State', 'Benue State', 'Plateau State']],
  ['Babagana Zulum', 'Borno State', ['Yobe State', 'Adamawa State', 'Bauchi State']],
  ['Mai Mala Buni', 'Yobe State', ['Borno State', 'Bauchi State', 'Gombe State']]
];

for (const [gov, state, wrong] of governorsElections) {
  additions['nigerian-history'].push(makeQ(`In Nigerian political history, which state does Governor ${gov} govern?`, state, wrong, 'state-governors'));
}

// =========================================================================
// 4. NIGERIAN FOOD: COMPLETE PUSH TO 800+
// =========================================================================
const foodPairs = [
  ['Boli (Roast plantain)', 'Roasted Groundnuts (Peanuts) / Pepper Sauce & Fish', ['Boiled Eggs only', 'Fried Yam', 'Raw Garri']],
  ['Akara (Bean cakes)', 'Pap (Ogi / Akamu / Koko) or Custard / Fresh Bread', ['Egusi soup', 'Pounded yam', 'Jollof rice']],
  ['Moi Moi (Steamed bean pudding)', 'Jollof Rice / Fried Rice / Pap', ['Ogbono soup', 'Afang soup', 'Bitterleaf soup']],
  ['Amala (Yam flour swallow)', 'Gbegiri (Bean soup), Ewedu, and Buka Stew (Abula)', ['Ofe Nsala', 'Edikang Ikong', 'Banga soup']],
  ['Pounded Yam (Iyan)', 'Egusi Soup / Efo Riro / Ofe Nsala', ['Raw Milk', 'Fried Plantain', 'Pap']],
  ['Eba (Garri swallow)', 'Egusi Soup / Ogbono Soup / Okra Soup', ['Bread', 'Custard', 'Moi Moi']],
  ['Starch (Usi)', 'Banga Soup (Oghwo Amiedi) / Owo Soup', ['Ewedu', 'Gbegiri', 'Miyan Kuka']],
  ['Tuwo Shinkafa (Mashed rice swallow)', 'Miyan Kuka / Miyan Taushai', ['Edikang Ikong', 'Ofe Owerri', 'Black soup']],
  ['Abacha (African Salad)', 'Ugba (Oil bean seed), Garden eggs, Fried fish, and Kpomo', ['Bread', 'Boiled Rice', 'Eba']],
  ['Suya (Spiced roasted beef)', 'Sliced red onions, tomatoes, and cabbage with Yaji pepper', ['Ewedu soup', 'Pounded yam', 'Pap']],
  ['Ofada Rice', 'Ayamase (Designer green pepper stew) with boiled eggs and assorted meats', ['Banga soup', 'Miyan Kuka', 'Ogbono soup']],
  ['Ukwa (African breadfruit porridge)', 'Fried fish, dried fish, and bitterleaf/corn', ['Bread', 'Custard', 'Pounded yam']],
  ['Kilishi (Dried beef jerky)', 'Chilled drink / Soft drinks and onions', ['Ogbono soup', 'Ewedu', 'Pap']],
  ['Agege Bread', 'Ewa Aganyin (Spicy mashed beans with dark chili sauce)', ['Egusi soup', 'Banga soup', 'Ofe Nsala']],
  ['Masa (Waina - Fermented rice cakes)', 'Miyan Taushai or Yaji pepper & sugar', ['Afang soup', 'Efo Riro', 'Edikang Ikong']],
  ['Dan Wake (Bean dumplings)', 'Groundnut oil, Yaji pepper, sliced onions and boiled eggs', ['Egusi soup', 'Ogbono soup', 'Bitterleaf soup']],
  ['Gurasa (Northern flatbread)', 'Yaji pepper spice and Suya meat', ['Egusi soup', 'Afang soup', 'Ofe Akwu']]
];

for (const [item, pair, wrong] of foodPairs) {
  additions['nigerian-food'].push(makeQ(`What is the traditional and most famous accompaniment for ${item} in Nigerian cuisine?`, pair, wrong, 'food-pairings'));
}

// =========================================================================
// 5. PIDGIN ENGLISH: COMPLETE PUSH TO 800+
// =========================================================================
const pidginExpressions = [
  ['No gree for anybody', 'Stand your ground firmly and do not let anyone oppress or deter you', ['Fight everyone you meet', 'Refuse to eat food', 'Stop going to work']],
  ['Senior man', 'An influential, wealthy, generous, or respected figure', ['An elderly grandfather', 'A high school senior student', 'A retired officer']],
  ['Japa', 'Emigrate or flee from a place in search of greener pastures', ['Jump over a high fence', 'Dance to fast music', 'Fall into water']],
  ['Vawulence', 'Playful or intense drama, chaos, controversy, or conflict online/offline', ['Physical boxing match', 'Reading violent books', 'Going to court']],
  ['Carry go', 'You have my full permission, approval, and support to proceed', ['Carry heavy luggage', 'Walk away in anger', 'Transport goods by car']],
  ['Bone that matter', 'Drop the topic / Forget about the issue completely', ['Eat cooked beef bones', 'Discuss deeply', 'Examine medical x-rays']],
  ['Dey play', 'Continue joking around instead of taking life seriously', ['Go outside to play football', 'Turn on the video game', 'Play musical instruments']],
  ['Getat (Get out)', 'Leave this place immediately / Get lost', ['Buy something at a discount', 'Receive a gift', 'Enter the building']],
  ['Over sabi', 'Acting like a know-it-all or showing off excessive unsolicited knowledge', ['A genius professor', 'Failing an exam', 'Studying hard']],
  ['Woto woto', 'Severely, ruthlessly, continuously, or in great overwhelming quantity', ['Clean water', 'Soft rain', 'Walking slowly']],
  ['Kpai', 'To die, pass away, or completely cease functioning', ['To celebrate a birthday', 'To sing loudly', 'To fall asleep']],
  ['Gbege', 'Big trouble, sudden crisis, or severe controversy', ['Delicious feast', 'Large family meeting', 'Wedding ceremony']],
  ['Chop knuckle', 'Give a fist bump as a sign of agreement or greeting', ['Bite your finger', 'Eat cooked goat feet', 'Wash your hands']],
  ['Gbawe (Gbam)', 'Exactly / Spot on / That is the absolute truth', ['False rumor', 'Quiet down', 'Stop speaking']],
  ['Soro soke', 'Speak up clearly, loudly, and boldly without fear', ['Climb a high mountain', 'Look up at the sky', 'Whisper a secret']]
];

for (const [phrase, meaning, wrong] of pidginExpressions) {
  additions['pidgin-english'].push(makeQ(`In Nigerian Pidgin English, what does the expression "${phrase}" mean?`, meaning, wrong, 'pidgin-mastery'));
}

// Merge additions into trivia.json
let totalAdded = 0;
for (const [catName, qs] of Object.entries(additions)) {
  if (!rawData.categories[catName]) rawData.categories[catName] = [];
  const existingIds = new Set(rawData.categories[catName].map(q => q.id));
  let catAdded = 0;
  for (const q of qs) {
    if (!existingIds.has(q.id)) {
      rawData.categories[catName].push(q);
      existingIds.add(q.id);
      catAdded++;
    }
  }
  totalAdded += catAdded;
  console.log(`Category "${catName}": Added ${catAdded} questions. Total now: ${rawData.categories[catName].length}`);
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Successfully finished Group 1 master additions! Total questions added: ${totalAdded}`);
