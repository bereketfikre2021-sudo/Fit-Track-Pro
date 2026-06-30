import { describe, it, expect } from 'vitest'
import {
  calculateAgeFromBirthDate,
  calculateBmi,
  formatMemberSinceDate,
  getBmiCategory,
  getIdealBmiForGender,
  getWeightChangeInfo,
  resolveEffectiveTrainingGoal,
  deriveFitnessLevelFromRegistration,
  resolveEffectiveFitnessLevel,
  suggestPrimaryGoal,
  suggestTargetWeightKg,
} from './profileUtils'

describe('profileUtils', () => {
  it('calculates age from birth date', () => {
    const birth = '1990-06-15'
    const age = calculateAgeFromBirthDate(birth)
    expect(age).toBeGreaterThan(30)
    expect(age).toBeLessThan(50)
  })

  it('returns null for missing birth date', () => {
    expect(calculateAgeFromBirthDate('')).toBeNull()
  })

  it('formats member since dates', () => {
    expect(formatMemberSinceDate('2026-01-15', 'en')).toContain('2026')
    expect(formatMemberSinceDate('', 'en')).toBe('')
  })

  it('calculates BMI from weight and height', () => {
    expect(calculateBmi(70, 175)).toBe(22.9)
    expect(calculateBmi('', 175)).toBeNull()
  })

  it('categorizes BMI', () => {
    expect(getBmiCategory(17)).toBe('underweight')
    expect(getBmiCategory(22)).toBe('normal')
    expect(getBmiCategory(27)).toBe('overweight')
    expect(getBmiCategory(32)).toBe('obese')
  })

  it('uses gender-adjusted ideal BMI', () => {
    expect(getIdealBmiForGender('female')).toBe(21.5)
    expect(getIdealBmiForGender('male')).toBe(22.5)
  })

  it('suggests target weight from height and gender', () => {
    const maleTarget = suggestTargetWeightKg({ heightCm: 175, gender: 'male' })
    const femaleTarget = suggestTargetWeightKg({ heightCm: 175, gender: 'female' })
    expect(maleTarget).toBeGreaterThan(femaleTarget)
    expect(maleTarget).toBeGreaterThan(60)
    expect(maleTarget).toBeLessThan(100)
  })

  it('detects weight gain, loss, and maintain direction', () => {
    expect(getWeightChangeInfo(60, 70)?.direction).toBe('gain')
    expect(getWeightChangeInfo(80, 70)?.direction).toBe('lose')
    expect(getWeightChangeInfo(70, 70.3)?.direction).toBe('maintain')
  })

  it('suggests primary goal from BMI and weight trajectory', () => {
    expect(
      suggestPrimaryGoal({
        bmi: 17,
        bmiCategory: 'underweight',
        currentWeightKg: 55,
        targetWeightKg: 65,
      })
    ).toBe('muscle')
    expect(
      suggestPrimaryGoal({
        bmi: 31,
        bmiCategory: 'obese',
        currentWeightKg: 95,
        targetWeightKg: 75,
      })
    ).toBe('fat')
    expect(
      suggestPrimaryGoal({
        bmi: 22,
        bmiCategory: 'normal',
        currentWeightKg: 70,
        targetWeightKg: 68,
      })
    ).toBe('fat')
    expect(
      suggestPrimaryGoal({
        bmi: 22,
        bmiCategory: 'normal',
        currentWeightKg: 70,
        targetWeightKg: 72,
      })
    ).toBe('muscle')
    expect(
      suggestPrimaryGoal({
        bmi: 22,
        bmiCategory: 'normal',
        currentWeightKg: 70,
        targetWeightKg: 70,
      })
    ).toBe('strength')
  })

  it('resolves effective training goal from BMI over stale profile goal', () => {
    expect(
      resolveEffectiveTrainingGoal({
        goal: 'muscle',
        currentWeight: 95,
        height: 175,
        gender: 'male',
        targetWeight: '75',
      })
    ).toBe('fat')

    expect(
      resolveEffectiveTrainingGoal({
        goal: 'fat',
        currentWeight: 55,
        height: 175,
        gender: 'male',
        targetWeight: '70',
      })
    ).toBe('muscle')
  })

  it('derives fitness level from registration date', () => {
    const ref = new Date(2026, 5, 30)
    expect(deriveFitnessLevelFromRegistration('2026-01-01', ref)).toBe('beginner')
    expect(deriveFitnessLevelFromRegistration('2025-06-01', ref)).toBe('intermediate')
    expect(deriveFitnessLevelFromRegistration('2023-01-01', ref)).toBe('advanced')
  })

  it('resolves effective fitness level with manual override', () => {
    expect(
      resolveEffectiveFitnessLevel({
        registrationDate: '2026-01-01',
        fitnessLevel: 'advanced',
        fitnessLevelManual: true,
      })
    ).toBe('advanced')

    expect(
      resolveEffectiveFitnessLevel(
        { registrationDate: '2026-01-01', fitnessLevel: 'advanced', fitnessLevelManual: false },
        new Date(2026, 5, 30)
      )
    ).toBe('beginner')
  })
})
