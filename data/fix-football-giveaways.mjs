// Removes or rewrites football/FPL questions whose wording gives the answer
// away: "the 2006 FA Cup Final ('The Gerrard Final')" -> Steven Gerrard,
// "Which club plays at Villa Park?" -> Aston Villa, and the like.
//
// data/find-answer-leaks.mjs only catches the FULL answer string inside the
// question. These leak a distinctive PART of it (a surname, a club name, a
// city), which that check cannot see.
//
// Idempotent: a rewrite only applies while the question still has its old
// text, and removals are by id, so re-running is a no-op.
// Run: node data/fix-football-giveaways.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { sharesNameWord } from './football/templates.mjs'

const PATH = 'data/trivia.json'

// Hand-written questions with nothing worth saving: the answer is
// self-evident from the question however it is phrased.
const REMOVE = new Set([
  '398f1f1d2b96', // "Which football club plays its home matches at Villa Park?" -> Aston Villa
  '4b9c91c72bf8', // "Which two clubs contest the 'Manchester Derby'?"
  '7351d35413cf', // "Which stadium in Wrocław ... ?" -> "Wrocław Stadium" (duplicate of 2b485758839d)
])

// id -> { from: old question text, ...replacement fields }
const REWRITE = {
  // Not a giveaway, a factual slip: Martins was Birmingham's striker, scoring against Arsenal.
  '3dd6b4bc3385': {
    from: 'Which Arsenal striker scored the 89th-minute winner against Arsenal for Birmingham City in the 2011 League Cup final after a mix-up between Koscielny and Szczęsny?',
    q: 'Which Birmingham City striker scored the 89th-minute winner against Arsenal in the 2011 League Cup final after a mix-up between Koscielny and Szczęsny?',
  },
  '1671639ec77c': {
    from: "Who scored a legendary 35-yard stoppage-time equalizer in the 91st minute against West Ham United to rescue Liverpool in the 2006 FA Cup Final ('The Gerrard Final')?",
    q: 'Who scored a legendary 35-yard stoppage-time equalizer in the 91st minute against West Ham United to rescue Liverpool in the 2006 FA Cup Final?',
  },
  '0c4d18f98e13': {
    from: 'Which iconic stadium in Milan is officially named Stadio Giuseppe Meazza when Inter play at home and San Siro when AC Milan play?',
    q: 'By what name is the Stadio Giuseppe Meazza, shared by AC Milan and Inter, more commonly known?',
    correct: 'San Siro',
    wrong: ['Stadio Olimpico', 'Allianz Stadium', 'Stadio Diego Armando Maradona'],
  },
  '107ec1cda7db': {
    from: 'Who won the European Cup / UEFA Champions League in the 1965 (San Siro, Milan) final?',
    q: 'Who won the European Cup / UEFA Champions League in the 1965 final?',
  },
  'f6c034f67efe': {
    from: 'Who won the European Cup / UEFA Champions League in the 1957 (Santiago Bernabéu, Madrid) final?',
    q: 'Who won the European Cup / UEFA Champions League in the 1957 final?',
  },
  'b0f3ff171be9': {
    from: 'Who won the CAF Champions League in 2022 (Casablanca)?',
    q: 'Who won the CAF Champions League in 2022?',
  },
  '7340afe8f9ea': {
    from: 'Which teams contest "The Casablanca Derby"?',
    q: "Which two clubs contest Morocco's fiercest city derby, played at the Stade Mohammed V?",
    wrong: ['FAR Rabat vs Wydad Casablanca', 'Raja Casablanca vs FAR Rabat', 'FUS Rabat vs Wydad Casablanca'],
  },
  'c764f02de321': {
    from: 'Which teams contest "The Belgrade Eternal Derby"?',
    q: 'Which two clubs contest Serbia\'s "Eternal Derby"?',
    wrong: ['Vojvodina vs Red Star Belgrade', 'Partizan Belgrade vs FK Rad', 'FK Čukarički vs Partizan Belgrade'],
  },
  '2b485758839d': {
    from: 'Which Polish stadium in Wrocław hosted the 2025 UEFA Conference League Final in May 2025?',
    q: 'Which Polish stadium hosted the 2025 UEFA Conference League Final in May 2025?',
  },
  '1ed8dfcab163': {
    from: 'Which Argentine legend shared a dressing room as teammates with Diego Simeone at Sevilla during the 1992/93 season?',
    q: 'Which Argentine legend shared a dressing room as teammates with Simeone at Sevilla during the 1992/93 season?',
  },
  '03e0aba3c695': {
    from: "Complete Brian Moore's historic 1989 commentary as Michael Thomas scored in stoppage time at Anfield: 'It's up for grabs now... ______!'",
    q: "Complete Brian Moore's historic 1989 commentary as Arsenal snatched the title with a stoppage-time goal at Anfield: 'It's up for grabs now... ______!'",
  },
  '0c53b32c631c': {
    from: 'Lionel Messi won his first trophy with Inter Miami just seven games into his MLS career, lifting the 2023 Leagues Cup. What was the name of the cross-border competition he won?',
    q: 'Lionel Messi won his first trophy with Inter Miami just seven games into his MLS career. What was the name of the cross-border competition he won?',
  },
  '262e789d3a42': {
    from: 'Which country hosted the 2013 Africa Cup of Nations?',
    q: 'Which country hosted AFCON 2013?',
  },
  'f7dddb521fe4': {
    from: 'Which country hosted the 1996 Africa Cup of Nations?',
    q: 'Which country hosted AFCON 1996?',
  },
  '9dc250c59e4e': {
    from: 'Which national team won the 1996 Africa Cup of Nations (AFCON)?',
    q: 'Which national team won AFCON 1996?',
  },
  '46db00c85c2c': {
    from: 'Who won the PFA Young Player of the Year award in the 2008/09 season?',
    q: "Who won the PFA's award for the best player under 23 in the 2008/09 season?",
  },
  'ee0158021236': {
    from: 'Which revolutionary 3-2-2-3 formation was created in the 1920s by legendary Arsenal manager Herbert Chapman to counter the new offside rule?',
    correct: 'WM', // "WM Formation" was the only option ending in the question's word "formation"
  },
  'ecbdb666323f': {
    from: 'Which modern tactical role sees full-backs tuck into central midfield during possession rather than overlapping down the flanks?',
    q: 'Which modern tactical role sees wide defenders tuck into central midfield during possession rather than overlapping down the flanks?',
  },
  'e272bd2163c6': {
    from: 'Who won the European Golden Shoe (top league goalscorer in Europe) for 2013/14?',
    // The answer was the only pair, and the only option with a goal tally.
    correct: 'Cristiano Ronaldo & Luis Suárez',
    wrong: ['Lionel Messi & Diego Costa', 'Zlatan Ibrahimović & Lionel Messi', 'Diego Costa & Zlatan Ibrahimović'],
  },
  '4d8e7ffa6e37': {
    from: 'Which FPL chip allows you to make unlimited free transfers for a single gameweek before your team reverts to its previous state?',
    q: 'Which FPL chip allows you to make unlimited transfers for a single gameweek before your team reverts to its previous state?',
  },
}

