import { EXERCISE_PHASE, packSimplePhaseExercise } from './exercisePhase'
import { addExerciseToDay } from './workoutSchedule'
import { buildExerciseTarget } from './exerciseFormat'

/** Active training days in Bereket's program (Wednesday = rest). */
export const PROGRAM_WORKOUT_DAYS = [
  'Monday',
  'Tuesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const PROGRAM = [
  {
    day: 'Monday',
    title: 'Upper (Strength Base)',
    note: 'Build strength evenly. No compensation.',
    exercises: [
      { name: 'Dead Hang', prescription: '2×20–30 sec', equipment: 'Bodyweight', muscles: ['Back', 'Grip'], phase: EXERCISE_PHASE.WARMUP },
      { name: 'Lat Pulldown (neutral grip)', prescription: '3×8–10', equipment: 'Cable', muscles: ['Lats', 'Back'] },
      { name: 'Floor Dumbbell Press', prescription: '4×8–10', equipment: 'Dumbbell', muscles: ['Chest', 'Triceps'] },
      { name: 'Seated Cable Row', prescription: '3×8–10', equipment: 'Cable', muscles: ['Back', 'Biceps'] },
      { name: 'DB Shoulder Press', prescription: '3×8–10', equipment: 'Dumbbell', muscles: ['Shoulders', 'Triceps'], tips: 'Controlled, not to failure' },
      { name: 'Rope Tricep Pushdown', prescription: '2×12', equipment: 'Cable', muscles: ['Triceps'] },
      { name: 'Face Pulls', prescription: '2×15', equipment: 'Cable', muscles: ['Rear Delts', 'Upper Back'] },
    ],
  },
  {
    day: 'Tuesday',
    title: 'Lower (Growth)',
    note: 'Eat + build base.',
    exercises: [
      { name: 'Goblet Squat', prescription: '4×6–8', equipment: 'Dumbbell', muscles: ['Quads', 'Glutes'] },
      { name: 'Romanian Deadlift', prescription: '3×8', equipment: 'Barbell', muscles: ['Hamstrings', 'Glutes'] },
      { name: 'Walking Lunges', prescription: '2×10 each', equipment: 'Dumbbell', muscles: ['Quads', 'Glutes'] },
      { name: 'Leg Press', prescription: '2×10', equipment: 'Machine', muscles: ['Quads', 'Glutes'], optional: true },
      { name: 'Calf Raise', prescription: '3×12–15', equipment: 'Machine', muscles: ['Calves'] },
      { name: 'Dead Bug', prescription: '2×10 each', equipment: 'Bodyweight', muscles: ['Core'] },
    ],
  },
  {
    day: 'Thursday',
    title: 'Upper (Imbalance Fix)',
    note: 'Fix left side. Control movement.',
    exercises: [
      { name: 'Dead Hang', prescription: '2×30 sec', equipment: 'Bodyweight', muscles: ['Back', 'Grip'], phase: EXERCISE_PHASE.WARMUP },
      { name: 'One-Arm Cable Row', prescription: '3×10 each', equipment: 'Cable', muscles: ['Back', 'Biceps'] },
      { name: 'Wall / Counter Push-Up', prescription: '3×10–12', equipment: 'Bodyweight', muscles: ['Chest', 'Triceps'] },
      { name: 'Face Pulls', prescription: '2×15', equipment: 'Cable', muscles: ['Rear Delts', 'Upper Back'], tips: 'Light weight' },
      { name: 'Lateral Raise', prescription: '2×12–15', equipment: 'Dumbbell', muscles: ['Shoulders'], tips: 'Light pump only' },
      { name: 'Farmer Carry', prescription: '3×30 sec', equipment: 'Dumbbell', muscles: ['Grip', 'Core'] },
      { name: 'Hammer Curl', prescription: '2×10–12', equipment: 'Dumbbell', muscles: ['Biceps'], tips: 'Controlled, no failure' },
    ],
  },
  {
    day: 'Friday',
    title: 'Lower (Power + Strength)',
    note: 'Build strength base.',
    exercises: [
      { name: 'Deadlift', prescription: '3×5', equipment: 'Barbell', muscles: ['Hamstrings', 'Glutes', 'Back'] },
      { name: 'Bulgarian Split Squat', prescription: '3×8 each', equipment: 'Dumbbell', muscles: ['Quads', 'Glutes'] },
      { name: 'Leg Extension', prescription: '2×12', equipment: 'Machine', muscles: ['Quads'] },
      { name: 'Dumbbell Glute Bridge', prescription: '3×10–12', equipment: 'Dumbbell', muscles: ['Glutes', 'Hamstrings'] },
      { name: 'Calf Raise', prescription: '3×15', equipment: 'Machine', muscles: ['Calves'] },
      { name: 'Plank', prescription: '2×45 sec', equipment: 'Bodyweight', muscles: ['Core'] },
    ],
  },
  {
    day: 'Saturday',
    title: 'Optional (Weak Point Full Body)',
    note: 'Fix weak links. Don\'t drain energy. Skip entirely if tired — or only cable chest press, one-arm row, and face pulls.',
    exercises: [
      { name: 'Dead Hang', prescription: '2×20–30 sec', equipment: 'Bodyweight', muscles: ['Back', 'Grip'], phase: EXERCISE_PHASE.WARMUP },
      { name: 'Single-Arm Cable Chest Press', prescription: '2×10 each', equipment: 'Cable', muscles: ['Chest', 'Triceps'] },
      { name: 'One-Arm Cable Row', prescription: '2×10 each', equipment: 'Cable', muscles: ['Back', 'Biceps'] },
      { name: 'Goblet Squat', prescription: '2×10–12', equipment: 'Dumbbell', muscles: ['Quads', 'Glutes'] },
      { name: 'Face Pulls', prescription: '2×15', equipment: 'Cable', muscles: ['Rear Delts', 'Upper Back'], tips: 'Very light' },
      { name: 'Farmer Carry', prescription: '2×30 sec', equipment: 'Dumbbell', muscles: ['Grip', 'Core'] },
      { name: 'Plank', prescription: '2×45 sec', equipment: 'Bodyweight', muscles: ['Core'] },
    ],
  },
]

