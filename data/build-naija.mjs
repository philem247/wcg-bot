import { writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5)
}

function generateQs(data, templates, extractCorrect, extractWrong) {
  const qs = []
  const wrongPool = [...new Set(data.map(extractWrong))].filter(Boolean)
  for (const item of data) {
    for (const t of templates) {
      const qText = t(item)
      if (!qText) continue
      const correct = extractCorrect(item)
      if (!correct) continue
      const wrong = shuffle(wrongPool.filter(p => p !== correct)).slice(0, 3)
      if (wrong.length === 3) {
        qs.push({ id: randomUUID(), q: qText, correct, wrong })
      }
    }
  }
  return qs
}

const vehicles = [
  { v: 'Corolla', m: 'Toyota', c: 'Japan' },
  { v: 'Civic', m: 'Honda', c: 'Japan' },
  { v: 'Mustang', m: 'Ford', c: 'USA' },
  { v: '911', m: 'Porsche', c: 'Germany' },
  { v: 'Golf', m: 'Volkswagen', c: 'Germany' },
  { v: 'Camry', m: 'Toyota', c: 'Japan' },
  { v: 'F-150', m: 'Ford', c: 'USA' },
  { v: 'Model S', m: 'Tesla', c: 'USA' },
  { v: 'Accord', m: 'Honda', c: 'Japan' },
  { v: 'Wrangler', m: 'Jeep', c: 'USA' },
  { v: 'Challenger', m: 'Dodge', c: 'USA' },
  { v: 'Aventador', m: 'Lamborghini', c: 'Italy' },
  { v: 'Huracan', m: 'Lamborghini', c: 'Italy' },
  { v: '488 GTB', m: 'Ferrari', c: 'Italy' },
  { v: 'Enzo', m: 'Ferrari', c: 'Italy' },
  { v: 'Chiron', m: 'Bugatti', c: 'France' },
  { v: 'Veyron', m: 'Bugatti', c: 'France' },
  { v: 'Camaro', m: 'Chevrolet', c: 'USA' },
  { v: 'Corvette', m: 'Chevrolet', c: 'USA' },
  { v: 'Silverado', m: 'Chevrolet', c: 'USA' },
  { v: 'Altima', m: 'Nissan', c: 'Japan' },
  { v: 'GT-R', m: 'Nissan', c: 'Japan' },
  { v: 'Outback', m: 'Subaru', c: 'Japan' },
  { v: 'Impreza', m: 'Subaru', c: 'Japan' },
  { v: 'RX-7', m: 'Mazda', c: 'Japan' },
  { v: 'MX-5 Miata', m: 'Mazda', c: 'Japan' },
  { v: 'S-Class', m: 'Mercedes-Benz', c: 'Germany' },
  { v: 'G-Class', m: 'Mercedes-Benz', c: 'Germany' },
  { v: '3 Series', m: 'BMW', c: 'Germany' },
  { v: 'M5', m: 'BMW', c: 'Germany' },
  { v: 'A4', m: 'Audi', c: 'Germany' },
  { v: 'R8', m: 'Audi', c: 'Germany' },
  { v: 'Phantom', m: 'Rolls-Royce', c: 'UK' },
  { v: 'Ghost', m: 'Rolls-Royce', c: 'UK' },
  { v: 'Continental GT', m: 'Bentley', c: 'UK' },
  { v: 'DB11', m: 'Aston Martin', c: 'UK' },
  { v: 'Vantage', m: 'Aston Martin', c: 'UK' },
  { v: 'Range Rover', m: 'Land Rover', c: 'UK' },
  { v: 'Defender', m: 'Land Rover', c: 'UK' },
  { v: 'F-Type', m: 'Jaguar', c: 'UK' },
  { v: 'Tucson', m: 'Hyundai', c: 'South Korea' },
  { v: 'Elantra', m: 'Hyundai', c: 'South Korea' },
  { v: 'Sportage', m: 'Kia', c: 'South Korea' },
  { v: 'Sorento', m: 'Kia', c: 'South Korea' },
  { v: 'XC90', m: 'Volvo', c: 'Sweden' },
  { v: 'S60', m: 'Volvo', c: 'Sweden' },
  { v: 'Giulia', m: 'Alfa Romeo', c: 'Italy' },
  { v: 'Stelvio', m: 'Alfa Romeo', c: 'Italy' },
  { v: '500', m: 'Fiat', c: 'Italy' },
  { v: 'Panda', m: 'Fiat', c: 'Italy' },
  { v: 'Clio', m: 'Renault', c: 'France' },
  { v: 'Megane', m: 'Renault', c: 'France' },
  { v: '208', m: 'Peugeot', c: 'France' },
  { v: '3008', m: 'Peugeot', c: 'France' }
]

