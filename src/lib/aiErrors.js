/** Map Gemini / AI errors to i18n toast keys. */
export function getAiToastKey(error) {
  if (error?.code === 'NOT_CONFIGURED') return 'ai.notConfigured'
  if (error?.code === 'RATE_LIMIT') return 'ai.busy'
  if (error?.status === 408) return 'ai.timeout'
  return 'ai.unavailable'
}
