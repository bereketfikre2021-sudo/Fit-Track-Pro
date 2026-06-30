import { getWeeklyWorkoutReport } from './workoutInsights'

/**
 * % of profile workout days with at least one completed exercise this week.
 * Returns null if no workout days are configured.
 */
export function getWeeklyConsistency(state, weekOffset = 0) {
  const report = getWeeklyWorkoutReport(state, weekOffset)
  const plannedDays = (state.profile?.workoutDays || []).filter((day) => {
    const schedule = state.workoutSchedule?.[day]
    return (schedule?.exercises?.length ?? 0) > 0
  })

  if (plannedDays.length === 0) {
    const allPlanned = state.profile?.workoutDays || []
    if (allPlanned.length === 0) return null
    const completed = allPlanned.filter((day) => report.planDaysWorked.includes(day))
    return {
      percent: Math.round((completed.length / allPlanned.length) * 100),
      completedDays: completed.length,
      plannedDays: allPlanned.length,
      label: `${completed.length}/${allPlanned.length} plan days`,
      weekRangeLabel: report.weekRangeLabel,
    }
  }

  const completed = plannedDays.filter((day) => report.planDaysWorked.includes(day))
  return {
    percent: Math.round((completed.length / plannedDays.length) * 100),
    completedDays: completed.length,
    plannedDays: plannedDays.length,
    label: `${completed.length}/${plannedDays.length} scheduled days`,
    weekRangeLabel: report.weekRangeLabel,
  }
}
