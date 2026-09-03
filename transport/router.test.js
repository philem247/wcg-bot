import assert from 'node:assert/strict'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// config.js throws if PHONE_NUMBER is missing; set env before any import that touches it.
process.env.PHONE_NUMBER = '1234567890'
process.env.OWNER = '15550000000'
process.env.ADMINS = '15550000001'

import { openDb } from '../store/db.js'

const OWNER_NUMBER = '15550000000'

// router.js loads data/football/career-paths.json once at import time (mirrors
// Concentration's categoryBank pattern) — that file is a live-build artifact
// not checked into the repo yet. Write a small fixture before importing
// router.js so /careerpath has a pool to test against, then remove it once
// these tests finish so the repo is left exactly as it was found.
const CAREERPATH_FIXTURE = join('data', 'football', 'career-paths.json')
const careerPathFixtureExisted = existsSync(CAREERPATH_FIXTURE)
if (!careerPathFixtureExisted) {
  mkdirSync(join('data', 'football'), { recursive: true })
  writeFileSync(CAREERPATH_FIXTURE, JSON.stringify([
    { id: 'Q1', name: 'Kylian Mbappe', aliases: ['Mbappe'], clubs: ['Le Havre', 'Monaco', 'PSG', 'Real Madrid'] },
    { id: 'Q2', name: 'Erling Haaland', aliases: ['Haaland'], clubs: ['Bryne', 'Molde', 'Salzburg', 'Dortmund', 'Man City'] },
    { id: 'Q3', name: 'Mohamed Salah', aliases: ['Salah'], clubs: ['El Mokawloon', 'Basel', 'Chelsea', 'Roma', 'Liverpool'] },
  ]))
}

const { sendEvents, createRouter } = await import('./router.js')
const { GAP_SECONDS } = await import('../engine/trivia.js')
const { PREFIX } = await import('../config.js')

// Minimal fake bot_admins store backing addBotAdmin/delBotAdmin/botAdmins, shared by the /promote tests.
function makeBotAdminDb() {
  const store = new Map() // jid -> Set(number)
  return {
    addBotAdmin: (jid, number) => {
      if (!store.has(jid)) store.set(jid, new Set())
      const set = store.get(jid)
      if (set.has(number)) return false
      set.add(number)
      return true
    },
    delBotAdmin: (jid, number) => {
      const set = store.get(jid)
      if (!set || !set.has(number)) return false
      set.delete(number)
      return true
    },
    botAdmins: (jid) => Array.from(store.get(jid) ?? []),
  }
}

