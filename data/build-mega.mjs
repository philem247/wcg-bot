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

const animals = [
  { n: "Lion", t: "Mammal", c: "Carnivore", d: "Africa" },
  { n: "Elephant", t: "Mammal", c: "Herbivore", d: "Africa/Asia" },
  { n: "Tiger", t: "Mammal", c: "Carnivore", d: "Asia" },
  { n: "Bald Eagle", t: "Bird", c: "Carnivore", d: "North America" },
  { n: "Kangaroo", t: "Mammal (Marsupial)", c: "Herbivore", d: "Australia" },
  { n: "Great White Shark", t: "Fish", c: "Carnivore", d: "Oceans globally" },
  { n: "Emperor Penguin", t: "Bird", c: "Carnivore", d: "Antarctica" },
  { n: "Blue Whale", t: "Mammal", c: "Carnivore", d: "Oceans globally" },
  { n: "Giraffe", t: "Mammal", c: "Herbivore", d: "Africa" },
  { n: "Giant Panda", t: "Mammal", c: "Herbivore", d: "China" },
  { n: "Koala", t: "Mammal (Marsupial)", c: "Herbivore", d: "Australia" },
  { n: "Polar Bear", t: "Mammal", c: "Carnivore", d: "Arctic" },
  { n: "Hippopotamus", t: "Mammal", c: "Herbivore", d: "Africa" },
  { n: "Cheetah", t: "Mammal", c: "Carnivore", d: "Africa" },
  { n: "Grizzly Bear", t: "Mammal", c: "Omnivore", d: "North America" },
  { n: "Zebra", t: "Mammal", c: "Herbivore", d: "Africa" },
  { n: "Rhinoceros", t: "Mammal", c: "Herbivore", d: "Africa/Asia" },
  { n: "Sloth", t: "Mammal", c: "Herbivore", d: "South America" },
  { n: "Gorilla", t: "Mammal", c: "Herbivore", d: "Africa" },
  { n: "Platypus", t: "Mammal (Monotreme)", c: "Carnivore", d: "Australia" },
  { n: "Ostrich", t: "Bird", c: "Omnivore", d: "Africa" },
  { n: "Chameleon", t: "Reptile", c: "Carnivore", d: "Madagascar/Africa" },
  { n: "Komodo Dragon", t: "Reptile", c: "Carnivore", d: "Indonesia" },
  { n: "Meerkat", t: "Mammal", c: "Carnivore", d: "Africa" },
  { n: "Snow Leopard", t: "Mammal", c: "Carnivore", d: "Central Asia" },
  { n: "Lemur", t: "Mammal", c: "Omnivore", d: "Madagascar" },
  { n: "Orangutan", t: "Mammal", c: "Omnivore", d: "Asia" },
  { n: "Moose", t: "Mammal", c: "Herbivore", d: "North America/Europe" },
  { n: "Walrus", t: "Mammal", c: "Carnivore", d: "Arctic" },
  { n: "Peacock", t: "Bird", c: "Omnivore", d: "Asia" },
  { n: "Crocodile", t: "Reptile", c: "Carnivore", d: "Tropics globally" },
  { n: "Dolphin", t: "Mammal", c: "Carnivore", d: "Oceans globally" },
  { n: "Octopus", t: "Invertebrate", c: "Carnivore", d: "Oceans globally" },
  { n: "Iguana", t: "Reptile", c: "Herbivore", d: "Americas" },
  { n: "Llama", t: "Mammal", c: "Herbivore", d: "South America" },
  { n: "Camel", t: "Mammal", c: "Herbivore", d: "Middle East/Africa" },
  { n: "Red Panda", t: "Mammal", c: "Herbivore", d: "Himalayas" },
  { n: "Toucan", t: "Bird", c: "Omnivore", d: "South America" },
  { n: "Flamingo", t: "Bird", c: "Omnivore", d: "Americas/Africa" },
  { n: "Armadillo", t: "Mammal", c: "Omnivore", d: "Americas" },
  { n: "Porcupine", t: "Mammal", c: "Herbivore", d: "Americas/Africa" },
  { n: "Hedgehog", t: "Mammal", c: "Omnivore", d: "Europe/Asia" },
  { n: "Badger", t: "Mammal", c: "Omnivore", d: "North America/Europe" },
  { n: "Raccoon", t: "Mammal", c: "Omnivore", d: "North America" },
  { n: "Skunk", t: "Mammal", c: "Omnivore", d: "Americas" },
  { n: "Beaver", t: "Mammal", c: "Herbivore", d: "North America/Europe" },
  { n: "Otter", t: "Mammal", c: "Carnivore", d: "Globally" },
  { n: "Puma", t: "Mammal", c: "Carnivore", d: "Americas" },
  { n: "Jaguar", t: "Mammal", c: "Carnivore", d: "South America" },
  { n: "Panther", t: "Mammal", c: "Carnivore", d: "Asia/Africa/Americas" },
  { n: "Hyena", t: "Mammal", c: "Carnivore", d: "Africa/Asia" }
]

