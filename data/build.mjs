// Regenerate the dictionary files. Run: node data/build.mjs
// Downloads public-domain sources, folds diacritics, filters to /^[a-z]{3,}$/, sorts, dedupes.
import { writeFile, mkdir } from 'node:fs/promises'
import { fold } from '../engine/normalize.js'

const RAW = 'https://raw.githubusercontent.com'
const EN = [
  `${RAW}/dwyl/english-words/master/words_alpha.txt`,   // ~370k, includes obscure + very long
  `${RAW}/dolph/dictionary/master/enable1.txt`,          // ~172k, curated word-game list
]
const COMMON = `${RAW}/first20hours/google-10000-english/master/google-10000-english-no-swears.txt`
const LANGS = ['es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ro', 'tr', 'id']
const langUrl = (k) => `${RAW}/hermitdave/FrequencyWords/master/content/2018/${k}/${k}_50k.txt`

// frequency lists are "word count" per line; plain lists are one word per line
const words = (text) =>
  text.split('\n').map((l) => fold(l.trim().split(/\s+/)[0] ?? ''))

const get = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.text()
}

const build = (texts) =>
  [...new Set(texts.flatMap(words).filter((w) => /^[a-z]{3,}$/.test(w)))].sort()

const write = async (path, list) => {
  await writeFile(path, list.join('\n'))
  console.log(`${path}: ${list.length}`)
}

const en = build(await Promise.all(EN.map(get)))
await write('data/words.txt', en)

const base = new Set(en)
await write('data/common.txt', build([await get(COMMON)]).filter((w) => base.has(w)))

await mkdir('data/lang', { recursive: true })
for (const k of LANGS) {
  try {
    await write(`data/lang/${k}.txt`, build([await get(langUrl(k))]))
  } catch (e) {
    console.log(`skip ${k}: ${e.message}`)
  }
}
