import fs from 'node:fs';
import path from 'node:path';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

let modifiedCount = 0;

for (const catName of Object.keys(rawData.categories)) {
  for (const q of rawData.categories[catName]) {
    const orig = q.q;

    // 2026 World Cup past tense
    q.q = q.q.replace(/Which three nations are the joint co-hosts of the 2026 FIFA World Cup\?/g, 'Which three nations were the joint co-hosts of the 2026 FIFA World Cup?');
    q.q = q.q.replace(/How many national teams are competing in the expanded 2026 FIFA World Cup/g, 'How many national teams competed in the expanded 2026 FIFA World Cup');
    q.q = q.q.replace(/Which stadium was selected to host the Final of the 2026 FIFA World Cup/g, 'Which stadium hosted the Final of the 2026 FIFA World Cup');
    q.q = q.q.replace(/How many total matches will be played across the entire 2026 FIFA World Cup/g, 'How many total matches were played across the entire 2026 FIFA World Cup');
    q.q = q.q.replace(/Which two Canadian cities are official host cities for the 2026 FIFA World Cup\?/g, 'Which two Canadian cities were official host cities for the 2026 FIFA World Cup?');
    q.q = q.q.replace(/Which three Mexican cities are official host cities for the 2026 FIFA World Cup\?/g, 'Which three Mexican cities were official host cities for the 2026 FIFA World Cup?');
    q.q = q.q.replace(/What is the group stage structure for the 2026 FIFA World Cup\?/g, 'What was the group stage structure for the 2026 FIFA World Cup?');
    q.q = q.q.replace(/On which exact date is the 2026 FIFA World Cup Final scheduled to take place at MetLife Stadium\?/g, 'On which exact date did the 2026 FIFA World Cup Final take place at MetLife Stadium?');
    q.q = q.q.replace(/Which stadium is the venue for the opening match of the 2026 FIFA World Cup on June 11, 2026\?/g, 'Which stadium was the venue for the opening match of the 2026 FIFA World Cup on June 11, 2026?');
    q.q = q.q.replace(/Which two US stadiums were selected to host the semi-finals of the 2026 FIFA World Cup\?/g, 'Which two US stadiums hosted the semi-finals of the 2026 FIFA World Cup?');
    q.q = q.q.replace(/Which Florida stadium was chosen to host the Bronze Medal \(third-place playoff\) match of the 2026 FIFA World Cup\?/g, 'Which Florida stadium hosted the Bronze Medal (third-place playoff) match of the 2026 FIFA World Cup?');
    q.q = q.q.replace(/In the 2026 FIFA World Cup 48-team format, how many third-placed group stage teams advance to the Round of 32\?/g, 'In the 2026 FIFA World Cup 48-team format, how many third-placed group stage teams advanced to the Round of 32?');
    q.q = q.q.replace(/What is the total number of host cities across USA, Canada, and Mexico for the 2026 FIFA World Cup\?/g, 'What was the total number of host cities across USA, Canada, and Mexico for the 2026 FIFA World Cup?');
    q.q = q.q.replace(/Which confederation was guaranteed an automatic direct World Cup spot for the first time in history for the 2026 tournament\?/g, 'Which confederation was guaranteed an automatic direct World Cup spot for the first time in history at the 2026 tournament?');

    // 2025/2026 European Club Finals & AFCON
    q.q = q.q.replace(/Which venue was chosen to host the 2026 UEFA Champions League Final in May 2026\?/g, 'Which venue hosted the 2026 UEFA Champions League Final in May 2026?');
    q.q = q.q.replace(/Which stadium in Budapest, Hungary was selected by UEFA to host the 2026 UEFA Champions League Final in May 2026\?/g, 'Which stadium in Budapest, Hungary hosted the 2026 UEFA Champions League Final in May 2026?');
    q.q = q.q.replace(/Which Turkish stadium in Istanbul was selected to host the 2026 UEFA Europa League Final in May 2026\?/g, 'Which Turkish stadium in Istanbul hosted the 2026 UEFA Europa League Final in May 2026?');
    q.q = q.q.replace(/Which German stadium in Leipzig was chosen to host the 2026 UEFA Conference League Final in May 2026\?/g, 'Which German stadium in Leipzig hosted the 2026 UEFA Conference League Final in May 2026?');
    q.q = q.q.replace(/In which North African nation is the 2025\/2026 Africa Cup of Nations \(AFCON\) held across 6 host cities\?/g, 'In which North African nation was the 2025/2026 Africa Cup of Nations (AFCON) held across 6 host cities?');
    q.q = q.q.replace(/Which Moroccan cities are official host cities for AFCON 2025\/2026\?/g, 'Which Moroccan cities were official host cities for AFCON 2025/2026?');
    q.q = q.q.replace(/Which modernized stadium in Rabat is the centerpiece venue for the AFCON 2025\/2026 Final\?/g, 'Which modernized stadium in Rabat was the centerpiece venue for the AFCON 2025/2026 Final?');
    q.q = q.q.replace(/Which North African country is the host nation for the 35th edition of the Africa Cup of Nations \(AFCON 2025\/2026\)\?/g, 'Which North African country was the host nation for the 35th edition of the Africa Cup of Nations (AFCON 2025/2026)?');
    q.q = q.q.replace(/Which stadium in the United States was chosen to host the Final of the inaugural 32-team 2025 FIFA Club World Cup in July 2025\?/g, 'Which stadium in the United States hosted the Final of the inaugural 32-team 2025 FIFA Club World Cup in July 2025?');

    if (q.q !== orig) {
      modifiedCount++;
      console.log(`Updated to past tense:\n  Before: ${orig}\n  After:  ${q.q}\n`);
    }
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Successfully audited and updated ${modifiedCount} questions to past tense!`);
