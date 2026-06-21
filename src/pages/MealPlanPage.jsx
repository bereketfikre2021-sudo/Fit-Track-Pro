import { useEffect, useState } from 'react'
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
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import JsonFileActions from '../components/JsonFileActions'
import {
  fetchMealPlanRecommendation,
  fetchShoppingListRecommendation,
} from '../lib/aiRecommendations'
import { isMealPlanEmpty, isShoppingListEmpty } from '../lib/planEmpty'

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
  const [showOptionalInAppReminders, setShowOptionalInAppReminders] = useState(false)
  const [showMealReminderSetup, setShowMealReminderSetup] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiShoppingLoading, setAiShoppingLoading] = useState(false)

  const mealPlan = state.mealPlan || {}
  const showAiMealRecommend = isMealPlanEmpty(mealPlan)
  const shoppingList = state.shoppingList || {}
  const showAiShoppingRecommend =
    !isMealPlanEmpty(mealPlan) && isShoppingListEmpty(shoppingList)
  const appSettings = getAppSettings(state)

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

  const handleToggleInAppReminders = async () => {
    const nextEnabled = !appSettings.mealRemindersEnabled
    if (!nextEnabled) {
      patchSettings({ mealRemindersEnabled: false })
      toast.success(t('mealToasts.inAppOff'))
      return
    }
    if (typeof Notification === 'undefined') {
      toast.error(t('mealToasts.notificationsUnsupported'))
      return
    }
    try {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          toast.error(t('mealToasts.notificationsDenied'))
          return
        }
      } else if (Notification.permission !== 'granted') {
        toast.error(t('mealToasts.notificationsBlocked'))
        return
      }
    } catch {
      toast.error(t('mealToasts.notificationsRequestFail'))
      return
    }
    patchSettings({
      mealReminderMethod: MEAL_REMINDER_METHOD.IN_APP,
      mealRemindersEnabled: true,
    })
    toast.info(t('mealToasts.inAppHint'), {
      duration: 6000,
    })
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
          {showAiMealRecommend && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-5">
                <div>
                  <p className="font-medium">{t('meals.emptyMealTitle')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('meals.emptyMealDesc')}
                  </p>
                </div>
                <AiRecommendButton
                  loading={aiLoading}
                  label={t('ai.mealLabel')}
                  onClick={handleAiMealRecommend}
                  className="shrink-0"
                />
              </CardContent>
            </Card>
          )}

          <JsonFileActions
            className="mb-2"
            onTemplate={downloadMealPlanTemplate}
            onExport={handleExportMeals}
            onImportFileSelected={handleImportMealsFileSelected}
          />

          <Card id="meal-reminders" className="border-primary/40 bg-primary/10 scroll-mt-20">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {t('meals.mealReminders')}
                </CardTitle>
                <Badge className="text-xs">{t('common.recommended')}</Badge>
                {usingCalendarReminders && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {t('meals.calendarActive', {
                      app: t(`meals.calendarPlatforms.${calendarPlatform}.app`),
                    })}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">{t('meals.calendarPlatformLabel')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {MEAL_CALENDAR_PLATFORMS.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      className={cn(
                        'rounded-md border px-2 py-2 text-[11px] font-medium transition-colors text-center',
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
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-muted-foreground hover:text-foreground"
                onClick={() => setShowMealReminderSetup((v) => !v)}
              >
                <span>{t('meals.setupSteps')}</span>
                {showMealReminderSetup ? (
                  <ChevronUp className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                )}
              </button>
              {showMealReminderSetup && (
                <div className="space-y-2 border-t border-border/60 pt-2">
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                    {(t(`meals.calendarPlatforms.${calendarPlatform}.steps`, {
                      returnObjects: true,
                      defaultValue: [],
                    }) || []).map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                  <p className="text-muted-foreground">
                    Daily times:{' '}
                    {Object.entries(appSettings.mealReminderTimes || {})
                      .map(
                        ([slot, time]) =>
                          `${translateMealSlot(slot)} ${time}`
                      )
                      .join(' · ')}
                  </p>
                  <p className="text-muted-foreground">
                    {calendarPlatform === 'android'
                      ? t('meals.calendarFileNoteSamsung')
                      : t('meals.calendarFileNote')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-lg border border-border/60 bg-card/50">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowOptionalInAppReminders((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" />
                {t('meals.optionalInApp', {
                  defaultValue: 'Optional: in-app reminders (only while app is open)',
                })}
              </span>
              {showOptionalInAppReminders ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </button>
            {showOptionalInAppReminders && (
              <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/60">
                <p className="text-xs text-muted-foreground pt-2">{t('meals.inAppNotRecommended')}</p>
                <Button
                  variant={appSettings.mealRemindersEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleInAppReminders}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {appSettings.mealRemindersEnabled
                    ? t('mealToasts.inAppOn')
                    : t('mealToasts.inAppTurnOn')}
                </Button>
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
                                      {(Number(food.calories) > 0 || Number(food.protein) > 0) && (
                                        <span className="text-[10px] text-muted-foreground ml-2">
                                          {Number(food.calories) > 0
                                            ? `${food.calories} ${t('common.kcal')}`
                                            : ''}
                                          {Number(food.calories) > 0 && Number(food.protein) > 0
                                            ? ' · '
                                            : ''}
                                          {Number(food.protein) > 0
                                            ? `${food.protein}${t('common.proteinShort')}`
                                            : ''}
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
          {showAiShoppingRecommend && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-5">
                <div>
                  <p className="font-medium">{t('meals.shoppingBuildTitle')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('meals.shoppingBuildDesc')}
                  </p>
                </div>
                <AiRecommendButton
                  loading={aiShoppingLoading}
                  label={t('ai.shoppingLabel')}
                  onClick={handleAiShoppingRecommend}
                  className="shrink-0"
                />
              </CardContent>
            </Card>
          )}

          {isMealPlanEmpty(mealPlan) && isShoppingListEmpty(shoppingList) && (
            <Card className="border-border/80 bg-muted/20">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  {t('meals.shoppingNeedMeals')}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {t('meals.shoppingList')}
            </h2>
            <div className="flex min-w-0 flex-col gap-2 sm:items-end">
              <JsonFileActions
                className="sm:justify-end"
                onTemplate={downloadShoppingListTemplate}
                onExport={handleExportShoppingList}
                onImportFileSelected={handleImportShoppingListFileSelected}
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 w-full sm:w-auto"
                onClick={handleClearCheckedItems}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('meals.clearChecked')}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {SHOPPING_CATEGORIES.map(category => {
              const items = shoppingList[category] || []
              const checkedCount = items.filter(i => i.checked).length
              
              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {translateShoppingCategory(category)}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {t('common.items', { count: items.length })}
                          {checkedCount > 0 &&
                            ` • ${t('common.checked', { count: checkedCount })}`}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCategory(category)
                          setIsAddingShoppingItem(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2">
                        {t('meals.noItems')}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between group py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                onClick={() => handleToggleShoppingItem(category, item.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {item.checked ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </button>
                              <span className={cn(
                                "text-sm font-medium",
                                item.checked && "line-through text-muted-foreground"
                              )}>
                                {item.name}
                              </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => {
                                  setSelectedCategory(category)
                                  setEditingShoppingItem(item)
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleDeleteShoppingItem(category, item.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
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
  const [formData, setFormData] = useState(
    food || {
      name: '',
      calories: '',
      protein: '',
    }
  )

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('meals.foodName')}</label>
            <Input
              placeholder="e.g., 4 Eggs, Bread with Peanut Butter"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('meals.calories')}</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g., 320"
                value={formData.calories ?? ''}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('meals.protein')}</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g., 24"
                value={formData.protein ?? ''}
                onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
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