function normalizePrescription(prescription) {
  return prescription.replace(/–/g, '-').trim()
}

/** Parse strings like 3×8-10, 2×20-30 sec, 2×10 each */
export function parsePrescription(prescription) {
  const p = normalizePrescription(prescription)

  const timeRange = p.match(/^(\d+)×(\d+)(?:-(\d+))?\s*sec(?:onds)?$/i)
  if (timeRange) {
    const sets = timeRange[1]
    const low = parseInt(timeRange[2], 10)
    const high = timeRange[3] ? parseInt(timeRange[3], 10) : low
    const duration = String(Math.round((low + high) / 2))
    return {
      sets,
      reps: '',
      isTimeBased: true,
      duration,
      durationUnit: 'seconds',
      restTime: '45',
    }
  }

  const repRange = p.match(/^(\d+)×(\d+(?:-\d+)?)(?:\s+each)?$/i)
  if (repRange) {
    const reps = repRange[2] + (/\s+each$/i.test(p) ? ' each' : '')
    return {
      sets: repRange[1],
      reps,
      isTimeBased: false,
      duration: '30',
      durationUnit: 'seconds',
      restTime: '60',
    }
  }

  return {
    sets: '3',
    reps: '10',
    isTimeBased: false,
    duration: '30',
    durationUnit: 'seconds',
    restTime: '60',
  }
}

function libraryKey(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

function buildLibraryExercise(def, id, baseTime, index) {
  const parsed = parsePrescription(def.prescription)
  const phase = def.phase || EXERCISE_PHASE.MAIN

  if (phase === EXERCISE_PHASE.WARMUP || phase === EXERCISE_PHASE.COOLDOWN) {
    const durationSec = parseInt(parsed.duration, 10) || 30
    const durationMin = Math.max(1, Math.ceil(durationSec / 60))
    return {
      ...packSimplePhaseExercise(null, {
        name: def.name,
        duration: String(durationMin),
        durationUnit: 'minutes',
        notes: [def.tips, def.optional ? 'Optional' : ''].filter(Boolean).join(' · '),
        exercisePhase: phase,
      }),
      id,
      equipment: def.equipment,
      muscleGroups: def.muscles || [],
      createdAt: baseTime + index,
    }
  }

  const target = buildExerciseTarget(parsed)
  const description = [def.optional ? 'Optional' : '', def.tips || ''].filter(Boolean).join(' · ')

  return {
    id,
    name: def.name,
    exercisePhase: EXERCISE_PHASE.MAIN,
    sets: parsed.sets,
    reps: parsed.reps,
    isTimeBased: parsed.isTimeBased,
    duration: parsed.duration,
    durationUnit: parsed.durationUnit,
    restTime: parsed.restTime,
    equipment: def.equipment || '',
    difficulty: 'Intermediate',
    muscleGroups: def.muscles || [],
    category: 'Strength',
    imageUrl: '',
    instructions: '',
    tips: def.tips || '',
    description,
    target,
    createdAt: baseTime + index,
  }
}

export function buildStarterLibrary(baseTime = Date.now()) {
  const libraryByKey = new Map()
  let index = 0

  PROGRAM.forEach((dayPlan) => {
    dayPlan.exercises.forEach((def) => {
      const key = libraryKey(def.name)
      if (!libraryByKey.has(key)) {
        const id = `program-${key.replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
        libraryByKey.set(key, buildLibraryExercise(def, id, baseTime, index))
        index += 1
      }
    })
  })

  return [...libraryByKey.values()]
}

export function buildProgramSchedule(customExercises) {
  const byName = new Map(customExercises.map((ex) => [libraryKey(ex.name), ex]))
  let schedule = {}

  PROGRAM.forEach((dayPlan) => {
    schedule[dayPlan.day] = {
      note: `${dayPlan.title} — ${dayPlan.note}`,
      exercises: [],
    }

    dayPlan.exercises.forEach((def) => {
      const library = byName.get(libraryKey(def.name))
      if (!library) return

      const parsed = parsePrescription(def.prescription)
      schedule =
        addExerciseToDay(schedule, dayPlan.day, customExercises, library.id, {
          sets: parsed.sets,
          reps: parsed.reps,
          isTimeBased: parsed.isTimeBased,
          duration: parsed.duration,
          durationUnit: parsed.durationUnit,
        }) || schedule
    })
  })

  return schedule
}

/** Bereket's 5-day split with full library + schedule. */
export function createStarterPack() {
  const customExercises = buildStarterLibrary()
  const workoutSchedule = buildProgramSchedule(customExercises)

  return {
    workoutDays: PROGRAM_WORKOUT_DAYS,
    customExercises,
    workoutSchedule,
  }
}

/** @deprecated Use createStarterPack — kept for tests */
export function seedStarterSchedule(workoutDays, workoutSchedule, customExercises) {
  return buildProgramSchedule(customExercises)
}