const mythology = [
  { n: "Zeus", p: "Greek", d: "King of Gods, Sky and Thunder", r: "Jupiter" },
  { n: "Hera", p: "Greek", d: "Queen of Gods, Marriage", r: "Juno" },
  { n: "Poseidon", p: "Greek", d: "Sea, Earthquakes", r: "Neptune" },
  { n: "Hades", p: "Greek", d: "Underworld", r: "Pluto" },
  { n: "Athena", p: "Greek", d: "Wisdom, War Strategy", r: "Minerva" },
  { n: "Ares", p: "Greek", d: "War, Violence", r: "Mars" },
  { n: "Apollo", p: "Greek", d: "Sun, Music, Healing" },
  { n: "Artemis", p: "Greek", d: "Moon, Hunt", r: "Diana" },
  { n: "Aphrodite", p: "Greek", d: "Love, Beauty", r: "Venus" },
  { n: "Hermes", p: "Greek", d: "Messenger, Travelers", r: "Mercury" },
  { n: "Jupiter", p: "Roman", d: "King of Gods, Sky" },
  { n: "Juno", p: "Roman", d: "Queen of Gods, Marriage" },
  { n: "Neptune", p: "Roman", d: "Sea" },
  { n: "Pluto", p: "Roman", d: "Underworld" },
  { n: "Minerva", p: "Roman", d: "Wisdom" },
  { n: "Mars", p: "Roman", d: "War" },
  { n: "Venus", p: "Roman", d: "Love, Beauty" },
  { n: "Mercury", p: "Roman", d: "Messenger" },
  { n: "Odin", p: "Norse", d: "All-Father, Wisdom, War" },
  { n: "Thor", p: "Norse", d: "Thunder, Strength" },
  { n: "Loki", p: "Norse", d: "Mischief, Trickery" },
  { n: "Freyja", p: "Norse", d: "Love, Beauty, War" },
  { n: "Tyr", p: "Norse", d: "Law, Justice" },
  { n: "Baldur", p: "Norse", d: "Light, Purity" },
  { n: "Ra", p: "Egyptian", d: "Sun God" },
  { n: "Osiris", p: "Egyptian", d: "Underworld, Resurrection" },
  { n: "Isis", p: "Egyptian", d: "Magic, Motherhood" },
  { n: "Anubis", p: "Egyptian", d: "Embalming, Dead" },
  { n: "Horus", p: "Egyptian", d: "Sky, Pharoahs" },
  { n: "Kama", p: "Hindu", d: "Love, Desire" },
  { n: "Amaterasu", p: "Japanese", d: "Sun, Universe" },
  { n: "Susanoo", p: "Japanese", d: "Sea, Storms" },
  { n: "Tsukuyomi", p: "Japanese", d: "Moon" },
  { n: "Quetzalcoatl", p: "Aztec", d: "Wind, Venus, Sun" },
  { n: "Huitzilopochtli", p: "Aztec", d: "War, Sun" },
  { n: "Tlaloc", p: "Aztec", d: "Rain, Fertility" },
  { n: "Izanagi", p: "Japanese", d: "Creation, Life" },
  { n: "Izanami", p: "Japanese", d: "Creation, Death" },
  { n: "Tezcatlipoca", p: "Aztec", d: "Night, Destiny" },
  { n: "Shiva", p: "Hindu", d: "Destroyer, Transformation" },
  { n: "Vishnu", p: "Hindu", d: "Preserver" },
  { n: "Brahma", p: "Hindu", d: "Creator" },
  { n: "Ganesha", p: "Hindu", d: "Remover of Obstacles" },
  { n: "Kali", p: "Hindu", d: "Time, Death, Change" },
  { n: "Indra", p: "Hindu", d: "King of Heavens, Thunder" }
]

