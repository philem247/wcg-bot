import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { shortClub, isReserveSide, clubLinkQuestions, bothClubsQuestions, seededRandom, looksLikeName } from './link-templates.mjs'

const players = JSON.parse(readFileSync('data/football/career-paths.json', 'utf8'))
const clubsOf = new Map(players.map((p) => [p.name, new Set(p.clubs.filter((c) => !isReserveSide(c)).map(shortClub))]))

const tests = [
  {
    name: 'shortClub: legal-style names become what people say',
    fn: () => {
      assert.equal(shortClub('Real Madrid Club de Fútbol'), 'Real Madrid')
      assert.equal(shortClub('Manchester United F.C.'), 'Manchester United')
      assert.equal(shortClub('FC Barcelona'), 'Barcelona')
      assert.equal(shortClub('F.C. Lorient'), 'Lorient')
      assert.equal(shortClub('Beşiktaş J.K. (loan)'), 'Beşiktaş')
      assert.equal(shortClub('AC Milan'), 'AC Milan')
    },
  },
  {
    name: 'isReserveSide: B, II and youth sides are not the senior club',
    fn: () => {
      for (const c of ['Real Madrid Castilla', 'FC Bayern Munich II', 'FC Barcelona Atlètic', 'Jong Ajax', 'Arsenal F.C. Under-21s and Academy']) assert.ok(isReserveSide(c), c)
      for (const c of ['FC Bayern Munich', 'AFC Ajax', 'Club Brugge K.V.']) assert.ok(!isReserveSide(c), c)
    },
  },
  {
    name: 'club-link: the answer is the ONLY club both players share; every decoy is a club one of them played for',
    fn: () => {
      const qs = clubLinkQuestions(players, { random: seededRandom(1) })
      assert.ok(qs.length >= 100)
      for (const q of qs) {
        const [, a, b] = q.q.match(/^Which club have both (.+) and (.+) played for\?$/)
        const A = clubsOf.get(a)
        const B = clubsOf.get(b)
        assert.ok(A.has(q.correct) && B.has(q.correct), q.q)
        for (const w of q.wrong) {
          assert.ok(A.has(w) || B.has(w), `${w} is not one of their clubs: ${q.q}`)
          assert.ok(!(A.has(w) && B.has(w)), `${w} would also be correct: ${q.q}`)
        }
      }
    },
  },
  {
    name: 'both-clubs: the answer played for both clubs; every decoy played for exactly one',
    fn: () => {
      const qs = bothClubsQuestions(players, { random: seededRandom(2) })
      assert.ok(qs.length >= 100)
      for (const q of qs) {
        const [, x, y] = q.q.match(/^Which of these players has played for both (.+) and (.+)\?$/)
        const c = clubsOf.get(q.correct)
        assert.ok(c.has(x) && c.has(y), q.q)
        for (const w of q.wrong) {
          const s = clubsOf.get(w)
          assert.ok(s.has(x) !== s.has(y), `${w} should have played for exactly one of them: ${q.q}`)
        }
      }
    },
  },
  {
    name: 'looksLikeName: vandalised labels are rejected, real names with particles pass',
    fn: () => {
      for (const n of ['Pierre Cardin picha grande', 'Takuma ano', 'Rafael Márquez El piojo']) assert.ok(!looksLikeName(n), n)
      for (const n of ['Virgil van Dijk', 'Kevin De Bruyne', "Samuel Eto'o", 'Marco van Basten', 'Rafael da Silva']) assert.ok(looksLikeName(n), n)
    },
  },
  {
    name: 'every player in the career data has a clean name',
    fn: () => {
      const bad = players.filter((p) => !looksLikeName(p.name)).map((p) => p.name)
      assert.deepEqual(bad, [])
    },
  },
  {
    name: 'generation is deterministic for a seed (stable ids across rebuilds)',
    fn: () => {
      const a = clubLinkQuestions(players, { random: seededRandom(1) }).map((q) => q.id)
      const b = clubLinkQuestions(players, { random: seededRandom(1) }).map((q) => q.id)
      assert.deepEqual(a, b)
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try { t.fn(); console.log(`✓ ${t.name}`); passed++ } catch (e) { console.log(`✗ ${t.name}: ${e.message}`); failed++ }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