const naijaMusic = [
  { s: 'Ye', a: 'Burna Boy', y: '2018', al: 'Outside' },
  { s: 'Last Last', a: 'Burna Boy', y: '2022', al: 'Love, Damini' },
  { s: 'Essence', a: 'Wizkid', y: '2020', al: 'Made in Lagos' },
  { s: 'Ojuelegba', a: 'Wizkid', y: '2014', al: 'Ayo' },
  { s: 'Fall', a: 'Davido', y: '2017', al: 'A Good Time' },
  { s: 'If', a: 'Davido', y: '2017', al: 'A Good Time' },
  { s: 'Calm Down', a: 'Rema', y: '2022', al: 'Rave & Roses' },
  { s: 'Dumebi', a: 'Rema', y: '2019', al: 'Rema' },
  { s: 'Lonely At The Top', a: 'Asake', y: '2023', al: 'Work of Art' },
  { s: 'Sungba', a: 'Asake', y: '2022', al: 'Mr. Money With The Vibe' },
  { s: 'Peru', a: 'Fireboy DML', y: '2021', al: 'Playboy' },
  { s: 'Jealous', a: 'Fireboy DML', y: '2018', al: 'Laughter, Tears and Goosebumps' },
  { s: 'Finesse', a: 'Pheelz', y: '2022', al: 'Finesse' },
  { s: 'Buga (Lo Lo Lo)', a: 'Kizz Daniel', y: '2022', al: 'Buga' },
  { s: 'Woju', a: 'Kizz Daniel', y: '2014', al: 'New Era' },
  { s: 'Love Nwantiti', a: 'CKay', y: '2019', al: 'CKay the First' },
  { s: 'Emiliana', a: 'CKay', y: '2021', al: 'Emiliana' },
  { s: 'Water', a: 'Tyla', y: '2023', al: 'Tyla' },
  { s: 'Free Mind', a: 'Tems', y: '2020', al: 'For Broken Ears' },
  { s: 'Damages', a: 'Tems', y: '2020', al: 'For Broken Ears' },
  { s: 'Rush', a: 'Ayra Starr', y: '2022', al: '19 & Dangerous' },
  { s: 'Bloody Samaritan', a: 'Ayra Starr', y: '2021', al: '19 & Dangerous' },
  { s: 'Soso', a: 'Omah Lay', y: '2022', al: 'Boy Alone' },
  { s: 'Godly', a: 'Omah Lay', y: '2020', al: 'What Have We Done' },
  { s: 'Manya', a: 'Wizkid', y: '2017', al: 'Manya' },
  { s: 'On the Low', a: 'Burna Boy', y: '2018', al: 'African Giant' },
  { s: 'Anybody', a: 'Burna Boy', y: '2019', al: 'African Giant' },
  { s: 'Jowo', a: 'Davido', y: '2020', al: 'A Better Time' },
  { s: 'FEM', a: 'Davido', y: '2020', al: 'A Better Time' },
  { s: 'Unavailable', a: 'Davido', y: '2023', al: 'Timeless' },
  { s: 'Feel', a: 'Davido', y: '2023', al: 'Timeless' },
  { s: 'City Boys', a: 'Burna Boy', y: '2023', al: 'I Told Them' },
  { s: 'Amapiano', a: 'Asake', y: '2023', al: 'Work of Art' },
  { s: 'Terminator', a: 'Asake', y: '2022', al: 'Mr. Money With The Vibe' },
  { s: 'Ku Lo Sa', a: 'Oxlade', y: '2022', al: 'Ku Lo Sa' },
  { s: 'Duro', a: 'Tekno', y: '2015', al: 'Duro' },
  { s: 'Pana', a: 'Tekno', y: '2016', al: 'Pana' },
  { s: 'Leg Over', a: 'Mr Eazi', y: '2017', al: 'Life is Eazi' },
  { s: 'Skin Tight', a: 'Mr Eazi', y: '2015', al: 'Life is Eazi' },
  { s: 'All Over', a: 'Tiwa Savage', y: '2017', al: 'Sugarcane' },
  { s: 'Ma Lo', a: 'Tiwa Savage', y: '2017', al: 'Sugarcane' },
  { s: 'Koroba', a: 'Tiwa Savage', y: '2020', al: 'Celia' },
  { s: 'Johnny', a: 'Yemi Alade', y: '2014', al: 'King of Queens' },
  { s: 'Oliver Twist', a: 'D\'banj', y: '2012', al: 'D\'Kings Men' },
  { s: 'Fall in Love', a: 'D\'banj', y: '2008', al: 'The Entertainer' },
  { s: 'Gongo Aso', a: '9ice', y: '2008', al: 'Gongo Aso' },
  { s: 'African Queen', a: '2Baba', y: '2004', al: 'Face 2 Face' },
  { s: 'Amaka', a: '2Baba', y: '2018', al: 'Amaka' },
  { s: 'Zazoo Zehh', a: 'Portable', y: '2021', al: 'Zazoo Zehh' },
  { s: 'Cash App', a: 'Bella Shmurda', y: '2020', al: 'High Tension' },
  { s: 'Infinity', a: 'Olamide', y: '2020', al: 'Carpe Diem' },
  { s: 'Wo!!', a: 'Olamide', y: '2017', al: 'Lagos Nawa' },
  { s: 'Durosanya', a: 'Olamide', y: '2013', al: 'Baddest Guy Ever Liveth' },
  { s: 'Bounce', a: 'Rema', y: '2021', al: 'Rave & Roses' },
  { s: 'Vibration', a: 'Fireboy DML', y: '2019', al: 'Laughter, Tears and Goosebumps' },
  { s: 'Billionaire', a: 'Teni', y: '2019', al: 'Billionaire' },
  { s: 'Case', a: 'Teni', y: '2018', al: 'Billionaire' }
]

