import fs from 'fs'
let c = fs.readFileSync('data/build-wikidata.mjs', 'utf8')
c = c.replace(/\\\`/g, '`').replace(/\\\$/g, '$')
fs.writeFileSync('data/build-wikidata.mjs', c)
console.log('fixed')
