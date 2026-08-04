import i18n from '@/i18n'

/** Single-select equipment groups — each option expands to the equipment values it covers. */
export const EQUIPMENT_OPTIONS = [
  { id: 'gym',         label: 'Full gym',        values: ['Gym', 'Barbell', 'Dumbbell', 'Machine', 'Cable'] },
  { id: 'freeweights', label: 'Free weights',    values: ['Barbell', 'Dumbbell'] },
  { id: 'bodyweight',  label: 'Bodyweight only', values: ['Bodyweight'] },
]

export function equipmentToId(equipment = []) {
  if (!equipment.length || equipment.includes('Gym')) return 'gym'
  if (equipment.includes('Bodyweight') && equipment.length === 1) return 'bodyweight'
  if (equipment.some((e) => ['Barbell', 'Dumbbell'].includes(e))) return 'freeweights'
  return 'gym'
}

export const FOCUS_AREAS = [
  { value: 'full-body', label: 'Full Body' },
  { value: 'upper', label: 'Upper Body' },
  { value: 'lower', label: 'Lower Body' },
  { value: 'core', label: 'Core' },
]

export function formatFocusArea(value) {
  if (!value) return i18n.t('focusAreas.notSet')
  return i18n.t(`focusAreas.${value}`, {
    defaultValue: FOCUS_AREAS.find((a) => a.value === value)?.label ?? i18n.t('focusAreas.notSet'),
  })
}
