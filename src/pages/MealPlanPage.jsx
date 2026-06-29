import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  ShoppingCart,
  X,
  Save,
  CheckSquare,
  Square,
  ListPlus,
  Download,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  LayoutTemplate,
  Info,
} from 'lucide-react'
import { getDayMacroTotals, formatMacroSummary } from '../lib/mealPlan'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Badge } from '../components/ui/badge'
import { toast } from 'sonner'
import { getAiToastKey } from '@/lib/aiErrors'
import { cn } from '../lib/utils'
import { getAppSettings, MEAL_REMINDER_METHOD, updateAppSettings } from '../lib/appSettings'
import { downloadMealRemindersCalendar } from '../lib/mealReminderCalendar'
import { MEAL_CALENDAR_PLATFORMS } from '../lib/mealCalendarPlatforms'
import {
  translateMealSlot,
  translateShoppingCategory,
  translateWeekday,
  translateWeekdayAbbrev,
} from '@/lib/i18nHelpers'
import {
  applyMealPlanImport,
  downloadMealPlanExport,
  downloadMealPlanTemplate,
} from '../lib/mealPlanImport'
import {
  applyShoppingListImport,
  canonicalizeShoppingListCategories,
  DEFAULT_SHOPPING_CATEGORIES,
  downloadShoppingListExport,
  downloadShoppingListTemplate,
} from '../lib/shoppingListImport'
import AiRecommendButton from '../components/AiRecommendButton'
import MealPresetTemplatesSection from '../components/MealPresetTemplatesSection'
import {
  fetchMealPlanRecommendation,
  fetchShoppingListRecommendation,
} from '../lib/aiRecommendations'
import {
  PRESET_SHOPPING_LISTS,
  buildPresetShoppingList,
  getRecommendedShoppingListId,
} from '../lib/presetShoppingLists'
import { calculateBmi, getBmiCategory, resolveEffectiveTrainingGoal } from '../lib/profileUtils'
import { isMealPlanEmpty, isShoppingListEmpty } from '../lib/planEmpty'
import { allowsAiPlanFeatures, allowsTemplatePlanFeatures, canUseAiOrTemplateForMeals, canUseAiOrTemplateForShopping, getPlanSetupMethod, PLAN_SETUP_METHOD } from '@/lib/planSetup'
import { searchFoods } from '../lib/ethiopianFoods'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MEAL_SLOTS = [
  { id: 'breakfast', emoji: '🌅' },
  { id: 'morningSnack', emoji: '🥜' },
  { id: 'lunch', emoji: '🍛' },
  { id: 'afternoonSnack', emoji: '☕️' },
  { id: 'dinner', emoji: '🍽' },
  { id: 'beforeBed', emoji: '🌙' },
]

const SHOPPING_CATEGORIES = DEFAULT_SHOPPING_CATEGORIES

function getTodayWeekdayName() {
  const js = new Date().getDay() // 0 Sun ... 6 Sat
  const map = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = map[js]
  return DAYS_OF_WEEK.includes(today) ? today : 'Monday'
}

