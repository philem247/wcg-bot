import assert from 'node:assert/strict'
import {
  buildCareerPaths,
  eligiblePlayers,
  surnameAlias,
  withAliases,
  mergeFplOverlay,
  patchLatestClub,
  MIN_CLUBS,
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
      const rows = [
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club X', start: '2010-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club Y', start: '2011-01-01' },
        { player: 'Q1', playerLabel: 'A B', clubLabel: 'Club X', start: '2012-01-01' },
      ]
      const [p] = buildCareerPaths(rows)
      // Not a "same club twice in a row" case — X, Y, X is 3 real transfers, all kept.
      assert.deepEqual(p.clubs, ['Club X', 'Club Y', 'Club X'])

      const consecutive = [
        { player: 'Q2', playerLabel: 'C D', clubLabel: 'Club X', start: '2010-01-01' },
        { player: 'Q2', playerLabel: 'C D', clubLabel: 'Club X', start: '2010-06-01' },
      ]
      const [p2] = buildCareerPaths(consecutive)
      assert.deepEqual(p2.clubs, ['Club X'], 'two rows for the same club back-to-back collapse to one')
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
        { id: 'Q1', name: 'Kylian Mbappe', clubs: ['X', 'Y', 'Z'] },
        { id: 'Q2', name: 'Pele', clubs: ['X', 'Y', 'Z'] },
      ])
      assert.deepEqual(a.aliases, ['Mbappe'])
      assert.deepEqual(b.aliases, [])
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
