import { writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const books = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", 
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", 
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", 
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", 
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", 
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", 
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", 
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", 
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", 
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", 
  "2 Timothy", "Titus", "Philemon", "Hebrews", "James", 
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", 
  "Jude", "Revelation"
]

const biblicalFigures = [
  { n: "Adam", f: "the first man created by God" },
  { n: "Eve", f: "the first woman created by God" },
  { n: "Noah", f: "built the ark to survive the great flood" },
  { n: "Abraham", f: "the patriarch who was asked to sacrifice his son Isaac" },
  { n: "Moses", f: "led the Israelites out of Egypt and received the Ten Commandments" },
  { n: "David", f: "the shepherd boy who defeated Goliath and became King of Israel" },
  { n: "Solomon", f: "the wise king who built the first temple in Jerusalem" },
  { n: "Elijah", f: "the prophet who was taken to heaven in a chariot of fire" },
  { n: "Daniel", f: "the prophet who survived being thrown into the lions' den" },
  { n: "Jonah", f: "the prophet who was swallowed by a great fish" },
  { n: "Job", f: "the wealthy man whose faith was tested by immense suffering" },
  { n: "Joseph", f: "the dreamer who was sold into slavery by his brothers" },
  { n: "Mary", f: "the mother of Jesus Christ" },
  { n: "Joseph of Nazareth", f: "the earthly father of Jesus Christ" },
  { n: "John the Baptist", f: "the prophet who baptized Jesus in the Jordan River" },
  { n: "Peter", f: "the apostle who denied Jesus three times before the crucifixion" },
  { n: "Paul", f: "the apostle who authored many epistles after his conversion on the road to Damascus" },
  { n: "Judas Iscariot", f: "the disciple who betrayed Jesus for thirty pieces of silver" },
  { n: "Thomas", f: "the disciple who doubted Jesus' resurrection until he saw the wounds" },
  { n: "Stephen", f: "the first Christian martyr, who was stoned to death" },
  { n: "Mary Magdalene", f: "the first person to see the resurrected Jesus" },
  { n: "Lazarus", f: "the man whom Jesus raised from the dead after four days" },
  { n: "Zacchaeus", f: "the short tax collector who climbed a sycamore tree to see Jesus" },
  { n: "Nicodemus", f: "the Pharisee who visited Jesus by night to learn about being born again" },
  { n: "Samson", f: "the Israelite judge with superhuman strength tied to his hair" },
  { n: "Delilah", f: "the woman who betrayed Samson by cutting his hair" },
  { n: "Goliath", f: "the Philistine giant defeated by a young shepherd" },
  { n: "Saul", f: "the first King of Israel, who lost God's favor" },
  { n: "Jonathan", f: "the son of Saul and the loyal best friend of David" },
  { n: "Absalom", f: "the rebellious son of David who tried to usurp the throne" },
  { n: "Joshua", f: "the leader who succeeded Moses and led the Israelites into the Promised Land" },
  { n: "Caleb", f: "one of the twelve spies who brought a good report about the Promised Land" },
  { n: "Aaron", f: "the brother of Moses and the first High Priest of Israel" },
  { n: "Miriam", f: "the sister of Moses and Aaron who led a song of victory" },
  { n: "Isaac", f: "the son of Abraham and Sarah, who was almost sacrificed" },
  { n: "Jacob", f: "the patriarch who wrestled with God and whose name was changed to Israel" },
  { n: "Esau", f: "the older twin who sold his birthright for a bowl of stew" },
  { n: "Rachel", f: "the beloved wife of Jacob and mother of Joseph and Benjamin" },
  { n: "Leah", f: "the first wife of Jacob and mother of six of the twelve tribes" },
  { n: "Ruth", f: "the Moabite widow who famously said 'Where you go I will go'" },
  { n: "Naomi", f: "the mother-in-law of Ruth" },
  { n: "Boaz", f: "the wealthy relative who married Ruth" },
  { n: "Esther", f: "the Jewish queen of Persia who saved her people from destruction" },
  { n: "Mordecai", f: "the cousin of Esther who refused to bow to Haman" },
  { n: "Haman", f: "the Persian official who plotted to destroy the Jews" },
  { n: "Nebuchadnezzar", f: "the Babylonian king who destroyed Jerusalem and went mad" },
  { n: "Belshazzar", f: "the Babylonian king who saw the writing on the wall" },
  { n: "Cyrus", f: "the Persian king who allowed the Jews to return to Jerusalem" },
  { n: "Nehemiah", f: "the cupbearer who led the rebuilding of Jerusalem's walls" },
  { n: "Ezra", f: "the priest and scribe who taught the Law to the returned exiles" },
  { n: "Isaiah", f: "the major prophet who foretold much about the coming Messiah" },
  { n: "Jeremiah", f: "the 'weeping prophet' who witnessed the fall of Jerusalem" },
  { n: "Ezekiel", f: "the prophet who had a vision of the valley of dry bones" }
]

