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
  'web3': [],
  'vehicles': [],
  'cartoons': [],
  'sports': [],
  'animals': [],
  'tv-shows': []
};

// =========================================================================
// 1. WEB3 & CRYPTO (PUSH TO 820+)
// =========================================================================
const web3Data = [
  // Blockchains & Layer 1s
  ['Ethereum', 'Vitalik Buterin', ['Charles Hoskinson', 'Gavin Wood', 'Anatoly Yakovenko'], 'Smart contract blockchain co-founded in 2015'],
  ['Solana', 'Anatoly Yakovenko', ['Gavin Wood', 'Emin Gün Sirer', 'Silvio Micali'], 'High-speed Proof of History Layer 1 blockchain'],
  ['Cardano', 'Charles Hoskinson', ['Vitalik Buterin', 'Gavin Wood', 'Silvio Micali'], 'Proof of Stake blockchain developed by IOHK'],
  ['Polkadot', 'Gavin Wood', ['Vitalik Buterin', 'Charles Hoskinson', 'Anatoly Yakovenko'], 'Multi-chain interoperability protocol created by Ethereum co-founder'],
  ['Avalanche', 'Emin Gün Sirer', ['Silvio Micali', 'Anatoly Yakovenko', 'Gavin Wood'], 'Consensus protocol and subnet blockchain platform developed by Ava Labs'],
  ['Algorand', 'Silvio Micali', ['Emin Gün Sirer', 'Gavin Wood', 'Charles Hoskinson'], 'Pure Proof of Stake blockchain founded by Turing Award winner'],
  ['Binance (BNB Chain)', 'Changpeng Zhao (CZ)', ['Brian Armstrong', 'Sam Bankman-Fried', 'Jesse Powell'], 'Global crypto ecosystem and exchange founded in 2017'],
  ['Near Protocol', 'Illia Polosukhin & Alex Skidanov', ['Emin Gün Sirer', 'Anatoly Yakovenko', 'Silvio Micali'], 'Sharded Layer 1 blockchain featuring Nightshade consensus'],
  ['Aptos', 'Mo Shaikh & Avery Ching', ['Anatoly Yakovenko', 'Emin Gün Sirer', 'Gavin Wood'], 'Layer 1 blockchain built using the Move programming language by ex-Meta Diem engineers'],
  ['Sui', 'Evan Cheng & Mysten Labs', ['Mo Shaikh', 'Anatoly Yakovenko', 'Emin Gün Sirer'], 'Object-centric Layer 1 blockchain using Move language'],
  ['Toncoin (TON)', 'Nikolai & Pavel Durov (Telegram)', ['Vitalik Buterin', 'Anatoly Yakovenko', 'Gavin Wood'], 'The Open Network blockchain originally designed by Telegram'],
  ['Monero (XMR)', 'Ring Signatures & Stealth Addresses', ['Proof of Work only', 'Zero-Knowledge rollups', 'Sharding'], 'Leading privacy-focused cryptocurrency'],
  ['Zcash (ZEC)', 'zk-SNARKs (Zero-Knowledge Proofs)', ['Ring Signatures', 'Proof of Authority', 'Delegated PoS'], 'Privacy cryptocurrency pioneering zero-knowledge proofs'],
  ['Chainlink (LINK)', 'Sergey Nazarov', ['Vitalik Buterin', 'Gavin Wood', 'Anatoly Yakovenko'], 'Leading decentralized oracle network connecting smart contracts to off-chain data'],
  ['Uniswap', 'Hayden Adams', ['Andre Cronje', 'Stani Kulechov', 'Robert Leshner'], 'Pioneering Automated Market Maker (AMM) decentralized exchange on Ethereum'],
  ['Aave', 'Stani Kulechov', ['Hayden Adams', 'Andre Cronje', 'Robert Leshner'], 'Leading decentralized non-custodial liquidity market protocol (formerly ETHLend)'],
  ['MakerDAO', 'Rune Christensen', ['Hayden Adams', 'Stani Kulechov', 'Robert Leshner'], 'Protocol behind the decentralized over-collateralized DAI stablecoin'],
  ['Curve Finance', 'Michael Egorov', ['Hayden Adams', 'Andre Cronje', 'Stani Kulechov'], 'DEX optimized for extremely low slippage between stablecoins'],
  ['Yearn.finance', 'Andre Cronje', ['Hayden Adams', 'Stani Kulechov', 'Michael Egorov'], 'Pioneering DeFi yield aggregator protocol']
];

