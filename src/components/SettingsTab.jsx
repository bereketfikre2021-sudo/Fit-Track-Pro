import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Trash2,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  LogOut,
  Languages,
  Calendar,
  Bell,
  Sparkles,
  CheckCircle2,
  Cloud,
  FileJson,
  Dumbbell,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react'
import { getAppSettings, updateAppSettings, SUPPORTED_LOCALES } from '@/lib/appSettings'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { toast } from 'sonner'
import CopyrightBadge from './CopyrightBadge'
import JsonFileActions from './JsonFileActions'
import { isGeminiConfigured } from '@/lib/gemini'
import { NotificationSettings } from './NotificationSettings'
import { useAuth } from '@/lib/useAuth'

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function SettingsTab({ state, updateState, exportData, importData, clearAllData, onLogout }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const appSettings = getAppSettings(state)

  const patchSettings = (patch) => {
    updateState(updateAppSettings(state, patch))
  }
  const [showAccountData, setShowAccountData] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [hasExportedBackup, setHasExportedBackup] = useState(false)
  const [confirmedBackup, setConfirmedBackup] = useState(false)

  const canClear = hasExportedBackup || confirmedBackup || !!user

  const openClearDialog = () => {
    setHasExportedBackup(false)
    setConfirmedBackup(false)
    setClearDialogOpen(true)
  }

  const handleExportFromDialog = () => {
    exportData()
    setHasExportedBackup(true)
    toast.success(t('settings.clearDialog.toastBackup'))
  }

  const handleConfirmClear = () => {
    if (!canClear) return
    clearAllData()
    setClearDialogOpen(false)
    setHasExportedBackup(false)
    setConfirmedBackup(false)
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link
              to="/profile"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t('settings.accountData.profile')}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          </li>
          <li className="text-foreground font-medium" aria-current="page">
            {t('settings.title')}
          </li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>

      <Card className="mb-6">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-muted/30 rounded-t-lg transition-colors"
          onClick={() => setShowAccountData((v) => !v)}
        >
          <div className="min-w-0">
            <p className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              {t('settings.accountData.title', { defaultValue: 'Account & Data' })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {user ? t('settings.accountData.signedInAs', { email: user.email }) : t('settings.accountData.signInPrompt')}
            </p>
          </div>
          {showAccountData ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {showAccountData && (
          <CardContent className="space-y-5 pt-0 pb-4 border-t border-border/60">

            {/* ── Cloud sync status ── */}
            {user ? (
              <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-3 mt-3">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">{t('settings.accountData.cloudActive')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">
                    {user.email || 'Google account'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.accountData.cloudActiveDesc')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 px-3 py-3 mt-3">
                <Cloud className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{t('settings.accountData.notSignedIn')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.accountData.notSignedInDesc')}{' '}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                      {t('settings.accountData.signIn')}
                    </Link>{' '}
                    {t('settings.accountData.signInToSync')}
                  </p>
                </div>
              </div>
            )}

            {/* ── Sign out ── */}
            {user && (
              <div className="space-y-2 border-t border-border/60 pt-4">
                <p className="text-sm font-medium">{t('settings.accountData.session')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.accountData.sessionDesc')}
                </p>
                <Button variant="outline" className="w-full sm:w-auto" onClick={onLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('settings.accountData.signOut')}
                </Button>
              </div>
            )}

            {/* ── Data portability ── */}
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-sm font-medium">{t('settings.accountData.dataPortability')}</p>
              <p className="text-xs text-muted-foreground">
                Export a full backup including exercise images, shopping list, and app settings that cloud sync doesn't cover. Use to migrate to a new device or keep a local copy.
                {user && ' Cloud sync covers your profile, meals, workouts, and water logs automatically.'}
              </p>
              <JsonFileActions
                showTemplate={false}
                onExport={exportData}
                onImportFileSelected={importData}
                accept=".json"
                exportLabel={t('settings.data.exportJson')}
                importLabel={t('settings.data.importJson')}
              />
            </div>

            {/* ── Clear local device cache ── */}
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-sm font-medium">{t('settings.accountData.clearCache')}</p>
              <p className="text-xs text-muted-foreground">
                {user ? t('settings.accountData.clearCacheDesc') : t('settings.accountData.clearCacheDescNoCloud')}
              </p>
              <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={openClearDialog}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('settings.accountData.clearDeviceData')}
              </Button>
            </div>

          </CardContent>
        )}
      </Card>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('settings.accountData.clearDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-left pt-2 space-y-2">
              <span className="block">
                {t('settings.clearDialog.body1')}
              </span>
              <span className="block font-medium text-foreground">
                {user ? t('settings.accountData.clearDialogBodyCloud') : t('settings.accountData.clearDialogBodyNoCloud')}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Only require backup confirmation when NOT signed in (no cloud safety net) */}
            {!user && (
              <Button className="w-full" onClick={handleExportFromDialog}>
                <Download className="h-4 w-4 mr-2" />
                {hasExportedBackup
                  ? t('settings.clearDialog.exportAgain')
                  : t('settings.clearDialog.exportNow')}
              </Button>
            )}

            {!user && hasExportedBackup && (
              <p className="text-xs text-primary font-medium text-center">
                {t('settings.clearDialog.exportedHint')}
              </p>
            )}

            {!user && (
              <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedBackup}
                  onChange={(e) => setConfirmedBackup(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm text-muted-foreground">
                  {t('settings.clearDialog.checkbox')}
                </span>
              </label>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              variant="destructive"
              className="w-full"
              disabled={!canClear}
              onClick={handleConfirmClear}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.accountData.clearDeviceData')}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setClearDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            {!canClear && (
              <p className="text-xs text-center text-muted-foreground">
                {t('settings.clearDialog.mustExport')}
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Push Notification Settings ── */}
      <NotificationSettings />

      <Card className="mb-6">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-muted/30 rounded-t-lg transition-colors"
          onClick={() => setShowPreferences((v) => !v)}
        >
          <div className="min-w-0">
            <p className="text-base font-semibold flex items-center gap-2">
              <Languages className="h-4 w-4 shrink-0" />
              {t('settings.preferences.title')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {t('settings.preferences.subtitle')}
            </p>
          </div>
          {showPreferences ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        {showPreferences && (
          <CardContent className="space-y-5 pt-0 pb-4 border-t border-border/60">
          <div className="space-y-2 pt-3">
            <p className="text-sm font-medium">{t('settings.language.title')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.language.description')}</p>
            <select
              value={appSettings.locale}
              onChange={(e) => patchSettings({ locale: e.target.value })}
              className={selectClassName}
              aria-label={t('settings.language.title')}
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc} value={loc}>
                  {loc === 'en' ? t('settings.language.english') : t('settings.language.amharic')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4 border-t border-border/60 pt-4">
            <p className="text-sm font-medium">{t('settings.workoutPrefs.title')}</p>
          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3">
            <input
              type="checkbox"
              checked={appSettings.enableSetLogging}
              onChange={(e) => patchSettings({ enableSetLogging: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium block">{t('settings.workoutPrefs.setLogging')}</span>
              <span className="text-muted-foreground text-xs">
                {t('settings.workoutPrefs.setLoggingHint')}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3">
            <input
              type="checkbox"
              checked={appSettings.autoStartRestOnComplete}
              onChange={(e) => patchSettings({ autoStartRestOnComplete: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium block">{t('settings.workoutPrefs.autoRest')}</span>
              <span className="text-muted-foreground text-xs">
                {t('settings.workoutPrefs.autoRestHint')}
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.workoutPrefs.defaultRest')}</label>
            <Input
              type="number"
              min={15}
              max={600}
              step={15}
              value={appSettings.defaultRestSeconds}
              onChange={(e) =>
                patchSettings({ defaultRestSeconds: parseInt(e.target.value, 10) || 60 })
              }
              className="max-w-[140px]"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.workoutPrefs.defaultRestHint')}
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3">
            <input
              type="checkbox"
              checked={appSettings.restTimerSound}
              onChange={(e) => patchSettings({ restTimerSound: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium block">{t('settings.workoutPrefs.soundEnd')}</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3">
            <input
              type="checkbox"
              checked={appSettings.restTimerVibrate}
              onChange={(e) => patchSettings({ restTimerVibrate: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium block">{t('settings.workoutPrefs.vibrateEnd')}</span>
              <span className="text-muted-foreground text-xs">
                {t('settings.workoutPrefs.vibrateHint')}
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.workoutPrefs.waterGoal')}</label>
            <Input
              type="number"
              min={1}
              max={20}
              step={1}
              value={appSettings.waterGoalCups}
              onChange={(e) =>
                patchSettings({ waterGoalCups: parseInt(e.target.value, 10) || 8 })
              }
              className="max-w-[140px]"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.workoutPrefs.waterGoalHint')}
            </p>
          </div>

          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium">{t('settings.workoutPrefs.workoutReminderTitle')}</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3">
              <input
                type="checkbox"
                checked={appSettings.workoutReminderEnabled}
                onChange={(e) => patchSettings({ workoutReminderEnabled: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">
                <span className="font-medium block">{t('settings.workoutPrefs.workoutReminderLabel')}</span>
                <span className="text-muted-foreground text-xs">
                  {t('settings.workoutPrefs.workoutReminderHint')}
                </span>
              </span>
            </label>
            {appSettings.workoutReminderEnabled && (
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('settings.workoutPrefs.workoutReminderTime')}</label>
                <input
                  type="time"
                  value={appSettings.workoutReminderTime}
                  onChange={(e) => patchSettings({ workoutReminderTime: e.target.value })}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-w-[140px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.workoutPrefs.workoutReminderTimeHint')}
                </p>
              </div>
            )}
          </div>
          </div>

          <div className="space-y-2 border-t border-border/60 pt-4">
            <p className="text-sm font-medium">{t('settings.shortcuts.title')}</p>
            <Link
              to="/exercises?tab=schedule"
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="font-medium block">{t('settings.shortcuts.trainingDays')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('settings.shortcuts.trainingDaysHint')}
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              to="/meal-plan#reminders"
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Bell className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="font-medium block">{t('settings.shortcuts.mealReminders')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('settings.shortcuts.mealRemindersHint')}
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </div>
          </CardContent>
        )}
      </Card>

      {/* ── Advanced Settings ── */}
      <Card className="mb-6">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-muted/30 rounded-t-lg transition-colors"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <div className="min-w-0">
            <p className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              Advanced Settings
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Developer tools and power-user features
            </p>
          </div>
          {showAdvanced
            ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>

        {showAdvanced && (
          <CardContent className="space-y-5 pt-0 pb-4 border-t border-border/60">

            {/* ── JSON Import / Export ── */}
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-medium">JSON Import / Export</p>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, JSON download template and import buttons appear in Exercises, Meal Plan, and Shopping List sections. Download a template, fill it in, then import it back to populate that section.
              </p>
              <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={appSettings.enableJsonImportExport}
                  onChange={(e) => patchSettings({ enableJsonImportExport: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm">
                  <span className="font-medium block">Enable JSON import/export</span>
                  <span className="text-muted-foreground text-xs">
                    Shows JSON controls in Exercises, Meals, and Shopping List
                  </span>
                </span>
              </label>

              {appSettings.enableJsonImportExport && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-primary">JSON controls are now active in:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span><strong>Library → My Exercises</strong> — download template, export your exercises, import from JSON</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span><strong>Meals → Weekly Meals</strong> — download template, export your meal plan, import from JSON</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShoppingCart className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span><strong>Meals → Shopping List</strong> — download template, export your shopping list, import from JSON</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Gemini AI API Key ── */}
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-medium">{t('settings.ai.title')}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.ai.description')}</p>
              <div className="space-y-2">
                <label htmlFor="gemini-api-key" className="text-sm font-medium">
                  {t('settings.ai.apiKeyLabel')}
                </label>
                <input
                  id="gemini-api-key"
                  type="password"
                  autoComplete="off"
                  placeholder={t('settings.ai.apiKeyPlaceholder')}
                  value={appSettings.geminiApiKey}
                  onChange={(e) => patchSettings({ geminiApiKey: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.ai.apiKeyHint')}{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {t('settings.ai.getKeyLink')}
                  </a>
                </p>
                {isGeminiConfigured() ? (
                  <p className="text-xs text-primary font-medium">{t('settings.ai.configured')}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('settings.ai.notConfigured')}</p>
                )}
              </div>
            </div>

          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.about.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t('settings.about.version')}</p>
          <p>{t('settings.about.tagline')}</p>
          <p className="pt-2 text-xs">{t('settings.about.stack')}</p>
          <div className="pt-3">
            <Link
              to="/privacy-policy"
              className="text-xs text-primary hover:underline underline-offset-2"
            >
              {t('settings.accountData.privacyPolicy')}
            </Link>
          </div>
          <div className="pt-4 border-t border-border">
            <CopyrightBadge className="text-center" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsTab
