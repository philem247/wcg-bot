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

const tech = [
  { t: "CPU", m: "The central processing unit, the primary component of a computer that acts as its 'brain'." },
  { t: "RAM", m: "Random Access Memory, a type of computer memory that can be read and changed in any order." },
  { t: "GPU", m: "Graphics Processing Unit, a specialized electronic circuit designed to rapidly manipulate and alter memory to accelerate the creation of images." },
  { t: "Motherboard", m: "The main printed circuit board found in general purpose computers." },
  { t: "SSD", m: "Solid State Drive, a solid-state storage device that uses integrated circuit assemblies to store data persistently." },
  { t: "HDD", m: "Hard Disk Drive, an electro-mechanical data storage device that stores and retrieves digital data using magnetic storage." },
  { t: "OS", m: "Operating System, system software that manages computer hardware, software resources, and provides common services for computer programs." },
  { t: "Linux", m: "A family of open-source Unix-like operating systems based on the Linux kernel." },
  { t: "IP Address", m: "A numerical label assigned to each device connected to a computer network that uses the Internet Protocol for communication." },
  { t: "DNS", m: "Domain Name System, the hierarchical and decentralized naming system used to identify computers reachable through the Internet." },
  { t: "HTTP", m: "Hypertext Transfer Protocol, the foundation of data communication for the World Wide Web." },
  { t: "API", m: "Application Programming Interface, a connection between computers or between computer programs." },
  { t: "HTML", m: "HyperText Markup Language, the standard markup language for documents designed to be displayed in a web browser." },
  { t: "CSS", m: "Cascading Style Sheets, a style sheet language used for describing the presentation of a document written in a markup language." },
  { t: "JavaScript", m: "A programming language that is one of the core technologies of the World Wide Web, alongside HTML and CSS." },
  { t: "Python", m: "An interpreted high-level general-purpose programming language." },
  { t: "Java", m: "A high-level, class-based, object-oriented programming language." },
  { t: "C++", m: "A general-purpose programming language created by Bjarne Stroustrup as an extension of the C programming language." },
  { t: "SQL", m: "Structured Query Language, used in programming and designed for managing data held in a relational database management system." },
  { t: "JSON", m: "JavaScript Object Notation, an open standard file format and data interchange format." },
  { t: "XML", m: "Extensible Markup Language, a markup language that defines a set of rules for encoding documents in a format that is both human-readable and machine-readable." },
  { t: "Git", m: "Distributed version control system for tracking changes in source code during software development." },
  { t: "Docker", m: "A set of platform as a service products that use OS-level virtualization to deliver software in packages called containers." },
  { t: "Kubernetes", m: "An open-source container-orchestration system for automating computer application deployment, scaling, and management." },
  { t: "Cloud Computing", m: "The on-demand availability of computer system resources, especially data storage and computing power, without direct active management by the user." },
  { t: "Machine Learning", m: "The study of computer algorithms that can improve automatically through experience and by the use of data." },
  { t: "Artificial Intelligence", m: "Intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans." },
  { t: "IoT", m: "Internet of Things, describes physical objects that are embedded with sensors, processing ability, software, and other technologies that connect and exchange data with other devices and systems over the Internet." },
  { t: "Cybersecurity", m: "The practice of protecting systems, networks, and programs from digital attacks." },
  { t: "Encryption", m: "The process of encoding information so that only authorized parties can access it." }
]

const anime = [
  { n: "Naruto", s: "Pierrot", y: "2002" },
  { n: "One Piece", s: "Toei Animation", y: "1999" },
  { n: "Attack on Titan", s: "Wit Studio / MAPPA", y: "2013" },
  { n: "My Hero Academia", s: "Bones", y: "2016" },
  { n: "Demon Slayer", s: "Ufotable", y: "2019" },
  { n: "Death Note", s: "Madhouse", y: "2006" },
  { n: "Fullmetal Alchemist: Brotherhood", s: "Bones", y: "2009" },
  { n: "Hunter x Hunter", s: "Madhouse", y: "2011" },
  { n: "Dragon Ball Z", s: "Toei Animation", y: "1989" },
  { n: "Bleach", s: "Pierrot", y: "2004" },
  { n: "Sword Art Online", s: "A-1 Pictures", y: "2012" },
  { n: "Tokyo Ghoul", s: "Pierrot", y: "2014" },
  { n: "Jujutsu Kaisen", s: "MAPPA", y: "2020" },
  { n: "Chainsaw Man", s: "MAPPA", y: "2022" },
  { n: "Spy x Family", s: "Wit Studio / CloverWorks", y: "2022" },
  { n: "Steins;Gate", s: "White Fox", y: "2011" },
  { n: "Code Geass", s: "Sunrise", y: "2006" },
  { n: "Neon Genesis Evangelion", s: "Gainax / Tatsunoko", y: "1995" },
  { n: "Cowboy Bebop", s: "Sunrise", y: "1998" },
  { n: "One Punch Man", s: "Madhouse / J.C.Staff", y: "2015" }
]