// Generated stadium questions: the same rule data/football/templates.mjs now
// applies at build time, applied to what is already in the bank.
function isStadiumGiveaway(q) {
  let m
  if (q.template === 'venue' && (m = q.q.match(/^At which stadium does (.+) play its home games\?$/))) {
    return sharesNameWord(m[1], q.correct)
  }
  if (q.template === 'club-venue' && (m = q.q.match(/^Which club plays its home games at (.+)\?$/))) {
    return sharesNameWord(q.correct, m[1])
  }
  return false
}

const trivia = JSON.parse(readFileSync(PATH, 'utf8'))
let removed = 0
let rewritten = 0
for (const cat of ['football', 'fpl']) {
  const kept = []
  for (const q of trivia.categories[cat] ?? []) {
    if (REMOVE.has(q.id) || isStadiumGiveaway(q)) {
      removed++
      console.log(`- [${cat}] ${q.q}`)
      continue
    }
    const fix = REWRITE[q.id]
    if (fix && q.q === fix.from) {
      const { from, ...fields } = fix
      const before = JSON.stringify(q)
      Object.assign(q, fields)
      if (JSON.stringify(q) !== before) {
        rewritten++
        console.log(`~ [${cat}] ${q.q} -> ${q.correct}`)
      }
    }
    kept.push(q)
  }
  trivia.categories[cat] = kept
}
writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
console.log(`\nRemoved ${removed}, rewrote ${rewritten}.`)
