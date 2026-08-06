# Third-party content licenses

## Trivia questions — `data/trivia.json`

Questions sourced from [Open Trivia DB](https://opentdb.com), licensed
**CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/).

Regenerate with `npm run build:trivia`.

## Wikidata

Football questions are generated from Wikidata, released under CC0 1.0
(public domain dedication). https://www.wikidata.org

## Fantasy Premier League

FPL questions are generated from the public, unauthenticated
`https://fantasy.premierleague.com/api/bootstrap-static/` endpoint. Fantasy
Premier League is a product of the Premier League; this project is not
affiliated with or endorsed by it.

Questions are season-stamped so they remain factually correct after the
underlying data rolls over.

## Dictionary — `data/words.txt`, `data/common.txt`, `data/lang/`

Built from public-domain word lists. See `data/build.mjs` for exact sources.
