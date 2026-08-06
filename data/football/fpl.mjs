// Fantasy Premier League questions. Build-time only.
//
// SEASON-stamped, never gameweek-stamped. Verified 2026-08-06: bootstrap-static
// reports Gameweek 1 with is_current false, so there is no current gameweek to
// stamp against, and total_points still carries the COMPLETED 2025/26 season.
// Those totals reset on 21 Aug 2026 — a season stamp stays true through that,
// a gameweek stamp does not.
import { makeQuestion } from './templates.mjs'

export const FPL_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/'
export const USER_AGENT = 'wcg-bot-trivia-build/1.0 (https://github.com/philem247/wcg-bot)'

export const POSITIONS = { 1: 'goalkeeper', 2: 'defender', 3: 'midfielder', 4: 'forward' }

// Bench players nobody can name make for guessing, not trivia. Ownership is the
// cheapest available proxy for "recognisable" and is populated pre-season.
export const MIN_OWNERSHIP_PCT = 1.0

export async function fetchBootstrap({ url = FPL_URL, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`FPL ${res.status}`)
  return res.json()
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

  const named = players.filter((p) => p.web_name && POSITIONS[p.element_type])
  const recognisable = named.filter((p) => parseFloat(p.selected_by_percent ?? '0') >= MIN_OWNERSHIP_PCT)

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
      q: `Which club did ${playerName(p)} play for at the start of the ${s.squad} season?`,
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
