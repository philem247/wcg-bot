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
  { t: "Gwei", m: "A denomination of the cryptocurrency ether (ETH), used when measuring gas prices." },
  { t: "Halving", m: "A programmed event in certain cryptocurrencies, like Bitcoin, that cuts the reward given to miners for validating transactions in half." },
  { t: "Sharding", m: "A scaling technique that splits a blockchain's data and transaction load across multiple parallel chains called shards." },
  { t: "Sidechain", m: "A separate blockchain that is connected to a main blockchain, allowing assets to be transferred between the two." },
  { t: "Cross-Chain Bridge", m: "A protocol that connects two separate blockchains, allowing tokens and data to move between them." },
  { t: "Byzantine Fault Tolerance", m: "The ability of a distributed network to reach consensus even when some participants act maliciously or fail." },
  { t: "Merkle Tree", m: "A data structure that hashes and pairs data blocks repeatedly to allow efficient and secure verification of large data sets." },
  { t: "Nonce", m: "A number used only once in a cryptographic communication, which miners adjust to solve a block's proof-of-work puzzle." },
  { t: "UTXO", m: "Unspent Transaction Output, a model used by Bitcoin to track ownership of funds not yet spent in a transaction." },
  { t: "Double Spending", m: "The risk that a digital currency can be spent more than once, which blockchain consensus mechanisms are designed to prevent." },
  { t: "SHA-256", m: "A cryptographic hash function used in Bitcoin's proof-of-work mining process to secure the network." },
  { t: "Multisig", m: "A wallet security feature that requires multiple private key signatures to authorize a single transaction." },
  { t: "Hot Wallet", m: "A cryptocurrency wallet that is connected to the internet, offering convenience at the cost of increased security risk." },
  { t: "Custodial Wallet", m: "A cryptocurrency wallet where a third party holds and manages the private keys on behalf of the user." },
  { t: "Non-Custodial Wallet", m: "A cryptocurrency wallet where the user alone holds and controls their private keys." },
  { t: "Hardware Wallet", m: "A physical device that stores a user's private keys offline to protect cryptocurrency from online attacks." },
  { t: "Genesis Block", m: "The very first block ever mined or validated on a blockchain, forming the foundation of the entire chain." },
  { t: "Circulating Supply", m: "The number of coins or tokens of a cryptocurrency that are publicly available and actively trading in the market." },
  { t: "Max Supply", m: "The absolute maximum number of coins or tokens that will ever exist for a given cryptocurrency." },
  { t: "ERC-20", m: "A technical standard on Ethereum that defines a common set of rules for issuing and interacting with fungible tokens." },
  { t: "ERC-721", m: "A technical standard on Ethereum that defines the rules for creating non-fungible, uniquely identifiable tokens." },
  { t: "Optimistic Rollup", m: "A Layer 2 scaling solution that bundles transactions off-chain and assumes them valid unless challenged through a fraud proof." },
  { t: "ZK-Rollup", m: "A Layer 2 scaling solution that bundles transactions off-chain and uses zero-knowledge proofs to verify their validity on-chain." },
  { t: "Zero-Knowledge Proof", m: "A cryptographic method that allows one party to prove a statement is true without revealing any underlying information." },
  { t: "Validator", m: "A network participant responsible for verifying transactions and proposing new blocks in a proof-of-stake blockchain." },
  { t: "Delegated Proof of Stake", m: "A consensus mechanism where token holders vote for a limited number of delegates to validate transactions on their behalf." },
  { t: "Slashing", m: "A penalty in proof-of-stake networks where a validator's staked tokens are partially destroyed for malicious or negligent behavior." },
  { t: "Impermanent Loss", m: "The temporary loss of value experienced by liquidity providers when the price of their pooled assets diverges from when they deposited them." },
  { t: "Automated Market Maker", m: "A decentralized exchange protocol that prices assets using an algorithmic formula instead of a traditional order book." },
  { t: "Flash Loan", m: "An uncollateralized loan in DeFi that must be borrowed and repaid within the same blockchain transaction." },
  { t: "Governance Token", m: "A cryptocurrency that grants holders the right to vote on proposals affecting the future of a protocol." },
  { t: "Vesting", m: "A schedule that gradually releases allocated tokens to team members or investors over a set period of time." },
  { t: "Token Burn", m: "The permanent removal of a cryptocurrency token from circulation, typically by sending it to an unusable wallet address." },
  { t: "Soulbound Token", m: "A non-transferable blockchain token intended to represent a person's identity, credentials, or affiliations." },
  { t: "ENS", m: "Ethereum Name Service, a decentralized naming system that maps human-readable names to Ethereum wallet addresses." },
  { t: "IPFS", m: "InterPlanetary File System, a peer-to-peer protocol for storing and sharing data in a distributed file system." },
  { t: "Total Value Locked", m: "A metric representing the total value of crypto assets deposited in a decentralized finance protocol." },
  { t: "Bear Market", m: "A prolonged period during which cryptocurrency prices are falling or expected to fall." },
  { t: "Bull Market", m: "A prolonged period during which cryptocurrency prices are rising or expected to rise." },
  { t: "FUD", m: "Fear, Uncertainty, and Doubt, a term describing negative sentiment spread to influence perception of a cryptocurrency." },
  { t: "FOMO", m: "Fear Of Missing Out, the anxiety-driven urge to buy an asset because its price is rapidly rising." },
  { t: "Whitelist", m: "A pre-approved list of wallet addresses granted special access, such as early or guaranteed participation in a token sale." },
  { t: "Cypherpunk", m: "A member of a movement advocating widespread use of cryptography and privacy-enhancing technologies as a route to social change." },
  { t: "Byzantine Generals Problem", m: "A foundational computer science problem describing how distributed parties can reach agreement despite unreliable or dishonest members." },
  { t: "Off-Chain", m: "Any transaction or data operation that occurs outside of a blockchain's main ledger, often to reduce cost or increase speed." },
  { t: "On-Chain", m: "Any transaction or data operation that is recorded directly on a blockchain's public ledger." },
  { t: "Wrapped Token", m: "A tokenized version of a cryptocurrency from one blockchain that is pegged 1:1 and usable on another blockchain." },
  { t: "Bonding Curve", m: "A mathematical formula that determines a token's price based on its circulating supply, used in some token sale mechanisms." },
  { t: "Slippage", m: "The difference between the expected price of a trade and the price at which it actually executes." },
  { t: "Perpetual Futures", m: "A derivatives contract that lets traders speculate on an asset's price with no expiration date, common on crypto exchanges." },
  { t: "Collateralization Ratio", m: "The ratio of the value of collateral deposited to the value of a loan or stablecoin issued against it." },
  { t: "Algorithmic Stablecoin", m: "A stablecoin that maintains its price peg through automated supply adjustments rather than holding collateral reserves." },
  { t: "CBDC", m: "Central Bank Digital Currency, a digital form of a country's fiat currency issued and backed by its central bank." },
  { t: "KYC", m: "Know Your Customer, a verification process exchanges use to confirm the identity of their users." },
  { t: "Halving Cycle", m: "The roughly four-year interval between successive Bitcoin block reward halving events." },
  { t: "Permissionless Blockchain", m: "A blockchain network that anyone can join, use, or validate transactions on without needing prior approval." },
  { t: "Permissioned Blockchain", m: "A blockchain network where participation and transaction validation are restricted to approved, known entities." },
  { t: "Cold Wallet", m: "A cryptocurrency storage method kept completely offline to protect private keys from online hacking attempts." },
  { t: "Block Explorer", m: "A web-based tool that lets users search and view real-time and historical data on a blockchain's blocks and transactions." },
  { t: "Total Supply", m: "The total number of coins or tokens that currently exist for a cryptocurrency, including those not yet in circulation." },
  { t: "Consensus Mechanism", m: "The set of rules a blockchain network uses to agree on the validity of transactions across all its participants." },
  { t: "Interoperability", m: "The ability of different blockchain networks to communicate, share data, and transact with one another." },
  { t: "Utility Token", m: "A cryptocurrency token designed to provide holders access to a specific product or service within a platform." },
  { t: "Security Token", m: "A digital token that represents ownership of a tradable financial asset, such as equity or a bond, and is subject to securities regulation." },
  { t: "Proof of Authority", m: "A consensus mechanism where a limited set of pre-approved, identity-verified validators are trusted to produce blocks." },
  { t: "Proof of History", m: "A mechanism used by Solana that creates a verifiable, cryptographic timestamp record proving that time has passed between events." },
  { t: "Layer 0", m: "The underlying network infrastructure and protocols that multiple independent Layer 1 blockchains can be built on top of." },
  { t: "Atomic Swap", m: "A peer-to-peer exchange of one cryptocurrency for another directly between two parties, without using a centralized exchange." },
  { t: "Vampire Attack", m: "A strategy where a new protocol lures liquidity and users away from a competing platform by offering superior incentives." },
  { t: "Rebase Token", m: "A cryptocurrency whose total supply automatically expands or contracts algorithmically to try to maintain a target price." },
  { t: "Liquidation", m: "The forced sale of a borrower's collateral in a DeFi lending protocol after its value falls below the required threshold." },
  { t: "Mempool", m: "The pool of unconfirmed transactions on a blockchain network that are waiting to be picked up and included in a block." },
  { t: "Finality", m: "The point at which a blockchain transaction is considered permanent and can no longer be reversed or altered." },
  { t: "Cryptojacking", m: "The unauthorized use of someone else's computing device to mine cryptocurrency without their consent." },
  { t: "Dusting Attack", m: "An attack that sends tiny amounts of cryptocurrency to many wallets in an attempt to de-anonymize their owners through transaction tracking." },
  { t: "Composability", m: "The property in DeFi where independent protocols can be freely combined and built on top of one another like interoperable building blocks." },
  { t: "BEP-20", m: "A technical standard for issuing tokens on the BNB Smart Chain, closely modeled after Ethereum's ERC-20 standard." }
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
  { t: "Apache Kafka", m: "An open-source distributed event streaming platform used by thousands of companies for high-performance data pipelines.", f: "Jay Kreps", y: "2011" },
  { t: "Perl", m: "A high-level, general-purpose interpreted programming language originally developed for text manipulation.", f: "Larry Wall", y: "1987" },
  { t: "Scala", m: "A programming language that combines object-oriented and functional programming in a concise, high-level language.", f: "Martin Odersky", y: "2004" },
  { t: "Erlang", m: "A functional programming language designed for building massively scalable, fault-tolerant, concurrent systems.", f: "Joe Armstrong", y: "1986" },
  { t: "Clojure", m: "A modern, dynamic, functional dialect of the Lisp programming language on the Java platform.", f: "Rich Hickey", y: "2007" },
  { t: "Dart", m: "A client-optimized programming language for building fast apps on multiple platforms, used by Flutter.", f: "Google", y: "2011" },
  { t: "Objective-C", m: "A general-purpose, object-oriented programming language that added Smalltalk-style messaging to the C language.", f: "Brad Cox and Tom Love", y: "1984" },
  { t: "Lua", m: "A lightweight, high-level scripting language designed primarily for embedded use in applications and games.", f: "Roberto Ierusalimschy", y: "1993" },
  { t: "R", m: "A programming language and free software environment for statistical computing and graphics.", f: "Ross Ihaka and Robert Gentleman", y: "1993" },
  { t: "Julia", m: "A high-level, high-performance dynamic programming language for numerical and scientific computing.", f: "Jeff Bezanson, Stefan Karpinski, Viral Shah, and Alan Edelman", y: "2012" },
  { t: "Elixir", m: "A dynamic, functional programming language built on the Erlang virtual machine for scalable applications.", f: "Jose Valim", y: "2011" },
  { t: "F#", m: "A functional-first, strongly typed programming language for .NET developed by Microsoft Research.", f: "Don Syme", y: "2005" },
  { t: "Fortran", m: "One of the earliest high-level programming languages, still widely used for numerical and scientific computing.", f: "John Backus", y: "1957" },
  { t: "COBOL", m: "An early high-level programming language designed for business, finance, and administrative data processing.", f: "CODASYL Committee", y: "1959" },
  { t: "Ada", m: "A structured, statically typed programming language designed for safety-critical and embedded systems.", f: "Jean Ichbiah", y: "1980" },
  { t: "Prolog", m: "A logic programming language associated with artificial intelligence and computational linguistics.", f: "Alain Colmerauer", y: "1972" },
  { t: "Scheme", m: "A minimalist dialect of the Lisp programming language emphasizing functional programming.", f: "Gerald Jay Sussman and Guy L. Steele", y: "1975" },
  { t: "Visual Basic", m: "An event-driven programming language and development environment from Microsoft known for ease of use.", f: "Microsoft", y: "1991" },
  { t: "Zig", m: "A general-purpose programming language designed for robustness, optimality, and maintainability as an alternative to C.", f: "Andrew Kelley", y: "2016" },
  { t: "Nim", m: "A statically typed, compiled systems programming language that combines efficiency with readable syntax.", f: "Andreas Rumpf", y: "2008" },
  { t: "Groovy", m: "A dynamic, object-oriented programming language for the Java platform, often used for scripting.", f: "James Strachan", y: "2003" },
  { t: "OCaml", m: "A general-purpose, statically typed functional programming language with an emphasis on expressiveness and safety.", f: "Xavier Leroy", y: "1996" },
  { t: "Smalltalk", m: "An object-oriented, dynamically typed programming language that pioneered the concept of everything being an object.", f: "Alan Kay", y: "1972" },
  { t: "Solidity", m: "A statically typed, contract-oriented programming language for writing smart contracts on Ethereum.", f: "Gavin Wood", y: "2014" },
  { t: "Bash", m: "A Unix shell and command language used as the default command interpreter on most Linux distributions.", f: "Brian Fox", y: "1989" },
  { t: "PowerShell", m: "A task automation and configuration management framework from Microsoft, consisting of a command-line shell and scripting language.", f: "Jeffrey Snover", y: "2006" },
  { t: "MATLAB", m: "A proprietary programming language and numeric computing environment developed for matrix computations and engineering.", f: "Cleve Moler", y: "1984" },
  { t: "Elm", m: "A functional programming language that compiles to JavaScript, designed for building reliable web front ends.", f: "Evan Czaplicki", y: "2012" },
  { t: "CoffeeScript", m: "A programming language that compiles into JavaScript, designed to expose the good parts of JavaScript in a simpler syntax.", f: "Jeremy Ashkenas", y: "2009" },
  { t: "D", m: "A systems programming language that combines the performance of compiled languages with modern safety features.", f: "Walter Bright", y: "2001" },
  { t: "WebAssembly", m: "A binary instruction format that acts as a portable compilation target enabling near-native performance in web browsers.", f: "W3C Community Group", y: "2017" },
  { t: "Delphi", m: "An integrated development environment and object-oriented dialect of Pascal for rapid application development.", f: "Anders Hejlsberg", y: "1995" },
  { t: "Oracle Database", m: "A multi-model relational database management system widely used in enterprise computing.", f: "Larry Ellison", y: "1979" },
  { t: "Microsoft SQL Server", m: "A relational database management system developed by Microsoft for enterprise data storage and analysis.", f: "Microsoft", y: "1989" },
  { t: "SQLite", m: "A lightweight, self-contained, serverless relational database engine embedded directly into applications.", f: "D. Richard Hipp", y: "2000" },
  { t: "Cassandra", m: "A free and open-source distributed NoSQL database designed to handle large amounts of data across many servers.", f: "Avinash Lakshman and Prashant Malik", y: "2008" },
  { t: "Neo4j", m: "A native graph database designed to store and query highly connected data using nodes and relationships.", f: "Emil Eifrem", y: "2007" },
  { t: "DynamoDB", m: "A fully managed, serverless NoSQL key-value and document database offered by Amazon Web Services.", f: "Amazon", y: "2012" },
  { t: "MariaDB", m: "An open-source relational database created as a community-driven fork of MySQL.", f: "Michael Widenius", y: "2009" },
  { t: "CouchDB", m: "An open-source NoSQL document database that uses JSON for documents and HTTP for its API.", f: "Damien Katz", y: "2005" },
  { t: "InfluxDB", m: "An open-source time series database optimized for fast, high-availability storage of metrics and events.", f: "InfluxData", y: "2013" },
  { t: "Snowflake", m: "A cloud-based data warehousing platform that separates compute and storage for elastic analytics workloads.", f: "Benoit Dageville, Thierry Cruanes, and Marcin Zukowski", y: "2012" },
  { t: "Firebase", m: "A platform developed by Google for building mobile and web applications, offering a realtime database and backend services.", f: "Andrew Lee and James Tamplin", y: "2011" },
  { t: "CockroachDB", m: "A distributed SQL database built to survive failures and scale horizontally across multiple regions.", f: "Cockroach Labs", y: "2015" },
  { t: "Memcached", m: "A general-purpose distributed memory caching system used to speed up dynamic web applications.", f: "Brad Fitzpatrick", y: "2003" },
  { t: "Supabase", m: "An open-source backend-as-a-service platform built on PostgreSQL, offering an alternative to Firebase.", f: "Paul Copplestone and Ant Wilson", y: "2020" },
  { t: "DigitalOcean", m: "A cloud infrastructure provider known for offering simple, developer-friendly virtual private servers called Droplets.", f: "Ben Uretsky and Moisey Uretsky", y: "2011" },
  { t: "Heroku", m: "A cloud platform as a service that lets developers build, run, and operate applications entirely in the cloud.", f: "James Lindenbaum, Adam Wiggins, and Orion Henry", y: "2007" },
  { t: "Cloudflare", m: "A company providing content delivery network, DDoS mitigation, and security services to websites.", f: "Matthew Prince, Lee Holloway, and Michelle Zatlyn", y: "2009" },
  { t: "Vercel", m: "A cloud platform for static sites and serverless functions, and the company behind the Next.js framework.", f: "Guillermo Rauch", y: "2015" },
  { t: "Netlify", m: "A cloud computing platform that offers hosting and serverless backend services for static and dynamic web projects.", f: "Matt Biilmann and Christian Bach", y: "2014" },
  { t: "ChatGPT", m: "A conversational artificial intelligence chatbot built on large language models, released to the public by OpenAI.", f: "OpenAI", y: "2022" },
  { t: "GPT-3", m: "A large language model that uses deep learning to produce human-like text, developed by OpenAI.", f: "OpenAI", y: "2020" },
  { t: "BERT", m: "A transformer-based machine learning model for natural language processing developed by Google.", f: "Google", y: "2018" },
  { t: "Keras", m: "An open-source deep learning API written in Python, designed for fast experimentation with neural networks.", f: "Francois Chollet", y: "2015" },
  { t: "Scikit-learn", m: "A free, open-source machine learning library for the Python programming language featuring classification and regression tools.", f: "David Cournapeau", y: "2007" },
  { t: "LangChain", m: "An open-source framework for developing applications powered by large language models.", f: "Harrison Chase", y: "2022" },
  { t: "Stable Diffusion", m: "A deep learning text-to-image model capable of generating detailed images from text descriptions.", f: "Stability AI", y: "2022" },
  { t: "AlphaGo", m: "A computer program developed by DeepMind that became the first to defeat a professional human Go player.", f: "DeepMind", y: "2015" },
  { t: "OpenCV", m: "An open-source computer vision and machine learning software library used for image and video analysis.", f: "Intel", y: "2000" },
  { t: "Claude", m: "A family of large language model AI assistants developed by Anthropic, focused on being helpful and safe.", f: "Anthropic", y: "2023" },
  { t: "DALL-E", m: "An AI system developed by OpenAI that generates images from natural language text descriptions.", f: "OpenAI", y: "2021" },
  { t: "XGBoost", m: "An optimized, scalable gradient boosting library widely used for machine learning competitions and production systems.", f: "Tianqi Chen", y: "2014" },
  { t: "spaCy", m: "An open-source software library for advanced natural language processing in Python.", f: "Explosion AI", y: "2015" },
  { t: "FreeBSD", m: "A free and open-source Unix-like operating system descended from the Berkeley Software Distribution.", f: "FreeBSD Project", y: "1993" },
  { t: "Ubuntu", m: "A free and open-source Linux distribution based on Debian, widely used on desktops and servers.", f: "Canonical", y: "2004" },
  { t: "Debian", m: "A free and open-source operating system composed of software developed by a volunteer community.", f: "Ian Murdock", y: "1993" },
  { t: "Fedora", m: "A community-driven, free and open-source Linux distribution sponsored primarily by Red Hat.", f: "Fedora Project", y: "2003" },
  { t: "Chrome OS", m: "A lightweight operating system developed by Google, designed to run web applications through the Chrome browser.", f: "Google", y: "2011" },
  { t: "Unix", m: "A family of foundational multitasking, multiuser computer operating systems developed at Bell Labs.", f: "Ken Thompson and Dennis Ritchie", y: "1969" },
  { t: "OpenBSD", m: "A free and open-source Unix-like operating system known for its emphasis on security and code correctness.", f: "Theo de Raadt", y: "1995" },
  { t: "Solaris", m: "A Unix-based operating system originally developed by Sun Microsystems.", f: "Sun Microsystems", y: "1992" },
  { t: "Subversion", m: "A software versioning and revision control system distributed under an open-source license.", f: "CollabNet", y: "2000" },
  { t: "Mercurial", m: "A free, distributed source control management tool for software developers.", f: "Matt Mackall", y: "2005" },
  { t: "GitHub", m: "A web-based platform for version control and collaboration using Git, later acquired by Microsoft.", f: "Tom Preston-Werner, Chris Wanstrath, and PJ Hyett", y: "2008" },
  { t: "GitLab", m: "A web-based DevOps platform providing Git repository management, CI/CD, and issue tracking.", f: "Dmitriy Zaporozhets", y: "2011" },
  { t: "Jenkins", m: "An open-source automation server used to build, test, and deploy software through continuous integration.", f: "Kohsuke Kawaguchi", y: "2011" },
  { t: "Visual Studio Code", m: "A free, lightweight source code editor developed by Microsoft with support for debugging and extensions.", f: "Microsoft", y: "2015" },
  { t: "Vim", m: "A highly configurable, keyboard-driven text editor built to make text editing efficient.", f: "Bram Moolenaar", y: "1991" },
  { t: "Emacs", m: "An extensible, customizable text editor with a built-in Lisp interpreter, popular among programmers.", f: "Richard Stallman", y: "1976" },
  { t: "IntelliJ IDEA", m: "An integrated development environment for Java and other JVM languages, produced by JetBrains.", f: "JetBrains", y: "2001" },
  { t: "Postman", m: "A collaboration platform for API development that lets developers design, test, and document APIs.", f: "Abhinav Asthana", y: "2014" },
  { t: "Terraform", m: "An open-source infrastructure-as-code tool that lets teams define and provision data center infrastructure using a declarative language.", f: "HashiCorp", y: "2014" },
  { t: "Ansible", m: "An open-source software provisioning and configuration management tool that automates IT tasks over SSH.", f: "Michael DeHaan", y: "2012" },
  { t: "Grafana", m: "An open-source analytics and interactive visualization platform for monitoring metrics and logs.", f: "Torkel Odegaard", y: "2014" },
  { t: "Prometheus", m: "An open-source systems monitoring and alerting toolkit originally built at SoundCloud.", f: "Matt T. Proud and Julius Volz", y: "2012" },
  { t: "npm", m: "The default package manager for the Node.js JavaScript runtime environment, hosting the world's largest software registry.", f: "Isaac Z. Schlueter", y: "2010" },
  { t: "Webpack", m: "A static module bundler for modern JavaScript applications that bundles assets into optimized output files.", f: "Tobias Koppers", y: "2012" },
  { t: "Svelte", m: "A front-end JavaScript framework that shifts work from the browser to a compile step at build time.", f: "Rich Harris", y: "2016" },
  { t: "Next.js", m: "A React framework that enables server-side rendering, static site generation, and full-stack web applications.", f: "Vercel", y: "2016" },
  { t: "jQuery", m: "A fast, small JavaScript library that simplifies HTML document traversal, event handling, and animation.", f: "John Resig", y: "2006" },
  { t: "Bootstrap", m: "A free and open-source front-end framework for developing responsive, mobile-first websites, originally built at Twitter.", f: "Mark Otto and Jacob Thornton", y: "2011" },
  { t: "Tailwind CSS", m: "A utility-first CSS framework used for rapidly building custom user interfaces.", f: "Adam Wathan", y: "2017" },
  { t: "Flutter", m: "An open-source UI software development toolkit from Google for building natively compiled applications across platforms.", f: "Google", y: "2017" },
  { t: "React Native", m: "A framework that allows developers to build native mobile apps using React and JavaScript.", f: "Facebook", y: "2015" },
  { t: "Ionic", m: "An open-source UI toolkit for building performant, high-quality mobile and desktop apps using web technologies.", f: "Drifty Co.", y: "2013" },
  { t: "ASP.NET", m: "A free, open-source web framework developed by Microsoft for building modern web apps and services.", f: "Microsoft", y: "2002" },
  { t: "FastAPI", m: "A modern, high-performance Python web framework for building APIs based on standard Python type hints.", f: "Sebastian Ramirez", y: "2018" },
  { t: "Gatsby", m: "A React-based open-source framework for building fast static websites and apps.", f: "Kyle Mathews", y: "2015" },
  { t: "Ember.js", m: "An open-source JavaScript web framework that uses a component-service pattern for building ambitious web applications.", f: "Yehuda Katz", y: "2011" },
  { t: "ARM Architecture", m: "A family of reduced instruction set computing chip designs widely used in mobile devices and increasingly in laptops and servers.", f: "Acorn Computers", y: "1985" },
  { t: "x86", m: "A family of complex instruction set computer instruction set architectures originally developed for Intel microprocessors.", f: "Intel", y: "1978" },
  { t: "RISC-V", m: "An open, royalty-free instruction set architecture for computer chips based on reduced instruction set computing principles.", f: "UC Berkeley", y: "2010" },
  { t: "CUDA", m: "A parallel computing platform and programming model created by NVIDIA for general computing on graphics processing units.", f: "NVIDIA", y: "2006" },
  { t: "Apple M1", m: "A system-on-a-chip designed by Apple that marked the transition of Mac computers from Intel to Apple silicon.", f: "Apple", y: "2020" },
  { t: "Raspberry Pi", m: "A series of small, low-cost single-board computers designed to promote teaching of basic computer science.", f: "Raspberry Pi Foundation", y: "2012" },
  { t: "Intel 4004", m: "The first commercially available single-chip microprocessor, marking the beginning of the microprocessor era.", f: "Federico Faggin, Ted Hoff, and Stan Mazor", y: "1971" },
  { t: "TCP/IP", m: "The foundational suite of communication protocols used to interconnect network devices on the internet.", f: "Vint Cerf and Bob Kahn", y: "1983" },
  { t: "HTTP", m: "The application-layer protocol used for transmitting hypermedia documents such as HTML on the World Wide Web.", f: "Tim Berners-Lee", y: "1991" },
  { t: "DNS", m: "The hierarchical naming system that translates human-readable domain names into IP addresses.", f: "Paul Mockapetris", y: "1983" },
  { t: "SMTP", m: "The standard internet protocol used for sending electronic mail between servers.", f: "Jon Postel", y: "1982" },
  { t: "FTP", m: "A standard network protocol used for transferring files between a client and server on a computer network.", f: "Abhay Bhushan", y: "1971" },
  { t: "SSH", m: "A cryptographic network protocol used for securely operating network services over an unsecured network.", f: "Tatu Ylonen", y: "1995" },
  { t: "Bluetooth", m: "A short-range wireless technology standard used for exchanging data between fixed and mobile devices.", f: "Ericsson", y: "1994" },
  { t: "gRPC", m: "A high-performance, open-source remote procedure call framework that can run in any environment.", f: "Google", y: "2015" },
  { t: "OAuth", m: "An open standard for access delegation, commonly used to let users grant websites access without sharing passwords.", f: "Blaine Cook", y: "2007" },
  { t: "WebRTC", m: "A free, open-source project that provides web browsers with real-time communication via simple APIs for audio, video, and data.", f: "Google", y: "2011" },
  { t: "MQTT", m: "A lightweight publish-subscribe messaging protocol designed for constrained devices and low-bandwidth networks.", f: "Andy Stanford-Clark and Arlen Nipper", y: "1999" },
  { t: "Ethernet", m: "A family of wired networking technologies commonly used in local area networks, originally developed at Xerox PARC.", f: "Robert Metcalfe", y: "1973" },
  { t: "USB", m: "An industry standard establishing specifications for cables, connectors, and protocols for connecting computer peripherals.", f: "Ajay Bhatt and USB-IF", y: "1996" },
  { t: "Salesforce", m: "A cloud-based customer relationship management platform that pioneered software-as-a-service for enterprise sales teams.", f: "Marc Benioff", y: "1999" },
  { t: "Slack", m: "A business communication platform offering channel-based messaging, file sharing, and integrations for teams.", f: "Stewart Butterfield", y: "2013" },
  { t: "Zoom", m: "A cloud-based video conferencing service that became widely adopted for remote meetings and webinars.", f: "Eric Yuan", y: "2011" },
  { t: "Shopify", m: "A commerce platform that allows anyone to set up an online store and sell products.", f: "Tobias Lutke", y: "2006" },
  { t: "Stripe", m: "A financial infrastructure platform that provides payment processing software and APIs for online businesses.", f: "Patrick Collison and John Collison", y: "2010" },
  { t: "Figma", m: "A cloud-based collaborative interface design tool used for creating and prototyping user interfaces.", f: "Dylan Field and Evan Wallace", y: "2012" },
  { t: "Notion", m: "An all-in-one workspace application combining notes, databases, kanban boards, and wikis.", f: "Ivan Zhao", y: "2016" },
  { t: "Discord", m: "A voice, video, and text communication platform originally built for gaming communities.", f: "Jason Citron and Stan Vishnevskiy", y: "2015" },
  { t: "Spotify", m: "A digital music, podcast, and audio streaming service offering access to millions of songs on demand.", f: "Daniel Ek and Martin Lorentzon", y: "2006" },
  { t: "Adobe Photoshop", m: "A raster graphics editor used for photo editing and digital art, developed by Adobe Inc.", f: "Thomas and John Knoll", y: "1990" },
  { t: "Unity", m: "A cross-platform game engine widely used to create both two-dimensional and three-dimensional games and simulations.", f: "Unity Technologies", y: "2005" },
  { t: "Unreal Engine", m: "A powerful three-dimensional game engine developed by Epic Games, known for high-fidelity graphics.", f: "Epic Games", y: "1998" },
  { t: "Twilio", m: "A cloud communications platform that lets developers programmatically send and receive text messages and calls.", f: "Jeff Lawson", y: "2008" },
  { t: "Datadog", m: "A monitoring and analytics platform for cloud-scale applications, providing observability across infrastructure.", f: "Olivier Pomel and Alexis Le-Quoc", y: "2010" },
  { t: "Databricks", m: "A data and AI company that created a unified analytics platform built around Apache Spark.", f: "Ali Ghodsi and the creators of Apache Spark", y: "2013" },
  { t: "Trello", m: "A web-based, kanban-style list-making and project management application.", f: "Fog Creek Software", y: "2011" },
  { t: "NestJS", m: "A progressive Node.js framework for building efficient, scalable server-side applications using TypeScript.", f: "Kamil Mysliwiec", y: "2017" },
  { t: "SwiftUI", m: "A declarative user interface framework introduced by Apple for building apps across all its platforms.", f: "Apple", y: "2019" },
  { t: "Alibaba Cloud", m: "A cloud computing subsidiary of Alibaba Group offering computing, storage, and networking services across Asia and globally.", f: "Alibaba Group", y: "2009" },
  { t: "IBM Watson", m: "A suite of enterprise-ready artificial intelligence services and applications developed by IBM.", f: "IBM", y: "2011" },
  { t: "Windows NT", m: "A line of Microsoft operating systems built on a new, portable kernel architecture distinct from earlier consumer Windows.", f: "Dave Cutler", y: "1993" },
  { t: "CentOS", m: "A free, community-supported Linux distribution built from the source code of Red Hat Enterprise Linux.", f: "Lance Davis", y: "2004" },
  { t: "Puppet", m: "An open-source software configuration management tool used to automate infrastructure provisioning.", f: "Luke Kanies", y: "2005" },
  { t: "Chef", m: "A configuration management tool that uses Ruby-based scripts, called recipes, to automate infrastructure setup.", f: "Adam Jacob", y: "2009" },
  { t: "ESLint", m: "A static code analysis tool for identifying problematic patterns in JavaScript code.", f: "Nicholas C. Zakas", y: "2013" },
  { t: "Babel", m: "A free and open-source JavaScript compiler that converts modern JavaScript code into backward-compatible versions.", f: "Sebastian McKenzie", y: "2014" },
  { t: "Selenium", m: "A portable framework for testing web applications by automating browser interactions.", f: "Jason Huggins", y: "2004" },
  { t: "IPv6", m: "The most recent version of the Internet Protocol, designed to succeed IPv4 and vastly expand available address space.", f: "IETF", y: "1998" },
  { t: "JWT", m: "JSON Web Token, a compact, URL-safe standard for securely transmitting claims between two parties as a signed token.", f: "IETF", y: "2015" },
  { t: "Thunderbolt", m: "A hardware interface for connecting external peripherals with high-speed data transfer, developed jointly by two tech companies.", f: "Intel and Apple", y: "2011" },
  { t: "Jetpack Compose", m: "A modern declarative UI toolkit for building native Android applications, developed by Google.", f: "Google", y: "2021" }
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
    w => `What is the meaning of the Web3 term '${w.t}'?`
  ], w => w.m, w => w.m))
  bank['web3'].push(...generateQs(web3, [
    w => `Which Web3 concept is defined as: "${w.m}"?`
  ], w => w.t, w => w.t))

  // Tech (50 items * multiple templates = massive native pool)
  bank['tech'] = []
  bank['tech'].push(...generateQs(tech, [
    t => `Which technology is described as: "${t.m}"?`
  ], t => t.t, t => t.t))
  bank['tech'].push(...generateQs(tech, [
    t => `What is ${t.t} commonly used for or described as?`
  ], t => t.m, t => t.m))
  bank['tech'].push(...generateQs(tech, [
    t => `Who is credited as the original creator or founding organization of ${t.t}?`
  ], t => t.f, t => t.f))
  bank['tech'].push(...generateQs(tech, [
    t => `In what year was ${t.t} officially released or founded?`
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
