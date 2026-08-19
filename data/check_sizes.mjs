import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

async function main() {
  const files = await readdir('./data')
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('trivia') && f !== 'apis.json' && f !== 'pidgin-words.json')
  
  // also read trivia.json to see the final merged counts
  const finalTrivia = JSON.parse(await readFile('./data/trivia.json', 'utf8'))
  
  for (const cat of Object.keys(finalTrivia.categories)) {
    const qs = finalTrivia.categories[cat]
    const bonusQs = qs.filter(q => q.q.includes('[Bonus'))
    const organicQs = qs.length - bonusQs.length
    
    console.log(`[${cat}] Total: ${qs.length} | Organic: ${organicQs} | Bonus: ${bonusQs.length}`)
  }
}
main()
