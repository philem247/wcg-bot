import assert from 'node:assert/strict'

const { createOutbox } = await import('./outbox.js')

// Flushes pending microtasks (promise .then/.catch queued by dispatch) so calls
// made synchronously inside pump() have actually landed before we assert on them.
function flush() {
  return new Promise((r) => setTimeout(r, 0))
}

function makeLogger() {
  const warns = []
  const errors = []
  return { logger: { warn: (...a) => warns.push(a), error: (...a) => errors.push(a) }, warns, errors }
}

const tests = [
  {
    name: 'per-chat FIFO order preserved under interleaved enqueues to several chats',
    fn: async () => {
      const calls = []
      let order = 0
      const sendFn = async (jid, { text }) => { calls.push({ jid, text, callOrder: order++ }) }
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })

      ob.enqueue('A', { text: 'a1', mentions: [], kind: 'misc' })
      ob.enqueue('B', { text: 'b1', mentions: [], kind: 'misc' })
      ob.enqueue('A', { text: 'a2', mentions: [], kind: 'misc' })
      ob.enqueue('B', { text: 'b2', mentions: [], kind: 'misc' })
      ob.enqueue('A', { text: 'a3', mentions: [], kind: 'misc' })

      let now = 0
      for (let i = 0; i < 10 && ob.stats().queued > 0; i++) {
        ob.pump(now)
        await flush()
        now += 10
      }

      const aTexts = calls.filter((c) => c.jid === 'A').map((c) => c.text)
      const bTexts = calls.filter((c) => c.jid === 'B').map((c) => c.text)
      assert.deepEqual(aTexts, ['a1', 'a2', 'a3'])
      assert.deepEqual(bTexts, ['b1', 'b2'])
    },
  },
  {
    name: 'never two in flight for the same chat',
    fn: async () => {
      const calls = []
      const pending = []
      const sendFn = (jid, { text }) => {
        calls.push({ jid, text })
        return new Promise((resolve) => pending.push(resolve))
      }
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })
      ob.enqueue('A', { text: 'a1', mentions: [], kind: 'misc' })
      ob.enqueue('A', { text: 'a2', mentions: [], kind: 'misc' })

      ob.pump(0)
      await flush()
      // Only a1 should have been dispatched: a2 is stuck behind A's single in-flight slot.
      assert.deepEqual(calls.map((c) => c.text), ['a1'])
      assert.equal(ob.stats().inFlight, 1)

      pending.shift()() // resolve a1
      await flush()
      ob.pump(1000)
      await flush()
      assert.deepEqual(calls.map((c) => c.text), ['a1', 'a2'])
    },
  },
  {
    name: 'perChatGapMs respected between two sends to one chat',
    fn: async () => {
      const calls = []
      const sendFn = async (jid, { text }) => { calls.push(text) }
      const ob = createOutbox({ sendFn, perChatGapMs: 1000, globalPerSecond: 1000, maxConcurrent: 1000 })
      ob.enqueue('A', { text: 'a1', mentions: [], kind: 'misc' })
      ob.enqueue('A', { text: 'a2', mentions: [], kind: 'misc' })

      ob.pump(0)
      await flush()
      assert.equal(calls.length, 1, 'first send goes immediately')

      ob.pump(500)
      await flush()
      assert.equal(calls.length, 1, 'gap not elapsed yet, second send withheld')

      ob.pump(1000)
      await flush()
      assert.equal(calls.length, 2, 'gap elapsed, second send goes')
    },
  },
  {
    name: 'global per-second cap respected across many chats',
    fn: async () => {
      const calls = []
      const sendFn = async (jid, { text }) => { calls.push(text) }
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 3, maxConcurrent: 1000 })
      for (let i = 0; i < 8; i++) ob.enqueue(`jid${i}`, { text: `m${i}`, mentions: [], kind: 'misc' })

      ob.pump(0) // bucket starts full at globalPerSecond
      await flush()
      assert.equal(calls.length, 3, 'only globalPerSecond sends on the first pump')

      ob.pump(0) // no time elapsed, no new tokens
      await flush()
      assert.equal(calls.length, 3)

      ob.pump(1000) // 1s elapsed, bucket refills to 3
      await flush()
      assert.equal(calls.length, 6)
    },
  },
  {
    name: 'maxConcurrent never exceeded',
    fn: async () => {
      const pending = []
      const sendFn = (jid) => new Promise((resolve) => pending.push(resolve))
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 3 })
      for (let i = 0; i < 6; i++) ob.enqueue(`jid${i}`, { text: `m${i}`, mentions: [], kind: 'misc' })

      ob.pump(0)
      await flush()
      assert.equal(ob.stats().inFlight, 3, 'capped at maxConcurrent even with 6 ready sends')
      assert.equal(ob.stats().queued, 3)

      while (pending.length) pending.shift()()
      await flush()
      ob.pump(0)
      await flush()
      assert.equal(ob.stats().inFlight, 3)

      while (pending.length) pending.shift()()
      await flush()
      assert.equal(ob.stats().inFlight, 0)
      assert.equal(ob.stats().queued, 0)
    },
  },
  {
    name: "stale 'turn' coalescing keeps only the newest, and does not drop reject/result/lobby",
    fn: async () => {
      const calls = []
      const sendFn = async (jid, { text }) => { calls.push(text) }
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })

      ob.enqueue('A', { text: 'turn1', mentions: [], kind: 'turn' })
      ob.enqueue('A', { text: 'lobby1', mentions: [], kind: 'lobby' })
      ob.enqueue('A', { text: 'reject1', mentions: [], kind: 'reject' })
      ob.enqueue('A', { text: 'result1', mentions: [], kind: 'result' })
      ob.enqueue('A', { text: 'turn2', mentions: [], kind: 'turn' }) // supersedes turn1

      let now = 0
      for (let i = 0; i < 10 && ob.stats().queued > 0; i++) {
        ob.pump(now)
        await flush()
        now += 10
      }

      assert.deepEqual(calls, ['lobby1', 'reject1', 'result1', 'turn2'], 'turn1 dropped, everything else delivered in order')
    },
  },
  {
    name: 'a failing send is retried once, then dropped, and does not block the rest of the queue',
    fn: async () => {
      const calls = []
      let failuresLeft = 2 // both attempts at msg1 fail
      const sendFn = async (jid, { text }) => {
        calls.push(text)
        if (text === 'msg1' && failuresLeft > 0) {
          failuresLeft--
          throw new Error('boom')
        }
      }
      const { logger, warns, errors } = makeLogger()
      const ob = createOutbox({ sendFn, logger, perChatGapMs: 50, globalPerSecond: 1000, maxConcurrent: 1000 })
      ob.enqueue('A', { text: 'msg1', mentions: [], kind: 'misc' })
      ob.enqueue('A', { text: 'msg2', mentions: [], kind: 'misc' })

      ob.pump(0) // attempt 0 of msg1, fails
      await flush()
      ob.pump(50) // gap elapsed, attempt 1 of msg1, fails again -> dropped
      await flush()
      ob.pump(100) // msg2 finally gets its turn
      await flush()

      assert.deepEqual(calls, ['msg1', 'msg1', 'msg2'])
      assert.equal(warns.length, 1, 'one retry warning')
      assert.equal(errors.length, 1, 'one drop error')
      assert.equal(ob.stats().queued, 0)
    },
  },
  {
    name: 'per-chat cap drops oldest non-turn entries and logs',
    fn: async () => {
      const { logger, warns } = makeLogger()
      const sendFn = async () => {}
      const ob = createOutbox({ sendFn, logger, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })
      for (let i = 0; i < 55; i++) ob.enqueue('A', { text: `m${i}`, mentions: [], kind: 'misc' })

      assert.equal(ob.stats().queued, 50, 'queue held at cap')
      assert(warns.length >= 1, 'cap overflow logged')

      const calls = []
      const drain = createOutbox({
        sendFn: async (jid, { text }) => { calls.push(text) },
        perChatGapMs: 0,
        globalPerSecond: 1000,
        maxConcurrent: 1000,
      })
      for (let i = 0; i < 55; i++) drain.enqueue('A', { text: `m${i}`, mentions: [], kind: 'misc' })

      // Strict per-chat serialization means one pump dispatches at most one
      // message for 'A' (only one send in flight per chat at a time), so drain
      // the queue by pumping repeatedly rather than expecting one pump to flush it.
      let now = 0
      for (let i = 0; i < 100 && drain.stats().queued > 0; i++) {
        drain.pump(now)
        await flush()
        now += 10
      }

      assert.equal(calls[0], 'm5', 'oldest 5 (m0..m4) were dropped')
      assert.equal(calls[calls.length - 1], 'm54')
      assert.equal(calls.length, 50)
    },
  },
  {
    name: 'stats() reports sane numbers',
    fn: async () => {
      const pending = []
      const sendFn = () => new Promise((resolve) => pending.push(resolve))
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })
      assert.deepEqual(ob.stats(), { queued: 0, inFlight: 0, droppedCosmetic: 0 })

      ob.enqueue('A', { text: 'a1', mentions: [], kind: 'misc' })
      ob.enqueue('B', { text: 'b1', mentions: [], kind: 'misc' })
      ob.enqueue('B', { text: 'b2', mentions: [], kind: 'misc' })
      assert.deepEqual(ob.stats(), { queued: 3, inFlight: 0, droppedCosmetic: 0 })

      ob.pump(0)
      await flush()
      assert.equal(ob.stats().inFlight, 2, 'A and B each dispatched their head message')
      assert.equal(ob.stats().queued, 1, 'b2 still waiting behind b1')

      while (pending.length) pending.shift()()
      await flush()
      assert.equal(ob.stats().inFlight, 0)
    },
  },
  {
    name: 'a react payload is dispatched to sendFn intact, alongside text messages in the same chat',
    fn: async () => {
      const calls = []
      const sendFn = async (jid, payload) => { calls.push(payload) }
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })
      const key = { remoteJid: 'A', id: 'MSG1', fromMe: false }

      ob.enqueue('A', { react: { text: '✅', key }, kind: 'misc' })
      ob.enqueue('A', { text: 'turn text', mentions: ['p1'], kind: 'turn' })

      let now = 0
      for (let i = 0; i < 10 && ob.stats().queued > 0; i++) {
        ob.pump(now)
        await flush()
        now += 10
      }

      assert.deepEqual(calls[0].react, { text: '✅', key })
      assert.equal(calls[0].text, undefined)
      assert.equal(calls[1].text, 'turn text')
      assert.equal(calls[1].react, undefined)
    },
  },
  {
    name: "notBefore: not dispatched before its time, dispatched after, and doesn't block a later due entry",
    fn: async () => {
      const calls = []
      const sendFn = async (jid, { text }) => { calls.push(text) }
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })

      ob.enqueue('A', { text: 'delayed', mentions: [], kind: 'misc', notBefore: 1000 })
      ob.enqueue('A', { text: 'immediate', mentions: [], kind: 'misc' })

      ob.pump(0)
      await flush()
      assert.deepEqual(calls, ['immediate'], 'not-yet-due entry is skipped, later due entry still goes')

      ob.pump(500)
      await flush()
      assert.deepEqual(calls, ['immediate'], 'still not due at 500ms')

      ob.pump(1000)
      await flush()
      assert.deepEqual(calls, ['immediate', 'delayed'], 'due at 1000ms, dispatched')
    },
  },
  {
    name: 'pump dispatches nothing while isReady() is false',
    fn: async () => {
      const calls = []
      const sendFn = async (jid, { text }) => { calls.push(text) }
      let ready = false
      const ob = createOutbox({ sendFn, isReady: () => ready, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })
      ob.enqueue('A', { text: 'a1', mentions: [], kind: 'misc' })

      ob.pump(0)
      await flush()
      ob.pump(100)
      await flush()
      ob.pump(200)
      await flush()

      assert.deepEqual(calls, [])
      assert.equal(ob.stats().queued, 1)
    },
  },
  {
    name: 'a message queued while down is sent once the transport returns',
    fn: async () => {
      const calls = []
      const sendFn = async (jid, { text }) => { calls.push(text) }
      let ready = false
      const ob = createOutbox({ sendFn, isReady: () => ready, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })
      ob.enqueue('A', { text: 'a1', mentions: [], kind: 'misc' })

      ob.pump(0)
      await flush()
      assert.deepEqual(calls, [])

      ready = true
      ob.pump(1000)
      await flush()

      assert.deepEqual(calls, ['a1'])
      assert.equal(ob.stats().queued, 0)
    },
  },
  {
    name: "cosmetic entries are dropped once a chat's queue is above threshold, and stats() reports the count",
    fn: async () => {
      const sendFn = async () => {}
      const ob = createOutbox({ sendFn, perChatGapMs: 0, globalPerSecond: 0, maxConcurrent: 1000 })

      // globalPerSecond: 0 means nothing drains, so the queue just grows as enqueued.
      for (let i = 0; i < 6; i++) ob.enqueue('A', { text: `m${i}`, mentions: [], kind: 'misc' })
      assert.equal(ob.stats().queued, 6)

      // Queue is above the threshold (5) now: cosmetic entries get shed, not queued.
      ob.enqueue('A', { react: { text: '✅' }, kind: 'cosmetic' })
      ob.enqueue('A', { react: { text: '✅' }, kind: 'cosmetic' })
      assert.equal(ob.stats().queued, 6, 'cosmetic entries were dropped, not added')
      assert.equal(ob.stats().droppedCosmetic, 2)

      // A non-cosmetic kind is unaffected by the same threshold.
      ob.enqueue('A', { text: 'm6', mentions: [], kind: 'misc' })
      assert.equal(ob.stats().queued, 7)
    },
  },
  {
    name: 'queue-cap eviction prefers dropping a cosmetic entry before older non-turn entries',
    fn: async () => {
      const { logger } = makeLogger()
      const seen = []
      const sendFn = async (jid, payload) => { seen.push(payload) }
      const ob = createOutbox({ sendFn, logger, perChatGapMs: 0, globalPerSecond: 1000, maxConcurrent: 1000 })

      // Seed a few misc entries, then one cosmetic while the queue is still small
      // enough to accept it (below the drop-on-enqueue threshold). Then flood with
      // misc until the queue crosses QUEUE_CAP (50): the cosmetic must be evicted
      // even though m0..m2 are older and would normally be evicted first.
      for (let i = 0; i < 3; i++) ob.enqueue('A', { text: `m${i}`, mentions: [], kind: 'misc' })
      ob.enqueue('A', { react: { text: '✅' }, kind: 'cosmetic' })
      for (let i = 3; i < 50; i++) ob.enqueue('A', { text: `m${i}`, mentions: [], kind: 'misc' })

      assert.equal(ob.stats().queued, 50, 'held at cap, exactly one eviction happened')

      let now = 0
      for (let i = 0; i < 100 && ob.stats().queued > 0; i++) {
        ob.pump(now)
        await flush()
        now += 10
      }
      assert(seen.every((p) => p.react === undefined), 'the cosmetic reaction was evicted, never sent')
      assert.equal(seen[0].text, 'm0', 'older misc entries were kept over the cosmetic')
      assert.equal(seen.length, 50)
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