const web3 = [
  { t: "Bitcoin", m: "The first decentralized cryptocurrency, created by Satoshi Nakamoto." },
  { t: "Ethereum", m: "A decentralized, open-source blockchain with smart contract functionality." },
  { t: "Smart Contract", m: "A self-executing contract with the terms of the agreement directly written into code." },
  { t: "Blockchain", m: "A distributed ledger technology that securely records transactions across a network of computers." },
  { t: "NFT", m: "Non-Fungible Token, a unique digital identifier that cannot be copied, substituted, or subdivided." },
  { t: "DeFi", m: "Decentralized Finance, financial services that use smart contracts instead of traditional intermediaries like banks." },
  { t: "DAO", m: "Decentralized Autonomous Organization, an entity directed by its members without central leadership." },
  { t: "Wallet", m: "A digital tool that allows users to store and manage their cryptocurrency keys and assets." },
  { t: "Gas", m: "The fee required to successfully conduct a transaction or execute a contract on the Ethereum blockchain." },
  { t: "Mining", m: "The process by which new cryptocurrency coins are entered into circulation and transactions are validated." },
  { t: "Staking", m: "The process of participating in a proof-of-stake system by locking up tokens to secure the network." },
  { t: "Proof of Work", m: "A consensus mechanism where miners solve complex mathematical puzzles to validate transactions." },
  { t: "Proof of Stake", m: "A consensus mechanism where validators are chosen to create a new block based on the amount of tokens they hold." },
  { t: "Satoshi", m: "The smallest unit of a Bitcoin, named after its pseudonymous creator." },
  { t: "HODL", m: "A slang term in the crypto community meaning to hold onto a cryptocurrency rather than selling it." },
  { t: "Altcoin", m: "Any cryptocurrency other than Bitcoin." },
  { t: "Stablecoin", m: "A class of cryptocurrencies that attempt to offer price stability by being pegged to an external asset like the US Dollar." },
  { t: "Web3", m: "An idea for a new iteration of the World Wide Web which incorporates concepts such as decentralization and token-based economics." },
  { t: "Metaverse", m: "A virtual-reality space in which users can interact with a computer-generated environment and other users." },
  { t: "DApp", m: "Decentralized Application, a software application that runs on a distributed computing system." },
  { t: "Solana", m: "A high-performance blockchain known for its fast speeds and low transaction costs." },
  { t: "Polygon", m: "A Layer 2 scaling solution for Ethereum." },
  { t: "Layer 2", m: "A secondary framework or protocol built on top of an existing blockchain system." },
  { t: "AirDrop", m: "A distribution of a cryptocurrency token or coin, usually for free, to numerous wallet addresses." },
  { t: "Rug Pull", m: "A malicious maneuver in the cryptocurrency industry where crypto developers abandon a project and run away with investors' funds." },
  { t: "Fiat", m: "Government-issued currency that is not backed by a physical commodity, like the US Dollar or Euro." },
  { t: "Minting", m: "The process of creating a new block or a new NFT on the blockchain." },
  { t: "Ledger", m: "A record-keeping system for a cryptocurrency, maintaining participants' identities in anonymous form, their respective balances, and a record book of all the genuine transactions." },
  { t: "Cold Storage", m: "Keeping cryptocurrency tokens offline, which is more secure than an online hot wallet." },
  { t: "Seed Phrase", m: "A list of words which store all the information needed to recover Bitcoin or other cryptocurrency funds." },
  { t: "51% Attack", m: "An attack on a blockchain by a group of miners who control more than half of the network's mining hash rate." },
  { t: "Fork", m: "A change to the software protocol of a blockchain that creates two separate versions." },
  { t: "Hash Rate", m: "The speed at which a computer is completing an operation in the cryptocurrency code." },
  { t: "ICO", m: "Initial Coin Offering, a type of funding using cryptocurrencies." },
  { t: "Liquidity Pool", m: "A collection of funds locked in a smart contract used to facilitate decentralized trading." },
  { t: "Node", m: "Any computer that connects to a blockchain network." },
  { t: "Oracle", m: "A third-party service that provides smart contracts with external information." },
  { t: "Public Key", m: "A cryptographic code that allows a user to receive cryptocurrency into their account." },
  { t: "Private Key", m: "A secure, alphanumeric password that allows a user to access and manage their crypto funds." },
  { t: "Satoshi Nakamoto", m: "The pseudonymous person or group of people who developed Bitcoin." },
  { t: "Tokenomics", m: "The study of the economics and incentives of a cryptocurrency." },
  { t: "Yield Farming", m: "The practice of staking or lending crypto assets in order to generate high returns or rewards." },
  { t: "Whitepaper", m: "A document released by a crypto project that gives investors technical information about its concept." },
  { t: "Whale", m: "An individual or entity that holds a large amount of a specific cryptocurrency." },
  { t: "DEX", m: "Decentralized Exchange, a peer-to-peer marketplace where transactions occur directly between crypto traders." },
  { t: "CEX", m: "Centralized Exchange, a platform where you can buy or sell digital assets, managed by a central organization." },
  { t: "Mainnet", m: "An independent blockchain running its own network with its own technology and protocol." },
  { t: "Testnet", m: "An alternative blockchain used by developers for testing." },
  { t: "Gas Limit", m: "The maximum amount of gas a user is willing to spend on a particular transaction." },
  { t: "Gwei", m: "A denomination of the cryptocurrency ether (ETH), used when measuring gas prices." }
]

