/**
 * BannerAdSpacer.jsx
 *
 * Reserves vertical space at the bottom of a screen for the native AdMob
 * banner that Capacitor renders as a native Android view (overlaid on top of
 * the WebView). Without this spacer the banner would cover the bottom of the
 * page content.
 *
 * In the browser / PWA, the Capacitor plugin is absent so the banner is never
 * shown — in that case this component renders nothing (height 0).
 *
 * Premium / Pro subscribers have `features.ads === false` — spacer is also
 * skipped for them since the banner never shows.
 *
 * Height: standard AdMob ADAPTIVE_BANNER is typically 50–90 dp.
 * We use 64 px as a safe default that works for most devices.
 *
 * Usage:
 *   Add <BannerAdSpacer /> at the bottom of pages that show a banner ad.
 */

import { cn } from '../lib/utils'
import { getCachedFeatures } from '../lib/useSubscription'

// The native banner Capacitor renders is ~50–90 dp tall.
// 64 px gives comfortable clearance on most screen densities.
const BANNER_HEIGHT_PX = 64

/**
 * @param {{ className?: string }} [props]
 */
function BannerAdSpacer({ className }) {
  // Only reserve space when running in Capacitor — returns null in browser/PWA
  const isCapacitor =
    typeof window !== 'undefined' && !!(window.Capacitor?.isNativePlatform?.())

  // Premium users have ads disabled — no spacer needed
  const features = getCachedFeatures()
  const adsEnabled = features.ads !== false

  if (!isCapacitor || !adsEnabled) return null

  return (
    <div
      aria-hidden="true"
      style={{ height: BANNER_HEIGHT_PX }}
      className={cn('w-full shrink-0 pointer-events-none', className)}
    />
  )
}

export default BannerAdSpacer