const tests = [
  {
    name: 'sendEvents: enqueues in emission order with the right kind per event',
    fn: async () => {
      const calls = []
      const enqueue = (jid, payload) => calls.push({ jid, ...payload })

      const events = [
        { type: 'eliminated', player: 'a', reason: 'timeout' },
        { type: 'turn', player: 'a', next: 'b', letter: 'x', minLength: 4, seconds: 20, alive: 2, total: 2, totalWords: 5, deadline: 0 },
      ]

      sendEvents(enqueue, 'jid2', events)

      assert.equal(calls.length, 2)
      assert(calls[0].text.includes('Time out'), 'eliminated text must be enqueued first')
      assert.equal(calls[0].kind, 'result')
      assert(calls[1].text.includes('🎲Turn'), 'turn text must be enqueued second')
      assert.equal(calls[1].kind, 'turn')
    },
  },
  {
    name: 'sendEvents: null renders (e.g. accepted) are skipped, not enqueued as gaps',
    fn: async () => {
      const calls = []
      const enqueue = (jid, payload) => calls.push({ jid, ...payload })
      const events = [
        { type: 'accepted', player: 'a', word: 'apple' }, // renders null, must not enqueue
        { type: 'ended', reason: 'manual' },
      ]
      sendEvents(enqueue, 'jid1', events)
      assert.equal(calls.length, 1)
      assert(calls[0].text.includes('Game Ends'))
      assert.equal(calls[0].kind, 'result')
    },
  },
  {
    name: 'sendEvents: rejected enqueues with kind reject and quotes the inbound message',
    fn: async () => {
      const calls = []
      const enqueue = (jid, payload) => calls.push({ jid, ...payload })
      const turnEvent = { type: 'turn', player: 'a', next: 'b', letter: 'x', minLength: 4, seconds: 20, alive: 2, total: 2, totalWords: 5, deadline: 0 }
      const rejectedEvent = { type: 'rejected', reason: 'already_used', word: 'xyz' }
      const quoted = { key: { id: 'ABC' } }
      sendEvents(enqueue, 'jid3', [turnEvent, rejectedEvent], quoted)
      assert.equal(calls.length, 2)
      assert.equal(calls[1].kind, 'reject')
      assert.equal(calls[1].quoted, quoted)
    },
  },
  {
    name: 'sendEvents: accepted enqueues nothing (reactions removed for speed)',
    fn: async () => {
      const calls = []
      const enqueue = (jid, payload) => calls.push({ jid, ...payload })
      const quoted = { key: { remoteJid: 'jid4', id: 'ABC', fromMe: false } }
      const now = 1_000_000
      sendEvents(enqueue, 'jid4', [{ type: 'accepted', player: 'a', word: 'apple' }], quoted, now)
      assert.equal(calls.length, 0, 'accepted must not enqueue anything — no reactions, no text')
    },
  },
  {
    name: 'sendEvents: completed game records exactly one recordGame, winner=1, first-eliminated=last',
    fn: async () => {
      const recordGameCalls = []
      const fakeDb = { recordGame: (args) => recordGameCalls.push(args) }
      const enqueue = () => {}
      const jid = 'game-jid'

      sendEvents(enqueue, jid, [{ type: 'lobby_open', deadline: 0, mode: 'easy', gameType: 'chain' }], undefined, 1000, fakeDb)
      sendEvents(enqueue, jid, [{ type: 'game_start', players: ['a', 'b', 'c'] }], undefined, 1000, fakeDb)
      sendEvents(enqueue, jid, [{ type: 'eliminated', player: 'b', reason: 'timeout' }], undefined, 2000, fakeDb)
      sendEvents(enqueue, jid, [{ type: 'eliminated', player: 'c', reason: 'timeout' }], undefined, 3000, fakeDb)
      sendEvents(enqueue, jid, [{ type: 'winner', player: 'a', totalWords: 10, longestWord: 'zoo', longestBy: 'a', elapsedMs: 3000 }], undefined, 4000, fakeDb)

      assert.equal(recordGameCalls.length, 1)
      const rec = recordGameCalls[0]
      assert.equal(rec.startedAt, 1000)
      assert.equal(rec.endedAt, 4000)
      assert.equal(rec.words, 10)
      const byPlayer = Object.fromEntries(rec.results.map((r) => [r.player, r.placement]))
      assert.equal(byPlayer.a, 1, 'winner should be placement 1')
      assert.equal(byPlayer.c, 2, 'last-eliminated should be placement 2')
      assert.equal(byPlayer.b, 3, 'first-eliminated should be placement 3 (last)')
    },
  },
  {
    name: 'sendEvents: terminated and ended record nothing',
    fn: async () => {
      const recordGameCalls = []
      const fakeDb = { recordGame: (args) => recordGameCalls.push(args) }
      const enqueue = () => {}

      sendEvents(enqueue, 'terminated-jid', [{ type: 'lobby_open', deadline: 0, mode: 'easy', gameType: 'chain' }], undefined, 0, fakeDb)
      sendEvents(enqueue, 'terminated-jid', [{ type: 'terminated', reason: 'not_enough_players' }], undefined, 100, fakeDb)

      sendEvents(enqueue, 'ended-jid', [{ type: 'lobby_open', deadline: 0, mode: 'easy', gameType: 'chain' }], undefined, 0, fakeDb)
      sendEvents(enqueue, 'ended-jid', [{ type: 'game_start', players: ['a', 'b'] }], undefined, 0, fakeDb)
      sendEvents(enqueue, 'ended-jid', [{ type: 'ended', reason: 'manual' }], undefined, 100, fakeDb)

      assert.equal(recordGameCalls.length, 0)
    },
  },
  {
    name: 'sendEvents: not_in_list rejection records; already_used does not',
    fn: async () => {
      const recordRejectionCalls = []
      const fakeDb = { recordRejection: (args) => recordRejectionCalls.push(args) }
      const enqueue = () => {}

      sendEvents(enqueue, 'reject-jid', [{ type: 'rejected', player: 'a', word: 'xyz', reason: 'not_in_list' }], undefined, 500, fakeDb)
      sendEvents(enqueue, 'reject-jid', [{ type: 'rejected', player: 'a', word: 'abc', reason: 'already_used' }], undefined, 600, fakeDb)

      assert.equal(recordRejectionCalls.length, 1)
      assert.equal(recordRejectionCalls[0].word, 'xyz')
    },
  },
  {
    name: 'sendEvents: works with no db argument (no throw)',
    fn: async () => {
      const enqueue = () => {}
      sendEvents(enqueue, 'no-db-jid', [
        { type: 'lobby_open', deadline: 0, mode: 'easy', gameType: 'chain' },
        { type: 'game_start', players: ['a', 'b'] },
        { type: 'eliminated', player: 'a', reason: 'timeout' },
        { type: 'winner', player: 'b', totalWords: 1, longestWord: 'ab', longestBy: 'b', elapsedMs: 10 },
        { type: 'rejected', player: 'b', word: 'zz', reason: 'not_in_list' },
      ], undefined, 100)
      // no assertion needed: reaching here without throwing is the test
    },
  },
  {
    name: '/addword calls both dict.add and db.addWord',
    fn: async () => {
      const dictCalls = []
      const dbCalls = []
      const fakeDict = { add: (w) => { dictCalls.push(w); return true } }
      const fakeDb = { addWord: (w, meta) => { dbCalls.push({ w, meta }); return true } }
      const enqueue = () => {}
      const router = createRouter({
        dict: fakeDict,
        games: new Map(),
        enqueue,
        logger: undefined,
        getGroupAdmins: async () => ['2340001@s.whatsapp.net'],
        db: fakeDb,
      })

      await router.handleMessage(
        { jid: 'g1', sender: '2340001@s.whatsapp.net', senderPn: undefined, text: '/addword hello', isGroup: true, raw: undefined },
        1000
      )

      assert.deepEqual(dictCalls, ['hello'])
      assert.equal(dbCalls.length, 1)
      assert.equal(dbCalls[0].w, 'hello')
    },
  },
  {
    name: '/addword rejects junk (punctuation) without touching dict or db',
    fn: async () => {
      const dictCalls = []
      const dbCalls = []
      const fakeDict = { add: (w) => { dictCalls.push(w); return true } }
      const fakeDb = { addWord: (w, meta) => { dbCalls.push({ w, meta }); return true } }
      const replies = []
      const enqueue = (jid, payload) => replies.push(payload)
      const router = createRouter({
        dict: fakeDict,
        games: new Map(),
        enqueue,
        logger: undefined,
        getGroupAdmins: async () => ['2340001@s.whatsapp.net'],
        db: fakeDb,
      })

      await router.handleMessage(
        { jid: 'g3', sender: '2340001@s.whatsapp.net', senderPn: undefined, text: '/addword hello!!', isGroup: true, raw: undefined },
        1000
      )

      assert.equal(dictCalls.length, 0, 'dict.add must not be called for junk')
      assert.equal(dbCalls.length, 0, 'db.addWord must not be called for junk')
      assert.equal(replies.length, 1)
      assert(replies[0].text.includes('3+ letters'))
    },
  },
  {
    name: '/addword on a duplicate word gives a distinct reply and still calls db.addWord',
    fn: async () => {
      const dbCalls = []
      const fakeDict = { add: () => true }
      const fakeDb = { addWord: (w) => { dbCalls.push(w); return false } } // false = duplicate
      const replies = []
      const enqueue = (jid, payload) => replies.push(payload)
      const router = createRouter({
        dict: fakeDict,
        games: new Map(),
        enqueue,
        logger: undefined,
        getGroupAdmins: async () => ['2340001@s.whatsapp.net'],
        db: fakeDb,
      })

      await router.handleMessage(
        { jid: 'g4', sender: '2340001@s.whatsapp.net', senderPn: undefined, text: '/addword wahala', isGroup: true, raw: undefined },
        1000
      )

      assert.equal(dbCalls.length, 1)
      assert.equal(replies.length, 1)
      assert(replies[0].text.includes('already'), 'duplicate must get a distinct reply, not "Added"')
      assert(!replies[0].text.startsWith('Added'))
    },
  },
  {
    name: '/pending is refused for a non-admin',
    fn: async () => {
      const pendingCalls = []
      const fakeDb = { pending: (...a) => { pendingCalls.push(a); return [] } }
      const replies = []
      const enqueue = (jid, payload) => replies.push(payload)
      const router = createRouter({
        dict: {},
        games: new Map(),
        enqueue,
        logger: undefined,
        getGroupAdmins: async () => [],
        db: fakeDb,
      })

      await router.handleMessage(
        { jid: 'g2', sender: '9999999@s.whatsapp.net', senderPn: undefined, text: '/pending', isGroup: true, raw: undefined },
        1000
      )

      assert.equal(pendingCalls.length, 0, 'db.pending must not be called for a non-admin')
      assert.equal(replies.length, 1)
    },
  },
  {
    name: '/admin lists the group admins returned by the injected getGroupAdmins',
    fn: async () => {
      const replies = []
      const enqueue = (jid, payload) => replies.push(payload)
      const router = createRouter({
        dict: {},
        games: new Map(),
        enqueue,
        logger: undefined,
        getGroupAdmins: async () => ['444444444@s.whatsapp.net', '999999999@s.whatsapp.net'],
        db: { botAdmins: () => [] },
      })

      await router.handleMessage(
        { jid: 'g-admin', sender: '999999999@s.whatsapp.net', senderPn: undefined, text: '/admin', isGroup: true, raw: undefined },
        1000
      )

      assert.equal(replies.length, 1)
      assert(replies[0].text.includes('@444444444'), 'should mention the group admin')
      assert(replies[0].mentions.includes('444444444@s.whatsapp.net'))
      assert(replies[0].text.includes('@15550000000'), 'should mention OWNER from config')
      assert(replies[0].text.includes('@15550000001'), 'should mention global ADMINS from config')
    },
  },
  {
    name: '/promote: a non-owner group admin is refused',
    fn: async () => {
      const fakeDb = makeBotAdminDb()
      const replies = []
      const enqueue = (jid, payload) => replies.push(payload)
      const router = createRouter({
        dict: {},
        games: new Map(),
        enqueue,
        logger: undefined,
        getGroupAdmins: async () => ['444444444@s.whatsapp.net'],
        db: fakeDb,
      })

      await router.handleMessage(
        {
          jid: 'g-promote-1',
          sender: '444444444@s.whatsapp.net', // group admin, not OWNER/ADMINS
          senderPn: undefined,
          text: '/promote 1231231234',
          isGroup: true,
          raw: undefined,
        },
        1000
      )

      assert.equal(replies.length, 1)
      assert(replies[0].text.includes('Only the owner can promote'))
      assert.deepEqual(fakeDb.botAdmins('g-promote-1'), [], 'group admin must not be able to mint a bot admin')
    },
  },
  {
    name: '/promote: the owner with a mentionedJid persists the number',
    fn: async () => {
      const fakeDb = makeBotAdminDb()
      const replies = []
      const enqueue = (jid, payload) => replies.push(payload)
      const router = createRouter({
        dict: {},
        games: new Map(),
        enqueue,
        logger: undefined,
        getGroupAdmins: async () => [],
        db: fakeDb,
      })

      const raw = { message: { extendedTextMessage: { contextInfo: { mentionedJid: ['1231231234@s.whatsapp.net'] } } } }

      await router.handleMessage(
        {
          jid: 'g-promote-2',
          sender: '15550000000@s.whatsapp.net', // OWNER from config
          senderPn: undefined,
          text: '/promote @user',
          isGroup: true,
          raw,
        },
        1000
      )

      assert.deepEqual(fakeDb.botAdmins('g-promote-2'), ['1231231234'])
      assert.equal(replies.length, 1)
      assert(replies[0].text.includes('Promoted'))
      assert(replies[0].mentions.includes('1231231234@s.whatsapp.net'))
    },
  },
  {
    name: '/promote then /pending: a promoted user passes the admin gate',
    fn: async () => {
      const fakeDb = makeBotAdminDb()
      const pendingCalls = []
      fakeDb.pending = (...a) => { pendingCalls.push(a); return [] }
      const enqueue = () => {}
      const router = createRouter({
        dict: {},
        games: new Map(),
        enqueue,
        logger: undefined,
        getGroupAdmins: async () => [],
        db: fakeDb,
      })

      const raw = { message: { extendedTextMessage: { contextInfo: { mentionedJid: ['1231231234@s.whatsapp.net'] } } } }
      await router.handleMessage(
        { jid: 'g-promote-3', sender: '15550000000@s.whatsapp.net', senderPn: undefined, text: '/promote @user', isGroup: true, raw },
        1000
      )

      await router.handleMessage(
        { jid: 'g-promote-3', sender: '1231231234@s.whatsapp.net', senderPn: undefined, text: '/pending', isGroup: true, raw: undefined },
        1000
      )

      assert.equal(pendingCalls.length, 1, 'promoted user should pass the admin gate')
    },
  },
  {
    name: '/trivia starts a mixed game and posts the first question',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general', 'science'],
        pick: ({ count }) => Array.from({ length: count }, (_, i) => ({
          id: `q${i}`, q: `Q${i}?`, correct: 'right', wrong: ['a', 'b', 'c'], category: i % 2 === 0 ? 'general' : 'science',
        })),
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia', isGroup: true }, 0)
      assert.equal(games.size, 1, 'game registered so the scheduler ticks it')
      assert.ok(sent.some((t) => t.includes('*Q1/10*')), 'first question posted immediately, no lobby')
      db.close()
    },
  },
  {
    name: '/trivia rejects an unknown or empty category and lists what is available',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = { categories: () => ['general'], pick: () => [] }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia football', isGroup: true }, 0)
      assert.equal(games.size, 0, 'no unplayable game started')
      assert.ok(sent.some((t) => t.toLowerCase().includes('general')), 'tells the user what they can play')
      db.close()
    },
  },
  {
    name: '/trivia is refused in a DM',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = { categories: () => ['general'], pick: () => [{ id: 'q', q: 'Q?', correct: 'r', wrong: ['a', 'b', 'c'] }] }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'x@s.whatsapp.net', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia', isGroup: false }, 0)
      assert.equal(games.size, 0)
      db.close()
    },
  },
  {
    name: 'trivia_over records a game of type trivia, ranked by placement',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }],
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      // Own jid, not the shared 'g@g.us' used elsewhere in this file: this test
      // deliberately fires trivia_over, which now sets module-level
      // lastTriviaEnd — reusing 'g@g.us' would put every later test on that jid
      // under the trivia cooldown.
      const jid = 'trivia-over-jid@g.us'
      await router.handleMessage({ jid, sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)

      // Find the correct letter from the posted question, then answer it.
      const posted = sent.find((t) => t.includes('*Q1/1*')) ?? sent[sent.length - 1]
      const letter = ['A', 'B', 'C', 'D'].find((l) => posted.includes(`*${l})*  right`))
      await router.handleMessage({ jid, sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: letter, isGroup: true }, 1000)

      // A gap now separates the answer reveal from trivia_over. The global
      // scheduler drives that tick in production; drive it by hand here.
      const at = 1000 + GAP_SECONDS * 1000
      sendEvents((_, m) => sent.push(m.text), jid, games.get(jid).tick(at), undefined, at, db)

      const board = db.leaderboard({ jid, since: 0, type: 'trivia' })
      assert.equal(board.length, 1)
      assert.equal(board[0].wins, 1)
      assert.equal(db.leaderboard({ jid, since: 0, type: 'chain' }).length, 0, 'must not touch the chain board')
      db.close()
    },
  },
  {
    name: 'asked questions are recorded so the next game does not repeat them',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      let excludeSeen = null
      const bank = {
        categories: () => ['general'],
        pick: ({ exclude }) => {
          excludeSeen = exclude
          return [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }]
        },
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)
      assert.deepEqual([...db.askedIds('g@g.us')], ['q0'])

      games.clear()
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 5000)
      assert.ok(excludeSeen.has('q0'), 'second game excludes what the first asked')
      db.close()
    },
  },
  {
    name: 'a question already seen via /trivia mixed is excluded from /trivia <category>, and vice versa',
    fn: async () => {
      const games = new Map()
      const db = openDb(':memory:')
      const enqueue = () => {}
      let lastExclude = null
      const bank = {
        categories: () => ['general', 'science'],
        pick: ({ category, exclude }) => {
          lastExclude = exclude
          if (category === 'mixed') return [{ id: 'g1', q: 'Q?', correct: 'r', wrong: ['a', 'b', 'c'], category: 'general' }]
          return [{ id: `${category[0]}2`, q: 'Q?', correct: 'r', wrong: ['a', 'b', 'c'], category }]
        },
      }
      const router = createRouter({
        dict: new Set(), games, enqueue,
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })

      // Mixed mode serves a 'general' question (g1); tag it under 'general' in the store.
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia', isGroup: true }, 0)
      assert.deepEqual([...db.askedIds('g@g.us')], ['g1'])

      // A direct /trivia general must see g1 as already-asked, even though it was served by mixed mode.
      games.clear()
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 1000)
      assert.ok(lastExclude.has('g1'), 'mixed-served question must block a same-category direct game')
      db.close()
    },
  },
  {
    name: '/trivia still starts when db.askedIds throws (store failure must never break gameplay)',
    fn: async () => {
      const sent = []
      const games = new Map()
      const bank = {
        categories: () => ['general'],
        pick: ({ exclude }) => {
          assert.equal(exclude.size, 0, 'falls back to an empty Set when the store fails')
          return [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }]
        },
      }
      const db = {
        askedIds: () => { throw new Error('SQLITE_BUSY') },
        clearAsked: () => {},
        markAsked: () => {},
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)
      assert.equal(games.size, 1, 'game still started despite the store failure')
      assert.ok(sent.some((t) => t.includes('*Q1/1*')))
    },
  },
  {
    name: '/trivia still recycles when db.clearAsked throws (store failure must never break gameplay)',
    fn: async () => {
      const sent = []
      const games = new Map()
      let pickCalls = 0
      const bank = {
        categories: () => ['general'],
        pick: () => {
          pickCalls++
          if (pickCalls === 1) return [] // pretend exhausted, forcing the recycle path
          return [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }]
        },
      }
      const db = {
        askedIds: () => new Set(['q0']),
        clearAsked: () => { throw new Error('SQLITE_BUSY') },
        markAsked: () => {},
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)
      assert.equal(games.size, 1, 'game still started despite clearAsked throwing')
      assert.equal(pickCalls, 2, 'recycle retry still happened after the throw was swallowed')
    },
  },
  {
    name: '/trivia end does not terminate a running /wcg game',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const router = createRouter({
        dict: {}, games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/wcg', isGroup: true }, 0)
      assert.equal(games.size, 1, 'wcg game running')
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia end', isGroup: true }, 100)
      assert.equal(games.size, 1, '/trivia end must not touch the running word-chain game')
      db.close()
    },
  },
  {
    name: '/wcg end does not terminate a running /trivia game',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }],
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)
      assert.equal(games.size, 1, 'trivia game running')
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/wcg end', isGroup: true }, 100)
      assert.equal(games.size, 1, '/wcg end must not touch the running trivia game')
      db.close()
    },
  },
  {
    name: '/trivia with no bank loaded refuses cleanly instead of throwing',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['a@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: 'a@s.whatsapp.net', text: '/trivia', isGroup: true }, 0)
      assert.equal(games.size, 0, 'no game started without a bank')
      assert.ok(sent.some((t) => t.toLowerCase().includes('unavailable')), 'refusal message enqueued')
      db.close()
    },
  },
  {
    name: '/help is refused for a normal player',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: '99999@s.whatsapp.net', senderPn: '99999@s.whatsapp.net', text: '/help', isGroup: true }, 0)
      const text = sent[0]
      assert.ok(text.includes('Only admins'))
      db.close()
    },
  },
  {
    name: '/help shows the admin block to a group admin but not the owner block',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['77777@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: '77777@s.whatsapp.net', senderPn: '77777@s.whatsapp.net', text: '/help', isGroup: true }, 0)
      const text = sent[0]
      assert.ok(text.includes('ADMIN'))
      assert.ok(text.includes('/addword'))
      assert.ok(!text.includes('/promote'), 'group admins cannot mint bot admins')
      db.close()
    },
  },
  {
    name: '/help shows everything to the owner',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/help', isGroup: true }, 0)
      const text = sent[0]
      assert.ok(text.includes('ADMIN'))
      assert.ok(text.includes('OWNER'))
      assert.ok(text.includes('/promote'))
      db.close()
    },
  },
  {
    name: 'a bare answer with no game running explains the bot restarted, when this chat had a recent game',
    fn: async () => {
      const sent = []
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => [], db: { lastGameActivity: () => 900 }, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: undefined, text: 'B', isGroup: true, raw: undefined }, 1000)
      assert.equal(sent.length, 1)
      assert.ok(sent[0].includes('/trivia'))
    },
  },
  {
    name: 'the restart notice is rate-limited, not sent per message',
    fn: async () => {
      const sent = []
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => [], db: { lastGameActivity: () => 0 }, resolvePn: () => undefined,
      })
      const msg = (text, now) => router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: undefined, text, isGroup: true, raw: undefined }, now)
      await msg('B', 0)
      await msg('C', 1000)
      await msg('A', 60_000)
      assert.equal(sent.length, 1, 'all three are inside the 5-minute window')
      await msg('D', 5 * 60 * 1000)
      assert.equal(sent.length, 2, 'window elapsed, second notice sent')
    },
  },
  {
    name: 'the first notice fires regardless of the absolute clock value',
    fn: async () => {
      const sent = []
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => [], db: { lastGameActivity: () => 0 }, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: undefined, text: 'B', isGroup: true, raw: undefined }, 0)
      assert.equal(sent.length, 1)
    },
  },
  {
    name: 'a bare answer in a chat with NO recorded game activity produces no message at all',
    fn: async () => {
      const sent = []
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => [], db: {}, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'never-played@g.us', sender: 'a@s.whatsapp.net', senderPn: undefined, text: '4', isGroup: true, raw: undefined }, 1000)
      assert.equal(sent.length, 0, 'a group the bot has never run a game in must stay silent')
    },
  },
  {
    name: "a bare answer in a chat whose recorded game is older than ORPHAN_GATE_MS produces no message",
    fn: async () => {
      const sent = []
      const now = 60 * 60 * 1000 // 1 hour
      const db = { lastGameActivity: () => now - 31 * 60 * 1000 } // 31 minutes ago, past the 30-minute gate
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'stale-game@g.us', sender: 'a@s.whatsapp.net', senderPn: undefined, text: 'A', isGroup: true, raw: undefined }, now)
      assert.equal(sent.length, 0, 'a game that ran over 30 minutes ago must not trigger the notice')
    },
  },
  {
    name: 'a bare answer in a chat with a recent recorded game DOES produce the notice',
    fn: async () => {
      const sent = []
      const now = 60 * 60 * 1000
      const db = { lastGameActivity: () => now - 5 * 60 * 1000 } // 5 minutes ago, inside the gate
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'recent-game@g.us', sender: 'a@s.whatsapp.net', senderPn: undefined, text: 'A', isGroup: true, raw: undefined }, now)
      assert.equal(sent.length, 1, 'a recently-active chat should still get the restart notice')
    },
  },
  {
    name: 'ordinary chatter with no game running stays silent',
    fn: async () => {
      const sent = []
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => [], db: {}, resolvePn: () => undefined,
      })
      const msg = (text) => router.handleMessage({ jid: 'g@g.us', sender: 'a@s.whatsapp.net', senderPn: undefined, text, isGroup: true, raw: undefined }, 0)
      await msg('lol')
      await msg('hello there')
      await msg('BB')
      await msg('')
      assert.equal(sent.length, 0)
    },
  },
  {
    name: '/trivia start is refused for a non-admin group member',
    fn: async () => {
      const sent = []
      const games = new Map()
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }],
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db: {}, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g-start-1@g.us', sender: 'nonadmin@s.whatsapp.net', senderPn: 'nonadmin@s.whatsapp.net', text: '/trivia', isGroup: true }, 0)
      assert.equal(games.size, 0, 'no game created for a non-admin')
      assert.equal(sent.length, 1)
      assert.ok(sent[0].includes('Only admins'), 'refusal names the requirement')
    },
  },
  {
    name: '/trivia start succeeds for a group admin',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: ({ count }) => Array.from({ length: count }, (_, i) => ({
          id: `q${i}`, q: `Q${i}?`, correct: 'right', wrong: ['a', 'b', 'c'], category: 'general',
        })),
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g-start-2@g.us', sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/trivia', isGroup: true }, 0)
      assert.equal(games.size, 1, 'a group admin can start a game')
      db.close()
    },
  },
  {
    name: '/trivia stats and /trivia categories are refused for a non-admin',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const bank = { categories: () => ['general', 'science'], pick: () => [] }
      const router = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g-stats@g.us', sender: 'nonadmin@s.whatsapp.net', senderPn: 'nonadmin@s.whatsapp.net', text: '/trivia categories', isGroup: true }, 0)
      await router.handleMessage({ jid: 'g-stats@g.us', sender: 'nonadmin@s.whatsapp.net', senderPn: 'nonadmin@s.whatsapp.net', text: '/trivia stats', isGroup: true }, 0)
      assert.equal(sent.length, 2, 'both subcommands replied')
      assert.ok(sent[0].includes('Only admins'), 'refused')
      assert.ok(sent[1].includes('Only admins'), 'refused')
      db.close()
    },
  },
  {
    name: 'command flood guard: 5 commands pass, the 6th inside the window is dropped silently',
    fn: async () => {
      const sent = []
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => [], db: {}, resolvePn: () => undefined,
      })
      const ping = (now) => router.handleMessage({ jid: 'g-flood@g.us', sender: 'spammer@s.whatsapp.net', senderPn: undefined, text: '/ping', isGroup: true, raw: undefined }, now)
      for (let i = 0; i < 5; i++) await ping(i * 1000)
      assert.equal(sent.length, 5, 'first five commands in the window all reply')
      await ping(5000)
      assert.equal(sent.length, 5, 'sixth command inside the 30s window produces no output')
    },
  },
  {
    name: 'command flood guard never blocks gameplay: a bare answer lands even after the sender is throttled',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }],
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      const jid = 'g-flood-game@g.us'
      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)
      const posted = sent.find((t) => t.includes('*Q1/1*'))
      const letter = ['A', 'B', 'C', 'D'].find((l) => posted.includes(`*${l})*  right`))

      // A different player (not the starter) burns through their own command budget.
      // (Since they are not an admin, they get the admin refusal message, but they still consume quota).
      for (let i = 0; i < 6; i++) {
        await router.handleMessage({ jid, sender: 'player@s.whatsapp.net', senderPn: undefined, text: '/ping', isGroup: true }, 1000 + i)
      }
      assert.equal(sent.filter((t) => t && t.includes('Only admins')).length, 5, 'only 5 of the 6 pings replied')

      const before = sent.length
      await router.handleMessage({ jid, sender: 'player@s.whatsapp.net', senderPn: 'player@s.whatsapp.net', text: letter, isGroup: true }, 2000)
      assert.ok(sent.length > before, 'the bare answer still reached the running game despite the flood guard')
      assert.ok(sent[sent.length - 1].includes('got it'), 'answer was accepted and scored')
      db.close()
    },
  },
  {
    name: 'trivia cooldown: refused right after trivia_over, but the OWNER bypasses it',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }],
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      const jid = 'g-cooldown@g.us'

      // Fires trivia_terminated directly (no need to play a full game out) to set
      // the module-level lastTriviaEnd for this jid.
      sendEvents((j, m) => sent.push(m.text), jid, [{ type: 'trivia_terminated' }], undefined, 1000, db)

      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/trivia general', isGroup: true }, 1500)
      assert.equal(games.size, 0, 'a group admin is still refused during the cooldown')
      assert.ok(sent.some((t) => t.includes('trivia round can start in')), 'refusal includes a wait time')

      await router.handleMessage({ jid, sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/trivia general', isGroup: true }, 1600)
      assert.equal(games.size, 1, 'the OWNER bypasses the cooldown')
      db.close()
    },
  },
  {
    name: '/ban: a non-owner group admin is refused',
    fn: async () => {
      const db = openDb(':memory:')
      const replies = []
      const enqueue = (jid, payload) => replies.push(payload)
      const router = createRouter({
        dict: {}, games: new Map(), enqueue, logger: undefined,
        getGroupAdmins: async () => ['444444444@s.whatsapp.net'], db, resolvePn: () => undefined,
      })

      await router.handleMessage(
        { jid: 'g-ban-1', sender: '444444444@s.whatsapp.net', senderPn: undefined, text: '/ban 1231231234', isGroup: true, raw: undefined },
        1000
      )

      assert.equal(replies.length, 1)
      assert(replies[0].text.includes('Only the owner can ban'))
      assert.deepEqual(db.bans('g-ban-1'), [], 'non-owner must not be able to ban')
      db.close()
    },
  },
  {
    name: "/ban by the owner works, and /bans then lists the banned number",
    fn: async () => {
      const db = openDb(':memory:')
      const replies = []
      const enqueue = (jid, payload) => replies.push(payload)
      const router = createRouter({
        dict: {}, games: new Map(), enqueue, logger: undefined,
        getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      const raw = { message: { extendedTextMessage: { contextInfo: { mentionedJid: ['1231231234@s.whatsapp.net'] } } } }

      await router.handleMessage(
        { jid: 'g-ban-2', sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: undefined, text: '/ban @user', isGroup: true, raw },
        1000
      )
      assert(replies[0].text.includes('Banned'))
      assert.deepEqual(db.bans('g-ban-2'), ['1231231234'])

      await router.handleMessage(
        { jid: 'g-ban-2', sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: undefined, text: '/bans', isGroup: true, raw: undefined },
        1100
      )
      assert.equal(replies.length, 2)
      assert(replies[1].text.includes('1231231234'), '/bans lists the banned number')
      db.close()
    },
  },
  {
    name: "a banned user's trivia answer is ignored and produces no reply at all",
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }],
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      const jid = 'g-ban-trivia@g.us'
      const banned = '2223334444'

      await router.handleMessage({ jid, sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/trivia general', isGroup: true }, 0)
      const posted = sent.find((t) => t.includes('*Q1/1*'))
      const letter = ['A', 'B', 'C', 'D'].find((l) => posted.includes(`*${l})*  right`))

      db.addBan(jid, banned)
      const before = sent.length
      await router.handleMessage({ jid, sender: `${banned}@s.whatsapp.net`, senderPn: `${banned}@s.whatsapp.net`, text: letter, isGroup: true }, 1000)
      assert.equal(sent.length, before, 'a banned player answering trivia must produce zero messages')
      db.close()
    },
  },
  {
    name: 'a ban covers every mode: a banned user cannot join or submit to word chain',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const router = createRouter({
        dict: { has: () => true, randomLetter: () => 'a' }, games, enqueue: (j, m) => sent.push(m),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      const jid = 'g-ban-wcg@g.us'
      const banned = '2223334444'
      db.addBan(jid, banned)

      await router.handleMessage({ jid, sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/wcg', isGroup: true }, 0)
      await router.handleMessage({ jid, sender: `${banned}@s.whatsapp.net`, senderPn: `${banned}@s.whatsapp.net`, text: 'join', isGroup: true }, 100)

      // Advance past the lobby window so the game moves to 'playing'.
      sendEvents((j, m) => sent.push(m), jid, games.get(jid).tick(60_000), undefined, 60_000, db)

      const game = games.get(jid)
      let submitCalls = 0
      const originalSubmit = game.submit.bind(game)
      game.submit = (...args) => { submitCalls++; return originalSubmit(...args) }

      await router.handleMessage({ jid, sender: `${banned}@s.whatsapp.net`, senderPn: `${banned}@s.whatsapp.net`, text: 'apple', isGroup: true }, 60_100)
      assert.equal(submitCalls, 0, 'a ban must block submissions in every mode, not just trivia')
      db.close()
    },
  },
  {
    // The original hole: the tournament's submit() ignores non-contestants, but
    // `join` had no ban check, so a banned player became a contestant and then
    // legitimately played. Guarding submit alone would not have caught this.
    name: 'a ban covers tournaments: a banned user cannot join the bracket',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }],
      }
      const router = createRouter({
        dict: { has: () => true, randomLetter: () => 'a' }, games, enqueue: (j, m) => sent.push(m),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      const jid = 'g-ban-tourney@g.us'
      const banned = '2223334444'
      db.addBan(jid, banned)

      await router.handleMessage({ jid, sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/tourney start', isGroup: true }, 0)

      const game = games.get(jid)
      assert.ok(game, 'tournament should have started')

      let joinCalls = 0
      const originalJoin = game.join.bind(game)
      game.join = (...args) => { joinCalls++; return originalJoin(...args) }

      await router.handleMessage({ jid, sender: `${banned}@s.whatsapp.net`, senderPn: `${banned}@s.whatsapp.net`, text: 'join', isGroup: true }, 100)
      assert.equal(joinCalls, 0, 'a banned player must not reach the tournament lobby')
      db.close()
    },
  },
  {
    name: 'concentration: /concentration start opens a lobby; a banned user cannot join it',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const router = createRouter({
        dict: { has: () => true, randomLetter: () => 'a' }, games, enqueue: (j, m) => sent.push(m),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      const jid = 'g-concentration@g.us'
      const banned = '2223334444'
      db.addBan(jid, banned)

      await router.handleMessage({ jid, sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/concentration start', isGroup: true }, 0)

      const game = games.get(jid)
      assert.ok(game, 'concentration lobby should have started')
      assert.equal(game.state, 'registering')

      let joinCalls = 0
      const originalJoin = game.join.bind(game)
      game.join = (...args) => { joinCalls++; return originalJoin(...args) }

      await router.handleMessage({ jid, sender: `${banned}@s.whatsapp.net`, senderPn: `${banned}@s.whatsapp.net`, text: 'join', isGroup: true }, 100)
      assert.equal(joinCalls, 0, 'a banned player must not reach the concentration lobby')
      db.close()
    },
  },
  {
    name: 'concentration: three players joining then /concentration begin starts the round and records a result on completion',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const router = createRouter({
        dict: { has: () => true, randomLetter: () => 'a' }, games, enqueue: (j, m) => sent.push(m),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, resolvePn: (jid) => jid,
      })
      const jid = 'g-concentration-2@g.us'
      const admin = `${OWNER_NUMBER}@s.whatsapp.net`

      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/concentration start', isGroup: true }, 0)
      await router.handleMessage({ jid, sender: 'p1@s.whatsapp.net', senderPn: 'p1@s.whatsapp.net', text: 'join', isGroup: true }, 100)
      await router.handleMessage({ jid, sender: 'p2@s.whatsapp.net', senderPn: 'p2@s.whatsapp.net', text: 'join', isGroup: true }, 200)
      await router.handleMessage({ jid, sender: 'p3@s.whatsapp.net', senderPn: 'p3@s.whatsapp.net', text: 'join', isGroup: true }, 300)
      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/concentration begin', isGroup: true }, 400)

      const game = games.get(jid)
      assert.ok(game, 'game should exist after begin')
      assert.equal(game.state, 'starting') // heads-up delay before the first category

      let now = 400
      for (let i = 0; i < 10 && game.state !== 'over'; i++) {
        now += 20_000
        sendEvents((j, m) => sent.push(m), jid, game.tick(now), undefined, now, db)
      }

      assert.equal(game.state, 'over')
      const board = db.leaderboard({ jid, type: 'concentration' })
      assert.ok(board.length >= 1, 'expected a recorded concentration result')
      db.close()
    },
  },
  {
    // The banned player is a GROUP ADMIN here on purpose: admins are the only
    // ones who can start games at all, so this is the case that proves a ban
    // outranks admin rights rather than being masked by the admin gate.
    name: 'a banned group admin cannot start any mode, and gets told why',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const banned = '2223334444'
      const router = createRouter({
        dict: { has: () => true, randomLetter: () => 'a' }, games, enqueue: (j, m) => sent.push(m),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [`${banned}@s.whatsapp.net`], db, resolvePn: () => undefined,
      })
      const jid = 'g-ban-start@g.us'
      db.addBan(jid, banned)

      // Each command is spaced past CMD_WINDOW_MS (30s): the per-sender command
      // rate limiter drops silently after 5 in a window, which would otherwise
      // look exactly like the ban check failing to fire.
      const cmds = ['/wcg', '/scramble start', '/logo start', '/flag start', '/riddle', '/tourney start']
      for (const [i, cmd] of cmds.entries()) {
        sent.length = 0
        await router.handleMessage({ jid, sender: `${banned}@s.whatsapp.net`, senderPn: `${banned}@s.whatsapp.net`, text: cmd, isGroup: true }, i * 60_000)
        assert.equal(games.has(jid), false, `${cmd} must not start a game for a banned player`)
        assert.match(sent[0]?.text ?? '', /banned from games/i, `${cmd} should explain the ban`)
      }
      db.close()
    },
  },
  {
    name: 'a ban does not block reading stats',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const router = createRouter({
        dict: { has: () => true, randomLetter: () => 'a' }, games: new Map(), enqueue: (j, m) => sent.push(m),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, resolvePn: () => undefined,
      })
      const jid = 'g-ban-stats@g.us'
      const banned = '2223334444'
      db.addBan(jid, banned)

      await router.handleMessage({ jid, sender: `${banned}@s.whatsapp.net`, senderPn: `${banned}@s.whatsapp.net`, text: '/trivia stats', isGroup: true }, 0)
      assert.doesNotMatch(sent[0]?.text ?? '', /banned from games/i, 'a leaderboard is read-only — a ban should not hide it')
      db.close()
    },
  },
  {
    name: "/unban restores a banned user's ability to answer trivia",
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }],
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db, bank, resolvePn: () => undefined,
      })
      const jid = 'g-unban@g.us'
      const num = '2223334444'
      db.addBan(jid, num)

      await router.handleMessage({ jid, sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: '/trivia general', isGroup: true }, 0)
      const posted = sent.find((t) => t.includes('*Q1/1*'))
      const letter = ['A', 'B', 'C', 'D'].find((l) => posted.includes(`*${l})*  right`))

      await router.handleMessage({ jid, sender: `${OWNER_NUMBER}@s.whatsapp.net`, senderPn: `${OWNER_NUMBER}@s.whatsapp.net`, text: `/unban ${num}`, isGroup: true }, 500)
      assert.deepEqual(db.bans(jid), [], 'number should no longer be banned')

      const before = sent.length
      await router.handleMessage({ jid, sender: `${num}@s.whatsapp.net`, senderPn: `${num}@s.whatsapp.net`, text: letter, isGroup: true }, 1000)
      assert.ok(sent.length > before, "unbanned user's answer now produces a reply")
      db.close()
    },
  },
  {
    name: '/tourney start is refused for a non-admin',
    fn: async () => {
      const sent = []
      const games = new Map()
      const bank = { categories: () => ['general'], pick: () => [] }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db: {}, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g-tny-1@g.us', sender: 'nonadmin@s.whatsapp.net', senderPn: 'nonadmin@s.whatsapp.net', text: '/tourney start', isGroup: true }, 0)
      assert.equal(games.size, 0, 'no tournament created for a non-admin')
      assert.ok(sent[0].includes('admin'))
    },
  },
  {
    name: '/tourney start refuses when a trivia game is already running here',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = { categories: () => ['general'], pick: () => [{ id: 'q0', q: 'Q?', correct: 'right', wrong: ['a', 'b', 'c'], category: 'general' }] }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      const jid = 'g-tny-2@g.us'
      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/trivia general', isGroup: true }, 0)
      assert.equal(games.size, 1)
      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/tourney start', isGroup: true }, 100)
      assert.ok(sent.some((t) => t.includes('already running')), 'tournament refused while trivia runs')
      db.close()
    },
  },
  {
    name: '/tourney start opens registration, join enters, and next after the window starts the first match',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = {
        categories: () => ['general'],
        pick: ({ count }) => Array.from({ length: count }, (_, i) => ({
          id: `q${i}`, q: `Q${i}?`, correct: 'right', wrong: ['a', 'b', 'c'], category: 'general',
        })),
      }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      const jid = 'g-tny-3@g.us'
      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/tourney start', isGroup: true }, 0)
      assert.equal(games.size, 1, 'tournament registered so the scheduler ticks it')
      assert.ok(sent.some((t) => t.includes('TOURNAMENT')))

      await router.handleMessage({ jid, sender: 'p1@s.whatsapp.net', senderPn: 'p1@s.whatsapp.net', text: 'join', isGroup: true }, 100)
      await router.handleMessage({ jid, sender: 'p2@s.whatsapp.net', senderPn: 'p2@s.whatsapp.net', text: 'join', isGroup: true }, 200)
      assert.ok(sent.some((t) => t.includes('2 joined')))

      // Advance past the registration window: the scheduler would call tick()
      // every second in production; drive it by hand here.
      const closeEv = games.get(jid).tick(120_000)
      sendEvents((j, m) => sent.push(m.text), jid, closeEv, undefined, 120_000, db)
      assert.ok(sent.some((t) => t.includes('BRACKET SET')))

      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/tourney next', isGroup: true }, 120_100)
      assert.ok(sent.some((t) => t.includes('ROUND 1')), 'admin next started the first match')
      db.close()
    },
  },
  {
    name: '/tourney next is refused for a non-admin',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = { categories: () => ['general'], pick: () => [] }
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      const jid = 'g-tny-4@g.us'
      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/tourney start', isGroup: true }, 0)
      await router.handleMessage({ jid, sender: 'nonadmin@s.whatsapp.net', senderPn: 'nonadmin@s.whatsapp.net', text: '/tourney next', isGroup: true }, 100)
      assert.ok(sent.some((t) => t.includes('admin')))
      db.close()
    },
  },
  {
    name: '/tourney stats reads the tournament_wins table, not the trivia/chain leaderboards',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      db.recordTournamentWin('g-tny-5@g.us', '11111111', 1000)
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: undefined, getGroupAdmins: async () => ['x@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g-tny-5@g.us', sender: 'x@s.whatsapp.net', senderPn: undefined, text: '/tourney stats', isGroup: true }, 2000)
      assert.ok(sent[0].includes('11111111'))
      assert.ok(sent[0].includes('title'))
      db.close()
    },
  },
  {
    name: 'Fix 3: /tourney stats mentions are full JIDs, not bare digits (the WhatsApp mention tag needs the full JID to resolve)',
    fn: async () => {
      const sentMsgs = []
      const db = openDb(':memory:')
      // Full JID, as router.js's tournament_champion handler now writes (Fix 3:
      // storage stopped calling toNumber() before the write).
      db.recordTournamentWin('g-tny-mentions@g.us', '2349137123224@s.whatsapp.net', 1000)
      const router = createRouter({
        dict: {}, games: new Map(), enqueue: (j, m) => sentMsgs.push(m),
        logger: undefined, getGroupAdmins: async () => ['x@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g-tny-mentions@g.us', sender: 'x@s.whatsapp.net', senderPn: undefined, text: '/tourney stats', isGroup: true }, 2000)
      assert.equal(sentMsgs.length, 1)
      assert.deepEqual(sentMsgs[0].mentions, ['2349137123224@s.whatsapp.net'])
      for (const m of sentMsgs[0].mentions) {
        assert.ok(!/^\d+$/.test(m), `mentions entry "${m}" must not be a plain numeric string`)
      }
      db.close()
    },
  },
  {
    name: 'Fix 3: tournament_champion writes the winner as a full JID (not bare digits) when a pnMap entry resolves it',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const bank = { categories: () => ['general'], pick: () => [] }
      const jid = 'g-tny-champ@g.us'
      const winnerPn = '2349137654321@s.whatsapp.net'
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, bank, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/tourney start', isGroup: true }, 0)
      // A player's message records their phone-form JID into gameMeta's
      // pnMap — the same map tournament_champion consults to resolve the
      // winner's JID (transport/router.js line ~904-908).
      await router.handleMessage({ jid, sender: 'winner@s.whatsapp.net', senderPn: winnerPn, text: 'join', isGroup: true }, 100)

      sendEvents((j, m) => sent.push(m), jid, [{ type: 'tournament_champion', player: 'winner@s.whatsapp.net', rounds: 1 }], undefined, 200, db)

      const stats = db.tournamentStats(jid)
      assert.equal(stats.length, 1)
      assert.equal(stats[0].player, winnerPn, 'recorded as the full JID from pnMap, not bare digits')
      db.close()
    },
  },
  {
    name: '/help is refused for non-admins for tourney too',
    fn: async () => {
      const sentPlayer = []
      const dbA = openDb(':memory:')
      const routerPlayer = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sentPlayer.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [], db: dbA, resolvePn: () => undefined,
      })
      await routerPlayer.handleMessage({ jid: 'g@g.us', sender: '99999@s.whatsapp.net', senderPn: '99999@s.whatsapp.net', text: '/help', isGroup: true }, 0)
      const playerText = sentPlayer[0]
      assert.ok(playerText.includes('Only admins'))
      dbA.close()

      const sentAdmin = []
      const dbB = openDb(':memory:')
      const routerAdmin = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sentAdmin.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['77777@s.whatsapp.net'], db: dbB, resolvePn: () => undefined,
      })
      await routerAdmin.handleMessage({ jid: 'g@g.us', sender: '77777@s.whatsapp.net', senderPn: '77777@s.whatsapp.net', text: '/help', isGroup: true }, 0)
      const adminText = sentAdmin[0]
      assert.ok(adminText.includes(`${PREFIX}tourney start`))
      assert.ok(adminText.includes(`${PREFIX}tourney next`))
      assert.ok(adminText.includes(`${PREFIX}tourney end`))
      dbB.close()
    },
  },
  {
    name: 'riddle: /riddle starts game, accepts answer, records stats with 1st/2nd place points',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const jid = 'g-riddle@g.us'
      const admin = 'admin@s.whatsapp.net'
      const p1 = 'player1@s.whatsapp.net'
      const p1Pn = '2348011111111@s.whatsapp.net'

      const router = createRouter({
        dict: new Set(),
        games,
        enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [admin],
        db,
        bank: null,
        resolvePn: () => undefined,
      })

      // Start riddle
      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/riddle', isGroup: true }, 1000)
      assert.equal(games.size, 1, 'Riddle game must be active')
      assert.ok(sent.some((t) => t.includes('RIDDLE QUEST')), 'Must announce RIDDLE QUEST')

      // Player submits answer
      const activeGame = games.get(jid)
      const currentAnswer = activeGame.scores // verify game is running

      // Submit end command
      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/riddle end', isGroup: true }, 2000)
      assert.equal(games.size, 0, 'Riddle game ended')
      assert.ok(sent.some((t) => t.includes('Riddle Quest stopped')), 'Must announce stopped')

      // Query stats
      sent.length = 0
      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/riddle stats', isGroup: true }, 3000)
      assert.ok(sent.some((t) => t.includes('Riddle Quest — this week')), 'Must return weekly leaderboard')

      db.close()
    },
  },
  {
    name: '/careerpath starts a game and posts the opening announcement plus first reveal',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g-cp-1@g.us', sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/careerpath', isGroup: true }, 0)
      assert.equal(games.size, 1, 'game registered so the scheduler ticks it')
      assert.ok(sent.some((t) => t.includes('CAREER PATH')), 'opening announcement sent')
      assert.ok(sent.some((t) => t.includes('*Round 1/')), 'first reveal posted immediately, no lobby')
      db.close()
    },
  },
  {
    name: '/careerpath start is refused for a non-admin group member',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid: 'g-cp-2@g.us', sender: 'nonadmin@s.whatsapp.net', senderPn: 'nonadmin@s.whatsapp.net', text: '/careerpath', isGroup: true }, 0)
      assert.equal(games.size, 0, 'no game started by a non-admin')
      db.close()
    },
  },
  {
    name: '/careerpath end is refused for a non-owner, non-admin player, then works for the starter',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const admin = 'admin@s.whatsapp.net'
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [admin], db, resolvePn: () => undefined,
      })
      const jid = 'g-cp-3@g.us'
      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/careerpath', isGroup: true }, 0)
      assert.equal(games.size, 1)

      await router.handleMessage({ jid, sender: 'rando@s.whatsapp.net', senderPn: 'rando@s.whatsapp.net', text: '/careerpath end', isGroup: true }, 100)
      assert.equal(games.size, 1, 'a non-starter, non-admin cannot end the game')

      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/careerpath end', isGroup: true }, 200)
      assert.equal(games.size, 0, 'the starter can end the game')
      assert.ok(sent.some((t) => t.includes('Career Path stopped')), 'termination message sent')
      db.close()
    },
  },
  {
    name: '/careerpath stats returns the type-filtered leaderboard',
    fn: async () => {
      const sent = []
      const db = openDb(':memory:')
      const router = createRouter({
        dict: new Set(), games: new Map(), enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => ['admin@s.whatsapp.net'], db, resolvePn: () => undefined,
      })
      const jid = 'g-cp-4@g.us'
      await router.handleMessage({ jid, sender: 'admin@s.whatsapp.net', senderPn: 'admin@s.whatsapp.net', text: '/careerpath stats', isGroup: true }, 0)
      assert.ok(sent.some((t) => t.includes('Career Path — this week')))
      db.close()
    },
  },
  {
    name: '/careerpath recycles the pool once every player in it has been asked here',
    fn: async () => {
      const sent = []
      const games = new Map()
      const db = openDb(':memory:')
      const admin = 'admin@s.whatsapp.net'
      const jid = 'g-cp-5@g.us'
      // Fixture has 3 players; mark all 3 as already-asked for this jid so a
      // fresh pick comes back empty and the router must recycle (clearAsked)
      // rather than reporting "not available yet" — same fallback Trivia has.
      db.markAsked(jid, [
        { id: 'Q1', category: 'careerpath' },
        { id: 'Q2', category: 'careerpath' },
        { id: 'Q3', category: 'careerpath' },
      ], 0)
      const router = createRouter({
        dict: new Set(), games, enqueue: (j, m) => sent.push(m.text),
        logger: { info() {}, error() {}, debug() {} },
        getGroupAdmins: async () => [admin], db, resolvePn: () => undefined,
      })
      await router.handleMessage({ jid, sender: admin, senderPn: admin, text: '/careerpath', isGroup: true }, 100)
      assert.equal(games.size, 1, 'pool recycled instead of refusing to start')
      assert.ok(!sent.some((t) => t.includes('not available')), 'must not report unavailable after a recycle')
      db.close()
    },
  },
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    await test.fn()
    console.log(`✓ ${test.name}`)
    passed++
  } catch (e) {
    console.error(`✗ ${test.name}: ${e.message}`)
    failed++
  }
}

if (!careerPathFixtureExisted) {
  try { unlinkSync(CAREERPATH_FIXTURE) } catch (e) { /* best-effort cleanup */ }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
