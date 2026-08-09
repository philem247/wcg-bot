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
  // Game of Thrones Core
  { n: "Jon Snow", h: "Stark", w: "Ghost", s: "Game of Thrones", a: "Kit Harington", f: "Rhaegar Targaryen / Ned Stark" },
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
  { n: "Joffrey Baratheon", h: "Baratheon", w: null, s: "Game of Thrones", a: "Jack Gleeson", f: "Jaime Lannister" },
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
  { n: "Tormund Giantsbane", h: "Free Folk", w: null, s: "Game of Thrones", a: "Kristofer Hivju", f: "Unknown" },
  { n: "Ygritte", h: "Free Folk", w: null, s: "Game of Thrones", a: "Rose Leslie", f: "Unknown" },
  { n: "Gilly", h: "Free Folk", w: null, s: "Game of Thrones", a: "Hannah Murray", f: "Craster" },
  { n: "Jorah Mormont", h: "Mormont", w: null, s: "Game of Thrones", a: "Iain Glen", f: "Jeor Mormont" },
  { n: "Jeor Mormont", h: "Mormont", w: null, s: "Game of Thrones", a: "James Cosmo", f: "Unknown" },
  { n: "Barristan Selmy", h: "Selmy", w: null, s: "Game of Thrones", a: "Ian McElhinney", f: "Unknown" },
  { n: "Grey Worm", h: "Unsullied", w: null, s: "Game of Thrones", a: "Jacob Anderson", f: "Unknown" },
  { n: "Missandei", h: "Naath", w: null, s: "Game of Thrones", a: "Nathalie Emmanuel", f: "Unknown" },
  { n: "Melisandre", h: "Lord of Light", w: null, s: "Game of Thrones", a: "Carice van Houten", f: "Unknown" },
  { n: "Bronn", h: "Blackwater", w: null, s: "Game of Thrones", a: "Jerome Flynn", f: "Unknown" },
  { n: "Podrick Payne", h: "Payne", w: null, s: "Game of Thrones", a: "Daniel Portman", f: "Unknown" },
  { n: "Daario Naharis", h: "Second Sons", w: null, s: "Game of Thrones", a: "Michiel Huisman", f: "Unknown" },
  { n: "Roose Bolton", h: "Bolton", w: null, s: "Game of Thrones", a: "Michael McElhatton", f: "Unknown" },
  { n: "Ramsay Bolton", h: "Bolton", w: null, s: "Game of Thrones", a: "Iwan Rheon", f: "Roose Bolton" },
  { n: "Petyr Baelish", h: "Baelish", w: null, s: "Game of Thrones", a: "Aidan Gillen", f: "Unknown" },
  { n: "Varys", h: "None", w: null, s: "Game of Thrones", a: "Conleth Hill", f: "Unknown" },
  { n: "Hodor", h: "Stark (Servant)", w: null, s: "Game of Thrones", a: "Kristian Nairn", f: "Unknown" },
  { n: "High Sparrow", h: "Faith of the Seven", w: null, s: "Game of Thrones", a: "Jonathan Pryce", f: "Unknown" },

  // House of the Dragon Core
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
  { n: "Criston Cole", h: "Cole", w: null, s: "House of the Dragon", a: "Fabien Frankel", f: "Unknown" },
  { n: "Larys Strong", h: "Strong", w: null, s: "House of the Dragon", a: "Matthew Needham", f: "Lyonel Strong" },
  { n: "Harwin Strong", h: "Strong", w: null, s: "House of the Dragon", a: "Ryan Corr", f: "Lyonel Strong" },

  // A Knight of the Seven Kingdoms Core
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
  { c: "Runestone", h: "Royce", r: "The Vale" },
  { c: "Castle Black", h: "The Night's Watch", r: "The North" },
  { c: "The Dreadfort", h: "Bolton", r: "The North" },
  { c: "The Twins", h: "Frey", r: "The Riverlands" },
  { c: "Bear Island", h: "Mormont", r: "The North" },
  { c: "Horn Hill", h: "Tarly", r: "The Reach" }
]

