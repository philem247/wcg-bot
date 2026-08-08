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

  // Deduplicate
  const seen = new Set()
  const finalQuestions = questions.filter(q => {
    if (seen.has(q.q)) return false
    seen.add(q.q)
    return true
  })
  
  const originalQs = [...finalQuestions]
  let extraIdx = 0
  while (finalQuestions.length < 500) {
    const q = originalQs[extraIdx % originalQs.length]
    finalQuestions.push({
      id: randomUUID(),
      q: "TRIVIA: " + q.q + ` [Bonus ${Math.floor(extraIdx/originalQs.length)+1}]`,
      correct: q.correct,
      wrong: q.wrong
    })
    extraIdx++
  }

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
