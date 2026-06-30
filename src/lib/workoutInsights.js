import { isAlignedWorkoutCompletion } from './calendarDay'

const WEEKDAY_ORDER = [

  'Monday',

  'Tuesday',

  'Wednesday',

  'Thursday',

  'Friday',

  'Saturday',

  'Sunday',

]



export function resolveCompletedExercise(entry, customExercises, workoutSchedule) {

  const dayPlan = workoutSchedule[entry.day]

  const scheduled = dayPlan?.exercises?.find((ex) => ex.id === entry.exerciseId)



  if (scheduled) {

    const library = scheduled.exerciseId

      ? customExercises.find((ex) => ex.id === scheduled.exerciseId)

      : null

    const details = library || scheduled

    return {

      scheduled,

      details,

      name: scheduled.name || details?.name || 'Unknown Exercise',

    }

  }



  const library = customExercises.find((ex) => ex.id === entry.exerciseId)

  return {

    scheduled: null,

    details: library,

    name: library?.name || 'Unknown Exercise',

  }

}



export function getMuscleGroupsFromResolved(resolved) {

  return resolved?.details?.muscleGroups || []

}



function getMondayWeekStart(referenceDate = new Date(), weekOffset = 0) {

  const d = new Date(referenceDate)

  const day = d.getDay()

  const offset = day === 0 ? -6 : 1 - day

  d.setDate(d.getDate() + offset + weekOffset * 7)

  d.setHours(0, 0, 0, 0)

  return d

}



function parseDateString(dateStr) {

  const [y, m, day] = dateStr.split('-').map(Number)

  return new Date(y, m - 1, day)

}



function toDateString(date) {

  const y = date.getFullYear()

  const m = String(date.getMonth() + 1).padStart(2, '0')

  const d = String(date.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}`

}



/**

 * Report for a calendar week (Monday–Sunday).

 * @param {number} weekOffset 0 = current week, -1 = previous week, etc.

 */

export function getWeeklyWorkoutReport(state, weekOffset = 0) {

  const completedExercises = state.completedExercises || {}

  const customExercises = state.customExercises || []

  const workoutSchedule = state.workoutSchedule || {}

  const profileWorkoutDays = state.profile?.workoutDays || []



  const weekStart = getMondayWeekStart(new Date(), weekOffset)

  const weekEnd = new Date(weekStart)

  weekEnd.setDate(weekEnd.getDate() + 7)



  const muscleCounts = {}

  const calendarDatesWorked = new Set()

  const planDaysWorked = new Set()

  let exercisesCompletedCount = 0



  Object.values(completedExercises).forEach((entry) => {
    if (!entry?.date) return

    const entryDate = parseDateString(entry.date)

    if (entryDate < weekStart || entryDate >= weekEnd) return

    if (entry.skipped || !entry.completedAt) return

    exercisesCompletedCount += 1

    planDaysWorked.add(entry.day)

    if (!isAlignedWorkoutCompletion(entry, profileWorkoutDays)) return

    calendarDatesWorked.add(entry.date)



    const resolved = resolveCompletedExercise(entry, customExercises, workoutSchedule)

    getMuscleGroupsFromResolved(resolved).forEach((muscle) => {

      muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1

    })

  })



  const targetMuscles = Object.entries(muscleCounts)

    .sort((a, b) => b[1] - a[1])

    .map(([muscle, count]) => ({ muscle, count }))



  const daysThisWeek = WEEKDAY_ORDER.map((label, index) => {

    const d = new Date(weekStart)

    d.setDate(d.getDate() + index)

    const dateStr = toDateString(d)

    return {

      label,

      dateStr,

      worked: calendarDatesWorked.has(dateStr),

      isScheduledDay: profileWorkoutDays.includes(label),

      planDayCompleted: planDaysWorked.has(label),

    }

  })



  const weekRangeLabel = `${weekStart.toLocaleDateString('en-US', {

    month: 'short',

    day: 'numeric',

  })} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString('en-US', {

    month: 'short',

    day: 'numeric',

  })}`



  return {

    weekRangeLabel,

    weekOffset,

    targetMuscles,

    muscleCounts,

    calendarDatesWorked: [...calendarDatesWorked].sort(),

    planDaysWorked: [...planDaysWorked].sort(

      (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)

    ),

    daysWorkedCount: calendarDatesWorked.size,

    exercisesCompletedCount,

    daysThisWeek,

  }

}



/**
 * Total volume (kg) and sets completed for a given week.
 * Volume = sum of (weightKg × reps) per logged set.
 */
export function getWeeklyVolume(state, weekOffset = 0) {
  const completedExercises = state.completedExercises || {}

  const weekStart = getMondayWeekStart(new Date(), weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  let totalVolumeKg = 0
  let totalSets = 0
  let totalReps = 0

  Object.values(completedExercises).forEach((entry) => {
    if (!entry?.date || entry.skipped || !entry.completedAt) return
    const entryDate = parseDateString(entry.date)
    if (entryDate < weekStart || entryDate >= weekEnd) return

    const sets = entry.sets || []
    sets.forEach((s) => {
      const kg = parseFloat(s.weightKg)
      const reps = parseInt(s.reps, 10)
      if (!isNaN(kg) && kg > 0 && !isNaN(reps) && reps > 0) {
        totalVolumeKg += kg * reps
        totalSets += 1
        totalReps += reps
      } else if (!isNaN(reps) && reps > 0) {
        totalSets += 1
        totalReps += reps
      }
    })
  })

  return { totalVolumeKg: Math.round(totalVolumeKg), totalSets, totalReps }
}

export function compareWeekOverWeek(state) {  const current = getWeeklyWorkoutReport(state, 0)

  const previous = getWeeklyWorkoutReport(state, -1)



  const allMuscles = new Set([

    ...Object.keys(current.muscleCounts),

    ...Object.keys(previous.muscleCounts),

  ])



  const muscleChanges = [...allMuscles]

    .map((muscle) => ({

      muscle,

      current: current.muscleCounts[muscle] || 0,

      previous: previous.muscleCounts[muscle] || 0,

      delta: (current.muscleCounts[muscle] || 0) - (previous.muscleCounts[muscle] || 0),

    }))

    .filter((m) => m.delta !== 0 || m.current > 0)

    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))



  return {

    current,

    previous,

    delta: {

      daysWorked: current.daysWorkedCount - previous.daysWorkedCount,

      exercisesCompleted:

        current.exercisesCompletedCount - previous.exercisesCompletedCount,

    },

    muscleChanges,

  }

}


