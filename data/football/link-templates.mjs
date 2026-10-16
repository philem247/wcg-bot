// Harder football questions built from data/football/career-paths.json:
// "which club links these two players?" and "which player links these two
// clubs?". Both are pure (players in, questions out, randomness injected) like
// templates.mjs, and both pick decoys that are genuinely tempting — every
// wrong option is a club one of the two players DID play for, or a player who
// DID play for one of the two clubs. Knowing one half is never enough.
import { makeQuestion } from './templates.mjs'

// Wikidata labels read like legal names ("Real Madrid Club de Fútbol",
// "Manchester United F.C."). Players say "Real Madrid", "Manchester United".
const CLUB_NAMES = {
  'Real Madrid Club de Fútbol': 'Real Madrid',
  'FC Bayern Munich': 'Bayern Munich',
  'Paris Saint-Germain FC': 'Paris Saint-Germain',
  'S.L. Benfica': 'Benfica',
  'Fenerbahçe Istanbul': 'Fenerbahçe',
  'Galatasaray S.K.': 'Galatasaray',
  'Beşiktaş J.K.': 'Beşiktaş',
  'SSC Napoli': 'Napoli',
  'SS Lazio': 'Lazio',
  'ACF Fiorentina': 'Fiorentina',
  'U.C. Sampdoria': 'Sampdoria',
  'Parma Calcio 1913': 'Parma',
  'Genoa CFC': 'Genoa',
  'Atalanta BC': 'Atalanta',
  'Udinese Calcio': 'Udinese',
  'Cagliari Calcio': 'Cagliari',
  'Bologna F.C. 1909': 'Bologna',
  'Hellas Verona FC': 'Hellas Verona',
  'Palermo F.C.': 'Palermo',
  'AS Monaco FC': 'Monaco',
  'Olympique de Marseille': 'Marseille',
  'Olympique Lyonnais': 'Lyon',
  'Lille OSC': 'Lille',
  'FC Girondins de Bordeaux': 'Bordeaux',
  'Stade Rennais F.C.': 'Rennes',
  'OGC Nice': 'Nice',
  'AS Saint-Étienne': 'Saint-Étienne',
  'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  'SV Werder Bremen': 'Werder Bremen',
  'TSG 1899 Hoffenheim': 'Hoffenheim',
  'Feyenoord Rotterdam': 'Feyenoord',
  'AFC Ajax': 'Ajax',
  'RCD Espanyol de Barcelona': 'Espanyol',
  'Deportivo de A Coruña': 'Deportivo La Coruña',
  'RC Celta de Vigo': 'Celta Vigo',
  'Real Betis Balompié': 'Real Betis',
  'Club Atlético Osasuna': 'Osasuna',
  'Clube de Regatas do Flamengo': 'Flamengo',
  'S.C. Corinthians Paulista': 'Corinthians',
  'Sociedade Esportiva Palmeiras': 'Palmeiras',
  'Grêmio FBPA': 'Grêmio',
  'Clube Atlético Mineiro': 'Atlético Mineiro',
  'S.C. Internacional': 'Internacional',
  'Cruzeiro E.C.': 'Cruzeiro',
  'Club Atlético River Plate': 'River Plate',
  'GNK Dinamo Zagreb': 'Dinamo Zagreb',
  'HNK Hajduk Split': 'Hajduk Split',
  'FK Crvena zvezda': 'Red Star Belgrade',
  'FC Zenit Saint Petersburg': 'Zenit Saint Petersburg',
  'R.S.C. Anderlecht': 'Anderlecht',
  'Olympiacos F.C.': 'Olympiacos',
  'AEK Athens F.C.': 'AEK Athens',
  'Al Hilal SFC': 'Al Hilal',
  'Como 1907': 'Como',
  '1. FC Union Berlin': 'Union Berlin',
  '1. FC Köln': 'Köln',
  '1. FSV Mainz 05': 'Mainz',
  '1. FC Nürnberg': 'Nürnberg',
  '1. FC Kaiserslautern': 'Kaiserslautern',
  'Stade Brestois 29': 'Brest',
  'Montpellier Hérault Sport Club': 'Montpellier',
  'En Avant de Guingamp': 'Guingamp',
  'RC Strasbourg Alsace': 'Strasbourg',
  'US Sassuolo Calcio': 'Sassuolo',
  'US Lecce': 'Lecce',
  'Bayern München': 'Bayern Munich',
  'Paris FC': 'Paris FC', // not "Paris" — reads like a typo for Paris Saint-Germain
}

export function shortClub(label) {
  const s = String(label ?? '').replace(/\s*\(loan\)$/, '').trim()
  if (CLUB_NAMES[s]) return CLUB_NAMES[s]
  return s
    .replace(/\s+(F\.C\.|FC|A\.F\.C\.|AFC|C\.F\.|CF)$/, '')
    .replace(/^(FC|AFC|F\.C\.|A\.F\.C\.)\s+/, '')
    .trim()
}

// Reserve, B and youth sides share a name with the senior club, so "played
// for Real Madrid Castilla" must not count as "played for Real Madrid" — or as
// a club of its own in these questions.
const RESERVE = /\b(B|II|III|U-?\d{2}|Castilla|Reserves?|Juvenil|Atlètic|Primavera|Jong|Youth|Academy|Under-\d{2})\b/i
export function isReserveSide(label) {
  return RESERVE.test(String(label ?? '').replace(/\s*\(loan\)$/, ''))
}

