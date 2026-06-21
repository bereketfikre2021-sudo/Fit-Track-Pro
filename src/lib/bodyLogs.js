export function sortBodyLogs(bodyLogs) {
  return [...(bodyLogs || [])].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.createdAt || 0) - (b.createdAt || 0)
  })
}

export function addBodyLog(bodyLogs, { date, weightKg, note = '' }) {
  const weight = parseFloat(weightKg)
  if (!date || Number.isNaN(weight) || weight <= 0) return null

  const entry = {
    id: String(Date.now()),
    date,
    weightKg: Math.round(weight * 10) / 10,
    note: note.trim(),
    createdAt: Date.now(),
  }

  return sortBodyLogs([...(bodyLogs || []), entry])
}

export function removeBodyLog(bodyLogs, id) {
  return (bodyLogs || []).filter((log) => log.id !== id)
}

export function getRecentBodyLogs(bodyLogs, limit = 30) {
  return sortBodyLogs(bodyLogs).slice(-limit)
}

export function getLatestBodyLog(bodyLogs) {
  const sorted = sortBodyLogs(bodyLogs)
  return sorted.length > 0 ? sorted[sorted.length - 1] : null
}
