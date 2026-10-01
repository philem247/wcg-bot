// One-off: a batch of "historic moment with an unexpected twist" questions —
// underdog shocks, controversies, and oddities, not the overused UCL-hat-trick
// angle the bank already leans on heavily. Every fact here was either already
// well-established or verified live via you.com before writing (see session
// notes) — scorers, scorelines, and context cross-checked against Wikipedia-
// sourced snippets, not written from memory alone.
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
  // --- World Cup upsets & controversies ---
  makeQ('In the 1950 World Cup final at the Maracanã, which Uruguayan winger scored the decisive goal to stun a 200,000-strong crowd expecting a Brazilian coronation — a result still called the "Maracanazo"?',
    'Alcides Ghiggia', ['Juan Schiaffino', 'Óscar Míguez', 'Julio Pérez'], 'world', 'wc-classics'),
  makeQ('Who scored the only goal as the USA beat England 1-0 at the 1950 World Cup, a result nicknamed the "Miracle on Grass"?',
    'Joe Gaetjens', ['Walter Bahr', 'Frank Wallace', 'Ed McIlvenny'], 'world', 'wc-classics'),
  makeQ('In the 1954 World Cup final, West Germany came back from 2-0 down to beat the heavily favoured Hungary — who had thrashed them 8-3 earlier in the tournament — winning 3-2 with a late winner. Who scored it?',
    'Helmut Rahn', ['Max Morlock', 'Fritz Walter', 'Ottmar Walter'], 'world', 'wc-classics'),
  makeQ('At the 1982 World Cup, West Germany beat Austria 1-0 in a match both sides seemed content to see finish that way, since it eliminated Algeria — a game remembered as the "Disgrace of Gijón". Who scored the only goal?',
    'Horst Hrubesch', ['Karl-Heinz Rummenigge', 'Pierre Littbarski', 'Klaus Fischer'], 'world', 'wc-classics'),
  makeQ('Cameroon stunned the reigning champions 1-0 in the opening match of the 1990 World Cup, despite having two players sent off. Which defending champions did they beat?',
    'Argentina', ['Brazil', 'Italy', 'West Germany'], 'world', 'wc-classics'),
  makeQ('North Korea produced one of football\'s great shocks at the 1966 World Cup by beating which former world champions 1-0 to reach the quarterfinals?',
    'Italy', ['Brazil', 'Uruguay', 'England'], 'world', 'wc-classics'),
  makeQ('Senegal, playing in their first ever World Cup, beat the defending champions 1-0 in the opening match of the 2002 tournament. Who did they beat?',
    'France', ['Brazil', 'Italy', 'Argentina'], 'world', 'wc-classics'),
  makeQ('At the 2018 World Cup, South Korea eliminated the defending champions from the group stage with a shock 2-0 win in the final group match. Who did they beat?',
    'Germany', ['Spain', 'Argentina', 'Portugal'], 'world', 'wc-classics'),
  makeQ('Pelé became the youngest player to score in a World Cup final at just 17, netting twice as Brazil beat the hosts 5-2 in the 1958 final. Which country did they beat?',
    'Sweden', ['Switzerland', 'France', 'West Germany'], 'world', 'wc-classics'),
  makeQ('England\'s controversial third goal in the 1966 World Cup final — whether the ball crossed the line — was awarded after the linesman, Tofiq Bakhramov, consulted with the referee. Who scored it?',
    'Geoff Hurst', ['Bobby Charlton', 'Martin Peters', 'Roger Hunt'], 'world', 'wc-classics'),

  // --- Euros ---
  makeQ('Denmark won UEFA Euro 1992 despite not originally qualifying for the tournament — they were called up as a late replacement just ten days before it started. Which country did they replace, disqualified due to civil war?',
    'Yugoslavia', ['Soviet Union', 'Czechoslovakia', 'East Germany'], 'world', 'euro-classics'),
  makeQ('Greece won UEFA Euro 2004 as outsiders at odds of roughly 150-1, beating the hosts 1-0 in the final. Which country did they beat?',
    'Portugal', ['Spain', 'France', 'Germany'], 'world', 'euro-classics'),

  // --- European Cup / Champions League drama beyond the usual hat-trick angle ---
  makeQ('In the 1984 European Cup final, Liverpool beat Roma on penalties after a 1-1 draw, with their goalkeeper wobbling his legs to put off Roma\'s takers. Who was that goalkeeper?',
    'Bruce Grobbelaar', ['Ray Clemence', 'David James', 'Jerzy Dudek'], 'ucl', 'ucl-drama'),
  makeQ('Liverpool completed one of football\'s greatest comebacks in the 2005 Champions League final, trailing AC Milan 3-0 at half-time before winning on penalties. What was the score after 90 minutes?',
    '3-3', ['3-2', '2-2', '4-3'], 'ucl', 'ucl-drama'),
  makeQ('Barcelona\'s "La Remontada" against PSG in the 2017 Champions League saw them overturn a 4-0 first-leg deficit, winning the second leg 6-1. Who scored the decisive 95th-minute goal?',
    'Sergi Roberto', ['Neymar', 'Lionel Messi', 'Luis Suárez'], 'ucl', 'ucl-drama'),
  makeQ('Liverpool overturned a 3-0 first-leg deficit against Barcelona in the 2019 Champions League semi-final, winning the second leg 4-0 at Anfield. Who scored the famous quickly-taken-corner goal?',
    'Divock Origi', ['Georginio Wijnaldum', 'Roberto Firmino', 'Trent Alexander-Arnold'], 'ucl', 'ucl-drama'),

  // --- Off-pitch incidents & oddities ---
  makeQ('In the 2006 World Cup final, Zinedine Zidane was sent off in extra time for headbutting an opponent in the chest. Who was the opponent?',
    'Marco Materazzi', ['Fabio Cannavaro', 'Gennaro Gattuso', 'Andrea Pirlo'], 'world', 'wc-classics'),
  makeQ('David Beckham was sent off for England against Argentina at the 1998 World Cup after flicking a boot at an opponent who had fouled him from behind. Who was that opponent?',
    'Diego Simeone', ['Juan Sebastián Verón', 'Gabriel Batistuta', 'Ariel Ortega'], 'world', 'wc-classics'),
  makeQ('Roy Keane left Ireland\'s 2002 World Cup squad before a ball was kicked after a public falling-out with the manager over training facilities, in what became known as the "Saipan incident". Who was the Ireland manager at the time?',
    'Mick McCarthy', ['Jack Charlton', 'Steve Staunton', 'Brian Kerr'], 'world', 'wc-classics'),
  makeQ('Hakan Şükür scored the fastest goal in World Cup history, finding the net just 11 seconds into Turkey\'s third-place play-off at the 2002 World Cup. Who did Turkey beat in that match?',
    'South Korea', ['Japan', 'Brazil', 'Germany'], 'world', 'wc-classics'),

  // --- Shock domestic cup finals ---
  makeQ('Wimbledon\'s "Crazy Gang" stunned the heavily favoured "Culture Club" in the 1988 FA Cup final, winning 1-0 courtesy of a Lawrie Sanchez header. Who did they beat?',
    'Liverpool', ['Everton', 'Manchester United', 'Arsenal'], 'pl', 'underdog-shocks'),
  makeQ('Second Division Sunderland shocked the dominant Leeds United side 1-0 to win the 1973 FA Cup final, with goalkeeper Jim Montgomery making a famous double save. Who scored Sunderland\'s winning goal?',
    'Ian Porterfield', ['Billy Hughes', 'Dennis Tueart', 'Vic Halom'], 'pl', 'underdog-shocks'),

  // --- Records & extremes ---
  makeQ('Norman Whiteside became the youngest player in World Cup history at the 1982 tournament, aged just 17 years and 41 days. Which country did he represent?',
    'Northern Ireland', ['Republic of Ireland', 'Scotland', 'Wales'], 'world', 'wc-records'),
  makeQ('Brazil\'s 7-1 semi-final defeat to Germany at the 2014 World Cup — nicknamed the "Mineirazo" after the stadium — remains their heaviest ever competitive loss. In which Brazilian city was it played?',
    'Belo Horizonte', ['Rio de Janeiro', 'São Paulo', 'Salvador'], 'world', 'wc-classics'),
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
