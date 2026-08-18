import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

function qId(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
}

function makeQ(q, correct, wrong, template = 'curated-2026') {
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

const additions = {};
for (const cat of Object.keys(rawData.categories)) {
  additions[cat] = [];
}

// =========================================================================
// 1. FOOTBALL (2024–2026 EXPANSION)
// =========================================================================
const football2026 = [
  ['Who won the 2024 Men\'s Ballon d\'Or in Paris, becoming the first defensive midfielder to win since 1990 after winning Euro 2024 and the Premier League?', 'Rodri (Rodrigo Hernández)', ['Vinícius Júnior', 'Jude Bellingham', 'Dani Carvajal']],
  ['Who won the 2024 Women\'s Ballon d\'Or, capturing her second consecutive award for Barcelona and Spain?', 'Aitana Bonmatí', ['Alexia Putellas', 'Salma Paralluelo', 'Caroline Graham Hansen']],
  ['Who won the 2024 Kopa Trophy as the best under-21 player in the world after starring at Euro 2024 for Spain?', 'Lamine Yamal', ['Arda Güler', 'Kobbie Mainoo', 'Savinho']],
  ['Which stadium hosted the 2025 UEFA Champions League Final in Munich, Germany?', 'Allianz Arena (Fußball Arena München)', ['Wembley Stadium', 'Puskás Aréna', 'Stade de France']],
  ['Which stadium hosted the 2026 UEFA Champions League Final in Budapest, Hungary?', 'Puskás Aréna', ['Allianz Arena', 'San Mamés', 'Wrocław Stadium']],
  ['Which stadium hosted the 2025 UEFA Europa League Final in Bilbao, Spain?', 'San Mamés Stadium', ['Puskás Aréna', 'Aviva Stadium', 'Beşiktaş Stadium']],
  ['Which stadium hosted the 2026 UEFA Europa League Final in Istanbul, Turkey?', 'Tüpraş Stadium (Beşiktaş Stadium)', ['San Mamés', 'Puskás Aréna', 'Wrocław Stadium']],
  ['Which stadium in Wrocław, Poland hosted the 2025 UEFA Conference League Final?', 'Wrocław Stadium (Tarczyński Arena)', ['Red Bull Arena Leipzig', 'Agia Sophia Stadium', 'Eden Arena']],
  ['Which stadium in Leipzig, Germany hosted the 2026 UEFA Conference League Final?', 'Red Bull Arena (Leipzig)', ['Wrocław Stadium', 'San Mamés', 'Stadio Olimpico']],
  ['Which country won the Men\'s Olympic Football Gold Medal at the Paris 2024 Olympic Games, defeating France 5-3 after extra time in the final at Parc des Princes?', 'Spain', ['France', 'Morocco', 'Egypt']],
  ['Which country won the Women\'s Olympic Football Gold Medal at the Paris 2024 Games under coach Emma Hayes, defeating Brazil 1-0 in the final?', 'United States (USWNT)', ['Brazil', 'Germany', 'Spain']],
  ['Which stadium hosted the historic opening match of the 48-team 2026 FIFA World Cup on June 11, 2026?', 'Estadio Azteca (Mexico City)', ['MetLife Stadium', 'SoFi Stadium', 'AT&T Stadium']],
  ['Which stadium hosted the 2026 FIFA World Cup Final on July 19, 2026 in East Rutherford, New Jersey?', 'MetLife Stadium (New York / New Jersey)', ['Estadio Azteca', 'SoFi Stadium', 'Mercedes-Benz Stadium']],
  ['Which 32-team global club tournament was hosted across 12 modern stadiums in the United States in June-July 2025?', '2025 FIFA Club World Cup', ['International Champions Cup', 'CONCACAF Champions Cup', 'Leagues Cup']],
  ['Which German manager was appointed in October 2024 to take charge of the England Men\'s National Football Team starting in January 2025?', 'Thomas Tuchel', ['Gareth Southgate', 'Lee Carsley', 'Eddie Howe']],
  ['Which Portuguese manager left Sporting CP in November 2024 to become the head coach of Manchester United?', 'Rúben Amorim', ['Erik ten Hag', 'Ruud van Nistelrooy', 'Sérgio Conceição']],
  ['Which Dutch manager took over as Liverpool head coach in summer 2024 succeeding Jürgen Klopp?', 'Arne Slot', ['Xabi Alonso', 'Julian Nagelsmann', 'Roberto De Zerbi']],
  ['Which German manager took over as FC Barcelona manager in summer 2024 succeeding Xavi Hernández?', 'Hansi Flick', ['Rúben Amorim', 'Thomas Tuchel', 'Mauricio Pochettino']],
  ['Which Belgian former Manchester City captain took over as Bayern Munich manager in summer 2024?', 'Vincent Kompany', ['Thomas Tuchel', 'Hansi Flick', 'Julian Nagelsmann']],
  ['Which Italian manager led Leicester City to the Championship title before being appointed Chelsea manager in summer 2024?', 'Enzo Maresca', ['Mauricio Pochettino', 'Roberto De Zerbi', 'Kieran McKenna']]
];

for (const [q, c, w] of football2026) {
  additions['football'].push(makeQ(q, c, w));
}

// =========================================================================
// 2. FPL (2024–2026 RULES & HIGHLIGHTS)
// =========================================================================
const fpl2026 = [
  ['In the 2024/25 Fantasy Premier League season, how many free transfers could managers save and roll over at any one time (increased from the previous cap of 2)?', 'Up to 5 Free Transfers', ['Up to 3 Free Transfers', 'Up to 2 Free Transfers', 'Unlimited Free Transfers']],
  ['In the 2024/25 FPL season, what happened to saved free transfers when a manager activated a Wildcard or Free Hit chip?', 'Saved free transfers were retained and not wiped out', ['All saved transfers were reset to zero', 'Free transfers were permanently deleted for the rest of the season', 'Managers were penalized 8 points']],
  ['Which Manchester City superstar was priced at a record-breaking £15.0m at the launch of the 2024/25 FPL season, the highest initial price in FPL history?', 'Erling Haaland', ['Mohamed Salah', 'Kevin De Bruyne', 'Bukayo Saka']],
  ['Which Chelsea playmaker broke out as a fantasy sensation in 2023/24, starting the season at £5.0m and rising into premium pricing for 2024/25 after scoring 22 goals and 11 assists?', 'Cole Palmer', ['Christopher Nkunku', 'Nicolas Jackson', 'Noni Madueke']],
  ['Which Arsenal defender was the highest-scoring defender in the 2023/24 FPL season with 180 points, helping Arsenal keep 18 clean sheets?', 'Ben White', ['William Saliba', 'Gabriel Magalhães', 'Trent Alexander-Arnold']]
];

for (const [q, c, w] of fpl2026) {
  additions['fpl'].push(makeQ(q, c, w));
}

// =========================================================================
// 3. SPORTS (2024–2026 OLYMPICS, TENNIS, F1, COMBAT)
// =========================================================================
const sports2026 = [
  ['Which French swimming prodigy won four individual Olympic Gold Medals with four Olympic records at the Paris 2024 Games (200m breaststroke, 200m butterfly, 200m IM, 400m IM)?', 'Léon Marchand', ['Caeleb Dressel', 'Adam Peaty', 'Michael Phelps']],
  ['Which Chinese swimmer smashed the men\'s 100m freestyle world record with an astonishing time of 46.40 seconds at the Paris 2024 Olympics?', 'Pan Zhanle', ['Kyle Chalmers', 'David Popovici', 'Sun Yang']],
  ['Which American gymnast became the most decorated US gymnast in Olympic history by winning three golds at Paris 2024 (Team, All-Around, Vault), bringing her Olympic total to 11 medals?', 'Simone Biles', ['Sunisa Lee', 'Jordan Chiles', 'Aly Raisman']],
  ['Which American swimming legend won her 9th Olympic Gold Medal in Paris 2024 in the 800m freestyle, tying the record for the most Olympic gold medals by any female athlete in history?', 'Katie Ledecky', ['Regan Smith', 'Torri Huske', 'Gretchen Walsh']],
  ['Which Formula 1 team won the 2024 FIA Formula 1 World Constructors\' Championship, driven by Lando Norris and Oscar Piastri?', 'McLaren Formula 1 Team', ['Red Bull Racing', 'Scuderia Ferrari', 'Mercedes-AMG']],
  ['Which legendary Formula 1 car designer announced in September 2024 that he would leave Red Bull Racing to join Aston Martin Aramco starting in March 2025?', 'Adrian Newey', ['James Allison', 'Pierre Waché', 'Mattia Binotto']],
  ['Which Georgian-Spanish MMA fighter knocked out Alexander Volkanovski at UFC 298 in 2024 to become the undisputed UFC Featherweight Champion, and later knocked out Max Holloway at UFC 308?', 'Ilia Topuria', ['Brian Ortega', 'Yair Rodríguez', 'Movsar Evloev']],
  ['Which Brazilian knockout artist defended his UFC Light Heavyweight title three times within 175 days in 2024 against Jamahal Hill, Jiří Procházka, and Khalil Rountree Jr.?', 'Alex Pereira ("Poatan")', ['Magomed Ankalaev', 'Jan Błachowicz', 'Israel Adesanya']],
  ['Which Russian UFC lightweight champion defended his title against Dustin Poirier at UFC 302 in 2024 to extend his winning streak to 14 consecutive fights?', 'Islam Makhachev', ['Arman Tsarukyan', 'Charles Oliveira', 'Justin Gaethje']],
  ['Who won both the 2024 Australian Open and the 2024 US Open men\'s singles titles, finishing 2024 as the ATP World No. 1?', 'Jannik Sinner', ['Carlos Alcaraz', 'Novak Djokovic', 'Alexander Zverev']]
];

for (const [q, c, w] of sports2026) {
  additions['sports'].push(makeQ(q, c, w));
}

// =========================================================================
// 4. TECH & TECH-GADGETS (2024–2026 AI, HARDWARE, GPUS)
// =========================================================================
const tech2026 = [
  ['Which flagship artificial intelligence reasoning model series was introduced by OpenAI in late 2024, capable of multi-step chain-of-thought internal reasoning for complex STEM and coding problems?', 'OpenAI o1 / o3 series', ['GPT-2', 'DALL-E 1', 'Whisper']],
  ['Which next-generation AI GPU architecture was unveiled by Nvidia CEO Jensen Huang in 2024, featuring 208 billion transistors on the GB200 NVL72 superchip?', 'Nvidia Blackwell Architecture (B200 / GB200)', ['Nvidia Hopper (H100)', 'Nvidia Ampere (A100)', 'Nvidia Volta (V100)']],
  ['Which open-weights reasoning model developed in China made waves globally in early 2025 by delivering frontier reasoning performance comparable to OpenAI o1 at vastly lower training compute costs?', 'DeepSeek-R1 (DeepSeek-V3)', ['Qwen', 'Yi-34B', 'ChatGLM']],
  ['Which Anthropic AI model released in October 2024 and early 2025 introduced breakthrough "Computer Use" capabilities, allowing the AI to look at a desktop screen, move the cursor, and click buttons?', 'Claude 3.5 Sonnet / Claude 3.7 Sonnet', ['Claude 1.0', 'Claude Instant', 'Claude 2.0']],
  ['Which Google multimodal foundation model family introduced in 2024 and 2025 pioneered a 2-million-token context window for processing hours of video, audio, and massive codebases?', 'Gemini 1.5 Pro & Gemini 2.0', ['Bard 1.0', 'PaLM 1', 'BERT']]
];

for (const [q, c, w] of tech2026) {
  additions['tech'].push(makeQ(q, c, w));
}

const gadgets2026 = [
  ['Which revolutionary spatial computing mixed reality headset was officially launched in retail stores by Apple in February 2024, powered by the M2 and R1 chips?', 'Apple Vision Pro', ['Meta Quest 2', 'PlayStation VR', 'HTC Vive Cosmos']],
  ['Which dedicated physical button was introduced on all iPhone 16 and iPhone 16 Pro models in late 2024 to enable instant camera launching, focus zooming, and exposure control?', 'Camera Control Button', ['Action Button', 'Home Button', 'Bixby Button']],
  ['Which upgraded mid-generation gaming console was launched by Sony in November 2024, featuring a 67% larger GPU, advanced ray tracing, and PlayStation Spectral Super Resolution (PSSR) AI upscaling?', 'PlayStation 5 Pro (PS5 Pro)', ['PlayStation 4 Pro', 'Xbox Series S', 'Nintendo Switch OLED']],
  ['Which affordable mixed reality headset was launched by Meta in October 2024 alongside the Meta Ray-Ban smart glasses AI update?', 'Meta Quest 3S', ['Oculus Rift S', 'Oculus Go', 'Google Cardboard']]
];

for (const [q, c, w] of gadgets2026) {
  additions['tech-gadgets'].push(makeQ(q, c, w));
}

// =========================================================================
// 5. WEB3 & CRYPTO (2024–2026 HISTORIC MILESTONES)
// =========================================================================
const web32026 = [
  ['In January 2024, which regulatory agency approved the first historic spot Bitcoin exchange-traded funds (ETFs) in the United States?', 'US SEC (Securities and Exchange Commission)', ['CFTC', 'Federal Reserve', 'FinCEN']],
  ['On April 20, 2024, at Block 840,000, what major Bitcoin network event reduced the miner block subsidy from 6.25 BTC to 3.125 BTC per block?', 'The Fourth Bitcoin Halving', ['The Merge', 'The London Hard Fork', 'The Genesis Block']],
  ['In July 2024, the US SEC approved spot exchange-traded funds for which major smart contract cryptocurrency platform?', 'Ethereum (Spot ETH ETFs)', ['Cardano', 'Solana', 'Ripple']],
  ['In late 2024 and 2025, Bitcoin crossed which historic psychological milestone price for the first time in history?', '$100,000 per Bitcoin', ['$10,000', '$25,000', '$50,000']]
];

for (const [q, c, w] of web32026) {
  additions['web3'].push(makeQ(q, c, w));
}

// =========================================================================
// 6. MUSIC (2024–2026 BILLBOARD SMASHES)
// =========================================================================
const music2026 = [
  ['Which double album containing 31 tracks was released by Taylor Swift in April 2024, selling 2.6 million units in its first week and topping the Billboard 200 with lead single "Fortnight"?', 'The Tortured Poets Department', ['Midnights', '1989 (Taylor\'s Version)', 'Lover']],
  ['Which 2024 country album by Beyoncé made her the first Black woman in history to top the Billboard Hot Country Songs chart with the smash single "Texas Hold \'Em"?', 'Cowboy Carter (Act II)', ['Renaissance (Act I)', 'Lemonade', 'Dangerously in Love']],
  ['Which historic 2024 West Coast hip hop diss track produced by Mustard debuted at #1 on the Billboard Hot 100 and broke the record for the most single-day Spotify streams for a rap song?', 'Not Like Us (by Kendrick Lamar)', ['HUMBLE.', 'Alright', 'King Kunta']],
  ['Which pop superstar released the chart-dominating 2024 summer hits "Espresso" and "Please Please Please" from her blockbuster album "Short n\' Sweet"?', 'Sabrina Carpenter', ['Olivia Rodrigo', 'Chappell Roan', 'Camila Cabello']],
  ['Which breakout pop artist released the critically acclaimed 2024 hit "Good Luck, Babe!" and the album "The Rise and Fall of a Midwest Princess"?', 'Chappell Roan', ['Sabrina Carpenter', 'Gracie Abrams', 'Raye']],
  ['Which British pop singer and producer sparked the global cultural phenomenon "Brat Summer" with her critically acclaimed 2024 album "Brat" featuring tracks "360" and "Apple"?', 'Charli xcx', ['Dua Lipa', 'Rina Sawayama', 'FKA twigs']],
  ['Which 2024 collaborative pop ballad duet by Lady Gaga and Bruno Mars spent weeks at the top of the global Spotify and Billboard charts with the chorus "If the world was ending, I\'d wanna be next to you"?', 'Die with a Smile', ['Rain on Me', 'Shallow', 'Uptown Funk']],
  ['Which viral 2024 cross-cultural pop smash by BLACKPINK\'s ROSÉ and Bruno Mars was inspired by a popular Korean drinking game?', 'APT. (Apartment)', ['On the Ground', 'Pink Venom', 'Gone']],
  ['Who headlined the Super Bowl LIX Halftime Show in New Orleans in February 2025, having previously won the Pulitzer Prize for Music?', 'Kendrick Lamar', ['Usher', 'Rihanna', 'Drake']]
];

for (const [q, c, w] of music2026) {
  additions['music'].push(makeQ(q, c, w));
}

// =========================================================================
// 7. NIGERIAN ENTERTAINMENT & MUSIC (2024–2026 RECORDS)
// =========================================================================
const naija2026 = [
  ['Which Nollywood comedy drama directed by Funke Akindele made history in January 2024 as the very first Nollywood film to surpass ₦1 Billion at the Nigerian box office?', 'A Tribe Called Judah', ['Battle on Buka Street', 'Omo Ghetto: The Saga', 'King of Thieves']],
  ['Which 2024 epic fantasy Nollywood series created by Kunle Afolayan was released on Netflix as a sequel to the hit film about the mystical bird of resurrection?', 'Aníkúlápó: Rise of the Spectre', ['Jagun Jagun', 'The Black Book', 'Ijogbon']],
  ['Which Funke Akindele box office blockbuster was released in cinemas in December 2024, continuing the beloved comedic saga of Jenifa?', 'Everybody Loves Jenifa', ['A Tribe Called Judah', 'Battle on Buka Street', 'Omo Ghetto']],
  ['Who won the ₦100 Million grand prize of Big Brother Naija Season 9 ("No Loose Guard") in October 2024 alongside his wife Kassia as the "Double Kay" pair?', 'Kellyrae (Kellyrae & Kassia)', ['Wanni x Handi', 'Nelita', 'Abeta']],
  ['Which 2024 studio album by Asake featured international collaborations including "Active" with Travis Scott and "MMS" with Wizkid?', 'Lungu Boy', ['Work of Art', 'Mr. Money with the Vibe', 'Ololade Asake']],
  ['Which 2024 studio album was released by Rema featuring energetic bangers like "Benin Boys" with Shallipopi and "Ozeba"?', 'HEIS', ['Rave & Roses', 'Rema EP', 'Bad Commando']],
  ['Which Grammy-winning Nigerian artist released her debut studio album "Born in the Wild" in June 2024 featuring the lead single "Love Me JeJe"?', 'Tems', ['Ayra Starr', 'Tiwa Savage', 'Simi']],
  ['Which Nigerian singer released her acclaimed sophomore album "The Year I Turned 21" in 2024 featuring hits "Commas", "Santa", and "Bad Vibes"?', 'Ayra Starr', ['Tems', 'Tiwa Savage', 'Yemi Alade']],
  ['Which highly anticipated late-2024 album was released by Wizkid in heartfelt tribute to his late mother Morayo, featuring "Piece of My Heart"?', 'Morayo', ['Made in Lagos', 'More Love, Less Ego', 'Soundman Vol. 2']]
];

for (const [q, c, w] of naija2026) {
  additions['nigerian-entertainment'].push(makeQ(q, c, w));
}

// Merge all 2026 additions
let totalAdded = 0;
for (const [catName, qs] of Object.entries(additions)) {
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
  totalAdded += catAdded;
  console.log(`Category "${catName}": Added ${catAdded} 2026 questions. Total now: ${rawData.categories[catName].length}`);
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2));
console.log(`Successfully merged all 2024-2026 additions! Grand total added: ${totalAdded}`);
