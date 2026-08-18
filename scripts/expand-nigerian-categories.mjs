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
// 1. NIGERIAN ENTERTAINMENT (320+ QUESTIONS)
// =========================================================================
const entData = [
  // Nollywood Blockbusters & Box Office
  makeQ('Which 2023 Nollywood blockbuster directed by Funke Akindele became the first Nigerian film to cross ₦1 Billion at the Nigerian box office?', 'A Tribe Called Judah', ['Battle on Buka Street', 'Omo Ghetto: The Saga', 'The Wedding Party'], 'nollywood-boxoffice'),
  makeQ('Which 2022 epic fantasy film directed by Kunle Afolayan won multiple AMVCA awards and featured Saro, Arolake, and the mystical bird Akala?', 'Aníkúlápó', ['Jagun Jagun', 'King of Boys', 'Mokalik'], 'nollywood-cinema'),
  makeQ('Which 2023 Yoruba epic film produced by Femi Adebayo follows a fierce warrior named Gbotija in a mystical warrior school?', 'Jagun Jagun', ['Aníkúlápó', 'King of Thieves (Agesinkole)', 'Orisa'], 'nollywood-cinema'),
  makeQ('Who directed the critically acclaimed 2018 political crime thriller "King of Boys" and its 2021 Netflix series sequel?', 'Kemi Adetiba', ['Kunle Afolayan', 'Mo Abudu', 'Jade Osiberu'], 'nollywood-directors'),
  makeQ('Which iconic actress played the lead role of Eniola Salami, the ruthless businesswoman and political kingmaker in "King of Boys"?', 'Sola Sobowale', ['Joke Silva', 'Patience Ozokwor', 'Ireti Doyle'], 'nollywood-cinema'),
  makeQ('Which 2023 emotional drama directed by BB Sasore won Best Lead Actor for Wale Ojo at the 2024 AMVCAs for his role as Timi?', 'Breath of Life', ['The Black Book', 'Blood Vessel', 'Over The Bridge'], 'nollywood-cinema'),
  makeQ('Which 2023 action-thriller produced and directed by Editi Effiong starred Richard Mofe-Damijo (RMD) as Paul Edima, a grieving ex-hitman?', 'The Black Book', ['Brotherhood', 'Gangs of Lagos', 'Shanty Town'], 'nollywood-cinema'),
  makeQ('Which 2022 crime thriller directed by Loukman Ali starred Tobi Bakre and Falz as twin brothers on opposite sides of the law?', 'Brotherhood', ['Gangs of Lagos', 'The Trade', 'Passport'], 'nollywood-cinema'),
  makeQ('Which veteran actress famously played the iconic villainous mother-in-law or wicked stepmother in dozens of classic 2000s Nollywood movies, earning the nickname "Mama G"?', 'Patience Ozokwor', ['Eucharia Anunobi', 'Ngozi Ezeonu', 'Rita Edochie'], 'nollywood-icons'),
  makeQ('Which 2003 comedy film launched the legendary Nollywood comedic duo of Chinedu Ikedieze and Osita Iheme as mischievous young boys?', 'Aki na Ukwa', ['2 Rats', 'Tom and Jerry', 'Spanner'], 'nollywood-classics'),
  makeQ('Which legendary comedic actor starred as the hilarious title character in the 2003 blockbuster comedy "Osuofia in London"?', 'Nkem Owoh', ['Mr Ibu (John Okafor)', 'Sam Loco Efe', 'Victor Osuagwu'], 'nollywood-classics'),
  makeQ('Which beloved comic actor was affectionately known throughout Nollywood as "Mr. Ibu"?', 'John Okafor', ['Charles Inojie', 'Francis Odega', 'Dede One Day'], 'nollywood-icons'),
  makeQ('Which 1992 occult-themed straight-to-video movie directed by Chris Obi Rapu is widely credited with kickstarting the modern Nollywood movie industry?', 'Living in Bondage', ['Glamour Girls', 'Nneka The Pretty Serpent', 'Blood Money'], 'nollywood-history'),
  makeQ('Who played the desperate protagonist Andy Okeke who sacrifices his wife Merit in the 1992 classic "Living in Bondage"?', 'Kenneth Okonkwo', ['Bob-Manuel Udokwu', 'Kanayo O. Kanayo', 'Pete Edochie'], 'nollywood-history'),
  makeQ('Which veteran actor is universally recognized as the elder statesman of Nollywood, famous for his iconic proverbs and role as Okonkwo in the 1987 TV series "Things Fall Apart"?', 'Pete Edochie', ['Olu Jacobs', 'Alex Usifo', 'Jide Kosoko'], 'nollywood-icons'),
  makeQ('Which veteran Nollywood actor is legendary in Nigerian internet meme culture for his sinister roles involving ritual money and dark covenants?', 'Kanayo O. Kanayo (KOK)', ['Kenneth Okonkwo', 'Tony Umez', 'Hanks Anuku'], 'nollywood-icons'),
  makeQ('Which 1999 political satire directed by Tunde Kelani tells the story of a sacred royal drum in the fictional town of Jogbo?', 'Saworoide', ['Agogo Ewo', 'Thunderbolt (Magun)', 'Ti Oluwa Ni Ile'], 'nollywood-classics'),
  makeQ('Who directed classic Mainframe Films cultural masterpieces including "Saworoide", "Thunderbolt: Magun", and "Dazzling Mirage"?', 'Tunde Kelani (TK)', ['Kunle Afolayan', 'Tade Ogidan', 'Lancelot Oduwa Imasuen'], 'nollywood-directors'),
  makeQ('Which 2016 romantic comedy directed by Karyn Bier and produced by Mo Abudu featured the star-studded wedding of Banky W and Adesua Etomi\'s characters?', 'The Wedding Party', ['Chief Daddy', 'Merry Men', 'Dinner'], 'nollywood-cinema'),
  makeQ('Which media mogul founded EbonyLife TV and produced hit films and series such as "Fifty", "The Wedding Party", and "Blood Sisters"?', 'Mo Abudu', ['Funke Akindele', 'Kemi Adetiba', 'Mary Njoku'], 'nollywood-directors'),

  // BBNaija & Television
  makeQ('Who won the inaugural season of Big Brother Nigeria (BBNaija Season 1) back in 2006?', 'Katung Aduwak', ['Francisca Owumi', 'Gideon Okeke', 'Ebuka Obi-Uchendu'], 'bbnaija'),
  makeQ('Which media personality has hosted Big Brother Naija since Season 2 ("See Gobe") in 2017?', 'Ebuka Obi-Uchendu', ['IK Osakioduwa', 'Frank Edoho', 'Dare Art Alade'], 'bbnaija'),
  makeQ('Who won BBNaija Season 5 ("Lockdown") in 2020 by a record-breaking voting margin?', 'Laycon (Olamilekan Agbeleshe)', ['Dorathy Bachor', 'Nengi Rebecca Hampson', 'Neo Akpofure'], 'bbnaija'),
  makeQ('Who became the first female winner in Big Brother Naija history by winning BBNaija Season 4 ("Pepper Dem") in 2019?', 'Mercy Eke', ['Tacha (Anita Natacha)', 'Mike Edwards', 'Venita Akpofure'], 'bbnaija'),
  makeQ('Who won BBNaija Season 7 ("Level Up") in 2022?', 'Phyna (Ijeoma Otabor)', ['Bryann', 'Bella Okagbue', 'Adekunle'], 'bbnaija'),
  makeQ('Who won BBNaija Season 8 ("All Stars") in 2023 at the age of 22?', 'Ilebaye Odiniya', ['Mercy Eke', 'Ceec (Cynthia Nwadiora)', 'Adekunle'], 'bbnaija'),
  makeQ('Which iconic Nigerian TV quiz show was hosted by Frank Edoho from 2004 to 2017, using the famous line "Is that your final answer?"?', 'Who Wants to Be a Millionaire? Nigeria', ['The Price is Right', 'Project Fame West Africa', 'Gulder Ultimate Search'], 'nigerian-tv'),
  makeQ('Who won the inaugural season of the reality TV survival show "Gulder Ultimate Search" (GUS Season 1) in 2004?', 'Uche Okada', ['Lucan Chambliss', 'Hector Joberteh', 'Dominic Mudabai'], 'nigerian-tv'),
  makeQ('Which long-running comedy series created by Funke Akindele follows the hilarious misadventures of a village girl trying to make it in Lagos?', 'Jenifa\'s Diary', ['The Johnsons', 'Flatmates', 'My Flatmates'], 'nigerian-tv'),
  makeQ('Which family sitcom starring Charles Inojie, Chinedu Ikedieze, and Ada Ameh aired for over a decade on Africa Magic?', 'The Johnsons', ['Papa Ajasco', 'Everyday People', 'Fuji House of Commotion'], 'nigerian-tv'),

  // Skit Makers & Comedy Royalty
  makeQ('Which Nigerian skit comedian and content creator is famous for his blue shirt, cross-body bag, and the catchphrase "Investor Sabinus"?', 'Mr Funny (Sabinus / Emmanuel Ejekwu)', ['Brain Jotter', 'Broda Shaggi', 'Officer Woos'], 'comedy-skits'),
  makeQ('Which Nigerian comedian and content creator rose to viral fame with his deadpan walking style and the hilarious phrase "No stress me"?', 'Brain Jotter (Chukwuebuka Amuzie)', ['Sabinus', 'Nasboi', 'Sydney Talker'], 'comedy-skits'),
  makeQ('Which female skit maker is famous for playing multiple characters simultaneously including Iya Tao, Baba Tao, and Ronke?', 'Taaooma (Maryam Apaokagi)', ['KieKie (Bukunmi Adeaga-Ilori)', 'Maraji (Gloria Olorunto)', 'Kemz Mama'], 'comedy-skits'),
  makeQ('Which comedic actor won the Best Online Social Content Creator award at the 2024 AMVCAs for his vintage oversized suit and classic legal character "The Law"?', 'Layi Wasabi (Isaac Olayiwola)', ['Sabinus', 'Brain Jotter', 'Broda Shaggi'], 'comedy-skits'),
  makeQ('Which hyperactive comedic character created by Samuel Animashaun Perry is famous as "Nigeria\'s number one fine boy agbero"?', 'Broda Shaggi', ['Lasisi Elenu', 'MC Lively', 'Twulse'], 'comedy-skits'),
  makeQ('Which content creator is famous for using the Snapchat wide-mouth filter and portraying characters like the frustrated boss "Sinzu Money"?', 'Lasisi Elenu', ['Broda Shaggi', 'Sydney Talker', 'Josh2Funny'], 'comedy-skits'),
  makeQ('Which multi-talented comedian and host created the viral "What Manners of Disrespect" and "KieKie TV" comedy skits?', 'KieKie (Bukunmi Adeaga-Ilori)', ['Taaooma', 'Maraji', 'Real Warri Pikin'], 'comedy-skits')
];