for (const [name, founder, wrong, desc] of web3Data) {
  additions['web3'].push(makeQ(`In Web3 and crypto, who is the primary founder/creator of ${name} (${desc})?`, founder, wrong, 'crypto-founders'));
  additions['web3'].push(makeQ(`Which crypto project or protocol is described here: "${desc}"?`, name, ['XRP', 'Litecoin', 'Dogecoin'], 'crypto-projects'));
}

// Consensus mechanisms, tokens, concepts
const cryptoConcepts = [
  ['Proof of Work (PoW)', 'Miners solve complex cryptographic puzzles using computational power', ['Validators stake tokens', 'Nodes take turns based on age', 'Random lottery based on wallet balance']],
  ['Proof of Stake (PoS)', 'Validators lock up native tokens as collateral to propose and validate blocks', ['Miners burn electricity', 'Central bank approval', 'Fastest internet connection wins']],
  ['Zero-Knowledge Proof (ZKP)', 'A cryptographic method enabling one party to prove a statement is true without revealing any information beyond the statement\'s validity', ['Public broadcast of private keys', 'Hashing passwords with salt', 'Splitting seed phrases into three parts']],
  ['Layer 2 Rollup', 'Scaling solution that executes transactions off-chain and bundles them for settlement on Layer 1', ['A secondary internet cable', 'A new hard fork coin', 'A cold storage hardware device']],
  ['Optimistic Rollup', 'Rollup that assumes transactions are valid by default unless challenged within a fraud-proof dispute window', ['Rollup that uses ZK-proofs immediately', 'A private sidechain', 'A centralized bridge']],
  ['ZK-Rollup', 'Rollup that uses cryptographic validity proofs to verify transactions instantly on Layer 1', ['Rollup with a 7-day challenge window', 'A proof-of-work mining pool', 'A custodial wallet service']],
  ['Smart Contract', 'Self-executing digital code on a blockchain that automatically runs when predetermined conditions are met', ['A legal document signed with a notary', 'An insurance policy on paper', 'A banking wire transfer']],
  ['Non-Fungible Token (NFT)', 'A unique cryptographic asset with unique identification metadata that cannot be replicated or interchanged 1:1', ['A cryptocurrency pegged to the US Dollar', 'A mining ASIC chip', 'An open-source compiler']],
  ['ERC-20', 'The official technical standard for fungible tokens created on the Ethereum blockchain', ['The standard for NFTs', 'The Ethereum staking contract', 'The ENS domain name system']],
  ['ERC-721', 'The official technical standard for non-fungible tokens (NFTs) on the Ethereum blockchain', ['The standard for fungible tokens', 'The stablecoin standard', 'The gas estimation standard']],
  ['ERC-1155', 'A multi-token standard enabling the management of both fungible and non-fungible tokens within a single smart contract', ['A token burning standard', 'A hardware wallet protocol', 'A consensus upgrade standard']],
  ['Impermanent Loss', 'The temporary difference in value between holding tokens in an AMM liquidity pool versus holding them in a wallet', ['Loss of funds due to private key theft', 'Gas fees paid on failed transactions', 'Hardware wallet failure']],
  ['Slippage', 'The difference between the expected price of a trade and the actual execution price due to market volatility or low liquidity', ['Transaction fee paid to validators', 'Block confirmation time', 'Token unstaking cooldown period']],
  ['MEV (Maximal Extractable Value)', 'Profit a validator or bot can extract by reordering, including, or excluding transactions within a block', ['Total market capitalization', 'Mining electricity cost', 'DeFi staking yield']],
  ['Hard Fork', 'A radical permanent divergence in the blockchain protocol that makes previously invalid blocks valid (requiring all users to upgrade)', ['A minor backward-compatible software update', 'A wallet firmware update', 'A temporary internet outage']],
  ['Soft Fork', 'A backward-compatible protocol change where non-upgraded nodes can still recognize new transactions as valid', ['A chain split creating a new currency', 'A hardware wallet recovery', 'A 51% attack']]
];

for (const [term, def, wrong] of cryptoConcepts) {
  additions['web3'].push(makeQ(`In blockchain terminology, what is "${term}"?`, def, wrong, 'crypto-concepts'));
  additions['web3'].push(makeQ(`Which Web3/cryptocurrency term matches this definition: "${def}"?`, term, ['Decentralized Autonomous Organization', 'Liquidity Staking Derivative', 'Yield Farming'], 'crypto-concepts'));
}

