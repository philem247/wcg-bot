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
  { t: "CPU", m: "The primary component of a computer that acts as its 'brain'.", a: "Central Processing Unit" },
  { t: "RAM", m: "A type of computer memory that can be read and changed in any order.", a: "Random Access Memory" },
  { t: "GPU", m: "A specialized electronic circuit designed to rapidly manipulate and alter memory to accelerate the creation of images.", a: "Graphics Processing Unit" },
  { t: "SSD", m: "A solid-state storage device that uses integrated circuit assemblies to store data persistently.", a: "Solid State Drive" },
  { t: "HDD", m: "An electro-mechanical data storage device that stores and retrieves digital data using magnetic storage.", a: "Hard Disk Drive" },
  { t: "OS", m: "System software that manages computer hardware, software resources, and provides common services for computer programs.", a: "Operating System" },
  { t: "IP Address", m: "A numerical label assigned to each device connected to a computer network that uses the Internet Protocol for communication.", a: "Internet Protocol Address" },
  { t: "DNS", m: "The hierarchical and decentralized naming system used to identify computers reachable through the Internet.", a: "Domain Name System" },
  { t: "HTTP", m: "The foundation of data communication for the World Wide Web.", a: "Hypertext Transfer Protocol" },
  { t: "API", m: "A connection between computers or between computer programs.", a: "Application Programming Interface" },
  { t: "HTML", m: "The standard markup language for documents designed to be displayed in a web browser.", a: "HyperText Markup Language" },
  { t: "CSS", m: "A style sheet language used for describing the presentation of a document written in a markup language.", a: "Cascading Style Sheets" },
  { t: "JavaScript", m: "A programming language that is one of the core technologies of the World Wide Web.", f: "Brendan Eich" },
  { t: "Python", m: "An interpreted high-level general-purpose programming language.", f: "Guido van Rossum" },
  { t: "Java", m: "A high-level, class-based, object-oriented programming language.", f: "James Gosling" },
  { t: "C++", m: "A general-purpose programming language created as an extension of the C programming language.", f: "Bjarne Stroustrup" },
  { t: "SQL", m: "Used in programming and designed for managing data held in a relational database management system.", a: "Structured Query Language" },
  { t: "JSON", m: "An open standard file format and data interchange format.", a: "JavaScript Object Notation" },
  { t: "XML", m: "A markup language that defines a set of rules for encoding documents in a format that is both human-readable and machine-readable.", a: "Extensible Markup Language" },
  { t: "Git", m: "Distributed version control system for tracking changes in source code during software development.", f: "Linus Torvalds" },
  { t: "Linux", m: "A family of open-source Unix-like operating systems based on the Linux kernel.", f: "Linus Torvalds" },
  { t: "Motherboard", m: "The main printed circuit board found in general purpose computers." },
  { t: "Docker", m: "A set of platform as a service products that use OS-level virtualization to deliver software in packages called containers." },
  { t: "Kubernetes", m: "An open-source container-orchestration system for automating computer application deployment, scaling, and management." },
  { t: "Cloud Computing", m: "The on-demand availability of computer system resources, especially data storage and computing power, without direct active management by the user." },
  { t: "Machine Learning", m: "The study of computer algorithms that can improve automatically through experience and by the use of data." },
  { t: "Artificial Intelligence", m: "Intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans." },
  { t: "IoT", m: "Describes physical objects that are embedded with sensors, processing ability, software, and other technologies that connect and exchange data with other devices and systems over the Internet.", a: "Internet of Things" },
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
  { n: "SpongeBob SquarePants", c: "Stephen Hillenburg", l: "Bikini Bottom", p: "Gary the Snail" },
  { n: "The Simpsons", c: "Matt Groening", l: "Springfield", p: "Santa's Little Helper" },
  { n: "Avatar: The Last Airbender", c: "Michael Dante DiMartino and Bryan Konietzko", l: "The Four Nations", p: "Appa" },
  { n: "Rick and Morty", c: "Justin Roiland and Dan Harmon", l: "Earth (Dimension C-137)", p: "Snuffles" },
  { n: "Family Guy", c: "Seth MacFarlane", l: "Quahog", p: "Brian Griffin" },
  { n: "South Park", c: "Trey Parker and Matt Stone", l: "South Park", p: "Sparky" },
  { n: "Adventure Time", c: "Pendleton Ward", l: "The Land of Ooo", p: "Jake the Dog" },
  { n: "Regular Show", c: "J.G. Quintel", l: "The Park" },
  { n: "The Amazing World of Gumball", c: "Ben Bocquelet", l: "Elmore", p: "Darwin" },
  { n: "Steven Universe", c: "Rebecca Sugar", l: "Beach City", p: "Lion" },
  { n: "Gravity Falls", c: "Alex Hirsch", l: "Gravity Falls", p: "Waddles" },
  { n: "Futurama", c: "Matt Groening", l: "New New York", p: "Nibbler" },
  { n: "Batman: The Animated Series", c: "Bruce Timm and Eric Radomski", l: "Gotham City" },
  { n: "Teen Titans", c: "Glen Murakami", l: "Jump City", p: "Silkie" },
  { n: "Ben 10", c: "Man of Action", l: "Bellwood" },
  { n: "Phineas and Ferb", c: "Dan Povenmire and Jeff 'Swampy' Marsh", l: "Danville", p: "Perry the Platypus" },
  { n: "Scooby-Doo, Where Are You!", c: "Joe Ruby and Ken Spears", l: "Coolsville", p: "Scooby-Doo" },
  { n: "Tom and Jerry", c: "William Hanna and Joseph Barbera" },
  { n: "Looney Tunes", c: "Warner Bros." },
  { n: "The Flintstones", c: "William Hanna and Joseph Barbera", l: "Bedrock", p: "Dino" },
  { n: "Dexter's Laboratory", c: "Genndy Tartakovsky", l: "Dexter's House" },
  { n: "The Powerpuff Girls", c: "Craig McCracken", l: "Townsville" },
  { n: "Courage the Cowardly Dog", c: "John R. Dilworth", l: "Nowhere, Kansas", p: "Courage" },
  { n: "Ed, Edd n Eddy", c: "Danny Antonucci", l: "Peach Creek" },
  { n: "Johnny Bravo", c: "Van Partible", l: "Aron City" },
  { n: "Invader Zim", c: "Jhonen Vasquez", l: "Earth", p: "GIR" },
  { n: "The Fairly OddParents", c: "Butch Hartman", l: "Dimmsdale" },
  { n: "Danny Phantom", c: "Butch Hartman", l: "Amity Park" },
  { n: "Kim Possible", c: "Bob Schooley and Mark McCorkle", l: "Middleton", p: "Rufus" },
  { n: "The Proud Family", c: "Bruce W. Smith", l: "Wizville", p: "Puff" },
  { n: "Recess", c: "Paul Germain and Joe Ansolabehere", l: "Third Street School" },
  { n: "Rugrats", c: "Arlene Klasky, Gábor Csupó, and Paul Germain", l: "California", p: "Spike" },
  { n: "Hey Arnold!", c: "Craig Bartlett", l: "Hillwood", p: "Abner" },
  { n: "CatDog", c: "Peter Hannan", l: "Nearburg" },
  { n: "Animaniacs", c: "Tom Ruegger", l: "Warner Bros. Studio" },
  { n: "Pinky and the Brain", c: "Tom Ruegger", l: "Acme Labs" },
  { n: "Gargoyles", c: "Greg Weisman", l: "New York City", p: "Bronx" },
  { n: "X-Men: The Animated Series", c: "Mark Edward Edens", l: "Westchester County" },
  { n: "Spider-Man: The Animated Series", c: "John Semper", l: "New York City" },
  { n: "Justice League", c: "Bruce Timm", l: "Watchtower" },
  { n: "Transformers", c: "Hasbro", l: "Cybertron" },
  { n: "G.I. Joe: A Real American Hero", c: "Hasbro" },
  { n: "He-Man and the Masters of the Universe", c: "Lou Scheimer", l: "Eternia", p: "Battle Cat" },
  { n: "Thundercats", c: "Tobin 'Ted' Wolf", l: "Third Earth", p: "Snarf" },
  { n: "Voltron", c: "Peter Keefe" },
  { n: "Teenage Mutant Ninja Turtles", c: "Kevin Eastman and Peter Laird", l: "New York City" },
  { n: "Inspector Gadget", c: "Bruno Bianchi, Andy Heyward, and Jean Chalopin", l: "Metro City", p: "Brain" },
  { n: "The Jetsons", c: "William Hanna and Joseph Barbera", l: "Orbit City", p: "Astro" },
  { n: "Peanuts", c: "Charles M. Schulz", p: "Snoopy" },
  { n: "Garfield and Friends", c: "Jim Davis", l: "Muncie", p: "Odie" }
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
  { n: "Ceviche", o: "Peru", i: "Raw Fish and Citrus Juice" },
  // Adding Nigerian Food Expansion
  { n: "Jollof Rice", o: "Nigeria (West Africa)", i: "Rice, Tomatoes, Onions, Peppers" },
  { n: "Pounded Yam", o: "Nigeria", i: "Boiled Yam" },
  { n: "Egusi Soup", o: "Nigeria", i: "Melon Seeds and Leafy Vegetables" },
  { n: "Suya", o: "Nigeria", i: "Spiced Grilled Meat" },
  { n: "Moi Moi", o: "Nigeria", i: "Steamed Bean Pudding" },
  { n: "Akara", o: "Nigeria", i: "Deep-fried Bean Cakes" },
  { n: "Efo Riro", o: "Nigeria", i: "Spinach and Meat/Fish" },
  { n: "Afang Soup", o: "Nigeria", i: "Afang Leaves and Waterleaf" },
  { n: "Edikang Ikong", o: "Nigeria", i: "Fluted Pumpkin and Waterleaf" },
  { n: "Banga Soup", o: "Nigeria", i: "Palm Nut Extract" },
  { n: "Ewa Agoyin", o: "Nigeria", i: "Mashed Beans and Pepper Sauce" },
  { n: "Amala", o: "Nigeria", i: "Yam Flour or Cassava Flour" },
  { n: "Garri", o: "Nigeria", i: "Cassava Flakes" },
  { n: "Fufu", o: "Nigeria", i: "Cassava and Plantain" },
  { n: "Ogbono Soup", o: "Nigeria", i: "Ogbono Seeds" },
  { n: "Ofe Owerri", o: "Nigeria", i: "Assorted Meats and Snails" },
  { n: "Tuwo Shinkafa", o: "Nigeria", i: "Mashed Rice" },
  { n: "Kilishi", o: "Nigeria", i: "Dried Spicy Meat" },
  { n: "Nkwobi", o: "Nigeria", i: "Spicy Cow Foot" },
  { n: "Asaro (Yam Porridge)", o: "Nigeria", i: "Yam and Palm Oil" },
  { n: "Abacha (African Salad)", o: "Nigeria", i: "Dried Cassava and Ugba" },
  { n: "Okpa", o: "Nigeria", i: "Bambara Nut Flour" }
]

