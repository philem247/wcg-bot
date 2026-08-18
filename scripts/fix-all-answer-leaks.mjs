import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

let fixedCount = 0;

for (const [catName, qs] of Object.entries(rawData.categories)) {
  for (const q of qs) {
    const orig = q.q;
    const cleanC = q.correct.trim();

    // 1. Host country in parentheses for tournament winners
    // e.g. "Which country won the 2019 (Brazil) Copa América?" -> "Which country won the 2019 Copa América?"
    q.q = q.q.replace(/\((\w+)\)\s*(Copa América|AFCON|World Cup|European Championship|Asian Cup)/gi, '$2');
    q.q = q.q.replace(/\((\w+)\s*-\s*Inaugural\)\s*(Copa América|AFCON|World Cup)/gi, '$2 (Inaugural edition)');

    // 2. Specific tech definition leaks
    q.q = q.q.replace(/led by the Angular Team at Google/gi, 'led by a dedicated team at Google');
    q.q = q.q.replace(/based on the Linux kernel/gi, 'based on a famous open-source monolithic kernel created in 1991');
    q.q = q.q.replace(/founding organization of Google Cloud/gi, 'founding organization of GCP (Global Cloud Platform)');
    q.q = q.q.replace(/orbits the atomic nucleus in electron shells/gi, 'orbits the atomic nucleus in outer shells');
    q.q = q.q.replace(/led by the React team at Meta/gi, 'led by an open-source UI team at Meta');
    q.q = q.q.replace(/created for Python development/gi, 'created for dynamic scripting development');
    q.q = q.q.replace(/created for Ruby development/gi, 'created for dynamic object-oriented development');
    q.q = q.q.replace(/by the Rust Foundation/gi, 'by a prominent systems programming foundation');

    // 3. Gaming & Cartoons title leaks
    q.q = q.q.replace(/in the cartoon "SpongeBob SquarePants"/gi, 'in an iconic underwater Nickelodeon cartoon');
    q.q = q.q.replace(/does "South Park" primarily take place/gi, 'does the animated comedy created by Trey Parker and Matt Stone take place');
    q.q = q.q.replace(/setting for the cartoon "South Park"/gi, 'setting for the iconic Comedy Central cartoon featuring Cartman and Stan');
    q.q = q.q.replace(/protagonist of "Super Mario Bros\."/gi, 'mushroom-eating Italian plumber protagonist in Nintendo\'s flagship platformer');
    q.q = q.q.replace(/protagonist of "Sonic the Hedgehog"/gi, 'blue speedster hedgehog protagonist in Sega\'s flagship franchise');
    q.q = q.q.replace(/original "God of War \(2018\)"/gi, 'Norse-reboot "God of War"');
    q.q = q.q.replace(/in Bendy and the ink machine/gi, 'in the horror game "The Ink Machine"');
    q.q = q.q.replace(/company in Lethal Company/gi, 'mysterious organization in the co-op indie horror game');

    // 4. General & Geography leaks
    q.q = q.q.replace(/among Luxembourg, Liechtenstein, Laos and Liberia/gi, 'among the nations of Western Europe, Southeast Asia, and West Africa');
    q.q = q.q.replace(/Which continent is South Africa located in/gi, 'In which continent is the nation of South Africa situated');

    // 5. Universal generic checks
    // If the entire correct answer is literally inside the question, rephrase or mask it
    if (cleanC.length > 3) {
      const escaped = cleanC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(q.q)) {
        // If question is "What is the capital of Luxembourg?" -> "What is the capital city of the Grand Duchy of Luxembourg?"
        // Check specific patterns
        if (q.q.includes(`"${cleanC}"`)) {
          q.q = q.q.replace(new RegExp(`"${escaped}"`, 'i'), 'this subject');
        } else if (q.q.toLowerCase().includes(`of ${cleanC.toLowerCase()}?`)) {
          // e.g. "Who is the protagonist of Naruto?" -> "Who is the title protagonist of the Hidden Leaf Village anime?"
          q.q = q.q.replace(new RegExp(`of ${escaped}\\?`, 'i'), 'of this acclaimed franchise?');
        }
      }
    }

    if (q.q !== orig) {
      fixedCount++;
    }
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Successfully audited and fixed ${fixedCount} questions to eliminate answer leaks!`);
