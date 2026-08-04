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
    // Sign out from Supabase, clear offline queue, then reset local state
    await signOut()
    clearQueue()
    updateState({ onboarded: false })
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