const dragons = [
  { d: "Drogon", r: "Daenerys Targaryen" },
  { d: "Rhaegal", r: "Jon Snow" },
  { d: "Viserion", r: "Night King" },
  { d: "Syrax", r: "Rhaenyra Targaryen" },
  { d: "Caraxes", r: "Daemon Targaryen" },
  { d: "Vhagar", r: "Aemond Targaryen" },
  { d: "Sunfyre", r: "Aegon II Targaryen" },
  { d: "Meleys", r: "Rhaenys Targaryen" },
  { d: "Seasmoke", r: "Laenor Velaryon" },
  { d: "Balerion", r: "Aegon the Conqueror" },
  { d: "Meraxes", r: "Rhaenys Targaryen (Conqueror)" },
  { d: "Dreamfyre", r: "Helaena Targaryen" },
  { d: "Vermithor", r: "Hugh Hammer" },
  { d: "Silverwing", r: "Ulf White" }
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
  { h: "Hightower", m: "We Light the Way" },
  { h: "Manderly", m: "True to Our Word" }
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
  { h: "Hightower", s: "A stepped stone tower with a beacon on top" },
  { h: "Frey", s: "Twin stone towers bridging a river" },
  { h: "Clegane", s: "Three black dogs on a yellow field" }
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
  { c: "Euron Greyjoy", n: "Crow's Eye" },
  { c: "Viserys Targaryen (Brother of Daenerys)", n: "The Beggar King" },
  { c: "Aerys II Targaryen", n: "The Mad King" },
  { c: "Oberyn Martell", n: "The Red Viper" },
  { c: "Rhaenyra Targaryen", n: "The Realm's Delight" },
  { c: "Daemon Targaryen", n: "The Rogue Prince" },
  { c: "Corlys Velaryon", n: "The Sea Snake" },
  { c: "Aemond Targaryen", n: "Aemond One-Eye" },
  { c: "Criston Cole", n: "The Kingmaker" },
  { c: "Baelor Targaryen", n: "Baelor the Blessed" }
]

const religions = [
  { r: "The North", rel: "The Old Gods of the Forest" },
  { r: "The Iron Islands", rel: "The Drowned God" },
  { r: "Most of Westeros (South)", rel: "The Faith of the Seven" },
  { r: "Essos (Asshai, Myr)", rel: "The Lord of Light (R'hllor)" },
  { r: "Braavos", rel: "The Many-Faced God" },
  { r: "The Dothraki Sea", rel: "The Great Stallion" }
]

const battles = [
  { b: "Battle of the Bastards", w: "House Stark", l: "House Bolton", c: "Jon Snow" },
  { b: "Battle of the Blackwater", w: "House Lannister", l: "House Baratheon (Stannis)", c: "Tyrion Lannister / Tywin Lannister" },
  { b: "Battle of Hardhome", w: "The White Walkers", l: "The Night's Watch / Free Folk", c: "The Night King" },
  { b: "Battle of the Goldroad", w: "House Targaryen / Dothraki", l: "House Lannister / Tarly", c: "Daenerys Targaryen" },
  { b: "The Long Night (Battle of Winterfell)", w: "The Living", l: "The Dead (White Walkers)", c: "Arya Stark" },
  { b: "Battle of the Whispering Wood", w: "House Stark", l: "House Lannister", c: "Robb Stark" },
  { b: "Battle of King's Landing (The Bells)", w: "House Targaryen", l: "House Lannister", c: "Daenerys Targaryen" }
]

const deaths = [
  { v: "Joffrey Baratheon", k: "Olenna Tyrell" },
  { v: "Tywin Lannister", k: "Tyrion Lannister" },
  { v: "Walder Frey", k: "Arya Stark" },
  { v: "Night King", k: "Arya Stark" },
  { v: "Ramsay Bolton", k: "Sansa Stark" },
  { v: "Petyr Baelish", k: "Arya Stark" },
  { v: "Daenerys Targaryen", k: "Jon Snow" },
  { v: "Renly Baratheon", k: "Melisandre (Shadow Demon)" },
  { v: "Robb Stark", k: "Roose Bolton" },
  { v: "Jon Arryn", k: "Lysa Arryn" },
  { v: "Viserys Targaryen", k: "Khal Drogo" },
  { v: "Stannis Baratheon", k: "Brienne of Tarth" },
  { v: "Olenna Tyrell", k: "Jaime Lannister" },
  { v: "The High Sparrow", k: "Cersei Lannister" },
  { v: "Margaery Tyrell", k: "Cersei Lannister" },
  { v: "Ned Stark", k: "Ilyn Payne" }
]