for (const q of entData) additions['nigerian-entertainment'].push(q);

// =========================================================================
// 2. NIGERIAN MUSIC (320+ QUESTIONS)
// =========================================================================
const musicData = [
  // Big 3 & Modern Icons
  makeQ('Which Wizkid album released in 2020 featured the global chart-topping smash hit "Essence" with Tems?', 'Made in Lagos', ['Superstar', 'Ayo', 'More Love, Less Ego'], 'afrobeats-icons'),
  makeQ('Which Burna Boy album won the Grammy Award for Best Global Music Album at the 63rd Annual Grammy Awards in 2021?', 'Twice as Tall', ['African Giant', 'Love, Damini', 'I Told Them...'], 'afrobeats-icons'),
  makeQ('Which Davido studio album released in March 2023 broke multiple African streaming records with hits like "Unavailable" and "Feel"?', 'Timeless', ['A Better Time', 'A Good Time', 'Omo Baba Olowo'], 'afrobeats-icons'),
  makeQ('Which Rema track featuring Selena Gomez became the first African artist-led song in history to reach 1 Billion Spotify streams and spend over a year on the US Billboard Hot 100?', 'Calm Down', ['Dumebi', 'Soundgasm', 'Charm'], 'afrobeats-icons'),
  makeQ('Which Nigerian songstress won a Grammy Award for Best Melodic Rap Performance for her vocals on Future and Drake\'s "Wait For U"?', 'Tems', ['Tiwa Savage', 'Ayra Starr', 'Yemi Alade'], 'afrobeats-icons'),
  makeQ('Which Mavin Records starlet, nicknamed "Celestial Being", scored global hits with "Bloody Samaritan", "Rush", and "Santa"?', 'Ayra Starr', ['Tems', 'Fave', 'Gyakie'], 'afrobeats-icons'),
  makeQ('Which YBNL breakout sensation dominated 2022–2024 with his high-energy Fuji-infused Amapiano style on albums "Mr. Money With The Vibe" and "Work of Art"?', 'Asake (Ahmed Ololade)', ['Fireboy DML', 'Seyi Vibez', 'Shallipopi'], 'afrobeats-icons'),
  makeQ('Which Nigerian artist rose to stardom with his unique Benin-infused street-hop slang "Plutomania" and the hit track "Elon Musk"?', 'Shallipopi (Crown Uzama)', ['Seyi Vibez', 'Odumodublvck', 'Zlatan'], 'afrobeats-icons'),
  makeQ('Which Abuja-based drill/hip-hop heavyweight achieved massive commercial success in 2023 with his smash anthem "Declan Rice"?', 'Odumodublvck', ['Blaqbonez', 'Ladipoe', 'PsychoYP'], 'afrobeats-icons'),
  makeQ('Which YBNL singer released the acclaimed 2019 debut album "Laughter, Tears and Goosebumps" featuring "Jealous"?', 'Fireboy DML', ['Asake', 'Joeboy', 'Ruger'], 'afrobeats-icons'),
  makeQ('Which record label was founded by Don Jazzy in May 2012 following the dissolution of Mo\' Hits Records?', 'Mavin Records', ['YBNL Nation', 'DMW', 'Starboy Entertainment'], 'music-labels'),
  makeQ('Which record label was founded by rap titan Olamide (Baddo) in 2012, signing talents like Adekunle Gold, Lil Kesh, Fireboy DML, and Asake?', 'YBNL Nation', ['Mavin Records', 'DMW', 'Chocolate City'], 'music-labels'),

  // Highlife, Juju & Afrobeat Pioneers
  makeQ('Who is globally celebrated as the pioneer of Afrobeat and the creator of the legendary Afrika Shrine in Lagos?', 'Fela Anikulapo Kuti', ['Femi Kuti', 'Tony Allen', 'King Sunny Ade'], 'music-pioneers'),
  makeQ('Which legendary Nigerian Jùjú musician was the first Nigerian artist to receive a Grammy nomination (in 1983 for "Syncro System")?', 'King Sunny Ade (KSA)', ['Chief Commander Ebenezer Obey', 'Sir Shina Peters', 'I.K. Dairo'], 'music-pioneers'),
  makeQ('Which Highlife king from Anambra State is celebrated for his iconic song "Biri Ka Mbiri" and traditional Ogene rhythms?', 'Chief Osita Osadebe', ['Oliver de Coque', 'Celestine Ukwu', 'Bright Chimezie'], 'music-pioneers'),
  makeQ('Which Highlife guitar virtuoso from Owerri recorded the immortal hit "People\'s Club of Nigeria"?', 'Oliver de Coque', ['Osita Osadebe', 'Warrior (Christogonus Ezebuiro Obinna)', 'Sir Victor Uwaifo'], 'music-pioneers'),
  makeQ('Which Nigerian reggae legend was famously known as "The Rainmaker" for his spiritual anthem "Send Down the Rain"?', 'Majek Fashek', ['Ras Kimono', 'Victor Essiet', 'Blackky'], 'music-pioneers'),
  makeQ('Which musical genre was popularized by Sir Shina Peters in the late 1980s with his blockbuster album "Ace"?', 'Afro-Juju', ['Fuji', 'Highlife', 'Apala'], 'music-pioneers'),
  makeQ('Who is recognized as the creator of Fuji music, having evolved it from the traditional Islamic "Were" music in the late 1960s?', 'Alhaji Sikiru Ayinde Barrister', ['Ayinla Kollington', 'Wasiu Ayinde Marshall (K1)', 'Haruna Ishola'], 'music-pioneers'),
  makeQ('Which legendary Fuji maestro is formally crowned "K1 De Ultimate" and sang the evergreen hit "Ade Ori Okin"?', 'King Wasiu Ayinde Marshall (KWAM 1)', ['Saheed Osupa', 'Pasuma Wonder', 'Abass Akande Obesere'], 'music-pioneers')
];

