// Plain data. No classes, no logic beyond a tiny lookup.

export const LOBBY_WINDOW_MS = 60_000
export const MIN_PLAYERS = 2

// Ramp: both knobs ramp during play, on separate cadences.
// Min length: +1 every 1 completed round, capped at 13.
// Clock: -3s every 2 completed rounds, capped at 20s (floor).
export const RAMP_LENGTH_EVERY_ROUNDS = 1
export const RAMP_CLOCK_EVERY_ROUNDS = 2
export const RAMP_MIN_LENGTH_STEP = 1
export const RAMP_MIN_LENGTH_CAP = 13
export const RAMP_CLOCK_STEP_S = 3
export const RAMP_CLOCK_FLOOR_S = 20

export const MODES = {
  easy: { minLength: 3, clockSeconds: 40 },
  medium: { minLength: 4, clockSeconds: 35 },
  hard: { minLength: 5, clockSeconds: 30 },
}

export const DEFAULT_MODE = 'easy'

// Lives granted per player when /lives on.
export const LIVES_WHEN_ON = 3

export function getMode(name) {
  return MODES[name] || MODES[DEFAULT_MODE]
}