const naijaMovies = [
  { m: 'The Wedding Party', d: 'Kemi Adetiba', a: 'Adesua Etomi', y: '2016' },
  { m: 'Chief Daddy', d: 'Niyi Akinmolayan', a: 'Funke Akindele', y: '2018' },
  { m: 'King of Boys', d: 'Kemi Adetiba', a: 'Sola Sobowale', y: '2018' },
  { m: 'Omo Ghetto: The Saga', d: 'Funke Akindele', a: 'Funke Akindele', y: '2020' },
  { m: 'Sugar Rush', d: 'Kayode Kasum', a: 'Bimbo Ademoye', y: '2019' },
  { m: 'Merry Men', d: 'Toka McBaror', a: 'AY Makun', y: '2018' },
  { m: 'Aki na Ukwa', d: 'Amayo Uzo Philips', a: 'Osita Iheme', y: '2002' },
  { m: 'Living in Bondage', d: 'Chris Obi Rapu', a: 'Kenneth Okonkwo', y: '1992' },
  { m: 'Living in Bondage: Breaking Free', d: 'Ramsey Nouah', a: 'Swanky JKA', y: '2019' },
  { m: 'Up North', d: 'Tope Oshin', a: 'Banky W', y: '2018' },
  { m: 'Lionheart', d: 'Genevieve Nnaji', a: 'Genevieve Nnaji', y: '2018' },
  { m: 'Oloture', d: 'Kenneth Gyang', a: 'Sharon Ooja', y: '2019' },
  { m: 'Citation', d: 'Kunle Afolayan', a: 'Temi Otedola', y: '2020' },
  { m: 'The Figurine', d: 'Kunle Afolayan', a: 'Ramsey Nouah', y: '2009' },
  { m: 'October 1', d: 'Kunle Afolayan', a: 'Sadiq Daba', y: '2014' },
  { m: 'Phone Swap', d: 'Kunle Afolayan', a: 'Wale Ojo', y: '2012' },
  { m: 'Isoken', d: 'Jadesola Osiberu', a: 'Dakore Akande', y: '2017' },
  { m: 'Glamour Girls', d: 'Chika Onukwufor', a: 'Eucharia Anunobi', y: '1994' },
  { m: 'Nneka the Pretty Serpent', d: 'Zeb Ejiro', a: 'Ndidi Obi', y: '1992' },
  { m: 'Rattlesnake: The Ahanna Story', d: 'Ramsey Nouah', a: 'Stan Nze', y: '2020' },
  { m: 'Breath of Life', d: 'BB Sasore', a: 'Wale Ojo', y: '2023' },
  { m: 'Gangs of Lagos', d: 'Jade Osiberu', a: 'Tobi Bakre', y: '2023' },
  { m: 'Brotherhood', d: 'Loukman Ali', a: 'Tobi Bakre', y: '2022' },
  { m: 'Battle on Buka Street', d: 'Funke Akindele', a: 'Mercy Johnson', y: '2022' },
  { m: 'A Tribe Called Judah', d: 'Funke Akindele', a: 'Funke Akindele', y: '2023' },
  { m: 'Anikulapo', d: 'Kunle Afolayan', a: 'Kunle Remi', y: '2022' },
  { m: 'Blood Sisters', d: 'Biyi Bandele', a: 'Ini Dima-Okojie', y: '2022' },
  { m: 'Shanty Town', d: 'Dimeji Ajibola', a: 'Chidi Mokeme', y: '2023' },
  { m: 'Swallow', d: 'Kunle Afolayan', a: 'Eniola Akinbo', y: '2021' },
  { m: 'Elesin Oba', d: 'Biyi Bandele', a: 'Odunlade Adekola', y: '2022' },
  { m: 'Jagun Jagun', d: 'Adebayo Tijani', a: 'Lateef Adedimeji', y: '2023' },
  { m: 'Mokalik', d: 'Kunle Afolayan', a: 'Simi', y: '2019' },
  { m: 'Half of a Yellow Sun', d: 'Biyi Bandele', a: 'Chiwetel Ejiofor', y: '2013' },
  { m: 'Ije', d: 'Chineze Anyaene', a: 'Omotola Jalade Ekeinde', y: '2010' },
  { m: 'Jenifa', d: 'Muhydeen S. Ayinde', a: 'Funke Akindele', y: '2008' },
  { m: 'Osuofia in London', d: 'Kingsley Ogoro', a: 'Nkem Owoh', y: '2003' },
  { m: 'Fifty', d: 'Biyi Bandele', a: 'Iretiola Doyle', y: '2015' },
  { m: 'Kukere', d: 'Lancelot Oduwa Imasuen', a: 'Adesua Etomi', y: '2012' },
  { m: 'Amina', d: 'Izu Ojukwu', a: 'Lucy Ameh', y: '2021' }
]

