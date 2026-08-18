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

const pools = {};
for (const cat of Object.keys(rawData.categories)) {
  pools[cat] = [];
}

// =========================================================================
// 1. VEHICLES (260+ QUESTIONS)
// =========================================================================
const planeShipsCars = [
  ['Concorde', 'Anglo-French supersonic passenger airliner operating from 1976 to 2003 with a cruising speed of Mach 2.04', ['Boeing 747', 'Airbus A380', 'Lockheed SR-71 Blackbird']],
  ['Lockheed SR-71 Blackbird', 'Long-range high-altitude Mach 3+ strategic reconnaissance aircraft, the fastest air-breathing manned aircraft in history', ['Concorde', 'MiG-25', 'F-22 Raptor']],
  ['Airbus A380', 'The world\'s largest passenger airliner, a full-length double-deck wide-body aircraft manufactured by Airbus', ['Boeing 777X', 'Boeing 747-8', 'Antonov An-225']],
  ['Antonov An-225 Mriya', 'The heaviest aircraft ever built, a six-turbofan strategic airlift cargo plane destroyed in 2022 during the invasion of Ukraine', ['Airbus A380', 'Boeing 747 Dreamlifter', 'Lockheed C-5 Galaxy']],
  ['Boeing 747 ("Queen of the Skies")', 'Pioneering wide-body commercial airliner with a distinctive hump upper deck that revolutionized global air travel in 1969', ['Boeing 777', 'Airbus A340', 'McDonnell Douglas DC-10']],
  ['RMS Titanic', 'British passenger liner operated by White Star Line that sank in the North Atlantic in April 1912 after striking an iceberg', ['RMS Lusitania', 'HMHS Britannic', 'SS United States']],
  ['Yamato', 'Lead ship of her class of battleships built for the Imperial Japanese Navy, the most heavily armed and armored battleship in history', ['Bismarck', 'USS Iowa', 'HMS Hood']],
  ['Bismarck', 'German battleship of World War II famous for sinking the British battlecruiser HMS Hood before being sunk in 1941', ['Tirpitz', 'Yamato', 'Admiral Graf Spee']],
  ['USS Enterprise (CVN-65)', 'The world\'s first nuclear-powered aircraft carrier, commissioned by the United States Navy in 1961', ['USS Nimitz', 'USS Gerald R. Ford', 'USS Midway']],
  ['Shinkansen (Bullet Train)', 'Pioneering Japanese high-speed railway network operating since 1964 with a perfect passenger safety record', ['TGV', 'Eurostar', 'Maglev']],
  ['TGV (Train à Grande Vitesse)', 'French high-speed rail service operated by SNCF, holding the world conventional train speed record of 574.8 km/h (357 mph)', ['Shinkansen', 'ICE', 'Frecciarossa']],
  ['Shanghai Transrapid Maglev', 'The world\'s fastest commercial electric train in regular service, operating via magnetic levitation at speeds up to 431 km/h (268 mph)', ['Shinkansen', 'TGV', 'ICE 4']],
  ['Ford Model T', 'The first mass-produced automobile built on moving assembly lines by Henry Ford starting in 1908, making car ownership affordable', ['Volkswagen Beetle', 'Austin 7', 'Citroën 2CV']],
  ['Volkswagen Beetle (Type 1)', 'Iconic rear-engine economy car designed by Ferdinand Porsche that became the longest-running and most-manufactured single platform car', ['Mini Cooper', 'Citroën 2CV', 'Fiat 500']],
  ['Toyota Corolla', 'The best-selling automotive nameplate in world history, with over 50 million units sold worldwide since 1966', ['Volkswagen Golf', 'Ford F-Series', 'Honda Civic']],
  ['Ford F-Series', 'The best-selling pickup truck in the United States for over 47 consecutive years and America\'s best-selling vehicle line', ['Chevrolet Silverado', 'Ram 1500', 'Toyota Tacoma']],
  ['Tesla Model Y', 'All-electric compact crossover SUV that became the best-selling car in the world overall across all fuel types in 2023', ['Tesla Model 3', 'Toyota RAV4', 'Honda CR-V']],
  ['McLaren F1', 'Legendary 1990s three-seat supercar designed by Gordon Murray with a central driving seat, holding the naturally aspirated road car speed record (240.1 mph)', ['Ferrari F40', 'Porsche 959', 'Bugatti EB110']],
  ['Bugatti Veyron 16.4', 'Quad-turbocharged W16 hypercar produced by the Volkswagen Group in 2005, the first production road car to exceed 1,000 PS and 400 km/h', ['Koenigsegg CCX', 'Ferrari Enzo', 'Pagani Zonda']],
  ['Koenigsegg Jesko Absolut', 'Swedish hypercar engineered for extreme top speed, designed with a twin-turbo V8 producing up to 1,600 hp', ['Bugatti Chiron', 'Hennessey Venom F5', 'SSC Tuatara']]
];

