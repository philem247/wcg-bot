// Thins out question families that ask ONE fact several ways (2026-10).
// "Who directed Pulp Fiction?", "Which filmmaker was behind the camera for
// Pulp Fiction?", "The movie Pulp Fiction was directed by whom?" and "Which
// famous director is known for helming Pulp Fiction?" are four questions,
// one fact. Every animal was asked its class four ways and its habitat four
// ways. Groups saw the same fact again and again.
//
// Each subject keeps ONE phrasing per family, picked by a seeded draw so
// different subjects keep different phrasings. A phrasing whose decoys are
// also right ("Africa/Asia" for an "Asia/Africa/Americas" answer, "Nigeria
// (West Africa)" for "Nigeria") is never the one kept.
//
// Also removes "Which West African nation is renowned for <dish>?", whose
// answer was a region of Nigeria with "Nigeria" itself among the decoys,
// and the regional questions that offer "Nigeria" or "West Africa" as a
// wrong answer.
//
// Idempotent: once a family has one member per subject there is nothing
// left to drop. Run: node data/fix-template-repeats.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { seededRandom } from './football/link-templates.mjs'

const PATH = 'data/trivia.json'

// category -> family -> phrasings, each capturing the subject.
const FAMILIES = {
  food: {
    origin: [/^Which country is widely known as the origin of (.+)\?$/, /^Where did the popular dish (.+) originally come from\?$/, /^Which nation is most associated with creating (.+)\?$/],
    ingredients: [/^What are the primary ingredients or characteristics of (.+)\?$/, /^Which of the following describes the main components of (.+)\?$/, /^If you order (.+), you are likely to be served a dish primarily consisting of:$/],
  },
  'nigerian-food': {
    ingredients: [/^What is the primary ingredient or component of the Nigerian dish (.+)\?$/, /^To prepare the traditional dish (.+), you would definitely need:$/, /^The core base of (.+) is primarily made from:$/],
  },
  animals: {
    class: [/^What type of animal classification is an? (.+)\?$/, /^An? (.+) is best described as a:$/, /^Which biological classification applies to the (.+)\?$/, /^In the animal kingdom, the (.+) is categorized as a:$/],
    habitat: [/^Which of these regions is the native habitat of the (.+)\?$/, /^If you were looking for an? (.+) in the wild, where would you go\?$/, /^The (.+) is natively found in which part of the world\?$/, /^What is the natural geographical range of the (.+)\?$/],
  },
  sports: {
    sport: [/^With which sport is (.+) associated\?$/, /^Which sport is (.+) famous for playing\?$/, /^The athlete (.+) made their name competing in which sport\?$/, /^If you were watching (.+) perform professionally, what sport would it be\?$/],
    role: [/^What position or role is (.+) most famously associated with in their sport\?$/, /^When competing, (.+) is best known for which specific role or position\?$/, /^Which of these describes the sporting role of (.+)\?$/],
  },
  cartoons: {
    creator: [/^Who is the creator of the animated series (.+)\?$/, /^The popular cartoon (.+) was created by whom\?$/, /^Which individual or team is credited with creating (.+)\?$/, /^Who created the iconic animated series (.+)\?$/],
    setting: [/^In which fictional town or setting does (.+) primarily take place\?$/, /^Where is the primary setting for the cartoon (.+)\?$/, /^The events of (.+) largely occur in which fictional location\?$/],
    pet: [/^What is the name of the notable pet or animal companion in (.+)\?$/, /^Which famous animal\/pet appears alongside the main characters in (.+)\?$/],
    byCreator: [/^Which of these animated series was created by (.+)\?$/, /^(.+) is famously known for creating which of these cartoons\?$/, /^If you were watching a show created by (.+), which of these could it be\?$/],
  },
  'tv-shows': {
    network: [/^Which television network originally aired (.+)\?$/, /^The hit TV show (.+) premiered on which network\?$/, /^Where could you originally watch the series (.+)\?$/],
    setting: [/^In which city or setting does (.+) primarily take place\?$/, /^Where does the main plot of (.+) primarily occur\?$/, /^The TV series (.+) is famously set in which location\?$/],
    creator: [/^Who is the creator or showrunner of (.+)\?$/, /^Which television writer\/producer created (.+)\?$/, /^The television series (.+) was created by whom\?$/],
  },
  movies: {
    director: [/^Who directed the critically acclaimed film (.+)\?$/, /^Which famous director is known for helming (.+)\?$/, /^The movie (.+) was directed by whom\?$/, /^Which filmmaker was behind the camera for (.+)\?$/],
    year: [/^In what year was the movie (.+) released\?$/, /^When did the film (.+) first hit theaters\?$/, /^What is the release year of (.+)\?$/],
    actor: [/^Which famous actor starred as the lead in (.+)\?$/, /^Who played a major leading role in (.+)\?$/, /^Which of these actors had a starring role in (.+)\?$/],
  },
}

