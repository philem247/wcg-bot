import { makeQuestion } from '../football/templates.mjs'

export function flagQuestions(rows, { random }) {
  const pool = [...new Set(rows.map((r) => r.countryLabel).filter(Boolean))]
  const out = []
  for (const r of rows) {
    if (!r.flag || !r.countryLabel) continue
    const question = makeQuestion({
      q: `Which country is represented by the ${r.flag} flag?`,
      correct: r.countryLabel,
      pool,
      league: 'world',
      random,
      template: 'flag'
    })
    if (question) out.push(question)
  }
  return out
}

export function capitalQuestions(rows, { random }) {
  const pool = [...new Set(rows.map((r) => r.capitalLabel).filter(Boolean))]
  const out = []
  for (const r of rows) {
    if (!r.capitalLabel || !r.countryLabel) continue
    const question = makeQuestion({
      q: `What is the capital city of ${r.countryLabel}?`,
      correct: r.capitalLabel,
      pool,
      league: 'world',
      random,
      template: 'capital'
    })
    if (question) out.push(question)
  }
  return out
}

export function currencyQuestions(rows, { random }) {
  const currencyPool = [...new Set(rows.map((r) => r.currencyLabel).filter(Boolean))]
  const countryPool = [...new Set(rows.map((r) => r.countryLabel).filter(Boolean))]
  const out = []
  for (const r of rows) {
    if (!r.currencyLabel || !r.countryLabel) continue
    const q1 = makeQuestion({
      q: `What is the official currency of ${r.countryLabel}?`,
      correct: r.currencyLabel,
      pool: currencyPool,
      league: 'world',
      random,
      template: 'currency'
    })
    if (q1) out.push(q1)

    // Using currency as the subject might yield multiple correct answers (e.g., Euro),
    // so we skip the reverse question for currencies.
  }
  return out
}

export function nigerianStateQuestions(rows, { random }) {
  const capitalPool = [...new Set(rows.map((r) => r.capitalLabel).filter(Boolean))]
  const statePool = [...new Set(rows.map((r) => `${r.stateLabel} State`).filter(Boolean))]
  const out = []
  for (const r of rows) {
    if (!r.capitalLabel || !r.stateLabel) continue
    const q1 = makeQuestion({
      q: `What is the capital of ${r.stateLabel} State?`,
      correct: r.capitalLabel,
      pool: capitalPool,
      league: 'world',
      random,
      template: 'state_capital'
    })
    if (q1) out.push(q1)

    const q2 = makeQuestion({
      q: `${r.capitalLabel} is the capital city of which Nigerian state?`,
      correct: `${r.stateLabel} State`,
      pool: statePool,
      league: 'world',
      random,
      template: 'capital_state'
    })
    if (q2) out.push(q2)
  }
  return out
}
