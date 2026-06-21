/**
 * Netlify serverless function — Gemini API proxy
 *
 * The GEMINI_API_KEY environment variable is set in the Netlify dashboard
 * (Site → Environment variables). It never appears in the client bundle.
 *
 * POST /api/gemini
 * Body: { model, systemInstruction?, userPrompt, temperature? }
 * Returns: { text } on success, { error } on failure
 */

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Server key takes priority; user-supplied key is a fallback for self-hosted use.
  const apiKey = process.env.GEMINI_API_KEY || body.userApiKey || ''
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Gemini API key is not configured on the server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { model, systemInstruction, userPrompt, temperature = 0.5 } = body

  if (!model || !userPrompt) {
    return new Response(JSON.stringify({ error: 'Missing required fields: model, userPrompt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = `${GOOGLE_API_BASE}/${encodeURIComponent(model)}:generateContent`

  const geminiBody = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature,
    },
  }

  if (systemInstruction) {
    geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(geminiBody),
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Network error reaching Gemini: ${err.message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      data?.error?.message || data?.message || `Gemini request failed (${res.status})`
    return new Response(JSON.stringify({ error: message, status: res.status }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('') || ''

  if (!text.trim()) {
    return new Response(
      JSON.stringify({ error: 'Gemini returned an empty response. Try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  path: '/api/gemini',
}
