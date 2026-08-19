import { toast } from 'sonner'
import { createDefaultAppState, hydrateAppStateFromStorage } from './appState'

export const STORAGE_KEY = 'fittrack_pro_v2'

/** Strip bulky duplicated image data before persisting. */
export function slimStateForStorage(state) {
  const workoutSchedule = {}
  for (const [day, schedule] of Object.entries(state.workoutSchedule || {})) {
    workoutSchedule[day] = {
      ...schedule,
      exercises: (schedule.exercises || []).map(({ imageUrl, ...ex }) => ex),
    }
  }

  // Slim meal plan images — keep only compact ones (< 200KB or remote URLs)
  const mealPlan = {}
  for (const [day, slots] of Object.entries(state.mealPlan || {})) {
    mealPlan[day] = {}
    for (const [slot, items] of Object.entries(slots || {})) {
      mealPlan[day][slot] = (items || []).map((item) => ({
        ...item,
        imageUrl: isCompactImage(item.imageUrl) ? item.imageUrl : '',
      }))
    }
  }

  // Slim shopping list images
  const shoppingList = {}
  for (const [category, items] of Object.entries(state.shoppingList || {})) {
    shoppingList[category] = (items || []).map((item) => ({
      ...item,
      imageUrl: isCompactImage(item.imageUrl) ? item.imageUrl : '',
    }))
  }

  return {
    ...state,
    profile: {
      ...state.profile,
      avatarUrl: isCompactImage(state.profile?.avatarUrl)
        ? state.profile.avatarUrl
        : '',
    },
    customExercises: (state.customExercises || []).map((ex) => ({
      ...ex,
      imageUrl: isCompactImage(ex.imageUrl) ? ex.imageUrl : '',
    })),
    workoutSchedule,
    mealPlan,
    shoppingList,
  }
}

function isCompactImage(url) {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('http://') || url.startsWith('https://')) return true
  return url.length < 200_000
}

const STORAGE_WARN_BYTES = 3_500_000

export function saveAppState(state, { silent = false } = {}) {
  const full = JSON.stringify(state)

  try {
    localStorage.setItem(STORAGE_KEY, full)
    return true
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') {
      console.error('Error saving state:', error)
      return false
    }
  }

  try {
    const slim = slimStateForStorage(state)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
    if (!silent) {
      toast.warning(
        'Storage was almost full — large images were omitted from the save. Export a backup, then re-upload smaller photos.'
      )
    }
    return true
  } catch (error) {
    console.error('Error saving slim state:', error)
    if (!silent) {
      toast.error(
        'Could not save your data — browser storage is full. Export a backup, then clear old data in Settings.'
      )
    }
    return false
  }
}

export function clearAppState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Error clearing storage:', e)
  }
}

export function loadAppState() {
  const defaults = createDefaultAppState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults

    const merged = hydrateAppStateFromStorage(raw, defaults)

    if (raw.length > STORAGE_WARN_BYTES) {
      const slim = slimStateForStorage(merged)
      saveAppState(slim, { silent: true })
      toast.info(
        'Your saved data was large — duplicate images were trimmed to free space. Re-upload photos if any are missing.'
      )
      return slim
    }

    return merged
  } catch (e) {
    console.error('Error loading state:', e)
  }
  return defaults
}
