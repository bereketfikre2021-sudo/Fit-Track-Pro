import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  detectMealCalendarPlatform,
  isSamsungAndroidDevice,
  normalizeMealCalendarPlatform,
} from './mealCalendarPlatforms'

const galaxyUa =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/120.0.0.0 Mobile Safari/537.36'

describe('mealCalendarPlatforms', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('normalizes platform ids', () => {
    expect(normalizeMealCalendarPlatform('iphone')).toBe('iphone')
    expect(normalizeMealCalendarPlatform('android')).toBe('android')
    expect(normalizeMealCalendarPlatform('invalid')).toBe('other')
  })

  it('detects android and Samsung on Galaxy user agents', () => {
    vi.stubGlobal('navigator', { userAgent: galaxyUa })
    expect(detectMealCalendarPlatform()).toBe('android')
    expect(isSamsungAndroidDevice()).toBe(true)
  })
})
