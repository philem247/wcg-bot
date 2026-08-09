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

const characters = [
  // Naruto / Shippuden
  { n: "Naruto Uzumaki", a: "Naruto", p: "Rasengan / Nine-Tails Chakra", f: "Hidden Leaf Village" },
  { n: "Sasuke Uchiha", a: "Naruto", p: "Chidori / Sharingan", f: "Hidden Leaf Village" },
  { n: "Kakashi Hatake", a: "Naruto", p: "Copy Ninja / Sharingan", f: "Hidden Leaf Village" },
  { n: "Itachi Uchiha", a: "Naruto", p: "Amaterasu / Tsukuyomi", f: "Akatsuki" },
  { n: "Pain (Nagato)", a: "Naruto", p: "Rinnegan / Almighty Push", f: "Akatsuki" },

  // Demon Slayer
  { n: "Tanjiro Kamado", a: "Demon Slayer", p: "Water Breathing / Sun Breathing", f: "Demon Slayer Corps" },
  { n: "Nezuko Kamado", a: "Demon Slayer", p: "Blood Demon Art: Exploding Blood", f: "Demon Slayer Corps" },
  { n: "Zenitsu Agatsuma", a: "Demon Slayer", p: "Thunder Breathing (First Form only)", f: "Demon Slayer Corps" },
  { n: "Kyojuro Rengoku", a: "Demon Slayer", p: "Flame Breathing", f: "Demon Slayer Corps" },
  { n: "Muzan Kibutsuji", a: "Demon Slayer", p: "Progenitor Demon Abilities", f: "Twelve Kizuki" },

  // Attack on Titan
  { n: "Eren Yeager", a: "Attack on Titan", p: "Attack Titan / Founding Titan", f: "Survey Corps / Yeagerists" },
  { n: "Mikasa Ackerman", a: "Attack on Titan", p: "Ackerman Awakening / ODM Gear", f: "Survey Corps" },
  { n: "Levi Ackerman", a: "Attack on Titan", p: "Ackerman Awakening / ODM Gear Master", f: "Survey Corps" },
  { n: "Armin Arlert", a: "Attack on Titan", p: "Colossal Titan / Tactical Genius", f: "Survey Corps" },
  { n: "Reiner Braun", a: "Attack on Titan", p: "Armored Titan", f: "Marleyan Warriors" },

  // Bleach
  { n: "Ichigo Kurosaki", a: "Bleach", p: "Getsuga Tensho / Hollowfication", f: "Substitute Soul Reaper" },
  { n: "Rukia Kuchiki", a: "Bleach", p: "Sode no Shirayuki (Ice Zanpakuto)", f: "Gotei 13" },
  { n: "Sosuke Aizen", a: "Bleach", p: "Kyoka Suigetsu (Complete Hypnosis)", f: "Arrancar / Hueco Mundo" },
  { n: "Byakuya Kuchiki", a: "Bleach", p: "Senbonzakura (Cherry Blossom Blades)", f: "Gotei 13" },

  // One Piece
  { n: "Monkey D. Luffy", a: "One Piece", p: "Gum-Gum Fruit / Haki", f: "Straw Hat Pirates" },
  { n: "Roronoa Zoro", a: "One Piece", p: "Three-Sword Style / Haki", f: "Straw Hat Pirates" },
  { n: "Sanji", a: "One Piece", p: "Black Leg Style / Diable Jambe", f: "Straw Hat Pirates" },
  { n: "Trafalgar Law", a: "One Piece", p: "Op-Op Fruit (Ope Ope no Mi)", f: "Heart Pirates" },
  { n: "Kaido", a: "One Piece", p: "Fish-Fish Fruit, Model: Azure Dragon", f: "Beasts Pirates" },

  // Blue Lock
  { n: "Yoichi Isagi", a: "Blue Lock", p: "Spatial Awareness / Direct Shot", f: "Blue Lock Project" },
  { n: "Meguru Bachira", a: "Blue Lock", p: "Elite Dribbling / Monster Ego", f: "Blue Lock Project" },
  { n: "Seishiro Nagi", a: "Blue Lock", p: "Perfect Ball Control", f: "Blue Lock Project" },
  { n: "Rin Itoshi", a: "Blue Lock", p: "Puppeteer Soccer / Perfect Accuracy", f: "Blue Lock Project" },

  // Solo Leveling
  { n: "Sung Jinwoo", a: "Solo Leveling", p: "Shadow Extraction / Ruler's Authority", f: "Ahjin Guild" },
  { n: "Cha Hae-In", a: "Solo Leveling", p: "Sword Dance / Smell of Mana", f: "Hunters Guild" },
  { n: "Igris", a: "Solo Leveling", p: "Shadow Knight Abilities", f: "Shadow Army" },

  // Jujutsu Kaisen
  { n: "Yuji Itadori", a: "Jujutsu Kaisen", p: "Divergent Fist / Black Flash", f: "Tokyo Jujutsu High" },
  { n: "Satoru Gojo", a: "Jujutsu Kaisen", p: "Limitless / Six Eyes", f: "Tokyo Jujutsu High" },
  { n: "Megumi Fushiguro", a: "Jujutsu Kaisen", p: "Ten Shadows Technique", f: "Tokyo Jujutsu High" },
  { n: "Nobara Kugisaki", a: "Jujutsu Kaisen", p: "Straw Doll Technique / Resonance", f: "Tokyo Jujutsu High" },
  { n: "Ryomen Sukuna", a: "Jujutsu Kaisen", p: "Cleave and Dismantle / Malevolent Shrine", f: "Cursed Spirits" },

  // My Hero Academia
  { n: "Izuku Midoriya", a: "My Hero Academia", p: "One For All", f: "U.A. High School" },
  { n: "Katsuki Bakugo", a: "My Hero Academia", p: "Explosion", f: "U.A. High School" },
  { n: "Shoto Todoroki", a: "My Hero Academia", p: "Half-Cold Half-Hot", f: "U.A. High School" },
  { n: "All Might", a: "My Hero Academia", p: "One For All (Former)", f: "Pro Heroes" },
  { n: "Tomura Shigaraki", a: "My Hero Academia", p: "Decay", f: "League of Villains" },

  // Fullmetal Alchemist: Brotherhood
  { n: "Edward Elric", a: "Fullmetal Alchemist: Brotherhood", p: "Alchemy without a Transmutation Circle", f: "Amestrian State Military" },
  { n: "Alphonse Elric", a: "Fullmetal Alchemist: Brotherhood", p: "Alchemy / Soul attached to Armor", f: "Amestrian State Military" },
  { n: "Roy Mustang", a: "Fullmetal Alchemist: Brotherhood", p: "Flame Alchemy", f: "Amestrian State Military" },
  { n: "Scar", a: "Fullmetal Alchemist: Brotherhood", p: "Deconstruction Alchemy (Right Arm)", f: "Ishvalan Refugees" },

  // Black Clover
  { n: "Asta", a: "Black Clover", p: "Anti-Magic / Grimoire of the Five-Leaf Clover", f: "Black Bulls" },
  { n: "Yuno Grinberryall", a: "Black Clover", p: "Wind Magic / Star Magic", f: "Golden Dawn" },
  { n: "Yami Sukehiro", a: "Black Clover", p: "Dark Magic", f: "Black Bulls" },

  // Fairy Tail
  { n: "Natsu Dragneel", a: "Fairy Tail", p: "Fire Dragon Slayer Magic", f: "Fairy Tail Guild" },
  { n: "Lucy Heartfilia", a: "Fairy Tail", p: "Celestial Spirit Magic", f: "Fairy Tail Guild" },
  { n: "Erza Scarlet", a: "Fairy Tail", p: "Requip Magic (The Knight)", f: "Fairy Tail Guild" },

  // Kaiju No. 8
  { n: "Kafka Hibino", a: "Kaiju No. 8", p: "Kaiju Transformation (No. 8)", f: "Anti-Kaiju Defense Force" },
  { n: "Mina Ashiro", a: "Kaiju No. 8", p: "Heavy Firearms Mastery / T-51", f: "Anti-Kaiju Defense Force" },
  { n: "Kikoru Shinomiya", a: "Kaiju No. 8", p: "Monstrous Super Strength / Custom Axe", f: "Anti-Kaiju Defense Force" },

  // Dragon Ball Z
  { n: "Goku", a: "Dragon Ball Z", p: "Kamehameha / Super Saiyan", f: "Z Fighters" },
  { n: "Vegeta", a: "Dragon Ball Z", p: "Galick Gun / Final Flash", f: "Z Fighters" },
  { n: "Piccolo", a: "Dragon Ball Z", p: "Special Beam Cannon", f: "Z Fighters" },
  { n: "Frieza", a: "Dragon Ball Z", p: "Death Beam / Golden Form", f: "Frieza Force" },

  // Hunter x Hunter
  { n: "Gon Freecss", a: "Hunter x Hunter", p: "Jajanken (Enhancer Nen)", f: "Hunters Association" },
  { n: "Killua Zoldyck", a: "Hunter x Hunter", p: "Godspeed / Lightning Transmutation", f: "Hunters Association" },
  { n: "Kurapika", a: "Hunter x Hunter", p: "Emperor Time / Conjured Chains", f: "Hunters Association" },
  { n: "Hisoka Morow", a: "Hunter x Hunter", p: "Bungee Gum (Properties of both rubber and gum)", f: "Phantom Troupe (Former)" },

  // Death Note
  { n: "Light Yagami", a: "Death Note", p: "Genius Intellect / The Death Note", f: "Kira" },
  { n: "L Lawliet", a: "Death Note", p: "Genius Detective Skills", f: "Japanese Task Force" },
  { n: "Ryuk", a: "Death Note", p: "Shinigami Eyes / Immortality", f: "Shinigami Realm" }
]

