import { compareWeekOverWeek } from './workoutInsights'
import { getWorkoutStreaks } from './streaks'

function formatDelta(value) {
  if (value > 0) return `+${value}`
  if (value < 0) return `${value}`
  return '0'
}

export function formatWeeklyReportText(state) {
  const { current, previous, delta, muscleChanges } = compareWeekOverWeek(state)
  const streaks = getWorkoutStreaks(state)
  const lines = [
    'FitTrack Pro — Weekly Report',
    current.weekRangeLabel,
    '',
    'Summary',
    `Days worked: ${current.daysWorkedCount} (${formatDelta(delta.daysWorked)} vs last week)`,
    `Exercises completed: ${current.exercisesCompletedCount} (${formatDelta(delta.exercisesCompleted)} vs last week)`,
    `Current streak: ${streaks.current} day${streaks.current !== 1 ? 's' : ''}`,
    `Longest streak: ${streaks.longest} day${streaks.longest !== 1 ? 's' : ''}`,
    '',
  ]

  if (current.planDaysWorked.length) {
    lines.push(`Plan days: ${current.planDaysWorked.join(', ')}`, '')
  }

  if (current.targetMuscles.length) {
    lines.push('Muscles worked this week:')
    current.targetMuscles.forEach(({ muscle, count }) => {
      lines.push(`  · ${muscle} ×${count}`)
    })
    lines.push('')
  }

  if (muscleChanges.length) {
    lines.push('Week-over-week muscle changes:')
    muscleChanges.forEach(({ muscle, delta: d }) => {
      lines.push(`  · ${muscle}: ${formatDelta(d)}`)
    })
    lines.push('')
  }

  lines.push(
    `Last week (${previous.weekRangeLabel}): ${previous.daysWorkedCount} days, ${previous.exercisesCompletedCount} exercises`
  )

  return lines.join('\n')
}

export function downloadWeeklyReport(state) {
  const text = formatWeeklyReportText(state)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fittrack-report-${new Date().toISOString().slice(0, 10)}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function shareWeeklyReport(state) {
  const text = formatWeeklyReportText(state)
  if (navigator.share) {
    await navigator.share({
      title: 'FitTrack Pro Weekly Report',
      text,
    })
    return 'shared'
  }
  downloadWeeklyReport(state)
  return 'downloaded'
}

export function printWeeklyReport(state) {
  const { current, previous, delta } = compareWeekOverWeek(state)
  const streaks = getWorkoutStreaks(state)
  const muscleRows = current.targetMuscles
    .map(
      ({ muscle, count }) =>
        `<tr><td>${muscle}</td><td style="text-align:right">${count}</td></tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>FitTrack Pro Report</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #111; }
  h1 { font-size: 1.25rem; } .muted { color: #666; font-size: 0.875rem; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
  .stat { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; }
  .stat strong { font-size: 1.5rem; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  td { padding: 0.35rem 0; border-bottom: 1px solid #eee; }
</style></head><body>
  <h1>FitTrack Pro — Weekly Report</h1>
  <p class="muted">${current.weekRangeLabel}</p>
  <div class="grid">
    <div class="stat"><span class="muted">Days worked</span><strong>${current.daysWorkedCount}</strong><span class="muted">${formatDelta(delta.daysWorked)} vs last week</span></div>
    <div class="stat"><span class="muted">Exercises</span><strong>${current.exercisesCompletedCount}</strong><span class="muted">${formatDelta(delta.exercisesCompleted)} vs last week</span></div>
    <div class="stat"><span class="muted">Streak</span><strong>${streaks.current}</strong><span class="muted">days (best ${streaks.longest})</span></div>
    <div class="stat"><span class="muted">Last week</span><strong>${previous.exercisesCompletedCount}</strong><span class="muted">exercises</span></div>
  </div>
  ${muscleRows ? `<h2>Muscles worked</h2><table>${muscleRows}</table>` : '<p class="muted">No muscle data logged this week.</p>'}
  <p class="muted" style="margin-top:2rem">Generated ${new Date().toLocaleString()}</p>
</body></html>`

  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) {
    downloadWeeklyReport(state)
    return false
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
  return true
}
