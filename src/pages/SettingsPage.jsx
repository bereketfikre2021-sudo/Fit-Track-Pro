import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import SettingsTab from '../components/SettingsTab'

function SettingsPage({ state, updateState, exportData, importData, clearAllData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = () => {
    updateState({ onboarded: false })
    toast.success(t('settings.toastLogout'))
    navigate('/onboarding', { replace: true })
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
