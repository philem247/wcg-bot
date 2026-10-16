// Fixes trivia questions whose right answer can be spotted by its SHAPE —
// it lists several things ("Trey Parker and Matt Stone", "Rice, Tomatoes,
// Peppers", "Showing off / playing hard to get") when every decoy is a
// single item, or it is a long true description next to joke decoys
// ("Built entirely out of bamboo"). Players picked it without reading.
//
//   - Joke-decoy questions are removed. Their decoys never described
//     anything real, so there is nothing to rebalance; the matching
//     "Which X is described: ..." questions stay in the bank.
//   - "A / B" answers keep only the first alternative.
//   - Lists of people ("who created/founded/directed ...") keep one name —
//     any one of them is still a correct answer, and none of the decoys
//     names another of them.
//   - Other lists are trimmed to as many items as the decoys have.
//   - Titles that contain "and" or a comma ("Parks and Recreation",
//     "Love, Damini") are never split.
//   - Overlong descriptions are cut at their first clause break when what
//     remains still says the same thing.
//
// Run: node data/fix-shape-giveaways.mjs           (writes data/trivia.json)
//      node data/fix-shape-giveaways.mjs --dry-run (prints every change)
import { readFileSync, writeFileSync } from 'node:fs'

const PATH = 'data/trivia.json'
const DRY = process.argv.includes('--dry-run')

const JOKE_DECOYS = new Set([
  'Retired from sports after only one single match',
  'Competed exclusively in international equestrian dressage',
  'Refused to ever play in any championship or final',
  'Most yellow cards received',
  'Oldest debutant in history',
  'Fastest substitution in a match',
  'Built entirely out of bamboo',
  'Powered solely by steam turbines from 1850',
  'Designed exclusively for agricultural plowing',
  'Capable of photosynthesizing sunlight',
  'Possesses four separate hearts',
  'Lives exclusively on high mountain peaks',
  'Possesses wings and breathes underwater',
  'Feeds exclusively on volcanic rocks',
  'Lives entirely underground with no limbs',
  'Traveled exclusively in Europe',
  'Wrote the Quran',
  'Constructed the Colosseum',
  'Requires manual hand-crank charging',
  'Runs exclusively on vacuum tubes',
  'Uses floppy disks for all storage',
  'A reality dance competition show',
  'A cooking show hosted by children',
  'A silent nature documentary with no spoken words',
  'A simple 2D board game played with dice',
  'A VR cooking simulation game only',
  'A text-only typing tutor',
  'A documentary about live penguins',
])

// List separators: ", " (not a thousands comma), " and ", " & ", "/".
const SPLIT = /\s*(?:,(?!\d{3})|&|\band\b|\/)\s*/
const parts = (s) => s.split(SPLIT).map((x) => x.trim()).filter(Boolean)
const words = (s) => s.trim().split(/\s+/).length

// The answer is a title or a name that merely contains a separator.
const TITLE_Q = /\b(albums?|songs?|singles?|tracks?|films?|movies?|series|shows?|sitcoms?|soaps?|books?|novels?|poems?|plays?|bands?|groups?|duos?|games?|titles?|episodes?|anime|cartoons?|manga|brands?|compan(?:y|ies)|labels?|clubs?|teams?|stadiums?|competitions?|franchises?|nicktoons?|called|named|names?|nicknames?|motto|slogan|phrase|quote|line|lyrics?|catchphrase|words|writing|written|genres?|styles?|terms?|dances?|instruments?|process|steps|order|country|countries|nations?|where|born|located|capital|city|cities|island)\b/i
const PEOPLE_Q = /\b(who|whom|person\(s\)|which (?:individual|person|people|team|duo|pair|creators?|founders?|filmmaker|director))\b.*\b(creat|co-creat|found|direct|compos|wrote|writ|host|produc|invent|develop|design|helm|behind the camera)|\b(created|directed|founded|written|produced|composed|co-created) by whom\b/i
const STOP = new Set(['and', 'of', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'de', 'la', 'le', 'du', 'del', 'von', 'van', '&'])
// "Trinidad and Tobago", "Law & Order", "The Ren & Stimpy Show": every
// content word capitalised (or a leading "The") means a proper name.
const isProperName = (s) => /^The\s/.test(s) || s.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase())).every((w) => /^[\p{Lu}\d]/u.test(w))
const looksLikePerson = (s) => /^[\p{Lu}]/u.test(s) && words(s) <= 4

