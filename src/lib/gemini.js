/**
 * Gemini client — talks to our own /api/gemini proxy endpoint.
 *
 * The actual API key lives in a Netlify environment variable (GEMINI_API_KEY)
 * set via the Netlify dashboard. It never appears in the client bundle.
 *
 * Users can still supply their own key in Settings → AI Settings; it will be
 * sent to the proxy so the proxy can forward it to Google (useful when someone
 * self-hosts or deploys their own instance).
 */

const DEFAULT_MODEL = 'gemini-3.5-flash'
const MODEL_FALLBACKS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']

// Populated from Settings → AI Settings (stored in localStorage via appState).
// Only used as an override — the server key is the default.
let settingsApiKey = ''
let settingsModel = ''

export function configureGeminiFromAppSettings(appSettings = {}) {
  settingsApiKey =
    typeof appSettings.geminiApiKey === 'string' ? appSettings.geminiApiKey.trim() : ''
  settingsModel =
    typeof appSettings.geminiModel === 'string' ? appSettings.geminiModel.trim() : ''
}

export function getGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL?.trim() || settingsModel || DEFAULT_MODEL
}

/**
 * The app is always "configured" because the server holds the key.
 * If the user also supplied their own key in Settings, we pass it along;
 * the proxy will use it if present, otherwise falls back to the server key.
 */
export function isGeminiConfigured() {
  return true
}

export function isRetryableGeminiError(status, message = '') {
  if (status === 429 || status === 503) return true
  const lower = message.toLowerCase()
  return (
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('resource exhausted') ||
    lower.includes('quota') ||
    lower.includes('try again')
  )
}

function uniqueModels(models) {
  const seen = new Set()
  return models.filter((model) => {
    if (!model || seen.has(model)) return false
    seen.add(model)
    return true
  })
}

function getModelCandidates() {
  return uniqueModels([getGeminiModel(), ...MODEL_FALLBACKS])
}

function createGeminiError(message, { status, code } = {}) {
  const error = new Error(message)
  if (status != null) error.status = status
  if (code) error.code = code
  return error
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * In local dev, if VITE_GEMINI_API_KEY is set we call Google directly
 * from the client (the key is only in memory, never in the bundle).
 * In production we always go through the /api/gemini proxy so the key
 * stays server-side.
 */
const DEV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || ''
const IS_DEV = import.meta.env.DEV

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

async function callGeminiDirect({ model, systemInstruction, userPrompt, temperature }) {
  const url = `${GOOGLE_API_BASE}/${encodeURIComponent(model)}:generateContent`

  const geminiBody = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature },
  }
  if (systemInstruction) {
    geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': DEV_API_KEY,
    },
    body: JSON.stringify(geminiBody),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data?.error?.message || `Gemini request failed (${res.status})`
    throw createGeminiError(message, { status: res.status })
  }

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('') || ''

  if (!text.trim()) {
    throw createGeminiError('Gemini returned an empty response. Try again.')
  }

  return text
}

/**
 * Call our /api/gemini proxy once for a given model.
 * If the user has entered their own key in Settings we pass it along;
 * the proxy will prefer the server-side key if none is provided.
 */
async function callGeminiOnce({ model, systemInstruction, userPrompt, temperature }) {
  // In dev mode with a local key set, bypass the proxy and call Google directly.
  if (IS_DEV && DEV_API_KEY) {
    return callGeminiDirect({ model, systemInstruction, userPrompt, temperature })
  }

  const body = { model, userPrompt, temperature }
  if (systemInstruction) body.systemInstruction = systemInstruction
  // Optionally forward the user-supplied key — proxy ignores it when the
  // server key is already set, but it allows self-hosted use.
  if (settingsApiKey) body.userApiKey = settingsApiKey

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data?.error || `Gemini request failed (${res.status})`
    throw createGeminiError(message, { status: res.status })
  }

  const text = data.text || ''
  if (!text.trim()) {
    throw createGeminiError('Gemini returned an empty response. Try again.')
  }

  return text
}

/**
 * Call Gemini via the proxy with retries and model fallbacks.
 * @param {{ systemInstruction?: string, userPrompt: string, temperature?: number }} options
 * @returns {Promise<string>}
 */
export async function generateGeminiText({
  systemInstruction,
  userPrompt,
  temperature = 0.5,
}) {
  const models = getModelCandidates()
  let lastError = null

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await callGeminiOnce({ model, systemInstruction, userPrompt, temperature })
      } catch (error) {
        lastError = error
        const retryable = isRetryableGeminiError(error?.status, error?.message || '')
        if (!retryable || attempt === 2) break
        await sleep(1000 * (attempt + 1))
      }
    }

    if (lastError && !isRetryableGeminiError(lastError.status, lastError.message || '')) {
      throw lastError
    }
  }

  if (lastError && isRetryableGeminiError(lastError.status, lastError.message || '')) {
    throw createGeminiError(lastError.message || 'Gemini is busy. Try again later.', {
      status: lastError.status,
      code: 'RATE_LIMIT',
    })
  }

  throw lastError || createGeminiError('Gemini request failed.')
}
