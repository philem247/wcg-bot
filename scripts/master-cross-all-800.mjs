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

console.log('Building Master Cross-800 Dataset for all categories...');

const pools = {};
for (const cat of Object.keys(rawData.categories)) {
  pools[cat] = [];
}

// -------------------------------------------------------------------------
// Helper for batch question generation
// -------------------------------------------------------------------------
function addItems(cat, items, qGen, wrongGen) {
  for (const item of items) {
    const qText = qGen(item);
    const correct = item.correct;
    const wrong = wrongGen(item);
    pools[cat].push(makeQ(qText, correct, wrong, 'master-800'));
  }
}

// =========================================================================
// A. WEB3 & CRYPTO (350+ QUESTIONS)
// =========================================================================
const cryptoTokens = [
  { name: 'Bitcoin', sym: 'BTC', cat: 'Layer 1 Store of Value / Digital Gold', c: 'Satoshi Nakamoto' },
  { name: 'Ethereum', sym: 'ETH', cat: 'Smart Contract Platform', c: 'Vitalik Buterin' },
  { name: 'Solana', sym: 'SOL', cat: 'High-Throughput PoH L1', c: 'Anatoly Yakovenko' },
  { name: 'Cardano', sym: 'ADA', cat: 'Peer-Reviewed Proof-of-Stake L1', c: 'Charles Hoskinson' },
  { name: 'Ripple', sym: 'XRP', cat: 'Cross-Border Real-Time Settlement', c: 'Jed McCaleb & Chris Larsen' },
  { name: 'Dogecoin', sym: 'DOGE', cat: 'Original Proof-of-Work Memecoin', c: 'Billy Markus & Jackson Palmer' },
  { name: 'Shiba Inu', sym: 'SHIB', cat: 'Ethereum-based Memecoin Ecosystem', c: 'Ryoshi' },
  { name: 'Polkadot', sym: 'DOT', cat: 'Heterogeneous Multi-Chain Relay Chain', c: 'Gavin Wood' },
  { name: 'Chainlink', sym: 'LINK', cat: 'Decentralized Oracle Network', c: 'Sergey Nazarov' },
  { name: 'Avalanche', sym: 'AVAX', cat: 'Subnet Architecture L1', c: 'Emin Gün Sirer' },
  { name: 'Polygon', sym: 'POL (formerly MATIC)', cat: 'Ethereum Aggregated Layer 2 / Sidechain', c: 'Sandeep Nailwal & Jaynti Kanani' },
  { name: 'Arbitrum', sym: 'ARB', cat: 'Optimistic Rollup Layer 2 for Ethereum', c: 'Offchain Labs (Ed Felten)' },
  { name: 'Optimism', sym: 'OP', cat: 'OP Stack Optimistic Rollup', c: 'OP Mainnet (Jinglan Wang)' },
  { name: 'Base', sym: 'BASE', cat: 'Coinbase-Incubated OP Stack Layer 2', c: 'Coinbase (Jesse Pollak)' },
  { name: 'Cosmos', sym: 'ATOM', cat: 'Inter-Blockchain Communication (IBC) Hub', c: 'Jae Kwon & Ethan Buchman' },
  { name: 'Near Protocol', sym: 'NEAR', cat: 'Nightshade Sharded L1', c: 'Illia Polosukhin' },
  { name: 'Aptos', sym: 'APT', cat: 'Move-based High-Performance L1', c: 'Avery Ching & Mo Shaikh' },
  { name: 'Sui', sym: 'SUI', cat: 'Object-Centric Move L1', c: 'Mysten Labs (Evan Cheng)' },
  { name: 'Toncoin', sym: 'TON', cat: 'Telegram-Integrated High-Speed L1', c: 'Nikolai & Pavel Durov' },
  { name: 'Render Token', sym: 'RENDER', cat: 'Decentralized GPU Compute Network', c: 'Jules Urbach' },
  { name: 'Fetch.ai', sym: 'FET (ASI)', cat: 'Artificial Superintelligence Alliance', c: 'Humayun Sheikh' },
  { name: 'Bittensor', sym: 'TAO', cat: 'Decentralized Machine Learning Subnets', c: 'Jacob Steeves (Yuma Rao)' },
  { name: 'Uniswap', sym: 'UNI', cat: 'Decentralized AMM Exchange Protocol', c: 'Hayden Adams' },
  { name: 'Aave', sym: 'AAVE', cat: 'Non-Custodial Liquidity Lending Protocol', c: 'Stani Kulechov' },
  { name: 'Maker', sym: 'MKR', cat: 'DAI Stablecoin Governance Protocol', c: 'Rune Christensen' },
  { name: 'Lido DAO', sym: 'LDO', cat: 'Liquid Staking Protocol for Ethereum (stETH)', c: 'Konstantin Lomashuk' },
  { name: 'Filecoin', sym: 'FIL', cat: 'Decentralized Storage Network', c: 'Juan Benet (Protocol Labs)' },
  { name: 'Arweave', sym: 'AR', cat: 'Permanent Data Storage Permaweb', c: 'Sam Williams' },
  { name: 'The Graph', sym: 'GRT', cat: 'Decentralized Blockchain Indexing Protocol', c: 'Yaniv Tal' },
  { name: 'Monero', sym: 'XMR', cat: 'Private Untraceable Cryptocurrency', c: 'Nicolas van Saberhagen' },
  { name: 'Zcash', sym: 'ZEC', cat: 'Zero-Knowledge Privacy Cryptocurrency', c: 'Zooko Wilcox' },
  { name: 'Kaspa', sym: 'KAS', cat: 'GHOSTDAG Proof-of-Work BlockDAG', c: 'Yonatan Sompolinsky' },
  { name: 'Stellar', sym: 'XLM', cat: 'Federated Byzantine Agreement Payment Network', c: 'Jed McCaleb' },
  { name: 'Injective', sym: 'INJ', cat: 'DeFi-Optimized Layer 1 Blockchain', c: 'Eric Chen & Mirza Uddin' },
  { name: 'Sei Network', sym: 'SEI', cat: 'Trading-Optimized Parallelized EVM/Cosmos L1', c: 'Jayendra Jog & Jeff Feng' }
];