const naijaHistory = [
  { p: 'Nnamdi Azikiwe', r: 'First President of Nigeria' },
  { p: 'Abubakar Tafawa Balewa', r: 'First Prime Minister of Nigeria' },
  { p: 'Olusegun Obasanjo', r: 'First democratically elected President of the Fourth Republic' },
  { p: 'Goodluck Jonathan', r: 'President who handed over power after losing an election in 2015' },
  { p: 'Muhammadu Buhari', r: 'Military Head of State (1983-1985) and President (2015-2023)' },
  { p: 'Umaru Musa Yar\'Adua', r: 'President of Nigeria who died in office in 2010' },
  { p: 'Shehu Shagari', r: 'First Executive President of the Second Republic' },
  { p: 'Ibrahim Babangida', r: 'Military President who annulled the June 12, 1993 elections' },
  { p: 'Sani Abacha', r: 'Military Head of State known for his dictatorship in the 1990s' },
  { p: 'Abdulsalami Abubakar', r: 'Military Head of State who transitioned Nigeria to democracy in 1999' },
  { p: 'Aguiyi Ironsi', r: 'First Military Head of State of Nigeria' },
  { p: 'Yakubu Gowon', r: 'Military Head of State during the Nigerian Civil War' },
  { p: 'Murtala Mohammed', r: 'Military Head of State assassinated in 1976' },
  { p: 'Ernest Shonekan', r: 'Head of the Interim National Government in 1993' },
  { p: 'Obafemi Awolowo', r: 'First Premier of the Western Region' },
  { p: 'Ahmadu Bello', r: 'First Premier of the Northern Region' },
  { p: 'Michael Okpara', r: 'Premier of the Eastern Region during the First Republic' },
  { p: 'Anthony Enahoro', r: 'Moved the first motion for Nigeria\'s independence in 1953' },
  { p: 'Funmilayo Ransome-Kuti', r: 'Prominent women\'s rights activist and mother of Fela Kuti' },
  { p: 'Margaret Ekpo', r: 'Pioneering female politician and women\'s rights activist' },
  { p: 'Flora Shaw', r: 'British journalist credited with coining the name "Nigeria"' },
  { p: 'Lord Lugard', r: 'Governor-General who amalgamated Northern and Southern Nigeria in 1914' },
  { p: 'Ken Saro-Wiwa', r: 'Environmental activist and writer executed in 1995' },
  { p: 'Chukwuemeka Odumegwu Ojukwu', r: 'Leader of the breakaway Republic of Biafra' },
  { p: 'Philip Effiong', r: 'Biafran officer who surrendered to the Nigerian government in 1970' },
  { p: 'Moshood Abiola (MKO)', r: 'Presumed winner of the annulled June 12, 1993 presidential election' },
  { p: 'Kudirat Abiola', r: 'Pro-democracy activist assassinated in 1996' },
  { p: 'Herbert Macaulay', r: 'Founder of Nigerian nationalism' },
  { p: 'Samuel Ajayi Crowther', r: 'First African Anglican Bishop in Nigeria' },
  { p: 'Wole Soyinka', r: 'First African to win the Nobel Prize in Literature' },
  { p: 'Chinua Achebe', r: 'Author of the classic novel "Things Fall Apart"' },
  { p: 'Aminu Kano', r: 'Prominent politician and advocate for the talakawa (commoners)' },
  { p: 'Ngozi Okonjo-Iweala', r: 'First female and African Director-General of the WTO' },
  { p: 'Amina J. Mohammed', r: 'Deputy Secretary-General of the United Nations' },
  { p: 'Fela Anikulapo-Kuti', r: 'Pioneer of Afrobeat music and human rights activist' },
  { p: 'Stephen Keshi', r: 'Won the AFCON as both a player and a coach for Nigeria' },
  { p: 'Chioma Ajunwa', r: 'First Nigerian to win an Olympic gold medal' },
  { p: 'Rashidi Yekini', r: 'Scored Nigeria\'s first-ever goal in a FIFA World Cup' }
]

