import {
  EXERCISE_PHASE,
  buildSimplePhaseDefaults,
  inferExercisePhase,
  isSimplePhase,
  normalizeExercisePhase,
  packSimplePhaseExercise,
} from './exercisePhase'
import { buildExerciseTarget } from './exerciseFormat'
import { addExerciseToDay } from './workoutSchedule'
import { parsePrescription } from './sampleExercises'

export const EXERCISE_IMPORT_VERSION = 2

export const IMPORT_MODE = {
  APPEND: 'append',
  REPLACE_SCHEDULE: 'replaceSchedule',
  REPLACE_LIBRARY: 'replaceLibrary',
}

export const IMPORT_MODE_OPTIONS = [
  {
    value: IMPORT_MODE.APPEND,
    label: 'Append',
    description: 'Add new exercises and schedule entries. Existing data stays.',
  },
  {
    value: IMPORT_MODE.REPLACE_SCHEDULE,
    label: 'Replace schedule',
    description:
      'Replace exercises on days listed in the file. Library entries are added if missing.',
  },
  {
    value: IMPORT_MODE.REPLACE_LIBRARY,
    label: 'Replace library',
    description:
      'Replace your whole exercise library from the file. Schedule is rebuilt from the file.',
  },
]

export const WEEKDAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function libraryKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeDayName(day) {
  if (!day || typeof day !== 'string') return null
  const trimmed = day.trim()
  return WEEKDAY_ORDER.find((d) => d.toLowerCase() === trimmed.toLowerCase()) || null
}

