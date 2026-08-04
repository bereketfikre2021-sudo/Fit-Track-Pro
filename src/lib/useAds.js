/**
 * useAds.js
 *
 * React hook that manages the ad lifecycle for a given screen / route.
 *
 * Usage
 * ─────
 *   const { showRewardedAd, rewardedReady } = useAds({
 *     banner: true,           // show a banner on this screen
 *     preloadInterstitial: true,  // preload for later use
 *   })
 *
 * The hook automatically:
 *   • Shows / hides the banner when the component mounts / unmounts
 *   • Preloads interstitials in the background when requested
 *   • Handles Capacitor lifecycle events (app resume / pause)
 *   • Is a complete no-op in the browser / PWA / when ads are disabled
 *
 * Ad-safe screens (banner allowed)
 * ────────────────────────────────
 *   / (home), /report (history / progress)
 *
 * Ad-blocked screens (never show ads)
 * ─────────────────────────────────────
 *   /workout, /meal-plan, /onboarding, /setup
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import AdService from './monetization'

/**
 * @param {{
 *   banner?: boolean,
 *   preloadInterstitial?: boolean,
 *   preloadRewarded?: boolean,
 * }} [options]
 */
export function useAds({
  banner            = false,
  preloadInterstitial = false,
  preloadRewarded   = false,
} = {}) {
  const [interstitialReady, setInterstitialReady] = useState(false)
  const [rewardedReady,     setRewardedReady]     = useState(false)

  // Track whether the banner is currently visible so we don't double-show
  const bannerVisibleRef = useRef(false)

  // ── Banner lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (!banner) return

    let mounted = true

    const show = async () => {
      if (!mounted || bannerVisibleRef.current) return
      await AdService.showBanner()
      if (mounted) bannerVisibleRef.current = true
    }

    show()

    return () => {
      mounted = false
      // Hide (not remove) so it can be re-shown quickly on navigation back
      AdService.hideBanner().then(() => {
        bannerVisibleRef.current = false
      })
    }
  }, [banner])

  // ── Preload interstitial ────────────────────────────────────────────────
  useEffect(() => {
    if (!preloadInterstitial) return

    let mounted = true

    const prepare = async () => {
      await AdService.prepareInterstitial()
      if (mounted) setInterstitialReady(AdService.isInterstitialReady())
    }

    prepare()

    return () => { mounted = false }
  }, [preloadInterstitial])

  // ── Preload rewarded ────────────────────────────────────────────────────
  useEffect(() => {
    if (!preloadRewarded) return

    let mounted = true

    const prepare = async () => {
      await AdService.prepareRewarded()
      if (mounted) setRewardedReady(AdService.isRewardedReady())
    }

    prepare()

    return () => { mounted = false }
  }, [preloadRewarded])

  // ── Exposed actions ─────────────────────────────────────────────────────

  /**
   * Show a preloaded interstitial ad.
   * Returns true if the ad was displayed.
   *
   * Only call at natural breakpoints — never mid-workout or mid-meal-log.
   */
  const showInterstitialAd = useCallback(async () => {
    const shown = await AdService.showInterstitial()
    setInterstitialReady(false)
    if (shown) {
      // Preload the next one immediately after dismissal
      AdService.prepareInterstitial().then(() => {
        setInterstitialReady(AdService.isInterstitialReady())
      })
    }
    return shown
  }, [])

  /**
   * Show a rewarded ad (user-initiated only).
   * Returns the reward object { type, amount } or null if skipped / failed.
   */
  const showRewardedAd = useCallback(async () => {
    const reward = await AdService.showRewarded()
    setRewardedReady(false)
    // Preload the next rewarded ad
    AdService.prepareRewarded().then(() => {
      setRewardedReady(AdService.isRewardedReady())
    })
    return reward
  }, [])

  return {
    interstitialReady,
    rewardedReady,
    showInterstitialAd,
    showRewardedAd,
  }
}