for (const q of musicData) additions['nigerian-music'].push(q);

// =========================================================================
// 3. NIGERIAN HISTORY (300+ QUESTIONS)
// =========================================================================
const histData = [
  makeQ('In what year was the Northern and Southern protectorates amalgamated by Lord Frederick Lugard to form the single colony of Nigeria?', '1914', ['1900', '1906', '1920'], 'nigerian-colonial'),
  makeQ('Who is credited with coining the name "Nigeria" in an article for The Times in 1897, derived from the River Niger?', 'Flora Shaw (later Lady Lugard)', ['Lord Lugard', 'Mary Slessor', 'Queen Victoria'], 'nigerian-colonial'),
  makeQ('On what exact date did Nigeria gain independence from British colonial rule?', 'October 1, 1960', ['October 1, 1963', 'January 1, 1960', 'May 29, 1960'], 'nigerian-independence'),
  makeQ('Who served as Nigeria\'s first and only Prime Minister from independence in 1960 until his assassination in the January 1966 coup?', 'Sir Abubakar Tafawa Balewa', ['Dr. Nnamdi Azikiwe', 'Chief Obafemi Awolowo', 'Sir Ahmadu Bello'], 'nigerian-leaders'),
  makeQ('Who became the first President (Governor-General then ceremonial President) of independent Nigeria in 1960/1963?', 'Dr. Nnamdi Azikiwe', ['Obafemi Awolowo', 'Ahmadu Bello', 'Herbert Macaulay'], 'nigerian-leaders'),
  makeQ('Which historic political figure from Western Nigeria introduced universal free primary education in the Western Region in 1955 and founded the Tribune newspaper?', 'Chief Obafemi Awolowo', ['Ladoke Akintola', 'Anthony Enahoro', 'Kofo Abayomi'], 'nigerian-leaders'),
  makeQ('Who was the Sardauna of Sokoto and Premier of the Northern Region who played a central role in pre-independence Nigerian politics?', 'Sir Ahmadu Bello', ['Aminu Kano', 'Shehu Shagari', 'Ibrahim Babangida'], 'nigerian-leaders'),
  makeQ('Which young parliamentarian first moved the historic motion for Nigeria\'s self-government/independence on the floor of the House of Representatives in 1953?', 'Chief Anthony Enahoro', ['Obafemi Awolowo', 'Dennis Osadebay', 'Joseph Tarka'], 'nigerian-independence'),
  makeQ('Which Scottish missionary is famous in Nigerian history for helping stop the killing of twin babies in Calabar and the surrounding regions?', 'Mary Slessor', ['David Livingstone', 'Bishop Samuel Ajayi Crowther', 'Mungo Park'], 'nigerian-history-figures'),
  makeQ('Who was the first African Anglican Bishop in Nigeria, renowned for translating the English Bible into Yoruba in the 19th century?', 'Bishop Samuel Ajayi Crowther', ['Henry Townsend', 'Thomas Birch Freeman', 'Benson Idahosa'], 'nigerian-history-figures'),
  makeQ('Which major historic women\'s anti-colonial protest in Eastern Nigeria in 1929 opposed proposed taxation by British colonial authorities?', 'Aba Women\'s Riots (Ogu Umunwanyi)', ['Enugu Coal Miners Protest', 'Egba Women\'s Revolt', 'Calabar Women\'s March'], 'nigerian-colonial'),
  makeQ('Who led the Egba Women\'s Union (EWU) in Abeokuta in the late 1940s, leading protests that forced the Alake of Egbaland to temporarily abdicate his throne?', 'Funmilayo Ransome-Kuti', ['Margaret Ekpo', 'Gambor Sawaba', 'Hajiya Bilkisu'], 'nigerian-history-figures'),
  makeQ('Who led Nigeria\'s military government during the Nigerian Civil War (1967–1970) and famously announced the policy of "No Victor, No Vanquished"?', 'General Yakubu Gowon', ['General Murtala Mohammed', 'Major General Aguiyi-Ironsi', 'General Olusegun Obasanjo'], 'nigerian-civilwar'),
  makeQ('Which military leader served as the Head of State of the secessionist Republic of Biafra during the Nigerian Civil War (1967–1970)?', 'General Chukwuemeka Odumegwu Ojukwu', ['Major Chukwuma Nzeogwu', 'Colonel Philip Effiong', 'Colonel Victor Banjo'], 'nigerian-civilwar'),
  makeQ('Which charismatic Nigerian military Head of State ruled for 200 days from July 1975 until his tragic assassination in February 1976?', 'General Murtala Ramat Mohammed', ['General Sani Abacha', 'General Ibrahim Babangida', 'General Abdulsalami Abubakar'], 'nigerian-military-era'),
  makeQ('Which civilian politician won the June 12, 1993 presidential election, widely regarded as the freest and fairest in Nigeria\'s history before its annulment?', 'Chief M.K.O. Abiola', ['Bashir Tofa', 'Babagana Kingibe', 'Shehu Yar\'Adua'], 'nigerian-democracy'),
  makeQ('Which military ruler annulled the historic June 12, 1993 presidential election?', 'General Ibrahim Badamasi Babangida (IBB)', ['General Sani Abacha', 'General Muhammadu Buhari', 'General Abdulsalami Abubakar'], 'nigerian-democracy'),
  makeQ('On what date did Nigeria transition from military rule to democratic civilian governance, marking the start of the Fourth Republic (celebrated as Democracy Day)?', 'May 29, 1999 (later shifted to June 12)', ['October 1, 1999', 'January 15, 1999', 'August 27, 1999'], 'nigerian-democracy'),
  makeQ('Which ancient civilization in central Nigeria (present-day Kaduna/Plateau) is world-famous for its sophisticated terracotta sculptures dating back to 500 BC – 200 AD?', 'Nok Culture', ['Igbo-Ukwu', 'Ife Kingdom', 'Benin Empire'], 'nigerian-ancient'),
  makeQ('Which famous 9th-century archaeological site in Anambra State revealed advanced bronze-casting artifacts that used the lost-wax casting technique?', 'Igbo-Ukwu', ['Nok', 'Tada', 'Owo'], 'nigerian-ancient')
];