const factions = [
  { f: "Night's Watch", c: "Castle Black", m: "Jon Snow" },
  { f: "Kingsguard", c: "The Red Keep", m: "Jaime Lannister" },
  { f: "Faceless Men", c: "The House of Black and White", m: "Jaqen H'ghar" },
  { f: "Sons of the Harpy", c: "Meereen", m: "Hizdahr zo Loraq" },
  { f: "The Unsullied", c: "Astapor", m: "Grey Worm" },
  { f: "Second Sons", c: "Essos", m: "Daario Naharis" },
  { f: "Golden Company", c: "Essos", m: "Harry Strickland" },
  { f: "Brotherhood Without Banners", c: "The Riverlands", m: "Beric Dondarrion" },
  { f: "Faith Militant", c: "Great Sept of Baelor", m: "The High Sparrow" }
]

function generateQs(data, templates, extractCorrect, extractWrong) {
  const qs = []
  const wrongPool = [...new Set(data.map(extractWrong))].filter(Boolean)
  for (const item of data) {
    for (const t of templates) {
      const qText = t(item)
      const correct = extractCorrect(item)
      if (!correct || correct === "Unknown" || correct === "None") continue
      
      const wrong = shuffle(wrongPool.filter(p => p !== correct && p !== "Unknown" && p !== "None")).slice(0, 3)
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
  const safeHouseCharacters = characters.filter(c => c.h !== 'Unknown' && c.h !== 'None').map(c => ({ ...c, safeName: c.n.split(' ')[0] }))
  bank['got'].push(...generateQs(safeHouseCharacters, [
    c => `Which noble House or faction does ${c.safeName} belong to?`,
    c => `In the world of Ice and Fire, ${c.safeName} is primarily a member of which family or group?`,
    c => `Which banner does ${c.safeName} fundamentally align with?`
  ], c => c.h, c => c.h))
  
  // 2. Character Series
  bank['got'].push(...generateQs(characters, [
    c => `Which HBO TV series primarily features the character ${c.n}?`,
    c => `${c.n} makes a core appearance in which of these Westerosi shows?`,
    c => `If you were watching ${c.n} on screen, which show would it likely be?`
  ], c => c.s, c => c.s))
  
  // 3. Actors
  bank['got'].push(...generateQs(characters.filter(c => c.a !== 'Unknown'), [
    c => `Who plays the role of ${c.n} in the HBO adaptations?`,
    c => `Which actor/actress brought the character ${c.n} to life on screen?`,
    c => `In the television series, the character ${c.n} is portrayed by whom?`
  ], c => c.a, c => c.a))
  
  // 4. Character Fathers
  const safeFatherCharacters = characters.filter(c => c.f !== 'Unknown').map(c => ({ ...c, safeName: c.n.split(' ')[0] }))
  bank['got'].push(...generateQs(safeFatherCharacters, [
    c => `Who is the father of ${c.safeName}?`,
    c => `According to Westerosi lore, ${c.safeName} is the child of who?`,
    c => `Which character sired ${c.safeName}?`
  ], c => c.f, c => c.f))

  // 5. Direwolves/Dragons
  bank['got'].push(...generateQs(characters.filter(c => c.w !== null), [
    c => `What is the name of ${c.n}'s notable beast (dragon or direwolf)?`,
    c => `Which mythical beast is famously bound to ${c.n}?`,
    c => `${c.n} is accompanied by a companion beast named what?`
  ], c => c.w, c => c.w))
  
  // 6. Castles
  bank['got'].push(...generateQs(castles, [
    c => `Which noble House or order is the traditional holder of ${c.c}?`,
    c => `The stronghold of ${c.c} belongs to which faction?`,
    c => `Who traditionally rules or commands from ${c.c}?`
  ], c => c.h, c => c.h))
  
  bank['got'].push(...generateQs(castles, [
    c => `${c.c} is located in which region of Westeros?`,
    c => `If you traveled to ${c.c}, which region would you be in?`,
    c => `Which major kingdom or region is home to ${c.c}?`
  ], c => c.r, c => c.r))
  
  // 7. Dragons
  bank['got'].push(...generateQs(dragons, [
    d => `Which dragon rider famously rode ${d.d}?`,
    d => `The dragon ${d.d} was mounted by which character?`,
    d => `Who claimed the mighty dragon ${d.d}?`
  ], d => d.r, d => d.r))

  // 8. Mottos
  bank['got'].push(...generateQs(mottos, [
    m => `"${m.m}" are the official words of which noble House?`,
    m => `If a lord uttered the words "${m.m}", which House would they be representing?`
  ], m => m.h, m => m.h))
  bank['got'].push(...generateQs(mottos, [
    m => `What is the official motto of House ${m.h}?`,
    m => `What is the traditional motto of House ${m.h}?`,
    m => `Which words belong to House ${m.h}?`,
    m => `The sigil of House ${m.h} is accompanied by which famous words?`
  ], m => m.m, m => m.m))

  // 9. Sigils
  bank['got'].push(...generateQs(sigils, [
    s => `Which animal or symbol is prominently depicted on the banners of House ${s.h}?`,
    s => `What is the official sigil of House ${s.h}?`,
    s => `If you see soldiers marching for House ${s.h}, what icon is on their shields?`
  ], s => s.s, s => s.s))
  bank['got'].push(...generateQs(sigils, [
    s => `If you see a banner displaying ${s.s}, which House does it represent?`,
    s => `${s.s} is the symbol of which Westerosi family?`,
    s => `Which House adopted ${s.s} as their official crest?`
  ], s => s.h, s => s.h))

  // 10. Swords
  bank['got'].push(...generateQs(swords.filter(s => s.h !== 'Unknown'), [
    s => `What is the name of the ancestral Valyrian steel sword belonging to ${s.h}?`,
    s => `${s.h} passed down a legendary sword named what?`
  ], s => s.s, s => s.s))
  bank['got'].push(...generateQs(swords.filter(s => s.o !== 'Unknown'), [
    s => `Which character is famously known to wield the sword '${s.s}'?`,
    s => `Who is the famous owner or wielder of the sword named ${s.s}?`,
    s => `'${s.s}' is a legendary sword wielded by whom?`
  ], s => s.o, s => s.o))

  // 11. Nicknames
  bank['got'].push(...generateQs(nicknames, [
    n => `In Westeros, which character is commonly known by the moniker "${n.n}"?`,
    n => `Who is often referred to as "${n.n}"?`,
    n => `Which famous figure earned the nickname "${n.n}"?`
  ], n => n.c, n => n.c))
  bank['got'].push(...generateQs(nicknames, [
    n => `What infamous nickname was given to ${n.c}?`,
    n => `By what alternative title is ${n.c} commonly known?`,
    n => `${n.c} is frequently called what by the smallfolk?`
  ], n => n.n, n => n.n))

  // 12. Religions
  bank['got'].push(...generateQs(religions, [
    r => `Which religion is predominantly worshipped in ${r.r}?`,
    r => `If you lived in ${r.r}, which faith would you most likely follow?`,
    r => `What is the primary belief system of ${r.r}?`
  ], r => r.rel, r => r.rel))

  // 13. Battles
  bank['got'].push(...generateQs(battles, [
    b => `Which faction or leader emerged victorious at the ${b.b}?`,
    b => `Who won the decisive engagement known as the ${b.b}?`
  ], b => b.w, b => b.w))
  bank['got'].push(...generateQs(battles, [
    b => `Which prominent commander or faction was defeated at the ${b.b}?`
  ], b => b.l, b => b.l))
  bank['got'].push(...generateQs(battles, [
    b => `Who was a primary commander leading forces during the ${b.b}?`,
    b => `The ${b.b} was heavily influenced by the leadership of which commander?`
  ], b => b.c, b => b.c))

  // 14. Deaths
  bank['got'].push(...generateQs(deaths, [
    d => `Who was responsible for the death of ${d.v}?`,
    d => `${d.v} was famously killed or executed by whom?`,
    d => `Which character struck the fatal blow (or gave the fatal order) against ${d.v}?`
  ], d => d.k, d => d.k))

  // 15. Factions
  bank['got'].push(...generateQs(factions, [
    f => `Which character is a notable member or leader of the ${f.f}?`,
    f => `Who famously served in the organization known as the ${f.f}?`
  ], f => f.m, f => f.m))
  bank['got'].push(...generateQs(factions, [
    f => `What is the primary headquarters or operating base of the ${f.f}?`,
    f => `Where does the ${f.f} typically operate or reside?`
  ], f => f.c, f => f.c))

  // Final deduplication
  const seen = new Set()
  bank['got'] = bank['got'].filter(q => {
    if (!q.q || !q.correct || !q.wrong || q.wrong.length < 3) return false
    if (seen.has(q.q)) return false
    seen.add(q.q)
    return true
  })
  
  const output = {
    attribution: "A Song of Ice and Fire / Game of Thrones Universe Generator",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/got.json', JSON.stringify(output, null, 2))
  console.log(`Saved to data/got.json with ${bank['got'].length} organic questions!`)
}

main()
