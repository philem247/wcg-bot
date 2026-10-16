// Checks hand-written hard packs before they go into the bank.
// Run: node data/hard/check.mjs [category ...]   (default: every pack)
// Exits 1 on any error; warnings are worth a look but don't fail.
import { readFileSync, readdirSync } from 'node:fs'
import { questionId } from '../build-trivia.mjs'

const MIN = 50
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'to', 'for', 'is', 'was', 'by', 'at', 'de', 'la', 'le', 'el', 'with', 'from', 'or'])
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const SPLIT = /\s*(?:,(?!\d{3})|&|\band\b|\/)\s*/
const items = (s) => s.split(SPLIT).filter(Boolean).length

export async function loadPacks(only = []) {
  const dir = new URL('.', import.meta.url)
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'check.mjs')
  const packs = []
  for (const f of files) {
    const { PACK } = await import(new URL(f, dir))
    if (!only.length || only.includes(PACK.category)) packs.push({ file: f, ...PACK })
  }
  return packs
}

export function checkPack(pack, bank) {
  const errors = []
  const warnings = []
  const existing = new Set((bank.categories[pack.category] ?? []).filter((q) => !q.hard).map((q) => norm(q.q)))
  if (!bank.categories[pack.category]) errors.push(`unknown category ${pack.category}`)
  if (pack.questions.length < MIN) errors.push(`only ${pack.questions.length} questions (want ${MIN}+)`)
  const seen = new Set()
  for (const q of pack.questions) {
    const tag = `"${q.q.slice(0, 70)}"`
    if (!/^hard-[a-z0-9-]+$/.test(q.template)) errors.push(`${tag}: template must be hard-<theme>`)
    if (!Array.isArray(q.wrong) || q.wrong.length !== 3) { errors.push(`${tag}: needs exactly 3 wrong options`); continue }
    const opts = [q.correct, ...q.wrong].map(norm)
    if (new Set(opts).size !== 4) errors.push(`${tag}: duplicate options`)
    if (opts.some((o) => !o)) errors.push(`${tag}: empty option`)
    const id = questionId(q.q)
    if (seen.has(id)) errors.push(`${tag}: duplicate question in pack`)
    seen.add(id)
    if (existing.has(norm(q.q))) errors.push(`${tag}: already in the bank`)
    // The answer, or a distinctive word of it, in the question.
    const qn = ` ${norm(q.q)} `
    const leak = norm(q.correct).split(' ').filter((w) => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w))
      .filter((w) => qn.includes(` ${w} `) && !q.wrong.some((x) => ` ${norm(x)} `.includes(` ${w} `)))
    if (leak.length) warnings.push(`${tag}: question contains answer word(s) ${leak.join(', ')} that no decoy shares`)
    // Shape tells: the answer is the only list, or much longer than every decoy.
    const ci = items(q.correct)
    const wi = Math.max(...q.wrong.map(items))
    if (ci > wi) errors.push(`${tag}: answer lists ${ci} items, decoys at most ${wi}`)
    const cl = q.correct.length
    const wl = Math.max(...q.wrong.map((w) => w.length))
    if (cl >= 1.6 * wl && cl - wl >= 12) errors.push(`${tag}: answer is much longer than every decoy`)
    if (cl > 25 && cl > 1.35 * Math.max(...q.wrong.map((w) => w.length))) warnings.push(`${tag}: answer is the longest option by a margin`)
  }
  const byTemplate = {}
  for (const q of pack.questions) byTemplate[q.template] = (byTemplate[q.template] ?? 0) + 1
  const top = Math.max(...Object.values(byTemplate))
  if (top > pack.questions.length * 0.4) warnings.push(`one template holds ${top}/${pack.questions.length}; spread themes wider`)
  return { errors, warnings, byTemplate }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bank = JSON.parse(readFileSync(new URL('../trivia.json', import.meta.url), 'utf8'))
  let failed = false
  for (const pack of await loadPacks(process.argv.slice(2))) {
    const { errors, warnings, byTemplate } = checkPack(pack, bank)
    console.log(`\n${pack.category} (${pack.file}): ${pack.questions.length} questions, templates ${JSON.stringify(byTemplate)}`)
    for (const e of errors) console.log(`  ERROR ${e}`)
    for (const w of warnings) console.log(`  warn  ${w}`)
    if (errors.length) failed = true
  }
  process.exit(failed ? 1 : 0)
}
