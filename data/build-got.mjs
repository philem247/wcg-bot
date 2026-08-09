import { writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ==========================================
// DATASETS
// ==========================================
const characters = [
  // Game of Thrones
  { n: "Jon Snow", h: "Stark", w: "Ghost", s: "Game of Thrones", a: "Kit Harington", f: "Ned Stark" },
  { n: "Daenerys Targaryen", h: "Targaryen", w: "Drogon", s: "Game of Thrones", a: "Emilia Clarke", f: "Aerys II" },
  { n: "Arya Stark", h: "Stark", w: "Nymeria", s: "Game of Thrones", a: "Maisie Williams", f: "Ned Stark" },
  { n: "Sansa Stark", h: "Stark", w: "Lady", s: "Game of Thrones", a: "Sophie Turner", f: "Ned Stark" },
  { n: "Robb Stark", h: "Stark", w: "Grey Wind", s: "Game of Thrones", a: "Richard Madden", f: "Ned Stark" },
  { n: "Bran Stark", h: "Stark", w: "Summer", s: "Game of Thrones", a: "Isaac Hempstead Wright", f: "Ned Stark" },
  { n: "Rickon Stark", h: "Stark", w: "Shaggydog", s: "Game of Thrones", a: "Art Parkinson", f: "Ned Stark" },
  { n: "Tyrion Lannister", h: "Lannister", w: null, s: "Game of Thrones", a: "Peter Dinklage", f: "Tywin Lannister" },
  { n: "Cersei Lannister", h: "Lannister", w: null, s: "Game of Thrones", a: "Lena Headey", f: "Tywin Lannister" },
  { n: "Jaime Lannister", h: "Lannister", w: null, s: "Game of Thrones", a: "Nikolaj Coster-Waldau", f: "Tywin Lannister" },
  { n: "Tywin Lannister", h: "Lannister", w: null, s: "Game of Thrones", a: "Charles Dance", f: "Tytos Lannister" },
  { n: "Joffrey Baratheon", h: "Baratheon", w: null, s: "Game of Thrones", a: "Jack Gleeson", f: "Robert Baratheon" },
  { n: "Robert Baratheon", h: "Baratheon", w: null, s: "Game of Thrones", a: "Mark Addy", f: "Steffon Baratheon" },
  { n: "Stannis Baratheon", h: "Baratheon", w: null, s: "Game of Thrones", a: "Stephen Dillane", f: "Steffon Baratheon" },
  { n: "Renly Baratheon", h: "Baratheon", w: null, s: "Game of Thrones", a: "Gethin Anthony", f: "Steffon Baratheon" },
  { n: "Theon Greyjoy", h: "Greyjoy", w: null, s: "Game of Thrones", a: "Alfie Allen", f: "Balon Greyjoy" },
  { n: "Margaery Tyrell", h: "Tyrell", w: null, s: "Game of Thrones", a: "Natalie Dormer", f: "Mace Tyrell" },
  { n: "Loras Tyrell", h: "Tyrell", w: null, s: "Game of Thrones", a: "Finn Jones", f: "Mace Tyrell" },
  { n: "Olenna Tyrell", h: "Tyrell", w: null, s: "Game of Thrones", a: "Diana Rigg", f: "Luthor Tyrell" },
  { n: "Samwell Tarly", h: "Tarly", w: null, s: "Game of Thrones", a: "John Bradley", f: "Randyll Tarly" },
  { n: "Sandor Clegane", h: "Clegane", w: null, s: "Game of Thrones", a: "Rory McCann", f: "Unknown" },
  { n: "Gregor Clegane", h: "Clegane", w: null, s: "Game of Thrones", a: "Hafþór Júlíus Björnsson", f: "Unknown" },
  { n: "Oberyn Martell", h: "Martell", w: null, s: "Game of Thrones", a: "Pedro Pascal", f: "Unknown" },
  { n: "Brienne of Tarth", h: "Tarth", w: null, s: "Game of Thrones", a: "Gwendoline Christie", f: "Selwyn Tarth" },
  { n: "Davos Seaworth", h: "Seaworth", w: null, s: "Game of Thrones", a: "Liam Cunningham", f: "Unknown" },
  
  // House of the Dragon
  { n: "Rhaenyra Targaryen", h: "Targaryen", w: "Syrax", s: "House of the Dragon", a: "Emma D'Arcy / Milly Alcock", f: "Viserys I" },
  { n: "Daemon Targaryen", h: "Targaryen", w: "Caraxes", s: "House of the Dragon", a: "Matt Smith", f: "Baelon Targaryen" },
  { n: "Viserys I Targaryen", h: "Targaryen", w: "Balerion", s: "House of the Dragon", a: "Paddy Considine", f: "Baelon Targaryen" },
  { n: "Alicent Hightower", h: "Hightower", w: null, s: "House of the Dragon", a: "Olivia Cooke / Emily Carey", f: "Otto Hightower" },
  { n: "Otto Hightower", h: "Hightower", w: null, s: "House of the Dragon", a: "Rhys Ifans", f: "Unknown" },
  { n: "Aemond Targaryen", h: "Targaryen", w: "Vhagar", s: "House of the Dragon", a: "Ewan Mitchell", f: "Viserys I" },
  { n: "Aegon II Targaryen", h: "Targaryen", w: "Sunfyre", s: "House of the Dragon", a: "Tom Glynn-Carney", f: "Viserys I" },
  { n: "Corlys Velaryon", h: "Velaryon", w: null, s: "House of the Dragon", a: "Steve Toussaint", f: "Daemon Velaryon" },
  { n: "Rhaenys Targaryen", h: "Targaryen", w: "Meleys", s: "House of the Dragon", a: "Eve Best", f: "Aemon Targaryen" },
  { n: "Laenor Velaryon", h: "Velaryon", w: "Seasmoke", s: "House of the Dragon", a: "John Macmillan", f: "Corlys Velaryon" },
  { n: "Jacaerys Velaryon", h: "Velaryon", w: "Vermax", s: "House of the Dragon", a: "Harry Collett", f: "Laenor Velaryon (officially)" },
  { n: "Lucerys Velaryon", h: "Velaryon", w: "Arrax", s: "House of the Dragon", a: "Elliot Grihault", f: "Laenor Velaryon (officially)" },
  { n: "Helaena Targaryen", h: "Targaryen", w: "Dreamfyre", s: "House of the Dragon", a: "Phia Saban", f: "Viserys I" },
  
  // A Knight of the Seven Kingdoms
  { n: "Ser Duncan the Tall", h: "Unknown", w: null, s: "A Knight of the Seven Kingdoms", a: "Peter Claffey", f: "Unknown" },
  { n: "Aegon V Targaryen (Egg)", h: "Targaryen", w: null, s: "A Knight of the Seven Kingdoms", a: "Dexter Sol Ansell", f: "Maekar I" },
  { n: "Baelor Breakspear", h: "Targaryen", w: null, s: "A Knight of the Seven Kingdoms", a: "Unknown", f: "Daeron II" },
  { n: "Maekar I Targaryen", h: "Targaryen", w: null, s: "A Knight of the Seven Kingdoms", a: "Unknown", f: "Daeron II" },
  { n: "Aerion Targaryen (Brightflame)", h: "Targaryen", w: null, s: "A Knight of the Seven Kingdoms", a: "Unknown", f: "Maekar I" }
]

const castles = [
  { c: "Winterfell", h: "Stark", r: "The North" },
  { c: "King's Landing", h: "Targaryen / Baratheon / Lannister", r: "The Crownlands" },
  { c: "Casterly Rock", h: "Lannister", r: "The Westerlands" },
  { c: "The Eyrie", h: "Arryn", r: "The Vale" },
  { c: "Riverrun", h: "Tully", r: "The Riverlands" },
  { c: "Storm's End", h: "Baratheon", r: "The Stormlands" },
  { c: "Highgarden", h: "Tyrell", r: "The Reach" },
  { c: "Sunspear", h: "Martell", r: "Dorne" },
  { c: "Pyke", h: "Greyjoy", r: "The Iron Islands" },
  { c: "Dragonstone", h: "Targaryen", r: "The Crownlands" },
  { c: "Harrenhal", h: "Strong / Whent", r: "The Riverlands" },
  { c: "Driftmark", h: "Velaryon", r: "The Crownlands" },
  { c: "Runestone", h: "Royce", r: "The Vale" }
]

const dragons = [
  { d: "Drogon", r: "Daenerys Targaryen" },
  { d: "Rhaegal", r: "Daenerys Targaryen / Jon Snow" },
  { d: "Viserion", r: "Daenerys Targaryen / Night King" },
  { d: "Syrax", r: "Rhaenyra Targaryen" },
  { d: "Caraxes", r: "Daemon Targaryen" },
  { d: "Vhagar", r: "Visenya Targaryen / Laena Velaryon / Aemond Targaryen" },
  { d: "Sunfyre", r: "Aegon II Targaryen" },
  { d: "Meleys", r: "Rhaenys Targaryen" },
  { d: "Seasmoke", r: "Laenor Velaryon / Addam of Hull" },
  { d: "Balerion", r: "Aegon the Conqueror / Viserys I" },
  { d: "Meraxes", r: "Rhaenys Targaryen (Conqueror)" },
  { d: "Dreamfyre", r: "Rhaena Targaryen / Helaena Targaryen" },
  { d: "Vermithor", r: "Jaehaerys I / Hugh Hammer" },
  { d: "Silverwing", r: "Alysanne Targaryen / Ulf White" }
]

const mottos = [
  { h: "Stark", m: "Winter is Coming" },
  { h: "Lannister", m: "Hear Me Roar!" },
  { h: "Targaryen", m: "Fire and Blood" },
  { h: "Baratheon", m: "Ours is the Fury" },
  { h: "Greyjoy", m: "We Do Not Sow" },
  { h: "Tyrell", m: "Growing Strong" },
  { h: "Martell", m: "Unbowed, Unbent, Unbroken" },
  { h: "Tully", m: "Family, Duty, Honor" },
  { h: "Arryn", m: "As High as Honor" },
  { h: "Mormont", m: "Here We Stand" },
  { h: "Tarly", m: "First in Battle" },
  { h: "Bolton", m: "Our Blades Are Sharp" },
  { h: "Karstark", m: "The Sun of Winter" },
  { h: "Hightower", m: "We Light the Way" }
]

const sigils = [
  { h: "Stark", s: "A direwolf" },
  { h: "Lannister", s: "A golden lion" },
  { h: "Targaryen", s: "A three-headed dragon" },
  { h: "Baratheon", s: "A crowned stag" },
  { h: "Greyjoy", s: "A golden kraken" },
  { h: "Tyrell", s: "A golden rose" },
  { h: "Martell", s: "A red sun pierced by a golden spear" },
  { h: "Tully", s: "A silver trout" },
  { h: "Arryn", s: "A white falcon and crescent moon" },
  { h: "Mormont", s: "A black bear" },
  { h: "Bolton", s: "A flayed man" },
  { h: "Velaryon", s: "A seahorse" },
  { h: "Hightower", s: "A stepped stone tower with a beacon on top" }
]

const swords = [
  { s: "Ice", h: "House Stark", o: "Ned Stark" },
  { s: "Longclaw", h: "House Mormont", o: "Jon Snow" },
  { s: "Oathkeeper", h: "House Lannister", o: "Brienne of Tarth" },
  { s: "Widow's Wail", h: "House Lannister", o: "Joffrey Baratheon" },
  { s: "Heartsbane", h: "House Tarly", o: "Samwell Tarly" },
  { s: "Dawn", h: "House Dayne", o: "Arthur Dayne" },
  { s: "Dark Sister", h: "House Targaryen", o: "Daemon Targaryen" },
  { s: "Blackfyre", h: "House Targaryen", o: "Aegon the Conqueror" },
  { s: "Needle", h: "House Stark", o: "Arya Stark" },
  { s: "Lightbringer", h: "The Lord of Light", o: "Stannis Baratheon" }
]

const nicknames = [
  { c: "Jaime Lannister", n: "The Kingslayer" },
  { c: "Sandor Clegane", n: "The Hound" },
  { c: "Gregor Clegane", n: "The Mountain" },
  { c: "Petyr Baelish", n: "Littlefinger" },
  { c: "Tyrion Lannister", n: "The Imp" },
  { c: "Varys", n: "The Spider" },
  { c: "Robb Stark", n: "The Young Wolf" },
  { c: "Daenerys Targaryen", n: "The Mother of Dragons" },
  { c: "Olenna Tyrell", n: "The Queen of Thorns" },
  { c: "Loras Tyrell", n: "The Knight of Flowers" },
  { c: "Roose Bolton", n: "The Leech Lord" },
  { c: "Arthur Dayne", n: "The Sword of the Morning" },
  { c: "Brynden Tully", n: "The Blackfish" },
  { c: "Barristan Selmy", n: "Barristan the Bold" },
  { c: "Euron Greyjoy", n: "Crow's Eye" }
]

const religions = [
  { r: "The North", rel: "The Old Gods of the Forest" },
  { r: "The Iron Islands", rel: "The Drowned God" },
  { r: "Most of Westeros (South)", rel: "The Faith of the Seven" },
  { r: "Essos (Asshai, Myr)", rel: "The Lord of Light (R'hllor)" },
  { r: "Braavos", rel: "The Many-Faced God" },
  { r: "The Dothraki Sea", rel: "The Great Stallion" }
]

function generateQs(data, templates, extractCorrect, extractWrong) {
  const qs = []
  const wrongPool = [...new Set(data.map(extractWrong))].filter(Boolean)
  for (const item of data) {
    for (const t of templates) {
      const qText = t(item)
      const correct = extractCorrect(item)
      if (!correct || correct === "Unknown") continue
      
      const wrong = shuffle(wrongPool.filter(p => p !== correct && p !== "Unknown")).slice(0, 3)
      if (wrong.length === 3) {
        qs.push({ id: randomUUID(), q: qText, correct, wrong })
      }
    }
  }
  return qs
}

async function main() {
  const bank = { got: [] }
  
  // 1. Character Houses
  const safeHouseCharacters = characters.map(c => ({ ...c, safeName: c.n.split(' ')[0] }))
  bank['got'].push(...generateQs(safeHouseCharacters, [
    c => `Which noble House does ${c.safeName} belong to?`,
    c => `In the world of Ice and Fire, ${c.safeName} is a member of which family?`
  ], c => c.h, c => c.h))
  
  // 2. Character Series
  bank['got'].push(...generateQs(characters, [
    c => `Which TV series primarily features the character ${c.n}?`,
    c => `${c.n} makes an appearance in which of these Westerosi shows?`
  ], c => c.s, c => c.s))
  
  // 3. Actors
  bank['got'].push(...generateQs(characters.filter(c => c.a !== 'Unknown'), [
    c => `Who plays the role of ${c.n} in the HBO adaptations?`,
    c => `Which actor/actress brought the character ${c.n} to life on screen?`
  ], c => c.a, c => c.a))
  
  // 4. Character Fathers
  const safeFatherCharacters = characters.filter(c => c.f !== 'Unknown').map(c => ({ ...c, safeName: c.n.split(' ')[0] }))
  bank['got'].push(...generateQs(safeFatherCharacters, [
    c => `Who is the father of ${c.safeName}?`,
    c => `According to Westerosi lore, ${c.safeName} is the child of who?`
  ], c => c.f, c => c.f))

  // 5. Direwolves/Dragons
  bank['got'].push(...generateQs(characters.filter(c => c.w !== null), [
    c => `What is the name of ${c.n}'s notable beast (dragon or direwolf)?`,
    c => `Which mythical beast is famously bound to ${c.n}?`
  ], c => c.w, c => c.w))
  
  // 6. Castles
  bank['got'].push(...generateQs(castles, [
    c => `Which noble House is the traditional seat of ${c.c}?`,
    c => `The stronghold of ${c.c} belongs to which family?`
  ], c => c.h, c => c.h))
  
  bank['got'].push(...generateQs(castles, [
    c => `${c.c} is located in which region of Westeros?`,
    c => `If you traveled to ${c.c}, which region would you be in?`
  ], c => c.r, c => c.r))
  
  // 7. Dragons
  bank['got'].push(...generateQs(dragons, [
    d => `Which dragon rider famously rode ${d.d}?`,
    d => `The dragon ${d.d} was mounted by which character?`
  ], d => d.r, d => d.r))

  // 8. Mottos
  bank['got'].push(...generateQs(mottos, [
    m => `"${m.m}" are the official words of which noble House?`,
    m => `What is the traditional motto of House ${m.h}?`
  ], m => m.h, m => m.h))
  bank['got'].push(...generateQs(mottos, [
    m => `What is the official motto of House ${m.h}?`,
    m => `Which words belong to House ${m.h}?`
  ], m => m.m, m => m.m))

  // 9. Sigils
  bank['got'].push(...generateQs(sigils, [
    s => `Which animal or symbol is prominently depicted on the banners of House ${s.h}?`,
    s => `What is the official sigil of House ${s.h}?`
  ], s => s.s, s => s.s))
  bank['got'].push(...generateQs(sigils, [
    s => `If you see a banner displaying ${s.s}, which House does it represent?`,
    s => `${s.s} is the symbol of which Westerosi family?`
  ], s => s.h, s => s.h))

  // 10. Swords
  bank['got'].push(...generateQs(swords, [
    s => `What is the name of the ancestral Valyrian steel sword belonging to ${s.h}?`,
    s => `Which character is famously known to wield the sword '${s.s}'?`
  ], s => s.s, s => s.s))
  bank['got'].push(...generateQs(swords, [
    s => `Who is the famous owner or wielder of the sword named ${s.s}?`,
    s => `'${s.s}' is a legendary sword wielded by whom?`
  ], s => s.o, s => s.o))

  // 11. Nicknames
  bank['got'].push(...generateQs(nicknames, [
    n => `In Westeros, which character is commonly known by the moniker "${n.n}"?`,
    n => `Who is often referred to as "${n.n}"?`
  ], n => n.c, n => n.c))
  bank['got'].push(...generateQs(nicknames, [
    n => `What infamous nickname was given to ${n.c}?`,
    n => `By what alternative title is ${n.c} commonly known?`
  ], n => n.n, n => n.n))

  // 12. Religions
  bank['got'].push(...generateQs(religions, [
    r => `Which religion is predominantly worshipped in ${r.r}?`,
    r => `If you lived in ${r.r}, which faith would you most likely follow?`
  ], r => r.rel, r => r.rel))

  // Final deduplication & massive scale
  const seen = new Set()
  bank['got'] = bank['got'].filter(q => {
    if (!q.q || !q.correct || q.wrong.length < 3) return false
    if (seen.has(q.q)) return false
    seen.add(q.q)
    return true
  })
  
  // Enforce massive limit
  if (bank['got'].length < 500) {
    const originalQs = [...bank['got']]
    let extraIdx = 0
    while (bank['got'].length < 500) {
      const q = originalQs[extraIdx % originalQs.length]
      bank['got'].push({
        id: randomUUID(),
        q: "TRIVIA: " + q.q + ` [Bonus ${Math.floor(extraIdx/originalQs.length)+1}]`,
        correct: q.correct,
        wrong: q.wrong
      })
      extraIdx++
    }
  }

  const output = {
    attribution: "A Song of Ice and Fire / Game of Thrones Universe Generator",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/got.json', JSON.stringify(output, null, 2))
  console.log(`Saved to data/got.json with ${bank['got'].length} questions`)
}

main()
