import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { toast } from 'sonner'
import OnboardingPage from './pages/OnboardingPage'
import PlanSetupPage from './pages/PlanSetupPage'
import DashboardLayout from './pages/DashboardLayout'
import HomePage from './pages/HomePage'
import WorkoutPage from './pages/WorkoutPage'
import HistoryPage from './pages/HistoryPage'
import CustomPage from './pages/CustomPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import MealPlanPage from './pages/MealPlanPage'
import SubscriptionPage from './pages/SubscriptionPage'
import PaymentHistoryPage from './pages/PaymentHistoryPage'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import AuthConfirmPage from './pages/AuthConfirmPage'
import AuthGuard from './components/AuthGuard'
import AdminGuard from './components/AdminGuard'
import RequireEmailVerified from './components/RequireEmailVerified'
import { AuthProvider, useAuth } from './lib/useAuth'
import { loadAppState, clearAppState } from './lib/storage'
import { useDebouncedSave } from './lib/useDebouncedSave'
import { useSupabaseSync } from './lib/useSupabaseSync'
import { loadAllFromSupabase, syncUserProfile, syncBodyLog, syncMealSlot, syncWaterLog, syncWorkoutSession } from './lib/supabaseDb'
import {
  createDefaultAppState,
  CURRENT_SCHEMA_VERSION,
  hydrateAppStateFromBackup,
} from './lib/appState'
import { useMealReminders } from './lib/useMealReminders'
import { useWorkoutReminder } from './lib/useWorkoutReminder'
import I18nSync from './components/I18nSync'
import PwaInstallPrompt from './components/PwaInstallPrompt'
import i18n from './i18n'
import { translateWeekday } from './lib/i18nHelpers'
import { getAppSettings } from './lib/appSettings'
import { configureGeminiFromAppSettings } from './lib/gemini'
import { needsPlanSetup } from './lib/planEmpty'
import AdService from './lib/monetization'

function RequireOnboarded({ state, children }) {
  if (!state.onboarded) return <Navigate to="/onboarding" replace />
  return children
}

