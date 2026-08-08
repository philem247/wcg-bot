// Fantasy Premier League questions. Build-time only.
//
// SEASON-stamped, never gameweek-stamped. Verified 2026-08-06: bootstrap-static
// reports Gameweek 1 with is_current false, so there is no current gameweek to
// stamp against, and total_points still carries the COMPLETED 2025/26 season.
// Those totals reset on 21 Aug 2026 — a season stamp stays true through that,
// a gameweek stamp does not.
import { makeQuestion } from './templates.mjs'
import { MIN_YEAR } from './queries.mjs'

export const FPL_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/'
export const USER_AGENT = 'wcg-bot-trivia-build/1.0 (https://github.com/philem247/wcg-bot)'

// One CSV per completed season instead of one request per player. Verified
// live 2026-08-06: 2021-22 Salah 265, 2022-23 Haaland 272, 2023-24 Palmer 244,
// 2024-25 Salah 344 — matches known FPL history.
export const VAASTAV_BASE = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data'
export const VAASTAV_START_YEAR = 2016
export const vaastavUrl = (season) => `${VAASTAV_BASE}/${season}/cleaned_players.csv`

// No ownership column in the historical CSVs — minutes played is the
// available recognisability proxy: a cameo player who scored once in stoppage
// time is as unguessable as the pre-notability-filter Wikidata journeymen were.
export const FPL_MIN_MINUTES = 900

export const POSITIONS = { 1: 'goalkeeper', 2: 'defender', 3: 'midfielder', 4: 'forward' }

// Bench players nobody can name make for guessing, not trivia. Ownership is the
// cheapest available proxy for "recognisable" and is populated pre-season.
export const MIN_OWNERSHIP_PCT = 1.0

export async function fetchBootstrap({ url = FPL_URL, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`FPL ${res.status}`)
  return res.json()
}

// Ownership is the cheapest available "recognisable" proxy for the CURRENT
// season, where FPL's own ownership stat exists. Historical vaastav CSVs have
// no such column — fplSeasonQuestions/fplGoalsQuestions below use minutes
// played (FPL_MIN_MINUTES) as their recognisability gate instead.
export function recognisablePlayers(bootstrap) {
  const players = bootstrap.elements ?? []
  const named = players.filter((p) => p.web_name && POSITIONS[p.element_type])
  return named.filter((p) => parseFloat(p.selected_by_percent ?? '0') >= MIN_OWNERSHIP_PCT)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Minimal CSV line parser — vaastav's cleaned_players.csv quotes fields that
// contain commas, so a bare split(',') misaligns every column after one.
function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cur += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = cells[i] })
    return row
  })
}