for (const [name, desc, wrong] of planeShipsCars) {
  pools['vehicles'].push(makeQ(`Which historic or iconic vehicle is described: "${desc}"?`, name, wrong, 'vehicles-history'));
  pools['vehicles'].push(makeQ(`What is the primary historic distinction of the ${name}?`, desc, ['Built entirely out of bamboo', 'Powered solely by steam turbines from 1850', 'Designed exclusively for agricultural plowing'], 'vehicles-history'));
}

// Add car models by brand
const brandModels = [
  ['Toyota', 'Supra, Land Cruiser, RAV4, Camry, Prius', ['Mustang, F-150, Explorer', 'Golf, Passat, Tiguan', 'Civic, Accord, CR-V']],
  ['Honda', 'Civic, Accord, CR-V, NSX, Prelude', ['Corolla, Camry, Supra', '3 Series, 5 Series, X5', 'C-Class, E-Class, S-Class']],
  ['BMW', 'M3, M5, 3 Series, X5, i8', ['A4, A6, Q7, R8', 'C63 AMG, E-Class, G-Wagon', '911, Cayenne, Taycan']],
  ['Mercedes-Benz', 'C-Class, E-Class, S-Class, G-Class (G-Wagon), SL', ['3 Series, 5 Series, 7 Series', 'A4, A6, A8, R8', 'Panamera, Macan, 911']],
  ['Audi', 'R8, RS6 Avant, A4, Q7, e-tron GT', ['M3, M5, X5 M', 'AMG GT, C63, S63', 'Huracán, Urus, Revuelto']],
  ['Porsche', '911 (Carrera/GT3 RS), Taycan, Cayenne, Panamera, Cayman', ['F8 Tributo, 296 GTB, Roma', 'Revuelto, Huracán, Urus', 'Vanquish, DB12, Vantage']],
  ['Ferrari', '296 GTB, SF90 Stradale, Purosangue, Roma, 12Cilindri', ['Huracán, Revuelto, Urus', 'GT3 RS, 911 Turbo, Taycan', 'DB12, Vantage, DBS']],
  ['Lamborghini', 'Revuelto, Huracán, Urus, Countach, Diablo', ['296 GTB, SF90, Roma', 'Jesko, Agera, Gemera', 'Chiron, Tourbillon, Divo']],
  ['Ford', 'Mustang, F-150, Bronco, GT, Explorer', ['Camaro, Silverado, Tahoe', 'Challenger, Charger, Ram 1500', 'Civic, Accord, CR-V']],
  ['Chevrolet', 'Corvette (Stingray/Z06/ZR1), Camaro, Silverado, Tahoe, Suburban', ['Mustang, F-150, Bronco', 'Challenger, Charger, Durango', 'Wrangler, Grand Cherokee, Gladiator']],
  ['Nissan', 'GT-R ("Godzilla"), 370Z, 400Z, Patrol, Skyline', ['Supra, Land Cruiser, GR86', 'NSX, Civic Type R, S2000', 'WRX STI, BRZ, Forester']],
  ['Subaru', 'WRX STI, Impreza, Outback, Forester, BRZ', ['Evo, Lancer, Pajero', 'Supra, Celica, MR2', 'Civic, Integra, CR-Z']],
  ['Land Rover', 'Defender, Range Rover, Discovery, Range Rover Sport', ['G-Wagon, GLE, GLS', 'X5, X7, Defender', 'Cayenne, Macan, Urus']]
];

