import { describe, it, expect } from 'vitest'
import {
  createDefaultAppState,
  migrateAppState,
  validateBackupPayload,
  hydrateAppStateFromBackup,
} from './appState'

describe('appState', () => {
  it('createDefaultAppState includes schemaVersion', () => {
    expect(createDefaultAppState().schemaVersion).toBe(2)
  })

  it('migrateAppState strips legacy logs and sets schemaVersion', () => {
    const migrated = migrateAppState({
      onboarded: true,
      logs: [{ id: 1 }],
      profile: { name: 'Test' },
    })
    expect('logs' in migrated).toBe(false)
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.profile.name).toBe('Test')
  })

  it('validateBackupPayload rejects exercise import files', () => {
    expect(() =>
      validateBackupPayload({ exercises: [{ name: 'Squat' }] })
    ).toThrow(/exercises-only import|not a full backup/i)
  })

  it('hydrateAppStateFromBackup merges valid backup', () => {
    const defaults = createDefaultAppState()
    const backup = {
      onboarded: true,
      profile: { ...defaults.profile, name: 'BK' },
      customExercises: [],
    }
    const state = hydrateAppStateFromBackup(JSON.stringify(backup), defaults)
    expect(state.profile.name).toBe('BK')
    expect(state.schemaVersion).toBe(2)
  })
})
