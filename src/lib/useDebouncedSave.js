import { useEffect, useRef } from 'react'
import { saveAppState } from './storage'

const SAVE_DELAY_MS = 400

/**
 * Persists app state to localStorage after changes settle (debounced).
 */
export function useDebouncedSave(state, delayMs = SAVE_DELAY_MS) {
  const isFirstMount = useRef(true)

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    const timer = setTimeout(() => {
      saveAppState(state)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [state, delayMs])
}