function generateQs(data, templates, extractCorrect, extractWrong) {
  const qs = []
  const wrongPool = [...new Set(data.map(extractWrong))].filter(Boolean)
  for (const item of data) {
    for (const t of templates) {
      const qText = t(item)
      const correct = extractCorrect(item)
      if (!correct) continue
      
      const wrong = shuffle(wrongPool.filter(p => p !== correct)).slice(0, 3)
      if (wrong.length === 3) {
        qs.push({ id: randomUUID(), q: qText, correct, wrong })
      }
    }
  }
  return qs
}

async function main() {
  const bank = { anime: [] }
  
  // 1. Character to Anime
  const safeAnimeCharacters = characters.filter(c => !c.n.toLowerCase().includes(c.a.toLowerCase()))
  bank['anime'].push(...generateQs(safeAnimeCharacters, [
    c => `Which popular anime series features the character ${c.n}?`,
    c => `${c.n} is a prominent character in which anime?`,
    c => `If you were watching ${c.n}, which anime would you be viewing?`
  ], c => c.a, c => c.a))
  
  // 2. Power Systems
  bank['anime'].push(...generateQs(characters, [
    c => `What is the primary power, weapon, or ability used by ${c.n} in ${c.a}?`,
    c => `In ${c.a}, ${c.n} is known for utilizing which distinct ability?`,
    c => `Which technique or power is heavily associated with ${c.n}?`
  ], c => c.p, c => c.p))

  // 3. Factions
  bank['anime'].push(...generateQs(characters, [
    c => `Which organization, faction, or group is ${c.n} affiliated with in ${c.a}?`,
    c => `In the world of ${c.a}, ${c.n} belongs to which group?`,
    c => `What is the name of the main group/faction that ${c.n} is a member of?`
  ], c => c.f, c => c.f))
  
  // Final deduplication & massive scale
  const seen = new Set()
  bank['anime'] = bank['anime'].filter(q => {
    if (!q.q || !q.correct || q.wrong.length < 3) return false
    if (seen.has(q.q)) return false
    seen.add(q.q)
    return true
  })

  const output = {
    attribution: "Popular Shonen/Seinen Anime Generator",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/anime.json', JSON.stringify(output, null, 2))
  console.log(`Saved to data/anime.json with ${bank['anime'].length} questions`)
}

main()