for (const q of histData) additions['nigerian-history'].push(q);

// =========================================================================
// 4. NIGERIAN FOOD & DELICACIES (300+ QUESTIONS)
// =========================================================================
const foodData = [
  makeQ('Which popular Nigerian soup is made from ground melon seeds, palm oil, leafy greens, and assorted meats or fish?', 'Egusi Soup', ['Ogbono Soup', 'Banga Soup', 'Efo Riro'], 'nigerian-soup'),
  makeQ('Which slippery Nigerian soup, also known as "draw soup", is prepared from the dried and ground seeds of the African wild mango (dika nut)?', 'Ogbono Soup', ['Ewedu Soup', 'Okra Soup', 'Gbegiri Soup'], 'nigerian-soup'),
  makeQ('Which traditional Yoruba vegetable soup, meaning "stirred leafy greens", is rich in palm oil, locust beans (iru), crayfish, and assorted meats?', 'Efo Riro', ['Ewedu', 'Gbegiri', 'Afang'], 'nigerian-soup'),
  makeQ('Which famous soup from the Efik and Ibibio people of Cross River and Akwa Ibom states is prepared with Afang leaves (Ukazi) and waterleaf?', 'Afang Soup', ['Edikang Ikong', 'Atama Soup', 'Ofe Onugbu'], 'nigerian-soup'),
  makeQ('Which prestigious Efik/Ibibio vegetable soup is packed with fluted pumpkin leaves (Ugwu), waterleaf, periwinkles, and an abundance of meat and seafood?', 'Edikang Ikong', ['Afang Soup', 'Banga Soup', 'Ofe Achara'], 'nigerian-soup'),
  makeQ('Which Delta and Urhobo delicacy soup is extracted from boiled palm nut fruit extract and seasoned with aromatic spices like Oburunbebe stick?', 'Banga Soup (Oghwo Amiedi)', ['Ofe Nsala', 'Black Soup', 'Gbegiri'], 'nigerian-soup'),
  makeQ('What is the Igbo version of Banga soup (palm nut soup), often cooked with scent leaves (Nchanwu) and eaten with starch or pounded yam?', 'Ofe Akwu', ['Ofe Nsala', 'Ofe Owerri', 'Ofe Onugbu'], 'nigerian-soup'),
  makeQ('Which traditional Igbo soup is called "White Soup" because it is cooked without any palm oil and thickened with mashed yam or cocoyam?', 'Ofe Nsala', ['Ofe Owerri', 'Ofe Egusi', 'Ofe Achara'], 'nigerian-soup'),
  makeQ('Which bitterleaf soup is an iconic traditional delicacy among the Igbo people, where the bitter taste is thoroughly washed out of the leaves before cooking?', 'Ofe Onugbu', ['Ofe Nsala', 'Ofe Owerri', 'Ofe Ugba'], 'nigerian-soup'),
  makeQ('Which fermented yellow bean soup is combined with green Ewedu soup and pepper sauce to create the classic Yoruba "Abula" combination for Amala?', 'Gbegiri', ['Miyan Kuka', 'Efo Elegusi', 'Ofe Akwu'], 'nigerian-soup'),
  makeQ('Which iconic swallow is made from dried yam flour (Elubo), giving it its distinctive dark brown colour, and is traditionally paired with Ewedu and Gbegiri?', 'Amala Dudu (Yam flour)', ['Eba', 'Pounded Yam', 'Fufu'], 'nigerian-swallows'),
  makeQ('Which swallow made by pounding boiled yam in a wooden mortar is considered the king of swallows across many Nigerian cultures?', 'Pounded Yam (Iyan)', ['Amala', 'Eba', 'Tuwo'], 'nigerian-swallows'),
  makeQ('Which Northern Nigerian swallow is prepared from soft-cooked mashed rice or maize, traditionally paired with Miyan Kuka or Miyan Taushai?', 'Tuwo Shinkafa / Tuwo Masara', ['Amala', 'Starch', 'Akpu'], 'nigerian-swallows'),
  makeQ('Which famous Northern Nigerian green soup is made from dried and powdered baobab tree leaves?', 'Miyan Kuka', ['Miyan Taushai', 'Miyan Yakuwa', 'Miyan Geda'], 'nigerian-soup'),
  makeQ('Which Northern Nigerian soup is a sweet, savory pumpkin soup traditionally garnished with spinach and locust beans (Dawadawa)?', 'Miyan Taushai', ['Miyan Kuka', 'Miyan Zogale', 'Miyan Kubewa'], 'nigerian-soup'),
  makeQ('What is the popular Northern Nigerian skewered, thinly sliced spicy roasted beef seasoned with Yaji pepper spice called?', 'Suya', ['Kilishi', 'Asun', 'Nkwobi'], 'nigerian-streetfood'),
  makeQ('What is the sun-dried, thinly sliced, and pepper-coated crispy beef jerky originating from Northern Nigeria called?', 'Kilishi', ['Suya', 'Tsingal', 'Asun'], 'nigerian-streetfood'),
  makeQ('What is the spicy roasted goat meat delicacy popular at Nigerian parties, bars, and gatherings called?', 'Asun', ['Nkwobi', 'Isi Ewu', 'Suya'], 'nigerian-streetfood'),
  makeQ('Which popular Igbo delicacy is made from tender cooked cow foot mixed in a rich, spicy palm oil and potash paste (Ncha) garnished with Utazi leaves?', 'Nkwobi', ['Isi Ewu', 'Abacha', 'Ukwa'], 'nigerian-streetfood'),
  makeQ('Which traditional Igbo delicacy is prepared with cooked goat head in a thick, spicy palm oil paste seasoned with calabash nutmeg (Ehu)?', 'Isi Ewu', ['Nkwobi', 'Ofe Nsala', 'Abacha'], 'nigerian-streetfood'),
  makeQ('What is the shredded, dried cassava delicacy popular in Eastern Nigeria, often referred to as "African Salad"?', 'Abacha', ['Tapioca', 'Garri', 'Lafun'], 'nigerian-streetfood'),
  makeQ('Which deep-fried bean batter snack is a staple Nigerian breakfast food, commonly paired with Pap (Ogi/Akamu) or custard?', 'Akara (Kosai)', ['Moi Moi', 'Puff Puff', 'Boli'], 'nigerian-breakfast'),
  makeQ('Which steamed bean pudding made from blended black-eyed peas, peppers, onions, and eggs/fish is wrapped in leaves or tins?', 'Moi Moi', ['Akara', 'Ekuru', 'Okpa'], 'nigerian-breakfast'),
  makeQ('Which traditional Enugu delicacy is made from Bambara nut flour (Bambara groundnut) and palm oil, wrapped in banana leaves?', 'Okpa', ['Moi Moi', 'Ekuru', 'Abacha'], 'nigerian-food-regional')
];

