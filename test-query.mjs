import { runQuery } from './data/football/sparql.mjs'
runQuery('SELECT ?foodLabel WHERE { ?food wdt:P31/wdt:P279* wd:Q2095; wdt:P495 wd:Q1033. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }').then(console.log)
