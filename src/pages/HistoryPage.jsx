import HistoryTab from '../components/HistoryTab'
import ProgressPhotosCard from '../components/ProgressPhotosCard'
import BannerAdSpacer from '../components/BannerAdSpacer'
import { useAds } from '../lib/useAds'

function HistoryPage({ state, updateState }) {
  useAds({ banner: true })

  return (
    <>
      <HistoryTab state={state} updateState={updateState} />

      {/* Progress photos section */}
      <div className="px-4 md:px-6 pb-4">
        <div className="mt-2 rounded-2xl border border-border bg-card p-4">
          <ProgressPhotosCard />
        </div>
      </div>

      <BannerAdSpacer />
    </>
  )
}

export default HistoryPage
