import { normalizeInput } from './normalize.js'

export function validate(word, { lastLetter, minLength = 3, used = new Set(), dict } = {}) {
  // Fail closed: dict is required
  if (!dict || typeof dict.has !== 'function') {
    throw new Error('validate requires dict with has(word) method')
  }

  // Normalize input; non-string or empty -> not_in_list
  let normalized
  try {
    normalized = normalizeInput(word)
  } catch {
    return { ok: false, reason: 'not_in_list' }
  }

  if (!normalized || typeof normalized !== 'string' || !/^[a-z]+$/.test(normalized)) {
    return { ok: false, reason: 'not_in_list' }
  }

  // Check starting letter (if lastLetter is provided)
  // Normalize lastLetter first (fold accents, uppercase, etc.)
  let normalizedLastLetter = lastLetter
  if (lastLetter != null) {
    normalizedLastLetter = normalizeInput(lastLetter)[0] || lastLetter
    if (normalized[0] !== normalizedLastLetter) {
      return { ok: false, reason: 'not_starting_with' }
    }
  }

  // Check length (minLength is a floor)
  if (normalized.length < minLength) {
    return { ok: false, reason: 'length_limit' }
  }

  // Check already used
  if (used.has(normalized)) {
    return { ok: false, reason: 'already_used' }
  }

  // Check in dictionary
  if (!dict.has(normalized)) {
    return { ok: false, reason: 'not_in_list' }
  }

  return { ok: true, word: normalized }
}