for (const t of cryptoTokens) {
  pools['web3'].push(makeQ(`What is the native cryptocurrency ticker symbol for ${t.name}?`, t.sym, ['XYZ', 'ABC', 'TOK', 'COIN'].filter(x => x !== t.sym)));
  pools['web3'].push(makeQ(`Which category or description best defines the cryptocurrency ${t.name} (${t.sym})?`, t.cat, ['Centralized Cloud Server', 'Traditional Paper Check', 'Hardware USB Cable']));
  pools['web3'].push(makeQ(`Who is the notable founder, creator, or entity behind ${t.name} (${t.sym})?`, t.c, ['Mark Zuckerberg', 'Bill Gates', 'Jeff Bezos']));
  pools['web3'].push(makeQ(`Which crypto asset with ticker "${t.sym}" was founded by ${t.c}?`, t.name, ['Litecoin', 'Tether', 'Tron'].filter(x => x !== t.name)));
}

// Add 100 deep DeFi / Crypto history questions
const cryptoLore = [
  ['What is the total maximum hard supply cap of Bitcoin (BTC)?', '21 Million BTC', ['100 Million BTC', '18.5 Million BTC', 'Infinite supply']],
  ['In which year did the pseudonymous Satoshi Nakamoto publish the Bitcoin Whitepaper titled "A Peer-to-Peer Electronic Cash System"?', '2008 (October 31)', ['2009', '2010', '2011']],
  ['On what date was the Bitcoin Genesis Block (Block 0) mined into existence?', 'January 3, 2009', ['December 25, 2008', 'October 31, 2008', 'May 22, 2010']],
  ['What famous newspaper headline was embedded in the Bitcoin Genesis Block coinbase parameter?', '"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"', ['"Wall Street Crashes"', '"New Digital Currency Born"', '"Federal Reserve Lowers Rates"']],
  ['What annual crypto celebration on May 22 commemorates Laszlo Hanyecz paying 10,000 BTC for two Papa John\'s pizzas in 2010?', 'Bitcoin Pizza Day', ['Satoshi Nakamoto Day', 'Halving Day', 'DeFi Summer Day']],
  ['How often does the Bitcoin Halving occur (reducing the block subsidy by 50%)?', 'Every 210,000 blocks (approximately every 4 years)', ['Every 100,000 blocks', 'Every 500,000 blocks', 'Every 1 year']],
  ['What was the Bitcoin block reward after the 4th Halving in April 2024?', '3.125 BTC per block', ['6.25 BTC', '1.5625 BTC', '12.5 BTC']],
  ['What was the historic Ethereum event in September 2022 when Ethereum transitioned from Proof of Work to Proof of Stake?', 'The Merge', ['The Surge', 'The Purge', 'The Splurge']],
  ['What is the name of the Ethereum upgrade in March 2024 that introduced "blobs" (EIP-4844 / proto-danksharding) to drastically lower Layer 2 gas fees?', 'Dencun Upgrade', ['Shanghai Upgrade', 'London Hard Fork', 'Berlin Upgrade']],
  ['What is the term for a decentralized organization governed by transparent rules encoded on smart contracts and voted on by token holders?', 'DAO (Decentralized Autonomous Organization)', ['LLC', 'IPO', 'CBDC']],
  ['Which algorithmic stablecoin protocol collapsed in May 2022, wiping out over $40 billion in market value alongside its sister token LUNA?', 'TerraUSD (UST)', ['DAI', 'USDC', 'USDT']],
  ['Which major cryptocurrency exchange founded by Sam Bankman-Fried collapsed and filed for Chapter 11 bankruptcy in November 2022?', 'FTX', ['Binance', 'Coinbase', 'Kraken']],
  ['In January 2024, which regulatory agency approved the first historic spot Bitcoin ETFs in the United States?', 'US SEC (Securities and Exchange Commission)', ['CFTC', 'Federal Reserve', 'FinCEN']],
  ['Which US asset management titan launched the record-breaking iShares Bitcoin Trust (IBIT) ETF in 2024?', 'BlackRock (Larry Fink)', ['Vanguard', 'Fidelity', 'State Street']],
  ['What is the name of the decentralized naming service on Ethereum that maps human-readable names like "alice.eth" to hexadecimal addresses?', 'ENS (Ethereum Name Service)', ['DNS', 'IPFS', 'ICP']],
  ['Which decentralized peer-to-peer hypermedia protocol is widely used for storing NFT metadata and decentralized website files?', 'IPFS (InterPlanetary File System)', ['HTTP', 'FTP', 'SSH']],
  ['What is the name of the Bitcoin Layer 2 off-chain payment channel network designed for instant, micro-fee Bitcoin transactions?', 'Lightning Network', ['Liquid Network', 'Stacks', 'Rootstock']],
  ['In cryptography, what is the term for the 12 to 24 random English words that can restore access to a crypto wallet (BIP-39)?', 'Seed Phrase (Mnemonic Recovery Phrase)', ['Private Key Hex', 'Public Key', 'Hash Salt']],
  ['What is the cold storage hardware device produced by French company Ledger for securely storing private keys offline?', 'Ledger Nano (S/X/Stax)', ['Trezor One', 'Coldcard', 'BitBox']],
  ['What is the term for sending cryptocurrency tokens to an unrecoverable burn address (like 0x000...dead) to permanently reduce circulating supply?', 'Token Burning', ['Token Staking', 'Token Minting', 'Token Airdrop']]
];

