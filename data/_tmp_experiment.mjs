import { readFileSync } from 'node:fs'
import { WEIGHTS, TARGET_TOTAL, MAX_TEMPLATE_SHARE, weightPool, enforceTemplateShare, scaleToWeightRatio } from './build-football.mjs'

const byTag = JSON.parse(readFileSync(process.env.DUMP_BYTAG, 'utf8'))
for (const k of Object.keys(byTag)) console.log(k, byTag[k].length)

const stats = (pool, label) => {
  const byLeague = {}
  const byTemplate = {}
  for (const q of pool) {
    byLeague[q.league] = (byLeague[q.league] || 0) + 1
    byTemplate[q.template] = (byTemplate[q.template] || 0) + 1
  }
  console.log(`--- ${label} --- total ${pool.length}`)
  console.log('league %', Object.fromEntries(Object.entries(byLeague).map(([k, v]) => [k, (v / pool.length * 100).toFixed(1)])))
  console.log('template %', Object.fromEntries(Object.entries(byTemplate).map(([k, v]) => [k, (v / pool.length * 100).toFixed(1)])))
}

const random = Math.random
const weighted = weightPool(byTag, TARGET_TOTAL, random)
stats(weighted, 'weightPool output')

const afterTemplate = enforceTemplateShare(weighted, random)
stats(afterTemplate, 'after enforceTemplateShare')

const afterRatio = scaleToWeightRatio(afterTemplate)
stats(afterRatio, 'after scaleToWeightRatio (2nd pass)')
