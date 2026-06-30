import { describe, it, expect } from 'vitest'
import { formatFocusArea, EQUIPMENT_OPTIONS, equipmentToId } from './profileOptions'

describe('profileOptions', () => {
  it('formats focus area labels', () => {
    expect(formatFocusArea('full-body')).toBe('Full Body')
    expect(formatFocusArea('upper')).toBe('Upper Body')
    expect(formatFocusArea(undefined)).toBe('Not set')
  })

  it('matches onboarding equipment options', () => {
    expect(EQUIPMENT_OPTIONS.map((o) => o.id)).toEqual(['gym', 'freeweights', 'bodyweight'])
    expect(equipmentToId(['Gym', 'Barbell'])).toBe('gym')
    expect(equipmentToId(['Barbell', 'Dumbbell'])).toBe('freeweights')
    expect(equipmentToId(['Bodyweight'])).toBe('bodyweight')
  })
})