// =========================================================================
// 2. VEHICLES & AUTOMOTIVE (PUSH TO 820+)
// =========================================================================
const carsData = [
  ['Ferrari', 'Maranello, Italy (Prancing Horse logo)', ['Stuttgart, Germany', 'Sant\'Agata Bolognese, Italy', 'Turin, Italy']],
  ['Lamborghini', 'Sant\'Agata Bolognese, Italy (Raging Bull logo)', ['Maranello, Italy', 'Munich, Germany', 'Modena, Italy']],
  ['Porsche', 'Stuttgart, Germany (Crest featuring a black horse)', ['Munich, Germany', 'Ingolstadt, Germany', 'Wolfsburg, Germany']],
  ['BMW', 'Munich, Germany (Bavarian blue and white roundel)', ['Stuttgart, Germany', 'Ingolstadt, Germany', 'Frankfurt, Germany']],
  ['Mercedes-Benz', 'Stuttgart, Germany (Three-pointed star logo)', ['Munich, Germany', 'Wolfsburg, Germany', 'Cologne, Germany']],
  ['Audi', 'Ingolstadt, Germany (Four interlocking rings)', ['Munich, Germany', 'Stuttgart, Germany', 'Rüsselsheim, Germany']],
  ['Volkswagen', 'Wolfsburg, Germany (VW in circle)', ['Ingolstadt, Germany', 'Stuttgart, Germany', 'Munich, Germany']],
  ['Toyota', 'Toyota City, Aichi, Japan', ['Yokohama, Japan', 'Hiroshima, Japan', 'Tokyo, Japan']],
  ['Honda', 'Tokyo, Japan (H logo, VTEC engines)', ['Yokohama, Japan', 'Nagoya, Japan', 'Osaka, Japan']],
  ['Nissan', 'Yokohama, Japan (GT-R / Skyline)', ['Tokyo, Japan', 'Hiroshima, Japan', 'Toyota City, Japan']],
  ['Mazda', 'Hiroshima, Japan (Rotary Wankel engine & Skyactiv)', ['Tokyo, Japan', 'Yokohama, Japan', 'Nagoya, Japan']],
  ['Subaru', 'Tokyo, Japan (Boxer engine & Symmetrical AWD, Pleiades star cluster logo)', ['Yokohama, Japan', 'Hiroshima, Japan', 'Toyota City, Japan']],
  ['Aston Martin', 'Gaydon, Warwickshire, England (Wings logo, James Bond\'s DB5)', ['Crewe, England', 'Goodwood, England', 'Hethel, England']],
  ['Rolls-Royce Motor Cars', 'Goodwood, West Sussex, England ("Spirit of Ecstasy" bonnet mascot)', ['Gaydon, England', 'Crewe, England', 'Coventry, England']],
  ['Bentley', 'Crewe, Cheshire, England (Winged "B" mascot)', ['Goodwood, England', 'Gaydon, England', 'Hethel, England']],
  ['McLaren Automotive', 'Woking, Surrey, England (F1 supercar & carbon tub)', ['Goodwood, England', 'Crewe, England', 'Gaydon, England']],
  ['Lotus Cars', 'Hethel, Norfolk, England ("Simplify, then add lightness" Colin Chapman)', ['Woking, England', 'Goodwood, England', 'Crewe, England']],
  ['Bugatti', 'Molsheim, Alsace, France (Veyron, Chiron, Tourbillon - W16 engine)', ['Paris, France', 'Lyon, France', 'Marseille, France']],
  ['Koenigsegg', 'Ängelholm, Sweden (Jesko, Agera, CC850 - Ghost squadron badge)', ['Gothenburg, Sweden', 'Stockholm, Sweden', 'Malmö, Sweden']],
  ['Pagani', 'San Cesario sul Panaro, Modena, Italy (Zonda, Huayra, Utopia - Horacio Pagani)', ['Maranello, Italy', 'Sant\'Agata Bolognese, Italy', 'Turin, Italy']],
  ['Rimac Automobili', 'Sveta Nedelja, Croatia (Nevera electric hypercar - Mate Rimac)', ['Ljubljana, Slovenia', 'Belgrade, Serbia', 'Zagreb, Croatia']],
  ['Volvo', 'Gothenburg, Sweden (Pioneered 3-point seatbelt in 1959, Iron Mark logo)', ['Stockholm, Sweden', 'Oslo, Norway', 'Copenhagen, Denmark']],
  ['Hyundai', 'Seoul, South Korea', ['Busan, South Korea', 'Tokyo, Japan', 'Beijing, China']],
  ['Kia', 'Seoul, South Korea', ['Incheon, South Korea', 'Tokyo, Japan', 'Busan, South Korea']],
  ['Tesla', 'Austin, Texas, USA (Model S, 3, X, Y, Cybertruck - Elon Musk)', ['Detroit, Michigan', 'Fremont, California', 'Dearborn, Michigan']],
  ['Ford', 'Dearborn, Michigan, USA (Model T, Mustang, F-150 - Henry Ford)', ['Detroit, Michigan', 'Chicago, Illinois', 'New York, USA']],
  ['Chevrolet', 'Detroit, Michigan, USA (Bowtie logo, Corvette, Camaro - General Motors)', ['Dearborn, Michigan', 'Auburn Hills, Michigan', 'Dallas, Texas']]
];