const sports = [
  { a: "Lionel Messi", s: "Football (Soccer)", p: "Forward/Attacker" },
  { a: "Cristiano Ronaldo", s: "Football (Soccer)", p: "Forward/Attacker" },
  { a: "LeBron James", s: "Basketball", p: "Small Forward" },
  { a: "Michael Jordan", s: "Basketball", p: "Shooting Guard" },
  { a: "Serena Williams", s: "Tennis", p: "Singles Player" },
  { a: "Roger Federer", s: "Tennis", p: "Singles Player" },
  { a: "Rafael Nadal", s: "Tennis", p: "Singles Player" },
  { a: "Tiger Woods", s: "Golf", p: "Golfer" },
  { a: "Tom Brady", s: "American Football", p: "Quarterback" },
  { a: 'Muhammad Ali', s: 'Boxing', p: 'Heavyweight Fighter' },
  { a: 'Mike Tyson', s: 'Boxing', p: 'Heavyweight Fighter' },
  { a: 'Tom Brady', s: 'American Football', p: 'Quarterback' },
  { a: 'Patrick Mahomes', s: 'American Football', p: 'Quarterback' },
  { a: 'Tiger Woods', s: 'Golf', p: 'Golfer' },
  { a: 'Jack Nicklaus', s: 'Golf', p: 'Golfer' },
  { a: 'Jon Jones', s: 'MMA', p: 'Fighter' },
  { a: 'Conor McGregor', s: 'MMA', p: 'Fighter' },
  { a: 'Ronda Rousey', s: 'MMA', p: 'Fighter' },
  { a: 'Anderson Silva', s: 'MMA', p: 'Fighter' },
  { a: "Usain Bolt", s: "Track and Field", p: "Sprinter" },
  { a: "Michael Phelps", s: "Swimming", p: "Swimmer" },
  { a: "Babe Ruth", s: "Baseball", p: "Outfielder/Pitcher" },
  { a: "Wayne Gretzky", s: "Ice Hockey", p: "Center" },
  { a: "Kobe Bryant", s: "Basketball", p: "Shooting Guard" },
  { a: "Diego Maradona", s: "Football (Soccer)", p: "Attacking Midfielder" },
  { a: "Pelé", s: "Football (Soccer)", p: "Forward/Attacker" },
  { a: "Novak Djokovic", s: "Tennis", p: "Singles Player" },
  { a: "Stephen Curry", s: "Basketball", p: "Point Guard" },
  { a: "Lewis Hamilton", s: "Formula 1", p: "Driver" },
  { a: "Michael Schumacher", s: "Formula 1", p: "Driver" },
  { a: "Conor McGregor", s: "Mixed Martial Arts", p: "Fighter" },
  { a: "Simone Biles", s: "Gymnastics", p: "Gymnast" },
  { a: "Shaquille O'Neal", s: "Basketball", p: "Center" }
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
  bank['tech'].push(...generateQs(tech, [w => `What does '${w.t}' mean in technology?`], w => w.m, w => w.m))
  bank['tech'].push(...generateQs(tech, [w => `Which technology concept is defined as: "${w.m}"?`], w => w.t, w => w.t))
  bank['tech'].push(...generateQs(tech.filter(w => w.a), [w => `What does the tech acronym ${w.t} stand for?`], w => w.a, w => w.a))
  bank['tech'].push(...generateQs(tech.filter(w => w.f), [w => `Who is recognized as the creator or founder of ${w.t}?`], w => w.f, w => w.f))

  // Anime
  bank['anime'] = []
  bank['anime'].push(...generateQs(anime, [a => `Which animation studio produced the anime "${a.n}"?`], a => a.s, a => a.s))
  bank['anime'].push(...generateQs(anime, [a => `In what year did the anime "${a.n}" originally premiere/release?`], a => a.y, a => a.y))
  
  // Cartoons
  bank['cartoons'] = []
  bank['cartoons'].push(...generateQs(cartoons, [
    c => `Who is the creator of the animated series "${c.n}"?`,
    c => `The popular cartoon "${c.n}" was created by whom?`,
    c => `Which individual or team is credited with creating "${c.n}"?`
  ], c => c.c, c => c.c))
  bank['cartoons'].push(...generateQs(cartoons.filter(c => c.l), [
    c => `In which fictional town or setting does "${c.n}" primarily take place?`,
    c => `Where is the primary setting for the cartoon "${c.n}"?`,
    c => `The events of "${c.n}" largely occur in which fictional location?`
  ], c => c.l, c => c.l))
  bank['cartoons'].push(...generateQs(cartoons.filter(c => c.p), [
    c => `What is the name of the notable pet or animal companion in "${c.n}"?`,
    c => `Which famous animal/pet appears alongside the main characters in "${c.n}"?`
  ], c => c.p, c => c.p))
  bank['cartoons'].push(...generateQs(cartoons, [
    c => `Which of these animated series was created by ${c.c}?`,
    c => `${c.c} is famously known for creating which of these cartoons?`,
    c => `If you were watching a show created by ${c.c}, which of these could it be?`
  ], c => c.n, c => c.n))

  // Food
  bank['food'] = []
  bank['food'].push(...generateQs(food, [
    f => `Which country is widely known as the origin of ${f.n}?`,
    f => `Where did the popular dish ${f.n} originally come from?`,
    f => `Which nation is most associated with creating ${f.n}?`
  ], f => f.o, f => f.o))
  bank['food'].push(...generateQs(food, [
    f => `What are the primary ingredients or characteristics of ${f.n}?`,
    f => `Which of the following describes the main components of ${f.n}?`,
    f => `If you order ${f.n}, you are likely to be served a dish primarily consisting of:`
  ], f => f.i, f => f.i))
  bank['food'].push(...generateQs(food, [
    f => `Which popular dish is known to originate from ${f.o}?`,
    f => `If you were visiting ${f.o}, which of these famous local dishes might you eat?`,
    f => `A culinary staple of ${f.o} is which of these dishes?`
  ], f => f.n, f => f.n))

  // Sports
  bank['sports'] = []
  bank['sports'].push(...generateQs(sports, [
    s => `Which sport is ${s.a} famous for playing?`,
    s => `The athlete ${s.a} made their name competing in which sport?`,
    s => `If you were watching ${s.a} perform professionally, what sport would it be?`
  ], s => s.s, s => s.s))
  bank['sports'].push(...generateQs(sports, [
    s => `What position or role is ${s.a} most famously associated with in their sport?`,
    s => `When competing, ${s.a} is best known for which specific role or position?`,
    s => `Which of these describes the sporting role of ${s.a}?`
  ], s => s.p, s => s.p))
  bank['sports'].push(...generateQs(sports, [
    s => `Which famous athlete is known as a legendary ${s.p}?`,
    s => `Who among these is a globally recognized ${s.s} athlete?`,
    s => `If you needed an iconic ${s.s} player, who would you choose?`
  ], s => s.a, s => s.a))
  
  // Final generation deduplication
  for (const cat of Object.keys(bank)) {
    const seen = new Set()
    bank[cat] = bank[cat].filter(q => {
      if (!q.q || !q.correct || q.wrong.length < 3) return false
      if (seen.has(q.q)) return false
      seen.add(q.q)
      return true
    })
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