function RequirePlanSetupDone({ state, children }) {
  if (needsPlanSetup(state)) return <Navigate to="/setup" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const [state, setState] = useState(() => {
    const loaded = loadAppState()
    configureGeminiFromAppSettings(getAppSettings(loaded))
    return loaded
  })

  // cloudLoading: true while we're fetching Supabase data after login.
  // During this time we show a spinner instead of routing, preventing flicker.
  const [cloudLoading, setCloudLoading] = useState(false)
  const cloudLoadedFor = useRef(null)

  // ── On login: load ALL data from Supabase, replace local state cleanly ──
  useEffect(() => {
    if (!user?.id || cloudLoadedFor.current === user.id) return
    cloudLoadedFor.current = user.id
    setCloudLoading(true)

    // Safety timeout — if Supabase doesn't respond in 5s (offline), just use local state
    const timeout = setTimeout(() => setCloudLoading(false), 5000)

    loadAllFromSupabase(user.id).then((patch) => {
      clearTimeout(timeout)
      if (patch) {
        setState((prev) => {
          const merged = { ...prev, ...patch }
          merged.appSettings = prev.appSettings // device-specific, keep local
          if (!patch.workoutSchedule) merged.workoutSchedule = prev.workoutSchedule
          if (!patch.customExercises) merged.customExercises = prev.customExercises
          // If cloud says onboarded, also infer planSetupComplete so no /setup flash
          if (patch.onboarded) {
            merged.planSetupComplete = true
          }

          // Preserve local imageUrl on meal plan foods — the DB schema
          // doesn't store imageUrl so cloud data always comes back without it.
          // We re-attach images from local state by matching day+slot+name.
          if (patch.mealPlan && prev.mealPlan) {
            const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
            const SLOTS = ['breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed']
            const restoredPlan = {}
            for (const day of DAYS) {
              restoredPlan[day] = {}
              for (const slot of SLOTS) {
                const cloudFoods = patch.mealPlan?.[day]?.[slot] ?? []
                const localFoods = prev.mealPlan?.[day]?.[slot] ?? []
                // Build a name→imageUrl map from local state
                const localImageMap = {}
                for (const f of localFoods) {
                  if (f.imageUrl && f.name) {
                    localImageMap[String(f.name).toLowerCase().trim()] = f.imageUrl
                  }
                }
                restoredPlan[day][slot] = cloudFoods.map((f) => ({
                  ...f,
                  imageUrl: f.imageUrl || localImageMap[String(f.name || '').toLowerCase().trim()] || '',
                }))
              }
            }
            merged.mealPlan = restoredPlan
          }

          return merged
        })
      }
      setCloudLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setCloudLoading(false)
    })
  }, [user?.id])

  // ── Clear cloud-load marker on sign-out ─────────────────────────────────
  useEffect(() => {
    if (!user) cloudLoadedFor.current = null
  }, [user])

  useEffect(() => {
    configureGeminiFromAppSettings(getAppSettings(state))
  }, [state.appSettings])

  // ── Persist to localStorage + sync to Supabase ───────────────────────────
  useDebouncedSave(state)
  useSupabaseSync(state)
  useMealReminders(state)
  useWorkoutReminder(state)

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  // Show spinner while cloud data is loading to prevent any routing flash
  if (cloudLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading your data…</p>
      </div>
    )
  }

  const handleOnboardingComplete = (onboardingData) => {
    const workoutSchedule = {}
    ;(onboardingData.workoutDays || []).forEach((day) => {
      workoutSchedule[day] = {
        note: i18n.t('common.dayWorkout', { day: translateWeekday(day) }),
        exercises: [],
      }
    })

    const profileUpdate = {
      ...state.profile,
      name:              onboardingData.name,
      registrationDate:  onboardingData.registrationDate,
      birthDate:         onboardingData.birthDate || '',
      gender:            onboardingData.gender,
      currentWeight:     onboardingData.currentWeight,
      height:            onboardingData.height,
      targetWeight:      onboardingData.targetWeight,
      avatarUrl:         onboardingData.avatarUrl || '',
      goal:              onboardingData.goal,
      focusArea:         onboardingData.focusArea,
      equipment:         onboardingData.equipment || [],
      fitnessLevel:      onboardingData.fitnessLevel,
      fitnessLevelManual: onboardingData.fitnessLevelManual ?? false,
      workoutDays:       onboardingData.workoutDays,
    }

    updateState({
      onboarded: true,
      planSetupComplete: false,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      profile: profileUpdate,
      customExercises: [],
      workoutSchedule,
    })

    // Push profile to Supabase immediately after onboarding
    if (user?.id) {
      syncUserProfile(user.id, profileUpdate)
    }

    toast.success(i18n.t('app.welcome', { name: onboardingData.name }))
  }

  const exportData = ({ showToast = true } = {}) => {
    const payload = { ...state, schemaVersion: CURRENT_SCHEMA_VERSION }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fittrack-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    if (showToast) {
      toast.success(i18n.t('app.exportSuccess'))
    }
  }

  const importData = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result
        if (typeof text !== 'string') {
          throw new Error('Could not read file')
        }
        const imported = hydrateAppStateFromBackup(text)
        setState(imported)
        toast.success(i18n.t('app.importSuccess'))

        // Push all imported data to Supabase so it survives across sessions
        const userId = user?.id
        if (userId) {
          const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
          const SLOTS = ['breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed']
          try {
            if (imported.profile?.name) await syncUserProfile(userId, imported.profile)
            for (const log of imported.bodyLogs || []) await syncBodyLog(userId, log)
            for (const day of DAYS) {
              for (const slot of SLOTS) {
                const foods = imported.mealPlan?.[day]?.[slot]
                if (foods?.length) await syncMealSlot(userId, day, slot, foods)
              }
            }
            for (const [date, cups] of Object.entries(imported.waterLogs || {})) {
              await syncWaterLog(userId, date, cups)
            }
            for (const session of imported.completedSessions || []) {
              await syncWorkoutSession(userId, session, imported.completedExercises || {})
            }
            toast.success('Data synced to cloud!', { duration: 3000 })
          } catch (syncErr) {
            console.warn('[importData] Cloud sync failed:', syncErr?.message)
          }
          // Reset cloud-load marker so fresh data loads next session
          cloudLoadedFor.current = null
        }
      } catch (err) {
        toast.error(err.message || i18n.t('app.importInvalid'))
      }
    }
    reader.onerror = () => toast.error(i18n.t('app.readThatFileError'))
    reader.readAsText(file)
  }

  const clearAllData = ({ showToast = true } = {}) => {
    clearAppState()
    setState(createDefaultAppState())
    if (showToast) {
      toast.success(i18n.t('app.clearSuccess'))
    }
  }

  return (
    <I18nSync state={state}>
      {state.onboarded && <PwaInstallPrompt />}
      <RequireEmailVerified>
      <Routes>
        {/* ── Auth routes (public) ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/confirm" element={<AuthConfirmPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

        {/* ── Onboarding / setup (requires Supabase session) ── */}
        <Route
          path="/onboarding"
          element={
            <AuthGuard>
              {state.onboarded ? (
                <Navigate to="/" replace />
              ) : (
                <OnboardingPage
                  profile={state.profile}
                  userEmail={user?.email ?? ''}
                  onResume={() => updateState({ onboarded: true })}
                  onComplete={handleOnboardingComplete}
                />
              )}
            </AuthGuard>
          }
        />
        <Route
          path="/setup"
          element={
            <AuthGuard>
              {!state.onboarded ? (
                <Navigate to="/onboarding" replace />
              ) : state.planSetupComplete ? (
                <Navigate to="/" replace />
              ) : (
                <PlanSetupPage state={state} updateState={updateState} />
              )}
            </AuthGuard>
          }
        />

        {/* ── App routes (require session + onboarding + plan setup) ── */}
        <Route
          path="/"
          element={
            <AuthGuard>
              {!state.onboarded ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <RequirePlanSetupDone state={state}>
                  <DashboardLayout state={state} updateState={updateState}>
                    <HomePage state={state} updateState={updateState} />
                  </DashboardLayout>
                </RequirePlanSetupDone>
              )}
            </AuthGuard>
          }
        />
        <Route
          path="/workout"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <RequirePlanSetupDone state={state}>
                  <DashboardLayout state={state} updateState={updateState}>
                    <WorkoutPage state={state} updateState={updateState} />
                  </DashboardLayout>
                </RequirePlanSetupDone>
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route path="/history" element={<Navigate to="/report" replace />} />
        <Route
          path="/report"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <RequirePlanSetupDone state={state}>
                  <DashboardLayout state={state} updateState={updateState}>
                    <HistoryPage state={state} updateState={updateState} />
                  </DashboardLayout>
                </RequirePlanSetupDone>
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route path="/custom" element={<Navigate to="/exercises" replace />} />
        <Route
          path="/exercises"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <RequirePlanSetupDone state={state}>
                  <DashboardLayout state={state} updateState={updateState}>
                    <CustomPage state={state} updateState={updateState} />
                  </DashboardLayout>
                </RequirePlanSetupDone>
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route
          path="/meal-plan"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <RequirePlanSetupDone state={state}>
                  <DashboardLayout state={state} updateState={updateState}>
                    <MealPlanPage state={state} updateState={updateState} />
                  </DashboardLayout>
                </RequirePlanSetupDone>
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <RequirePlanSetupDone state={state}>
                  <DashboardLayout state={state} updateState={updateState}>
                    <ProfilePage state={state} updateState={updateState} />
                  </DashboardLayout>
                </RequirePlanSetupDone>
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route
          path="/profile/settings"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <RequirePlanSetupDone state={state}>
                  <DashboardLayout state={state} updateState={updateState}>
                    <SettingsPage
                      state={state}
                      updateState={updateState}
                      exportData={exportData}
                      importData={importData}
                      clearAllData={clearAllData}
                    />
                  </DashboardLayout>
                </RequirePlanSetupDone>
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route
          path="/subscription"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <SubscriptionPage />
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route
          path="/subscribe"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <SubscriptionPage />
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route
          path="/payment-history"
          element={
            <AuthGuard>
              <RequireOnboarded state={state}>
                <PaymentHistoryPage />
              </RequireOnboarded>
            </AuthGuard>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </RequireEmailVerified>
    </I18nSync>
  )
}

function App() {
  const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  // Initialise AdMob once on app startup.
  // This is a no-op in the browser — only activates inside Capacitor (Android).
  useEffect(() => {
    AdService.initialize()
  }, [])

  return (
    <BrowserRouter
      basename={routerBasename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <Toaster
          position="top-center"
          expand={false}
          visibleToasts={4}
          gap={8}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: 'ftp-toast',
              title: 'ftp-toast-title',
              description: 'ftp-toast-description',
              icon: 'ftp-toast-icon',
              closeButton: 'ftp-toast-close',
              success: 'ftp-toast--success',
              error: 'ftp-toast--error',
              warning: 'ftp-toast--warning',
              info: 'ftp-toast--info',
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