// Season folder strings like "2016-17".."2025-26", from VAASTAV_START_YEAR
// through the last COMPLETED season reported by bootstrap-static — never the
// season that hasn't been played yet. Verified live: the un-started season's
// folder mirrors the prior season's final totals (both 2025-26 and 2026-27
// reported Haaland on 239 points), so reading it would attribute last
// season's numbers to a season nobody has played.
export function seasonFolders(bootstrap) {
  const s = seasons(bootstrap)
  if (!s) return [] // cannot date the season: caller must skip
  const lastYear = parseInt(s.stats, 10)
  if (Number.isNaN(lastYear)) return []
  const out = []
  for (let y = Math.max(VAASTAV_START_YEAR, MIN_YEAR); y <= lastYear; y++) {
    out.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`)
  }
  return out
}

// Serial with a delay, same etiquette as sparql.mjs's Wikidata calls — this
// is still a shared public repo. One season's fetch failing (renamed folder,
// transient error) is skipped, not fatal to the build.
export async function fetchSeasons(seasonFolderList, { fetchImpl = fetch, delayMs = 1000, urlFor = vaastavUrl } = {}) {
  const out = new Map() // "2022-23" -> parsed CSV rows
  for (const season of seasonFolderList) {
    try {
      const res = await fetchImpl(urlFor(season), { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) throw new Error(`vaastav ${season} ${res.status}`)
      out.set(season, parseCsv(await res.text()))
    } catch (e) {
      console.error(`  vaastav ${season} FAILED: ${e.message}`)
    }
    await sleep(delayMs)
  }
  return out
}

// Two different seasons live in one payload: squad data (team, position) is for
// the season about to start, while total_points still holds the COMPLETED season
// until the reset. Inferring this from "are any points non-zero" breaks the moment
// the new season's first goal is scored — use the fixture list, which says plainly
// whether any gameweek has finished.
export function seasons(bootstrap) {
  const events = bootstrap.events ?? []
  const first = events[0]
  if (!first?.deadline_time) return null // cannot date the season: caller must skip
  const squadStart = new Date(first.deadline_time).getUTCFullYear()
  const started = events.some((e) => e.finished)
  const statsStart = started ? squadStart : squadStart - 1
  const label = (y) => `${y}/${String((y + 1) % 100).padStart(2, '0')}`
  return { squad: label(squadStart), stats: label(statsStart) }
}

export function seasonLabel(bootstrap) {
  return seasons(bootstrap)?.stats ?? null
}

function playerName(p) {
  const full = [p.first_name, p.second_name].filter(Boolean).join(' ')
  return full || p.web_name
}

export function fplQuestions(bootstrap, { random }) {
  const s = seasons(bootstrap)
  if (!s) return [] // never guess a season

  const players = bootstrap.elements ?? []
  const teamById = new Map((bootstrap.teams ?? []).map((t) => [t.id, t.name]))
  const out = []

  const recognisable = recognisablePlayers(bootstrap)

  // Position classification. FPL's own labelling is the point — it is what makes
  // these questions distinct from general football trivia.
  for (const p of recognisable) {
    const q = makeQuestion({
      q: `In the ${s.squad} season, which position did FPL classify ${playerName(p)} as?`,
      correct: POSITIONS[p.element_type],
      pool: Object.values(POSITIONS),
      league: 'fpl',
      random,
      template: 'fpl-position',
    })
    if (q) out.push(q)
  }

  // Club membership. Stamped "at the start of" so a mid-season transfer doesn't
  // retroactively falsify it.
  for (const p of recognisable) {
    const club = teamById.get(p.team)
    if (!club) continue
    const q = makeQuestion({
      q: `Which club does ${playerName(p)} play for in the ${s.squad} season?`,
      correct: club,
      pool: [...teamById.values()],
      league: 'fpl',
      random,
      template: 'fpl-club',
    })
    if (q) out.push(q)
  }

  // Top scorer — only when there is real points data. All-zero totals (the state
  // right after a season rolls over) would give four equally correct answers.
  const scored = players.filter((p) => (p.total_points ?? 0) > 0)
  if (scored.length >= 4) {
    const ranked = [...scored].sort((a, b) => b.total_points - a.total_points)
    const top = ranked[0]
    if (ranked[1] && ranked[1].total_points < top.total_points) {
      const q = makeQuestion({
        q: `Who scored the most FPL points in the ${s.stats} season?`,
        correct: playerName(top),
        pool: ranked.slice(1, 12).map((p) => playerName(p)),
        league: 'fpl',
        random,
        template: 'fpl-points',
      })
      if (q) out.push(q)
    }
  }

  return out
}

function csvName(row) {
  const full = [row.first_name, row.second_name].filter(Boolean).join(' ')
  return full || null
}

function csvInt(row, field) {
  const n = parseInt(row[field], 10)
  return Number.isNaN(n) ? 0 : n
}

// "2022-23" (vaastav folder) -> "2022/23" (rest of the bank's season format).
function seasonDisplay(folder) {
  return folder.replace('-', '/')
}

// Questions built from vaastav's per-season CSVs — real completed seasons, so
// they stay true through a rollover regardless of when the bank is built.
// bySeasonCsv: Map<"2022-23", parsed CSV rows>, from fetchSeasons(seasonFolders(bootstrap)).
// "Which of these players scored the most FPL points in the <season> season?"
export function fplSeasonQuestions(bySeasonCsv, { random }) {
  const out = []
  for (const [folder, rows] of bySeasonCsv) {
    const season = seasonDisplay(folder)
    const players = rows
      .filter((r) => csvInt(r, 'minutes') >= FPL_MIN_MINUTES)
      .map((r) => ({ name: csvName(r), points: csvInt(r, 'total_points') }))
      .filter((r) => r.name && r.points > 0)
    if (players.length < 4) continue
    const ranked = [...players].sort((a, b) => b.points - a.points)
    if (ranked[1].points === ranked[0].points) continue // ambiguous top
    const q = makeQuestion({
      q: `Which of these players scored the most FPL points in the ${season} season?`,
      correct: ranked[0].name,
      pool: players.map((p) => p.name),
      league: 'fpl',
      random,
      template: 'fpl-season-top',
    })
    if (q) out.push(q)
  }
  return out
}

// "How many goals did <player> score in the <season> season?" — distractors
// are other players' real goal totals from the same season, so every option
// is a number someone actually posted that year.
export function fplGoalsQuestions(bySeasonCsv, { random }) {
  const out = []
  for (const [folder, rows] of bySeasonCsv) {
    const season = seasonDisplay(folder)
    const players = rows
      .filter((r) => csvInt(r, 'minutes') >= FPL_MIN_MINUTES)
      .map((r) => ({ name: csvName(r), goals: csvInt(r, 'goals_scored') }))
      .filter((r) => r.name)
    const allCounts = players.map((p) => String(p.goals))
    for (const { name, goals } of players) {
      if (goals <= 0) continue // zero is the modal value and makes a weak fact
      const q = makeQuestion({
        q: `How many goals did ${name} score in the ${season} season?`,
        correct: String(goals),
        pool: allCounts,
        league: 'fpl',
        random,
        template: 'fpl-goals',
      })
      if (q) out.push(q)
    }
  }
  return out
}

const CSV_POS = { GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', FWD: 'forward' }

export function fplSeasonPositionQuestions(bySeasonCsv, { random }) {
  const out = []
  for (const [folder, rows] of bySeasonCsv) {
    const season = seasonDisplay(folder)
    const players = rows
      .filter((r) => csvInt(r, 'minutes') >= FPL_MIN_MINUTES)
      .map((r) => ({ name: csvName(r), pos: r.element_type }))
      .filter((r) => r.name && CSV_POS[r.pos])
    
    for (const p of players) {
      const q = makeQuestion({
        q: `In the ${season} season, which position did FPL classify ${p.name} as?`,
        correct: CSV_POS[p.pos],
        pool: Object.values(CSV_POS),
        league: 'fpl',
        random,
        template: 'fpl-past-position',
      })
      if (q) out.push(q)
    }
  }
  return out
}

export function fplAssistsQuestions(bySeasonCsv, { random }) {
  const out = []
  for (const [folder, rows] of bySeasonCsv) {
    const season = seasonDisplay(folder)
    const players = rows
      .filter((r) => csvInt(r, 'minutes') >= FPL_MIN_MINUTES)
      .map((r) => ({ name: csvName(r), assists: csvInt(r, 'assists') }))
      .filter((r) => r.name)
    const allCounts = players.map((p) => String(p.assists))
    for (const { name, assists } of players) {
      if (assists <= 0) continue 
      const q = makeQuestion({
        q: `How many assists did ${name} provide in the ${season} season?`,
        correct: String(assists),
        pool: allCounts,
        league: 'fpl',
        random,
        template: 'fpl-assists',
      })
      if (q) out.push(q)
    }
  }
  return out
}

export function fplCleanSheetsQuestions(bySeasonCsv, { random }) {
  const out = []
  for (const [folder, rows] of bySeasonCsv) {
    const season = seasonDisplay(folder)
    const players = rows
      .filter((r) => csvInt(r, 'minutes') >= FPL_MIN_MINUTES)
      .map((r) => ({ name: csvName(r), clean_sheets: csvInt(r, 'clean_sheets') }))
      .filter((r) => r.name)
    const allCounts = players.map((p) => String(p.clean_sheets))
    for (const { name, clean_sheets } of players) {
      if (clean_sheets <= 0) continue 
      const q = makeQuestion({
        q: `How many clean sheets did ${name} keep in the ${season} season?`,
        correct: String(clean_sheets),
        pool: allCounts,
        league: 'fpl',
        random,
        template: 'fpl-cleansheets',
      })
      if (q) out.push(q)
    }
  }
  return out
}