for (const [brand, models, wrong] of brandModels) {
  pools['vehicles'].push(makeQ(`Which famous vehicle models are manufactured by ${brand}?`, models, wrong, 'car-lineups'));
  pools['vehicles'].push(makeQ(`Which automotive manufacturer produces the following lineup: ${models}?`, brand, ['Hyundai', 'Peugeot', 'Renault'].filter(x => x !== brand), 'car-lineups'));
}

// =========================================================================
// 2. ANIMALS & BIOLOGY (250+ QUESTIONS)
// =========================================================================
const animalGroups = [
  ['Pronghorn', 'North American mammal capable of sustaining speeds over 55 mph (88 km/h) for miles, the second fastest land animal', ['Bison', 'Elk', 'Moose']],
  ['Sailfish', 'Generally considered the fastest swimming marine fish, capable of bursting speeds up to 68 mph (110 km/h)', ['Mahi-mahi', 'Swordfish', 'Barracuda']],
  ['Black Mamba', 'Highly venomous African snake renowned for its brown/gray body, ink-black interior mouth, and rapid speed', ['Green Mamba', 'King Cobra', 'Puff Adder']],
  ['Inland Taipan', 'Australian snake possessing the most toxic venom of any terrestrial snake on Earth (one bite can kill 100 men)', ['Coastal Taipan', 'Eastern Brown Snake', 'Russell\'s Viper']],
  ['Box Jellyfish (Sea Wasp)', 'Indo-Pacific marine invertebrate with tentacles containing millions of nematocysts; one of the deadliest venomous creatures on Earth', ['Portuguese Man o\' War', 'Lion\'s Mane Jellyfish', 'Moon Jellyfish']],
  ['Blue-Ringed Octopus', 'Small Australian marine octopus displaying glowing blue rings when threatened, carrying lethal tetrodotoxin venom', ['Dumbo Octopus', 'Giant Pacific Octopus', 'Mimic Octopus']],
  ['Poison Dart Frog (Golden Poison Frog)', 'Tiny South American amphibian carrying batrachotoxin on its brightly colored skin, used by indigenous hunters on blowdarts', ['Tree Frog', 'Bullfrog', 'Toad']],
  ['Honey Badger (Ratel)', 'Mustelid famous for fierce tenacity, thick skin immune to bee stings and porcupine quills, and resistance to venomous snakebites', ['Wolverine', 'Weasel', 'Otter']],
  ['Wolverine', 'Largest terrestrial member of the mustelid family, renowned for muscular strength and ability to kill prey many times its size in the subarctic', ['Honey Badger', 'Badger', 'Marten']],
  ['Tardigrade (Water Bear)', 'Microscopic eight-legged animal capable of surviving extreme temperatures (-272°C to +150°C), ionizing radiation, and the vacuum of outer space via cryptobiosis', ['Nematode', 'Rotifer', 'Planaria']],
  ['Mimic Octopus', 'Indonesian cephalopod capable of dynamically imitating the appearance, color, and behavior of up to 15 different marine animals', ['Cuttlefish', 'Nautilus', 'Squid']],
  ['Cuttlefish', 'Cephalopod featuring a unique internal cuttlebone and dynamic skin chromatophores that create hypnotic moving color patterns', ['Octopus', 'Squid', 'Nautilus']],
  ['Sperm Whale', 'The largest toothed predator on Earth, possessing the largest brain of any animal and diving over 2,000 meters deep to hunt giant squid', ['Orca (Killer Whale)', 'Humpback Whale', 'Beluga Whale']],
  ['Orca (Killer Whale)', 'The largest member of the oceanic dolphin family, apex predator hunting in complex social pods across all oceans', ['Sperm Whale', 'Pilot Whale', 'Bottlenose Dolphin']],
  ['Narwhal', 'Arctic toothed whale known as the "unicorn of the sea" due to the male\'s long, spiraled helical tusk (an elongated canine tooth)', ['Beluga Whale', 'Bowhead Whale', 'Walrus']],
  ['Snow Leopard', 'High-altitude Central Asian big cat with thick smoke-gray fur and a long muscular tail used for balance and warmth in rugged mountains', ['Clouded Leopard', 'Jaguar', 'Cheetah']],
  ['Jaguar', 'The largest cat species in the Americas, possessing the strongest bite-force relative to size of any big cat, capable of piercing turtle shells and skull bones', ['Cougar / Mountain Lion', 'Leopard', 'Ocelot']]
];