const tech = [
  { t: "Python", m: "A high-level, general-purpose programming language known for its readability and use in data science.", f: "Guido van Rossum", y: "1991" },
  { t: "JavaScript", m: "A programming language that is one of the core technologies of the World Wide Web, used for client-side scripting.", f: "Brendan Eich", y: "1995" },
  { t: "Java", m: "A high-level, class-based, object-oriented programming language designed to have as few implementation dependencies as possible.", f: "James Gosling", y: "1995" },
  { t: "C++", m: "A general-purpose programming language created as an extension of the C programming language.", f: "Bjarne Stroustrup", y: "1985" },
  { t: "C#", m: "A modern, object-oriented, and type-safe programming language developed by Microsoft.", f: "Anders Hejlsberg", y: "2000" },
  { t: "Ruby", m: "An interpreted, high-level, general-purpose programming language known for its simplicity and productivity.", f: "Yukihiro Matsumoto", y: "1995" },
  { t: "PHP", m: "A general-purpose scripting language geared towards web development.", f: "Rasmus Lerdorf", y: "1995" },
  { t: "Swift", m: "A powerful and intuitive programming language for iOS, iPadOS, macOS, tvOS, and watchOS.", f: "Chris Lattner", y: "2014" },
  { t: "Go", m: "A statically typed, compiled programming language designed at Google.", f: "Robert Griesemer, Rob Pike, and Ken Thompson", y: "2009" },
  { t: "Rust", m: "A multi-paradigm, general-purpose programming language focused on performance and safety, especially safe concurrency.", f: "Graydon Hoare", y: "2010" },
  { t: "TypeScript", m: "A strict syntactical superset of JavaScript that adds optional static typing.", f: "Anders Hejlsberg", y: "2012" },
  { t: "Kotlin", m: "A cross-platform, statically typed, general-purpose programming language with type inference, designed to interoperate fully with Java.", f: "JetBrains", y: "2011" },
  { t: "React", m: "A free and open-source front-end JavaScript library for building user interfaces based on UI components.", f: "Jordan Walke", y: "2013" },
  { t: "Angular", m: "A TypeScript-based free and open-source web application framework led by the Angular Team at Google.", f: "Google", y: "2016" },
  { t: "Vue.js", m: "An open-source model–view–viewmodel front end JavaScript framework for building user interfaces and single-page applications.", f: "Evan You", y: "2014" },
  { t: "Node.js", m: "An open-source, cross-platform, back-end JavaScript runtime environment that executes JavaScript code outside a web browser.", f: "Ryan Dahl", y: "2009" },
  { t: "Django", m: "A free and open-source, Python-based web framework that follows the model-template-views architectural pattern.", f: "Adrian Holovaty and Simon Willison", y: "2005" },
  { t: "Flask", m: "A micro web framework written in Python.", f: "Armin Ronacher", y: "2010" },
  { t: "Spring Boot", m: "An open source Java-based framework used to create a micro Service.", f: "Pivotal Software", y: "2014" },
  { t: "Ruby on Rails", m: "A server-side web application framework written in Ruby.", f: "David Heinemeier Hansson", y: "2004" },
  { t: "Laravel", m: "A free, open-source PHP web framework, created by Taylor Otwell.", f: "Taylor Otwell", y: "2011" },
  { t: "Express.js", m: "A back end web application framework for Node.js, released as free and open-source software.", f: "TJ Holowaychuk", y: "2010" },
  { t: "Docker", m: "A set of platform as a service products that use OS-level virtualization to deliver software in packages called containers.", f: "Solomon Hykes", y: "2013" },
  { t: "Kubernetes", m: "An open-source container-orchestration system for automating computer application deployment, scaling, and management.", f: "Google", y: "2014" },
  { t: "Git", m: "A distributed version-control system for tracking changes in any set of files.", f: "Linus Torvalds", y: "2005" },
  { t: "Linux", m: "A family of open-source Unix-like operating systems based on the Linux kernel.", f: "Linus Torvalds", y: "1991" },
  { t: "Windows", m: "A group of several proprietary graphical operating system families, all of which are developed and marketed by Microsoft.", f: "Bill Gates and Paul Allen", y: "1985" },
  { t: "macOS", m: "A proprietary graphical operating system developed and marketed by Apple Inc.", f: "Apple Inc.", y: "2001" },
  { t: "Android", m: "A mobile operating system based on a modified version of the Linux kernel and other open source software.", f: "Andy Rubin", y: "2008" },
  { t: "iOS", m: "A mobile operating system created and developed by Apple Inc. exclusively for its hardware.", f: "Apple Inc.", y: "2007" },
  { t: "AWS", m: "A subsidiary of Amazon that provides on-demand cloud computing platforms and APIs.", f: "Amazon", y: "2006" },
  { t: "Azure", m: "A cloud computing service operated by Microsoft for application management via Microsoft-managed data centers.", f: "Microsoft", y: "2010" },
  { t: "Google Cloud", m: "A suite of cloud computing services offered by Google.", f: "Google", y: "2008" },
  { t: "MySQL", m: "An open-source relational database management system.", f: "Michael Widenius", y: "1995" },
  { t: "PostgreSQL", m: "A free and open-source relational database management system emphasizing extensibility and SQL compliance.", f: "Michael Stonebraker", y: "1996" },
  { t: "MongoDB", m: "A source-available cross-platform document-oriented database program.", f: "Eliot Horowitz", y: "2009" },
  { t: "Redis", m: "An in-memory data structure project implementing a distributed, in-memory key-value database with optional durability.", f: "Salvatore Sanfilippo", y: "2009" },
  { t: "Elasticsearch", m: "A search engine based on the Lucene library.", f: "Shay Banon", y: "2010" },
  { t: "GraphQL", m: "An open-source data query and manipulation language for APIs, and a runtime for fulfilling queries with existing data.", f: "Facebook", y: "2015" },
  { t: "REST", m: "Representational state transfer, a software architectural style that was created to guide the design and development of the architecture for the World Wide Web.", f: "Roy Fielding", y: "2000" },
  { t: "JSON", m: "An open standard file format and data interchange format that uses human-readable text to store and transmit data objects consisting of attribute-value pairs.", f: "Douglas Crockford", y: "2001" },
  { t: "XML", m: "A markup language that defines a set of rules for encoding documents in a format that is both human-readable and machine-readable.", f: "W3C", y: "1998" },
  { t: "HTML", m: "The standard markup language for documents designed to be displayed in a web browser.", f: "Tim Berners-Lee", y: "1993" },
  { t: "CSS", m: "A style sheet language used for describing the presentation of a document written in a markup language such as HTML.", f: "Håkon Wium Lie", y: "1996" },
  { t: "TensorFlow", m: "A free and open-source software library for machine learning and artificial intelligence.", f: "Google Brain Team", y: "2015" },
  { t: "PyTorch", m: "An open source machine learning framework based on the Torch library.", f: "Meta AI", y: "2016" },
  { t: "Pandas", m: "A software library written for the Python programming language for data manipulation and analysis.", f: "Wes McKinney", y: "2008" },
  { t: "NumPy", m: "A library for the Python programming language, adding support for large, multi-dimensional arrays and matrices.", f: "Travis Oliphant", y: "2006" },
  { t: "Jupyter", m: "A non-profit, open-source project, born out of the IPython Project, to support interactive data science and scientific computing.", f: "Fernando Pérez", y: "2014" },
  { t: "Apache Kafka", m: "An open-source distributed event streaming platform used by thousands of companies for high-performance data pipelines.", f: "Jay Kreps", y: "2011" }
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
  
  // Animals
  bank['animals'] = []
  
  // Classification (a.t)
  bank['animals'].push(...generateQs(animals, [
    a => `What type of animal classification is a ${a.n}?`,
    a => `A ${a.n} is best described as a:`,
    a => `Which biological classification applies to the ${a.n}?`,
    a => `In the animal kingdom, the ${a.n} is categorized as a:`
  ], a => a.t, a => a.t))
  bank['animals'].push(...generateQs(animals, [
    a => `Which of the following belongs to the ${a.t} class?`,
    a => `If you are looking for a ${a.t}, which of these animals fits?`
  ], a => a.n, a => a.n))
  
  // Diet (a.c)
  bank['animals'].push(...generateQs(animals, [
    a => `What is the primary diet/diet classification of a ${a.n}?`,
    a => `What is the dietary habits of the ${a.n} called?`,
    a => `Based on what it eats, the ${a.n} is known as a:`,
    a => `The ${a.n}'s diet classifies it biologically as a:`
  ], a => a.c, a => a.c))
  bank['animals'].push(...generateQs(animals, [
    a => `Which of these animals is a known ${a.c}?`,
    a => `Can you identify the ${a.c} from this list?`
  ], a => a.n, a => a.n))
  
  // Habitat/Region (a.d)
  bank['animals'].push(...generateQs(animals, [
    a => `Which of these regions is the native habitat of the ${a.n}?`,
    a => `If you were looking for a ${a.n} in the wild, where would you go?`,
    a => `The ${a.n} is natively found in which part of the world?`,
    a => `What is the natural geographical range of the ${a.n}?`
  ], a => a.d, a => a.d))
  bank['animals'].push(...generateQs(animals, [
    a => `Which animal is natively found in ${a.d}?`,
    a => `If you visit ${a.d}, which of these animals might you see in the wild?`
  ], a => a.n, a => a.n))
  
  // Mythology
  bank['mythology'] = []
  
  // Group by pantheon to ensure wrong answers for specific gods come from the SAME pantheon
  const pantheons = [...new Set(mythology.map(m => m.p))]
  for (const pantheon of pantheons) {
    const panGods = mythology.filter(m => m.p === pantheon)
    // Only do this if we have enough gods in the pantheon to form 3 wrong answers (need >= 4 gods)
    if (panGods.length >= 4) {
      bank['mythology'].push(...generateQs(panGods, [
        m => `In ${m.p} mythology, who is the god/goddess of ${m.d}?`,
        m => `If a worshipper was praying for ${m.d}, which ${m.p} deity would they invoke?`,
        m => `Who holds the domain of ${m.d} in the ${m.p} pantheon?`
      ], m => m.n, m => m.n))
      
      bank['mythology'].push(...generateQs(panGods, [
        m => `In ${m.p} mythology, ${m.n} is known as the god/deity of what?`,
        m => `The ${m.p} figure ${m.n} ruled over which domain?`
      ], m => m.d, m => m.d))
    }
  }

  // Generic questions that span all mythologies (wrong answers can be any deity/domain)
  bank['mythology'].push(...generateQs(mythology, [
    m => `Which mythological deity is known for being the god/goddess of ${m.d}?`
  ], m => m.n, m => m.n))
  
  bank['mythology'].push(...generateQs(mythology, [
    m => `What is the primary power or domain universally associated with ${m.n}?`
  ], m => m.d, m => m.d))

  // Which Pantheon (Deity -> Pantheon)
  bank['mythology'].push(...generateQs(mythology, [
    m => `Which mythology does ${m.n} belong to?`, 
    m => `From which ancient pantheon does the god ${m.n} originate?`,
    m => `The legend of ${m.n} is a key part of which culture's mythology?`,
    m => `The deity ${m.n} belongs to which mythological pantheon?`
  ], m => m.p, m => m.p))
  
  bank['mythology'].push(...generateQs(mythology.filter(m => m.r), [
    m => `What is the Roman equivalent of the Greek deity ${m.n}?`,
    m => `If the Greeks worshipped ${m.n}, what name did the Romans use for the same deity?`
  ], m => m.r, m => m.r))

  // Web3 (50+ items * multiple templates)
  bank['web3'] = []
  bank['web3'].push(...generateQs(web3, [
    w => `What is the meaning of the Web3 term '${w.t}'?`,
    w => `In the context of cryptocurrency and blockchain, what does '${w.t}' refer to?`,
    w => `How is '${w.t}' defined in decentralized technology?`,
    w => `When someone mentions '${w.t}' in crypto, they mean:`
  ], w => w.m, w => w.m))
  bank['web3'].push(...generateQs(web3, [
    w => `Which Web3 concept is defined as: "${w.m}"?`,
    w => `What term is used for: "${w.m}"?`,
    w => `This definition matches which crypto terminology: "${w.m}"?`,
    w => `Name the concept: "${w.m}"`
  ], w => w.t, w => w.t))

  // Tech (50 items * multiple templates = massive native pool)
  bank['tech'] = []
  bank['tech'].push(...generateQs(tech, [
    t => `Which technology is described as: "${t.m}"?`,
    t => `What is the name of the tech/programming language that is: "${t.m}"?`,
    t => `Identify the technology defined by: "${t.m}"?`,
    t => `The description "${t.m}" applies to:`
  ], t => t.t, t => t.t))
  bank['tech'].push(...generateQs(tech, [
    t => `What is ${t.t} commonly used for or described as?`,
    t => `Which of these best describes ${t.t}?`
  ], t => t.m, t => t.m))
  bank['tech'].push(...generateQs(tech, [
    t => `Who is credited as the original creator or founding organization of ${t.t}?`,
    t => `Which tech pioneer or company is behind the creation of ${t.t}?`
  ], t => t.f, t => t.f))
  bank['tech'].push(...generateQs(tech, [
    t => `In what year was ${t.t} officially released or founded?`,
    t => `When did ${t.t} first make its public debut?`
  ], t => t.y, t => t.y))

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
    attribution: "Mega Generator",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/mega.json', JSON.stringify(output, null, 2))
  console.log('Saved to data/mega.json')
}

main()
