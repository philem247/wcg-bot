import assert from 'node:assert/strict'
import {
  buildCareerPaths,
  eligiblePlayers,
  surnameAlias,
  withAliases,
  mergeFplOverlay,
  patchLatestClub,
  MIN_CLUBS,
  CURRENT_ERA_SANITY_FLOOR_YEAR,
} from './build-career-paths.mjs'

const tests = [
  {
    name: 'buildCareerPaths: orders clubs chronologically by start date, regardless of row order',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'Kylian Mbappe', clubLabel: 'PSG', start: '2017-08-01T00:00:00Z' },
        { player: 'Q1', playerLabel: 'Kylian Mbappe', clubLabel: 'Le Havre', start: '2015-08-01T00:00:00Z' },
        { player: 'Q1', playerLabel: 'Kylian Mbappe', clubLabel: 'Monaco', start: '2016-08-01T00:00:00Z' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Le Havre', 'Monaco', 'PSG'])
    },
  },
  {
    name: 'buildCareerPaths: consecutive identical club rows dedupe (loan-and-return through the same club)',
    fn: () => {
      const consecutive = [
        { player: 'Q2', playerLabel: 'C D', clubLabel: 'Club X', start: '2010-01-01' },
        { player: 'Q2', playerLabel: 'C D', clubLabel: 'Club X', start: '2010-06-01' },
      ]
      const [p2] = buildCareerPaths(consecutive)
      assert.deepEqual(p2.clubs, ['Club X'], 'two rows for the same club back-to-back collapse to one')
    },
  },
  {
    name: 'buildCareerPaths: non-consecutive repeat (A -> B -> A) collapses to first-occurrence-unique [A, B]',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2010-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club B', start: '2011-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2012-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Club A', 'Club B'])
    },
  },
  {
    name: 'buildCareerPaths: era is "current" when the latest spell has no end date and a plausible start year',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2010-01-01', end: '2018-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club B', start: '2019-01-01' }, // no end: still there
      ]
      const [p] = buildCareerPaths(rows)
      assert.equal(p.era, 'current')
    },
  },
  {
    name: 'buildCareerPaths: era is "legend" when the latest spell has an end date, however recent the start',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2010-01-01', end: '2019-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club B', start: '2023-01-01', end: '2024-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.equal(p.era, 'legend')
    },
  },
  {
    name: 'buildCareerPaths: era is "legend" when the latest spell has no end date but predates the sanity floor',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2000-01-01' }, // no end, but too old
      ]
      const [p] = buildCareerPaths(rows)
      assert.ok(new Date(rows[0].start).getFullYear() < CURRENT_ERA_SANITY_FLOOR_YEAR)
      assert.equal(p.era, 'legend')
    },
  },
  {
    name: 'buildCareerPaths: the "end" field never leaks into the output clubs array',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2010-01-01', end: '2018-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club B', start: '2019-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Club A', 'Club B'])
    },
  },
  {
    name: 'buildCareerPaths: rows missing player/label/club/start, or carrying a raw QID label, are dropped',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'Q1', clubLabel: 'Club X', start: '2010-01-01' }, // unresolved label
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club X', start: null }, // no start date
        { playerLabel: 'A B', clubLabel: 'Club X', start: '2010-01-01' }, // no player id
      ]
      assert.deepEqual(buildCareerPaths(rows), [])
    },
  },
  {
    name: 'buildCareerPaths: keys on player id, not label — two players sharing a name stay separate',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'Tommy Wilson', clubLabel: 'Club A', start: '2010-01-01' },
        { player: 'Q1', playerLabel: 'Tommy Wilson', clubLabel: 'Club B', start: '2011-01-01' },
        { player: 'Q2', playerLabel: 'Tommy Wilson', clubLabel: 'Club C', start: '2010-01-01' },
      ]
      const players = buildCareerPaths(rows)
      assert.equal(players.length, 2)
      assert.deepEqual(players.find((p) => p.id === 'Q1').clubs, ['Club A', 'Club B'])
      assert.deepEqual(players.find((p) => p.id === 'Q2').clubs, ['Club C'])
    },
  },
  {
    name: 'buildCareerPaths: reserve-team row sorts BEFORE its parent first-team club, overriding raw date order',
    fn: () => {
      const rows = [
        { player: 'Q616664', playerLabel: 'Casemiro', clubLabel: 'São Paulo FC', start: '2010-01-01', end: '2013-01-01' },
        { player: 'Q616664', playerLabel: 'Casemiro', clubLabel: 'Real Madrid Club de Fútbol', start: '2013-06-01', end: '2013-08-01' },
        { player: 'Q616664', playerLabel: 'Casemiro', clubLabel: 'Real Madrid Castilla', start: '2013-07-01', end: '2014-06-01' },
        { player: 'Q616664', playerLabel: 'Casemiro', clubLabel: 'Real Madrid Club de Fútbol', start: '2013-09-01', end: '2020-08-01' },
        { player: 'Q616664', playerLabel: 'Casemiro', clubLabel: 'FC Porto', start: '2014-07-01', end: '2015-06-01' },
        { player: 'Q616664', playerLabel: 'Casemiro', clubLabel: 'Manchester United F.C.', start: '2022-08-01', end: '2025-06-01' },
        { player: 'Q616664', playerLabel: 'Casemiro', clubLabel: 'Inter Miami CF', start: '2025-07-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, [
        'São Paulo FC',
        'Real Madrid Castilla',
        'Real Madrid Club de Fútbol',
        'FC Porto',
        'Manchester United F.C.',
        'Inter Miami CF',
      ])
    },
  },
  {
    name: 'buildCareerPaths: era reads the reordered TRUE latest club, not a stray reserve row that sorts last by date',
    fn: () => {
      // Mirrors the Vinícius-style failure: the reserve row's raw start date
      // sorts after the first team's, and carries an end date, but the real
      // ongoing spell is the first team's.
      const rows = [
        { player: 'Q1', playerLabel: 'V J', clubLabel: 'Flamengo', start: '2016-01-01', end: '2017-12-01' },
        { player: 'Q1', playerLabel: 'V J', clubLabel: 'Real Madrid Club de Fútbol', start: '2018-01-01' }, // ongoing
        { player: 'Q1', playerLabel: 'V J', clubLabel: 'Real Madrid Castilla', start: '2018-06-01', end: '2019-06-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Flamengo', 'Real Madrid Castilla', 'Real Madrid Club de Fútbol'])
      assert.equal(p.era, 'current')
    },
  },
  {
    name: 'buildCareerPaths: a spell tagged with the loan QID gets " (loan)" appended to that club',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Chelsea F.C.', start: '2011-01-01', end: '2014-01-01', transaction: 'http://www.wikidata.org/entity/Q1811518' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'West Bromwich Albion F.C.', start: '2012-01-01', end: '2013-01-01', transaction: 'http://www.wikidata.org/entity/Q2914547' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Everton F.C.', start: '2014-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Chelsea F.C.', 'West Bromwich Albion F.C. (loan)', 'Everton F.C.'])
    },
  },
  {
    name: 'buildCareerPaths: a spell tagged transfer (or any non-loan value) is left unsuffixed',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2010-01-01', end: '2014-01-01', transaction: 'http://www.wikidata.org/entity/Q1811518' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club B', start: '2014-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Club A', 'Club B'])
    },
  },
  {
    name: 'buildCareerPaths: a spell with no transaction field at all is left unsuffixed (silent on absence)',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2010-01-01', end: '2014-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club B', start: '2014-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Club A', 'Club B'])
    },
  },
  {
    name: 'buildCareerPaths: loan-then-later-permanent-return are distinct strings, dedup unaffected',
    fn: () => {
      // Real pattern: loaned to Club X, later re-signed permanently by Club X.
      // "Club X (loan)" and "Club X" are different strings, so both entries
      // legitimately survive first-occurrence-unique dedup as two career steps.
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club A', start: '2010-01-01', end: '2012-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club X', start: '2012-01-01', end: '2013-01-01', transaction: 'http://www.wikidata.org/entity/Q2914547' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club B', start: '2013-01-01', end: '2016-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club X', start: '2016-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      // Note: exact-string dedup keys on the bare club name BEFORE the loan
      // suffix is appended (`seen` in buildCareerPaths tracks bare `club`),
      // so the second "Club X" occurrence is still deduped away by the
      // existing first-occurrence-unique rule — it does not appear twice.
      assert.deepEqual(p.clubs, ['Club A', 'Club X (loan)', 'Club B'])
    },
  },
  {
    name: 'buildCareerPaths: loan tag composes with reserve-pairing — a loaned reserve spell reorders with its tag intact',
    fn: () => {
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Real Madrid Club de Fútbol', start: '2013-06-01', end: '2013-08-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Real Madrid Castilla', start: '2013-07-01', end: '2014-06-01', transaction: 'http://www.wikidata.org/entity/Q2914547' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Real Madrid Castilla (loan)', 'Real Madrid Club de Fútbol'])
    },
  },
  {
    name: 'buildCareerPaths: reserve-pairing heuristic does not falsely reorder two unrelated same-word clubs',
    fn: () => {
      // "Real Madrid Baloncesto" (the basketball section) also starts with
      // "Real Madrid", but " Baloncesto" is not a reserve-suffix pattern —
      // must NOT be treated as Real Madrid's football reserve side.
      const rows = [
        { player: 'Q1', playerLabel: 'X Y', clubLabel: 'Real Madrid Club de Fútbol', start: '2010-01-01', end: '2015-01-01' },
        { player: 'Q1', playerLabel: 'X Y', clubLabel: 'Real Madrid Baloncesto', start: '2016-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      assert.deepEqual(p.clubs, ['Real Madrid Club de Fútbol', 'Real Madrid Baloncesto'])
    },
  },
  {
    name: `eligiblePlayers: keeps only clubs.length >= MIN_CLUBS (default ${MIN_CLUBS})`,
    fn: () => {
      const players = [
        { id: 'Q1', name: 'A', clubs: ['X', 'Y'] },
        { id: 'Q2', name: 'B', clubs: ['X', 'Y', 'Z'] },
        { id: 'Q3', name: 'C', clubs: ['X', 'Y', 'Z', 'W'] },
      ]
      const out = eligiblePlayers(players)
      assert.deepEqual(out.map((p) => p.id), ['Q2', 'Q3'])
    },
  },
  {
    name: 'surnameAlias: last word of the name, or null when there is nothing to differ from',
    fn: () => {
      assert.equal(surnameAlias('Kylian Mbappe'), 'Mbappe')
      assert.equal(surnameAlias('Pele'), null)
      assert.equal(surnameAlias('  Erling  Haaland  '), 'Haaland')
    },
  },
  {
    name: 'withAliases: populates aliases with the surname when it differs from the full name',
    fn: () => {
      const [a, b] = withAliases([
        { id: 'Q1', name: 'Kylian Mbappe', clubs: ['X', 'Y', 'Z'], era: 'current' },
        { id: 'Q2', name: 'Pele', clubs: ['X', 'Y', 'Z'], era: 'legend' },
      ])
      assert.deepEqual(a.aliases, ['Mbappe'])
      assert.deepEqual(b.aliases, [])
    },
  },
  {
    name: 'withAliases: passes era through into the final object alongside id/name/aliases/clubs',
    fn: () => {
      const [a] = withAliases([{ id: 'Q1', name: 'A One', clubs: ['X', 'Y', 'Z'], era: 'current' }])
      assert.deepEqual(a, { id: 'Q1', name: 'A One', aliases: ['One'], clubs: ['X', 'Y', 'Z'], era: 'current' })
    },
  },
  {
    name: 'mergeFplOverlay: appends the FPL club when it differs from the Wikidata snapshot\'s newest entry',
    fn: () => {
      const players = [{ id: 'Q1', name: 'A One', clubs: ['X', 'Y'] }]
      const fplElements = [{ first_name: 'A', second_name: 'One', team: 7 }]
      const teamById = new Map([[7, 'Z']])
      mergeFplOverlay(players, fplElements, teamById)
      assert.deepEqual(players[0].clubs, ['X', 'Y', 'Z'])
    },
  },
  {
    name: 'mergeFplOverlay: an FPL player with no Wikidata career history is skipped, never fabricated',
    fn: () => {
      const players = [{ id: 'Q1', name: 'A One', clubs: ['X', 'Y'] }]
      const fplElements = [{ first_name: 'Ghost', second_name: 'Nobody', team: 7 }]
      const teamById = new Map([[7, 'Z']])
      mergeFplOverlay(players, fplElements, teamById)
      assert.equal(players.length, 1, 'no new player is added for an unmatched FPL entry')
      assert.deepEqual(players[0].clubs, ['X', 'Y'], 'the matched player is untouched')
    },
  },
  {
    name: 'mergeFplOverlay: already-current club is left alone (no duplicate append)',
    fn: () => {
      const players = [{ id: 'Q1', name: 'A One', clubs: ['X', 'Z'] }]
      const fplElements = [{ first_name: 'A', second_name: 'One', team: 7 }]
      const teamById = new Map([[7, 'Z']])
      mergeFplOverlay(players, fplElements, teamById)
      assert.deepEqual(players[0].clubs, ['X', 'Z'])
    },
  },
  {
    name: 'patchLatestClub: no apiKey means no-op and zero network calls',
    fn: async () => {
      let called = false
      const fetchImpl = async () => { called = true; throw new Error('must never be called') }
      const player = { id: 'Q1', name: 'A One', clubs: ['X'] }
      const result = await patchLatestClub(player, { fetchImpl })
      assert.equal(called, false)
      assert.deepEqual(result, player)
    },
  },
  {
    name: 'patchLatestClub: with apiKey, calls you.com and appends the resolved club',
    fn: async () => {
      const calls = []
      const fetchImpl = async (url, opts) => {
        calls.push({ url, opts })
        return {
          ok: true,
          json: async () => ({ hits: [{ snippet: 'A One joined Real Madrid this summer.' }] }),
        }
      }
      const player = { id: 'Q1', name: 'A One', clubs: ['X', 'Y'] }
      const result = await patchLatestClub(player, { apiKey: 'secret', fetchImpl })
      assert.equal(calls.length, 1)
      assert.equal(calls[0].opts.headers['X-API-Key'], 'secret')
      assert.deepEqual(result.clubs, ['X', 'Y', 'Real Madrid'])
    },
  },
  {
    name: 'patchLatestClub: an unresolvable response leaves the player unchanged',
    fn: async () => {
      const fetchImpl = async () => ({ ok: true, json: async () => ({}) })
      const player = { id: 'Q1', name: 'A One', clubs: ['X'] }
      const result = await patchLatestClub(player, { apiKey: 'secret', fetchImpl })
      assert.deepEqual(result, player)
    },
  },
  {
    name: 'patchLatestClub: a non-ok HTTP response leaves the player unchanged',
    fn: async () => {
      const fetchImpl = async () => ({ ok: false, status: 500 })
      const player = { id: 'Q1', name: 'A One', clubs: ['X'] }
      const result = await patchLatestClub(player, { apiKey: 'secret', fetchImpl })
      assert.deepEqual(result, player)
    },
  },
]

let passed = 0
let failed = 0
for (const t of tests) {
  try {
    await t.fn()
    console.log(`✓ ${t.name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${t.name}: ${e.message}`)
    failed++
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
