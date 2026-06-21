import { describe, it, expect } from 'vitest'
import {
  buildStarterLibrary,
  createStarterPack,
  parsePrescription,
  PROGRAM_WORKOUT_DAYS,
} from './sampleExercises'

describe('sampleExercises', () => {
  it('parses rep and time prescriptions', () => {
    expect(parsePrescription('3×8–10').sets).toBe('3')
    expect(parsePrescription('3×8–10').reps).toBe('8-10')
    expect(parsePrescription('2×20–30 sec').isTimeBased).toBe(true)
    expect(parsePrescription('2×10 each').reps).toBe('10 each')
  })

  it('builds Bereket program library', () => {
    const library = buildStarterLibrary()
    expect(library.length).toBeGreaterThanOrEqual(20)
    expect(library.some((e) => e.name.includes('Deadlift'))).toBe(true)
  })

  it('creates full weekly schedule', () => {
    const pack = createStarterPack()
    expect(pack.workoutDays).toEqual(PROGRAM_WORKOUT_DAYS)
    expect(pack.workoutSchedule.Monday.exercises.length).toBeGreaterThanOrEqual(6)
    expect(pack.workoutSchedule.Tuesday.exercises.length).toBeGreaterThanOrEqual(5)
    expect(pack.workoutSchedule.Monday.note).toContain('Upper')
    expect(pack.workoutSchedule.Saturday.note).toContain('Optional')
  })
})
