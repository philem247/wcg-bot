// Two more "eliminate by type" fixes for the non-football bank (2026-10):
//
//   - Tech: "Which technology is described as: <a programming language>?"
//     offered Python next to Fedora and DALL-E, and the reverse question
//     offered a language's description next to an OS's and a chip's. Decoys
//     now come from the same kind of technology (language for a language,
//     database for a database).
//   - Years: "When was X released?" -> 1991 next to 2010 / 1972 / 2003.
//     Knowing the decade was enough. When a decoy is more than ten years
//     out, all three are redrawn within six years of the answer.
//
// Seeded per question id, so reruns change nothing. Football has its own
// fixers and is left alone.
// Run: node data/fix-decoy-types.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { seededRandom } from './football/link-templates.mjs'
import { shuffle } from '../engine/bank.js'

const PATH = 'data/trivia.json'
const SKIP = new Set(['football'])
const THIS_YEAR = 2026

const KINDS = {
  language: ['Python', 'JavaScript', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Go', 'Rust', 'TypeScript', 'Kotlin', 'Perl', 'Scala', 'Erlang', 'Clojure', 'Dart', 'Objective-C', 'Lua', 'R', 'Julia', 'Elixir', 'F#', 'Fortran', 'COBOL', 'Ada', 'Prolog', 'Scheme', 'Visual Basic', 'Zig', 'Nim', 'Groovy', 'OCaml', 'Smalltalk', 'Solidity', 'Bash', 'PowerShell', 'MATLAB', 'Elm', 'CoffeeScript', 'D', 'Delphi'],
  framework: ['React', 'Vue.js', 'Node.js', 'Django', 'Flask', 'Spring Boot', 'Ruby on Rails', 'Laravel', 'Express.js', 'Svelte', 'Next.js', 'jQuery', 'Bootstrap', 'Tailwind CSS', 'Flutter', 'Ionic', 'ASP.NET', 'FastAPI', 'Gatsby', 'Ember.js', 'NestJS', 'SwiftUI', 'Jetpack Compose', 'Pandas', 'NumPy'],
  ai: ['TensorFlow', 'PyTorch', 'Jupyter', 'ChatGPT', 'GPT-3', 'BERT', 'Keras', 'Scikit-learn', 'LangChain', 'Stable Diffusion', 'AlphaGo', 'OpenCV', 'Claude', 'DALL-E', 'XGBoost', 'spaCy', 'IBM Watson'],
  database: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle Database', 'SQLite', 'Cassandra', 'Neo4j', 'DynamoDB', 'MariaDB', 'CouchDB', 'InfluxDB', 'Snowflake', 'CockroachDB', 'Memcached'],
  cloud: ['AWS', 'Azure', 'Firebase', 'Supabase', 'DigitalOcean', 'Heroku', 'Cloudflare', 'Vercel', 'Netlify', 'Databricks', 'Apache Kafka'],
  os: ['Windows', 'macOS', 'Android', 'iOS', 'FreeBSD', 'Ubuntu', 'Debian', 'Fedora', 'Chrome OS', 'Unix', 'OpenBSD', 'Solaris', 'Windows NT', 'CentOS'],
  devtool: ['Docker', 'Kubernetes', 'Git', 'Subversion', 'Mercurial', 'GitHub', 'GitLab', 'Jenkins', 'Visual Studio Code', 'Vim', 'Emacs', 'IntelliJ IDEA', 'Postman', 'Terraform', 'Ansible', 'Grafana', 'Prometheus', 'npm', 'Webpack', 'Puppet', 'Chef', 'ESLint', 'Babel', 'Selenium', 'Datadog'],
  standard: ['GraphQL', 'REST', 'JSON', 'XML', 'HTML', 'CSS', 'WebAssembly', 'TCP/IP', 'HTTP', 'DNS', 'SMTP', 'FTP', 'SSH', 'Bluetooth', 'gRPC', 'OAuth', 'WebRTC', 'MQTT', 'Ethernet', 'USB', 'IPv6', 'JWT', 'Thunderbolt'],
  hardware: ['ARM Architecture', 'x86', 'RISC-V', 'CUDA', 'Apple M1', 'Raspberry Pi', 'Intel 4004'],
  app: ['Salesforce', 'Slack', 'Zoom', 'Shopify', 'Stripe', 'Figma', 'Notion', 'Discord', 'Spotify', 'Adobe Photoshop', 'Unity', 'Unreal Engine', 'Twilio', 'Trello'],
}
// Small kinds borrow from the nearest one rather than from anything.
const NEAR = { hardware: 'standard', cloud: 'devtool', app: 'cloud', ai: 'framework', os: 'devtool', database: 'cloud', framework: 'language', language: 'framework', devtool: 'cloud', standard: 'hardware' }
const kindOf = new Map(Object.entries(KINDS).flatMap(([k, names]) => names.map((n) => [n, k])))

const seedOf = (id) => [...String(id)].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7)
const trivia = JSON.parse(readFileSync(PATH, 'utf8'))
let techFixed = 0
let yearsFixed = 0

