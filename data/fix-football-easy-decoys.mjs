// Makes football questions whose answer could be spotted without knowing it
// actually make players think (2026-10). Three kinds of giveaway:
//
//   1. One fixed decoy set for a whole template. "Top scorer at the 1962
//      World Cup?" offered Klose, Ronaldo and Thomas Müller — players born
//      decades later — and every host question offered France/Germany/USA.
//      Those get hand-picked decoys from the same tournament or era: award
//      runners-up, fellow top scorers, rival bids and neighbouring hosts.
//   2. The answer stood out by format: a pair against single names ("Mohamed
//      Salah & Son Heung-min"), a list against pairs, the only unusual shirt
//      number among 10/11/7. Reworded so all four options look alike.
//   3. Generated "Who won the <season> <cup>?" questions drew decoys from any
//      era (RB Leipzig, founded 2009, for the 2006–07 DFB-Pokal). Decoys now
//      come from the same competition's winners in the nearest seasons.
//
// Idempotent. Run: node data/fix-football-easy-decoys.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const PATH = 'data/trivia.json'

// No single right answer, or a fact too shaky to keep.
const REMOVE = new Set([
  '792c6e79af59', // 1962 World Cup top scorer: a six-way tie, not "Garrincha & Vavá"
  'a453e2aafde8', // most PL Player of the Month awards: a moving target, already out of date
  '4e20f176a27d', // most PL goals as a substitute: "Milner & Defoe" is not the record
])

