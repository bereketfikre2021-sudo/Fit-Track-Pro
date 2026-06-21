/** Age in full years from YYYY-MM-DD birth date. */
export function calculateAgeFromBirthDate(birthDate) {
  if (!birthDate) return null
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const monthDiff = now.getMonth() - born.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

/** Format YYYY-MM-DD registration date for display. */
export function formatMemberSinceDate(dateStr, locale = 'en') {
  if (!dateStr || typeof dateStr !== 'string') return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString(locale === 'am' ? 'am-ET' : undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** BMI from weight (kg) and height (cm). Returns null when inputs are invalid. */
export function calculateBmi(weightKg, heightCm) {
  const weight = parseFloat(weightKg)
  const heightM = parseFloat(heightCm) / 100
  if (!(weight > 0 && heightM > 0)) return null
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

/** WHO-style BMI category key, or null when BMI is unavailable. */
export function getBmiCategory(bmi) {
  if (bmi == null || Number.isNaN(bmi)) return null
  if (bmi < 18.5) return 'underweight'
  if (bmi <= 24.9) return 'normal'
  if (bmi <= 29.9) return 'overweight'
  return 'obese'
}

/** Gender-adjusted ideal BMI within the healthy range (18.5–24.9). */
export function getIdealBmiForGender(gender = 'male') {
  return gender === 'female' ? 21.5 : 22.5
}

/**
 * Suggest target weight (kg) for a healthy BMI based on height and gender.
 * Does not depend on current weight — use getWeightChangeInfo for gain/lose direction.
 */
export function suggestTargetWeightKg({ heightCm, gender = 'male' }) {
  const heightM = parseFloat(heightCm) / 100
  if (!(heightM > 0)) return null
  const idealBmi = getIdealBmiForGender(gender)
  return Math.round(idealBmi * heightM * heightM * 10) / 10
}

/**
 * Compare current vs target weight.
 * @returns {{ delta: number, direction: 'gain'|'lose'|'maintain', absDelta: number } | null}
 */
export function getWeightChangeInfo(currentWeightKg, targetWeightKg) {
  const current = parseFloat(currentWeightKg)
  const target = parseFloat(targetWeightKg)
  if (!(current > 0 && target > 0)) return null

  const delta = Math.round((target - current) * 10) / 10
  let direction = 'maintain'
  if (delta > 0.5) direction = 'gain'
  else if (delta < -0.5) direction = 'lose'

  return { delta, direction, absDelta: Math.abs(delta) }
}

/**
 * Suggest a primary fitness goal from BMI and weight trajectory.
 * @returns {'strength'|'muscle'|'fat'|'endurance'|null}
 */
export function suggestPrimaryGoal({
  bmi,
  bmiCategory,
  currentWeightKg,
  targetWeightKg,
} = {}) {
  if (bmi == null || !bmiCategory) return null

  if (bmiCategory === 'underweight') return 'muscle'
  if (bmiCategory === 'obese' || bmiCategory === 'overweight') return 'fat'

  const weightChange = getWeightChangeInfo(currentWeightKg, targetWeightKg)
  if (weightChange?.direction === 'lose') return 'fat'
  if (weightChange?.direction === 'gain') return 'muscle'
  return 'strength'
}

const TRAINING_GOALS = new Set(['strength', 'muscle', 'fat', 'endurance'])

/**
 * Training goal for AI plans — prefers BMI/weight trajectory over a stale profile.goal.
 * @returns {'strength'|'muscle'|'fat'|'endurance'}
 */
export function resolveEffectiveTrainingGoal(profile = {}) {
  const bmi = calculateBmi(profile.currentWeight, profile.height)
  const bmiCategory = getBmiCategory(bmi)
  const explicitTarget = parseFloat(profile.targetWeight)
  const targetWeight =
    explicitTarget > 0
      ? explicitTarget
      : suggestTargetWeightKg({ heightCm: profile.height, gender: profile.gender })

  const bmiGoal = suggestPrimaryGoal({
    bmi,
    bmiCategory,
    currentWeightKg: profile.currentWeight,
    targetWeightKg: targetWeight,
  })
  if (bmiGoal) return bmiGoal

  return TRAINING_GOALS.has(profile.goal) ? profile.goal : 'strength'
}
