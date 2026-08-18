import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

let fixed = 0;

for (const [catName, qs] of Object.entries(rawData.categories)) {
  for (const q of qs) {
    const orig = q.q;
    const cleanC = q.correct.trim();

    // 1. Tech gadgets company leaks
    q.q = q.q.replace(/known as Fitbit is made by which tech giant\?/gi, 'known as the iconic wristband activity tracker is made by which brand?');
    q.q = q.q.replace(/creator of the Fitbit\?/gi, 'company that originally created the iconic fitness tracking wristband?');
    q.q = q.q.replace(/Which brand released the Fitbit\?/gi, 'Which company pioneered the wearable step-and-sleep tracking wristband?');
    q.q = q.q.replace(/buy a brand new Fitbit, which company's store/gi, 'buy an iconic wearable fitness tracker, which brand store');
    q.q = q.q.replace(/The Fitbit was designed and released by:/gi, 'The pioneering fitness wristband tracker was designed and released by:');

    q.q = q.q.replace(/manufacturer of the "Nokia 3310"\?/gi, 'manufacturer of the legendary indestructible "3310" mobile phone?');
    q.q = q.q.replace(/known as Nokia 3310 is made by which tech giant\?/gi, 'known as the indestructible "3310" phone with Snake is made by which Finnish brand?');
    q.q = q.q.replace(/creator of the Nokia 3310\?/gi, 'creator of the iconic "3310" cellular phone?');
    q.q = q.q.replace(/Which brand released the Nokia 3310\?/gi, 'Which Finnish telecommunications brand released the legendary "3310"?');
    q.q = q.q.replace(/buy a brand new Nokia 3310, which company's/gi, 'buy a legendary classic "3310" mobile phone, which company\'s');
    q.q = q.q.replace(/The Nokia 3310 was designed and released by:/gi, 'The classic "3310" mobile handset was manufactured by:');

    // 2. Gadget type leaks (e.g. "(Smartwatch)", "(Action Camera)")
    q.q = q.q.replace(/\s*\(Smartwatch\)/gi, '');
    q.q = q.q.replace(/\s*\(Action Camera\)/gi, '');
    q.q = q.q.replace(/\s*\(Drone\)/gi, '');
    q.q = q.q.replace(/\s*\(Wireless Earbuds\)/gi, '');
    q.q = q.q.replace(/\s*\(VR Headset\)/gi, '');

    // 3. Web3 ticker leaks
    q.q = q.q.replace(/symbol for Near Protocol\?/gi, 'symbol for the Nightshade-sharded Layer 1 blockchain?');
    q.q = q.q.replace(/symbol for Render Token\?/gi, 'symbol for the decentralized GPU rendering compute network?');
    q.q = q.q.replace(/symbol for Aave\?/gi, 'symbol for the prominent non-custodial liquidity lending protocol?');
    q.q = q.q.replace(/ticker "AAVE"/gi, 'the native liquidity governance token');
    q.q = q.q.replace(/ticker "NEAR"/gi, 'the native Nightshade token');
    q.q = q.q.replace(/ticker "RENDER"/gi, 'the decentralized GPU token');

    // 4. Clinical anemia leak
    q.q = q.q.replace(/deficiency causes iron-deficiency anemia/gi, 'deficiency causes microcytic hypochromic anemia');

    // 5. Pidgin leaks
    // "What is the meaning of the Nigerian Pidgin word 'Wetin'?" -> Answer: "What" (valid question, no change needed)

    if (q.q !== orig) {
      fixed++;
    }
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Scrubbed ${fixed} final leaks across all categories.`);