function MealPlanPage({ state, updateState }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('meals')
  const [selectedDay, setSelectedDay] = useState(() => getTodayWeekdayName())
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [isAddingFood, setIsAddingFood] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [isAddingShoppingItem, setIsAddingShoppingItem] = useState(false)
  const [editingShoppingItem, setEditingShoppingItem] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('Protein Sources')
  const [showMealReminderSetup, setShowMealReminderSetup] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiShoppingLoading, setAiShoppingLoading] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showShoppingTemplates, setShowShoppingTemplates] = useState(false)

  const mealPlan = state.mealPlan || {}
  const showAiMealRecommend = isMealPlanEmpty(mealPlan)
  const isManual = getPlanSetupMethod(state) === PLAN_SETUP_METHOD.MANUAL
  // AI needs exercises first (personalises based on workout) — templates don't
  const showAiMealFeatures = allowsAiPlanFeatures(state) && canUseAiOrTemplateForMeals(state)
  const showTemplateFeatures = allowsTemplatePlanFeatures(state)
  const shoppingList = state.shoppingList || {}
  // AI needs meal plan first — templates only need meal plan for shopping (to show recommended)
  const showAiShoppingFeatures = allowsAiPlanFeatures(state) && canUseAiOrTemplateForShopping(state)
  const showTemplateShoppingFeatures = allowsTemplatePlanFeatures(state)
  const appSettings = getAppSettings(state)

  // Detect recommended shopping list from profile
  const recommendedShoppingId = useMemo(() => {
    const profile = state.profile || {}
    const bmi = calculateBmi(profile.currentWeight, profile.height)
    const bmiCategory = getBmiCategory(bmi)
    const goal = resolveEffectiveTrainingGoal(profile)
    return getRecommendedShoppingListId(bmiCategory, goal)
  }, [state.profile])

  const patchSettings = (patch) => {
    updateState(updateAppSettings(state, patch))
  }

  useEffect(() => {
    if (window.location.hash !== '#reminders') return
    const el = document.getElementById('meal-reminders')
    if (!el) return
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => window.clearTimeout(id)
  }, [])

  // One-time (and safe) migration: combine Fruits + Vegetables into one bucket.
  useEffect(() => {
    const canonical = canonicalizeShoppingListCategories(shoppingList)
    if (JSON.stringify(canonical) === JSON.stringify(shoppingList)) return
    updateState({ shoppingList: canonical })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-add meal items into shopping list whenever meals change.
  // (Removed) Automatic meal → shopping list syncing for a simpler workflow.

  const handleImportMealsFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result
        if (typeof text !== 'string') throw new Error('Could not read file')
        const parsed = JSON.parse(text)
        const result = applyMealPlanImport(state, parsed, { replace: true })
        updateState({ mealPlan: result.mealPlan })
        toast.success(
          t('mealToasts.importMeals', { count: result.summary.daysImported })
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('mealToasts.importMealsFail'))
      }
    }
    reader.onerror = () => toast.error(t('mealToasts.readFileFail'))
    reader.readAsText(file)
  }

  const handleExportMeals = () => {
    downloadMealPlanExport(state)
    toast.success(t('mealToasts.exportMeals'))
  }

  const handleAiMealRecommend = async () => {
    setAiLoading(true)
    try {
      const parsed = await fetchMealPlanRecommendation(state)
      const result = applyMealPlanImport(state, parsed, { replace: true })
      updateState({ mealPlan: result.mealPlan })
      toast.success(t('mealToasts.aiMealApplied'))
    } catch (err) {
      toast.error(t(getAiToastKey(err)))
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiShoppingRecommend = async () => {
    setAiShoppingLoading(true)
    try {
      const parsed = await fetchShoppingListRecommendation(state)
      const result = applyShoppingListImport(state, parsed, { replace: true })
      updateState({ shoppingList: result.shoppingList })
      toast.success(t('mealToasts.aiShoppingApplied'))
    } catch (err) {
      toast.error(t(getAiToastKey(err)))
    } finally {
      setAiShoppingLoading(false)
    }
  }

  const calendarPlatform = appSettings.mealCalendarPlatform || 'other'

  const handleDownloadCalendarReminders = () => {
    downloadMealRemindersCalendar(appSettings)
    patchSettings({
      mealReminderMethod: MEAL_REMINDER_METHOD.CALENDAR,
      mealCalendarRemindersSetUp: true,
      mealRemindersEnabled: false,
    })
    toast.success(
      t('mealToasts.calendarDownload', {
        app: t(`meals.calendarPlatforms.${calendarPlatform}.app`),
      }),
      { duration: 8000 }
    )
  }

  const handleConfirmCalendarImported = () => {
    patchSettings({
      mealReminderMethod: MEAL_REMINDER_METHOD.CALENDAR,
      mealCalendarRemindersSetUp: true,
      mealRemindersEnabled: false,
    })
    toast.success(
      t('mealToasts.calendarMethod', {
        app: t(`meals.calendarPlatforms.${calendarPlatform}.app`),
      })
    )
  }

  const usingCalendarReminders =
    appSettings.mealReminderMethod === MEAL_REMINDER_METHOD.CALENDAR &&
    appSettings.mealCalendarRemindersSetUp

  const handleExportShoppingList = () => {
    downloadShoppingListExport(state)
    toast.success(t('mealToasts.shoppingExported'))
  }

  const handleImportShoppingListFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result
        if (typeof text !== 'string') throw new Error('Could not read file')
        const parsed = JSON.parse(text)
        const result = applyShoppingListImport(state, parsed, { replace: true })
        updateState({ shoppingList: result.shoppingList })
        toast.success(
          t('mealToasts.shoppingImported', {
            count: result.summary.itemsImported,
            suffix: result.summary.itemsImported === 1 ? '' : 's',
          })
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('mealToasts.shoppingImportFail'))
      }
    }
    reader.onerror = () => toast.error(t('mealToasts.readFileFail'))
    reader.readAsText(file)
  }

  // Meal Plan Functions
  const handleAddFood = (foodData) => {
    if (!selectedMeal) return

    const { day, mealTime } = selectedMeal
    const newMealPlan = { ...mealPlan }
    
    if (!newMealPlan[day]) {
      newMealPlan[day] = { breakfast: [], morningSnack: [], lunch: [], afternoonSnack: [], dinner: [], beforeBed: [] }
    }

    const newFood = {
      ...foodData,
      id: Date.now().toString(),
      createdAt: Date.now()
    }

    newMealPlan[day][mealTime] = [...(newMealPlan[day][mealTime] || []), newFood]
    updateState({ mealPlan: newMealPlan })
    toast.success(t('mealToasts.foodAdded', { name: foodData.name }))
    setIsAddingFood(false)
  }

  const handleUpdateFood = (foodData) => {
    if (!selectedMeal) return

    const { day, mealTime } = selectedMeal
    const newMealPlan = { ...mealPlan }
    
    newMealPlan[day][mealTime] = newMealPlan[day][mealTime].map(item =>
      item.id === foodData.id ? { ...foodData, updatedAt: Date.now() } : item
    )

    updateState({ mealPlan: newMealPlan })
    toast.success(t('mealToasts.foodUpdated', { name: foodData.name }))
    setEditingFood(null)
  }

  const handleDeleteFood = (day, mealTime, foodId) => {
    const food = mealPlan[day][mealTime].find(f => f.id === foodId)
    if (!food) return

    if (
      !confirm(
        i18n.t('meals.confirmDeleteFood', {
          name: food.name,
          defaultValue: `Delete "${food.name}"?`,
        })
      )
    )
      return

    const newMealPlan = { ...mealPlan }
    newMealPlan[day][mealTime] = newMealPlan[day][mealTime].filter(f => f.id !== foodId)

    updateState({ mealPlan: newMealPlan })
    toast.success(t('mealToasts.foodDeleted', { name: food.name }))
  }

  // Shopping List Functions
  const handleAddShoppingItem = (itemData) => {
    const newShoppingList = { ...shoppingList }
    
    if (!newShoppingList[selectedCategory]) {
      newShoppingList[selectedCategory] = []
    }

    const newItem = {
      ...itemData,
      id: Date.now().toString(),
      checked: false,
      createdAt: Date.now()
    }

    newShoppingList[selectedCategory] = [...newShoppingList[selectedCategory], newItem]
    updateState({ shoppingList: newShoppingList })
    toast.success(
      t('mealToasts.shopAdded', {
        name: itemData.name,
        category: translateShoppingCategory(selectedCategory),
      })
    )
    setIsAddingShoppingItem(false)
  }

  const handleUpdateShoppingItem = (itemData) => {
    const newShoppingList = { ...shoppingList }
    newShoppingList[selectedCategory] = newShoppingList[selectedCategory].map(item =>
      item.id === itemData.id ? { ...itemData, updatedAt: Date.now() } : item
    )
    updateState({ shoppingList: newShoppingList })
    toast.success(t('mealToasts.shopUpdated', { name: itemData.name }))
    setEditingShoppingItem(null)
  }

  const handleDeleteShoppingItem = (category, itemId) => {
    const item = shoppingList[category].find(i => i.id === itemId)
    if (!item) return

    if (
      !confirm(
        i18n.t('meals.confirmDeleteItem', {
          name: item.name,
          defaultValue: `Delete "${item.name}"?`,
        })
      )
    )
      return

    const newShoppingList = { ...shoppingList }
    newShoppingList[category] = newShoppingList[category].filter(i => i.id !== itemId)
    updateState({ shoppingList: newShoppingList })
    toast.success(t('mealToasts.shopDeleted', { item: item.name }))
  }

  const handleToggleShoppingItem = (category, itemId) => {
    const newShoppingList = { ...shoppingList }
    newShoppingList[category] = newShoppingList[category].map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )
    updateState({ shoppingList: newShoppingList })
  }

  const handleClearCheckedItems = () => {
    let totalChecked = 0
    Object.values(shoppingList).forEach(items => {
      totalChecked += items.filter(i => i.checked).length
    })

    if (totalChecked === 0) {
      toast.error(t('mealToasts.noChecked'))
      return
    }

    if (
      !confirm(
        i18n.t('meals.confirmClearChecked', {
          count: totalChecked,
          defaultValue: `Delete ${totalChecked} checked item${totalChecked !== 1 ? 's' : ''}?`,
        })
      )
    )
      return

    const newShoppingList = {}
    Object.keys(shoppingList).forEach(category => {
      newShoppingList[category] = shoppingList[category].filter(i => !i.checked)
    })

    updateState({ shoppingList: newShoppingList })
    toast.success(t('mealToasts.cleared', { count: totalChecked }))
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('meals.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('meals.pageSubtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="meals">
            <Calendar className="h-4 w-4 mr-2" />
            {t('meals.tabMeals')}
          </TabsTrigger>
          <TabsTrigger value="shopping">
            <ShoppingCart className="h-4 w-4 mr-2" />
            {t('meals.tabShopping')}
          </TabsTrigger>
        </TabsList>

        {/* MEALS TAB */}
        <TabsContent value="meals" className="space-y-4">
          {showAiMealRecommend && (() => {
            const hasExercises = (state.customExercises || []).length > 0
            const mealGateLocked = isManual && !hasExercises
            return (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-5 space-y-4">
                  <div>
                    <p className="font-medium">{t('meals.emptyMealTitle')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('meals.emptyMealDesc')}
                    </p>
                  </div>

                  {/* Hint for manual users who haven't added exercises yet */}
                  {mealGateLocked && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Add exercises to your library first — AI and templates use your workout plan to tailor your meal plan.</span>
                    </div>
                  )}

                  {/* Three action buttons in a row */}
                  <div className="flex flex-wrap gap-2">
                    {showAiMealFeatures && (
                      <div className="relative group">
                        <AiRecommendButton
                          loading={aiLoading}
                          label={t('ai.mealLabel')}
                          onClick={handleAiMealRecommend}
                          disabled={!hasExercises}
                        />
                        {!hasExercises && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <Info className="inline h-3 w-3 mr-1 text-muted-foreground" />
                            Add exercises to your library first — the AI uses your workout plan to tailor meals.
                          </div>
                        )}
                      </div>
                    )}

                    {showTemplateFeatures && (
                      <Button
                        type="button"
                        variant={showPresets ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowPresets((v) => !v)}
                      >
                        <LayoutTemplate className="h-4 w-4 mr-2" />
                        Use Template
                        {showPresets
                          ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
                          : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
                      </Button>
                    )}

                  </div>
                  {/* Preset templates reveal */}
                  {showPresets && showTemplateFeatures && (
                    <div className="pt-1">
                      <MealPresetTemplatesSection state={state} updateState={updateState} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })()}

          {!showAiMealRecommend && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {showTemplateFeatures && (
                <Button
                  type="button"
                  variant={showPresets ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowPresets((v) => !v)}
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Use Template
                  {showPresets
                    ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
                    : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
                </Button>
              )}
            </div>
          )}

          {/* Preset templates reveal when meal plan is already filled */}
          {showPresets && showTemplateFeatures && !showAiMealRecommend && (
            <div className="mb-4">
              <MealPresetTemplatesSection state={state} updateState={updateState} />
            </div>
          )}

          <div className="rounded-lg border border-border/60 bg-card/50 scroll-mt-20" id="meal-reminders">
            {/* Compact header row — always visible */}
            <button
              type="button"
              className="w-full px-3 py-2.5 text-left"
              onClick={() => setShowMealReminderSetup((v) => !v)}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium min-w-0">
                  <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                  <span className="leading-tight">{t('meals.mealReminders')}</span>
                </span>
                {showMealReminderSetup
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pl-6">
                <Badge className="text-[10px] px-1.5 py-0.5 leading-none">
                  {t('common.recommended')}
                </Badge>
                {usingCalendarReminders && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0.5 leading-none gap-0.5 whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5 text-primary shrink-0" />
                    {t(`meals.calendarPlatforms.${calendarPlatform}.label`)}
                  </Badge>
                )}
              </div>
            </button>

            {/* Expanded content */}
            {showMealReminderSetup && (
              <div className="border-t border-border/60 px-3 pb-3 pt-3 space-y-3 text-xs">
                {/* Platform picker */}
                <div className="space-y-1.5">
                  <p className="font-medium text-foreground">{t('meals.calendarPlatformLabel')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {MEAL_CALENDAR_PLATFORMS.map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        className={cn(
                          'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors text-center',
                          calendarPlatform === platform
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'
                        )}
                        onClick={() => patchSettings({ mealCalendarPlatform: platform })}
                      >
                        {t(`meals.calendarPlatforms.${platform}.label`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleDownloadCalendarReminders}>
                    <CalendarClock className="h-4 w-4 mr-2" />
                    {t('meals.downloadCalendar')}
                  </Button>
                  {!usingCalendarReminders && (
                    <Button size="sm" variant="outline" onClick={handleConfirmCalendarImported}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('meals.confirmCalendar')}
                    </Button>
                  )}
                </div>

                {/* Setup steps */}
                <div className="space-y-1.5 text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    {(t(`meals.calendarPlatforms.${calendarPlatform}.steps`, {
                      returnObjects: true,
                      defaultValue: [],
                    }) || []).map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                  <p>
                    {Object.entries(appSettings.mealReminderTimes || {})
                      .map(([slot, time]) => `${translateMealSlot(slot)} ${time}`)
                      .join(' · ')}
                  </p>
                  <p>
                    {calendarPlatform === 'android'
                      ? t('meals.calendarFileNoteSamsung')
                      : t('meals.calendarFileNote')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
            <TabsList className="w-full bg-transparent p-0 justify-start gap-2 overflow-x-auto flex">
              {DAYS_OF_WEEK.map((day) => {
                return (
                  <TabsTrigger
                    key={day}
                    value={day}
                    className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {translateWeekdayAbbrev(day)}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {DAYS_OF_WEEK.map((day) => {
              const dayMeals = mealPlan[day] || {}
              const dayMacros = getDayMacroTotals(mealPlan, day)
              const macroLabel = formatMacroSummary(dayMacros)
              const totalItems = dayMacros.itemCount

              return (
                <TabsContent key={day} value={day} className="space-y-3 mt-4">
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-lg font-bold">
                              {translateWeekday(day)}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {t('meals.plannedCount', { count: totalItems })}
                              {macroLabel ? ` · ${macroLabel}` : ''}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 pb-4 space-y-4 bg-muted/10">
                      {MEAL_SLOTS.map((mealTime) => {
                        const foods = dayMeals[mealTime.id] || []

                        return (
                          <div key={mealTime.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{mealTime.emoji}</span>
                                <div>
                                  <h3 className="font-semibold text-sm">
                                    {translateMealSlot(mealTime.id)}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    {t(`mealSlots.times.${mealTime.id}`)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setSelectedMeal({ day: day, mealTime: mealTime.id })
                                  setIsAddingFood(true)
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {foods.length === 0 ? (
                              <div className="ml-10 text-xs text-muted-foreground italic py-1">
                                {t('meals.noItems')}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {foods.map((food, index) => (
                                  <div
                                    key={food.id}
                                    className="flex items-center gap-3 group py-2 px-3 rounded hover:bg-muted/50 transition-colors border-b last:border-b-0"
                                  >
                                    <span className="text-xs font-semibold text-muted-foreground min-w-[20px]">
                                      {index + 1}.
                                    </span>
                                    <span className="text-sm flex-1">
                                      {food.name}
                                      {(Number(food.calories) > 0 || Number(food.protein) > 0 || Number(food.carbs) > 0 || Number(food.fat) > 0) && (
                                        <span className="text-[10px] text-muted-foreground ml-2">
                                          {Number(food.calories) > 0 ? `${food.calories} ${t('common.kcal')}` : ''}
                                          {Number(food.calories) > 0 && Number(food.protein) > 0 ? ' · ' : ''}
                                          {Number(food.protein) > 0 ? `${food.protein}${t('common.proteinShort')}` : ''}
                                          {(Number(food.calories) > 0 || Number(food.protein) > 0) && Number(food.carbs) > 0 ? ' · ' : ''}
                                          {Number(food.carbs) > 0 ? `${food.carbs}g C` : ''}
                                          {(Number(food.calories) > 0 || Number(food.protein) > 0 || Number(food.carbs) > 0) && Number(food.fat) > 0 ? ' · ' : ''}
                                          {Number(food.fat) > 0 ? `${food.fat}g F` : ''}
                                        </span>
                                      )}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => {
                                          setSelectedMeal({ day: day, mealTime: mealTime.id })
                                          setEditingFood(food)
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => handleDeleteFood(day, mealTime.id, food.id)}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        </TabsContent>

        {/* SHOPPING LIST TAB */}
        <TabsContent value="shopping" className="space-y-4">

          {/* Setup card — only shown when shopping list is empty */}
          {isShoppingListEmpty(shoppingList) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-5 space-y-4">
                <div>
                  <p className="font-medium">{t('meals.shoppingBuildTitle')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('meals.shoppingBuildDesc')}</p>
                </div>

                {/* Hint for manual users who haven't filled meal plan yet */}
                {isManual && isMealPlanEmpty(mealPlan) && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Fill your meal plan first — AI and templates use your meals to build a tailored shopping list.</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {showAiShoppingFeatures && (
                    <AiRecommendButton
                      loading={aiShoppingLoading}
                      label={t('ai.shoppingLabel')}
                      onClick={handleAiShoppingRecommend}
                    />
                  )}
                  {showTemplateShoppingFeatures && (
                    <Button
                      type="button"
                      variant={showShoppingTemplates ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowShoppingTemplates((v) => !v)}
                    >
                      <LayoutTemplate className="h-4 w-4 mr-2" />
                      Use Template
                      {showShoppingTemplates
                        ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
                        : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
                    </Button>
                  )}
                </div>

                {/* Template cards reveal */}
                {showShoppingTemplates && showTemplateShoppingFeatures && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {PRESET_SHOPPING_LISTS.map((preset) => {
                      const isRecommended = preset.id === recommendedShoppingId
                      return (
                        <Card
                          key={preset.id}
                          className={cn(
                            'border transition-all',
                            isRecommended ? 'border-primary/50 bg-primary/5' : 'border-border'
                          )}
                        >
                          <CardContent className="p-4">
                            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                              <span>{preset.emoji}</span>
                              {preset.name}
                            </p>
                            {isRecommended && (
                              <span className="text-[10px] text-primary font-medium block mb-1">
                                ✓ Recommended for your goal
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {preset.description}
                            </p>
                            <Button
                              size="sm"
                              variant={isRecommended ? 'default' : 'outline'}
                              className="w-full"
                              onClick={() => {
                                const items = buildPresetShoppingList(preset.id)
                                if (!items) return
                                updateState({ shoppingList: items })
                                setShowShoppingTemplates(false)
                                toast.success(`${preset.emoji} ${preset.name} applied`)
                              }}
                            >
                              <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
                              Use this list
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Template + JSON bar — shown when shopping list already has items */}
          {!isShoppingListEmpty(shoppingList) && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {showTemplateShoppingFeatures && (
                <Button
                  type="button"
                  variant={showShoppingTemplates ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowShoppingTemplates((v) => !v)}
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Use Template
                  {showShoppingTemplates
                    ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
                    : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
                </Button>
              )}
            </div>
          )}

          {/* Template cards reveal when shopping list is already filled */}
          {showShoppingTemplates && showTemplateShoppingFeatures && !isShoppingListEmpty(shoppingList) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {PRESET_SHOPPING_LISTS.map((preset) => {
                const isRecommended = preset.id === recommendedShoppingId
                return (
                  <Card
                    key={preset.id}
                    className={cn(
                      'border transition-all',
                      isRecommended ? 'border-primary/50 bg-primary/5' : 'border-border'
                    )}
                  >
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                        <span>{preset.emoji}</span>
                        {preset.name}
                      </p>
                      {isRecommended && (
                        <span className="text-[10px] text-primary font-medium block mb-1">
                          ✓ Recommended for your goal
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {preset.description}
                      </p>
                      <Button
                        size="sm"
                        variant={isRecommended ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => {
                          const items = buildPresetShoppingList(preset.id)
                          if (!items) return
                          updateState({ shoppingList: items })
                          setShowShoppingTemplates(false)
                          toast.success(`${preset.emoji} ${preset.name} applied`)
                        }}
                      >
                        <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
                        Use this list
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Shopping list — categories as horizontal tabs */}
          <Card>
            <Tabs defaultValue={SHOPPING_CATEGORIES[0]}>
              <CardHeader className="pb-0">
                <TabsList className="w-full flex overflow-x-auto h-auto flex-nowrap justify-start gap-1 bg-transparent p-0 border-b border-border/50 rounded-none">
                  {SHOPPING_CATEGORIES.map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-3 py-2 text-xs font-medium"
                    >
                      {translateShoppingCategory(category)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardHeader>

              {SHOPPING_CATEGORIES.map((category) => {
                const items = shoppingList[category] || []
                return (
                  <TabsContent key={category} value={category} className="m-0">
                    <CardContent className="pt-3 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">
                          {t('common.items', { count: items.length })}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setSelectedCategory(category)
                            setIsAddingShoppingItem(true)
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </Button>
                      </div>

                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic py-4 text-center">
                          {t('meals.noItems')}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                'group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all cursor-pointer select-none',
                                item.checked
                                  ? 'border-primary/30 bg-primary/10 text-primary line-through opacity-60'
                                  : 'border-border bg-muted/30 hover:border-primary/40'
                              )}
                              onClick={() => handleToggleShoppingItem(category, item.id)}
                            >
                              {item.checked
                                ? <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                                : <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              }
                              <span className="font-medium">{item.name}</span>
                              <button
                                type="button"
                                className="ml-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                                onClick={(e) => { e.stopPropagation(); handleDeleteShoppingItem(category, item.id) }}
                                aria-label="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </TabsContent>
                )
              })}
            </Tabs>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Food Dialog */}
      {(isAddingFood || editingFood) && (
        <FoodFormDialog
          food={editingFood}
          onClose={() => {
            setIsAddingFood(false)
            setEditingFood(null)
          }}
          onSave={(foodData) => {
            if (editingFood) {
              handleUpdateFood(foodData)
            } else {
              handleAddFood(foodData)
            }
          }}
        />
      )}

      {/* Add/Edit Shopping Item Dialog */}
      {(isAddingShoppingItem || editingShoppingItem) && (
        <ShoppingItemDialog
          item={editingShoppingItem}
          category={selectedCategory}
          onClose={() => {
            setIsAddingShoppingItem(false)
            setEditingShoppingItem(null)
          }}
          onSave={(itemData) => {
            if (editingShoppingItem) {
              handleUpdateShoppingItem(itemData)
            } else {
              handleAddShoppingItem(itemData)
            }
          }}
        />
      )}
    </div>
  )
}

function FoodFormDialog({ food, onClose, onSave }) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState(
    food || { name: '', calories: '', protein: '', carbs: '', fat: '' }
  )

  const suggestions = useMemo(() => searchFoods(searchQuery), [searchQuery])

  const applyFood = (item) => {
    setFormData({
      name: item.name,
      calories: String(item.calories),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fat: String(item.fat),
    })
    setSearchQuery('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error(t('meals.foodNameRequired'))
      return
    }
    onSave(formData)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{food ? t('meals.foodEdit') : t('meals.foodAdd')}</DialogTitle>
          <DialogDescription>{t('meals.foodDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Food database search — only shown when adding, not editing */}
          {!food && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('meals.foodSearch')}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('meals.foodSearchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              {suggestions.length > 0 && (
                <div className="rounded-lg border border-border bg-background shadow-md overflow-hidden">
                  {suggestions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0"
                      onClick={() => applyFood(item)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">{item.serving}</p>
                      </div>
                      <div className="flex gap-2 shrink-0 text-[11px] text-muted-foreground">
                        <span className="text-foreground font-semibold">{item.calories} kcal</span>
                        {item.protein > 0 && <span>{item.protein}g P</span>}
                        {item.carbs > 0 && <span>{item.carbs}g C</span>}
                        {item.fat > 0 && <span>{item.fat}g F</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.trim().length > 0 && suggestions.length === 0 && (
                <p className="text-xs text-muted-foreground px-1">
                  {t('meals.foodSearchNoResults')}
                </p>
              )}
              <p className="text-xs text-muted-foreground px-1">
                {t('meals.foodSearchHint')}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('meals.foodName')}</label>
              <Input
                placeholder="e.g., 4 Eggs, Injera with Shiro"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus={!!food}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('meals.calories')}</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="320"
                  value={formData.calories ?? ''}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('meals.protein')}</label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="24"
                  value={formData.protein ?? ''}
                  onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('meals.carbs', { defaultValue: 'Carbs (g)' })}</label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="40"
                  value={formData.carbs ?? ''}
                  onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('meals.fat', { defaultValue: 'Fat (g)' })}</label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="10"
                  value={formData.fat ?? ''}
                  onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {food ? t('common.update') : t('common.add')}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ShoppingItemDialog({ item, category, onClose, onSave }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState(
    item || {
      name: ''
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error(t('meals.itemNameRequired'))
      return
    }
    onSave(formData)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item
              ? t('meals.shopEdit')
              : t('meals.shopAdd', { category: translateShoppingCategory(category) })}
          </DialogTitle>
          <DialogDescription>{t('meals.shopDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('meals.itemName')}</label>
            <Input
              placeholder="e.g., Eggs, Milk, Chicken"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {item ? t('common.update') : t('common.add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default MealPlanPage