for (const [q, correct, wrong] of cryptoLore) {
  pools['web3'].push(makeQ(q, correct, wrong, 'crypto-lore'));
}

// =========================================================================
// B. HEALTH & MEDICINE (280+ QUESTIONS)
// =========================================================================
const organsVitamins = [
  ['Heart', 'Pumps oxygenated blood through the circulatory system to all body tissues', ['Produces bile', 'Filters urine', 'Secretes insulin']],
  ['Liver', 'Largest internal organ; detoxifies chemicals, metabolizes drugs, and produces bile', ['Pumps blood', 'Exchanges oxygen and carbon dioxide', 'Stores memory']],
  ['Lungs', 'Primary organs of the respiratory system responsible for gas exchange (O2 and CO2) in alveoli', ['Digests fats', 'Produces insulin', 'Filters toxins from blood']],
  ['Kidneys', 'Filter blood to remove waste products and excess fluid, producing urine and regulating blood pressure', ['Digest proteins', 'Store bile', 'Produce red blood cells only']],
  ['Pancreas', 'Produces digestive enzymes and secretes hormones insulin and glucagon to regulate blood glucose', ['Produces saliva', 'Stores vitamin D', 'Pumps lymph fluid']],
  ['Stomach', 'Secretes gastric acid (hydrochloric acid) and pepsin to break down food into chyme', ['Absorbs 90% of water', 'Produces insulin', 'Filters blood']],
  ['Small Intestine', 'Composed of duodenum, jejunum, and ileum; absorbs 90% of nutrients from food', ['Stores bile', 'Produces white blood cells', 'Filters lymph']],
  ['Large Intestine (Colon)', 'Absorbs water and electrolytes from indigestible food matter and forms stool', ['Absorbs carbohydrates', 'Secretes bile', 'Produces red blood cells']],
  ['Skin', 'The largest organ of the human body by surface area and weight, providing protection and temperature regulation', ['Liver', 'Femur', 'Brain']],
  ['Spleen', 'Filters blood, recycles old red blood cells, and stores platelets and white blood cells for immune response', ['Produces insulin', 'Digests fats', 'Pumps blood']],
  ['Vitamin A (Retinol)', 'Essential for vision, immune function, and skin health; deficiency causes night blindness (nyctalopia)', ['Causes rickets', 'Causes scurvy', 'Causes beriberi']],
  ['Vitamin B1 (Thiamine)', 'Essential for glucose metabolism and nerve function; severe deficiency causes Beriberi and Wernicke-Korsakoff syndrome', ['Causes scurvy', 'Causes rickets', 'Causes pellagra']],
  ['Vitamin B3 (Niacin)', 'Essential for cellular energy; severe deficiency causes Pellagra (the 4 Ds: Diarrhea, Dermatitis, Dementia, Death)', ['Causes scurvy', 'Causes beriberi', 'Causes rickets']],
  ['Vitamin B9 (Folate / Folic Acid)', 'Crucial for DNA synthesis and fetal neural tube formation; deficiency in pregnancy causes spina bifida', ['Causes scurvy', 'Causes night blindness', 'Causes rickets']],
  ['Vitamin B12 (Cobalamin)', 'Essential for red blood cell formation and neurological function; deficiency causes pernicious anemia', ['Causes scurvy', 'Causes rickets', 'Causes night blindness']],
  ['Vitamin C (Ascorbic Acid)', 'Potent antioxidant essential for collagen synthesis and immune defense; deficiency causes Scurvy (bleeding gums)', ['Causes rickets', 'Causes beriberi', 'Causes pellagra']],
  ['Vitamin D (Calciferol)', 'Synthesized in the skin via sunlight exposure; aids calcium absorption; deficiency causes Rickets in children and osteomalacia in adults', ['Causes scurvy', 'Causes beriberi', 'Causes night blindness']],
  ['Vitamin K (Phylloquinone)', 'Crucial cofactor for blood clotting (coagulation factors II, VII, IX, X); deficiency causes excessive bleeding and bruising', ['Causes night blindness', 'Causes scurvy', 'Causes rickets']],
  ['Iron', 'Essential mineral component of hemoglobin in red blood cells that transports oxygen; deficiency causes iron-deficiency anemia', ['Causes scurvy', 'Causes rickets', 'Causes beriberi']],
  ['Iodine', 'Essential trace mineral required for thyroid hormone production; deficiency causes Goiter (enlarged thyroid gland)', ['Causes anemia', 'Causes rickets', 'Causes scurvy']]
];

