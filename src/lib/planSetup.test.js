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

  it('allows only template features when method is ai (AI already used at setup)', () => {
    const state = { planSetupMethod: PLAN_SETUP_METHOD.AI }
    expect(allowsAiPlanFeatures(state)).toBe(false)
    expect(allowsTemplatePlanFeatures(state)).toBe(true)
  })

  it('blocks both AI and template features when method is template (both already used at setup)', () => {
    const state = { planSetupMethod: PLAN_SETUP_METHOD.TEMPLATE }
    expect(allowsAiPlanFeatures(state)).toBe(false)
    expect(allowsTemplatePlanFeatures(state)).toBe(false)
  })

  it('allows both AI and template features when method is manual', () => {
    const state = { planSetupMethod: PLAN_SETUP_METHOD.MANUAL }
    expect(allowsAiPlanFeatures(state)).toBe(true)
    expect(allowsTemplatePlanFeatures(state)).toBe(true)
  })
})
