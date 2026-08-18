import test from 'node:test'
import assert from 'node:assert/strict'
import { createRiddleGame } from './riddle.js'

const testRiddles = [
  {
    id: 'r1',
    riddle: 'I speak without a mouth. What am I?',
    answer: 'An Echo',
    aliases: ['echo', 'an echo', 'the echo', 'echos'],
    hint: 'E _ _ _ (Sound reflection)',
  },
  {
    id: 'r2',
    riddle: 'What gets wet while drying?',
    answer: 'A Towel',
    aliases: ['towel', 'towels'],
    hint: 'T _ _ _ _ (Fabric)',
  },
]

test('riddle engine: initialization and first tick', () => {
  const game = createRiddleGame({
    riddles: testRiddles,
    count: 2,
    clockSeconds: 20,
    hintSeconds: 10,
    intermissionSeconds: 3,
    now: 1000,
  })

  assert.equal(game.state, 'active')
  assert.equal(game.currentIndex(), 0)
  assert.equal(game.totalRounds(), 2)

  const events = game.tick(1000)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'riddle_start')
  assert.equal(events[0].round, 1)
  assert.equal(events[0].deadline, 21000)
})

test('riddle engine: fires hint at 10s remaining', () => {
  const game = createRiddleGame({
    riddles: testRiddles,
    count: 2,
    clockSeconds: 20,
    hintSeconds: 10,
    intermissionSeconds: 3,
    now: 1000,
  })

  game.tick(1000) // start
  const noHint = game.tick(5000) // 16s remaining
  assert.equal(noHint.length, 0)

  const hintEvents = game.tick(11000) // 10s remaining
  assert.equal(hintEvents.length, 1)
  assert.equal(hintEvents[0].type, 'riddle_hint')
  assert.equal(hintEvents[0].hint, 'E _ _ _ (Sound reflection)')

  // Hint does not fire twice
  const again = game.tick(12000)
  assert.equal(again.length, 0)
})

test('riddle engine: correct submission and progression to next round', () => {
  const game = createRiddleGame({
    riddles: testRiddles,
    count: 2,
    clockSeconds: 20,
    hintSeconds: 10,
    intermissionSeconds: 3,
    now: 1000,
  })

  game.tick(1000) // start

  // Wrong guess is ignored
  const wrongRes = game.submit('player1', 'a guitar', 2000)
  assert.equal(wrongRes.length, 0)

  // Correct guess
  const solveRes = game.submit('player1', 'echo', 3000)
  assert.equal(solveRes.length, 1)
  assert.equal(solveRes[0].type, 'riddle_solved')
  assert.equal(solveRes[0].player, 'player1')
  assert.equal(solveRes[0].score, 1)
  assert.equal(game.state, 'intermission')

  // Tick during intermission
  const interEvents = game.tick(4000)
  assert.equal(interEvents.length, 0)

  // Advance after intermission (3000 + 3000 = 6000)
  const round2Events = game.tick(6000)
  assert.equal(round2Events.length, 1)
  assert.equal(round2Events[0].type, 'riddle_start')
  assert.equal(round2Events[0].round, 2)
  assert.equal(game.state, 'active')
})

test('riddle engine: timeout on unanswered riddle and game over', () => {
  const game = createRiddleGame({
    riddles: testRiddles,
    count: 1,
    clockSeconds: 20,
    hintSeconds: 10,
    intermissionSeconds: 3,
    now: 1000,
  })

  game.tick(1000) // start

  // Tick past deadline (1000 + 20000 = 21000)
  const timeoutEvents = game.tick(21000)
  assert.equal(timeoutEvents.length, 1)
  assert.equal(timeoutEvents[0].type, 'riddle_timeout')
  assert.equal(timeoutEvents[0].answer, 'An Echo')
  assert.equal(game.state, 'intermission')

  // Intermission ends (21000 + 3000 = 24000) -> Game Over
  const overEvents = game.tick(24000)
  assert.equal(overEvents.length, 1)
  assert.equal(overEvents[0].type, 'riddle_game_over')
  assert.equal(game.state, 'over')
})

test('riddle engine: whitespace and article flexibility', () => {
  const game = createRiddleGame({
    riddles: [
      {
        id: 'r3',
        riddle: 'Where do you buy stamps?',
        answer: 'Post Office',
        aliases: ['post office', 'postoffice', 'the post office'],
        hint: 'P _ _ _   _ _ _ _ _ _',
      },
    ],
    count: 1,
    clockSeconds: 20,
    hintSeconds: 10,
    intermissionSeconds: 3,
    now: 1000,
  })

  game.tick(1000)

  // Accepts with multiple spaces, articles, or without spaces
  const res1 = game.submit('p1', '   the    post    office   ', 2000)
  assert.equal(res1.length, 1)
  assert.equal(res1[0].type, 'riddle_solved')
  assert.equal(res1[0].player, 'p1')
})