function standsOut(q) {
  const ci = parts(q.correct).length
  const wi = Math.max(...q.wrong.map((w) => parts(w).length))
  const cl = q.correct.length
  const wl = Math.max(...q.wrong.map((w) => w.length))
  return {
    list: (ci >= 2 && wi === 1) || (ci > wi && wi >= 2),
    long: cl >= 1.6 * wl && cl - wl >= 12,
    ci,
    wi,
    wl,
  }
}

// Cut "Captures what's on the screen and copies it to your clipboard" at
// its first clause break. Kept only if the result is a real phrase and no
// longer sticks out.
// Categories whose long answers are prose explanations, where "led the
// Israelites out of Egypt | and received the Ten Commandments" can lose its
// second half and still be the right answer.
const PROSE = new Set(['pidgin-english', 'health', 'bible', 'food', 'nigerian-food'])

function shorten(text, wl, cat) {
  // In prose, cut at " and " when the next word is lowercase: "Israel split
  // into Israel and Judah" keeps going (Judah is a name), "led the Israelites
  // out of Egypt and received ..." stops.
  if (PROSE.has(cat)) {
    const m = text.match(/\s+and\s+(?=\p{Ll})/u)
    // Not the "and" that closes a list (", and support"), and not one
    // joining a lone noun ("salt and lemon").
    if (m && !/,\s*$/.test(text.slice(0, m.index)) && words(text.slice(m.index + m[0].length)) >= 2) {
      const head = text.slice(0, m.index).trim()
      if (words(head) >= 3 && head.length < 1.6 * wl + 12 && !/\b(of|the|a|an|or|to|in|with|by|for|between)$/i.test(head) && !/\bbetween\b/i.test(head)) return head
    }
  }
  // Never at "and" ("Israel split into Israel | and Judah"), and never at a
  // comma that is part of a list ("duodenum, jejunum, and ileum").
  for (const re of [/\s+[—–]\s+/, /;\s*/, /,\s+(?!\d)/]) {
    const m = text.match(re)
    if (!m) continue
    const head = text.slice(0, m.index).trim()
    const rest = text.slice(m.index)
    if (m[0].startsWith(',') && /^,\s*[^,;]{1,25},|^,\s*(and|or)\b/.test(rest)) continue
    if (words(head) >= 3 && head.length < 1.6 * wl + 12 && !/\b(of|the|a|an|and|or|to|in|with|by|for)$/i.test(head)) return head
  }
  return null
}

const clash = (q, s) => q.wrong.some((w) => w.toLowerCase() === s.toLowerCase())