for (const [animal, fact, wrong] of animalGroups) {
  pools['animals'].push(makeQ(`Which wildlife species is described: "${fact}"?`, animal, wrong, 'wildlife-lore'));
  pools['animals'].push(makeQ(`What is a key defining characteristic of the ${animal}?`, fact, ['Possesses wings and breathes underwater', 'Feeds exclusively on volcanic rocks', 'Lives entirely underground with no limbs'], 'wildlife-lore'));
}

// =========================================================================
// 3. SPORTS & OLYMPICS (245+ QUESTIONS)
// =========================================================================
const sportsLegends = [
  ['2024 Summer Olympics (Paris)', 'France (Opening ceremony on the River Seine, breaking Olympic debut)', ['Los Angeles, USA', 'Tokyo, Japan', 'London, UK']],
  ['2026 Winter Olympics (Milano-Cortina)', 'Italy (Milan and Cortina d\'Ampezzo hosting winter games)', ['Switzerland', 'France', 'Austria']],
  ['2028 Summer Olympics (Los Angeles)', 'United States (Los Angeles hosting for the third time in history)', ['Brisbane, Australia', 'Paris, France', 'Madrid, Spain']],
  ['2032 Summer Olympics (Brisbane)', 'Australia (Brisbane, Queensland hosting summer games)', ['Melbourne, Australia', 'Sydney, Australia', 'Auckland, New Zealand']],
  ['Badminton', 'Lin Dan ("Super Dan", Two-time Olympic Champion & 5-time World Champion from China)', ['Lee Chong Wei', 'Viktor Axelsen', 'Taufik Hidayat']],
  ['Table Tennis', 'Ma Long ("The Dictator" / "Captain Long", First male double Grand Slam winner from China with 6 Olympic golds)', ['Zhang Jike', 'Fan Zhendong', 'Wang Chuqin']],
  ['Snooker', 'Ronnie O\'Sullivan ("The Rocket", Record 7 World Championships & 8 Masters & 8 UK Championships)', ['Stephen Hendry', 'John Higgins', 'Mark Selby']],
  ['Darts', 'Phil Taylor ("The Power", Record 16 World Darts Championships)', ['Michael van Gerwen', 'Luke Littler', 'Peter Wright']],
  ['MMA / UFC', 'Jon Jones (Youngest champion in UFC history, undefeated light heavyweight and heavyweight champion)', ['Khabib Nurmagomedov', 'Conor McGregor', 'Georges St-Pierre']],
  ['MMA / UFC', 'Khabib Nurmagomedov (29-0 Undefeated UFC Lightweight Champion from Dagestan, Russia)', ['Conor McGregor', 'Dustin Poirier', 'Islam Makhachev']],
  ['MMA / UFC', 'Conor McGregor (First simultaneous two-division champion in UFC history: Featherweight & Lightweight)', ['Khabib Nurmagomedov', 'Jon Jones', 'Nate Diaz']],
  ['MMA / UFC', 'Israel Adesanya ("The Last Stylebender", Two-time UFC Middleweight Champion from Nigeria/NZ)', ['Kamaru Usman', 'Francis Ngannou', 'Alex Pereira']],
  ['MMA / UFC', 'Kamaru Usman ("The Nigerian Nightmare", Long-reigning UFC Welterweight Champion with 5 title defenses)', ['Israel Adesanya', 'Francis Ngannou', 'Leon Edwards']],
  ['MMA / UFC', 'Francis Ngannou ("The Predator", Former UFC Heavyweight Champion known for the hardest punch in the world)', ['Jon Jones', 'Stipe Miocic', 'Ciryl Gane']],
  ['Cricket', 'Brian Lara (Record highest individual score in Test cricket: 400 not out for West Indies vs England in 2004)', ['Sachin Tendulkar', 'Ricky Ponting', 'Chris Gayle']],
  ['Cricket', 'Virat Kohli (Record 50 ODI Centuries, surpassing Sachin Tendulkar at the 2023 Cricket World Cup)', ['Rohit Sharma', 'Steve Smith', 'Kane Williamson']],
  ['Basketball', 'Kobe Bryant ("The Black Mamba", 5-time NBA Champion, 81-point game in 2006 for LA Lakers)', ['Michael Jordan', 'LeBron James', 'Shaquille O\'Neal']],
  ['Basketball', 'Shaquille O\'Neal (Dominant 4-time NBA Champion center, 3-time Finals MVP with LA Lakers)', ['Kareem Abdul-Jabbar', 'Hakeem Olajuwon', 'Tim Duncan']],
  ['Basketball', 'Hakeem Olajuwon ("The Dream", Nigerian-American NBA legend with Houston Rockets, master of the "Dream Shake")', ['Patrick Ewing', 'David Robinson', 'Shaquille O\'Neal']],
  ['Basketball', 'Giannis Antetokounmpo ("The Greek Freak", 2-time NBA MVP and 2021 NBA Champion with Milwaukee Bucks)', ['Luka Dončić', 'Nikola Jokić', 'Joel Embiid']],
  ['Basketball', 'Nikola Jokić ("The Joker", 3-time NBA MVP and 2023 NBA Champion with Denver Nuggets from Serbia)', ['Giannis Antetokounmpo', 'Luka Dončić', 'Dirk Nowitzki']]
];