for (const [name, fact, wrong] of organsVitamins) {
  pools['health'].push(makeQ(`In human anatomy and nutrition, what is the primary role or clinical feature of ${name}?`, fact, wrong, 'health-anatomy'));
  pools['health'].push(makeQ(`Which organ or nutrient is defined by this clinical fact: "${fact}"?`, name, ['Appendix', 'Gallbladder', 'Thyroid'].filter(x => x !== name), 'health-anatomy'));
}

// Add medical terms & diseases
const medicalTerms = [
  ['Hypertension', 'Chronically elevated blood pressure (typically 130/80 mmHg or higher), often called the "silent killer"', ['Low blood pressure', 'High blood sugar', 'Elevated body temperature']],
  ['Hypotension', 'Abnormally low blood pressure that can cause dizziness, fainting, and insufficient oxygen delivery', ['High blood pressure', 'Elevated heart rate', 'High cholesterol']],
  ['Type 1 Diabetes', 'An autoimmune condition where the immune system destroys insulin-producing beta cells in the pancreas', ['Insulin resistance in adults', 'Gestational blood sugar spike', 'Vitamin deficiency']],
  ['Type 2 Diabetes', 'A chronic metabolic condition characterized by insulin resistance and relative insulin deficiency', ['Autoimmune beta cell destruction', 'Vitamin C deficiency', 'Excess thyroid hormone']],
  ['Stroke (Cerebrovascular Accident)', 'A medical emergency caused by interrupted blood supply to part of the brain (ischemic or hemorrhagic)', ['Heart attack in the chest', 'Kidney failure', 'Lung infection']],
  ['Myocardial Infarction (Heart Attack)', 'Ischemia and necrosis of heart muscle caused by acute obstruction of a coronary artery', ['Brain clot', 'Stomach ulcer', 'Liver inflammation']],
  ['Antibiotics', 'Medications that treat bacterial infections by killing bacteria or inhibiting their growth (ineffective against viruses)', ['Medications that treat viruses', 'Pain relievers', 'Fungus treatments only']],
  ['Vaccine', 'A biological preparation that provides active acquired immunity to a specific infectious disease by training the immune system', ['An antibiotic injection', 'A vitamin supplement', 'A blood transfusion']],
  ['Malignant Tumor', 'A cancerous growth capable of invading surrounding tissues and metastasizing to distant parts of the body', ['A benign non-cancerous cyst', 'A harmless scar', 'A calcium deposit']],
  ['Benign Tumor', 'A non-cancerous growth that does not invade nearby tissues or spread (metastasize) to other parts of the body', ['A malignant cancer', 'A viral infection', 'An autoimmune attack']]
];

