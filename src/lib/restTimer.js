export const REST_PRESETS = [30, 60, 90, 120]

export function parseRestSeconds(restTime, fallback = 60) {
  if (restTime === undefined || restTime === null || restTime === '') return fallback
  const n = parseInt(String(restTime), 10)
  return Number.isNaN(n) || n <= 0 ? fallback : n
}

export function formatCountdown(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`
  return `${s}s`
}

export function getRemainingSeconds(endsAt) {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

/** Short beep + optional vibration when rest ends. */
export function playRestCompleteFeedback({ sound = true, vibrate = true } = {}) {
  if (vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([120, 60, 120])
    } catch {
      /* ignore */
    }
  }

  if (!sound || typeof window === 'undefined') return

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
    osc.onended = () => ctx.close()
  } catch {
    /* ignore — autoplay policies */
  }
}