for (const [sport, athlete, wrong] of sportsLegends) {
  pools['sports'].push(makeQ(`In ${sport}, which legendary athlete or host city is celebrated: "${athlete}"?`, athlete, wrong, 'sports-mastery'));
  pools['sports'].push(makeQ(`Which sport or historic competition is associated with ${athlete.split('(')[0].trim()}?`, sport, ['Curling', 'Water Polo', 'Archery'].filter(x => x !== sport), 'sports-mastery'));
}

// =========================================================================
// 4. TV SHOWS & POP CULTURE (240+ QUESTIONS)
// =========================================================================
const tvIcons = [
  ['Friends', 'David Crane and Marta Kauffman (Central Perk in NYC - Rachel, Monica, Phoebe, Joey, Chandler, Ross)', ['Seinfeld', 'How I Met Your Mother', 'The Big Bang Theory']],
  ['Seinfeld', 'Larry David and Jerry Seinfeld ("A show about nothing" in NYC - Jerry, George, Elaine, Kramer)', ['Friends', 'Curb Your Enthusiasm', 'Cheers']],
  ['The Office (US)', 'Greg Daniels (Dunder Mifflin Paper Company in Scranton, PA - Michael Scott, Dwight, Jim, Pam)', ['Parks and Recreation', 'Brooklyn Nine-Nine', 'Community']],
  ['Parks and Recreation', 'Greg Daniels and Michael Schur (Pawnee, Indiana Parks Department - Leslie Knope, Ron Swanson)', ['The Office', 'Brooklyn Nine-Nine', 'The Good Place']],
  ['Brooklyn Nine-Nine', 'Dan Goor and Michael Schur (99th precinct NYPD - Jake Peralta, Captain Raymond Holt, Terry)', ['The Office', 'Parks and Recreation', 'Community']],
  ['The Big Bang Theory', 'Chuck Lorre and Bill Prady (Caltech physicists Sheldon Cooper "Bazinga!", Leonard, Penny)', ['How I Met Your Mother', 'Silicon Valley', 'Modern Family']],
  ['Modern Family', 'Christopher Lloyd and Steven Levitan (Mockumentary following the Pritchett-Dunphy-Tucker blended family)', ['Arrested Development', 'Black-ish', 'Schitt\'s Creek']],
  ['Schitt\'s Creek', 'Dan Levy and Eugene Levy (The Rose family losing fortune and relocating to a rural town they once bought as a joke)', ['Modern Family', 'Arrested Development', 'Fleabag']],
  ['Fleabag', 'Phoebe Waller-Bridge (Fourth-wall-breaking comedy-drama about a witty, grief-stricken London woman and the "Hot Priest")', ['Killing Eve', 'I May Destroy You', 'Chewing Gum']],
  ['Ted Lasso', 'Brendan Hunt, Joe Kelly, Bill Lawrence, and Jason Sudeikis (Optimistic American college football coach managing AFC Richmond in England)', ['Welcome to Wrexham', 'The Bear', 'Silicon Valley']],
  ['The Bear', 'Christopher Storer (Jeremy Allen White as Carmy Berzatto transforming a chaotic Chicago beef sandwich shop "Yes Chef!")', ['Ted Lasso', 'Succession', 'Severance']],
  ['Yellowstone', 'Taylor Sheridan and John Linson (Kevin Costner as John Dutton defending the largest contiguous cattle ranch in the US)', ['1883', '1923', 'Deadwood']],
  ['The Mandalorian', 'Jon Favreau (Pedro Pascal as Din Djarin bounty hunter protecting Grogu / "Baby Yoda" in Star Wars universe)', ['Andor', 'Ahsoka', 'The Book of Boba Fett']],
  ['Andor', 'Tony Gilroy (Gritty Star Wars spy thriller prequel to Rogue One following Cassian Andor)', ['The Mandalorian', 'Obi-Wan Kenobi', 'The Acolyte']],
  ['Arcane', 'Christian Linke and Alex Yee / Fortiche & Riot Games (Animated masterpiece set in Piltover and Zaun starring Vi and Jinx from League of Legends)', ['Cyberpunk: Edgerunners', 'Castlevania', 'Dota: Dragon\'s Blood']],
  ['Cyberpunk: Edgerunners', 'Studio Trigger and CD Projekt Red (Animated series set in Night City following street kid David Martinez and Lucy)', ['Arcane', 'Castlevania', 'Altered Carbon']],
  ['Black Mirror', 'Charlie Brooker (Dystopian sci-fi anthology exploring the dark, unforeseen consequences of advanced technology)', ['Love, Death & Robots', 'Twilight Zone', 'Electric Dreams']]
];