// ── Tech kinds ────────────────────────────────────────────────────────
const tech = trivia.categories.tech ?? []
// Every option was doubled ("marquee/marquee").
for (const q of tech) {
  if (q.id === '787df835-6c83-4fef-ab33-afc76bbd1abe' && q.correct === 'marquee/marquee') {
    Object.assign(q, { q: 'In HTML, which non-standard tag was used to make elements scroll across the viewport?', correct: 'marquee', wrong: ['scroll', 'blink', 'slide'] })
    techFixed++
  }
}
const DESCRIBED = /^Which technology is described as: /
const USED_FOR = /^What is (.+) commonly used for or described as\?$/
const descOf = new Map()
for (const q of tech) {
  const m = q.q.match(USED_FOR)
  if (m) descOf.set(m[1], q.correct)
}
const nameOfDesc = new Map([...descOf].map(([n, d]) => [d, n]))

const GENERIC = new Set(['a', 'an', 'the', 'and', 'of', 'for', 'to', 'in', 'on', 'by', 'with', 'used', 'that', 'is', 'as', 'its', 'open', 'source', 'free'])
const trigrams = (s) => {
  const w = s.toLowerCase().split(/[^a-z0-9+#]+/).filter((x) => x && !GENERIC.has(x))
  return new Set(w.slice(2).map((_, i) => w.slice(i, i + 3).join(' ')))
}
const overlaps = (a, b) => { const tb = trigrams(b); return [...trigrams(a)].some((t) => tb.has(t)) }

function sameKindDecoys(q, name, toOption) {
  const kind = kindOf.get(name)
  if (!kind) return null
  const optionKind = (o) => kindOf.get(toOption === 'name' ? o : nameOfDesc.get(o))
  if (q.wrong.every((w) => optionKind(w) === kind)) return null
  const random = seededRandom(seedOf(q.id))
  const pick = (k) => shuffle(KINDS[k].filter((n) => n !== name && descOf.has(n)), random)
  // Two descriptions sharing a three-word run ("high-level, general-purpose
  // programming") could both fit the question, so they never meet.
  const own = descOf.get(name)
  const pool = [...pick(kind), ...pick(NEAR[kind])].filter((n) => !overlaps(descOf.get(n), own))
  const decoys = []
  for (const n of pool) {
    const o = toOption === 'name' ? n : descOf.get(n)
    if (decoys.length < 3 && !decoys.includes(o) && o !== q.correct) decoys.push(o)
  }
  return decoys.length === 3 ? decoys : null
}

for (const q of tech) {
  let decoys = null
  if (DESCRIBED.test(q.q)) decoys = sameKindDecoys(q, q.correct, 'name')
  else if (USED_FOR.test(q.q)) decoys = sameKindDecoys(q, q.q.match(USED_FOR)[1], 'desc')
  if (decoys) { q.wrong = decoys; techFixed++ }
}

// ── Years ─────────────────────────────────────────────────────────────
const isYear = (s) => /^\d{4}$/.test(s)
for (const [cat, questions] of Object.entries(trivia.categories)) {
  if (SKIP.has(cat)) continue
  for (const q of questions) {
    if (!isYear(q.correct) || !q.wrong.every(isYear)) continue
    const y = Number(q.correct)
    if (Math.max(...q.wrong.map((w) => Math.abs(Number(w) - y))) <= 10) continue
    const random = seededRandom(seedOf(q.id))
    // One close (1-2 away) so it takes a real double take, two a bit further.
    const offsets = [...shuffle([-2, -1, 1, 2], random), ...shuffle([-6, -5, -4, -3, 3, 4, 5, 6], random)]
    const picked = []
    for (const o of [offsets[0], ...offsets.slice(4)]) {
      const c = y + o
      if (picked.length < 3 && c <= THIS_YEAR) picked.push(String(c))
    }
    q.wrong = shuffle(picked, random)
    yearsFixed++
  }
}

writeFileSync(PATH, JSON.stringify(trivia, null, 2) + '\n')
console.log(`Same-kind tech decoys on ${techFixed} questions, tighter year decoys on ${yearsFixed}.`)