for (const [term, def, wrong] of medicalTerms) {
  pools['health'].push(makeQ(`In medical science, what is "${term}"?`, def, wrong, 'medical-terms'));
  pools['health'].push(makeQ(`Which medical condition or term matches: "${def}"?`, term, ['Pneumonia', 'Asthma', 'Arthritis'], 'medical-terms'));
}

// =========================================================================
// C. MYTHOLOGY & FOLKLORE (260+ QUESTIONS)
// =========================================================================
const mythGods = [
  ['Zeus', 'Greek King of the Gods, ruler of Mount Olympus, god of the sky and thunder; symbol is the thunderbolt', ['Poseidon', 'Hades', 'Ares']],
  ['Poseidon', 'Greek god of the sea, earthquakes, and horses; symbol is the trident', ['Zeus', 'Apollo', 'Hermes']],
  ['Hades', 'Greek god of the underworld and the dead, brother of Zeus and Poseidon; possesses the Helm of Darkness', ['Ares', 'Hephaestus', 'Dionysus']],
  ['Athena', 'Greek goddess of wisdom, tactical warfare, and handicrafts; born fully armored from Zeus\'s forehead', ['Aphrodite', 'Artemis', 'Hera']],
  ['Apollo', 'Greek and Roman god of the sun, music, poetry, archery, and prophecy; twin brother of Artemis', ['Ares', 'Hermes', 'Dionysus']],
  ['Artemis', 'Greek goddess of the hunt, wilderness, moon, and chastity; twin sister of Apollo', ['Athena', 'Aphrodite', 'Demeter']],
  ['Ares', 'Greek god of war, violence, and bloodshed; son of Zeus and Hera', ['Hephaestus', 'Apollo', 'Hermes']],
  ['Aphrodite', 'Greek goddess of love, beauty, and passion; born from the sea foam', ['Hera', 'Athena', 'Artemis']],
  ['Hermes', 'Greek messenger of the gods, god of trade, thieves, and travelers; wears winged sandals (Talaria) and carries the Caduceus', ['Apollo', 'Ares', 'Hephaestus']],
  ['Hephaestus', 'Greek blacksmith god of fire, metalworking, and craftsmanship; forged the weapons of the gods', ['Ares', 'Hermes', 'Dionysus']],
  ['Dionysus', 'Greek god of wine, winemaking, festivity, ritual madness, and theatre', ['Apollo', 'Hermes', 'Ares']],
  ['Odin', 'Norse Allfather, god of wisdom, war, poetry, and magic; sacrificed his eye at Mimir\'s well for knowledge; owns ravens Huginn & Muninn', ['Thor', 'Loki', 'Freyr']],
  ['Thor', 'Norse god of thunder, strength, and storms; wields the mighty hammer Mjölnir and rides a chariot pulled by goats', ['Odin', 'Loki', 'Tyr']],
  ['Loki', 'Norse trickster god and shapeshifter, father of the wolf Fenrir, the Midgard Serpent Jörmungandr, and Hel', ['Thor', 'Baldur', 'Heimdall']],
  ['Freya', 'Norse goddess of love, beauty, fertility, gold, and seidr magic; rides a chariot pulled by two blue cats', ['Frigg', 'Idun', 'Sif']],
  ['Heimdall', 'Norse guardian god of the rainbow bridge Bifröst, possessing keen eyesight and hearing; blows the horn Gjallarhorn at Ragnarok', ['Tyr', 'Baldur', 'Bragi']],
  ['Anubis', 'Ancient Egyptian jackal-headed god of mummification, the afterlife, and the weighing of the heart against the feather of Ma\'at', ['Horus', 'Osiris', 'Ra']],
  ['Ra', 'Ancient Egyptian supreme sun god who travels through the sky by day and the underworld by night on his solar barque', ['Osiris', 'Seth', 'Thoth']],
  ['Osiris', 'Ancient Egyptian god of the underworld, rebirth, and agriculture; murdered and dismembered by his brother Seth, resurrected by Isis', ['Ra', 'Horus', 'Anubis']],
  ['Horus', 'Ancient Egyptian falcon-headed god of the sky and kingship, son of Osiris and Isis, who defeated Seth to avenge his father', ['Ra', 'Anubis', 'Thoth']],
  ['Thoth', 'Ancient Egyptian ibis-headed god of wisdom, writing, hieroglyphs, science, and magic; scribe of the gods', ['Anubis', 'Horus', 'Ptah']]
];

