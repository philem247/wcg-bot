// One-off: a large batch of 2022-2026 football moments — the era the user
// specifically asked for after flagging the first two batches as too
// old-school. Every fact here was verified live via you.com before writing,
// since several of these (2026 World Cup, 2025 Ballon d'Or, 2024-25 UCL) are
// after this model's training cutoff — nothing here is from memory alone.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

const TRIVIA_FILE = path.join(process.cwd(), 'data', 'trivia.json');
const rawData = JSON.parse(fs.readFileSync(TRIVIA_FILE, 'utf8'));

function qId(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
}

function makeQ(q, correct, wrong, league, template) {
  const cleanCorrect = correct.trim();
  const uniqueWrong = [...new Set(wrong.map((w) => w.trim()))].slice(0, 3);
  if (uniqueWrong.length < 3) throw new Error(`Question "${q}" has fewer than 3 unique wrong answers`);
  return { id: qId(q.trim() + '|' + cleanCorrect), q: q.trim(), correct: cleanCorrect, wrong: uniqueWrong, league, template };
}

const pool = [
  // --- 2026 World Cup (the freshest material there is) ---
  makeQ('Spain won the 2026 World Cup final 1-0 after extra time, denying Argentina back-to-back titles. Which substitute scored the winning goal?',
    'Ferran Torres', ['Nico Williams', 'Lamine Yamal', 'Mikel Oyarzabal'], 'world', 'modern-classics'),
  makeQ('The 2026 World Cup was the first to feature 48 teams and three host nations. Which three countries co-hosted it?',
    'USA, Mexico and Canada', ['USA, Mexico and Brazil', 'USA, Canada and Brazil', 'Mexico, Canada and Qatar'], 'world', 'modern-classics'),
  makeQ('Kylian Mbappé won the adidas Golden Boot at the 2026 World Cup with 10 goals, retaining the award he won in 2022 — making him the first player to do what since the award\'s modern era?',
    'Win the World Cup Golden Boot back-to-back', ['Score in every group match', 'Score a hat-trick in two different World Cups', 'Win Golden Boot and Golden Ball in the same tournament'], 'world', 'modern-classics'),
  makeQ('Rodri\'s selection as the 2026 World Cup Golden Ball winner sparked debate, echoing a similar controversy around another award he won in 2024 over Vinícius Júnior. What was that 2024 award?',
    'Ballon d\'Or', ['FIFA The Best', 'UEFA Men\'s Player of the Year', 'Puskás Award'], 'world', 'modern-classics'),
  makeQ('Cape Verde, playing in their first ever World Cup, pulled off one of the tournament\'s biggest shocks at the 2026 finals by holding which European champions to a 0-0 draw?',
    'Spain', ['France', 'Portugal', 'Italy'], 'world', 'modern-classics'),

  // --- 2022 World Cup aftermath / Ballon d'Or era ---
  makeQ('Kylian Mbappé scored two goals in 97 seconds late in the second half of the 2022 World Cup final to drag France level at 2-2, before completing his hat-trick in extra time. Who did France lose to on penalties?',
    'Argentina', ['Croatia', 'Morocco', 'Brazil'], 'world', 'modern-classics'),
  makeQ('Saudi Arabia produced one of the greatest shocks in World Cup history by beating Argentina 2-1 in the 2022 group stage. Who scored both Saudi Arabia goals?',
    'Salem Al-Dawsari', ['Saleh Al-Shehri', 'Firas Al-Buraikan', 'Hattan Bahebri'], 'world', 'modern-classics'),
  makeQ('Morocco became the first African nation to reach a World Cup semi-final in 2022, eventually finishing 4th. Which European giants did they beat in the quarter-finals?',
    'Portugal', ['Spain', 'France', 'England'], 'world', 'modern-classics'),

  // --- Champions League & European football 2023-2025 ---
  makeQ('Manchester City completed the treble in 2023 by beating Inter Milan 1-0 in the Champions League final in Istanbul. Who scored the only goal?',
    'Rodri', ['Kevin De Bruyne', 'Erling Haaland', 'İlkay Gündoğan'], 'ucl', 'modern-classics'),
  makeQ('Arsenal stunned the defending champions 3-0 away in the first leg of the 2024-25 Champions League quarter-finals, with Declan Rice scoring two free-kicks. Who were the defending champions?',
    'Real Madrid', ['Manchester City', 'Bayern Munich', 'Paris Saint-Germain'], 'ucl', 'modern-classics'),
  makeQ('Paris Saint-Germain finally won their first Champions League title in 2024-25, thrashing Inter Milan 5-0 in the final. Who scored twice in that final?',
    'Désiré Doué', ['Ousmane Dembélé', 'Khvicha Kvaratskhelia', 'Achraf Hakimi'], 'ucl', 'modern-classics'),
  makeQ('Ousmane Dembélé won the 2025 Ballon d\'Or after powering PSG to their first ever Champions League title, beating which Spanish teenager into second place?',
    'Lamine Yamal', ['Pedri', 'Nico Williams', 'Gavi'], 'world', 'modern-classics'),

  // --- Euros & Copa América 2024 ---
  makeQ('Spain beat England 2-1 in the Euro 2024 final in Berlin, with a substitute scoring the winner in the 86th minute. Who scored it?',
    'Mikel Oyarzabal', ['Dani Olmo', 'Nico Williams', 'Álvaro Morata'], 'world', 'modern-classics'),
  makeQ('Argentina won a record 16th Copa América title in 2024, beating Colombia 1-0 in extra time without the injured Lionel Messi finishing the match. Who scored the winning goal?',
    'Lautaro Martínez', ['Julián Álvarez', 'Ángel Di María', 'Rodrigo De Paul'], 'world', 'modern-classics'),

  // --- 2024-25 domestic season ---
  makeQ('Arne Slot led Liverpool to the 2024-25 Premier League title in his very first season in charge, equalling a historic club milestone. How many top-flight titles did it give Liverpool?',
    '20', ['19', '18', '21'], 'pl', 'modern-classics'),

  // --- 2025 Club World Cup (expanded 32-team format) ---
  makeQ('The newly expanded 32-team Club World Cup was held in the USA in the summer of 2025. Which English club won the tournament, beating PSG 3-0 in the final?',
    'Chelsea', ['Manchester City', 'Real Madrid', 'Manchester United'], 'world', 'modern-classics'),
  makeQ('At the 2025 Club World Cup, Brazilian side Botafogo pulled off a huge shock by beating European champions PSG 1-0 in the group stage. Who scored the winning goal?',
    'Igor Jesus', ['Luiz Henrique', 'Thiago Almada', 'Alex Telles'], 'world', 'modern-classics'),

  // --- 2022-24 domestic title shocks & records ---
  makeQ('Napoli won their first Serie A title in 33 years in 2022-23 — their first since the Diego Maradona era. Who was their head coach that season?',
    'Luciano Spalletti', ['Rudi Garcia', 'Gennaro Gattuso', 'Aurelio De Laurentiis'], 'world', 'modern-classics'),
  makeQ('Bayer Leverkusen won the 2023-24 Bundesliga title without losing a single match all season, under which manager in his final campaign at the club?',
    'Xabi Alonso', ['Julian Nagelsmann', 'Edin Terzić', 'Thomas Tuchel'], 'world', 'modern-classics'),
  makeQ('Erling Haaland set a new Premier League single-season scoring record in his debut campaign for Manchester City in 2022-23. How many league goals did he score?',
    '36', ['34', '38', '31'], 'pl', 'modern-classics'),
  makeQ('Luton Town beat Coventry City on penalties in the 2023 Championship play-off final to reach the Premier League for the first time since 1992. What was the penalty shootout score?',
    '6-5', ['5-4', '7-6', '4-3'], 'pl', 'modern-classics'),
  makeQ('Leicester City, Premier League champions in 2016, were relegated from the top flight in 2022-23 — then suffered a second relegation just two seasons after promotion back. In which season were they relegated again?',
    '2024-25', ['2023-24', '2025-26', '2022-23'], 'pl', 'modern-classics'),
  makeQ('Cristiano Ronaldo joined Al-Nassr in January 2023 in a move that triggered a wave of global stars joining the Saudi Pro League. In which season did Ronaldo finally win his first Saudi league title with the club?',
    '2024-25', ['2022-23', '2023-24', '2025-26'], 'world', 'modern-classics'),
  makeQ('Lionel Messi won his first trophy with Inter Miami just seven games into his MLS career, lifting the 2023 Leagues Cup. What was the name of the cross-border competition he won?',
    'Leagues Cup', ['MLS Cup', 'US Open Cup', 'Supporters\' Shield'], 'world', 'modern-classics'),

  // --- Euro 2024 drama beyond the final ---
  makeQ('Jude Bellingham scored a stoppage-time overhead kick to rescue England against Slovakia in the Euro 2024 round of 16, later comparing the moment to a famous Real Madrid teammate\'s trademark goal. Which overhead-kick specialist did he mean?',
    'Cristiano Ronaldo', ['Karim Benzema', 'Gareth Bale', 'Marco Asensio'], 'world', 'modern-classics'),
  makeQ('Georgia reached the knockout stages of a major tournament for the first time in their history by beating which former champions at Euro 2024?',
    'Portugal', ['Germany', 'Czech Republic', 'Turkey'], 'world', 'modern-classics'),

  // --- Real Madrid's 2023-24 Champions League ---
  makeQ('Real Madrid beat Borussia Dortmund 2-0 in the 2024 Champions League final, with Dani Carvajal and which other player scoring?',
    'Vinícius Júnior', ['Jude Bellingham', 'Rodrygo', 'Toni Kroos'], 'ucl', 'modern-classics'),
  makeQ('Carlo Ancelotti became the most successful coach in Real Madrid\'s history after winning the club\'s 15th Champions League title in 2024 — his own fifth as a manager. How many European Cups is that record for any single coach?',
    '5', ['4', '6', '3'], 'ucl', 'modern-classics'),
]

const existingIds = new Set((rawData.categories.football || []).map((q) => q.id))
let added = 0
for (const q of pool) {
  if (!existingIds.has(q.id)) {
    rawData.categories.football.push(q)
    existingIds.add(q.id)
    added++
  }
}

fs.writeFileSync(TRIVIA_FILE, JSON.stringify(rawData, null, 2))
console.log(`Added ${added}/${pool.length} question(s). New football total: ${rawData.categories.football.length}`)
