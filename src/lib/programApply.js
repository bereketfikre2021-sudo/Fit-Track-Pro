import { createStarterPack } from './sampleExercises'

/** Replace library + schedule with the built-in training program. */
export function applyTrainingProgram(state) {
  const pack = createStarterPack()
  return {
    profile: {
      ...state.profile,
      workoutDays: pack.workoutDays,
    },
    customExercises: pack.customExercises,
    workoutSchedule: pack.workoutSchedule,
  }
}