for (const [brand, hq, wrong] of carsData) {
  additions['vehicles'].push(makeQ(`Where is the iconic automaker ${brand} headquartered and what is its historic heritage?`, hq, wrong, 'auto-brands'));
  additions['vehicles'].push(makeQ(`Which automotive brand is headquartered in ${hq.split('(')[0].trim()}?`, brand, ['Peugeot', 'Renault', 'Fiat'], 'auto-brands'));
}

// =========================================================================
// 3. CARTOONS & ANIMATION (PUSH TO 820+)
// =========================================================================
const cartoonData = [
  ['Tom and Jerry', 'William Hanna and Joseph Barbera (MGM, 1940)', ['Walt Disney', 'Chuck Jones', 'Tex Avery']],
  ['Looney Tunes (Bugs Bunny & Daffy Duck)', 'Warner Bros. (Chuck Jones, Tex Avery, Bob Clampett, Mel Blanc)', ['Walt Disney', 'Hanna-Barbera', 'Fleischer Studios']],
  ['The Simpsons', 'Matt Groening (Springfield - Homer, Marge, Bart, Lisa, Maggie)', ['Seth MacFarlane', 'Mike Judge', 'Trey Parker']],
  ['Family Guy', 'Seth MacFarlane (Quahog, Rhode Island - Peter, Lois, Meg, Chris, Stewie, Brian)', ['Matt Groening', 'Mike Judge', 'Dan Harmon']],
  ['South Park', 'Trey Parker and Matt Stone (Stan, Kyle, Cartman, Kenny)', ['Mike Judge', 'Seth MacFarlane', 'Matt Groening']],
  ['SpongeBob SquarePants', 'Stephen Hillenburg (Bikini Bottom - SpongeBob, Patrick, Squidward, Mr. Krabs)', ['Craig McCracken', 'Genndy Tartakovsky', 'Butch Hartman']],
  ['Avatar: The Last Airbender', 'Michael Dante DiMartino and Bryan Konietzko (Aang, Katara, Sokka, Zuko, Toph)', ['Genndy Tartakovsky', 'Stephen Hillenburg', 'Craig McCracken']],
  ['Phineas and Ferb', 'Dan Povenmire and Jeff "Swampy" Marsh (Perry the Platypus, Dr. Doofenshmirtz)', ['Craig McCracken', 'Stephen Hillenburg', 'Butch Hartman']],
  ['Gravity Falls', 'Alex Hirsch (Mystery Shack in Oregon - Dipper, Mabel, Grunkle Stan, Bill Cipher)', ['Pendleton Ward', 'Rebecca Sugar', 'Dan Povenmire']],
  ['Adventure Time', 'Pendleton Ward (Land of Ooo - Finn the Human, Jake the Dog, Marceline)', ['Rebecca Sugar', 'Alex Hirsch', 'Craig McCracken']],
  ['Steven Universe', 'Rebecca Sugar (Crystal Gems - Garnet, Amethyst, Pearl, Steven)', ['Alex Hirsch', 'Pendleton Ward', 'Dan Povenmire']],
  ['Rick and Morty', 'Justin Roiland and Dan Harmon (Rick Sanchez and Morty Smith across dimensions)', ['Matt Groening', 'Seth MacFarlane', 'Trey Parker']],
  ['Ben 10', 'Man of Action (Ben Tennyson, Omnitrix, Gwen, Grandpa Max)', ['Genndy Tartakovsky', 'Craig McCracken', 'Butch Hartman']],
  ['Dexter\'s Laboratory', 'Genndy Tartakovsky (Boy genius Dexter, sister Dee Dee, rival Mandark)', ['Craig McCracken', 'Butch Hartman', 'Joe Murray']],
  ['The Powerpuff Girls', 'Craig McCracken (Blossom, Bubbles, Buttercup, Professor Utonium, Mojo Jojo)', ['Genndy Tartakovsky', 'Butch Hartman', 'Stephen Hillenburg']],
  ['Samurai Jack', 'Genndy Tartakovsky (Jack sent into the future by the shapeshifting demon Aku)', ['Craig McCracken', 'Stephen Hillenburg', 'Alex Hirsch']],
  ['Courage the Cowardly Dog', 'John R. Dilworth (Nowhere, Kansas - Courage, Muriel, Eustace Bagge)', ['Craig McCracken', 'Genndy Tartakovsky', 'Butch Hartman']],
  ['Johnny Bravo', 'Van Partible (Muscular blond narcissist voiced by Jeff Bennett)', ['Craig McCracken', 'Genndy Tartakovsky', 'Joe Murray']],
  ['Ed, Edd n Eddy', 'Danny Antonucci (Peach Creek cul-de-sac - Jawbreakers scheming trio)', ['Craig McCracken', 'Genndy Tartakovsky', 'John R. Dilworth']],
  ['The Fairly OddParents', 'Butch Hartman (Timmy Turner, Cosmo, Wanda, Mr. Crocker)', ['Craig McCracken', 'Genndy Tartakovsky', 'Stephen Hillenburg']],
  ['Danny Phantom', 'Butch Hartman (Danny Fenton half-ghost hero "Going Ghost!")', ['Genndy Tartakovsky', 'Craig McCracken', 'Stephen Hillenburg']],
  ['Kim Possible', 'Bob Schooley and Mark McCorkle (Teen hero Kim, Ron Stoppable, Rufus, Dr. Drakken)', ['Craig McCracken', 'Genndy Tartakovsky', 'Dan Povenmire']],
  ['Scooby-Doo', 'Joe Ruby and Ken Spears (Mystery Inc. - Scooby, Shaggy, Fred, Daphne, Velma)', ['William Hanna', 'Chuck Jones', 'Tex Avery']],
  ['The Flintstones', 'Hanna-Barbera (Bedrock - Fred, Wilma, Barney, Betty, Dino)', ['Walt Disney', 'Chuck Jones', 'Tex Avery']],
  ['Teen Titans (2003)', 'Glen Murakami (Robin, Starfire, Cyborg, Raven, Beast Boy)', ['Genndy Tartakovsky', 'Craig McCracken', 'Bruce Timm']],
  ['Batman: The Animated Series (1992)', 'Bruce Timm and Eric Radomski (Kevin Conroy as Batman, Mark Hamill as Joker)', ['Glen Murakami', 'Genndy Tartakovsky', 'Craig McCracken']],
  ['X-Men: The Animated Series (1992 & \'97)', 'Larry Houston and Eric & Julia Lewald (Iconic synth theme song)', ['Bruce Timm', 'Glen Murakami', 'Craig McCracken']]
];

