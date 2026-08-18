import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

let count = 0;

for (const [catName, qs] of Object.entries(rawData.categories)) {
  for (const q of qs) {
    const orig = q.q;

    // Raspberry Pi Foundation
    q.q = q.q.replace(/Raspberry Pi Foundation is famous for releasing which/gi, 'A famous UK educational charity created which single-board computer');
    q.q = q.q.replace(/product of Raspberry Pi Foundation/gi, 'product of the UK single-board computer foundation');
    q.q = q.q.replace(/fan of Raspberry Pi Foundation/gi, 'fan of DIY microcomputing');
    q.q = q.q.replace(/device from Raspberry Pi Foundation/gi, 'device from the Cambridge-based microcomputing foundation');
    q.q = q.q.replace(/market by Raspberry Pi Foundation/gi, 'market by the UK educational computing foundation');

    // Fitbit
    q.q = q.q.replace(/Fitbit is famous for releasing which/gi, 'Which pioneer in health wearables created the following device');
    q.q = q.q.replace(/fan of Fitbit, you might/gi, 'fan of dedicated step and sleep wristbands, you might');
    q.q = q.q.replace(/device from Fitbit is the/gi, 'device from the wearable health company is the');
    q.q = q.q.replace(/market by Fitbit\?/gi, 'market by the wearable fitness tracking pioneer?');

    // GoPro Hero Action Camera
    q.q = q.q.replace(/Hero Action Camera/gi, 'GoPro Hero');

    // Self-titled albums / songs
    q.q = q.q.replace(/on which album by Rema\?/gi, 'on which 2019 breakout debut EP?');
    q.q = q.q.replace(/Rema included the track "Dumebi" in which of their albums\?/gi, 'Which 2019 debut EP featured the breakout hit "Dumebi"?');
    q.q = q.q.replace(/on which album by Tyla\?/gi, 'on which 2024 self-titled debut album?');
    q.q = q.q.replace(/Tyla included the track "Water" in which of their albums\?/gi, 'Which 2024 debut studio album features the Grammy-winning hit "Water"?');
    q.q = q.q.replace(/on which album by Kizz Daniel\?/gi, 'on which 2022 project?');
    q.q = q.q.replace(/Kizz Daniel included the track "Buga \(Lo Lo Lo\)"/gi, 'Kizz Daniel released the hit "Buga (Lo Lo Lo)"');

    // Naruto Might clan
    q.q = q.q.replace(/Which prominent clan does Might belong to\?/gi, 'Which family lineage do Guy and Duy belong to?');
    q.q = q.q.replace(/Might is a famous member of which ninja clan\?/gi, 'Master Guy is a prominent member of which family?');

    // Souls series
    q.q = q.q.replace(/collect souls to empower you/gi, 'collect lost essence to level up and purchase equipment in Lordran');

    // Google Cloud
    q.q = q.q.replace(/behind the creation of Google Cloud\?/gi, 'behind the creation of GCP (Global Cloud Platform)?');

    if (q.q !== orig) {
      count++;
    }
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Polished ${count} edge-case leaks across database.`);