function fix(q, cat) {
  const jokes = q.wrong.filter((w) => JOKE_DECOYS.has(w)).length
  if (jokes >= 2) return { action: 'remove', why: 'joke decoys' }
  if (/correct is not applicable|did not;/i.test(q.correct)) return { action: 'remove', why: 'broken' }
  // Final scorers ("Ramos, Bale, Marcelo & Ronaldo") need every name:
  // fixed by hand in data/fix-football-easy-decoys.mjs.
  if (q.template === 'ucl-final-scorers') return null

  // "Who is Poseidon?" answered by a description, with NAMES as decoys —
  // flip it: describe the figure, ask for the name.
  const myth = q.q.match(/^In ancient world mythology, who is (.+)\?$/)
  if (myth && q.wrong.every((w) => words(w) <= 3) && words(q.correct) >= 4) {
    const desc = q.correct.split(/;\s*/)[0].replace(/\.$/, '')
    return { action: 'set', q: `In world mythology, who is the ${desc.charAt(0).toLowerCase()}${desc.slice(1)}?`, correct: myth[1], why: 'myth flip' }
  }

  const s = standsOut(q)
  if (!s.list && !s.long) return null
  const people = PEOPLE_Q.test(q.q)
  const titleQ = TITLE_Q.test(q.q) && !people

  // "A / B": the same thing said two ways, keep the first. Unspaced, both
  // sides must be 4+ letter words: "Efik/Ibibio" and "Europe/Asia" are
  // alternatives, "TCP/IP", "AC/DC", "PS/2", "and/or" are not.
  const spaced = /\s\/\s/.test(q.correct)
  const unspaced = /(^|[^\p{L}\d])\p{L}{4,}\/\p{L}{4,}($|[^\p{L}\d])/u.test(q.correct) && !/and\/or/i.test(q.correct)
  if ((spaced || unspaced) && !q.wrong.some((w) => w.includes('/')) && !titleQ) {
    const first = q.correct.split(spaced ? /\s+\/\s+/ : /\//)[0].trim()
    if (first.length >= 2 && !clash(q, first)) return { action: 'set', correct: first, why: 'slash' }
  }

  if (s.list) {
    const items = parts(q.correct)

    // Creators, founders, directors: any one of them is right.
    if (people && items.every(looksLikePerson)) {
      // The first name that no decoy already uses ("Bruce Timm and Eric
      // Radomski" next to a "Bruce Timm" decoy -> "Eric Radomski").
      for (let one of items) {
        // "Thomas and John Knoll" -> "Thomas Knoll", "Joel and Ethan Coen" -> "Joel Coen".
        if (words(one) === 1 && words(items[items.length - 1]) >= 2) one = `${one} ${items[items.length - 1].split(/\s+/).pop()}`
        if (!clash(q, one)) return { action: 'set', correct: one, why: 'one person' }
      }
    }

    // A real list: 3+ comma-separated short items ("Civic, Accord, CR-V, NSX").
    const commaItems = q.correct.split(/\s*,\s*(?!\d{3})/).map((x) => x.replace(/^(?:and|&)\s+/, '').trim()).filter(Boolean)
    // "Shadrach, Meshach, and Abednego" is a trio of names, not a list to trim —
    // unless the decoys are lists of names too (car lineups).
    const namesOnly = commaItems.every((x) => /^\p{Lu}\S*$/u.test(x))
    const decoysAreLists = q.wrong.some((w) => w.includes(','))
    // Two items, decoys single: "Melon Seeds, Leafy Vegetables" -> "Melon
    // Seeds". Not an adjective chain: "Scaly, itchy skin patches" is one thing.
    const two = q.correct.split(/\s*,\s*(?!\d{3})/)
    if (!titleQ && two.length === 2 && s.wi === 1 && two.every((x) => words(x) <= 3)) {
      const [a, b] = two
      const adjectiveChain = words(a) === 1 && words(b) >= 2
      const nameOnly = /^\p{Lu}\S*$/u.test(a) && /^\p{Lu}\S*$/u.test(b) && !PROSE.has(cat)
      if (!adjectiveChain && !nameOnly && !clash(q, a)) return { action: 'set', correct: a, why: 'list to 1' }
    }

    // "Composed of duodenum, jejunum, and ileum" is one phrase with a list
    // tucked inside it: the first item carries a lead-in the others lack.
    const leadIn = words(commaItems[0]) > Math.max(...commaItems.slice(1).map(words)) + 1
    // "An influential, wealthy, generous, or respected figure": the first item
    // is an adjective waiting for its noun, not an item on its own.
    const ADJ = /(?:al|ful|ous|able|ible|ive|ic|less|ant|ent|ed)$/i
    const danglingAdjective = ADJ.test(commaItems[0].split(/\s+/).pop())
    if (!titleQ && !leadIn && !danglingAdjective && commaItems.length >= 3 && commaItems.every((x) => words(x) <= 4) && (!namesOnly || decoysAreLists)) {
      const keep = Math.max(1, s.wi)
      if (commaItems.length > keep) {
        const trimmed = commaItems.slice(0, keep).join(', ')
        if (!clash(q, trimmed)) return { action: 'set', correct: trimmed, why: `list to ${keep}` }
      }
    }

    // A short pair: "Fire and brimstone", "Memory loss and cognitive decline".
    const pair = q.correct.split(/\s+(?:and|&)\s+/)
    // Only plain lowercase phrases: a capital mid-answer ("Special Weapons
    // and Tactics team") means it's a name. A one-word half only when the
    // other is one word too — "Ball and socket joint" is one thing.
    const plain = !/\s\p{Lu}/u.test(q.correct)
    if (!titleQ && !people && plain && pair.length === 2 && words(q.correct) <= 6 && !q.correct.includes(',')) {
      const [a, b] = pair.map((x) => x.trim())
      if ((words(a) >= 2 || words(b) === 1) && !clash(q, a)) return { action: 'set', correct: a, why: 'pair' }
    }
  }

  if (s.long && !titleQ && !isProperName(q.correct)) {
    const head = shorten(q.correct, s.wl, cat)
    if (head && !clash(q, head)) return { action: 'set', correct: head, why: 'shorten' }
  }

  return { action: 'review', why: s.list ? 'list (left)' : 'long (left)' }
}

const trivia = JSON.parse(readFileSync(PATH, 'utf8'))

// Health's "which body system" answers were the only two-part options
// ("Heart & Blood Vessels"). Say it as one term everywhere — and drop any
// decoy that is now part of the right answer (Heart is in the cardiovascular
// system, so it can't sit beside it as a "wrong" choice).
const SYSTEMS = {
  'Heart & Blood Vessels': { name: 'Cardiovascular system', parts: ['heart', 'blood', 'blood vessels'] },
  'Brain & Spinal Cord': { name: 'Nervous system', parts: ['brain', 'spinal cord', 'nerves'] },
}
const SPARE_ORGANS = ['Lungs', 'Liver', 'Skin', 'Pancreas', 'Stomach', 'Eyes', 'Bones']
let renamed = 0
for (const q of trivia.categories.health ?? []) {
  const before = JSON.stringify(q)
  q.wrong = q.wrong.map((w) => SYSTEMS[w]?.name ?? w)
  const sys = SYSTEMS[q.correct]
  if (sys) {
    q.correct = sys.name
    q.wrong = q.wrong.map((w) => {
      if (!sys.parts.includes(w.trim().toLowerCase())) return w
      return SPARE_ORGANS.find((o) => ![q.correct, ...q.wrong].includes(o)) ?? w
    })
  }
  if (JSON.stringify(q) !== before) renamed++
}

// A decoy that is one part of the answer ("Europe" next to "Europe/Asia",
// "Erik Cassel" next to "David Baszucki and Erik Cassel") makes the fuller
// option the obvious pick. Extend that decoy into a different combination
// of the same size, borrowing items from the other decoys: "Europe/South
// America". Partly right, wholly wrong — a real double take.
const lower = (s) => s.trim().toLowerCase()
let partDecoys = 0
for (const questions of Object.values(trivia.categories)) {
  for (const q of questions) {
    const items = parts(q.correct).map(lower)
    if (items.length < 2) continue
    const sep = (q.correct.match(/\s\/\s|\/|\s&\s|\sand\s|,\s/) ?? ['/'])[0]
    q.wrong = q.wrong.map((w) => {
      if (!items.includes(lower(w))) return w
      const taken = new Set([q.correct, ...q.wrong].map(lower))
      const spare = q.wrong.flatMap(parts).filter((x) => !items.includes(lower(x)))
      for (const extra of spare) {
        const alt = `${w}${sep}${extra}`
        if (!taken.has(lower(alt))) {
          partDecoys++
          if (DRY) console.log(`* ${q.q}\n     decoy ${w} -> ${alt}   (answer ${q.correct})`)
          return alt
        }
      }
      return w
    })
  }
}

const counts = { 'health systems': renamed, 'part decoy': partDecoys }
let review = []
// One fix can expose another (a shortened description that is now a list),
// so repeat until a pass changes nothing.
for (let pass = 0, changed = true; changed && pass < 5; pass++) {
changed = false
review = []
delete counts['list (left)']
delete counts['long (left)']
for (const [cat, questions] of Object.entries(trivia.categories)) {
  trivia.categories[cat] = questions.filter((q) => {
    const r = fix(q, cat)
    if (!r) return true
    counts[r.why] = (counts[r.why] ?? 0) + 1
    if (r.action === 'remove') {
      if (DRY) console.log(`- [${cat}] ${q.q}`)
      changed = true
      return false
    }
    if (r.action === 'review') {
      review.push(`[${cat}] ${q.q} ✔ ${q.correct} ✘ ${q.wrong.join(' | ')}`)
      return true
    }
    if (DRY) console.log(`~ [${cat}] (${r.why}) ${r.q ?? q.q}\n     ${q.correct}  ->  ${r.correct}   ✘ ${q.wrong.join(' | ')}`)
    if (r.q) q.q = r.q
    q.correct = r.correct
    changed = true
    return true
  })
}
}
if (DRY) {
  console.log(`\n--- left for review (${review.length}) ---\n${review.join('\n')}`)
} else {
  writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
}
console.log(JSON.stringify(counts))