for (const [show, creator, wrong] of cartoonData) {
  additions['cartoons'].push(makeQ(`Who created the iconic animated series "${show}"?`, creator, wrong, 'cartoon-creators'));
  additions['cartoons'].push(makeQ(`Which animated series is described: "${creator}"?`, show, ['Rugrats', 'Hey Arnold!', 'The Wild Thornberrys'], 'cartoon-creators'));
}

// =========================================================================
// 4. SPORTS (PUSH TO 820+)
// =========================================================================
const sportsData = [
  ['Basketball', 'Michael Jordan (6 rings, 6 Finals MVPs with Chicago Bulls)', ['Kobe Bryant (5 rings)', 'LeBron James (4 rings)', 'Shaquille O\'Neal (4 rings)'], 'NBA legend undefeated in 6 Finals'],
  ['Basketball', 'LeBron James (All-Time NBA Leading Scorer, 40k+ pts)', ['Kareem Abdul-Jabbar', 'Karl Malone', 'Kobe Bryant'], 'Surpassed Kareem Abdul-Jabbar in February 2023'],
  ['Basketball', 'Stephen Curry (All-Time 3-Point Record Holder, 3,500+ threes)', ['Ray Allen', 'Reggie Miller', 'James Harden'], 'Golden State Warriors sharp-shooter revolutionizing basketball'],
  ['Tennis', 'Novak Djokovic (Record 24 Grand Slam Men\'s Singles Titles)', ['Rafael Nadal (22)', 'Roger Federer (20)', 'Pete Sampras (14)'], 'All-time men\'s Grand Slam record holder'],
  ['Tennis', 'Rafael Nadal (Record 14 French Open Roland Garros titles "King of Clay")', ['Novak Djokovic', 'Roger Federer', 'Björn Borg'], 'Spanish clay-court legend with 22 Grand Slams'],
  ['Tennis', 'Roger Federer (8 Wimbledon Men\'s Singles Titles, 20 Grand Slams)', ['Novak Djokovic', 'Rafael Nadal', 'Pete Sampras'], 'Swiss maestro renowned for elegance and 310 weeks at World No. 1'],
  ['Tennis', 'Serena Williams (23 Grand Slam Singles Titles in Open Era)', ['Steffi Graf (22)', 'Martina Navratilova (18)', 'Chris Evert (18)'], 'Dominant American tennis icon'],
  ['Athletics / Track & Field', 'Usain Bolt (World Records: 100m in 9.58s & 200m in 19.19s in Berlin 2009)', ['Tyson Gay', 'Yohan Blake', 'Asafa Powell'], 'Jamaican 8-time Olympic gold sprint legend'],
  ['Athletics / Track & Field', 'Eliud Kipchoge (First human to run a sub-2-hour marathon in Vienna 2019: 1:59:40)', ['Kelvin Kiptum', 'Kenenisa Bekele', 'Haile Gebrselassie'], 'Kenyan marathon double Olympic champion'],
  ['Athletics / Track & Field', 'Armand "Mondo" Duplantis (Pole Vault World Record 6.25m+ Olympic Champion)', ['Renaud Lavillenie', 'Sergey Bubka', 'Sam Kendricks'], 'Swedish pole vault phenom'],
  ['Boxing', 'Muhammad Ali ("The Greatest", Three-time World Heavyweight Champion)', ['Joe Frazier', 'George Foreman', 'Mike Tyson'], 'Iconic heavyweight champion famous for "Rumble in the Jungle" & "Thrilla in Manila"'],
  ['Boxing', 'Floyd Mayweather Jr. (50-0 Undefeated Professional Record, 5 Division Champion)', ['Manny Pacquiao', 'Canelo Álvarez', 'Oscar De La Hoya'], 'American defensive boxing master "Money Mayweather"'],
  ['Boxing', 'Mike Tyson (Youngest Heavyweight Champion in History at age 20 in 1986)', ['Evander Holyfield', 'Lennox Lewis', 'Riddick Bowe'], '"Iron Mike", explosive knockout specialist'],
  ['Formula 1', 'Lewis Hamilton & Michael Schumacher (Record 7 F1 World Championships each)', ['Max Verstappen', 'Sebastian Vettel', 'Ayrton Senna'], 'Joint record holders for most Formula 1 World Drivers\' Championships'],
  ['Formula 1', 'Ayrton Senna (3-time Brazilian World Champion, Master of Monaco)', ['Alain Prost', 'Nigel Mansell', 'Nelson Piquet'], 'Legendary McLaren driver revered for rain mastery'],
  ['Formula 1', 'Max Verstappen (Record 19 Grand Prix Wins in a single season 2023)', ['Lewis Hamilton', 'Sebastian Vettel', 'Michael Schumacher'], 'Dutch Red Bull Racing champion'],
  ['Golf', 'Tiger Woods & Sam Snead (Joint Record 82 PGA Tour Victories, 15 Majors)', ['Jack Nicklaus (18 majors, 73 wins)', 'Arnold Palmer', 'Phil Mickelson'], 'Modern golf icon who completed the "Tiger Slam" in 2000-2001'],
  ['Golf', 'Jack Nicklaus (All-Time Record 18 Major Championships "The Golden Bear")', ['Tiger Woods (15)', 'Walter Hagen (11)', 'Ben Hogan (9)'], 'All-time major championships leader in golf history'],
  ['Swimming', 'Michael Phelps (Record 23 Olympic Gold Medals, 28 Total Medals)', ['Ryan Lochte', 'Caeleb Dressel', 'Ian Thorpe'], 'Most decorated Olympian of all time'],
  ['Gymnastics', 'Simone Biles (Most decorated gymnast in World and Olympic history, 30+ World medals)', ['Shannon Miller', 'Gabby Douglas', 'Aly Raisman'], 'American gymnastics GOAT with 5 eponymous skills named after her'],
  ['Cricket', 'Sachin Tendulkar ("Master Blaster", 100 International Centuries, 34,357 runs)', ['Virat Kohli', 'Brian Lara', 'Ricky Ponting'], 'Indian cricket god and all-time leading run-scorer in Tests and ODIs'],
  ['Cricket', 'Sir Don Bradman (Unsurpassed Test Batting Average of 99.94)', ['Sachin Tendulkar', 'Steve Smith', 'Brian Lara'], 'Australian cricket legend revered as statistically greatest sportsman'],
  ['American Football (NFL)', 'Tom Brady (Record 7 Super Bowl Rings & 5 Super Bowl MVPs)', ['Joe Montana (4 rings)', 'Patrick Mahomes (3 rings)', 'Peyton Manning (2 rings)'], 'New England Patriots and Tampa Bay Buccaneers quarterback GOAT']
];

