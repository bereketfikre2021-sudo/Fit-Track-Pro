export const HOLD_READY_SECONDS = 5

export function parseHoldSeconds(exercise, fallback = 30) {
  const duration = exercise?.duration
  if (duration === undefined || duration === null || duration === '') return fallback
  const n = parseInt(String(duration), 10)
  if (Number.isNaN(n) || n <= 0) return fallback
  const unit = exercise?.durationUnit || 'seconds'
  return unit === 'minutes' ? n * 60 : n
}

export function createHoldTimer(holdSeconds, label = '') {
  const sec = Math.max(1, holdSeconds)
  return {
    label,
    holdSeconds: sec,
    readyEndsAt: Date.now() + HOLD_READY_SECONDS * 1000,
    readyTotalSeconds: HOLD_READY_SECONDS,
    phase: 'ready',
  }
}

export function getHoldReadyRemaining(timer) {
  if (!timer || timer.phase !== 'ready') return 0
  return Math.max(0, Math.ceil((timer.readyEndsAt - Date.now()) / 1000))
}

export function getHoldRemaining(holdEndsAt) {
  return Math.max(0, Math.ceil((holdEndsAt - Date.now()) / 1000))
}