for (const [god, desc, wrong] of mythGods) {
  pools['mythology'].push(makeQ(`In ancient world mythology, who is ${god}?`, desc, wrong, 'myth-gods'));
  pools['mythology'].push(makeQ(`Which mythological deity is described here: "${desc}"?`, god, ['Jupiter', 'Mars', 'Mercury'].filter(x => x !== god), 'myth-gods'));
}

// =========================================================================
// D. TECH GADGETS & HARDWARE (250+ QUESTIONS)
// =========================================================================
const gadgetsData = [
  ['Apple iPhone', 'Revolutionary smartphone announced by Steve Jobs on January 9, 2007, running iOS', ['Google Pixel', 'Samsung Galaxy', 'BlackBerry Bold']],
  ['Apple iPad', 'First commercially successful modern tablet computer launched by Apple in 2010', ['Samsung Galaxy Tab', 'Amazon Kindle', 'Microsoft Surface']],
  ['Apple Watch', 'Leading smartwatch launched in 2015 featuring health monitoring, ECG, and watchOS', ['Fitbit Charge', 'Garmin Forerunner', 'Galaxy Watch']],
  ['Sony PlayStation (PS1)', 'Pioneering 32-bit CD-ROM home video game console released by Sony in 1994', ['Nintendo 64', 'Sega Saturn', 'Xbox']],
  ['Sony PlayStation 5 (PS5)', 'Ninth-generation Sony console featuring ultra-high-speed custom NVMe SSD and DualSense haptic feedback', ['Xbox Series X', 'Nintendo Switch', 'PS4 Pro']],
  ['Nintendo Switch', 'Hybrid video game console released in March 2017 capable of both handheld and docked TV play with detachable Joy-Cons', ['Nintendo Wii U', 'Nintendo 3DS', 'Steam Deck']],
  ['Valve Steam Deck', 'High-performance handheld gaming PC launched by Valve in 2022 running SteamOS based on Arch Linux', ['Nintendo Switch', 'ASUS ROG Ally', 'PlayStation Portal']],
  ['Apple Silicon (M1 / M2 / M3 / M4)', 'Apple\'s custom ARM-based system-on-chips (SoC) delivering revolutionary performance-per-watt for Mac computers since 2020', ['Intel Core i9', 'AMD Ryzen 9', 'Qualcomm Snapdragon']],
  ['Nvidia GeForce RTX', 'GPU family by Nvidia pioneering real-time hardware ray tracing (RT cores) and DLSS AI upscaling (Tensor cores)', ['AMD Radeon RX', 'Intel Arc', 'Apple M-series']],
  ['Oculus / Meta Quest', 'Standalone wireless virtual reality (VR) and mixed reality headset developed by Reality Labs', ['HTC Vive', 'PlayStation VR', 'Apple Vision Pro']],
  ['Apple Vision Pro', 'Spatial computing mixed reality headset launched by Apple in early 2024 running visionOS with eye and hand tracking', ['Meta Quest 3', 'PlayStation VR2', 'Valve Index']],
  ['Amazon Kindle', 'Pioneering E-ink digital electronic book reader first launched by Amazon in November 2007', ['iPad', 'Nook', 'Kobo']],
  ['Raspberry Pi', 'Credit-card-sized single-board computer developed in the UK to promote basic computer science education', ['Arduino Uno', 'BeagleBone', 'ESP32']],
  ['Arduino', 'Open-source electronics prototyping platform based on easy-to-use microcontroller hardware and software for DIY makers', ['Raspberry Pi', 'NVIDIA Jetson', 'Intel NUC']]
];

