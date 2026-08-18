import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

let count = 0;

for (const [catName, qs] of Object.entries(rawData.categories)) {
  for (const q of qs) {
    const orig = q.q;

    // GoPro Hero
    q.q = q.q.replace(/manufacturer of the "GoPro Hero"\?/gi, 'action camera company that manufactures the "Hero" series?');
    q.q = q.q.replace(/gadget known as GoPro Hero is made by which/gi, 'waterproof mountable action camera "Hero" series is made by which');
    q.q = q.q.replace(/creator of the GoPro Hero\?/gi, 'company that created the "Hero" line of mountable action cameras?');
    q.q = q.q.replace(/brand released the GoPro Hero\?/gi, 'brand created the "Hero" line of rugged action cameras?');
    q.q = q.q.replace(/buy a brand new GoPro Hero, which/gi, 'buy a brand new "Hero" mountable action camera, which');
    q.q = q.q.replace(/The GoPro Hero was designed and/gi, 'The "Hero" mountable action camera line was designed and');

    // Naruto Titles
    q.q = q.q.replace(/Which prestigious title did Third Kazekage \(Unnamed\) hold\?/gi, 'Which Hidden Sand leadership title was held by the master of Iron Sand?');
    q.q = q.q.replace(/Third Kazekage \(Unnamed\) is famously known by which Kage title\?/gi, 'The master of Iron Sand in Sunagakure held which historic title?');
    q.q = q.q.replace(/Which prestigious title did Third Mizukage \(Unnamed\) hold\?/gi, 'Which Hidden Mist leadership title was held by the predecessor of Yagura?');
    q.q = q.q.replace(/Third Mizukage \(Unnamed\) is famously known by which Kage title\?/gi, 'The predecessor of Yagura in Kirigakure held which historic title?');

    // Naruto Jutsu Natures
    q.q = q.q.replace(/chakra nature type of the Wood Dragon\?/gi, 'kekkei genkai nature type of Hashirama Senju\'s Dragon technique?');
    q.q = q.q.replace(/The jutsu "Wood Dragon" relies on which/gi, 'Hashirama Senju\'s Dragon technique relies on which');
    q.q = q.q.replace(/chakra nature type of the Water Prison\?/gi, 'elemental chakra type of the classic spherical Prison trap technique?');
    q.q = q.q.replace(/The jutsu "Water Prison" relies on which/gi, 'Zabuza\'s spherical Prison trap technique relies on which');

    // Naruto Pain Arc
    q.q = q.q.replace(/threat during the "Pain's Assault Arc"\?/gi, 'threat during the devastating Hidden Leaf Village Invasion arc?');
    q.q = q.q.replace(/The "Pain's Assault Arc" famously heavily/gi, 'The Village Invasion arc famously heavily');

    // Nigerian Food Country wording
    q.q = q.q.replace(/Which region of Nigeria is most famously associated with the dish/gi, 'Which West African nation is renowned globally for the traditional staple');

    if (q.q !== orig) {
      count++;
    }
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Cleaned ${count} nuanced leaks across the database.`);