async function main() {
  const bank = {
    vehicles: [],
    'nigerian-music': [],
    'nigerian-entertainment': [],
    'nigerian-history': []
  }

  // Vehicles (54 items * 11 templates = 594 questions)
  bank['vehicles'].push(...generateQs(vehicles, [
    v => `Which automotive company manufactures the "${v.v}"?`,
    v => `The popular car model "${v.v}" is produced by which automaker?`,
    v => `If you were driving a "${v.v}", which brand's car would you be in?`,
    v => `Which company is responsible for building the "${v.v}"?`,
    v => `The ${v.v} is a famous model made by:`
  ], v => v.m, v => v.m))
  
  bank['vehicles'].push(...generateQs(vehicles, [
    v => `Which country is the automaker ${v.m} originally from?`,
    v => `The car brand ${v.m} was founded in which country?`,
    v => `Where is the automotive manufacturer ${v.m} headquartered?`,
    v => `${v.m} is a renowned car brand originating from:`
  ], v => v.c, v => v.c))
  
  bank['vehicles'].push(...generateQs(vehicles, [
    v => `${v.m} is the manufacturer of which of the following car models?`,
    v => `Which of these popular car models is made by ${v.m}?`
  ], v => v.v, v => v.v))

  // Nigerian Music (50+ items * 10 templates = 500+ questions)
  bank['nigerian-music'].push(...generateQs(naijaMusic, [
    s => `Which Nigerian artist released the hit song "${s.s}"?`,
    s => `Who is the primary artist behind the track "${s.s}"?`,
    s => `The song "${s.s}" was a massive hit for which Afrobeats artist?`,
    s => `Which musician sang "${s.s}"?`
  ], s => s.a, s => s.a))
  
  bank['nigerian-music'].push(...generateQs(naijaMusic, [
    s => `In what year did ${s.a} release the song "${s.s}"?`,
    s => `The hit track "${s.s}" by ${s.a} was released in which year?`
  ], s => s.y, s => s.y))
  
  bank['nigerian-music'].push(...generateQs(naijaMusic, [
    s => `The song "${s.s}" is featured on which album by ${s.a}?`,
    s => `${s.a} included the track "${s.s}" in which of their albums?`
  ], s => s.al, s => s.al))
  
  bank['nigerian-music'].push(...generateQs(naijaMusic, [
    s => `Which of these hit songs was released by ${s.a}?`,
    s => `${s.a} is well known for releasing which of the following tracks?`
  ], s => s.s, s => s.s))

  // Nigerian Entertainment (37 items * 14 templates = 518 questions)
  bank['nigerian-entertainment'].push(...generateQs(naijaMovies, [
    m => `Who directed the Nollywood film "${m.m}"?`,
    m => `Which filmmaker was the director for the movie "${m.m}"?`,
    m => `The Nollywood blockbuster "${m.m}" was directed by:`
  ], m => m.d, m => m.d))
  
  bank['nigerian-entertainment'].push(...generateQs(naijaMovies, [
    m => `Which famous actor/actress starred in the Nollywood movie "${m.m}"?`,
    m => `Who played a major role in the Nigerian film "${m.m}"?`,
    m => `If you watched the Nollywood movie "${m.m}", which of these actors would you see?`
  ], m => m.a, m => m.a))
  
  bank['nigerian-entertainment'].push(...generateQs(naijaMovies, [
    m => `In what year was the Nollywood film "${m.m}" released?`,
    m => `The Nigerian movie "${m.m}" came out in which year?`,
    m => `When did the Nollywood hit "${m.m}" premiere?`
  ], m => m.y, m => m.y))
  
  bank['nigerian-entertainment'].push(...generateQs(naijaMovies, [
    m => `Which of these Nollywood movies was directed by ${m.d}?`,
    m => `The Nigerian filmmaker ${m.d} directed which of the following films?`
  ], m => m.m, m => m.m))
  
  bank['nigerian-entertainment'].push(...generateQs(naijaMovies, [
    m => `Which of these Nigerian movies features ${m.a} in a prominent role?`,
    m => `The Nollywood star ${m.a} acted in which of the following films?`,
    m => `If you are a fan of ${m.a}, which of these movies should you watch?`
  ], m => m.m, m => m.m))

  // Nigerian History (38 items * 14 templates = 532 questions)
  bank['nigerian-history'].push(...generateQs(naijaHistory, [
    h => `Who is known as the ${h.r}?`,
    h => `Which Nigerian historical figure is famously described as the ${h.r}?`,
    h => `The title or description "${h.r}" belongs to which prominent Nigerian?`,
    h => `If you read about the ${h.r} in Nigerian history, who are you reading about?`,
    h => `Which notable Nigerian is best known for being the ${h.r}?`,
    h => `In Nigerian history, who holds the distinction of being the ${h.r}?`,
    h => `The historical record for ${h.r} goes to:`
  ], h => h.p, h => h.p))
  
  bank['nigerian-history'].push(...generateQs(naijaHistory, [
    h => `What major historical role or distinction is ${h.p} known for in Nigeria?`,
    h => `Which of the following best describes the historical significance of ${h.p}?`,
    h => `In the context of Nigerian history, ${h.p} is best remembered as the:`,
    h => `${h.p} made their mark in Nigerian history by being the:`,
    h => `If you were asked about ${h.p}, which of these achievements would you cite?`,
    h => `Which notable political office, position, or achievement is associated with ${h.p}?`,
    h => `The Nigerian historical figure ${h.p} is famously recognized as:`
  ], h => h.r, h => h.r))

  // Final deduplication
  for (const cat of Object.keys(bank)) {
    const seen = new Set()
    bank[cat] = bank[cat].filter(q => {
      if (!q.q || !q.correct || q.wrong.length < 3) return false
      if (seen.has(q.q)) return false
      seen.add(q.q)
      return true
    })
  }

  const output = {
    attribution: "Massive Hardcoded Generators Phase Naija/Vehicles",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/naija.json', JSON.stringify(output, null, 2))
  console.log(`Saved to data/naija.json with Vehicles: ${bank['vehicles'].length}, Music: ${bank['nigerian-music'].length}, Ent: ${bank['nigerian-entertainment'].length}, Hist: ${bank['nigerian-history'].length}`)
}

main()