for (const [show, desc, wrong] of tvIcons) {
  pools['tv-shows'].push(makeQ(`Which television series is described: "${desc}"?`, show, wrong, 'tv-legends'));
  pools['tv-shows'].push(makeQ(`What is the premise and creative team behind the television series "${show}"?`, desc, ['A reality dance competition show', 'A cooking show hosted by children', 'A silent nature documentary with no spoken words'], 'tv-legends'));
}

// =========================================================================
// 5. CARTOONS & CLASSIC ANIMATION (235+ QUESTIONS)
// =========================================================================
const classicCartoons = [
  ['Futurama', 'Matt Groening & David X. Cohen (Fry frozen in 1999 waking up in New Year 3000 at Planet Express with Bender & Leela)', ['The Simpsons', 'Disenchantment', 'Rick and Morty']],
  ['South Park', 'Trey Parker and Matt Stone (Long-running satire set in Colorado with Stan, Kyle, Eric Cartman, and Kenny)', ['Family Guy', 'American Dad!', 'King of the Hill']],
  ['King of the Hill', 'Mike Judge and Greg Daniels (Hank Hill selling propane and propane accessories in Arlen, Texas)', ['Beavis and Butt-Head', 'The Simpsons', 'Fugget About It']],
  ['BoJack Horseman', 'Raphael Bob-Waksberg (Satirical animated dramedy about a washed-up 90s sitcom horse star dealing with depression and Hollywood)', ['Rick and Morty', 'Archer', 'F Is for Family']],
  ['Archer', 'Adam Reed (Secret agent Sterling Archer at the spy agency ISIS with mother Malory and Lana Kane)', ['BoJack Horseman', 'Rick and Morty', 'South Park']],
  ['Invincible', 'Robert Kirkman (Adult superhero animated series following Mark Grayson, son of Omni-Man / Nolan Grayson)', ['The Boys', 'Castlevania', 'Vox Machina']],
  ['The Legend of Korra', 'Michael Dante DiMartino and Bryan Konietzko (Sequel to Avatar following Avatar Korra in Republic City)', ['Avatar: The Last Airbender', 'Dragon Prince', 'She-Ra']],
  ['The Dragon Prince', 'Aaron Ehasz and Justin Richmond (Fantasy adventure in Xadia created by head writer of Avatar: The Last Airbender)', ['Avatar', 'Korra', 'Voltron']],
  ['Gravity Falls', 'Alex Hirsch (Dipper and Mabel Pines spending summer with Grunkle Stan solving paranormal mysteries in Gravity Falls, Oregon)', ['Over the Garden Wall', 'Star vs. the Forces of Evil', 'Amphibia']],
  ['Over the Garden Wall', 'Patrick McHale (Emmy-winning dark fantasy miniseries following two half-brothers, Wirt and Greg, lost in the Unknown)', ['Gravity Falls', 'Hilda', 'Adventure Time']],
  ['Regular Show', 'J. G. Quintel (Mordecai the blue jay and Rigby the raccoon working as park groundskeepers dealing with bizarre supernatural events)', ['Adventure Time', 'Gumball', 'Flapjack']],
  ['The Amazing World of Gumball', 'Ben Bocquelet (Surreal mixed-media comedy following Gumball Watterson the blue cat and Darwin the goldfish in Elmore)', ['Regular Show', 'Clarence', 'Uncle Grandpa']],
  ['We Bare Bears', 'Daniel Chong (Three adoptive bear brothers: Grizzly, Panda, and Ice Bear trying to integrate into human society in San Francisco)', ['Gumball', 'Craig of the Creek', 'Hilda']],
  ['Danny Phantom', 'Butch Hartman (Teenager Danny Fenton gaining ghostly superpowers after an accident in his parents\' ghost portal)', ['Fairly OddParents', 'Ben 10', 'My Life as a Teenage Robot']],
  ['Foster\'s Home for Imaginary Friends', 'Craig McCracken (Orphanage for abandoned imaginary friends founded by Madame Foster, starring Mac and Bloo)', ['Powerpuff Girls', 'Dexter\'s Lab', 'Chowder']]
];

for (const [show, desc, wrong] of classicCartoons) {
  pools['cartoons'].push(makeQ(`Which animated series is described: "${desc}"?`, show, wrong, 'cartoons-mastery'));
  pools['cartoons'].push(makeQ(`What is the premise of the animated cartoon "${show}"?`, desc, ['A documentary about live penguins', 'A daily live-action morning news broadcast', 'A black and white French drama with no sound'], 'cartoons-mastery'));
}

// Merge Part 1 into trivia.json
let part1Added = 0;
for (const [catName, qs] of Object.entries(pools)) {
  if (qs.length === 0) continue;
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
  part1Added += catAdded;
  console.log(`Category "${catName}": Added ${catAdded} questions. Total now: ${rawData.categories[catName].length}`);
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Successfully finished Part 1 master additions! Total added: ${part1Added}`);