// id -> fields to set. `wrong` alone keeps the question and answer as they are.
const FIX = {
  // ── World Cup Golden Ball: that tournament's silver/bronze ball and stars ──
  '016e00e3cfd0': { wrong: ['Kylian Mbappé', 'Luka Modrić', 'Antoine Griezmann'] },
  'c60d282971c8': { wrong: ['Eden Hazard', 'Antoine Griezmann', 'Kylian Mbappé'] },
  'c02379d339be': { wrong: ['Thomas Müller', 'Arjen Robben', 'James Rodríguez'] },
  '9ba08aa321fd': { wrong: ['Wesley Sneijder', 'David Villa', 'Andrés Iniesta'] },
  'b342442fb7d7': { wrong: ['Fabio Cannavaro', 'Andrea Pirlo', 'Gianluigi Buffon'] },
  'afd850e63b18': { wrong: ['Ronaldo', 'Hong Myung-bo', 'Rivaldo'] },
  '0d4138a12d76': { wrong: ['Davor Šuker', 'Lilian Thuram', 'Zinedine Zidane'] },
  'e8bccaad0e1d': { wrong: ['Roberto Baggio', 'Hristo Stoichkov', 'Gheorghe Hagi'] },
  '840dd61d6ba6': { wrong: ['Lothar Matthäus', 'Diego Maradona', 'Roger Milla'] },
  'b32e0792a2f8': { wrong: ['Harald Schumacher', 'Preben Elkjær', 'Gary Lineker'] },
  'e2f8d72a3cca': { wrong: ['Falcão', 'Karl-Heinz Rummenigge', 'Zico'] },
  '9f601a01fe50': { wrong: ['Rob Rensenbrink', 'Dirceu', 'Daniel Passarella'] },
  '4001db9c3b35': { wrong: ['Franz Beckenbauer', 'Kazimierz Deyna', 'Gerd Müller'] },
  '2152cbcc3f08': { wrong: ['Gerd Müller', 'Jairzinho', 'Bobby Moore'] },
  '6d513dbe80c1': { wrong: ['Bobby Moore', 'Eusébio', 'Franz Beckenbauer'] },
  '8241b052dbbc': { wrong: ['Josef Masopust', 'Vavá', 'Amarildo'] },
  '69afdd8e2dba': { wrong: ['Pelé', 'Just Fontaine', 'Garrincha'] },
  'd2801051eb6c': { wrong: ['Sándor Kocsis', 'Fritz Walter', 'Nándor Hidegkuti'] },
  '881df8daabb7': { wrong: ['Ademir', 'Obdulio Varela', 'Juan Alberto Schiaffino'] },
  '55875d1f3f15': { wrong: ['Silvio Piola', 'Giuseppe Meazza', 'György Sárosi'] },
  'f3b50972c1d4': { wrong: ['Matthias Sindelar', 'Oldřich Nejedlý', 'Luis Monti'] },
  '66ac245515d3': { wrong: ['Guillermo Stábile', 'José Leandro Andrade', 'Héctor Scarone'] },

  // ── World Cup top scorer: other leading scorers at that tournament ──
  'b13aa70d70cd': { wrong: ['Lionel Messi', 'Olivier Giroud', 'Julián Álvarez'] },
  'd835c084e2cf': { wrong: ['Romelu Lukaku', 'Antoine Griezmann', 'Cristiano Ronaldo'] },
  'f15f59b0e124': { wrong: ['Thomas Müller', 'Lionel Messi', 'Neymar'] },
  'ea5f7712fe60': { wrong: ['David Villa', 'Wesley Sneijder', 'Diego Forlán'] },
  'fd55d997bacd': { wrong: ['Hernán Crespo', 'Thierry Henry', 'Ronaldo'] },
  'd011f0f8dc7f': { wrong: ['Rivaldo', 'Miroslav Klose', 'Jon Dahl Tomasson'] },
  'bd97abb8826a': { wrong: ['Gabriel Batistuta', 'Christian Vieri', 'Ronaldo'] },
  '50baed1eee5b': {
    q: 'Which Russian shared the 1994 World Cup Golden Boot with Hristo Stoichkov, helped by five goals in one game against Cameroon?',
    correct: 'Oleg Salenko',
    wrong: ['Jürgen Klinsmann', 'Kennet Andersson', 'Roberto Baggio'],
  },
  'a76348d1c8a2': { wrong: ['Tomáš Skuhravý', 'Gary Lineker', 'Lothar Matthäus'] },
  '07048d76c411': { wrong: ['Emilio Butragueño', 'Diego Maradona', 'Careca'] },
  '9012920dee0f': { wrong: ['Karl-Heinz Rummenigge', 'Zico', 'Zbigniew Boniek'] },
  '5ee6a72cdd1b': { wrong: ['Rob Rensenbrink', 'Teófilo Cubillas', 'Leopoldo Luque'] },
  'd1d9478e5181': { wrong: ['Andrzej Szarmach', 'Johan Neeskens', 'Gerd Müller'] },
  '099b67c14e20': { wrong: ['Jairzinho', 'Teófilo Cubillas', 'Pelé'] },
  '40ccbec06d4a': { wrong: ['Helmut Haller', 'Geoff Hurst', 'Franz Beckenbauer'] },
  'f45a0b581566': { wrong: ['Pelé', 'Helmut Rahn', 'Vavá'] },
  '349e6ea685ac': { wrong: ['Ferenc Puskás', 'Max Morlock', 'Erich Probst'] },
  'ec189549e410': { wrong: ['Óscar Míguez', 'Juan Alberto Schiaffino', 'Zizinho'] },
  '6c4e5a27a847': { wrong: ['György Sárosi', 'Silvio Piola', 'Gyula Zsengellér'] },
  '5fc3b2f49824': { wrong: ['Edmund Conen', 'Angelo Schiavio', 'Giuseppe Meazza'] },
  'a0068e6d5ad1': { wrong: ['Pedro Cea', 'Guillermo Subiabre', 'Bert Patenaude'] },

  // ── World Cup hosts: rival bids and neighbouring hosts of the same era ──
  '25441c226614': { wrong: ['United States', 'Australia', 'South Korea'] },
  'f52c6bd02829': { wrong: ['England', 'Spain', 'Netherlands'] },
  '81753586124b': { wrong: ['Argentina', 'Colombia', 'Chile'] },
  '72533405093f': { wrong: ['Morocco', 'Egypt', 'Nigeria'] },
  '0e0b99aa4bf4': { wrong: ['South Africa', 'England', 'Morocco'] },
  '3de8036d7e5d': { q: 'Which two countries co-hosted the 2002 FIFA World Cup?', wrong: ['China & Japan', 'South Korea & China', 'Japan & Australia'] },
  '83593a479d4f': { wrong: ['Morocco', 'Switzerland', 'Belgium'] },
  '2cc73ab2deb6': { correct: 'United States', wrong: ['Morocco', 'Brazil', 'Mexico'] },
  '2c9d34de2f70': { wrong: ['Soviet Union', 'England', 'Spain'] },
  'cfa31ebf12b2': { wrong: ['Colombia', 'United States', 'Canada'] },
  '0a54eb209bdf': { wrong: ['Portugal', 'Italy', 'England'] },
  'e7c98722406e': { wrong: ['Brazil', 'Uruguay', 'Chile'] },
  '3db5c8a8fc3d': { wrong: ['Netherlands', 'Spain', 'Austria'] },
  '4d4dea51836e': { wrong: ['Argentina', 'Brazil', 'Colombia'] },
  '1b5ae50aba78': { wrong: ['West Germany', 'Spain', 'Netherlands'] },
  '43d6af0d2abf': { wrong: ['Argentina', 'Uruguay', 'Peru'] },
  'e71e92398fbf': { wrong: ['Norway', 'Denmark', 'Switzerland'] },
  '232a4fa34cbf': { wrong: ['Austria', 'West Germany', 'Sweden'] },
  'a2e634be57d0': { wrong: ['Argentina', 'Uruguay', 'Chile'] },
  'fb26784f7af0': { wrong: ['Germany', 'Argentina', 'Belgium'] },
  '0b488d2fa2f5': { wrong: ['Sweden', 'Spain', 'France'] },
  '038a34033dcb': { wrong: ['Argentina', 'Italy', 'Netherlands'] },

  // ── Euro hosts ──
  '9229266e70bc': { wrong: ['Turkey', 'Austria', 'Netherlands'] },
  'aaa59d68344d': { q: 'Euro 2020, played in 2021, was staged across how many host countries?', correct: '11', wrong: ['13', '9', '12'] },
  '69480200d66a': { wrong: ['Italy', 'Turkey', 'Belgium'] },
  'e62d50d9266b': { q: 'Which two countries co-hosted UEFA Euro 2012?', wrong: ['Croatia & Hungary', 'Italy & Croatia', 'Poland & Hungary'] },
  '441503c53912': { q: 'Which two countries co-hosted UEFA Euro 2008?', wrong: ['Belgium & Netherlands', 'Germany & Austria', 'Poland & Ukraine'] },
  'bb344105f27e': { wrong: ['Spain', 'Greece', 'Austria'] },
  'f1435b23716e': { q: 'Which two countries co-hosted UEFA Euro 2000?', wrong: ['Austria & Switzerland', 'Denmark & Sweden', 'Germany & Netherlands'] },
  'ecf3d303a6df': { wrong: ['Netherlands', 'Portugal', 'Greece'] },
  'be21881bc25f': { wrong: ['Denmark', 'Norway', 'Netherlands'] },
  '7291a3f36176': { wrong: ['England', 'Netherlands', 'Italy'] },
  '07ad394051a4': { wrong: ['Italy', 'West Germany', 'Spain'] },
  'e232d011d91f': { wrong: ['West Germany', 'England', 'Netherlands'] },
  '8c879a9cc9b5': { wrong: ['Czechoslovakia', 'Hungary', 'Austria'] },
  '5f3450dbdc4e': { wrong: ['Netherlands', 'West Germany', 'Italy'] },
  '5fef10fedb9f': { wrong: ['Yugoslavia', 'Spain', 'England'] },
  '3f67fdb137fa': { wrong: ['Portugal', 'Italy', 'Soviet Union'] },
  'd5cebccfa5c6': { wrong: ['Spain', 'Czechoslovakia', 'Yugoslavia'] },

  // ── AFCON hosts: original hosts that withdrew, rival bids, neighbours ──
  'cc1fa325df29': { wrong: ['Cameroon', 'Ghana', 'Senegal'] },
  '2eddc0f7be96': { wrong: ['Ivory Coast', 'Guinea', 'Egypt'] },
  '487e92ecf3b2': { wrong: ['Cameroon', 'South Africa', 'Morocco'] },
  '872c3d963b90': { wrong: ['Libya', 'Cameroon', 'Equatorial Guinea'] },
  'ddc101f715f5': { wrong: ['Morocco', 'Gabon', 'Ghana'] },
  '262e789d3a42': { wrong: ['Libya', 'Ghana', 'Morocco'] },
  '104807fc5320': { q: 'Which two countries co-hosted the 2012 Africa Cup of Nations?', wrong: ['Ghana & Nigeria', 'Gabon & Cameroon', 'Equatorial Guinea & Cameroon'] },
  'b0bc9634d619': { wrong: ['Nigeria', 'Mozambique', 'Zambia'] },
  '3dbc9002c2d3': { wrong: ['Nigeria', 'Libya', 'Egypt'] },
  '2b08494732cf': { wrong: ['Libya', 'Tunisia', 'Ivory Coast'] },
  'f7fca0c4f333': { wrong: ['Morocco', 'Egypt', 'Algeria'] },
  '8cc077136789': { wrong: ['Burkina Faso', 'Senegal', 'Guinea'] },
  '12eef314c5ae': { q: 'Which two countries co-hosted the 2000 Africa Cup of Nations?', wrong: ['Nigeria & Cameroon', 'Ghana & Ivory Coast', 'Ghana & Togo'] },
  'f680dd791383': { wrong: ['Mali', 'Ivory Coast', 'Senegal'] },
  'f7dddb521fe4': { wrong: ['Kenya', 'Zimbabwe', 'Zambia'] },
  '6030bf989574': { wrong: ['Zaire', 'Morocco', 'Algeria'] },

  // ── "Iconic" shirt numbers: decoys as unusual as the answer ──
  'f2c91d577418': { wrong: ['62', '76', '68'] },
  'e42158627373': { wrong: ['41', '74', '49'] },
  'e64bfd1a3914': { wrong: ['14', '47', '44'] },
  '44327e340523': { wrong: ['54', '49', '99'] },
  '294928e2b73b': { q: 'What shirt number did Victor Osimhen wear for Galatasaray?', correct: '45', wrong: ['9', '54', '99'] },
  '65ed66cfb599': { wrong: ['73', '34', '23'] },
  '3ac9549088bd': { wrong: ['93', '38', '8'] },
  '10fac475d10d': { wrong: ['13', '23', '7'] },
  'fb951d748f1d': { wrong: ['72', '17', '10'] },
  '02a61ac608c5': { wrong: ['92', '19', '9'] },
  '9ca5e1a0a4ef': { wrong: ['52', '15', '23'] },

  // ── Shared awards: ask for the partner, so every option is one name ──
  'cad3bfe628b4': { q: 'Mohamed Salah shared the 2021/22 Premier League Golden Boot with which player?', correct: 'Son Heung-min', wrong: ['Cristiano Ronaldo', 'Harry Kane', 'Sadio Mané'] },
  'ec4d049f9bdf': { q: 'Mohamed Salah and Pierre-Emerick Aubameyang shared the 2018/19 Premier League Golden Boot with which third player?', correct: 'Sadio Mané', wrong: ['Sergio Agüero', 'Harry Kane', 'Raheem Sterling'] },
  '46aeb76a97a3': { q: 'Dimitar Berbatov shared the 2010/11 Premier League Golden Boot with which player?', correct: 'Carlos Tevez', wrong: ['Robin van Persie', 'Darren Bent', 'Peter Odemwingie'] },
  '42fcd28eeb4d': { q: 'Ederson shared the 2021/22 Premier League Golden Glove with which goalkeeper?', correct: 'Alisson Becker', wrong: ['Hugo Lloris', 'Édouard Mendy', 'David de Gea'] },
  '59a376ac695f': { q: 'Wojciech Szczęsny shared the 2013/14 Premier League Golden Glove with which goalkeeper?', correct: 'Petr Čech', wrong: ['Tim Howard', 'Artur Boruc', 'Hugo Lloris'] },
  'f0d4e4d77408': { q: 'Which of these players has won six European Cup / Champions League titles?', correct: 'Dani Carvajal', wrong: ['Cristiano Ronaldo', 'Paolo Maldini', 'Sergio Ramos'] },
  'c015e6fc294a': {
    q: "Which three players scored Real Madrid's goals in their 4-1 win over Juventus in the 2017 Champions League final?",
    correct: 'Ronaldo, Casemiro & Asensio',
    wrong: ['Ronaldo, Benzema & Asensio', 'Ronaldo, Casemiro & Isco', 'Benzema, Bale & Asensio'],
  },

  // Same-size decoys, each partly right, so only knowing the full set works.
  'f627665ceaea': {
    q: "Which three players scored Barcelona's goals in their 3-1 win over Juventus in the 2015 Champions League final?",
    correct: 'Rakitić, Suárez & Neymar',
    wrong: ['Rakitić, Messi & Neymar', 'Suárez, Iniesta & Pedro', 'Messi, Suárez & Neymar'],
  },
  '87a6ef64354d': {
    q: "Which four players scored Real Madrid's goals in their 4-1 extra-time win over Atlético Madrid in the 2014 Champions League final?",
    correct: 'Ramos, Bale, Marcelo & Ronaldo',
    wrong: ['Ramos, Bale, Isco & Ronaldo', 'Ramos, Di María, Marcelo & Ronaldo', 'Benzema, Bale, Marcelo & Ronaldo'],
  },

  // Wrong answer: Southampton LOST 9-0 twice; Leicester were the winners.
  'afae10ec4f57': {
    q: 'Which three clubs had recorded 9-0 wins, the biggest in Premier League history, by the end of 2024?',
    correct: 'Man United, Leicester & Liverpool',
    wrong: ['Man United, Southampton & Liverpool', 'Chelsea, Man City & Arsenal', 'Man United, Chelsea & Tottenham'],
  },
  'f7a2fc12c081': { correct: 'Villa vs Birmingham' },
  'feda07300cd0': { correct: 'Forest vs Derby' },
  '87e5ef72adeb': { correct: 'Sheffield United vs Wednesday' },
  '533beb6d82ff': { correct: 'Palace vs Brighton' },
  'ce3076524600': { correct: 'Chelsea, Fulham & QPR' },
  'e3f07ba180a5': { correct: 'Bayern vs Dortmund' },
  '842774d8ec39': { correct: 'Salah, Firmino, Mané' },
  'fff0163e4171': { correct: 'Messi and Ronaldo' },
  '48f4dd62e997': { correct: 'Zaire' },
  '6d0e99fcb376': { correct: 'Zaire' },
  'd5cdd2dc4505': { correct: 'DR Congo' },
  'da0039dbd906': { correct: 'Egypt' },
  '07507584a8a9': { correct: 'Tüpraş Stadium' },

  // ── Answer was the only option written out in full ──
  '1e6c9313bbba': { correct: 'Dortmund vs Schalke' },
  '521076710b33': { correct: 'PSG vs Marseille' },
  'ddb009c97f62': { correct: 'Lyon vs Saint-Étienne' },
  '574bffcf6b60': { correct: 'Wolves vs West Brom' },
  'a6c81688e543': { correct: 'Nacional vs Medellín' },
  '25a1c2f6ed9a': { correct: 'Xavi, Busquets, Iniesta' },
  '7807ece8d709': { correct: 'Pirlo, Gattuso, Seedorf' },
  // "Bayern München" and "Bayern Munich" were both offered as decoys.
  'c214d23e0695': { wrong: ['Bayern Munich', 'Bayer Leverkusen', 'Borussia Dortmund'] },
}

