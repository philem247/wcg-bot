import { writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5)
}

function generateQs(data, templates, extractCorrect, extractWrong) {
  const qs = []
  const wrongPool = [...new Set(data.map(extractWrong))].filter(Boolean)
  for (const item of data) {
    for (const t of templates) {
      const qText = t(item)
      if (!qText) continue // Allow templates to return falsy if they shouldn't generate for this item

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

// Function to get just the first name (to avoid giving away clan)
function firstName(fullName) {
  return fullName.split(' ')[0]
}

const shinobi = [
  // Konoha 11 + Teams
  { n: 'Naruto Uzumaki', c: 'Uzumaki', v: 'Hidden Leaf', t: 'Team 7', s: 'Kakashi Hatake' },
  { n: 'Sasuke Uchiha', c: 'Uchiha', v: 'Hidden Leaf', t: 'Team 7', s: 'Kakashi Hatake' },
  { n: 'Sakura Haruno', c: 'Haruno', v: 'Hidden Leaf', t: 'Team 7', s: 'Kakashi Hatake' },
  { n: 'Kakashi Hatake', c: 'Hatake', v: 'Hidden Leaf', t: 'Team Minato', s: 'Minato Namikaze' },
  { n: 'Shikamaru Nara', c: 'Nara', v: 'Hidden Leaf', t: 'Team 10', s: 'Asuma Sarutobi' },
  { n: 'Ino Yamanaka', c: 'Yamanaka', v: 'Hidden Leaf', t: 'Team 10', s: 'Asuma Sarutobi' },
  { n: 'Choji Akimichi', c: 'Akimichi', v: 'Hidden Leaf', t: 'Team 10', s: 'Asuma Sarutobi' },
  { n: 'Asuma Sarutobi', c: 'Sarutobi', v: 'Hidden Leaf', t: 'Twelve Guardian Ninja', s: 'Hiruzen Sarutobi' },
  { n: 'Hinata Hyuga', c: 'Hyuga', v: 'Hidden Leaf', t: 'Team 8', s: 'Kurenai Yuhi' },
  { n: 'Kiba Inuzuka', c: 'Inuzuka', v: 'Hidden Leaf', t: 'Team 8', s: 'Kurenai Yuhi' },
  { n: 'Shino Aburame', c: 'Aburame', v: 'Hidden Leaf', t: 'Team 8', s: 'Kurenai Yuhi' },
  { n: 'Kurenai Yuhi', c: 'Yuhi', v: 'Hidden Leaf', t: 'None', s: 'None' },
  { n: 'Neji Hyuga', c: 'Hyuga', v: 'Hidden Leaf', t: 'Team Guy', s: 'Might Guy' },
  { n: 'Rock Lee', c: 'Lee', v: 'Hidden Leaf', t: 'Team Guy', s: 'Might Guy' },
  { n: 'Tenten', c: 'None', v: 'Hidden Leaf', t: 'Team Guy', s: 'Might Guy' },
  { n: 'Might Guy', c: 'Might', v: 'Hidden Leaf', t: 'None', s: 'Might Duy' },
  
  // Sand Siblings
  { n: 'Gaara', c: 'Kazekage', v: 'Hidden Sand', t: 'Baki Squad', s: 'Baki' },
  { n: 'Temari', c: 'Kazekage', v: 'Hidden Sand', t: 'Baki Squad', s: 'Baki' },
  { n: 'Kankuro', c: 'Kazekage', v: 'Hidden Sand', t: 'Baki Squad', s: 'Baki' },
  { n: 'Baki', c: 'None', v: 'Hidden Sand', t: 'None', s: 'None' },

  // Sound Four + Orochimaru's subordinates
  { n: 'Jirobo', c: 'None', v: 'Hidden Sound', t: 'Sound Four', s: 'Orochimaru' },
  { n: 'Kidomaru', c: 'None', v: 'Hidden Sound', t: 'Sound Four', s: 'Orochimaru' },
  { n: 'Sakon', c: 'None', v: 'Hidden Sound', t: 'Sound Four', s: 'Orochimaru' },
  { n: 'Tayuya', c: 'None', v: 'Hidden Sound', t: 'Sound Four', s: 'Orochimaru' },
  { n: 'Kimimaro', c: 'Kaguya', v: 'Hidden Sound', t: 'Sound Five', s: 'Orochimaru' },
  { n: 'Kabuto Yakushi', c: 'Yakushi', v: 'Hidden Sound', t: 'Team Kabuto', s: 'Orochimaru' },

  // Sannin & Early Legends
  { n: 'Jiraiya', c: 'None', v: 'Hidden Leaf', t: 'Team Hiruzen', s: 'Hiruzen Sarutobi' },
  { n: 'Tsunade Senju', c: 'Senju', v: 'Hidden Leaf', t: 'Team Hiruzen', s: 'Hiruzen Sarutobi' },
  { n: 'Orochimaru', c: 'None', v: 'Hidden Sound', t: 'Team Hiruzen', s: 'Hiruzen Sarutobi' },
  { n: 'Minato Namikaze', c: 'Namikaze', v: 'Hidden Leaf', t: 'Team Jiraiya', s: 'Jiraiya' },
  { n: 'Kushina Uzumaki', c: 'Uzumaki', v: 'Hidden Eddy', t: 'None', s: 'None' },

  // Other Cloud/Stone/Mist
  { n: 'Darui', c: 'None', v: 'Hidden Cloud', t: 'First Division', s: 'A (Third Raikage)' },
  { n: 'Omoi', c: 'None', v: 'Hidden Cloud', t: 'Team Samui', s: 'Killer Bee' },
  { n: 'Karui', c: 'None', v: 'Hidden Cloud', t: 'Team Samui', s: 'Killer Bee' },
  { n: 'Samui', c: 'None', v: 'Hidden Cloud', t: 'Team Samui', s: 'Killer Bee' },
  { n: 'Kurotsuchi', c: 'Kamizuru', v: 'Hidden Stone', t: 'Second Division', s: 'Onoki' },
  { n: 'Akatsuchi', c: 'None', v: 'Hidden Stone', t: 'None', s: 'Onoki' },
  { n: 'Chojuro', c: 'None', v: 'Hidden Mist', t: 'Seven Ninja Swordsmen', s: 'Mei Terumi' },
  { n: 'Ao', c: 'None', v: 'Hidden Mist', t: 'Hunter-nin', s: 'None' },
  { n: 'Zabuza Momochi', c: 'Momochi', v: 'Hidden Mist', t: 'Seven Ninja Swordsmen', s: 'None' },
  { n: 'Haku', c: 'Yuki', v: 'Hidden Mist', t: 'None', s: 'Zabuza Momochi' },

  // Taka / Hebi
  { n: 'Suigetsu Hozuki', c: 'Hozuki', v: 'Hidden Mist', t: 'Taka', s: 'Orochimaru' },
  { n: 'Karin', c: 'Uzumaki', v: 'Hidden Grass', t: 'Taka', s: 'Orochimaru' },
  { n: 'Jugo', c: 'None', v: 'Hidden Sound', t: 'Taka', s: 'Orochimaru' },

  // Other prominent Leaf
  { n: 'Sai', c: 'Yamanaka', v: 'Hidden Leaf', t: 'Team 7', s: 'Danzo Shimura' },
  { n: 'Yamato', c: 'Iburi', v: 'Hidden Leaf', t: 'Team 7', s: 'Kakashi Hatake' },
  { n: 'Danzo Shimura', c: 'Shimura', v: 'Hidden Leaf', t: 'Root', s: 'Tobirama Senju' },
  { n: 'Shisui Uchiha', c: 'Uchiha', v: 'Hidden Leaf', t: 'None', s: 'None' },
  { n: 'Fugaku Uchiha', c: 'Uchiha', v: 'Hidden Leaf', t: 'Konoha Military Police', s: 'None' },
  { n: 'Mikoto Uchiha', c: 'Uchiha', v: 'Hidden Leaf', t: 'None', s: 'None' },
  { n: 'Konohamaru Sarutobi', c: 'Sarutobi', v: 'Hidden Leaf', t: 'Team Ebisu', s: 'Ebisu' },
  { n: 'Ebisu', c: 'None', v: 'Hidden Leaf', t: 'Team Ebisu', s: 'None' },
  { n: 'Iruka Umino', c: 'Umino', v: 'Hidden Leaf', t: 'None', s: 'None' },
  { n: 'Mizuki', c: 'None', v: 'Hidden Leaf', t: 'None', s: 'None' },

  // Akatsuki Origins
  { n: 'Yahiko', c: 'None', v: 'Hidden Rain', t: 'Ame Orphans', s: 'Jiraiya' },
  { n: 'Nagato', c: 'Uzumaki', v: 'Hidden Rain', t: 'Ame Orphans', s: 'Jiraiya' },
  { n: 'Konan', c: 'None', v: 'Hidden Rain', t: 'Ame Orphans', s: 'Jiraiya' },
  { n: 'Obito Uchiha', c: 'Uchiha', v: 'Hidden Leaf', t: 'Team Minato', s: 'Minato Namikaze' },
  { n: 'Rin Nohara', c: 'Nohara', v: 'Hidden Leaf', t: 'Team Minato', s: 'Minato Namikaze' }
]

const kages = [
  { n: 'Hashirama Senju', v: 'Hidden Leaf', t: 'First Hokage' },
  { n: 'Tobirama Senju', v: 'Hidden Leaf', t: 'Second Hokage' },
  { n: 'Hiruzen Sarutobi', v: 'Hidden Leaf', t: 'Third Hokage' },
  { n: 'Minato Namikaze', v: 'Hidden Leaf', t: 'Fourth Hokage' },
  { n: 'Tsunade Senju', v: 'Hidden Leaf', t: 'Fifth Hokage' },
  { n: 'Kakashi Hatake', v: 'Hidden Leaf', t: 'Sixth Hokage' },
  { n: 'Naruto Uzumaki', v: 'Hidden Leaf', t: 'Seventh Hokage' },
  
  { n: 'Reto', v: 'Hidden Sand', t: 'First Kazekage' },
  { n: 'Shamon', v: 'Hidden Sand', t: 'Second Kazekage' },
  { n: 'Third Kazekage (Unnamed)', v: 'Hidden Sand', t: 'Third Kazekage' },
  { n: 'Rasa', v: 'Hidden Sand', t: 'Fourth Kazekage' },
  { n: 'Gaara', v: 'Hidden Sand', t: 'Fifth Kazekage' },

  { n: 'A (First)', v: 'Hidden Cloud', t: 'First Raikage' },
  { n: 'A (Second)', v: 'Hidden Cloud', t: 'Second Raikage' },
  { n: 'A (Third)', v: 'Hidden Cloud', t: 'Third Raikage' },
  { n: 'A (Fourth)', v: 'Hidden Cloud', t: 'Fourth Raikage' },
  { n: 'Darui', v: 'Hidden Cloud', t: 'Fifth Raikage' },

  { n: 'Byakuren', v: 'Hidden Mist', t: 'First Mizukage' },
  { n: 'Gengetsu Hozuki', v: 'Hidden Mist', t: 'Second Mizukage' },
  { n: 'Third Mizukage (Unnamed)', v: 'Hidden Mist', t: 'Third Mizukage' },
  { n: 'Yagura Karatachi', v: 'Hidden Mist', t: 'Fourth Mizukage' },
  { n: 'Mei Terumi', v: 'Hidden Mist', t: 'Fifth Mizukage' },
  { n: 'Chojuro', v: 'Hidden Mist', t: 'Sixth Mizukage' },

  { n: 'Ishikawa', v: 'Hidden Stone', t: 'First Tsuchikage' },
  { n: 'Mu', v: 'Hidden Stone', t: 'Second Tsuchikage' },
  { n: 'Onoki', v: 'Hidden Stone', t: 'Third Tsuchikage' },
  { n: 'Kurotsuchi', v: 'Hidden Stone', t: 'Fourth Tsuchikage' }
]

const jutsu = [
  { n: 'Rasengan', t: 'None', c: 'Minato Namikaze', r: 'Ninjutsu' },
  { n: 'Chidori', t: 'Lightning', c: 'Kakashi Hatake', r: 'Ninjutsu' },
  { n: 'Amaterasu', t: 'Fire', c: 'Itachi Uchiha', r: 'Dojutsu / Ninjutsu' },
  { n: 'Tsukuyomi', t: 'Yin', c: 'Itachi Uchiha', r: 'Genjutsu' },
  { n: 'Susanoo', t: 'None', c: 'Itachi Uchiha', r: 'Dojutsu' },
  { n: 'Shadow Clone Jutsu', t: 'None', c: 'Tobirama Senju', r: 'Ninjutsu' },
  { n: 'Flying Thunder God', t: 'None', c: 'Tobirama Senju', r: 'Space-Time Ninjutsu' },
  { n: 'Edo Tensei (Reanimation)', t: 'None', c: 'Tobirama Senju', r: 'Kinjutsu (Forbidden)' },
  { n: 'Kirin', t: 'Lightning', c: 'Sasuke Uchiha', r: 'Ninjutsu' },
  { n: 'Rasen-Shuriken', t: 'Wind', c: 'Naruto Uzumaki', r: 'Ninjutsu' },
  { n: 'Wood Dragon', t: 'Wood', c: 'Hashirama Senju', r: 'Kekkei Genkai' },
  { n: 'Sand Coffin', t: 'Earth', c: 'Gaara', r: 'Ninjutsu' },
  { n: 'Water Prison', t: 'Water', c: 'Zabuza Momochi', r: 'Ninjutsu' },
  { n: 'Reaper Death Seal', t: 'None', c: 'Minato Namikaze', r: 'Fuinjutsu (Sealing)' },
  { n: 'Eight Inner Gates', t: 'None', c: 'Might Duy', r: 'Taijutsu' },
  { n: 'Gentle Fist', t: 'None', c: 'Hyuga Clan', r: 'Taijutsu' },
  { n: 'Night Guy', t: 'None', c: 'Might Guy', r: 'Taijutsu' },
  { n: 'Kamui', t: 'None', c: 'Obito Uchiha', r: 'Space-Time Dojutsu' },
  { n: 'Kotoamatsukami', t: 'Genjutsu', c: 'Shisui Uchiha', r: 'Genjutsu' },
  { n: 'Izanagi', t: 'Yin-Yang', c: 'Uchiha Clan', r: 'Genjutsu / Kinjutsu' },
  { n: 'Izanami', t: 'Yin', c: 'Uchiha Clan', r: 'Genjutsu / Kinjutsu' },
  { n: 'Tengai Shinsei (Shattered Heaven)', t: 'Earth', c: 'Madara Uchiha', r: 'Ninjutsu' },
  { n: 'Planetary Devastation (Chibaku Tensei)', t: 'Earth', c: 'Hagoromo Otsutsuki', r: 'Fuinjutsu / Dojutsu' },
  { n: 'Almighty Push (Shinra Tensei)', t: 'None', c: 'Nagato', r: 'Dojutsu' },
  { n: 'Universal Pull (Bansho Ten\'in)', t: 'None', c: 'Nagato', r: 'Dojutsu' },
  { n: 'C4 Karura', t: 'Explosion', c: 'Deidara', r: 'Kekkei Genkai' },
  { n: 'C0 (Ultimate Art)', t: 'Explosion', c: 'Deidara', r: 'Kinjutsu / Suicide' },
  { n: 'Particle Style: Atomic Dismantling Jutsu', t: 'Dust', c: 'Mu', r: 'Kekkei Tota' },
  { n: 'Truth-Seeking Balls', t: 'All Natures', c: 'Hagoromo Otsutsuki', r: 'Senjutsu' },
  { n: 'Limbo: Border Jail', t: 'None', c: 'Madara Uchiha', r: 'Dojutsu' }
]

const akatsuki = [
  { n: 'Itachi Uchiha', r: 'Vermilion (Shu)', p: 'Kisame Hoshigaki', o: 'Hidden Leaf' },
  { n: 'Kisame Hoshigaki', r: 'South (Nan)', p: 'Itachi Uchiha', o: 'Hidden Mist' },
  { n: 'Deidara', r: 'Blue (Ao)', p: 'Sasori', o: 'Hidden Stone' },
  { n: 'Sasori', r: 'Jewel (Gyoku)', p: 'Deidara', o: 'Hidden Sand' },
  { n: 'Hidan', r: 'Three (San)', p: 'Kakuzu', o: 'Hidden Hot Water' },
  { n: 'Kakuzu', r: 'North (Hoku)', p: 'Hidan', o: 'Hidden Waterfall' },
  { n: 'Pain', r: 'Zero (Rei)', p: 'Konan', o: 'Hidden Rain' },
  { n: 'Konan', r: 'White (Haku)', p: 'Pain', o: 'Hidden Rain' },
  { n: 'Orochimaru', r: 'Sky (Ku)', p: 'Sasori', o: 'Hidden Leaf' },
  { n: 'Zetsu', r: 'Boar (Gai)', p: 'Obito Uchiha', o: 'None' },
  { n: 'Obito Uchiha (Tobi)', r: 'Jewel (Gyoku)', p: 'Deidara', o: 'Hidden Leaf' },
  { n: 'Juzo Biwa', r: 'South (Nan)', p: 'Itachi Uchiha', o: 'Hidden Mist' }
]

const dojutsu = [
  { n: 'Sharingan', c: 'Uchiha', a: 'Copying Jutsu and Kinetic Vision' },
  { n: 'Mangekyo Sharingan', c: 'Uchiha', a: 'Unique powerful Jutsu (e.g., Amaterasu, Susanoo)' },
  { n: 'Byakugan', c: 'Hyuga', a: '360-degree vision and seeing the chakra pathway system' },
  { n: 'Rinnegan', c: 'Otsutsuki', a: 'Mastery over all chakra natures and the Six Paths Techniques' },
  { n: 'Tenseigan', c: 'Otsutsuki', a: 'Reincarnation Eye granting immense chakra and Truth-Seeking Orbs' },
  { n: 'Ketsuryugan', c: 'Chinoike', a: 'Blood manipulation and powerful Genjutsu' },
  { n: 'Jougan', c: 'Otsutsuki', a: 'Perceiving negative emotions and chakra pathways' }
]

const bijuu = [
  { n: 'Shukaku', t: '1', j: 'Gaara', a: 'Sand and Magnet Release', s: 'Tanuki' },
  { n: 'Matatabi', t: '2', j: 'Yugito Nii', a: 'Blue Fire Release', s: 'Bakeneko (Two-Tailed Cat)' },
  { n: 'Isobu', t: '3', j: 'Yagura', a: 'Water Release and Coral', s: 'Turtle' },
  { n: 'Son Goku', t: '4', j: 'Roushi', a: 'Lava Release', s: 'Monkey' },
  { n: 'Kokuo', t: '5', j: 'Han', a: 'Boil Release', s: 'Horse-Dolphin hybrid' },
  { n: 'Saiken', t: '6', j: 'Utakata', a: 'Corrosive Acid and Bubble Ninjutsu', s: 'Slug' },
  { n: 'Chomei', t: '7', j: 'Fu', a: 'Flight and Scales', s: 'Horned Beetle' },
  { n: 'Gyuki', t: '8', j: 'Killer Bee', a: 'Ink Creation and immense physical strength', s: 'Ushi-Oni (Ox-Octopus)' },
  { n: 'Kurama', t: '9', j: 'Naruto Uzumaki', a: 'Massive Chakra reserves and negative emotion sensing', s: 'Kitsune (Nine-Tailed Fox)' },
  { n: 'Ten-Tails', t: '10', j: 'Obito Uchiha', a: 'Origin of all chakra and Infinite Tsukuyomi', s: 'Shinju (God Tree)' }
]

const weapons = [
  { n: 'Samehada', o: 'Kisame Hoshigaki', a: 'Shaving chakra and merging with its user' },
  { n: 'Kubikiribocho', o: 'Zabuza Momochi', a: 'Regenerating from the iron in the blood of its victims' },
  { n: 'Nuibari', o: 'Kushimaru Kuriarare', a: 'Piercing enemies and sewing them together' },
  { n: 'Shibuki', o: 'Jinpachi Munashi', a: 'Combining swordsmanship with explosive tags' },
  { n: 'Kabutowari', o: 'Jinin Akebino', a: 'Crushing any defense with a sword and hammer combo' },
  { n: 'Hiramekarei', o: 'Chojuro', a: 'Storing chakra and shaping it into constructs' },
  { n: 'Kiba (Lightning Blades)', o: 'Ameyuri Ringo', a: 'Channeling lightning sharper than any forged blade' },
  { n: 'Totsuka Blade', o: 'Itachi Uchiha', a: 'Sealing anyone it pierces into a genjutsu drunken stupor' },
  { n: 'Yata Mirror', o: 'Itachi Uchiha', a: 'Negating all physical and spiritual attacks' },
  { n: 'Gunbai', o: 'Madara Uchiha', a: 'Reflecting attacks and converting incoming chakra into wind' },
  { n: 'Bashosen', o: 'Kinkaku and Ginkaku', a: 'Generating all five basic chakra natures with a wave' },
  { n: 'Kohaku no Johei (Amber Purifying Pot)', o: 'Third Raikage', a: 'Sealing targets who respond to their name' }
]

const summonings = [
  { n: 'Gamabunta', s: 'Jiraiya', t: 'Toad' },
  { n: 'Manda', s: 'Orochimaru', t: 'Snake' },
  { n: 'Katsuyu', s: 'Tsunade', t: 'Slug' },
  { n: 'Enma', s: 'Hiruzen Sarutobi', t: 'Monkey' },
  { n: 'Pakkun', s: 'Kakashi Hatake', t: 'Ninja Hound' },
  { n: 'Gamakichi', s: 'Naruto Uzumaki', t: 'Toad' },
  { n: 'Aoda', s: 'Sasuke Uchiha', t: 'Snake' },
  { n: 'Garaga', s: 'Boruto Uzumaki', t: 'Snake' },
  { n: 'Baku', s: 'Danzo Shimura', t: 'Chimera/Elephant' },
  { n: 'Ibuse', s: 'Hanzo', t: 'Salamander' },
  { n: 'Kamari', s: 'Tayuya', t: 'Doki (Demons)' }
]

const arcs = [
  { n: 'Land of Waves Arc', e: 'Zabuza Momochi and Haku' },
  { n: 'Chunin Exams Arc', e: 'Orochimaru and Gaara' },
  { n: 'Konoha Crush Arc', e: 'Orochimaru' },
  { n: 'Search for Tsunade Arc', e: 'Itachi Uchiha and Kisame Hoshigaki' },
  { n: 'Sasuke Retrieval Arc', e: 'The Sound Four and Kimimaro' },
  { n: 'Kazekage Rescue Mission', e: 'Sasori and Deidara' },
  { n: 'Tenchi Bridge Reconnaissance Mission', e: 'Orochimaru and Kabuto' },
  { n: 'Akatsuki Suppression Mission', e: 'Hidan and Kakuzu' },
  { n: 'Itachi Pursuit Mission', e: 'Itachi Uchiha' },
  { n: 'Tale of Jiraiya the Gallant', e: 'Pain and Konan' },
  { n: 'Fated Battle Between Brothers', e: 'Itachi Uchiha' },
  { n: 'Pain\'s Assault Arc', e: 'Pain' },
  { n: 'Five Kage Summit Arc', e: 'Sasuke Uchiha and Obito Uchiha' },
  { n: 'Fourth Shinobi World War: Countdown', e: 'Kabuto Yakushi' },
  { n: 'Fourth Shinobi World War: Climax', e: 'Madara Uchiha and Obito Uchiha' },
  { n: 'Birth of the Ten-Tails\' Jinchuriki', e: 'Madara Uchiha and Kaguya Otsutsuki' },
  { n: 'Kaguya Otsutsuki Strikes', e: 'Kaguya Otsutsuki and Black Zetsu' }
]

async function main() {
  const bank = { naruto: [] }
  
  // Shinobi
  bank['naruto'].push(...generateQs(shinobi.filter(s => s.c !== 'None'), [
    s => `Which prominent clan does ${firstName(s.n)} belong to?`,
    s => `${firstName(s.n)} is a famous member of which ninja clan?`
  ], s => s.c, s => s.c))
  bank['naruto'].push(...generateQs(shinobi.filter(s => s.v !== 'None'), [
    s => `Which hidden village does ${s.n} hail from?`,
    s => `${s.n} is a shinobi from which village?`,
    s => `In the Naruto universe, ${s.n} is originally affiliated with which hidden village?`
  ], s => s.v, s => s.v))
  bank['naruto'].push(...generateQs(shinobi.filter(s => s.t !== 'None'), [
    s => `Which ninja squad or faction is ${s.n} famously a core member of?`,
    s => `${s.n} famously operated in which team?`,
    s => `During their ninja career, ${s.n} was primarily assigned to which group?`
  ], s => s.t, s => s.t))
  bank['naruto'].push(...generateQs(shinobi.filter(s => s.s !== 'None'), [
    s => `Who was the primary Jonin sensei or master of ${s.n}?`,
    s => `${s.n} was directly trained by or served under which shinobi?`
  ], s => s.s, s => s.s))

  // Kages
  bank['naruto'].push(...generateQs(kages, [
    k => `Which prestigious title did ${k.n} hold?`,
    k => `${k.n} is famously known by which Kage title?`
  ], k => k.t, k => k.t))
  bank['naruto'].push(...generateQs(kages, [
    k => `Who held the title of ${k.t} in the ${k.v}?`,
    k => `Which shinobi was appointed as the ${k.t}?`
  ], k => k.n, k => k.n))
  bank['naruto'].push(...generateQs(kages, [
    k => `The ${k.t} is the leader of which hidden village?`
  ], k => k.v, k => k.v))

  // Jutsu
  bank['naruto'].push(...generateQs(jutsu.filter(j => j.c !== 'None'), [
    j => `Who is recognized as the creator or most iconic user of the ${j.n}?`,
    j => `The jutsu "${j.n}" was famously created or heavily utilized by whom?`
  ], j => j.c, j => j.c))
  bank['naruto'].push(...generateQs(jutsu.filter(j => j.t !== 'None'), [
    j => `What is the primary chakra nature type of the ${j.n}?`,
    j => `The jutsu "${j.n}" relies on which primary chakra nature?`
  ], j => j.t, j => j.t))
  bank['naruto'].push(...generateQs(jutsu.filter(j => j.r !== 'None'), [
    j => `What type of technique is the ${j.n} classified as?`,
    j => `Under which broad classification does the ${j.n} fall?`
  ], j => j.r, j => j.r))

  // Akatsuki
  bank['naruto'].push(...generateQs(akatsuki.filter(a => a.p !== 'None'), [
    a => `Who was ${a.n}'s primary partner during their time in the Akatsuki?`,
    a => `In the Akatsuki organization, ${a.n} was typically paired with whom in the field?`
  ], a => a.p, a => a.p))
  bank['naruto'].push(...generateQs(akatsuki, [
    a => `What ring symbol did ${a.n} wear as an Akatsuki member?`
  ], a => a.r, a => a.r))
  bank['naruto'].push(...generateQs(akatsuki.filter(a => a.o !== 'None'), [
    a => `Which hidden village did ${a.n} defect from before joining the Akatsuki?`,
    a => `${a.n} was originally a shinobi from which village?`
  ], a => a.o, a => a.o))

  // Dojutsu
  bank['naruto'].push(...generateQs(dojutsu, [
    d => `Which clan is famously known for naturally possessing the ${d.n} dojutsu?`,
    d => `The visual prowess known as ${d.n} is the kekkei genkai of which clan?`
  ], d => d.c, d => d.c))
  bank['naruto'].push(...generateQs(dojutsu, [
    d => `What is the primary ability or signature trait associated with the ${d.n}?`
  ], d => d.a, d => d.a))

  // Bijuu
  bank['naruto'].push(...generateQs(bijuu, [
    b => `Who was the most famous or final Jinchuriki of the tailed beast ${b.n}?`,
    b => `Which character was notably the host (Jinchuriki) for ${b.n}?`
  ], b => b.j, b => b.j))
  bank['naruto'].push(...generateQs(bijuu, [
    b => `How many tails does the beast named ${b.n} possess?`,
    b => `What is the tail count of the Bijuu known as ${b.n}?`
  ], b => b.t, b => b.t))
  bank['naruto'].push(...generateQs(bijuu, [
    b => `What kind of mythological animal is ${b.n} based on?`,
    b => `The tailed beast ${b.n} takes the physical form of which creature?`
  ], b => b.s, b => b.s))
  bank['naruto'].push(...generateQs(bijuu, [
    b => `What unique ability, element, or kekkei genkai is associated with ${b.n}?`
  ], b => b.a, b => b.a))

  // Weapons
  bank['naruto'].push(...generateQs(weapons, [
    w => `Who is famously known as a primary wielder of the legendary weapon ${w.n}?`,
    w => `The ${w.n} is a legendary ninja tool famously utilized by whom?`
  ], w => w.o, w => w.o))
  bank['naruto'].push(...generateQs(weapons, [
    w => `What is the unique special ability of the weapon known as ${w.n}?`
  ], w => w.a, w => w.a))

  // Summonings
  bank['naruto'].push(...generateQs(summonings, [
    s => `Which character famously signs a blood contract to summon ${s.n}?`,
    s => `Who is known to summon the giant creature ${s.n} into battle?`
  ], s => s.s, s => s.s))
  bank['naruto'].push(...generateQs(summonings, [
    s => `What type of animal or creature is the summon ${s.n}?`
  ], s => s.t, s => s.t))

  // Arcs
  bank['naruto'].push(...generateQs(arcs, [
    a => `Which major antagonist or group was the primary threat during the "${a.n}"?`,
    a => `The "${a.n}" famously heavily featured which antagonist?`
  ], a => a.e, a => a.e))

  // Final deduplication
  const seen = new Set()
  bank['naruto'] = bank['naruto'].filter(q => {
    if (!q.q || !q.correct || !q.wrong || q.wrong.length < 3) return false
    if (seen.has(q.q)) return false
    seen.add(q.q)
    return true
  })
  
  const output = {
    attribution: "Massive Naruto Lore Generator",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/naruto.json', JSON.stringify(output, null, 2))
  console.log(`Saved to data/naruto.json with ${bank['naruto'].length} organic questions!`)
}

main()
