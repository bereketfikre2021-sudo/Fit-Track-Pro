import WorkoutTab from '../components/WorkoutTab'
import { useAds } from '../lib/useAds'

function WorkoutPage({ state, updateState }) {
  /**
   * Workout screen ad rules:
   *   - NO banner — never interrupt the user mid-workout
   *   - NO preload interstitial here — it is preloaded on the Home screen
   *     and shown AFTER the session completes and the user returns home
   *   - The WorkoutTab's celebrateAndGoHome() navigates to '/' where the
   *     interstitial from Home's preload is available
   *
   * This hook call intentionally passes no options — it is a no-op on this
   * screen and acts only as a placeholder so we can add opt-in rewarded ads
   * in a future release (e.g. "Watch ad to unlock an extra exercise slot").
   */
  useAds({
    // banner: false  — explicitly no banner during active workout
    // preloadRewarded: true  — uncomment when rewarded flow is implemented
  })

  return <WorkoutTab state={state} updateState={updateState} />
}

export default WorkoutPage
