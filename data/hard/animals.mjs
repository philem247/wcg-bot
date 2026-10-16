// Hand-written hard animals questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'animals',
  questions: [
    // ── Records ─────────────────────────────
    q('hard-records', 'Which bird is the fastest animal in a dive?', 'Peregrine falcon', ['Golden eagle', 'Common swift', 'Albatross']),
    q('hard-records', 'Which bird has the largest wingspan?', 'Wandering albatross', ['Andean condor', 'Marabou stork', 'Great white pelican']),
    q('hard-records', 'Which animal has the longest pregnancy?', 'African elephant', ['Blue whale', 'Giraffe', 'Rhinoceros']),
    q('hard-records', 'What is the largest living species of shark?', 'Whale shark', ['Great white shark', 'Basking shark', 'Tiger shark']),
    q('hard-records', 'Which is the largest living species of big cat?', 'Tiger', ['Lion', 'Jaguar', 'Leopard']),
    q('hard-records', 'Which animal is often said to have the strongest bite of any living animal?', 'Saltwater crocodile', ['Hippopotamus', 'Great white shark', 'Jaguar']),
    q('hard-records', 'What is the longest venomous snake in the world?', 'King cobra', ['Black mamba', 'Inland taipan', 'Gaboon viper']),
    q('hard-records', 'Which snake has the longest fangs?', 'Gaboon viper', ['King cobra', 'Black mamba', 'Rattlesnake']),
    q('hard-records', 'What is the largest frog in the world?', 'Goliath frog', ['Hairy frog', 'African bullfrog', 'Lake Titicaca frog']),
    q('hard-records', 'Which bird lays the largest eggs?', 'Ostrich', ['Emu', 'Albatross', 'Cassowary']),
    q('hard-records', 'Which is the slowest mammal in the world?', 'Three-toed sloth', ['Koala', 'Slow loris', 'Hedgehog']),
    q('hard-records', 'Which mammal has the densest fur?', 'Sea otter', ['Polar bear', 'Arctic fox', 'Chinchilla']),
    q('hard-records', 'Which animal has the highest blood pressure?', 'Giraffe', ['Elephant', 'Horse', 'Rhinoceros']),
    q('hard-records', 'Which mammal is the most trafficked in the world?', 'Pangolin', ['Elephant', 'Rhinoceros', 'Tiger']),

    // ── Odd facts ─────────────────────────────
    q('hard-facts', 'Which of these mammals lays eggs?', 'Echidna', ['Opossum', 'Pangolin', 'Armadillo']),
    q('hard-anatomy', "What colour is a polar bear's skin?", 'Black', ['White', 'Pink', 'Grey']),
    q('hard-facts', 'Which big cat cannot fully retract its claws?', 'Cheetah', ['Leopard', 'Jaguar', 'Lion']),
    q('hard-facts', 'On which island are lemurs found in the wild?', 'Madagascar', ['Borneo', 'Sri Lanka', 'Mauritius']),
    q('hard-facts', 'How many humps does a dromedary camel have?', 'One', ['Two', 'Three', 'None']),
    q('hard-facts', 'Which bird can fly backwards?', 'Hummingbird', ['Kingfisher', 'Swift', 'Sparrow']),
    q('hard-facts', 'Which animal has fingerprints almost identical to human ones?', 'Koala', ['Chimpanzee', 'Gorilla', 'Orangutan']),
    q('hard-facts', 'What is a pangolin\'s body covered in?', 'Scales', ['Spines', 'Shell plates', 'Quills']),
    q('hard-anatomy', 'How many eyes do most spiders have?', 'Eight', ['Six', 'Four', 'Two']),
    q('hard-facts', 'Which whale has a long spiral tusk?', 'Narwhal', ['Beluga', 'Orca', 'Sperm whale']),
    q('hard-facts', 'The orca is the largest member of which family?', 'Dolphins', ['Sharks', 'Porpoises', 'Seals']),
    q('hard-facts', 'What do blue whales mainly eat?', 'Krill', ['Squid', 'Seals', 'Sardines']),
    q('hard-facts', 'Which African snake gets its name from the colour inside its mouth?', 'Black mamba', ['Green mamba', 'Boomslang', 'Puff adder']),
    q('hard-facts', 'Which is the largest living amphibian?', 'Chinese giant salamander', ['Japanese giant salamander', 'Goliath frog', 'Mexican axolotl']),
    q('hard-facts', 'Which continent has no native reptiles?', 'Antarctica', ['Europe', 'Australia', 'South America']),
    q('hard-anatomy', 'Roughly how many hearts does an earthworm have?', 'Five', ['One', 'Two', 'Ten']),
    q('hard-facts', 'Which animal is the only mammal capable of true flight?', 'Bat', ['Flying squirrel', 'Sugar glider', 'Colugo']),

    // ── Names ─────────────────────────────
    q('hard-names', 'What is a group of whales called?', 'A pod', ['A school', 'A herd', 'A colony']),
    q('hard-names', 'What is a male donkey called?', 'Jack', ['Jenny', 'Mule', 'Hinny']),
    q('hard-names', 'What is the offspring of a male donkey and a female horse?', 'Mule', ['Hinny', 'Jennet', 'Zebroid']),
    q('hard-names', 'What is a female fox called?', 'Vixen', ['Doe', 'Sow', 'Jenny']),
    q('hard-names', 'What is a baby goat called?', 'Kid', ['Calf', 'Lamb', 'Foal']),
    q('hard-names', 'What is a baby swan called?', 'Cygnet', ['Gosling', 'Duckling', 'Eaglet']),
    q('hard-names', 'What is a baby owl called?', 'Owlet', ['Cygnet', 'Gosling', 'Eaglet']),

    // ── Habitats and Africa ─────────────────────────────
    q('hard-habitats', 'As of 2023, which country is home to most of the world\'s wild tigers?', 'India', ['Russia', 'Indonesia', 'Nepal']),
    q('hard-habitats', 'Mountain gorillas live in Uganda, Rwanda and which other country?', 'DR Congo', ['Kenya', 'Tanzania', 'Burundi']),
    q('hard-habitats', 'Which ape is found only on the islands of Borneo and Sumatra?', 'Orangutan', ['Bonobo', 'Gibbon', 'Gorilla']),
    q('hard-habitats', 'In which country is the only wild population of bonobos found?', 'DR Congo', ['Cameroon', 'Gabon', 'Uganda']),
    q('hard-habitats', 'On which Indonesian islands does the Komodo dragon live?', 'Lesser Sunda Islands', ['Maluku Islands', 'Riau Islands', 'Mentawai Islands']),
    q('hard-habitats', 'Which big cat lives in the high mountains of Central Asia?', 'Snow leopard', ['Clouded leopard', 'Lynx', 'Caracal']),
    q('hard-habitats', 'Which animal, found only in Australia, sleeps around 20 hours a day?', 'Koala', ['Wombat', 'Kangaroo', 'Platypus']),
    q('hard-anatomy', 'What is the largest species of penguin?', 'Emperor penguin', ['King penguin', 'Gentoo penguin', 'Adélie penguin']),
    q('hard-facts', 'Which insect causes the most human deaths?', 'Mosquito', ['Tsetse fly', 'Housefly', 'Kissing bug']),
    q('hard-records', 'What is the largest living lizard?', 'Komodo dragon', ['Water monitor', 'Green iguana', 'Nile monitor']),
    q('hard-anatomy', 'What kind of animal is the coelacanth, once thought extinct?', 'A fish', ['A reptile', 'An amphibian', 'A mammal']),
    q('hard-habitats', 'Which marsupial is native to the Americas?', 'Opossum', ['Wombat', 'Kangaroo', 'Koala']),
    q('hard-anatomy', 'How many legs does a lobster have?', 'Ten', ['Eight', 'Six', 'Twelve']),
  ],
}