// player -> Set of short club names, senior sides only. A name two pool
// players share (two different "Ronaldo"s) would make a question ambiguous,
// so those players are left out entirely.
function clubSets(players) {
  const count = new Map()
  for (const p of players) count.set(p.name, (count.get(p.name) ?? 0) + 1)
  return players.filter((p) => count.get(p.name) === 1).map((p) => ({
    name: p.name,
    clubs: new Set(p.clubs.filter((c) => !isReserveSide(c)).map(shortClub)),
  }))
}

// Clubs at least `minPlayers` pool players appeared for — the well-known ones.
function famousClubs(sets, minPlayers) {
  const count = new Map()
  for (const { clubs } of sets) for (const c of clubs) count.set(c, (count.get(c) ?? 0) + 1)
  return new Set([...count].filter(([, n]) => n >= minPlayers).map(([c]) => c))
}

// "Which club have both Samuel Eto'o and Claudio Pizarro played for?"
// Only pairs that share EXACTLY one club (so one right answer), and only when
// three of their other clubs are well known enough to be convincing decoys.
export function clubLinkQuestions(players, { random, minPlayers = 20, max = 300, perPlayer = 2 } = {}) {
  const sets = clubSets(players)
  const famous = famousClubs(sets, minPlayers)
  const eligible = sets.filter((p) => [...p.clubs].filter((c) => famous.has(c)).length >= 3)
  const used = new Map() // player -> times used
  const out = []
  const seen = new Set()
  // Shuffled pair walk, deterministic for a given `random`.
  const order = eligible.map((p, i) => [random(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => eligible[i])
  for (let i = 0; i < order.length && out.length < max; i++) {
    for (let j = i + 1; j < order.length && out.length < max; j++) {
      const a = order[i]
      const b = order[j]
      if ((used.get(a.name) ?? 0) >= perPlayer || (used.get(b.name) ?? 0) >= perPlayer) continue
      const shared = [...a.clubs].filter((c) => b.clubs.has(c))
      if (shared.length !== 1 || !famous.has(shared[0])) continue
      const decoys = [...new Set([...a.clubs, ...b.clubs])].filter((c) => c !== shared[0] && famous.has(c))
      if (decoys.length < 3) continue
      const q = makeQuestion({
        q: `Which club have both ${a.name} and ${b.name} played for?`,
        correct: shared[0],
        pool: decoys,
        league: 'other',
        random,
        template: 'club-link',
      })
      if (!q || seen.has(q.id)) continue
      seen.add(q.id)
      out.push(q)
      used.set(a.name, (used.get(a.name) ?? 0) + 1)
      used.set(b.name, (used.get(b.name) ?? 0) + 1)
    }
  }
  return out
}

// "Which of these players has played for both Inter Milan and Arsenal?"
// The decoys each played for one of the two clubs, never both.
export function bothClubsQuestions(players, { random, minPlayers = 30, max = 300, perPair = 1 } = {}) {
  const sets = clubSets(players)
  const famous = [...famousClubs(sets, minPlayers)].sort()
  const out = []
  const seen = new Set()
  const pairs = []
  for (let i = 0; i < famous.length; i++) for (let j = i + 1; j < famous.length; j++) pairs.push([famous[i], famous[j]])
  const shuffledPairs = pairs.map((p) => [random(), p]).sort((x, y) => x[0] - y[0]).map(([, p]) => p)
  for (const [x, y] of shuffledPairs) {
    if (out.length >= max) break
    const both = sets.filter((p) => p.clubs.has(x) && p.clubs.has(y))
    const onlyX = sets.filter((p) => p.clubs.has(x) && !p.clubs.has(y))
    const onlyY = sets.filter((p) => p.clubs.has(y) && !p.clubs.has(x))
    if (both.length === 0 || onlyX.length < 2 || onlyY.length < 2) continue
    for (let k = 0; k < Math.min(perPair, both.length); k++) {
      const correct = both[Math.floor(random() * both.length)].name
      // Two decoys from one club and one from the other, so neither club alone
      // is enough to rule them out.
      const pickTwoFromX = random() < 0.5
      const bigSide = pickTwoFromX ? onlyX : onlyY
      const smallSide = pickTwoFromX ? onlyY : onlyX
      const pool = [...pick(bigSide, 2, random), ...pick(smallSide, 1, random)].map((p) => p.name)
      const q = makeQuestion({
        q: `Which of these players has played for both ${x} and ${y}?`,
        correct,
        pool,
        league: 'other',
        random,
        template: 'both-clubs',
      })
      if (!q || seen.has(q.id)) continue
      seen.add(q.id)
      out.push(q)
    }
  }
  return out
}

function pick(list, n, random) {
  const copy = list.slice()
  const out = []
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(random() * copy.length), 1)[0])
  return out
}

// Small seeded PRNG so a rebuild produces the same questions (stable ids, so
// groups' "already asked" history keeps working across rebuilds).
export function seededRandom(seed = 20261016) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