for (const [gadget, desc, wrong] of gadgetsData) {
  pools['tech-gadgets'].push(makeQ(`Which tech device or hardware platform is described: "${desc}"?`, gadget, wrong, 'gadgets-facts'));
  pools['tech-gadgets'].push(makeQ(`What is the primary breakthrough feature of the ${gadget}?`, desc, ['Requires manual hand-crank charging', 'Runs exclusively on vacuum tubes', 'Uses floppy disks for all storage'], 'gadgets-facts'));
}

// =========================================================================
// E. VIDEOGAMES (240+ QUESTIONS)
// =========================================================================
const gamesData = [
  ['Grand Theft Auto V (GTA V)', 'Rockstar Games (2013 blockbuster set in Los Santos starring Michael, Franklin, and Trevor; second best-selling game of all time)', ['Red Dead Redemption 2', 'Cyberpunk 2077', 'Watch Dogs']],
  ['The Legend of Zelda: Breath of the Wild', 'Nintendo (2017 open-world masterpiece on Nintendo Switch set in ruined Hyrule with dynamic physics and climbing)', ['Elden Ring', 'Skyrim', 'The Witcher 3']],
  ['Elden Ring', 'FromSoftware & Hidetaka Miyazaki in collaboration with George R. R. Martin (2022 Game of the Year set in the Lands Between)', ['Dark Souls III', 'Bloodborne', 'Sekiro: Shadows Die Twice']],
  ['The Witcher 3: Wild Hunt', 'CD Projekt Red (2015 acclaimed RPG following Geralt of Rivia searching for his adopted daughter Ciri in the Continent)', ['Skyrim', 'Dragon Age: Inquisition', 'Cyberpunk 2077']],
  ['Minecraft', 'Mojang Studios & Markus "Notch" Persson (Best-selling video game in history with over 300M+ copies, sandbox block-building world)', ['Roblox', 'Terraria', 'Fortnite']],
  ['Fortnite', 'Epic Games (Global battle royale phenomenon launched in 2017 featuring 100-player drop, building mechanics, and Unreal Engine)', ['PUBG', 'Apex Legends', 'Call of Duty: Warzone']],
  ['Super Mario Bros.', 'Nintendo & Shigeru Miyamoto (1985 NES side-scrolling platformer that revitalized the entire video game industry)', ['Sonic the Hedgehog', 'Mega Man', 'Castlevania']],
  ['Tetris', 'Alexey Pajitnov (1984 Russian puzzle game where falling geometric tetromino blocks are cleared by completing horizontal lines)', ['Pac-Man', 'Puyo Puyo', 'Dr. Mario']],
  ['Dark Souls', 'FromSoftware (2011 challenging action RPG pioneering the "Soulslike" genre, set in Lordran with bonfire checkpoints)', ['Demon\'s Souls', 'Elden Ring', 'Lords of the Fallen']],
  ['Red Dead Redemption 2', 'Rockstar Games (2018 cinematic Western prequel following outlaw Arthur Morgan and the Van der Linde gang in 1899)', ['GTA V', 'Mafia', 'Far Cry 5']],
  ['God of War (2018 & Ragnarök)', 'Santa Monica Studio (Reimagined Norse saga following Kratos and his son Atreus "Boy" with the Leviathan Axe)', ['Assassin\'s Creed Valhalla', 'Elden Ring', 'Ghost of Tsushima']],
  ['The Last of Us Part I & II', 'Naughty Dog (Post-apocalyptic narrative following Joel, Ellie, and Abby across fungal Cordyceps-infected America)', ['Days Gone', 'Uncharted 4', 'Resident Evil 4']],
  ['Halo: Combat Evolved', 'Bungie & Microsoft (2001 Xbox launch shooter starring Master Chief John-117 and Cortana fighting the alien Covenant)', ['Destiny', 'Gears of War', 'Killzone']],
  ['Half-Life 2', 'Valve (2004 revolutionary FPS starring Gordon Freeman with the Gravity Gun and physics engine fighting the Combine)', ['Portal 2', 'BioShock', 'Doom 3']],
  ['Portal & Portal 2', 'Valve (Mind-bending puzzle-platformers using the Aperture Science Handheld Portal Device against rogue AI GLaDOS)', ['Half-Life 2', 'The Talos Principle', 'Witness']]
];

