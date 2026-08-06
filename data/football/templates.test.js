import assert from 'node:assert/strict'
import { pickDistractors, makeQuestion, winnerQuestions, neverWonQuestions, clubKey, neverPlayedForQuestions, venueQuestions, nationalityQuestions } from './templates.mjs'
import { isQid } from './queries.mjs'

const fixed = (v = 0) => () => v

const tests = [
  {
    name: 'pickDistractors: draws from the pool, never the correct answer, never duplicates',
    fn: () => {
      const pool = ['Arsenal', 'Chelsea', 'Liverpool', 'Everton', 'Arsenal']
      const d = pickDistractors('Arsenal', pool, 3, fixed(0))
      assert.equal(d.length, 3)
      assert.ok(!d.includes('Arsenal'), 'the correct answer must never be a distractor')
      assert.equal(new Set(d).size, 3, 'distractors must be distinct')
    },
  },
  {
    name: 'pickDistractors: returns null when the pool cannot supply enough distinct wrong answers',
    fn: () => {
      assert.equal(pickDistractors('Arsenal', ['Arsenal', 'Chelsea'], 3, fixed(0)), null)
    },
  },
  {
    name: 'makeQuestion: rejects a pool whose only members equal the correct answer',
    fn: () => {
      const out = makeQuestion({ q: 'Who?', correct: 'Arsenal', pool: ['Arsenal', 'Arsenal'], league: 'pl', random: fixed(0) })
      assert.equal(out, null)
    },
  },
  {
    name: 'makeQuestion: produces four distinct options and carries the league tag',
    fn: () => {
      const out = makeQuestion({
        q: 'Who won it?', correct: 'Arsenal',
        pool: ['Chelsea', 'Liverpool', 'Everton'], league: 'pl', random: fixed(0),
      })
      assert.equal(out.correct, 'Arsenal')
      assert.equal(out.wrong.length, 3)
      assert.equal(new Set([out.correct, ...out.wrong]).size, 4)
      assert.equal(out.league, 'pl')
      assert.ok(out.id && out.id.length === 12, 'stable 12-hex id')
    },
  },
  {
    name: 'makeQuestion: the same question text always yields the same id',
    fn: () => {
      const args = { q: 'Same text?', correct: 'A', pool: ['B', 'C', 'D'], league: 'pl', random: fixed(0) }
      assert.equal(makeQuestion(args).id, makeQuestion(args).id)
    },
  },
  {
    name: 'winnerQuestions: one question per season, distractors are other winners of the same league',
    fn: () => {
      const rows = [
        { season: '2019–20 Premier League', winner: 'Liverpool F.C.' },
        { season: '2018–19 Premier League', winner: 'Manchester City F.C.' },
        { season: '2017–18 Premier League', winner: 'Manchester City F.C.' },
        { season: '2016–17 Premier League', winner: 'Chelsea F.C.' },
        { season: '2015–16 Premier League', winner: 'Leicester City F.C.' },
      ]
      const qs = winnerQuestions(rows, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.ok(qs.length > 0)
      const q = qs.find((x) => x.correct === 'Leicester City F.C.')
      assert.ok(q, 'the 2015-16 season must produce a question')
      assert.ok(q.q.includes('2015–16'), 'question names the season it asks about')
      for (const w of q.wrong) {
        assert.ok(rows.some((r) => r.winner === w), 'every distractor is a real winner of this league')
      }
    },
  },
  {
    name: 'winnerQuestions: a season with two different winners recorded is discarded, not shipped',
    fn: () => {
      // Wikidata occasionally carries conflicting winner statements. Two correct
      // answers for one season violates the uniqueness requirement outright.
      const rows = [
        { season: '2019–20 Premier League', winner: 'Liverpool F.C.' },
        { season: '2019–20 Premier League', winner: 'Manchester City F.C.' },
        { season: '2018–19 Premier League', winner: 'Manchester City F.C.' },
        { season: '2017–18 Premier League', winner: 'Chelsea F.C.' },
        { season: '2016–17 Premier League', winner: 'Leicester City F.C.' },
      ]
      const qs = winnerQuestions(rows, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.ok(!qs.some((q) => q.q.includes('2019–20')), 'ambiguous season must be dropped')
    },
  },
  {
    name: 'neverWonQuestions: the correct answer has never won, all three distractors have',
    fn: () => {
      const rows = [
        { season: 'a', winner: 'Manchester City F.C.' },
        { season: 'b', winner: 'Chelsea F.C.' },
        { season: 'c', winner: 'Leicester City F.C.' },
        { season: 'd', winner: 'Liverpool F.C.' },
      ]
      const allClubs = ['Manchester City F.C.', 'Chelsea F.C.', 'Leicester City F.C.', 'Liverpool F.C.', 'Newcastle United F.C.']
      const qs = neverWonQuestions(rows, allClubs, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.ok(qs.length > 0)
      const q = qs[0]
      assert.equal(q.correct, 'Newcastle United F.C.', 'the never-won club is the answer')
      for (const w of q.wrong) {
        assert.ok(rows.some((r) => r.winner === w), 'every distractor HAS won it')
      }
      assert.ok(/NEVER/i.test(q.q), 'question makes the inversion explicit')
    },
  },
  {
    name: 'neverWonQuestions: produces a question when several clubs have never won',
    fn: () => {
      // Regression for I4: the old guard demanded allClubs contain EXACTLY one
      // non-winner, which is always false for a normal league (20 clubs, a
      // handful of winners) and made this template structurally dead — 0
      // questions ever shipped. Only ONE non-winner appears among the four
      // options per question, same invariant neverPlayedForQuestions already
      // uses, so several never-won clubs existing is not ambiguity.
      const rows = [{ season: 'a', winner: 'Chelsea F.C.' }, { season: 'b', winner: 'Liverpool F.C.' }, { season: 'c', winner: 'Arsenal F.C.' }]
      const allClubs = ['Chelsea F.C.', 'Liverpool F.C.', 'Arsenal F.C.', 'Newcastle United F.C.', 'Everton F.C.']
      const qs = neverWonQuestions(rows, allClubs, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.equal(qs.length, 1, 'must fail against the old !== 1 guard, which returns []')
      const winners = ['Chelsea F.C.', 'Liverpool F.C.', 'Arsenal F.C.']
      assert.ok(!winners.includes(qs[0].correct), 'the answer must be a club that never won')
      for (const w of qs[0].wrong) assert.ok(winners.includes(w), 'every distractor HAS won it')
    },
  },
  {
    name: 'neverWonQuestions: a club spelled differently across the two sources is not called never-won',
    fn: () => {
      const rows = [
        { season: 'a', winner: 'Manchester City F.C.' },
        { season: 'b', winner: 'Chelsea F.C.' },
        { season: 'c', winner: 'Leicester City F.C.' },
        { season: 'd', winner: 'Liverpool F.C.' },
      ]
      const allClubs = ['Manchester City FC', 'Chelsea F.C.', 'Leicester City F.C.', 'Liverpool F.C.', 'Newcastle United F.C.']
      const qs = neverWonQuestions(rows, allClubs, { leagueName: 'Premier League', league: 'pl', random: fixed(0) })
      assert.ok(qs.length > 0)
      assert.equal(qs[0].correct, 'Newcastle United F.C.', 'the genuinely never-won club is the answer')
      assert.notEqual(qs[0].correct, 'Manchester City FC', 'a spelling variant of a real winner must not be called never-won')
    },
  },
  {
    name: 'pickDistractors: a case-variant of the correct answer is excluded, not left to poison the question',
    fn: () => {
      const pool = ['arsenal f.c.', 'Chelsea F.C.', 'Liverpool F.C.', 'Everton F.C.']
      const d = pickDistractors('Arsenal F.C.', pool, 3, fixed(0))
      assert.equal(d.length, 3)
      assert.ok(!d.some((w) => w.toLowerCase() === 'arsenal f.c.'), 'a case-variant of the correct answer must not be a distractor')
    },
  },
  {
    name: 'clubKey: a club whose name ends in A keeps its last letter',
    fn: () => {
      assert.equal(clubKey('Chelsea F.C.'), 'chelsea')
      assert.equal(clubKey('Chelsea FC'), 'chelsea')
      assert.equal(clubKey('Chelsea'), 'chelsea')
      assert.notEqual(clubKey('Chelsea F.C.'), 'chelse')
      assert.equal(clubKey('Aston Villa F.C.'), 'astonvilla')
      assert.equal(clubKey('Aston Villa'), 'astonvilla')
    },
  },
  {
    name: 'neverPlayedForQuestions: the answer is a club the player never played for',
    fn: () => {
      const rows = [
        { id: 'Q1', player: 'Fernandinho', club: 'Manchester City F.C.' },
        { id: 'Q1', player: 'Fernandinho', club: 'Shakhtar Donetsk' },
        { id: 'Q1', player: 'Fernandinho', club: 'Athletico Paranaense' },
        { id: 'Q2', player: 'Other Player', club: 'Everton F.C.' },
        { id: 'Q2', player: 'Other Player', club: 'Arsenal F.C.' },
        { id: 'Q3', player: 'Third Player', club: 'Chelsea F.C.' },
      ]
      const qs = neverPlayedForQuestions(rows, { league: 'pl', random: fixed(0) })
      const q = qs.find((x) => x.q.includes('Fernandinho'))
      assert.ok(q, 'a player with 3+ clubs yields a question')
      assert.ok(/NOT|never/i.test(q.q))
      const played = ['Manchester City F.C.', 'Shakhtar Donetsk', 'Athletico Paranaense']
      assert.ok(!played.includes(q.correct), 'the answer is a club he did NOT play for')
      for (const w of q.wrong) assert.ok(played.includes(w), 'distractors are clubs he DID play for')
    },
  },
  {
    name: 'neverPlayedForQuestions: skips players with fewer than three known clubs',
    fn: () => {
      const rows = [
        { id: 'Q1', player: 'Loyal One', club: 'Everton F.C.' },
        { id: 'Q2', player: 'Someone', club: 'Arsenal F.C.' },
        { id: 'Q2', player: 'Someone', club: 'Chelsea F.C.' },
        { id: 'Q2', player: 'Someone', club: 'Leeds United F.C.' },
      ]
      const qs = neverPlayedForQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.ok(!qs.some((q) => q.q.includes('Loyal One')), 'one club cannot fill three distractors')
    },
  },
  {
    name: 'neverPlayedForQuestions: two players sharing a name are not merged into one career',
    fn: () => {
      // C1: two distinct "Tommy Wilson"s, each with only 2 real clubs — below
      // the 3-club minimum on his own. Keyed on the raw label (the old bug),
      // their careers merge into one 4-distinct-club "Tommy Wilson", clears the
      // clubs.size < 3 gate, and ships a question where the "NOT played for"
      // answer or a distractor is actually a club the OTHER man played at.
      // Keyed on id (the fix), each stays a separate 2-club career and neither
      // reaches the threshold — no question ships, and no club that either man
      // genuinely played for is ever misattributed to the other.
      const rows = [
        { id: 'Q101', player: 'Tommy Wilson', club: 'Celtic F.C.' },
        { id: 'Q101', player: 'Tommy Wilson', club: 'Dundee F.C.' },
        { id: 'Q202', player: 'Tommy Wilson', club: 'Sunderland A.F.C.' },
        { id: 'Q202', player: 'Tommy Wilson', club: 'Middlesbrough F.C.' },
      ]
      const qs = neverPlayedForQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.equal(qs.length, 0, 'each Tommy Wilson individually has only 2 clubs — must fail if merged into a 4-club career')
    },
  },
  {
    name: 'venueQuestions: distractors are other real venues, never invented',
    fn: () => {
      const rows = [
        { club: 'Arsenal F.C.', venue: 'Emirates Stadium' },
        { club: 'Chelsea F.C.', venue: 'Stamford Bridge' },
        { club: 'Everton F.C.', venue: 'Goodison Park' },
        { club: 'Liverpool F.C.', venue: 'Anfield' },
      ]
      const qs = venueQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.equal(qs.length, 4)
      const all = rows.map((r) => r.venue)
      for (const q of qs) for (const w of q.wrong) assert.ok(all.includes(w))
    },
  },
  {
    name: 'venueQuestions: a club with two recorded venues is dropped as ambiguous',
    fn: () => {
      const rows = [
        { club: 'Arsenal F.C.', venue: 'Emirates Stadium' },
        { club: 'Arsenal F.C.', venue: 'Highbury' },
        { club: 'Chelsea F.C.', venue: 'Stamford Bridge' },
        { club: 'Everton F.C.', venue: 'Goodison Park' },
        { club: 'Liverpool F.C.', venue: 'Anfield' },
      ]
      const qs = venueQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.ok(!qs.some((q) => q.q.includes('Arsenal')), 'two venues = two correct answers')
    },
  },
  {
    name: 'neverPlayedForQuestions: a club spelled differently is not offered as one he never played for',
    fn: () => {
      const rows = [
        { id: 'Q1', player: 'Fernandinho', club: 'Manchester City F.C.' },
        { id: 'Q1', player: 'Fernandinho', club: 'Shakhtar Donetsk' },
        { id: 'Q1', player: 'Fernandinho', club: 'Athletico Paranaense' },
        { id: 'Q2', player: 'Other Player', club: 'Manchester City FC' },
        { id: 'Q2', player: 'Other Player', club: 'Everton F.C.' },
      ]
      const qs = neverPlayedForQuestions(rows, { league: 'pl', random: fixed(0) })
      const q = qs.find((x) => x.q.includes('Fernandinho'))
      assert.ok(q, 'a player with 3+ clubs yields a question')
      assert.equal(q.correct, 'Everton F.C.', 'the genuinely never-played-for club is the answer')
      assert.notEqual(q.correct, 'Manchester City FC', 'a spelling variant of a played-for club must not be the answer')
    },
  },
  {
    name: 'venueQuestions: one club under two labels with different venues is discarded as ambiguous',
    fn: () => {
      const rows = [
        { club: 'Arsenal F.C.', venue: 'Emirates Stadium' },
        { club: 'Arsenal FC', venue: 'Highbury' },
        { club: 'Chelsea F.C.', venue: 'Stamford Bridge' },
        { club: 'Everton F.C.', venue: 'Goodison Park' },
        { club: 'Liverpool F.C.', venue: 'Anfield' },
      ]
      const qs = venueQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.ok(!qs.some((q) => q.q.includes('Arsenal')), 'two labels of one club with different venues must be dropped')
      assert.equal(qs.length, 3, 'the three unambiguous clubs still produce questions')
    },
  },
  {
    name: 'nationalityQuestions: distractors are other real nationalities, four distinct options',
    fn: () => {
      const rows = [
        { id: 'Q1', player: 'Bukayo Saka', nat: 'England' },
        { id: 'Q2', player: 'Kevin De Bruyne', nat: 'Belgium' },
        { id: 'Q3', player: 'Virgil van Dijk', nat: 'Netherlands' },
        { id: 'Q4', player: 'Robert Lewandowski', nat: 'Poland' },
      ]
      const qs = nationalityQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.equal(qs.length, 4)
      const all = rows.map((r) => r.nat)
      for (const q of qs) {
        assert.equal(new Set([q.correct, ...q.wrong]).size, 4)
        for (const w of q.wrong) assert.ok(all.includes(w))
      }
    },
  },
  {
    name: 'nationalityQuestions: a player with two recorded nationalities is discarded as ambiguous',
    fn: () => {
      const rows = [
        { id: 'Q1', player: 'Bukayo Saka', nat: 'England' },
        { id: 'Q1', player: 'Bukayo Saka', nat: 'Nigeria' },
        { id: 'Q2', player: 'Kevin De Bruyne', nat: 'Belgium' },
        { id: 'Q3', player: 'Virgil van Dijk', nat: 'Netherlands' },
        { id: 'Q4', player: 'Robert Lewandowski', nat: 'Poland' },
      ]
      const qs = nationalityQuestions(rows, { league: 'pl', random: fixed(0) })
      assert.ok(!qs.some((q) => q.q.includes('Saka')), 'two nationalities = two correct answers')
    },
  },
  {
    name: 'row shaping discards QID-only labels',
    fn: () => {
      assert.ok(isQid('Q15358470'), 'a bare QID must be detected')
      assert.ok(isQid('Q1'), 'a short bare QID must be detected')
      assert.ok(!isQid('England'), 'a real label must not be flagged')
      assert.ok(!isQid('Quintero'), 'a real label starting with Q must not be flagged')
      assert.ok(!isQid('Q1 United'), 'a label merely containing a QID-like prefix must not be flagged')
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}: ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
