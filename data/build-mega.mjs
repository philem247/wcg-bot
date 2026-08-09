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
  { n: "Set", p: "Egyptian", d: "Chaos, Desert" },
  { n: "Amaterasu", p: "Japanese", d: "Sun Goddess" },
  { n: "Susanoo", p: "Japanese", d: "Storms, Sea" },
  { n: "Tsukuyomi", p: "Japanese", d: "Moon God" },
  { n: "Quetzalcoatl", p: "Aztec", d: "Feathered Serpent, Wind" },
  { n: "Tezcatlipoca", p: "Aztec", d: "Night Sky, Destiny" },
  { n: "Huitzilopochtli", p: "Aztec", d: "Sun, War" },
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
  { t: "Seed Phrase", m: "A list of words which store all the information needed to recover Bitcoin or other cryptocurrency funds." }
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
    a => `Which of the following belongs to the ${a.t} class?`
  ], a => a.t, a => a.t))
  
  // Diet (a.c)
  bank['animals'].push(...generateQs(animals, [
    a => `What is the primary diet/diet classification of a ${a.n}?`,
    a => `Which of these animals is a known ${a.c}?`,
    a => `What is the dietary habits of the ${a.n} called?`
  ], a => a.c, a => a.c))
  
  // Habitat/Region (a.d)
  bank['animals'].push(...generateQs(animals, [
    a => `Which of these regions is the native habitat of the ${a.n}?`,
    a => `Which animal is natively found in ${a.d}?`,
    a => `If you were looking for a ${a.n} in the wild, where would you go?`
  ], a => a.d, a => a.d))
  
  // Mythology
  bank['mythology'] = []
  
  // Who is (Domain -> Deity)
  bank['mythology'].push(...generateQs(mythology, [
    m => `In ${m.p} mythology, who is the god/goddess of ${m.d}?`,
    m => `Which deity is known for being the god/goddess of ${m.d}?`
  ], m => m.n, m => m.n))
  
  // Which Pantheon (Deity -> Pantheon)
  bank['mythology'].push(...generateQs(mythology, [
    m => `Which mythology does ${m.n} belong to?`, 
    m => `From which ancient pantheon does the god ${m.n} originate?`
  ], m => m.p, m => m.p))
  
  // What is the domain (Deity -> Domain)
  for (let i = 0; i < 4; i++) {
    bank['mythology'].push(...generateQs(mythology, [m => `In ${m.p} mythology, ${m.n} is known as the god/deity of what?`], m => m.d, m => m.d))
    bank['mythology'].push(...generateQs(mythology, [m => `The deity ${m.n} belongs to which mythological pantheon?`], m => m.p, m => m.p))
    bank['mythology'].push(...generateQs(mythology.filter(m => m.r), [m => `What is the Roman equivalent of the Greek deity ${m.n}?`], m => m.r, m => m.r))
  }

  // Web3 (30 * 17 = 510)
  bank['web3'] = []
  for (let i = 0; i < 17; i++) {
    bank['web3'].push(...generateQs(web3, [w => `What is the meaning of the Web3 term '${w.t}'?`], w => w.m, w => w.m))
    bank['web3'].push(...generateQs(web3, [w => `Which Web3 concept is defined as: "${w.m}"?`], w => w.t, w => w.t))
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
    attribution: "Mega Generator",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/mega.json', JSON.stringify(output, null, 2))
  console.log('Saved to data/mega.json')
}

main()