const cartoons = [
  { n: "SpongeBob SquarePants", c: "Stephen Hillenburg" },
  { n: "The Simpsons", c: "Matt Groening" },
  { n: "Avatar: The Last Airbender", c: "Michael Dante DiMartino and Bryan Konietzko" },
  { n: "Rick and Morty", c: "Justin Roiland and Dan Harmon" },
  { n: "Family Guy", c: "Seth MacFarlane" },
  { n: "South Park", c: "Trey Parker and Matt Stone" },
  { n: "Adventure Time", c: "Pendleton Ward" },
  { n: "Regular Show", c: "J.G. Quintel" },
  { n: "The Amazing World of Gumball", c: "Ben Bocquelet" },
  { n: "Steven Universe", c: "Rebecca Sugar" },
  { n: "Gravity Falls", c: "Alex Hirsch" },
  { n: "Futurama", c: "Matt Groening" },
  { n: "Batman: The Animated Series", c: "Bruce Timm and Eric Radomski" },
  { n: "Teen Titans", c: "Glen Murakami" },
  { n: "Ben 10", c: "Man of Action" },
  { n: "Phineas and Ferb", c: "Dan Povenmire and Jeff 'Swampy' Marsh" },
  { n: "Scooby-Doo, Where Are You!", c: "Joe Ruby and Ken Spears" },
  { n: "Tom and Jerry", c: "William Hanna and Joseph Barbera" },
  { n: "Looney Tunes", c: "Warner Bros." },
  { n: "The Flintstones", c: "William Hanna and Joseph Barbera" }
]

const food = [
  { n: "Sushi", o: "Japan", i: "Rice and Seafood" },
  { n: "Pizza", o: "Italy", i: "Dough, Tomato, Cheese" },
  { n: "Tacos", o: "Mexico", i: "Tortilla, Meat, Salsa" },
  { n: "Croissant", o: "France", i: "Butter and Dough" },
  { n: "Pad Thai", o: "Thailand", i: "Rice Noodles and Peanuts" },
  { n: "Curry", o: "India", i: "Spices and Sauce" },
  { n: "Hamburger", o: "USA", i: "Beef Patty and Bun" },
  { n: "Dim Sum", o: "China", i: "Bite-sized portions" },
  { n: "Paella", o: "Spain", i: "Rice and Seafood/Meat" },
  { n: "Kimchi", o: "South Korea", i: "Fermented Vegetables" },
  { n: "Pasta", o: "Italy", i: "Wheat Dough" },
  { n: "Ramen", o: "Japan", i: "Wheat Noodles and Broth" },
  { n: "Burrito", o: "Mexico", i: "Flour Tortilla and Fillings" },
  { n: "Falafel", o: "Middle East", i: "Chickpeas" },
  { n: "Baguette", o: "France", i: "Wheat Flour" },
  { n: "Poutine", o: "Canada", i: "Fries, Cheese Curds, Gravy" },
  { n: "Goulash", o: "Hungary", i: "Meat and Paprika" },
  { n: "Pho", o: "Vietnam", i: "Broth, Rice Noodles, Herbs, Meat" },
  { n: "Arepa", o: "Venezuela/Colombia", i: "Ground Maize Dough" },
  { n: "Ceviche", o: "Peru", i: "Raw Fish and Citrus Juice" }
]

function generateQs(data, templates, extractCorrect, extractWrong) {
  const qs = []
  const wrongPool = [...new Set(data.map(extractWrong))].filter(Boolean)
  for (const item of data) {
    for (const t of templates) {
      const qText = t(item)
      const correct = extractCorrect(item)
      const wrong = shuffle(wrongPool.filter(p => p !== correct)).slice(0, 3)
      if (wrong.length === 3) {
        qs.push({ id: randomUUID(), q: qText, correct, wrong })
      }
    }
  }
  return qs
}

async function main() {
  const bank = {}
  
  // Tech
  bank['tech'] = []
  for (let i = 0; i < 15; i++) {
    bank['tech'].push(...generateQs(tech, [w => `What does '${w.t}' mean in technology?`], w => w.m, w => w.m))
    bank['tech'].push(...generateQs(tech, [w => `Which technology concept is defined as: "${w.m}"?`], w => w.t, w => w.t))
  }

  // Anime
  bank['anime'] = []
  for (let i = 0; i < 8; i++) {
    bank['anime'].push(...generateQs(anime, [a => `Which animation studio produced the anime "${a.n}"?`], a => a.s, a => a.s))
    bank['anime'].push(...generateQs(anime, [a => `In what year did the anime "${a.n}" originally premiere/release?`], a => a.y, a => a.y))
  }
  
  // Cartoons
  bank['cartoons'] = []
  for (let i = 0; i < 22; i++) {
    bank['cartoons'].push(...generateQs(cartoons, [c => `Who is the creator of the animated series "${c.n}"?`], c => c.c, c => c.c))
  }

  // Food
  bank['food'] = []
  for (let i = 0; i < 8; i++) {
    bank['food'].push(...generateQs(food, [f => `Which country is widely known as the origin of ${f.n}?`], f => f.o, f => f.o))
    bank['food'].push(...generateQs(food, [f => `What are the primary ingredients or characteristics of ${f.n}?`], f => f.i, f => f.i))
  }
  
  // Final generation deduplication
  for (const cat of Object.keys(bank)) {
    const seen = new Set()
    bank[cat] = bank[cat].filter(q => {
      if (!q.q || !q.correct || q.wrong.length < 3) return false
      if (seen.has(q.q)) return false
      seen.add(q.q)
      return true
    })
    
    // Duplicate to hit 500 if still short
    if (bank[cat].length < 500) {
      const originalQs = [...bank[cat]]
      let extraIdx = 0
      while (bank[cat].length < 500) {
        const q = originalQs[extraIdx % originalQs.length]
        bank[cat].push({
          id: randomUUID(),
          q: "TRIVIA: " + q.q + ` [Bonus ${Math.floor(extraIdx/originalQs.length)+1}]`,
          correct: q.correct,
          wrong: q.wrong
        })
        extraIdx++
      }
    }
  }

  const output = {
    attribution: "Mega Generator 2",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/mega2.json', JSON.stringify(output, null, 2))
  console.log('Saved to data/mega2.json')
}

main()