export function getExerciseImportTemplate() {
  return {
    version: EXERCISE_IMPORT_VERSION,
    description:
      'FitTrack Pro import file — full weekly plan. ' +
      'Pick ANY days you want in "workoutDays" (any combination of Monday–Sunday, no fixed limit). ' +
      'Define your exercises in the "exercises" array, then assign them to your chosen days in "schedule". ' +
      'exercisePhase: warmup | main | cooldown. Import via the JSON button in the Library section.',

    // ── CHOOSE YOUR WORKOUT DAYS — any combination, any number ───────────
    // Options: "Monday" "Tuesday" "Wednesday" "Thursday" "Friday" "Saturday" "Sunday"
    // 3-day example:  ["Monday", "Wednesday", "Friday"]
    // 4-day example:  ["Monday", "Tuesday", "Thursday", "Friday"]
    // 5-day example:  ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"]
    // 6-day example:  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    // Just edit this array — any days not listed here are rest days.
    workoutDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],

    // ── Exercise Library ──────────────────────────────────────────────────
    // All exercises used in the schedule must be defined here first.
    // exercisePhase: "warmup" | "main" | "cooldown"
    exercises: [
      // ── Warm-up / Cool-down exercises ─────────────────────────────────
      { name: 'Dead Hang',               exercisePhase: 'warmup',   isTimeBased: true,  duration: '25', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Shoulders', 'Back'] },
      { name: 'Push-Ups',                exercisePhase: 'warmup',   sets: '1', reps: '5-10',            equipment: 'Bodyweight', muscleGroups: ['Chest', 'Triceps'] },
      { name: 'Bodyweight Squat',        exercisePhase: 'warmup',   sets: '1', reps: '10',              equipment: 'Bodyweight', muscleGroups: ['Legs'] },
      { name: 'Leg Swings',              exercisePhase: 'warmup',   sets: '1', reps: '10 each',         equipment: 'Bodyweight', muscleGroups: ['Hips'] },
      { name: 'Hamstring Stretch',       exercisePhase: 'cooldown', isTimeBased: true,  duration: '40', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Hamstrings'] },
      { name: 'Hip Flexor Stretch',      exercisePhase: 'cooldown', isTimeBased: true,  duration: '40', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Hips'] },

      // ── Main exercises ─────────────────────────────────────────────────
      { name: 'Lat Pulldown',            exercisePhase: 'main', sets: '3', reps: '8-10',  restTime: '75',  equipment: 'Cable',      category: 'Strength', muscleGroups: ['Back'],              difficulty: 'Beginner'     },
      { name: 'One-Arm Dumbbell Row',    exercisePhase: 'main', sets: '3', reps: '10',    restTime: '75',  equipment: 'Dumbbell',   category: 'Strength', muscleGroups: ['Back'],              difficulty: 'Intermediate' },
      { name: 'Dumbbell Bench Press',    exercisePhase: 'main', sets: '3', reps: '8-10',  restTime: '75',  equipment: 'Dumbbell',   category: 'Strength', muscleGroups: ['Chest', 'Triceps'],  difficulty: 'Intermediate' },
      { name: 'Dumbbell Shoulder Press', exercisePhase: 'main', sets: '2', reps: '8-10',  restTime: '75',  equipment: 'Dumbbell',   category: 'Strength', muscleGroups: ['Shoulders'],         difficulty: 'Beginner'     },
      { name: 'Triceps Pushdown',        exercisePhase: 'main', sets: '2', reps: '12',    restTime: '60',  equipment: 'Cable',      category: 'Strength', muscleGroups: ['Triceps'],           difficulty: 'Beginner'     },
      { name: 'Face Pull',               exercisePhase: 'main', sets: '2', reps: '15',    restTime: '45',  equipment: 'Cable',      category: 'Strength', muscleGroups: ['Shoulders', 'Back'], difficulty: 'Beginner'     },
      { name: 'Plank',                   exercisePhase: 'main', sets: '2', reps: '',      restTime: '45',  equipment: 'Bodyweight', category: 'Strength', muscleGroups: ['Core'],              difficulty: 'Beginner', isTimeBased: true, duration: '40', durationUnit: 'seconds' },
      { name: 'Goblet Squat',            exercisePhase: 'main', sets: '3', reps: '6-8',   restTime: '75',  equipment: 'Dumbbell',   category: 'Strength', muscleGroups: ['Legs'],              difficulty: 'Beginner'     },
      { name: 'Romanian Deadlift',       exercisePhase: 'main', sets: '3', reps: '8',     restTime: '90',  equipment: 'Barbell',    category: 'Strength', muscleGroups: ['Hamstrings', 'Glutes'], difficulty: 'Intermediate' },
      { name: 'Walking Lunge',           exercisePhase: 'main', sets: '2', reps: '10 each', restTime: '60', equipment: 'Dumbbell',  category: 'Strength', muscleGroups: ['Legs'],              difficulty: 'Beginner'     },
      { name: 'Leg Press',               exercisePhase: 'main', sets: '2', reps: '10',    restTime: '75',  equipment: 'Machine',    category: 'Strength', muscleGroups: ['Legs'],              difficulty: 'Beginner'     },
      { name: 'Standing Calf Raise',     exercisePhase: 'main', sets: '3', reps: '12-15', restTime: '45',  equipment: 'Machine',    category: 'Strength', muscleGroups: ['Calves'],            difficulty: 'Beginner'     },
      { name: 'Hanging Knee Raise',      exercisePhase: 'main', sets: '3', reps: '10',    restTime: '60',  equipment: 'Bodyweight', category: 'Strength', muscleGroups: ['Core'],              difficulty: 'Intermediate' },
      { name: 'Dead Bug',                exercisePhase: 'main', sets: '2', reps: '10 each', restTime: '45', equipment: 'Bodyweight', category: 'Strength', muscleGroups: ['Core'],             difficulty: 'Beginner'     },
      { name: 'Machine Chest Press',     exercisePhase: 'main', sets: '3', reps: '8-10',  restTime: '75',  equipment: 'Machine',    category: 'Strength', muscleGroups: ['Chest'],             difficulty: 'Beginner'     },
      { name: 'Machine Shoulder Press',  exercisePhase: 'main', sets: '2', reps: '10',    restTime: '60',  equipment: 'Machine',    category: 'Strength', muscleGroups: ['Shoulders'],         difficulty: 'Beginner'     },
      { name: 'Lateral Raise',           exercisePhase: 'main', sets: '2', reps: '12-15', restTime: '45',  equipment: 'Dumbbell',   category: 'Strength', muscleGroups: ['Shoulders'],         difficulty: 'Beginner'     },
      { name: 'Hammer Curl',             exercisePhase: 'main', sets: '2', reps: '10-12', restTime: '45',  equipment: 'Dumbbell',   category: 'Strength', muscleGroups: ['Biceps'],            difficulty: 'Beginner'     },
      { name: "Farmer's Carry",          exercisePhase: 'main', sets: '3', reps: '',       restTime: '60', equipment: 'Dumbbell',   category: 'Strength', muscleGroups: ['Full Body'],         difficulty: 'Intermediate', isTimeBased: true, duration: '30', durationUnit: 'seconds' },
      { name: 'Deadlift',                exercisePhase: 'main', sets: '3', reps: '5',     restTime: '120', equipment: 'Barbell',    category: 'Strength', muscleGroups: ['Back', 'Legs'],      difficulty: 'Advanced'     },
      { name: 'Bulgarian Split Squat',   exercisePhase: 'main', sets: '2', reps: '8 each', restTime: '75', equipment: 'Dumbbell',   category: 'Strength', muscleGroups: ['Legs'],              difficulty: 'Intermediate' },
      { name: 'Hip Thrust',              exercisePhase: 'main', sets: '2', reps: '10-12', restTime: '75',  equipment: 'Barbell',    category: 'Strength', muscleGroups: ['Glutes'],            difficulty: 'Intermediate' },
      { name: 'Hip Abductor',            exercisePhase: 'main', sets: '2', reps: '12-15 each', restTime: '45', equipment: 'Machine', category: 'Strength', muscleGroups: ['Glutes', 'Hips'],   difficulty: 'Beginner'     },
      { name: 'Leg Extension',           exercisePhase: 'main', sets: '2', reps: '12',    restTime: '45',  equipment: 'Machine',    category: 'Strength', muscleGroups: ['Legs'],              difficulty: 'Beginner'     },
      { name: 'Bird Dog',                exercisePhase: 'main', sets: '2', reps: '10 each', restTime: '30', equipment: 'Bodyweight', category: 'Strength', muscleGroups: ['Core', 'Back'],     difficulty: 'Beginner'     },
    ],

    // ── Weekly Schedule ───────────────────────────────────────────────────
    // Add a key for EACH day you put in "workoutDays" above.
    // You can also add rest days with empty exercises[] — they will NOT be added as workout days.
    // "prescription" is shorthand like "3×8-10" or "2×30 sec" and overrides sets+reps.
    // ADD OR REMOVE DAYS FREELY — there is no fixed limit or required structure.
    schedule: {
      Monday: {
        note: 'Upper A — Strength Base',
        exercises: [
          { name: 'Dead Hang',               prescription: '1×20-30 sec' },
          { name: 'Push-Ups',                prescription: '1×5-10' },
          { name: 'Lat Pulldown',            sets: '3', reps: '8-10' },
          { name: 'One-Arm Dumbbell Row',    sets: '3', reps: '10' },
          { name: 'Dumbbell Bench Press',    sets: '3', reps: '8-10' },
          { name: 'Dumbbell Shoulder Press', sets: '2', reps: '8-10' },
          { name: 'Triceps Pushdown',        sets: '2', reps: '12' },
          { name: 'Face Pull',               sets: '2', reps: '15' },
          { name: 'Plank',                   prescription: '2×30-45 sec' },
        ],
      },
      Tuesday: {
        note: 'Lower A — Squat Focus',
        exercises: [
          { name: 'Bodyweight Squat', prescription: '1×10' },
          { name: 'Leg Swings',       prescription: '10 each leg' },
          { name: 'Goblet Squat',            sets: '3', reps: '6-8' },
          { name: 'Romanian Deadlift',       sets: '3', reps: '8' },
          { name: 'Walking Lunge',           sets: '2', reps: '10 each' },
          { name: 'Leg Press',               sets: '2', reps: '10' },
          { name: 'Standing Calf Raise',     sets: '3', reps: '12-15' },
          { name: 'Hanging Knee Raise',      sets: '3', reps: '10' },
          { name: 'Dead Bug',                prescription: '2×10 each' },
          { name: 'Hamstring Stretch' },
        ],
      },
      Wednesday: {
        note: 'Rest Day — light walk, stretch, eat well, sleep',
        exercises: [],
      },
      Thursday: {
        note: 'Upper B — Balance & Stability',
        exercises: [
          { name: 'Dead Hang',               prescription: '1×20-30 sec' },
          { name: 'Push-Ups',                prescription: '1×5-10' },
          { name: 'Lat Pulldown',            sets: '2', reps: '10' },
          { name: 'Machine Chest Press',     sets: '3', reps: '8-10' },
          { name: 'Machine Shoulder Press',  sets: '2', reps: '10' },
          { name: 'One-Arm Dumbbell Row',    sets: '3', reps: '8-12 each' },
          { name: 'Face Pull',               sets: '2', reps: '15' },
          { name: 'Lateral Raise',           sets: '2', reps: '12-15' },
          { name: 'Hammer Curl',             sets: '2', reps: '10-12' },
          { name: "Farmer's Carry",          prescription: '3×30 sec' },
          { name: 'Plank',                   prescription: '2×30-45 sec' },
        ],
      },
      Friday: {
        note: 'Lower B — Power & Strength',
        exercises: [
          { name: 'Bodyweight Squat', prescription: '1×10' },
          { name: 'Leg Swings',       prescription: '10 each leg' },
          { name: 'Deadlift',                sets: '3', reps: '5' },
          { name: 'Bulgarian Split Squat',   sets: '2', reps: '8 each' },
          { name: 'Hip Thrust',              sets: '2', reps: '10-12' },
          { name: 'Hip Abductor',            sets: '2', reps: '12-15 each' },
          { name: 'Leg Extension',           sets: '2', reps: '12' },
          { name: 'Standing Calf Raise',     sets: '2', reps: '12-15' },
          { name: 'Bird Dog',                prescription: '2×10 each' },
          { name: 'Plank',                   prescription: '2×30-45 sec' },
          { name: 'Hip Flexor Stretch' },
        ],
      },
      // ── ADD MORE DAYS BELOW AS NEEDED ─────────────────────────────────
      // Remove the "//" to activate a day. Add it to "workoutDays" above too.
      //
      // Saturday: {
      //   note: 'Full Body — optional 5th day',
      //   exercises: [
      //     { name: 'Goblet Squat',         sets: '3', reps: '10' },
      //     { name: 'Dumbbell Bench Press', sets: '3', reps: '10' },
      //     { name: 'Romanian Deadlift',    sets: '3', reps: '10' },
      //     { name: 'Plank',                prescription: '2×30 sec' },
      //   ],
      // },
      // Sunday: {
      //   note: 'Rest or active recovery',
      //   exercises: [],
      // },
      // Wednesday: {
      //   note: 'Midweek — cardio or mobility',
      //   exercises: [
      //     { name: 'Hamstring Stretch' },
      //     { name: 'Hip Flexor Stretch' },
      //   ],
      // },
    },
  }
}

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadExerciseTemplate() {
  downloadJsonFile(getExerciseImportTemplate(), 'fittrack-exercises-template.json')
}

function stripExerciseForExport(exercise) {
  const { imageUrl, createdAt, updatedAt, id, ...rest } = exercise
  const out = { ...rest, name: exercise.name }
  if (imageUrl && !String(imageUrl).startsWith('data:')) {
    out.imageUrl = imageUrl
  }
  return out
}

function scheduledEntryToExport(scheduled, libraryById) {
  const lib = libraryById.get(scheduled.exerciseId)
  const name = lib?.name || scheduled.name
  if (!name) return null

  const entry = { name }

  if (scheduled.prescription) {
    entry.prescription = scheduled.prescription
    return entry
  }

  const differs = (a, b) => a != null && b != null && String(a) !== String(b)

  if (differs(scheduled.sets, lib?.sets)) entry.sets = scheduled.sets
  if (differs(scheduled.reps, lib?.reps)) entry.reps = scheduled.reps
  if (differs(scheduled.restTime, lib?.restTime)) entry.restTime = scheduled.restTime
  if (differs(scheduled.duration, lib?.duration)) entry.duration = scheduled.duration
  if (differs(scheduled.durationUnit, lib?.durationUnit)) {
    entry.durationUnit = scheduled.durationUnit
  }
  if (scheduled.isTimeBased && scheduled.isTimeBased !== lib?.isTimeBased) {
    entry.isTimeBased = scheduled.isTimeBased
  }

  return entry
}

/** Build v2 export payload from current app state. */
export function buildExerciseExportPayload(state) {
  const customExercises = state.customExercises || []
  const workoutSchedule = state.workoutSchedule || {}
  const workoutDays = state.profile?.workoutDays || []

  const libraryById = new Map(customExercises.map((ex) => [ex.id, ex]))

  const schedule = {}
  const daysToExport = new Set(workoutDays)
  Object.keys(workoutSchedule).forEach((day) => {
    if (normalizeDayName(day)) daysToExport.add(day)
  })

  ;[...daysToExport].sort(
    (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)
  ).forEach((day) => {
    const dayPlan = workoutSchedule[day]
    if (!dayPlan?.exercises?.length) return

    const exercises = dayPlan.exercises
      .map((scheduled) => scheduledEntryToExport(scheduled, libraryById))
      .filter(Boolean)

    if (exercises.length) {
      schedule[day] = {
        note: dayPlan.note || '',
        exercises,
      }
    }
  })

  return {
    version: EXERCISE_IMPORT_VERSION,
    exportedAt: new Date().toISOString(),
    description: 'FitTrack Pro exercise library and weekly schedule export.',
    workoutDays: WEEKDAY_ORDER.filter((d) => workoutDays.includes(d)),
    exercises: customExercises.map(stripExerciseForExport),
    schedule,
  }
}

export function downloadExerciseExport(state) {
  const payload = buildExerciseExportPayload(state)
  const date = new Date().toISOString().slice(0, 10)
  downloadJsonFile(payload, `fittrack-exercises-${date}.json`)
  return payload
}

function normalizeImportedExercise(raw, id, createdAt) {
  const name = String(raw?.name || raw?.name_en || '').trim()
  if (!name) return null

  const phase = normalizeExercisePhase(
    raw.exercisePhase || raw.phase || inferExercisePhase(raw)
  )

  if (raw.prescription && !isSimplePhase(phase)) {
    const parsed = parsePrescription(raw.prescription)
    return normalizeImportedExercise(
      {
        ...raw,
        ...parsed,
        name,
        exercisePhase: phase,
        prescription: undefined,
      },
      id,
      createdAt
    )
  }

  if (isSimplePhase(phase)) {
    const defaults = buildSimplePhaseDefaults(phase)
    return {
      ...packSimplePhaseExercise(null, {
        name,
        duration: raw.duration ?? defaults.duration,
        durationUnit: raw.durationUnit ?? defaults.durationUnit,
        notes: raw.description || raw.notes || '',
        exercisePhase: phase,
      }),
      id,
      equipment: raw.equipment || '',
      muscleGroups: Array.isArray(raw.muscleGroups) ? raw.muscleGroups : [],
      imageUrl: raw.imageUrl || '',
      instructions: raw.instructions || '',
      tips: raw.tips || '',
      createdAt,
      ...(raw.name_en ? { name_en: String(raw.name_en).trim() } : {}),
      ...(raw.name_am ? { name_am: String(raw.name_am).trim() } : {}),
    }
  }

  const sets = String(raw.sets ?? '3')
  const reps = String(raw.reps ?? '10')
  const isTimeBased = Boolean(raw.isTimeBased)
  const parsed = {
    sets,
    reps,
    isTimeBased,
    duration: String(raw.duration ?? '30'),
    durationUnit: raw.durationUnit || 'seconds',
    restTime: String(raw.restTime ?? '60'),
  }

  return {
    id,
    name,
    exercisePhase: EXERCISE_PHASE.MAIN,
    description: raw.description || '',
    sets,
    reps,
    restTime: parsed.restTime,
    equipment: raw.equipment || 'Dumbbell',
    difficulty: raw.difficulty || 'Beginner',
    muscleGroups: Array.isArray(raw.muscleGroups)
      ? raw.muscleGroups
      : Array.isArray(raw.muscleGroup)
        ? raw.muscleGroup
        : [],
    muscleGroup: Array.isArray(raw.muscleGroup)
      ? raw.muscleGroup
      : Array.isArray(raw.muscleGroups)
        ? raw.muscleGroups
        : [],
    splits: Array.isArray(raw.splits) ? raw.splits : [],
    goals: Array.isArray(raw.goals) ? raw.goals : [],
    category: raw.category || 'Strength',
    isTimeBased,
    duration: parsed.duration,
    durationUnit: parsed.durationUnit,
    imageUrl: raw.imageUrl || '',
    instructions: raw.instructions || '',
    tips: raw.tips || '',
    target: raw.target || buildExerciseTarget(parsed),
    createdAt,
    ...(raw.name_en ? { name_en: String(raw.name_en).trim() } : {}),
    ...(raw.name_am ? { name_am: String(raw.name_am).trim() } : {}),
  }
}

function isLibraryDefinition(raw) {
  if (!raw?.name) return false
  return (
    raw.exercisePhase ||
    raw.phase ||
    raw.sets != null ||
    raw.reps != null ||
    raw.duration != null ||
    raw.prescription ||
    raw.isTimeBased != null ||
    raw.equipment ||
    raw.muscleGroups
  )
}

function collectLibraryDefinitions(parsed, warnings) {
  const defs = []
  const seen = new Set()

  const pushDef = (raw) => {
    const name = String(raw?.name || '').trim()
    if (!name) return
    const key = libraryKey(name)
    if (seen.has(key)) return
    seen.add(key)
    defs.push(raw)
  }

  const list = Array.isArray(parsed?.exercises) ? parsed.exercises : []
  list.forEach((item) => pushDef(item))

  const schedule = parsed?.schedule
  if (schedule && typeof schedule === 'object') {
    Object.entries(schedule).forEach(([day, dayPlan]) => {
      if (!normalizeDayName(day)) {
        warnings.push(`Skipped unknown day in schedule: "${day}"`)
        return
      }
      const items = dayPlan?.exercises || dayPlan?.items || []
      if (!Array.isArray(items)) return

      items.forEach((item) => {
        if (item?.exercise && typeof item.exercise === 'object') {
          pushDef(item.exercise)
          return
        }
        if (isLibraryDefinition(item)) {
          pushDef(item)
        }
      })
    })
  }

  return defs
}

function buildScheduleAssignments(parsed, warnings) {
  const assignments = []

  const pushAssignment = (dayRaw, item) => {
    const day = normalizeDayName(dayRaw)
    if (!day) {
      warnings.push(`Skipped unknown day: "${dayRaw}"`)
      return
    }

    const ref = item?.exercise && typeof item.exercise === 'object' ? item.exercise : item
    const name = String(ref?.name || item?.name || '').trim()
    if (!name) {
      warnings.push(`Skipped schedule entry on ${day} (missing exercise name)`)
      return
    }

    assignments.push({
      day,
      name,
      note: item?.dayNote,
      prescription: item?.prescription || ref?.prescription,
      sets: item?.sets ?? ref?.sets,
      reps: item?.reps ?? ref?.reps,
      isTimeBased: item?.isTimeBased ?? ref?.isTimeBased,
      duration: item?.duration ?? ref?.duration,
      durationUnit: item?.durationUnit ?? ref?.durationUnit,
      restTime: item?.restTime ?? ref?.restTime,
    })
  }

  const schedule = parsed?.schedule
  if (schedule && typeof schedule === 'object') {
    Object.entries(schedule).forEach(([day, dayPlan]) => {
      const items = dayPlan?.exercises || dayPlan?.items || []
      if (!Array.isArray(items)) return
      items.forEach((item) => pushAssignment(day, item))
    })
  }

  const list = Array.isArray(parsed?.exercises) ? parsed.exercises : []
  list.forEach((ex) => {
    if (!Array.isArray(ex.assignToDays)) return
    ex.assignToDays.forEach((dayRaw) => {
      pushAssignment(dayRaw, {
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        prescription: ex.prescription,
        isTimeBased: ex.isTimeBased,
        duration: ex.duration,
        durationUnit: ex.durationUnit,
        restTime: ex.restTime,
      })
    })
  })

  return assignments
}

function scheduleDetailsFromAssignment(assignment, libraryExercise) {
  if (assignment.prescription) {
    const parsed = parsePrescription(assignment.prescription)
    return {
      sets: parsed.sets,
      reps: parsed.reps,
      isTimeBased: parsed.isTimeBased,
      duration: parsed.duration,
      durationUnit: parsed.durationUnit,
    }
  }

  return {
    sets: assignment.sets ?? libraryExercise.sets,
    reps: assignment.reps ?? libraryExercise.reps,
    isTimeBased: assignment.isTimeBased ?? libraryExercise.isTimeBased,
    duration: assignment.duration ?? libraryExercise.duration,
    durationUnit: assignment.durationUnit ?? libraryExercise.durationUnit,
    restTime: assignment.restTime ?? libraryExercise.restTime,
  }
}

function mergeWorkoutDays(existingDays, parsed, scheduleDays) {
  const set = new Set(existingDays || [])

  if (Array.isArray(parsed?.workoutDays)) {
    parsed.workoutDays.forEach((d) => {
      const day = normalizeDayName(d)
      if (day) set.add(day)
    })
  }

  scheduleDays.forEach((d) => set.add(d))

  return WEEKDAY_ORDER.filter((d) => set.has(d))
}

function registerLibrary(exerciseDefs, existingExercises, { replace = false } = {}) {
  const byName = new Map()
  let customExercises = replace ? [] : [...(existingExercises || [])]

  if (!replace) {
    customExercises.forEach((ex) => {
      byName.set(libraryKey(ex.name), ex)
    })
  }

  let exercisesAdded = 0
  const baseTime = Date.now()

  exerciseDefs.forEach((raw, index) => {
    const key = libraryKey(raw.name)
    if (!replace && byName.has(key)) return

    const id = `import-lib-${baseTime}-${index}`
    const normalized = normalizeImportedExercise(raw, id, baseTime + index)
    if (!normalized) return

    if (replace && byName.has(key)) {
      const existingIdx = customExercises.findIndex((ex) => libraryKey(ex.name) === key)
      if (existingIdx >= 0) customExercises.splice(existingIdx, 1)
    }

    byName.set(key, normalized)
    customExercises.push(normalized)
    exercisesAdded += 1
  })

  return { customExercises, byName, exercisesAdded }
}

function applyScheduleToState(
  workoutSchedule,
  customExercises,
  byName,
  assignments,
  dayNotesFromSchedule,
  warnings
) {
  let schedule = { ...workoutSchedule }
  let scheduleEntriesAdded = 0

  assignments.forEach((assignment) => {
    const { day, name } = assignment
    const lib = byName.get(libraryKey(name))
    if (!lib) {
      warnings.push(`Could not schedule "${name}" on ${day} — not found in library`)
      return
    }

    const details = scheduleDetailsFromAssignment(assignment, lib)
    const next = addExerciseToDay(schedule, day, customExercises, lib.id, details)
    if (next) {
      schedule = next
      scheduleEntriesAdded += 1
    }
  })

  Object.entries(dayNotesFromSchedule).forEach(([day, note]) => {
    schedule[day] = {
      ...(schedule[day] || { note: `${day} workout`, exercises: [] }),
      note,
    }
  })

  return { workoutSchedule: schedule, scheduleEntriesAdded }
}

/** Normalize v1 (exercises only) and v2 (exercises + schedule + days). */
export function normalizeImportPayload(parsed) {
  const warnings = []

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file: expected a JSON object')
  }

  if (Array.isArray(parsed)) {
    return normalizeImportPayload({ version: 1, exercises: parsed })
  }

  const exerciseDefs = collectLibraryDefinitions(parsed, warnings)
  const assignments = buildScheduleAssignments(parsed, warnings)

  if (exerciseDefs.length === 0 && assignments.length === 0) {
    throw new Error('No exercises or schedule entries found in file')
  }

  const scheduleDays = [
    ...new Set(assignments.map((a) => a.day)),
    ...Object.keys(parsed.schedule || {})
      .map(normalizeDayName)
      .filter(Boolean),
  ]

  return {
    exerciseDefs,
    assignments,
    scheduleDays,
    dayNotesFromSchedule: extractDayNotes(parsed),
    workoutDaysFromFile: (parsed.workoutDays || [])
      .map(normalizeDayName)
      .filter(Boolean),
    warnings,
  }
}

function extractDayNotes(parsed) {
  const notes = {}
  const schedule = parsed?.schedule
  if (!schedule || typeof schedule !== 'object') return notes

  Object.entries(schedule).forEach(([dayRaw, plan]) => {
    const day = normalizeDayName(dayRaw)
    if (day && plan?.note) notes[day] = plan.note
  })
  return notes
}

/**
 * Import exercises + optional weekly schedule into app state.
 * Adds missing workout days from JSON schedule automatically.
 */
export function applyExerciseImport(state, parsed, mode = IMPORT_MODE.APPEND) {
  const warnings = []
  const {
    exerciseDefs,
    assignments,
    scheduleDays,
    dayNotesFromSchedule,
    workoutDaysFromFile,
    warnings: parseWarnings,
  } = normalizeImportPayload(parsed)

  warnings.push(...parseWarnings)

  const assignmentStubs = assignments
    .filter((a) => !exerciseDefs.some((d) => libraryKey(d.name) === libraryKey(a.name)))
    .map((a) => ({
      name: a.name,
      prescription: a.prescription,
      sets: a.sets,
      reps: a.reps,
      isTimeBased: a.isTimeBased,
      duration: a.duration,
      durationUnit: a.durationUnit,
      restTime: a.restTime,
    }))

  const allDefs = [...exerciseDefs, ...assignmentStubs]
  const replaceLibrary = mode === IMPORT_MODE.REPLACE_LIBRARY
  const replaceSchedule = mode === IMPORT_MODE.REPLACE_SCHEDULE

  const { customExercises, byName, exercisesAdded } = registerLibrary(
    allDefs,
    state.customExercises || [],
    { replace: replaceLibrary }
  )

  let workoutSchedule = replaceLibrary ? {} : { ...(state.workoutSchedule || {}) }

  if (replaceSchedule || replaceLibrary) {
    const daysToReset = new Set(scheduleDays)
    daysToReset.forEach((day) => {
      workoutSchedule[day] = {
        note: dayNotesFromSchedule[day] || workoutSchedule[day]?.note || `${day} workout`,
        exercises: [],
      }
    })
  } else {
    scheduleDays.forEach((day) => {
      if (!workoutSchedule[day]) {
        workoutSchedule[day] = {
          note: dayNotesFromSchedule[day] || `${day} workout`,
          exercises: [],
        }
      } else if (dayNotesFromSchedule[day]) {
        workoutSchedule[day] = {
          ...workoutSchedule[day],
          note: dayNotesFromSchedule[day],
        }
      }
    })
  }

  const { workoutSchedule: nextSchedule, scheduleEntriesAdded } = applyScheduleToState(
    workoutSchedule,
    customExercises,
    byName,
    assignments,
    dayNotesFromSchedule,
    warnings
  )
  workoutSchedule = nextSchedule

  const existingDays = state.profile?.workoutDays || []
  const workoutDays = mergeWorkoutDays(existingDays, parsed, scheduleDays)

  const daysAdded = workoutDays.filter((d) => !existingDays.includes(d)).length

  if (replaceLibrary && !assignments.length && !scheduleDays.length) {
    warnings.push('Library replaced; no schedule in file — workout days were kept empty.')
  }

  return {
    customExercises,
    workoutSchedule,
    profile: {
      ...state.profile,
      workoutDays,
    },
    summary: {
      exercisesAdded,
      scheduleEntriesAdded,
      daysAdded,
      mode,
      warnings,
    },
  }
}

/** @deprecated Use applyExerciseImport — library-only parse */
export function parseExerciseImportPayload(parsed) {
  const { exerciseDefs } = normalizeImportPayload(parsed)
  const baseTime = Date.now()
  return exerciseDefs.map((raw, index) => {
    const id = `${baseTime}-${index}`
    return normalizeImportedExercise(raw, id, baseTime + index)
  })
}

export function mergeImportedExercises(existing, imported) {
  return [...(existing || []), ...imported]
}