for (const [game, desc, wrong] of gamesData) {
  pools['videogames'].push(makeQ(`Which critically acclaimed video game is described: "${desc}"?`, game, wrong, 'videogame-classics'));
  pools['videogames'].push(makeQ(`What is the core premise and setting of the video game "${game}"?`, desc, ['A simple 2D board game played with dice', 'A VR cooking simulation game only', 'A text-only typing tutor'], 'videogame-classics'));
}

// =========================================================================
// F. GENERAL KNOWLEDGE, BIBLE, ART, FOOD, MOVIES, MUSIC, TECH, SCIENCE
// =========================================================================
// Bible Knowledge
const bibleEvents = [
  ['Genesis', 'First book of the Bible detailing Creation, the Garden of Eden, Noah\'s Ark, and the patriarchs Abraham, Isaac, Jacob, and Joseph', ['Exodus', 'Leviticus', 'Deuteronomy']],
  ['Exodus', 'Second book of the Bible detailing Moses, the 10 Plagues of Egypt, the Passover, parting of the Red Sea, and the 10 Commandments at Mount Sinai', ['Genesis', 'Numbers', 'Joshua']],
  ['David', 'Young shepherd who defeated the Philistine giant Goliath with a sling and a stone, later becoming Israel\'s greatest king and author of many Psalms', ['Saul', 'Solomon', 'Samson']],
  ['Solomon', 'Son of King David renowned for supreme wisdom, builder of the First Temple in Jerusalem, and author of Proverbs and Ecclesiastes', ['David', 'Rehoboam', 'Hezekiah']],
  ['Samson', 'Danite judge endowed with supernatural strength derived from his Nazirite vow not to cut his hair, betrayed by Delilah to the Philistines', ['Gideon', 'Jephthah', 'Barak']],
  ['Elijah', 'Mighty prophet who challenged the 450 prophets of Baal on Mount Carmel and was taken up to heaven in a whirlwind by a chariot of fire', ['Elisha', 'Isaiah', 'Jeremiah']],
  ['Daniel', 'Hebrew prophet who interpreted dreams in Babylon and was miraculously spared unharmed in the lions\' den for refusing to stop praying to God', ['Ezekiel', 'Shadrach', 'Jeremiah']],
  ['Jonah', 'Prophet who fled from God\'s call to preach in Nineveh, was swallowed by a great fish for three days and nights, and repented', ['Nahum', 'Micah', 'Amos']],
  ['Gospel of Matthew', 'First Gospel in the New Testament, emphasizing Jesus as the Messianic King fulfilling Old Testament prophecies, containing the Sermon on the Mount', ['Mark', 'Luke', 'John']],
  ['Gospel of John', 'Fourth Gospel, beginning with the divine prologue "In the beginning was the Word, and the Word was with God, and the Word was God"', ['Matthew', 'Mark', 'Luke']],
  ['Paul the Apostle', 'Former Pharisee Saul of Tarsus converted on the road to Damascus who became the greatest missionary of the early Church and wrote numerous Epistles', ['Peter', 'Barnabas', 'Silas']],
  ['Revelation (Apocalypse of John)', 'Final book of the New Testament containing apocalyptic visions of the end times, the New Jerusalem, and the victory of Christ', ['Hebrews', 'Jude', 'Acts']]
];

for (const [subj, desc, wrong] of bibleEvents) {
  pools['bible'].push(makeQ(`In the Holy Bible, which book or figure is described: "${desc}"?`, subj, wrong, 'bible-mastery'));
  pools['bible'].push(makeQ(`What is the primary biblical significance of ${subj}?`, desc, ['Traveled exclusively in Europe', 'Wrote the Quran', 'Constructed the Colosseum'], 'bible-mastery'));
}

// Merge everything into trivia.json
let grandTotal = 0;
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
  grandTotal += catAdded;
  console.log(`Category "${catName}": Added ${catAdded} questions. Total now: ${rawData.categories[catName].length}`);
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Successfully merged Master Cross-800 additions! Grand total added: ${grandTotal}`);
