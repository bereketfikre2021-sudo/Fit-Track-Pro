import { describe, expect, it } from 'vitest'
import {
  PLAN_SETUP_METHOD,
  allowsAiPlanFeatures,
  allowsTemplatePlanFeatures,
  getPlanSetupMethod,
} from './planSetup'

describe('plan setup method gating', () => {
  it('returns null for legacy saves without planSetupMethod', () => {
    expect(getPlanSetupMethod({ planSetupComplete: true })).toBeNull()
    expect(allowsAiPlanFeatures({})).toBe(true)
    expect(allowsTemplatePlanFeatures({})).toBe(true)
  })

  it('always allows AI features regardless of setup method', () => {
    expect(allowsAiPlanFeatures({ planSetupMethod: PLAN_SETUP_METHOD.AI })).toBe(true)
    expect(allowsAiPlanFeatures({ planSetupMethod: PLAN_SETUP_METHOD.TEMPLATE })).toBe(true)
    expect(allowsAiPlanFeatures({ planSetupMethod: PLAN_SETUP_METHOD.MANUAL })).toBe(true)
  })

  it('always allows template features regardless of setup method', () => {
    expect(allowsTemplatePlanFeatures({ planSetupMethod: PLAN_SETUP_METHOD.AI })).toBe(true)
    expect(allowsTemplatePlanFeatures({ planSetupMethod: PLAN_SETUP_METHOD.TEMPLATE })).toBe(true)
    expect(allowsTemplatePlanFeatures({ planSetupMethod: PLAN_SETUP_METHOD.MANUAL })).toBe(true)
  })

  it('allows both AI and template features when method is manual', () => {
    const state = { planSetupMethod: PLAN_SETUP_METHOD.MANUAL }
    expect(allowsAiPlanFeatures(state)).toBe(true)
    expect(allowsTemplatePlanFeatures(state)).toBe(true)
  })
})