const REMOVE = {
  'nigerian-food': [/^Which West African nation is renowned globally for the traditional staple /],
}
// A regional answer ("South-South Nigeria") with the whole country among the decoys.
const REGION_Q = /^The dish .+ is traditionally indigenous to which part of /
const WHOLE = new Set(['nigeria', 'west africa'])

// Questions that shipped with no decoys at all, and one whose answer is doubtful.
const FILL = {
  '9ea9fc70-07ab-4752-8abf-deba5f127393': ['4005', '4012', '4018'], // Big Boy 4014
  '64f6d9b9660c3a8d960101e2': ['2000', '4000', '5000'], // André 3000
}
const DOUBTFUL = new Set(['1959f21a7278']) // "Ofong" as the Efik word for soup

const lower = (s) => s.trim().toLowerCase()
const regions = (s) => s.split('/').map(lower)
// A decoy that is also right: shares a slash part with the answer, or is the
// answer with a qualifier ("Nigeria (West Africa)", "Mammal (Monotreme)").
function coCorrect(q) {
  const c = lower(q.correct)
  const cParts = new Set(regions(q.correct))
  return q.wrong.some((w) => {
    const lw = lower(w)
    if (lw.startsWith(`${c} (`) || c.startsWith(`${lw} (`)) return true
    return cParts.size > 1 && regions(w).some((p) => cParts.has(p))
  })
}

const seedOf = (s) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7)
const trivia = JSON.parse(readFileSync(PATH, 'utf8'))
const stats = {}

for (const [cat, questions] of Object.entries(trivia.categories)) {
  const drop = new Set()
  for (const q of questions) {
    if (FILL[q.id] && !q.wrong.length) q.wrong = FILL[q.id]
    if (DOUBTFUL.has(q.id)) drop.add(q.id)
    if ((REMOVE[cat] ?? []).some((re) => re.test(q.q))) drop.add(q.id)
    if (REGION_Q.test(q.q) && q.wrong.some((w) => WHOLE.has(lower(w)))) drop.add(q.id)
  }
  for (const [family, phrasings] of Object.entries(FAMILIES[cat] ?? {})) {
    const bySubject = new Map()
    for (const q of questions) {
      if (drop.has(q.id)) continue
      for (const re of phrasings) {
        const m = q.q.match(re)
        if (!m) continue
        const key = `${lower(m[1])}|${lower(q.correct)}`
        if (!bySubject.has(key)) bySubject.set(key, [])
        bySubject.get(key).push(q)
        break
      }
    }
    for (const [key, group] of bySubject) {
      const sound = group.filter((q) => !coCorrect(q))
      for (const q of group) if (coCorrect(q)) drop.add(q.id)
      if (sound.length <= 1) continue
      const keep = sound[Math.floor(seededRandom(seedOf(`${cat}|${family}|${key}`))() * sound.length)]
      for (const q of sound) if (q !== keep) drop.add(q.id)
    }
  }
  if (!drop.size) continue
  trivia.categories[cat] = questions.filter((q) => !drop.has(q.id))
  stats[cat] = `${questions.length} -> ${trivia.categories[cat].length}`
}

writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
console.log('Thinned repeated families:', stats)
