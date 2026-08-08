export const queries = {
  flags: `
    SELECT ?countryLabel ?flag WHERE {
      ?country wdt:P31 wd:Q6256; wdt:P487 ?flag.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `,
  capitals: `
    SELECT ?countryLabel ?capitalLabel WHERE {
      ?country wdt:P31 wd:Q6256; wdt:P36 ?capital.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `,
  currencies: `
    SELECT ?countryLabel ?currencyLabel WHERE {
      ?country wdt:P31 wd:Q6256; wdt:P38 ?currency.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `,
  nigerianStates: `
    SELECT ?stateLabel ?capitalLabel WHERE {
      ?state wdt:P31 wd:Q10981128; wdt:P36 ?capital.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `
}
