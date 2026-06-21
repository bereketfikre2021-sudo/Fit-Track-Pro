import i18n from '@/i18n'

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
