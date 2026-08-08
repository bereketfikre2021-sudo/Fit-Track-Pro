import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { useLocalizedName } from '../lib/localizedField'
import { compressImageFile } from '../lib/imageUtils'
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
  Sparkles,
  Sunrise,
  Apple,
  Utensils,
  Coffee,
  UtensilsCrossed,
  Moon,
  Dumbbell,
  Flame,
  FileText,
  Share2,
  AlertTriangle,
  Camera,
  ImageIcon,
} from 'lucide-react'

// ── Food/Shopping item image thumbnail ───────────────────────────────────────

/**
 * Clickable image thumbnail for a food item or shopping item.
 * - Shows the image if imageUrl is set
 * - Shows a camera/upload placeholder if no image
 * - Clicking opens a file picker and compresses/stores the image on the item
 * - onImageChange(newDataUrl) is called with the compressed image
 * - size: 'md' (40px, meal rows) | 'sm' (32px, shopping pills)
 */
function ItemThumbnail({ imageUrl, onImageChange, alt = '', size = 'md', disabled = false }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)

  const sizeClass = size === 'sm'
    ? 'w-8 h-8 rounded-md text-xs'
    : 'w-10 h-10 rounded-md text-sm'

  const handleClick = (e) => {
    if (disabled) return
    e.stopPropagation()
    inputRef.current?.click()
  }

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file, { maxWidth: 200, maxHeight: 200, quality: 0.8 })
      onImageChange?.(dataUrl)
    } catch {
      // ignore
    }
  }, [onImageChange])

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden relative group cursor-pointer select-none`}
      onClick={handleClick}
      title={disabled ? undefined : t('meals.clickToUploadImage', { defaultValue: 'Click to add image' })}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={disabled ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e) }}
      aria-label={disabled ? alt : t('meals.clickToUploadImage', { defaultValue: 'Click to add image' })}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover rounded-md"
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      ) : (
        <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-muted-foreground/40 group-hover:bg-muted/70 group-hover:text-muted-foreground transition-colors">
          <Camera className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </div>
      )}
      {/* Hover overlay when image exists */}
      {imageUrl && !disabled && (
        <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className={size === 'sm' ? 'h-3 w-3 text-white' : 'h-3.5 w-3.5 text-white'} />
        </div>
      )}
      {!disabled && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      )}
    </div>
  )
}
import { getDayMacroTotals, formatMacroSummary } from '../lib/mealPlan'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { MealPushReminderSection } from '../components/MealPushReminderSection'
import {
  downloadMealPlanPDF,
  downloadShoppingListPDF,
  getMealPlanPDFBlob,
  getShoppingListPDFBlob,
  sharePDF,
} from '../lib/pdfExport'
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
  getRelevantShoppingLists,
  localizedShoppingPreset,
} from '../lib/presetShoppingLists'
import { useMergedShoppingLists, buildMergedShoppingList } from '../lib/usePresets'
import { calculateBmi, getBmiCategory, resolveEffectiveTrainingGoal } from '../lib/profileUtils'
import { hasAnyExercises, isMealPlanEmpty, isShoppingListEmpty } from '../lib/planEmpty'
import { allowsAiPlanFeatures, allowsTemplatePlanFeatures } from '@/lib/planSetup'
import { searchFoods } from '../lib/ethiopianFoods'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MEAL_SLOTS = [
  { id: 'breakfast',     icon: Sunrise },
  { id: 'morningSnack',  icon: Apple },
  { id: 'lunch',         icon: Utensils },
  { id: 'afternoonSnack',icon: Coffee },
  { id: 'dinner',        icon: UtensilsCrossed },
  { id: 'beforeBed',     icon: Moon },
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
  const getLocalizedName = useLocalizedName()
  const mergedShoppingLists = useMergedShoppingLists()
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
  const [showMealPresets, setShowMealPresets] = useState(false)
  const [showShoppingTemplates, setShowShoppingTemplates] = useState(false)
  const [showShoppingPresets, setShowShoppingPresets] = useState(false)
  // Branded confirm dialog state for shopping preset apply
  const [confirmShoppingPreset, setConfirmShoppingPreset] = useState(null) // preset object | null
  // Bulk selection for meal plan
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  // Set of "day|mealTime|foodId" strings
  const [selectedFoodIds, setSelectedFoodIds] = useState(new Set())

  const mealPlan = state.mealPlan || {}
  const showAiMealRecommend = isMealPlanEmpty(mealPlan)
  const showTemplateFeatures = allowsTemplatePlanFeatures(state)
  const shoppingList = state.shoppingList || {}
  const showTemplateShoppingFeatures = allowsTemplatePlanFeatures(state)
  const appSettings = getAppSettings(state)

  // Profile-level BMI and category — used for filtering presets
  const profile = state.profile || {}
  const _bmi = calculateBmi(profile.currentWeight, profile.height)
  const bmiCategory = getBmiCategory(_bmi)

  // Detect recommended shopping list from profile
  const recommendedShoppingId = useMemo(() => {
    const bmi = calculateBmi(profile.currentWeight, profile.height)
    const cat = getBmiCategory(bmi)
    const goal = resolveEffectiveTrainingGoal(profile)
    return getRecommendedShoppingListId(cat, goal)
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

  const handleDownloadMealPDF = async () => {
    await downloadMealPlanPDF(state.mealPlan, state.profile?.name)
    toast.success('Meal plan PDF downloaded!')
  }

  const handleShareMealPDF = async () => {
    const blob = await getMealPlanPDFBlob(state.mealPlan, state.profile?.name)
    const filename = `fittrack-meal-plan-${new Date().toISOString().slice(0, 10)}.pdf`
    await sharePDF(blob, filename)
  }

  const handleAiMealRecommend = async () => {
    if (!hasAnyExercises(state)) {
      toast.error('Add exercises to your library first — AI uses your workout plan to tailor meals.')
      return
    }
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
    if (isMealPlanEmpty(mealPlan)) {
      toast.error('Fill your meal plan first — AI uses your meals to build a tailored shopping list.')
      return
    }
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

  const handleDownloadShoppingPDF = async () => {
    await downloadShoppingListPDF(state.shoppingList, state.profile?.name)
    toast.success('Shopping list PDF downloaded!')
  }

  const handleShareShoppingPDF = async () => {
    const blob = await getShoppingListPDFBlob(state.shoppingList, state.profile?.name)
    const filename = `fittrack-shopping-list-${new Date().toISOString().slice(0, 10)}.pdf`
    await sharePDF(blob, filename)
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
          name: getLocalizedName(food),
          defaultValue: `Delete "${getLocalizedName(food)}"?`,
        })
      )
    )
      return

    const newMealPlan = { ...mealPlan }
    newMealPlan[day][mealTime] = newMealPlan[day][mealTime].filter(f => f.id !== foodId)

    updateState({ mealPlan: newMealPlan })
    toast.success(t('mealToasts.foodDeleted', { name: getLocalizedName(food) }))
  }

  // ── Bulk selection helpers ─────────────────────────────────────────────────

  const makeFoodKey = (day, mealTime, foodId) => `${day}|${mealTime}|${foodId}`

  const handleToggleFoodSelection = (day, mealTime, foodId) => {
    const key = makeFoodKey(day, mealTime, foodId)
    setSelectedFoodIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSelectAllForDay = (day) => {
    const dayMeals = mealPlan[day] || {}
    const allKeys = []
    for (const slot of MEAL_SLOTS) {
      const foods = dayMeals[slot.id] || []
      foods.forEach((f) => allKeys.push(makeFoodKey(day, slot.id, f.id)))
    }
    const allSelected = allKeys.every((k) => selectedFoodIds.has(k))
    setSelectedFoodIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        allKeys.forEach((k) => next.delete(k))
      } else {
        allKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const handleDeleteSelected = () => {
    const count = selectedFoodIds.size
    if (count === 0) return
    if (!confirm(t('common.itemsSelected', { count }) + '?')) return

    const newMealPlan = { ...mealPlan }
    selectedFoodIds.forEach((key) => {
      const [day, mealTime, foodId] = key.split('|')
      if (!newMealPlan[day]?.[mealTime]) return
      newMealPlan[day] = { ...newMealPlan[day] }
      newMealPlan[day][mealTime] = newMealPlan[day][mealTime].filter((f) => f.id !== foodId)
    })

    updateState({ mealPlan: newMealPlan })
    setSelectedFoodIds(new Set())
    setBulkSelectMode(false)
    toast.success(t('common.deleteCount', { count }))
  }

  const handleExitBulkSelect = () => {
    setBulkSelectMode(false)
    setSelectedFoodIds(new Set())
  }

  // Update imageUrl on a specific food item
  const handleFoodImageChange = useCallback((day, mealTime, foodId, dataUrl) => {
    const newMealPlan = { ...mealPlan }
    if (!newMealPlan[day]?.[mealTime]) return
    newMealPlan[day] = { ...newMealPlan[day] }
    newMealPlan[day][mealTime] = newMealPlan[day][mealTime].map((f) =>
      f.id === foodId ? { ...f, imageUrl: dataUrl } : f
    )
    updateState({ mealPlan: newMealPlan })
  }, [mealPlan, updateState])

  // Update imageUrl on a shopping item
  const handleShoppingItemImageChange = useCallback((category, itemId, dataUrl) => {
    const newShoppingList = { ...shoppingList }
    newShoppingList[category] = newShoppingList[category].map((i) =>
      i.id === itemId ? { ...i, imageUrl: dataUrl } : i
    )
    updateState({ shoppingList: newShoppingList })
  }, [shoppingList, updateState])
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
          name: getLocalizedName(item),
          defaultValue: `Delete "${getLocalizedName(item)}"?`,
        })
      )
    )
      return

    const newShoppingList = { ...shoppingList }
    newShoppingList[category] = newShoppingList[category].filter(i => i.id !== itemId)
    updateState({ shoppingList: newShoppingList })
    toast.success(t('mealToasts.shopDeleted', { item: getLocalizedName(item) }))
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
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">{t('meals.pageTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('meals.pageSubtitle')}</p>
          </div>
          {/* PDF actions — shown based on active tab */}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeTab === 'meals' && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Download meal plan PDF" onClick={handleDownloadMealPDF}>
                  <FileText className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Share meal plan PDF" onClick={handleShareMealPDF}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {activeTab === 'shopping' && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Download shopping list PDF" onClick={handleDownloadShoppingPDF}>
                  <FileText className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Share shopping list PDF" onClick={handleShareShoppingPDF}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
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
          {/* Update plan — collapsible, always visible */}
          <div className="space-y-2">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
              onClick={() => setShowPresets((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('meals.updateMealPlan')}
              </span>
              {showPresets
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showPresets && (
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t('meals.generateMealPlanDesc')}
                  {!hasAnyExercises(state) && ' ' + t('meals.aiNeedsExercises')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {allowsAiPlanFeatures(state) && (
                    <AiRecommendButton
                      loading={aiLoading}
                      label={t('ai.mealLabel')}
                      onClick={handleAiMealRecommend}
                      disabled={!hasAnyExercises(state)}
                    />
                  )}
                  {showTemplateFeatures && (
                    <Button
                      type="button"
                      variant={showMealPresets ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowMealPresets((v) => !v)}
                    >
                      <LayoutTemplate className="h-4 w-4 mr-2" />
                      {t('meals.presetPlans')}
                      {showMealPresets
                        ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
                        : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
                    </Button>
                  )}
                </div>
                {showMealPresets && showTemplateFeatures && (
                  <div className="pt-1 border-t border-border/60">
                    <MealPresetTemplatesSection
                      state={state}
                      updateState={updateState}
                      onAfterApply={() => { setShowMealPresets(false); setShowPresets(false) }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

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

                {/* ── Push notification toggle (new) ── */}
                <MealPushReminderSection
                  appSettings={appSettings}
                  patchSettings={patchSettings}
                />

                <div className="border-t border-border/60 pt-3">
                  <p className="font-medium text-foreground mb-2">{t('meals.calendarPlatformLabel')}</p>
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
                  {(() => {
                    const dayAllFoodKeys = MEAL_SLOTS.flatMap((s) =>
                      (dayMeals[s.id] || []).map((f) => makeFoodKey(day, s.id, f.id))
                    )
                    const daySelectedCount = dayAllFoodKeys.filter((k) => selectedFoodIds.has(k)).length
                    const dayAllSelected = dayAllFoodKeys.length > 0 && daySelectedCount === dayAllFoodKeys.length

                    return (
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
                        {/* Select mode controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {bulkSelectMode ? (
                            <>
                              {dayAllFoodKeys.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleSelectAllForDay(day)}
                                >
                                  {dayAllSelected ? t('common.deselectAll') : t('common.selectAll')}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-muted-foreground"
                                onClick={handleExitBulkSelect}
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                {t('common.cancel')}
                              </Button>
                            </>
                          ) : (
                            totalItems > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => setBulkSelectMode(true)}
                              >
                                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                                {t('common.select')}
                              </Button>
                            )
                          )}
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
                                {(() => { const Icon = mealTime.icon; return <Icon className="h-5 w-5 text-primary shrink-0" aria-hidden /> })()}
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
                                {foods.map((food, index) => {
                                  const foodKey = makeFoodKey(day, mealTime.id, food.id)
                                  const isChecked = selectedFoodIds.has(foodKey)
                                  return (
                                  <div
                                    key={food.id}
                                    className={cn(
                                      'flex items-center gap-3 group py-2 px-3 rounded transition-colors border-b last:border-b-0',
                                      bulkSelectMode
                                        ? isChecked
                                          ? 'bg-primary/10 border-primary/20 cursor-pointer'
                                          : 'hover:bg-muted/50 cursor-pointer'
                                        : 'hover:bg-muted/50'
                                    )}
                                    onClick={bulkSelectMode ? () => handleToggleFoodSelection(day, mealTime.id, food.id) : undefined}
                                  >
                                    {bulkSelectMode ? (
                                      <span className={cn(
                                        'flex items-center justify-center h-4 w-4 rounded border transition-colors shrink-0',
                                        isChecked
                                          ? 'bg-primary border-primary text-primary-foreground'
                                          : 'border-muted-foreground/40 bg-background'
                                      )}>
                                        {isChecked && <CheckSquare className="h-3 w-3" />}
                                      </span>
                                    ) : (
                                      <ItemThumbnail
                                        imageUrl={food.imageUrl}
                                        alt={getLocalizedName(food)}
                                        size="md"
                                        disabled={bulkSelectMode}
                                        onImageChange={(dataUrl) => handleFoodImageChange(day, mealTime.id, food.id, dataUrl)}
                                      />
                                    )}
                                    <span className="text-sm flex-1">
                                      {getLocalizedName(food)}
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
                                    {!bulkSelectMode && (
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
                                    )}
                                  </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                    )
                  })()}
                </TabsContent>
              )
            })}
          </Tabs>

          {/* Floating bulk delete bar */}
          {bulkSelectMode && selectedFoodIds.size > 0 && (
            <div className="sticky bottom-20 md:bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
              <span className="text-sm font-medium">
                {t('common.itemsSelected', { count: selectedFoodIds.size })}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleExitBulkSelect}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={handleDeleteSelected}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.deleteCount', { count: selectedFoodIds.size })}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* SHOPPING LIST TAB */}
        <TabsContent value="shopping" className="space-y-4">

          {/* Update shopping list — collapsible, always visible */}
          <div className="space-y-2">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
              onClick={() => setShowShoppingTemplates((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('meals.updateShoppingList')}
              </span>
              {showShoppingTemplates
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showShoppingTemplates && (
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t('meals.generateShoppingDesc')}
                  {isMealPlanEmpty(mealPlan) && ' ' + t('meals.aiShoppingNeedsMeals')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <AiRecommendButton
                    loading={aiShoppingLoading}
                    label={t('ai.shoppingLabel')}
                    onClick={handleAiShoppingRecommend}
                    disabled={isMealPlanEmpty(mealPlan)}
                  />
                  {showTemplateShoppingFeatures && (
                    <Button
                      type="button"
                      variant={showShoppingPresets ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowShoppingPresets((v) => !v)}
                    >
                      <LayoutTemplate className="h-4 w-4 mr-2" />
                      {t('meals.presetLists')}
                      {showShoppingPresets
                        ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
                        : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
                    </Button>
                  )}
                </div>
                {showShoppingPresets && showTemplateShoppingFeatures && (
                  <div className="space-y-3 pt-1 border-t border-border/60">
                    <p className="text-xs text-muted-foreground">
                      {t('meals.recommendedForGoalDesc')}
                    </p>
                    {(() => {
                      // Use merged presets (DB overrides + JS fallback)
                      const relevantIds = getRelevantShoppingLists(bmiCategory, profile.goal).map(p => p.id)
                      const relevantLists = mergedShoppingLists.filter(p => relevantIds.includes(p.id))
                      const recommended = relevantLists.find((p) => p.id === recommendedShoppingId) ?? relevantLists[0]
                      const others = relevantLists.filter((p) => p.id !== recommended?.id)
                      const ShoppingCard = ({ preset }) => {
                        const lsp = localizedShoppingPreset(preset, i18n.language)
                        return (
                        <Card className={cn('border transition-all', preset.id === recommendedShoppingId ? 'border-primary/50 bg-primary/5' : 'border-border')}>
                          <CardContent className="p-4">
                            {/* Admin-uploaded thumbnail */}
                            {preset.image_url && (
                              <img src={preset.image_url} alt={lsp.name}
                                className="w-full h-28 object-cover rounded-md mb-3" />
                            )}
                            <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                              {preset.id === 'weight-gain'
                                ? <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                                : <Flame className="h-4 w-4 text-primary shrink-0" />}
                              {lsp.name}
                            </p>
                            {preset.id === recommendedShoppingId && (
                              <span className="text-[10px] text-primary font-medium block mb-1">{t('meals.recommendedForGoal')}</span>
                            )}
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{lsp.description}</p>
                            <Button size="sm" variant={preset.id === recommendedShoppingId ? 'default' : 'outline'} className="w-full"
                              onClick={() => {
                                setConfirmShoppingPreset(preset)
                              }}>
                              <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
                              {t('meals.useThisList')}
                            </Button>
                          </CardContent>
                        </Card>
                        )
                      }
                      return (
                        <>
                          <ShoppingCard preset={recommended} />
                          {others.length > 0 && (
                            <details>
                              <summary className="text-xs text-primary hover:underline cursor-pointer list-none">
                                {t('meals.seeOtherOptions', { count: others.length })}
                              </summary>
                              <div className="space-y-3 mt-3">
                                {others.map((p) => <ShoppingCard key={p.id} preset={p} />)}
                              </div>
                            </details>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

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
                                'group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-all select-none',
                                item.checked
                                  ? 'border-primary/30 bg-primary/10 text-primary opacity-60'
                                  : 'border-border bg-muted/30 hover:border-primary/40'
                              )}
                            >
                              <ItemThumbnail
                                imageUrl={item.imageUrl}
                                alt={getLocalizedName(item)}
                                size="sm"
                                onImageChange={(dataUrl) => handleShoppingItemImageChange(category, item.id, dataUrl)}
                              />
                              <div
                                className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0"
                                onClick={() => handleToggleShoppingItem(category, item.id)}
                              >
                                {item.checked
                                  ? <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                                  : <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                }
                                <span className={cn('font-medium truncate', item.checked && 'line-through')}>{getLocalizedName(item)}</span>
                              </div>
                              <button
                                type="button"
                                className="ml-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
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

      {/* Branded confirm dialog — replace shopping list with preset */}
      {confirmShoppingPreset && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmShoppingPreset(null) }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {confirmShoppingPreset.id === 'weight-gain'
                  ? <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                  : <Flame className="h-4 w-4 text-primary shrink-0" />}
                Apply "{localizedShoppingPreset(confirmShoppingPreset, i18n.language).name}"
              </DialogTitle>
              <DialogDescription>
                This will <strong>replace</strong> your current shopping list completely.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                <span>{t('meals.replaceShoppingWarning')}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmShoppingPreset(null)}>
                  <X className="h-4 w-4 mr-1.5" />
                  {t('common.cancel')}
                </Button>
                <Button className="flex-1" onClick={() => {
                  const items = buildMergedShoppingList(confirmShoppingPreset)
                  if (!items) return
                  updateState({ shoppingList: items })
                  setShowShoppingPresets(false)
                  setConfirmShoppingPreset(null)
                  toast.success(`${localizedShoppingPreset(confirmShoppingPreset, i18n.language).name} applied`)
                }}>
                  <LayoutTemplate className="h-4 w-4 mr-1.5" />
                  {t('meals.applyList')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
      imageUrl: item.imageUrl || item.image_url || '',
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
