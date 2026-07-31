import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeInput } from './normalize.js'

export function loadDictionary({ dataDir = 'data', langs = ['es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ro', 'tr', 'id'], extraWords = [] } = {}) {
  const words = new Set()

  // Load words.txt
  const wordsPath = join(dataDir, 'words.txt')
  readFileSync(wordsPath, 'utf8')
    .split('\n')
    .forEach(w => {
      const trimmed = w.trim()
      if (trimmed) words.add(trimmed)
    })

  // Load extra.txt (skip comment lines and blanks, normalize diacritics as promised)
  const extraPath = join(dataDir, 'extra.txt')
  readFileSync(extraPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const normalized = normalizeInput(trimmed)
        if (/^[a-z]{3,}$/.test(normalized)) {
          words.add(normalized)
        }
      }
    })

  // Load language files
  for (const lang of langs) {
    try {
      const langPath = join(dataDir, 'lang', `${lang}.txt`)
      readFileSync(langPath, 'utf8')
        .split('\n')
        .forEach(w => {
          const trimmed = w.trim()
          if (trimmed) words.add(trimmed)
        })
    } catch (e) {
      // Language file may not exist, skip silently
    }
  }

  // Add extra words passed in
  extraWords.forEach(w => {
    const normalized = normalizeInput(w)
    if (normalized) words.add(normalized)
  })

  // Build sorted array and letter-to-range index
  let sortedWords = Array.from(words).sort()
  const letterIndex = new Map()

  for (let i = 0; i < sortedWords.length; i++) {
    const firstChar = sortedWords[i][0]
    if (!letterIndex.has(firstChar)) {
      letterIndex.set(firstChar, { start: i, end: i })
    } else {
      letterIndex.get(firstChar).end = i
    }
  }

  return {
    has(word) {
      return words.has(normalizeInput(word))
    },

    add(word) {
      const normalized = normalizeInput(word)
      if (!normalized) return false
      const hadIt = words.has(normalized)
      words.add(normalized)
      // ponytail: new word not in randomWord index until next rebuild, scan if throughput matters
      return !hadIt
    },

    remove(word) {
      const normalized = normalizeInput(word)
      if (!normalized) return false
      return words.delete(normalized)
    },

    get size() {
      return words.size
    },

    randomWord(letter) {
      if (!letter || letter.length !== 1) return null
      const range = letterIndex.get(letter)
      if (!range) return null
      const idx = range.start + Math.floor(Math.random() * (range.end - range.start + 1))
      const word = sortedWords[idx]
      // After remove(), word may be stale; scan for a live one in the range
      if (word && words.has(word)) return word
      for (let i = range.start; i <= range.end; i++) {
        if (words.has(sortedWords[i])) return sortedWords[i]
      }
      return null
    },

    randomLetter() {
      const letters = Array.from(letterIndex.keys())
      return letters.length > 0 ? letters[Math.floor(Math.random() * letters.length)] : null
    },
  }
}