// ── Era-matched decoys for generated "Who won the <season> <competition>?" ──
const WINNER_Q = /^Who won the (\d{4})(?:[–-](\d{2,4}))? (.+)\?$/

function eraDecoys(questions) {
  const byComp = new Map() // competition -> [{ year, winner }]
  for (const q of questions) {
    const m = q.template === 'winner' && q.q.match(WINNER_Q)
    if (!m) continue
    const list = byComp.get(m[3]) ?? []
    list.push({ year: Number(m[1]), winner: q.correct })
    byComp.set(m[3], list)
  }
  let changed = 0
  for (const q of questions) {
    const m = q.template === 'winner' && q.q.match(WINNER_Q)
    if (!m) continue
    const year = Number(m[1])
    const nearest = (byComp.get(m[3]) ?? [])
      .filter((e) => e.winner.toLowerCase() !== q.correct.toLowerCase())
      .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year) || a.year - b.year)
    const decoys = []
    for (const e of nearest) {
      if (Math.abs(e.year - year) > 12) break // a different era is no better than what's there
      if (!decoys.some((d) => d.toLowerCase() === e.winner.toLowerCase())) decoys.push(e.winner)
      if (decoys.length === 3) break
    }
    // Not enough near-era winners (a cup one club dominates): top up from the
    // existing decoys rather than reach into another era.
    for (const w of q.wrong) {
      if (decoys.length === 3) break
      if (w.toLowerCase() !== q.correct.toLowerCase() && !decoys.some((d) => d.toLowerCase() === w.toLowerCase())) decoys.push(w)
    }
    if (decoys.length === 3 && decoys.join('|') !== q.wrong.join('|')) {
      q.wrong = decoys
      changed++
    }
  }
  return changed
}

