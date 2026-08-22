/**
 * NotificationSettings.jsx
 *
 * A self-contained, collapsible settings section for push notification
 * preferences. Designed to be embedded inside SettingsTab.
 *
 * Features:
 *   - Requests permission only when the user explicitly enables notifications
 *   - Shows clear UI feedback for denied / unsupported permission states
 *   - Persists preferences to Supabase (notification_preferences table)
 *   - Keeps all controls disabled when Firebase is not configured
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  BellOff,
  BellRing,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Droplets,
  UtensilsCrossed,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { cn } from '../lib/utils'
import { useAuth } from '../lib/useAuth'
import { useFcm } from '../lib/useFcm'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '../lib/fcmService'

// ── Default preference values ─────────────────────────────────────────────────
const DEFAULT_PREFS = {
  notifications_enabled:     false,
  workout_reminders_enabled: false,
  meal_reminders_enabled:    false,
  water_reminders_enabled:   false,
  progress_reminders_enabled: false,
  workout_reminder_time:     '07:00',
  water_reminder_interval:   2,
}

export function NotificationSettings() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { permissionState, token, requesting, enableNotifications, disableNotifications } =
    useFcm(user?.id)

  const [open,     setOpen]    = useState(false)
  const [prefs,    setPrefs]   = useState(DEFAULT_PREFS)
  const [saving,   setSaving]  = useState(false)
  const [loading,  setLoading] = useState(false)

  const isConfigured = isFirebaseConfigured()
  const isGranted    = permissionState === 'granted'
  const isDenied     = permissionState === 'denied'
  const isDefault    = permissionState === 'default'
  const isUnsupported = permissionState === 'unsupported'

  // ── Load preferences from Supabase on open ──────────────────────────────
  useEffect(() => {
    if (!open || !user?.id) return
    setLoading(true)
    loadNotificationPreferences(user.id).then((data) => {
      if (data) {
        setPrefs((prev) => ({ ...prev, ...data }))
      }
      setLoading(false)
    })
  }, [open, user?.id])

  // ── Save a preference patch ──────────────────────────────────────────────
  const patch = useCallback(async (updates) => {
    const next = { ...prefs, ...updates }
    setPrefs(next)
    setSaving(true)
    try {
      await saveNotificationPreferences(user?.id, next)
    } finally {
      setSaving(false)
    }
  }, [prefs, user?.id])

  // ── Toggle master notifications switch ──────────────────────────────────
  const handleMasterToggle = async () => {
    if (!isConfigured || isUnsupported) return

    if (!prefs.notifications_enabled) {
      // Turning ON — request permission first
      const result = await enableNotifications()
      if (result === 'granted') {
        await patch({ notifications_enabled: true })
      }
    } else {
      // Turning OFF — revoke FCM token
      await disableNotifications()
      await patch({ notifications_enabled: false })
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const masterEnabled = prefs.notifications_enabled && isGranted

  return (
    <Card>
      {/* ── Section header / toggle ── */}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-muted/30 rounded-t-lg transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 shrink-0" aria-hidden />
            {t('settings.pushNotifications.title')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {!isConfigured
              ? t('settings.pushNotifications.notConfigured')
              : isUnsupported
              ? t('settings.pushNotifications.unsupported')
              : isDenied
              ? t('settings.pushNotifications.denied')
              : isGranted && prefs.notifications_enabled
              ? t('settings.pushNotifications.active')
              : t('settings.pushNotifications.tapToConfigure')}
          </p>
        </div>
        {open
          ? <ChevronUp  className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 border-t border-border/60 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && (
            <>
              {/* ── Not configured banner ── */}
              {!isConfigured && (
                <InfoBanner icon={AlertTriangle} variant="warning" className="mt-3">
                  {t('settings.pushNotifications.firebaseNotConfigured')}
                </InfoBanner>
              )}

              {/* ── Unsupported browser banner ── */}
              {isConfigured && isUnsupported && (
                <InfoBanner icon={BellOff} variant="warning" className="mt-3">
                  {t('settings.pushNotifications.browserUnsupported')}
                </InfoBanner>
              )}

              {/* ── Permission denied banner ── */}
              {isConfigured && isDenied && (
                <InfoBanner icon={AlertTriangle} variant="destructive" className="mt-3">
                  {t('settings.pushNotifications.permissionDenied')}
                  <ol className="mt-1.5 ml-4 list-decimal space-y-0.5 text-xs">
                    <li>{t('settings.pushNotifications.deniedStep1')}</li>
                    <li>{t('settings.pushNotifications.deniedStep2')}</li>
                    <li>{t('settings.pushNotifications.deniedStep3')}</li>
                  </ol>
                </InfoBanner>
              )}

              {/* ── Master toggle ── */}
              {isConfigured && !isUnsupported && (
                <div className="flex items-center justify-between gap-4 pt-3">
                  <div>
                    <p className="text-sm font-medium">{t('settings.pushNotifications.enableTitle')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('settings.pushNotifications.enableDesc')}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={masterEnabled}
                    disabled={isDenied || isUnsupported || requesting}
                    loading={requesting}
                    onChange={handleMasterToggle}
                    aria-label={t('settings.pushNotifications.enableTitle')}
                  />
                </div>
              )}

              {/* ── Granular toggles (only when master is on) ── */}
              {masterEnabled && (
                <div className="space-y-3 border-t border-border/60 pt-4">

                  {/* Workout reminders */}
                  <ReminderRow
                    icon={Dumbbell}
                    label={t('settings.pushNotifications.workoutReminders')}
                    description={t('settings.pushNotifications.workoutRemindersDesc')}
                    checked={prefs.workout_reminders_enabled}
                    onChange={(v) => patch({ workout_reminders_enabled: v })}
                    saving={saving}
                  >
                    {prefs.workout_reminders_enabled && (
                      <TimeInput
                        label={t('settings.pushNotifications.reminderTime')}
                        value={prefs.workout_reminder_time}
                        onChange={(v) => patch({ workout_reminder_time: v })}
                      />
                    )}
                  </ReminderRow>

                  {/* Meal reminders */}
                  <ReminderRow
                    icon={UtensilsCrossed}
                    label={t('settings.pushNotifications.mealReminders')}
                    description={t('settings.pushNotifications.mealRemindersDesc')}
                    checked={prefs.meal_reminders_enabled}
                    onChange={(v) => patch({ meal_reminders_enabled: v })}
                    saving={saving}
                  />

                  {/* Water reminders */}
                  <ReminderRow
                    icon={Droplets}
                    label={t('settings.pushNotifications.waterReminders')}
                    description={t('settings.pushNotifications.waterRemindersDesc')}
                    checked={prefs.water_reminders_enabled}
                    onChange={(v) => patch({ water_reminders_enabled: v })}
                    saving={saving}
                  >
                    {prefs.water_reminders_enabled && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          {t('settings.pushNotifications.remindEvery')}
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            min={1}
                            max={12}
                            value={prefs.water_reminder_interval}
                            onChange={(e) =>
                              patch({
                                water_reminder_interval:
                                  Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 2)),
                              })
                            }
                            className="w-20 h-8 text-sm"
                          />
                          <span className="text-sm text-muted-foreground">{t('settings.pushNotifications.hours')}</span>
                        </div>
                      </div>
                    )}
                  </ReminderRow>

                  {/* Progress reminders */}
                  <ReminderRow
                    icon={TrendingUp}
                    label={t('settings.pushNotifications.progressReminders')}
                    description={t('settings.pushNotifications.progressRemindersDesc')}
                    checked={prefs.progress_reminders_enabled}
                    onChange={(v) => patch({ progress_reminders_enabled: v })}
                    saving={saving}
                  />

                  {/* Token debug info (only in dev) */}
                  {import.meta.env.DEV && token && (
                    <p className="text-[10px] text-muted-foreground/50 break-all mt-2">
                      Token: {token.slice(0, 20)}…
                    </p>
                  )}
                </div>
              )}

              {/* Granted + master off — show activate hint */}
              {isConfigured && isGranted && !prefs.notifications_enabled && !isDenied && (
                <InfoBanner icon={CheckCircle2} variant="info" className="mt-3">
                  {t('settings.pushNotifications.permissionGrantedHint')}
                </InfoBanner>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled, loading, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked ? 'bg-primary' : 'bg-muted',
        (disabled || loading) && 'opacity-50 cursor-not-allowed'
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg',
          'transform transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
          'flex items-center justify-center'
        )}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </span>
    </button>
  )
}

function ReminderRow({ icon: Icon, label, description, checked, onChange, saving, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ToggleSwitch
          checked={checked}
          onChange={onChange}
          loading={saving}
          aria-label={label}
        />
      </div>
      {children && <div className="ml-6">{children}</div>}
    </div>
  )
}

function TimeInput({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-1 flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm',
          'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring max-w-[130px]'
        )}
      />
    </div>
  )
}

function InfoBanner({ icon: Icon, variant, className, children }) {
  const variants = {
    warning:     'border-amber-500/30 bg-amber-500/10 text-amber-200',
    destructive: 'border-red-500/30 bg-red-500/10 text-red-200',
    info:        'border-primary/30 bg-primary/10 text-primary',
  }
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border p-3 text-xs',
        variants[variant] ?? variants.info,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export default NotificationSettings
