import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

function qId(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
}

// Ensure 4 distinct options, no duplicates, accurate metadata
export function makeQ(q, correct, wrong, league = 'pl', template = 'curated') {
  const uniqueWrong = [...new Set(wrong.filter(w => w.toLowerCase() !== correct.toLowerCase()))].slice(0, 3);
  if (uniqueWrong.length < 3) {
    throw new Error(`Question "${q}" has fewer than 3 wrong answers!`);
  }
  return {
    id: qId(q + '|' + correct),
    q: q.trim(),
    correct: correct.trim(),
    wrong: uniqueWrong.map(w => w.trim()),
    league,
    template,
  };
}

console.log('Building rich football and FPL trivia bank...');
