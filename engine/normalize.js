const LIGATURES = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', ı: 'i', ł: 'l', ð: 'd', þ: 'th' }

export const fold = (s) =>
  s.toLowerCase()
    .replace(/[ßæœøıłðþ]/g, (c) => LIGATURES[c])
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

export const normalizeInput = (s) => fold(String(s).trim())

export const isWord = (s) => /^[a-z]{3,}$/.test(fold(s))
