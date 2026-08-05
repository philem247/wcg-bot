// Trivia race. Bot posts a question, everyone answers, first correct takes the
// point and the game advances immediately.
//
// Race rather than survival because in a WhatsApp group every answer is public
// the moment it is sent — any format where players answer the same question
// independently is trivially copied. A race is immune: being first IS the game.
//
// No Date.now(), no Math.random(). Time arrives via `now`, randomness via
// `random`. Same contract as engine/game.js.
import { shuffle } from './bank.js'

export const QUESTION_COUNT = 10
// 30s to answer, 10s between questions. Deliberately unhurried: players said the
// old 20s/5s felt rushed, and a wider gap also absorbs late answers — submit() is
// a no-op during the gap, so an answer that arrives after its question closed is
// discarded instead of scoring against the NEXT question's options.
export const CLOCK_SECONDS = 30
export const GAP_SECONDS = 10
export const LETTERS = ['A', 'B', 'C', 'D']

const DIGITS = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }

// Only a bare letter or digit counts as an answer. Everything else is chatter
// and must be ignored — people talk in these groups, and a bot that replies to
// every message is unusable.
export function parseAnswer(text) {
  const t = String(text ?? '').trim().toUpperCase()
  if (LETTERS.includes(t)) return t
  return DIGITS[t] ?? null
}

export function createTriviaGame({ questions, category, clockSeconds = CLOCK_SECONDS, gapSeconds = GAP_SECONDS, now = 0, random = () => 0.5 }) {
  const clockMs = clockSeconds * 1000
  const gapMs = gapSeconds * 1000
  const scores = new Map()      // player -> points
  const scoredAt = new Map()    // player -> ms of their first correct answer, for tie-breaks

  let state = 'playing'
  let phase = 'idle'            // 'idle' | 'asking' | 'gap'
  let index = -1                // index of the question currently being asked
  let current = null            // { id, q, options, correctLetter, correctText }
  let deadline = 0
  let gapEnd = 0                // when the gap phase ends
  let answered = new Set()      // players who have used their one attempt this question

  function build(q) {
    const texts = shuffle([q.correct, ...q.wrong], random)
    return {
      id: q.id,
      q: q.q,
      options: texts.map((text, i) => ({ letter: LETTERS[i], text })),
      correctLetter: LETTERS[texts.indexOf(q.correct)],
      correctText: q.correct,
    }
  }

  function standings() {
    return Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score || scoredAt.get(a.player) - scoredAt.get(b.player))
  }

  function finish() {
    state = 'over'
    return [{ type: 'trivia_over', category, total: questions.length, standings: standings() }]
  }

  // Emit an answer reveal event and enter gap state. The next question
  // (or game-over) fires when tick() sees the gap has elapsed.
  function revealAndGap(at, result) {
    phase = 'gap'
    gapEnd = at + gapMs
    return [{ type: 'trivia_answer', category, index: index + 1, total: questions.length, ...result }]
  }

  // Move to the next question.
  function advanceToQuestion(at) {
    index++
    if (index >= questions.length) return finish()
    current = build(questions[index])
    deadline = at + clockMs
    answered = new Set()
    phase = 'asking'
    return [{
      type: 'trivia_question',
      index: index + 1,
      total: questions.length,
      category,
      question: current.q,
      options: current.options,
      endsAt: deadline,
      clockSeconds,
    }]
  }

  return {
    get state() {
      return state
    },

    tick(at) {
      if (state === 'over') return []

      // First tick: start the first question immediately.
      if (phase === 'idle') return advanceToQuestion(at)

      // In the gap between questions: wait for the gap to elapse.
      if (phase === 'gap') {
        if (at < gapEnd) return []
        return advanceToQuestion(at)
      }

      // Asking phase: check if the clock expired.
      if (at < deadline) return []
      const result = { outcome: 'timeout', letter: current.correctLetter, answer: current.correctText }

      // Last question: reveal answer, then finish after the gap.
      // Emit both the answer reveal now. The gap tick will emit trivia_over.
      if (index + 1 >= questions.length) {
        phase = 'gap'
        gapEnd = at + gapMs
        return [{ type: 'trivia_answer', category, index: index + 1, total: questions.length, ...result }]
      }

      return revealAndGap(at, result)
    },

    submit(player, text, at) {
      if (state === 'over' || phase !== 'asking' || !current) return []
      const letter = parseAnswer(text)
      if (!letter) return []            // chatter: does not consume the attempt
      if (answered.has(player)) return [] // one attempt each, right or wrong
      answered.add(player)
      if (letter !== current.correctLetter) return []
      scores.set(player, (scores.get(player) ?? 0) + 1)
      if (!scoredAt.has(player)) scoredAt.set(player, at)

      const result = { outcome: 'correct', player, letter, answer: current.correctText }

      // Last question: reveal answer, the gap tick will emit trivia_over.
      if (index + 1 >= questions.length) {
        phase = 'gap'
        gapEnd = at + gapMs
        return [{ type: 'trivia_answer', category, index: index + 1, total: questions.length, ...result }]
      }

      return revealAndGap(at, result)
    },

    // No lobby: answering is joining. Present so the router's existing
    // bare-message path works unchanged.
    join() {
      return []
    },

    end() {
      if (state === 'over') return []
      state = 'over'
      return [{ type: 'trivia_terminated' }]
    },
  }
}
