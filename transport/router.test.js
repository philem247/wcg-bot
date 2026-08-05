import assert from 'node:assert/strict'

// config.js throws if PHONE_NUMBER is missing; set env before any import that touches it.
process.env.PHONE_NUMBER = '1234567890'
process.env.OWNER = '15550000000'
process.env.ADMINS = '15550000001'

const { sendEvents, createRouter } = await import('./router.js')

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
        getGroupAdmins: async () => ['444444444@s.whatsapp.net'],
        db: {},
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

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