for (const [sport, athlete, wrong, desc] of sportsData) {
  additions['sports'].push(makeQ(`In ${sport}, which legendary athlete is described: ${desc}?`, athlete, wrong, 'sports-icons'));
  additions['sports'].push(makeQ(`What is the primary historic sporting record held by ${athlete.split('(')[0].trim()}?`, desc, ['Most yellow cards received', 'Oldest debutant in history', 'Fastest substitution in a match'], 'sports-icons'));
}

// =========================================================================
// 5. ANIMALS & WILDLIFE (PUSH TO 820+)
// =========================================================================
const animalData = [
  ['Blue Whale', 'The largest animal ever known to have lived on Earth (up to 30m long and 200 tons)', ['African Bush Elephant', 'Colossal Squid', 'Fin Whale']],
  ['Peregrine Falcon', 'The fastest animal on Earth, reaching diving speeds over 240 mph (389 km/h) in a hunting stoop', ['Cheetah', 'Golden Eagle', 'Black Marlin']],
  ['Cheetah', 'The fastest land mammal, capable of accelerating from 0 to 60 mph in 3 seconds (up to 70 mph / 112 km/h)', ['Pronghorn', 'Lion', 'Greyhound']],
  ['African Bush Elephant', 'The largest living terrestrial land animal, with males reaching up to 6,000 kg (6 tons)', ['Asian Elephant', 'White Rhinoceros', 'Hippopotamus']],
  ['Giraffe', 'The tallest living terrestrial animal, with neck vertebrae numbering only 7 (same as humans)', ['Ostrich', 'Elephant', 'Camel']],
  ['Ostrich', 'The largest living bird species, laying the largest eggs and capable of running up to 43 mph (70 km/h)', ['Emu', 'Cassowary', 'Albatross']],
  ['Wandering Albatross', 'The bird with the largest wingspan of any living species, measuring up to 3.5 meters (11.5 feet)', ['Andean Condor', 'Pelican', 'Golden Eagle']],
  ['Bee Hummingbird', 'The smallest living bird species in the world, endemic to Cuba and weighing just 2 grams', ['Goldcrest', 'Finch', 'Sparrow']],
  ['Saltwater Crocodile', 'The largest living reptile species on Earth, reaching lengths over 6 meters (20 feet) and 1,000+ kg', ['Komodo Dragon', 'Nile Crocodile', 'Alligator']],
  ['Komodo Dragon', 'The largest living lizard species in the world, native to Indonesian islands with venomous saliva', ['Gila Monster', 'Monitor Lizard', 'Iguana']],
  ['Leatherback Sea Turtle', 'The largest living turtle species, lacking a bony shell and diving up to 1,200 meters deep', ['Green Sea Turtle', 'Galapagos Tortoise', 'Loggerhead Turtle']],
  ['Galapagos Giant Tortoise', 'The longest-lived vertebrate species on land, known to live over 170+ years in the wild', ['Aldabra Tortoise', 'Leatherback Turtle', 'Box Turtle']],
  ['Colossal Squid', 'The largest living invertebrate by mass, possessing the largest eyes in the animal kingdom (up to 27cm across)', ['Giant Pacific Octopus', 'Blue Whale', 'Giant Isopod']],
  ['Mantis Shrimp', 'Marine crustacean with the most complex visual system (16 photoreceptors) and punches at the speed of a bullet', ['Pistol Shrimp', 'Fiddler Crab', 'Lobster']],
  ['Immortal Jellyfish (Turritopsis dohrnii)', 'A jellyfish species capable of reverting back to its juvenile polyp stage when stressed, achieving biological immortality', ['Box Jellyfish', 'Lion\'s Mane Jellyfish', 'Moon Jellyfish']],
  ['Axolotl', 'A critically endangered Mexican salamander that remains in its larval aquatic form for life and can regenerate entire limbs, heart, and brain tissue', ['Newt', 'Gecko', 'Chameleon']],
  ['Platypus', 'One of only two egg-laying mammals (monotremes) in the world, featuring a duck bill, beaver tail, and venomous ankle spurs', ['Echidna', 'Koala', 'Opossum']],
  ['Capybara', 'The largest living rodent in the world, native to South American wetlands and highly semi-aquatic', ['Beaver', 'Porcupine', 'Nutria']]
];

