import { describe, it, expect } from 'vitest'
import { formatFocusArea } from './profileOptions'

describe('profileOptions', () => {
  it('formats focus area labels', () => {
    expect(formatFocusArea('full-body')).toBe('Full Body')
    expect(formatFocusArea('upper')).toBe('Upper Body')
    expect(formatFocusArea(undefined)).toBe('Not set')
  })
})