const trivia = JSON.parse(readFileSync(PATH, 'utf8'))
let removed = 0
let fixed = 0
const kept = []
for (const q of trivia.categories.football) {
  if (REMOVE.has(q.id)) { removed++; continue }
  const f = FIX[q.id]
  if (f) {
    const before = JSON.stringify(q)
    Object.assign(q, f)
    if (new Set([q.correct, ...q.wrong].map((x) => x.toLowerCase())).size !== 4) throw new Error(`duplicate options after fix: ${q.id}`)
    if (JSON.stringify(q) !== before) fixed++
  }
  kept.push(q)
}
const eraChanged = eraDecoys(kept)
// FPL names come from the API's first + second name: "Bruno Miguel Borges
// Fernandes" next to "Wilfried Zaha" is a giveaway. Use the name fans use.
const FPL_NAMES = { 'Bruno Miguel Borges Fernandes': 'Bruno Fernandes' }
for (const q of trivia.categories.fpl ?? []) {
  const before = JSON.stringify(q)
  q.correct = FPL_NAMES[q.correct] ?? q.correct
  q.wrong = q.wrong.map((w) => FPL_NAMES[w] ?? w)
  for (const [long, short] of Object.entries(FPL_NAMES)) q.q = q.q.split(long).join(short)
  if (JSON.stringify(q) !== before) fixed++
}
trivia.categories.football = kept
writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
const missing = Object.keys(FIX).filter((id) => !kept.some((q) => q.id === id))
console.log(`Removed ${removed}, hand-fixed ${fixed}, era-matched decoys on ${eraChanged} "who won" questions.${missing.length ? ` Not found: ${missing.join(', ')}` : ''}`)