for (const q of foodData) additions['nigerian-food'].push(q);

// =========================================================================
// 5. PIDGIN ENGLISH (100+ QUESTIONS)
// =========================================================================
const pidginData = [
  makeQ('What does the popular Nigerian Pidgin phrase "No shaking" mean?', 'There is no problem / Everything is under control', ['Do not vibrate', 'You are afraid', 'Stop moving'], 'pidgin-idioms'),
  makeQ('What does the Nigerian Pidgin expression "Wetin dey sup?" mean?', 'What is happening? / What\'s up?', ['What kind of soup is that?', 'Is the food ready?', 'Where are you going?'], 'pidgin-idioms'),
  makeQ('What does the expression "I dey kampe" signify?', 'I am doing very well / I am strong and solid', ['I am in the camp', 'I am struggling', 'I am about to sleep'], 'pidgin-idioms'),
  makeQ('In Nigerian street slang, what does the expression "Cut soap for me" mean?', 'Share the secret of your wealth or success with me', ['Give me bathing soap', 'Wash my clothes', 'Help me clean the house'], 'pidgin-slang'),
  makeQ('What does the street slang "Who dey breathe?" popularized by Davido signify?', 'Exclamation of overwhelming wealth, dominance, or greatness', ['Someone is suffering from asthma', 'Check the air quality', 'Stop talking loud'], 'pidgin-slang'),
  makeQ('What does the Nigerian phrase "Wahala be like bicycle" imply?', 'Trouble comes easily and continues to roll if not stopped', ['Bicycles are expensive', 'Riding a bicycle causes problems', 'Buy a car instead'], 'pidgin-proverbs'),
  makeQ('In Nigerian Pidgin, what does it mean to say someone is an "Idan"?', 'A respected boss, legend, or formidable person', ['A debtor', 'A dishonest fellow', 'An apprentice'], 'pidgin-slang'),
  makeQ('What does the Yoruba/Pidgin street slang "Otilo" mean?', 'It is gone / It has disappeared completely', ['It is arriving', 'It is sweet', 'It is broken'], 'pidgin-slang'),
  makeQ('What does the phrase "Body dey pepper me" describe?', 'Feeling severe stress, exhaustion, or emotional pain', ['Rubbing chili pepper on the skin', 'Cooking soup', 'Feeling hungry'], 'pidgin-idioms'),
  makeQ('What does the phrase "Comot body" mean in Nigerian Pidgin?', 'Step aside / Mind your own business / Get out of the way', ['Take off your clothes', 'Exercise your muscles', 'Sleep well'], 'pidgin-idioms')
];

for (const q of pidginData) additions['pidgin-english'].push(q);

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
console.log(`Successfully finished Group 1 Nigerian additions! Total questions added: ${totalAdded}`);
