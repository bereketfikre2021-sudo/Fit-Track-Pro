import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import SettingsTab from '../components/SettingsTab'
import { useAuth } from '../lib/useAuth'
import { clearQueue } from '../lib/offlineQueue'

function SettingsPage({ state, updateState, exportData, importData, clearAllData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    // Sign out from Supabase and clear ALL local data so the next
    // user who signs in starts with a clean slate (no previous user's
    // progress, sessions, meals, shopping list, body logs, etc.)
    await signOut()
    clearQueue()
    clearAllData({ showToast: false })
    toast.success(t('settings.toastLogout'))
    navigate('/login', { replace: true })
  }

  return (
    <SettingsTab
      state={state}
      updateState={updateState}
      exportData={exportData}
      importData={importData}
      clearAllData={clearAllData}
      onLogout={handleLogout}
    />
  )
}

export default SettingsPage
