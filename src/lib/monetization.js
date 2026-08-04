/**
 * adService.js
 *
 * Centralised AdMob service for FitTrack Pro.
 *
 * Architecture
 * ────────────
 * • This service is the single source of truth for ALL ad operations.
 * • It is designed as a no-op layer when running in a browser (PWA / dev).
 *   Ads are only displayed when the app runs inside Capacitor on Android
 *   (or iOS if you add iOS support later).
 * • In the browser the module still loads cleanly — no errors, no missing
 *   plugin crashes.  This means all pages that reference AdService continue
 *   to work in local dev without any changes.
 *
 * Capacitor plugin
 * ────────────────
 * Uses @capacitor-community/admob (v6+).
 * Install when you convert to Capacitor:
 *   npm install @capacitor-community/admob
 *   npx cap sync android
 *
 * Ad Unit IDs
 * ───────────
 * All IDs are read from VITE_ environment variables (see .env.example).
 * In development (import.meta.env.DEV) or when VITE_ADMOB_FORCE_TEST_ADS=true,
 * Google's official test IDs are substituted automatically.
 *
 * Disable for premium tier
 * ─────────────────────────
 * Set VITE_ADMOB_DISABLED=true OR call AdService.setPremium(true) at runtime.
 * Both paths skip every ad call so no ads are shown to paying users.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Google's official test Ad Unit IDs (Android)
//  https://developers.google.com/admob/android/test-ads
// ─────────────────────────────────────────────────────────────────────────────
const TEST_IDS = {
  banner:        'ca-app-pub-3940256099942544/6300978111',
  interstitial:  'ca-app-pub-3940256099942544/1033173712',
  rewarded:      'ca-app-pub-3940256099942544/5224354917',
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ad Unit IDs from environment variables
//  Replace placeholder values in .env.local / .env.production with real IDs
//  from apps.admob.com before submitting to the Play Store.
// ─────────────────────────────────────────────────────────────────────────────
const PROD_IDS = {
  // TODO: Replace with your production AdMob ad unit IDs from apps.admob.com
  banner:       import.meta.env.VITE_ADMOB_BANNER_ID        || '',
  interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID  || '',
  rewarded:     import.meta.env.VITE_ADMOB_REWARDED_ID      || '',
}

const USE_TEST_ADS =
  import.meta.env.DEV ||
  import.meta.env.VITE_ADMOB_FORCE_TEST_ADS === 'true'

/** Returns the effective ad unit ID, falling back to test IDs when appropriate */
function adUnitId(type) {
  if (USE_TEST_ADS || !PROD_IDS[type]) return TEST_IDS[type]
  return PROD_IDS[type]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Platform detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true only when the app is running inside Capacitor (Android/iOS).
 * In a browser / PWA context this is always false — no ads are shown.
 */
function isCapacitor() {
  return typeof window !== 'undefined' && !!(window.Capacitor?.isNativePlatform?.())
}

// ─────────────────────────────────────────────────────────────────────────────
//  Internal state
// ─────────────────────────────────────────────────────────────────────────────

let _admob = null            // Lazy-loaded @capacitor-community/admob plugin
let _initialised = false     // Whether AdMob.initialize() has been called
let _premiumUser = false      // Set to true to disable all ads (premium tier)
let _interstitialReady = false
let _rewardedReady = false

const _globalDisabled =
  import.meta.env.VITE_ADMOB_DISABLED === 'true'

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Safely import the Capacitor AdMob plugin. Returns null in browser. */
async function getPlugin() {
  if (!isCapacitor()) return null
  if (_admob) return _admob
  try {
    // Dynamic import with a variable string to prevent Vite/Rolldown from
    // statically resolving @capacitor-community/admob at build time.
    // The package is only installed when converting to Capacitor Android.
    const pkgName = '@capacitor-community/admob'
    // eslint-disable-next-line no-new-func
    const mod = await new Function('p', 'return import(p)')(pkgName)
    _admob = mod.AdMob
    return _admob
  } catch (err) {
    console.warn('[AdService] @capacitor-community/admob not installed:', err?.message)
    return null
  }
}

/** Returns true when ads are globally enabled and the user is not premium. */
function adsActive() {
  return !_globalDisabled && !_premiumUser
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

const AdService = {

  // ── Initialisation ─────────────────────────────────────────────────────────

  /**
   * Initialise AdMob. Call once on app startup, AFTER Capacitor is ready.
   * Safe to call in a browser — exits immediately with no side effects.
   *
   * @param {{ requestTrackingAuthorization?: boolean }} [options]
   */
  async initialize(options = {}) {
    if (!adsActive()) return
    const plugin = await getPlugin()
    if (!plugin || _initialised) return

    try {
      await plugin.initialize({
        // Request ATT permission on iOS (no-op on Android)
        requestTrackingAuthorization: options.requestTrackingAuthorization ?? false,
        // Use test ads in dev — overridden per-request via adUnitId() as well
        testingDevices: USE_TEST_ADS ? ['EMULATOR'] : [],
        initializeForTesting: USE_TEST_ADS,
      })
      _initialised = true
      console.info(`[AdService] Initialised (${USE_TEST_ADS ? 'TEST' : 'PRODUCTION'} ads)`)
    } catch (err) {
      console.warn('[AdService] initialize() failed:', err?.message)
    }
  },

  // ── Premium / disable toggle ───────────────────────────────────────────────

  /**
   * Call with true to suppress all ads for premium subscribers.
   * Also removes any visible banner.
   *
   * @param {boolean} isPremium
   */
  async setPremium(isPremium) {
    _premiumUser = isPremium
    if (isPremium) {
      await AdService.removeBanner()
    }
  },

  isPremium() {
    return _premiumUser
  },

  // ── Banner Ads ─────────────────────────────────────────────────────────────

  /**
   * Show a banner ad anchored to the bottom of the screen.
   * Safe to call on permitted screens only (Home, History/Progress).
   * Has no effect in a browser or when ads are disabled.
   *
   * Permitted screens: '/', '/report'
   * Never show on: '/workout', '/meal-plan', '/onboarding', '/setup'
   */
  async showBanner() {
    if (!adsActive()) return
    const plugin = await getPlugin()
    if (!plugin) return

    try {
      await plugin.showBanner({
        adId:     adUnitId('banner'),
        adSize:   'ADAPTIVE_BANNER',   // Adaptive = fills width, respects safe areas
        position: 'BOTTOM_CENTER',
        margin:   0,
        isTesting: USE_TEST_ADS,
      })
    } catch (err) {
      console.warn('[AdService] showBanner() failed:', err?.message)
    }
  },

  /** Hide the banner without destroying it (e.g. user navigated away). */
  async hideBanner() {
    const plugin = await getPlugin()
    if (!plugin) return
    try { await plugin.hideBanner() } catch { /* ignore */ }
  },

  /** Permanently remove and destroy the current banner. */
  async removeBanner() {
    const plugin = await getPlugin()
    if (!plugin) return
    try { await plugin.removeBanner() } catch { /* ignore */ }
  },

  // ── Interstitial Ads ───────────────────────────────────────────────────────

  /**
   * Preload an interstitial in the background.
   * Call this early (e.g. when the workout starts) so it is ready when needed.
   */
  async prepareInterstitial() {
    if (!adsActive()) return
    const plugin = await getPlugin()
    if (!plugin) return

    try {
      await plugin.prepareInterstitial({
        adId:      adUnitId('interstitial'),
        isTesting: USE_TEST_ADS,
      })
      _interstitialReady = true
    } catch (err) {
      console.warn('[AdService] prepareInterstitial() failed:', err?.message)
      _interstitialReady = false
    }
  },

  /**
   * Show the preloaded interstitial.
   * Must call prepareInterstitial() first.
   * Returns true if the ad was shown, false otherwise.
   *
   * IMPORTANT: Only call after natural breakpoints:
   *   - After a workout session completes and the user returns to Home
   *   - Never during active workout tracking or meal logging
   */
  async showInterstitial() {
    if (!adsActive() || !_interstitialReady) return false
    const plugin = await getPlugin()
    if (!plugin) return false

    try {
      await plugin.showInterstitial()
      _interstitialReady = false
      return true
    } catch (err) {
      console.warn('[AdService] showInterstitial() failed:', err?.message)
      _interstitialReady = false
      return false
    }
  },

  isInterstitialReady() {
    return _interstitialReady
  },

  // ── Rewarded Ads ───────────────────────────────────────────────────────────

  /**
   * Preload a rewarded ad.
   * Call ahead of time so it's ready when the user taps the reward button.
   */
  async prepareRewarded() {
    if (!adsActive()) return
    const plugin = await getPlugin()
    if (!plugin) return

    try {
      await plugin.prepareRewardVideoAd({
        adId:      adUnitId('rewarded'),
        isTesting: USE_TEST_ADS,
      })
      _rewardedReady = true
    } catch (err) {
      console.warn('[AdService] prepareRewarded() failed:', err?.message)
      _rewardedReady = false
    }
  },

  /**
   * Show the rewarded ad. The Promise resolves with the reward details if the
   * user earns the reward, or null if they skip / the ad fails.
   *
   * IMPORTANT:
   *   - Only show in response to an explicit user action (a "Watch ad" button).
   *   - Rewards must be non-essential (cosmetic themes, extra tips, etc.).
   *   - Never gate core fitness features behind a rewarded ad.
   *
   * @returns {Promise<{ type: string, amount: number } | null>}
   */
  async showRewarded() {
    if (!adsActive() || !_rewardedReady) return null
    const plugin = await getPlugin()
    if (!plugin) return null

    try {
      const result = await plugin.showRewardVideoAd()
      _rewardedReady = false
      return result?.value ?? null
    } catch (err) {
      console.warn('[AdService] showRewarded() failed:', err?.message)
      _rewardedReady = false
      return null
    }
  },

  isRewardedReady() {
    return _rewardedReady
  },

  // ── Event listeners ────────────────────────────────────────────────────────

  /**
   * Listen for interstitial ad events (loaded, failed, dismissed).
   * Returns an object with a remove() method to clean up.
   * No-op in browser.
   *
   * @param {'interstitialAdLoaded'|'interstitialAdFailedToLoad'|'interstitialAdOpened'|'interstitialAdClosed'} event
   * @param {Function} callback
   */
  async addListener(event, callback) {
    const plugin = await getPlugin()
    if (!plugin) return { remove: () => {} }
    try {
      return await plugin.addListener(event, callback)
    } catch {
      return { remove: () => {} }
    }
  },
}

export default AdService
