import i18n from '@/i18n'

export const SKIP_REASON_VALUES = ['injury', 'busy', 'equipment', 'other']

export function getSkipReasons() {
  return SKIP_REASON_VALUES.map((value) => ({
    value,
    label: i18n.t(`skipReasons.${value}`),
  }))
}

/** @deprecated Use getSkipReasons() for translated labels */
export const SKIP_REASONS = getSkipReasons()

export function getSkipReasonLabel(value) {
  return i18n.t(`skipReasons.${value}`, { defaultValue: i18n.t('skipReasons.skippedDefault') })
}

export function isSkippedEntry(entry) {
  return !!entry?.skipped
}

export function isCompletedEntry(entry) {
  return !!entry?.completedAt && !entry?.skipped
}
