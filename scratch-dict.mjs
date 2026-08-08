import * as cheerio from 'cheerio'
import fs from 'fs'

const html = fs.readFileSync('C:/Users/hp/.gemini/antigravity-ide/brain/0db0a409-3aff-4664-b97d-48c73072a2c0/.system_generated/steps/649/content.md', 'utf8')
const $ = cheerio.load(html)
$('a').each((i, el) => {
  const text = $(el).text().trim()
  const href = $(el).attr('href') || ''
  if (text.length > 0 && text.length < 30) {
    console.log(href.substring(0, 50), text)
  }
})
