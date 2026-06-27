import { useEffect, useState } from 'react'
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
import NotFoundPage from './pages/NotFoundPage'
import { loadAppState, clearAppState } from './lib/storage'
import { useDebouncedSave } from './lib/useDebouncedSave'
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

function RequireOnboarded({ state, children }) {
  if (!state.onboarded) return <Navigate to="/onboarding" replace />
  return children
}

function RequirePlanSetupDone({ state, children }) {
  if (needsPlanSetup(state)) return <Navigate to="/setup" replace />
  return children
}

function App() {
  const [state, setState] = useState(() => {
    const loaded = loadAppState()
    configureGeminiFromAppSettings(getAppSettings(loaded))
    return loaded
  })

  useEffect(() => {
    configureGeminiFromAppSettings(getAppSettings(state))
  }, [state.appSettings])

  useDebouncedSave(state)
  useMealReminders(state)
  useWorkoutReminder(state)

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const handleOnboardingComplete = (onboardingData) => {
    const workoutSchedule = {}
    ;(onboardingData.workoutDays || []).forEach((day) => {
      workoutSchedule[day] = {
        note: i18n.t('common.dayWorkout', { day: translateWeekday(day) }),
        exercises: [],
      }
    })

    updateState({
      onboarded: true,
      planSetupComplete: false,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      profile: {
        ...state.profile,
        name: onboardingData.name,
        registrationDate: onboardingData.registrationDate,
        birthDate: onboardingData.birthDate || '',
        gender: onboardingData.gender,
        currentWeight: onboardingData.currentWeight,
        height: onboardingData.height,
        targetWeight: onboardingData.targetWeight,
        avatarUrl: onboardingData.avatarUrl || '',
        goal: onboardingData.goal,
        focusArea: onboardingData.focusArea,
        equipment: onboardingData.equipment || [],
        fitnessLevel: onboardingData.fitnessLevel,
        workoutDays: onboardingData.workoutDays,
      },
      customExercises: [],
      workoutSchedule,
    })

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
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result
        if (typeof text !== 'string') {
          throw new Error('Could not read file')
        }
        const imported = hydrateAppStateFromBackup(text)
        setState(imported)
        toast.success(i18n.t('app.importSuccess'))
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

  const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <I18nSync state={state}>
    <BrowserRouter
      basename={routerBasename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Toaster
        position="top-center"
        expand={false}
        visibleToasts={4}
        gap={8}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              'ftp-toast',
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
      {state.onboarded && <PwaInstallPrompt />}
      <Routes>
        <Route
          path="/onboarding"
          element={
            state.onboarded ? (
              <Navigate to="/" replace />
            ) : (
              <OnboardingPage
                profile={state.profile}
                onResume={() => updateState({ onboarded: true })}
                onComplete={handleOnboardingComplete}
              />
            )
          }
        />
        <Route
          path="/setup"
          element={
            !state.onboarded ? (
              <Navigate to="/onboarding" replace />
            ) : state.planSetupComplete ? (
              <Navigate to="/" replace />
            ) : (
              <PlanSetupPage state={state} updateState={updateState} />
            )
          }
        />
        <Route
          path="/"
          element={
            !state.onboarded ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <RequirePlanSetupDone state={state}>
                <DashboardLayout state={state} updateState={updateState}>
                  <HomePage state={state} updateState={updateState} />
                </DashboardLayout>
              </RequirePlanSetupDone>
            )
          }
        />
        <Route
          path="/workout"
          element={
            <RequireOnboarded state={state}>
              <RequirePlanSetupDone state={state}>
                <DashboardLayout state={state} updateState={updateState}>
                  <WorkoutPage state={state} updateState={updateState} />
                </DashboardLayout>
              </RequirePlanSetupDone>
            </RequireOnboarded>
          }
        />
        <Route path="/history" element={<Navigate to="/report" replace />} />
        <Route
          path="/report"
          element={
            <RequireOnboarded state={state}>
              <RequirePlanSetupDone state={state}>
                <DashboardLayout state={state} updateState={updateState}>
                  <HistoryPage state={state} updateState={updateState} />
                </DashboardLayout>
              </RequirePlanSetupDone>
            </RequireOnboarded>
          }
        />
        <Route path="/custom" element={<Navigate to="/exercises" replace />} />
        <Route
          path="/exercises"
          element={
            <RequireOnboarded state={state}>
              <RequirePlanSetupDone state={state}>
                <DashboardLayout state={state} updateState={updateState}>
                  <CustomPage state={state} updateState={updateState} />
                </DashboardLayout>
              </RequirePlanSetupDone>
            </RequireOnboarded>
          }
        />
        <Route
          path="/meal-plan"
          element={
            <RequireOnboarded state={state}>
              <RequirePlanSetupDone state={state}>
                <DashboardLayout state={state} updateState={updateState}>
                  <MealPlanPage state={state} updateState={updateState} />
                </DashboardLayout>
              </RequirePlanSetupDone>
            </RequireOnboarded>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireOnboarded state={state}>
              <RequirePlanSetupDone state={state}>
                <DashboardLayout state={state} updateState={updateState}>
                  <ProfilePage state={state} updateState={updateState} />
                </DashboardLayout>
              </RequirePlanSetupDone>
            </RequireOnboarded>
          }
        />
        <Route
          path="/profile/settings"
          element={
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
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    </I18nSync>
  )
}

export default App
