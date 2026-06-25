import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  configureGeminiFromAppSettings,
  generateGeminiText,
  isGeminiConfigured,
  isRetryableGeminiError,
} from './gemini'

describe('gemini', () => {
  beforeEach(() => {
    configureGeminiFromAppSettings({ geminiApiKey: '', geminiModel: '' })
  })

  it('is always configured (key lives on the server)', () => {
    expect(isGeminiConfigured()).toBe(true)
  })

  it('detects retryable overload errors', () => {
    expect(isRetryableGeminiError(429, 'Too many requests')).toBe(true)
    expect(
      isRetryableGeminiError(503, 'This model is currently experiencing high demand.')
    ).toBe(true)
    expect(isRetryableGeminiError(400, 'Invalid API key')).toBe(false)
  })
})

describe('generateGeminiText retries', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
    configureGeminiFromAppSettings({ geminiApiKey: '', geminiModel: '' })
  })

  it('retries and succeeds after a transient overload', async () => {
    vi.useFakeTimers()
    let calls = 0

    // Handle both proxy response shape ({ text }) and direct Google API shape
    // (candidates[0].content.parts[0].text), since dev env may route either way.
    globalThis.fetch = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: 'This model is currently experiencing high demand.' }),
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          text: '{"ok":true}',
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
      }
    })

    const promise = generateGeminiText({ userPrompt: 'test' })
    // Fast-forward through the retry sleep delay
    await vi.runAllTimersAsync()
    const text = await promise
    expect(text).toBe('{"ok":true}')
    expect(calls).toBeGreaterThan(1)
  }, 15000)
})
