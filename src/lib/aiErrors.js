/** Map Gemini / AI errors to i18n toast keys. */
export function getAiToastKey(error) {
  if (error?.code === 'NOT_CONFIGURED') return 'ai.notConfigured'
  if (error?.code === 'RATE_LIMIT') return 'ai.busy'
  return 'ai.unavailable'
}
