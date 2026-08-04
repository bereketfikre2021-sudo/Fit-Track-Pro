import HistoryTab from '../components/HistoryTab'
import BannerAdSpacer from '../components/BannerAdSpacer'
import { useAds } from '../lib/useAds'

function HistoryPage({ state, updateState }) {
  // Banner ad on the History/Progress screen — non-intrusive, bottom placement.
  // No interstitials on this screen (user is reviewing past data).
  useAds({ banner: true })

  return (
    <>
      <HistoryTab state={state} updateState={updateState} />
      {/* Space reserved for the native AdMob banner (Capacitor only) */}
      <BannerAdSpacer />
    </>
  )
}

export default HistoryPage