for (const [animal, fact, wrong] of animalData) {
  additions['animals'].push(makeQ(`Which remarkable creature is described: "${fact}"?`, animal, wrong, 'animal-facts'));
  additions['animals'].push(makeQ(`What is the most notable biological feature of the ${animal}?`, fact, ['Capable of photosynthesizing sunlight', 'Possesses four separate hearts', 'Lives exclusively on high mountain peaks'], 'animal-facts'));
}

// =========================================================================
// 6. TV SHOWS & SERIES (PUSH TO 820+)
// =========================================================================
const tvData = [
  ['Breaking Bad', 'Vince Gilligan (Walter White / Heisenberg, Jesse Pinkman in Albuquerque)', ['David Chase', 'Matthew Weiner', 'David Simon']],
  ['Better Call Saul', 'Vince Gilligan & Peter Gould (Jimmy McGill\'s transformation into Saul Goodman)', ['David Chase', 'David Simon', 'Noah Hawley']],
  ['The Sopranos', 'David Chase (Tony Soprano mob boss in New Jersey, Dr. Melfi therapy)', ['David Simon', 'Matthew Weiner', 'Vince Gilligan']],
  ['The Wire', 'David Simon (Baltimore drug trade, dock workers, politics, schools, journalism)', ['David Chase', 'Vince Gilligan', 'David Lynch']],
  ['Mad Men', 'Matthew Weiner (Don Draper 1960s Madison Avenue advertising agency Sterling Cooper)', ['David Chase', 'Vince Gilligan', 'Aaron Sorkin']],
  ['Succession', 'Jesse Armstrong (Logan Roy and Roy siblings battling for Waystar RoyCo)', ['Peter Morgan', 'David Simon', 'Aaron Sorkin']],
  ['The Crown', 'Peter Morgan (Historical drama chronicling the reign of Queen Elizabeth II across decades)', ['Julian Fellowes', 'Jesse Armstrong', 'David Simon']],
  ['Peaky Blinders', 'Steven Knight (Tommy Shelby and the Shelby crime family in post-WWI Birmingham)', ['Guy Ritchie', 'Peter Morgan', 'David Simon']],
  ['Sherlock', 'Steven Moffat and Mark Gatiss (Benedict Cumberbatch as Sherlock, Martin Freeman as Watson)', ['Arthur Conan Doyle', 'Russell T Davies', 'Chris Chibnall']],
  ['Doctor Who', 'Sydney Newman, C. E. Webber, and Donald Wilson (TARDIS, Time Lord from Gallifrey)', ['Steven Moffat', 'Russell T Davies', 'Chris Chibnall']],
  ['Stranger Things', 'The Duffer Brothers (Hawkins, Indiana - Eleven, Upside Down, Demogorgon, Vecna)', ['Mike Flanagan', 'Damon Lindelof', 'Shawn Levy']],
  ['The Last of Us (HBO)', 'Craig Mazin and Neil Druckmann (Pedro Pascal as Joel, Bella Ramsey as Ellie in Cordyceps apocalypse)', ['Sam Levinson', 'Damon Lindelof', 'Noah Hawley']],
  ['House of the Dragon', 'Ryan Condal and George R. R. Martin (Targaryen civil war "Dance of the Dragons")', ['David Benioff and D. B. Weiss', 'Peter Morgan', 'Jesse Armstrong']],
  ['The Boys', 'Eric Kripke (Satirical superhero show featuring Homelander, Billy Butcher, Vought)', ['James Gunn', 'Damon Lindelof', 'Noah Hawley']],
  ['Severance', 'Dan Erickson & Ben Stiller (Lumon Industries separating work memories from personal memories)', ['Jesse Armstrong', 'Noah Hawley', 'Damon Lindelof']],
  ['Squid Game', 'Hwang Dong-hyuk (Deadly Korean children\'s survival games for 45.6 billion won)', ['Bong Joon-ho', 'Park Chan-wook', 'Lee Jung-jae']],
  ['Chernobyl (HBO Mini-Series)', 'Craig Mazin (1986 Soviet nuclear power plant disaster directed by Johan Renck)', ['David Simon', 'Peter Morgan', 'Jesse Armstrong']]
];

for (const [show, creator, wrong] of tvData) {
  additions['tv-shows'].push(makeQ(`Who created the acclaimed television drama "${show}"?`, creator, wrong, 'tv-creators'));
  additions['tv-shows'].push(makeQ(`Which television series is described: "${creator}"?`, show, ['Lost', 'The Walking Dead', 'Prison Break'], 'tv-creators'));
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
console.log(`Successfully finished Part 1 additions! Total questions added: ${totalAdded}`);