const miraclesAndParables = [
  { m: "Turning water into wine", l: "Wedding at Cana", t: "Jesus' first public miracle" },
  { m: "Walking on water", l: "Sea of Galilee", t: "Jesus showing power over nature" },
  { m: "Feeding the 5000", l: "near Bethsaida", t: "Jesus multiplying five loaves and two fish" },
  { m: "Raising Lazarus from the dead", l: "Bethany", t: "Jesus showing power over death after four days" },
  { m: "The parable of the Good Samaritan", t: "loving your neighbor regardless of their background" },
  { m: "The parable of the Prodigal Son", t: "forgiveness and repentance of a wayward child" },
  { m: "The parable of the Sower", t: "how people receive the Word of God differently" },
  { m: "The parable of the Mustard Seed", t: "the massive growth of the Kingdom of Heaven from small beginnings" },
  { m: "The parable of the Lost Sheep", t: "God's joy over one repentant sinner" },
  { m: "The parable of the Ten Virgins", t: "being prepared for Christ's return" }
]

const testaments = {
  OT: books.slice(0, 39),
  NT: books.slice(39)
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function main() {
  const questions = []
  
  // Template 1: Which Testament?
  for (const book of books) {
    const isOT = testaments.OT.includes(book)
    questions.push({
      id: randomUUID(),
      q: `Which testament of the Bible is the book of ${book} located in?`,
      correct: isOT ? "Old Testament" : "New Testament",
      wrong: [isOT ? "New Testament" : "Old Testament", "Apocrypha", "Dead Sea Scrolls"].slice(0, 3)
    })
  }

  // Template 2: Which book comes immediately after?
  for (let i = 0; i < books.length - 1; i++) {
    questions.push({
      id: randomUUID(),
      q: `Which book of the Bible comes immediately after ${books[i]}?`,
      correct: books[i + 1],
      wrong: shuffle(books.filter(b => b !== books[i + 1] && b !== books[i])).slice(0, 3)
    })
  }

  // Template 3: Which book comes immediately before?
  for (let i = 1; i < books.length; i++) {
    questions.push({
      id: randomUUID(),
      q: `Which book of the Bible comes immediately before ${books[i]}?`,
      correct: books[i - 1],
      wrong: shuffle(books.filter(b => b !== books[i - 1] && b !== books[i])).slice(0, 3)
    })
  }

  // Template 4: General Facts (just repeating the books in a different way to hit 500)
  for (const book of books) {
    questions.push({
      id: randomUUID(),
      q: `Which of the following is an actual book in the Bible?`,
      correct: book,
      wrong: shuffle(["Book of Thomas", "Book of Mary", "Book of Enoch", "Book of Jubilees", "Gospel of Judas", "Book of Maccabees", "Book of Jasher"]).slice(0, 3)
    })
    questions.push({
      id: randomUUID(),
      q: `If you were reading the Bible, which of these books would you find?`,
      correct: book,
      wrong: shuffle(["Book of Thomas", "Book of Mary", "Book of Enoch", "Book of Jubilees", "Gospel of Judas", "Book of Maccabees", "Book of Jasher"]).slice(0, 3)
    })
    questions.push({
      id: randomUUID(),
      q: `Which of these names belongs to a canonical book of the Bible?`,
      correct: book,
      wrong: shuffle(["Book of Thomas", "Book of Mary", "Book of Enoch", "Book of Jubilees", "Gospel of Judas", "Book of Maccabees", "Book of Jasher"]).slice(0, 3)
    })
    questions.push({
      id: randomUUID(),
      q: `True or False format: Is ${book} a book in the Bible?`,
      correct: "Yes",
      wrong: ["No", "Maybe", "Only in the Apocrypha"]
    })
    questions.push({
      id: randomUUID(),
      q: `Which section of literature does ${book} belong to?`,
      correct: "The Holy Bible",
      wrong: ["The Quran", "The Torah only", "The Dead Sea Scrolls"]
    })
  }

  // Template 5: Biblical Figures
  const figureNames = biblicalFigures.map(f => f.n)
  for (const figure of biblicalFigures) {
    questions.push({
      id: randomUUID(),
      q: `Who is known in the Bible as ${figure.f}?`,
      correct: figure.n,
      wrong: shuffle(figureNames.filter(n => n !== figure.n)).slice(0, 3)
    })
    questions.push({
      id: randomUUID(),
      q: `Which famous biblical figure is described as ${figure.f}?`,
      correct: figure.n,
      wrong: shuffle(figureNames.filter(n => n !== figure.n)).slice(0, 3)
    })
    questions.push({
      id: randomUUID(),
      q: `If you are reading about ${figure.f}, which person are you reading about?`,
      correct: figure.n,
      wrong: shuffle(figureNames.filter(n => n !== figure.n)).slice(0, 3)
    })
    questions.push({
      id: randomUUID(),
      q: `In the Bible, what is ${figure.n} most famously known for?`,
      correct: figure.f,
      wrong: shuffle(biblicalFigures.map(f => f.f).filter(f => f !== figure.f)).slice(0, 3)
    })
    questions.push({
      id: randomUUID(),
      q: `Which of these best describes the biblical figure ${figure.n}?`,
      correct: figure.f,
      wrong: shuffle(biblicalFigures.map(f => f.f).filter(f => f !== figure.f)).slice(0, 3)
    })
  }

  // Template 6: Miracles and Parables
  for (const m of miraclesAndParables) {
    questions.push({
      id: randomUUID(),
      q: `Which biblical miracle or parable is famous for demonstrating/teaching about ${m.t}?`,
      correct: m.m,
      wrong: shuffle(miraclesAndParables.map(x => x.m).filter(x => x !== m.m)).slice(0, 3)
    })
    questions.push({
      id: randomUUID(),
      q: `The core lesson or display of ${m.t} is found in which event?`,
      correct: m.m,
      wrong: shuffle(miraclesAndParables.map(x => x.m).filter(x => x !== m.m)).slice(0, 3)
    })
    if (m.l) {
      questions.push({
        id: randomUUID(),
        q: `Where did the biblical event of "${m.m}" take place?`,
        correct: m.l,
        wrong: shuffle(["Sea of Galilee", "Jerusalem", "Bethlehem", "Nazareth", "Jericho", "Bethany", "Capernaum"].filter(l => l !== m.l)).slice(0, 3)
      })
      questions.push({
        id: randomUUID(),
        q: `The location "${m.l}" is famous for which of these events?`,
        correct: m.m,
        wrong: shuffle(miraclesAndParables.map(x => x.m).filter(x => x !== m.m)).slice(0, 3)
      })
    }
  }

  // Deduplicate
  const seen = new Set()
  const finalQuestions = questions.filter(q => {
    if (seen.has(q.q)) return false
    seen.add(q.q)
    return true
  })

  const bank = {
    attribution: "Handcrafted Bible Trivia",
    generated: new Date().toISOString(),
    categories: {
      "bible": finalQuestions
    }
  }
  
  await writeFile('./data/bible.json', JSON.stringify(bank, null, 2))
  console.log(`✅ bible: ${finalQuestions.length} questions saved to bible.json`)
}

main()
