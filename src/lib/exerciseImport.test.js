import { describe, it, expect } from 'vitest'
import {
  getExerciseImportTemplate,
  applyExerciseImport,
  buildExerciseExportPayload,
  IMPORT_MODE,
  normalizeDayName,
  normalizeImportPayload,
} from './exerciseImport'

describe('exerciseImport', () => {
  it('template is v2 with schedule and all phases', () => {
    const t = getExerciseImportTemplate()
    expect(t.version).toBe(2)
    expect(t.schedule.Monday).toBeTruthy()
    expect(t.exercises.some((e) => e.exercisePhase === 'warmup')).toBe(true)
    expect(t.exercises.some((e) => e.exercisePhase === 'cooldown')).toBe(true)
  })

  it('normalizes day names', () => {
    expect(normalizeDayName('monday')).toBe('Monday')
    expect(normalizeDayName('invalid')).toBeNull()
  })

  it('imports library exercises only (v1 style)', () => {
    const state = {
      profile: { workoutDays: ['Monday'] },
      customExercises: [],
      workoutSchedule: { Monday: { note: '', exercises: [] } },
    }
    const result = applyExerciseImport(state, {
      exercises: [{ name: 'Bench Press', sets: '4', reps: '8' }],
    })
    expect(result.customExercises).toHaveLength(1)
    expect(result.summary.exercisesAdded).toBe(1)
  })

  it('registers exercises and assigns to schedule days', () => {
    const state = {
      profile: { workoutDays: [] },
      customExercises: [],
      workoutSchedule: {},
    }
    const result = applyExerciseImport(state, {
      workoutDays: ['Monday'],
      exercises: [
        { name: 'Arm Circles', exercisePhase: 'warmup', duration: '5', durationUnit: 'minutes' },
        { name: 'Squat', exercisePhase: 'main', sets: '3', reps: '10' },
      ],
      schedule: {
        Monday: {
          note: 'Leg day',
          exercises: [{ name: 'Arm Circles' }, { name: 'Squat', sets: '4', reps: '8' }],
        },
      },
    })
    expect(result.customExercises).toHaveLength(2)
    expect(result.workoutSchedule.Monday.exercises).toHaveLength(2)
    expect(result.workoutSchedule.Monday.note).toBe('Leg day')
    expect(result.profile.workoutDays).toContain('Monday')
    expect(result.summary.scheduleEntriesAdded).toBe(2)
  })

  it('adds workout days from schedule even if not in profile', () => {
    const state = {
      profile: { workoutDays: ['Monday'] },
      customExercises: [{ id: '1', name: 'Squat', exercisePhase: 'main', sets: '3', reps: '10' }],
      workoutSchedule: {},
    }
    const result = applyExerciseImport(state, {
      schedule: {
        Friday: { exercises: [{ name: 'Squat' }] },
      },
    })
    expect(result.profile.workoutDays).toContain('Friday')
    expect(result.workoutSchedule.Friday.exercises).toHaveLength(1)
    expect(result.summary.daysAdded).toBeGreaterThanOrEqual(1)
  })

  it('uses assignToDays on exercises', () => {
    const payload = normalizeImportPayload({
      exercises: [
        {
          name: 'Plank',
          exercisePhase: 'main',
          sets: '2',
          reps: '',
          isTimeBased: true,
          duration: '45',
          durationUnit: 'seconds',
          assignToDays: ['Wednesday'],
        },
      ],
    })
    expect(payload.assignments.some((a) => a.day === 'Wednesday')).toBe(true)
  })

  it('rejects empty import', () => {
    expect(() => normalizeImportPayload({ exercises: [] })).toThrow()
  })

  it('exports library and schedule as v2', () => {
    const state = {
      profile: { workoutDays: ['Monday'] },
      customExercises: [
        { id: '1', name: 'Squat', exercisePhase: 'main', sets: '3', reps: '10' },
      ],
      workoutSchedule: {
        Monday: {
          note: 'Leg day',
          exercises: [{ id: 's1', exerciseId: '1', name: 'Squat', sets: '4', reps: '8' }],
        },
      },
    }
    const payload = buildExerciseExportPayload(state)
    expect(payload.version).toBe(2)
    expect(payload.exercises).toHaveLength(1)
    expect(payload.exercises[0].name).toBe('Squat')
    expect(payload.schedule.Monday.exercises[0].sets).toBe('4')
    expect(payload.schedule.Monday.note).toBe('Leg day')
  })

  it('replace schedule mode clears listed days before import', () => {
    const state = {
      profile: { workoutDays: ['Monday', 'Tuesday'] },
      customExercises: [
        { id: '1', name: 'Old Lift', exercisePhase: 'main', sets: '3', reps: '10' },
        { id: '2', name: 'New Lift', exercisePhase: 'main', sets: '3', reps: '10' },
      ],
      workoutSchedule: {
        Monday: {
          note: '',
          exercises: [{ id: 'old', exerciseId: '1', name: 'Old Lift' }],
        },
        Tuesday: {
          note: '',
          exercises: [{ id: 't1', exerciseId: '1', name: 'Old Lift' }],
        },
      },
    }
    const result = applyExerciseImport(
      state,
      {
        schedule: {
          Monday: { exercises: [{ name: 'New Lift' }] },
        },
      },
      IMPORT_MODE.REPLACE_SCHEDULE
    )
    expect(result.workoutSchedule.Monday.exercises).toHaveLength(1)
    expect(result.workoutSchedule.Monday.exercises[0].name).toBe('New Lift')
    expect(result.workoutSchedule.Tuesday.exercises).toHaveLength(1)
  })

  it('replace library mode rebuilds library from file', () => {
    const state = {
      profile: { workoutDays: ['Monday'] },
      customExercises: [{ id: '1', name: 'Old Lift', exercisePhase: 'main', sets: '3', reps: '10' }],
      workoutSchedule: {
        Monday: {
          note: '',
          exercises: [{ id: 'old', exerciseId: '1', name: 'Old Lift' }],
        },
      },
    }
    const result = applyExerciseImport(
      state,
      {
        exercises: [{ name: 'Only New', sets: '5', reps: '5' }],
      },
      IMPORT_MODE.REPLACE_LIBRARY
    )
    expect(result.customExercises).toHaveLength(1)
    expect(result.customExercises[0].name).toBe('Only New')
  })

  it('export payload includes exportedAt timestamp', () => {
    const payload = buildExerciseExportPayload({
      profile: { workoutDays: [] },
      customExercises: [],
      workoutSchedule: {},
    })
    expect(payload.version).toBe(2)
    expect(payload.exportedAt).toBeTruthy()
  })
})
