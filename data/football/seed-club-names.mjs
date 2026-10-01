// One-off build script: seeds data/categories.json's five "Football clubs in
// <country>" Concentration categories with every club from that country's top
// 3 tiers, so genuine-but-obscure clubs (lower-division, less famous) hit the
// static bank match and never have to clear the validator's LLM judgment call.
// Network — untested by design, same rule as sparql.mjs/build-career-paths.mjs.
import { readFile, writeFile } from 'node:fs/promises'
import { runQuery } from './sparql.mjs'

// Confirmed live against Wikidata (see session notes) — top 3 tiers per country.
const COUNTRY_LEAGUE_TIERS = {
  'england-clubs':  ['Q9448', 'Q19510', 'Q19565'],   // Premier League, Championship, League One
  'spain-clubs':    ['Q324867', 'Q35615', 'Q100486747'], // La Liga, LaLiga 2, Primera Federación
  'italy-clubs':    ['Q15804', 'Q194052', 'Q607965'],    // Serie A, Serie B, Serie C
  'germany-clubs':  ['Q82595', 'Q152665', 'Q154069'],    // Bundesliga, 2. Bundesliga, 3. Liga
  'france-clubs':   ['Q13394', 'Q217374', 'Q864298'],    // Ligue 1, Ligue 2, National
}

// P118 (league) is a current-value property — catches whichever tier a club
// plays in today, which is exactly what "genuine obscure club" complaints are
// about (a real lower-tier club the bank's curated top-flight list omits).
//
// P118 is NOT club-only: individual players also carry it (their own current
// league), so ?club wdt:P118 wd:<league> alone pulls in thousands of player
// names. Q476028 = association football club (confirmed live) — the P31/P279*
// instance-of filter is required to keep this query club-only.
function clubsInLeagueQuery(leagueQid) {
  return `SELECT DISTINCT ?clubLabel WHERE {
  ?club wdt:P118 wd:${leagueQid} .
  ?club wdt:P31/wdt:P279* wd:Q476028 .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY ?clubLabel`
}

async function main() {
  const categoriesPath = 'data/categories.json'
  const categories = JSON.parse(await readFile(categoriesPath, 'utf8'))
  const byId = new Map(categories.map((c) => [c.id, c]))

  for (const [categoryId, leagueQids] of Object.entries(COUNTRY_LEAGUE_TIERS)) {
    const cat = byId.get(categoryId)
    if (!cat) { console.error(`  no category found for ${categoryId}, skipping`); continue }

    const names = new Set()
    for (const qid of leagueQids) {
      try {
        const rows = await runQuery(clubsInLeagueQuery(qid))
        for (const { clubLabel } of rows) {
          if (clubLabel && !/^Q\d+$/.test(clubLabel)) names.add(clubLabel.trim())
        }
        console.log(`  ${categoryId} / ${qid}: ${rows.length} rows`)
      } catch (e) {
        console.error(`  ${categoryId} / ${qid} FAILED: ${e.message}`)
      }
    }

    const existingLower = new Set(cat.items.map((i) => i.toLowerCase()))
    let added = 0
    for (const name of names) {
      if (existingLower.has(name.toLowerCase())) continue
      cat.items.push(name)
      existingLower.add(name.toLowerCase())
      added++
    }
    console.log(`  ${categoryId}: +${added} (now ${cat.items.length})`)
  }

  await writeFile(`${categoriesPath}.tmp`, JSON.stringify(categories, null, 2) + '\n')
  await import('node:fs/promises').then(({ rename }) => rename(`${categoriesPath}.tmp`, categoriesPath))
  console.log('\nWrote', categoriesPath)
}

main()
