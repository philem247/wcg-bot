const LIGATURES = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', ı: 'i', ł: 'l', ð: 'd', þ: 'th' }

// WhatsApp injects invisible Unicode characters (zero-width spaces, bidi marks,
// soft hyphens) into message text. These survive case-folding and accent
// stripping but fail the /^[a-z]+$/ gate in validate.js, causing every word to
// be rejected as "not in my list". Strip them before any other processing.
const INVISIBLE_RE = /[\u200B\u200C\u200D\u00AD\uFEFF\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069]/g

export const fold = (s) =>
  s.replace(INVISIBLE_RE, '')
    .toLowerCase()
    .replace(/[ßæœøıłðþ]/g, (c) => LIGATURES[c])
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

export const normalizeInput = (s) => fold(String(s).trim())

export const isWord = (s) => /^[a-z]{3,}$/.test(fold(s))
