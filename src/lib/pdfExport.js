/**
 * pdfExport.js
 *
 * Generates and downloads PDF files for:
 *   - Weekly Meal Plan
 *   - Shopping List
 *
 * Uses jsPDF (client-side, no server required, works in PWA).
 */

import { jsPDF } from 'jspdf'
import i18n from '@/i18n'

// PDF font handling
// When locale is Amharic we load Ethiopic_Sadiss (served from /public) at
// runtime, register it with jsPDF, and use it for all text cells.
// Latin text always falls back to Helvetica.

const ETHIOPIC_FONT_URL = '/fonts/Ethiopic_Sadiss_Regular_991d964db2.ttf'
const ETHIOPIC_FONT_NAME = 'EthiopicSadiss'
const INTER_REGULAR_URL = '/fonts/Inter/Inter_18pt-Regular.ttf'
const INTER_BOLD_URL = '/fonts/Inter/Inter_18pt-Bold.ttf'
const INTER_SEMIBOLD_URL = '/fonts/Inter/Inter_18pt-SemiBold.ttf'
const INTER_FONT_NAME = 'Inter'

let _ethiopicFontB64 = null
let _interRegularB64 = null
let _interBoldB64 = null
let _interSemiBoldB64 = null

async function loadFontB64(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Could not load font: ${url}`)
  const buf = await resp.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function loadEthiopicFont() {
  if (_ethiopicFontB64) return _ethiopicFontB64
  _ethiopicFontB64 = await loadFontB64(ETHIOPIC_FONT_URL)
  return _ethiopicFontB64
}

async function loadInterFonts() {
  if (_interRegularB64 && _interBoldB64 && _interSemiBoldB64) return
  const [r, b, s] = await Promise.allSettled([
    loadFontB64(INTER_REGULAR_URL),
    loadFontB64(INTER_BOLD_URL),
    loadFontB64(INTER_SEMIBOLD_URL),
  ])
  if (r.status === 'fulfilled') _interRegularB64 = r.value
  if (b.status === 'fulfilled') _interBoldB64 = b.value
  if (s.status === 'fulfilled') _interSemiBoldB64 = s.value
}

function registerEthiopicFont(doc, b64) {
  try {
    doc.addFileToVFS(`${ETHIOPIC_FONT_NAME}.ttf`, b64)
    doc.addFont(`${ETHIOPIC_FONT_NAME}.ttf`, ETHIOPIC_FONT_NAME, 'normal')
  } catch { /* already registered */ }
}

function registerInterFont(doc) {
  try {
    if (_interRegularB64) {
      doc.addFileToVFS('Inter-Regular.ttf', _interRegularB64)
      doc.addFont('Inter-Regular.ttf', INTER_FONT_NAME, 'normal')
    }
    if (_interBoldB64) {
      doc.addFileToVFS('Inter-Bold.ttf', _interBoldB64)
      doc.addFont('Inter-Bold.ttf', INTER_FONT_NAME, 'bold')
    }
    if (_interSemiBoldB64) {
      doc.addFileToVFS('Inter-SemiBold.ttf', _interSemiBoldB64)
      // Register SemiBold as a separate named font for headers
      doc.addFont('Inter-SemiBold.ttf', 'InterSemiBold', 'normal')
    }
  } catch { /* already registered */ }
}

// Returns the right font name for the current locale/Inter availability
function bodyFont(isAmharic) {
  if (isAmharic) return ETHIOPIC_FONT_NAME
  return _interRegularB64 ? INTER_FONT_NAME : 'helvetica'
}

function headingFont(isAmharic) {
  if (isAmharic) return ETHIOPIC_FONT_NAME
  if (_interSemiBoldB64) return 'InterSemiBold'
  if (_interBoldB64) return INTER_FONT_NAME
  return 'helvetica'
}

// PDF uses the right language based on locale
function pdfName(item) {
  if (!item) return ''
  if (i18n.language === 'am') return item.name_am || item.name_en || item.name || ''
  return item.name_en || item.name || ''
}

// ── Brand colours ─────────────────────────────────────────────────────────────
const GREEN       = [100, 200, 50]    // lime-green brand accent
const GREEN_DARK  = [70,  150, 30]    // darker green for table headers
const DARK        = [18,  18,  24]    // near-black background
const LIGHT       = [245, 245, 248]   // off-white text / backgrounds
const MUTED       = [130, 130, 142]   // secondary text
const ROW_EVEN    = [248, 250, 248]   // subtle stripe for even rows
const ROW_ODD     = [255, 255, 255]   // white for odd rows
const BORDER_CLR  = [220, 224, 220]   // table border colour

const PAGE_W  = 210   // A4 mm
const PAGE_H  = 297
const MARGIN  = 12
const COL_W   = PAGE_W - MARGIN * 2
const ROW_H   = 7     // standard row height
const HDR_H   = 32    // page header height

// ── Shared helpers ────────────────────────────────────────────────────────────

function addPageHeader(doc, title, subtitle, isAmharic) {
  // Full-width dark banner
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PAGE_W, HDR_H, 'F')

  // Green accent bar on the left edge
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, 4, HDR_H, 'F')

  // App name brand text — InterSemiBold or Helvetica
  const brandFont = headingFont(isAmharic)
  doc.setFont(brandFont, isAmharic ? 'normal' : 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GREEN)
  doc.text('FITTRACK PRO', MARGIN + 2, 9)

  // Title — use heading font
  doc.setFontSize(17)
  doc.setTextColor(...LIGHT)
  doc.setFont(headingFont(isAmharic), 'normal')
  doc.text(title, MARGIN + 2, 21)

  // Subtitle / date (right-aligned) — always Latin
  if (subtitle) {
    doc.setFont(bodyFont(false), 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(subtitle, PAGE_W - MARGIN, 21, { align: 'right' })
  }

  // Thin green rule below header
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.6)
  doc.line(0, HDR_H, PAGE_W, HDR_H)

  return HDR_H + 5
}

function addFooter(doc) {
  const pageCount = doc.getNumberOfPages()
  const footerFont = bodyFont(false) // always Latin for footer
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...BORDER_CLR)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10)
    doc.setFont(footerFont, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text(
      `FitTrack Pro  ·  Generated ${new Date().toLocaleDateString()}  ·  Page ${i} of ${pageCount}`,
      PAGE_W / 2, PAGE_H - 5, { align: 'center' }
    )
  }
}

function checkPageBreak(doc, y, needed = 10) {
  if (y + needed > PAGE_H - 14) {
    doc.addPage()
    return HDR_H + 5
  }
  return y
}

/** Pill-style section header (category / day name) */
function addSectionBadge(doc, text, y, isAmharic) {
  const hFont = headingFont(isAmharic)
  const badgeW = Math.min(COL_W, doc.getTextWidth(text) * 1.25 + 14)
  doc.setFillColor(...GREEN_DARK)
  doc.roundedRect(MARGIN, y, badgeW, 6.5, 1.5, 1.5, 'F')
  doc.setFont(hFont, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...LIGHT)
  doc.text(isAmharic ? text : text.toUpperCase(), MARGIN + 7, y + 4.5)
  return y + 9
}

/** Draw a single table row with optional alternating background */
function drawTableRow(doc, cols, y, rowH, isHeader, isEven, isAmharic) {
  // Row background
  if (isHeader) {
    doc.setFillColor(...GREEN)
  } else {
    doc.setFillColor(...(isEven ? ROW_EVEN : ROW_ODD))
  }
  doc.rect(MARGIN, y, COL_W, rowH, 'F')

  // Bottom border
  doc.setDrawColor(...BORDER_CLR)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y + rowH, MARGIN + COL_W, y + rowH)

  // Left / right border
  doc.line(MARGIN, y, MARGIN, y + rowH)
  doc.line(MARGIN + COL_W, y, MARGIN + COL_W, y + rowH)

  // Cell text and vertical dividers
  let xCursor = MARGIN
  cols.forEach(({ text, width, align = 'left', muted = false, bold = false }) => {
    if (xCursor > MARGIN) {
      doc.line(xCursor, y, xCursor, y + rowH)
    }

    // Header rows: use headingFont (InterSemiBold for English, Ethiopic for Amharic)
    // Data rows: use bodyFont
    const cellFont = isHeader ? headingFont(isAmharic) : bodyFont(isAmharic)
    // Ethiopic has no bold — always normal; Inter uses bold for header
    const fontStyle = (isHeader && !isAmharic) ? 'normal' : 'normal'
    doc.setFont(cellFont, fontStyle)
    doc.setFontSize(isHeader ? 7.5 : 8)

    if (isHeader) {
      doc.setTextColor(...LIGHT)
    } else if (muted) {
      doc.setTextColor(...MUTED)
    } else {
      doc.setTextColor(22, 22, 28)
    }

    const padding = 2.5
    const textX = align === 'right'
      ? xCursor + width - padding
      : xCursor + padding
    const textY = y + rowH / 2 + 2.5

    const maxW = width - padding * 2
    const lines = doc.splitTextToSize(String(text ?? ''), maxW)
    doc.text(lines[0] ?? '', textX, textY, { align })

    xCursor += width
  })
}

// ── Meal Plan PDF ─────────────────────────────────────────────────────────────

const DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOTS = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'beforeBed']

const SLOT_LABELS = {
  breakfast:      'Breakfast',
  morningSnack:   'Morning Snack',
  lunch:          'Lunch',
  afternoonSnack: 'Afternoon Snack',
  dinner:         'Dinner',
  beforeBed:      'Before Bed',
}

const SLOT_LABELS_AM = {
  breakfast:      'ቁርስ',
  morningSnack:   'ቅንጅብ',
  lunch:          'ምሳ',
  afternoonSnack: 'ቅንጅብ',
  dinner:         'ዋና ምግብ',
  beforeBed:      'ከመኝታ በፊት',
}

const DAY_LABELS_AM = {
  Monday: 'ሰኞ', Tuesday: 'ማክሰኞ', Wednesday: 'ረቡዕ',
  Thursday: 'ሐሙስ', Friday: 'አርብ', Saturday: 'ቅዳሜ', Sunday: 'እሁድ',
}

const MEAL_COLS = { slot: 38, name: 80, kcal: 22, protein: 18, carbs: 15, fat: 13 }

async function buildMealPlanDoc(doc, mealPlan, name) {
  const isAmharic = i18n.language === 'am'
  if (isAmharic) {
    try { const b64 = await loadEthiopicFont(); registerEthiopicFont(doc, b64) }
    catch (e) { console.warn('Ethiopic font load failed', e) }
  } else {
    try { await loadInterFonts(); registerInterFont(doc) }
    catch (e) { console.warn('Inter font load failed', e) }
  }
  const subtitle = `${name ? name + ' · ' : ''}${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
  let y = addPageHeader(doc, isAmharic ? 'የሳምንት የምግብ እቅድ' : 'Weekly Meal Plan', subtitle, isAmharic)

  for (const day of DAYS) {
    const dayMeals = mealPlan?.[day] || {}
    const hasFood = SLOTS.some((s) => (dayMeals[s] || []).length > 0)
    y = checkPageBreak(doc, y, 28)
    y = addSectionBadge(doc, isAmharic ? (DAY_LABELS_AM[day] || day) : day, y, isAmharic)

    if (!hasFood) {
      doc.setFillColor(...ROW_ODD); doc.rect(MARGIN, y, COL_W, ROW_H, 'F')
      doc.setDrawColor(...BORDER_CLR); doc.setLineWidth(0.2); doc.rect(MARGIN, y, COL_W, ROW_H)
      doc.setFont(bodyFont(isAmharic), 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED)
      doc.text(isAmharic ? 'ለዚህ ቀን ምግብ አልተዘጋጀም' : 'No meals planned for this day', MARGIN + 3, y + ROW_H / 2 + 2.5)
      y += ROW_H + 4; continue
    }

    y = checkPageBreak(doc, y, ROW_H + 2)
    drawTableRow(doc, [
      { text: isAmharic ? 'ምግብ' : 'Meal', width: MEAL_COLS.slot },
      { text: isAmharic ? 'የምግብ ስም' : 'Food Item', width: MEAL_COLS.name },
      { text: 'kcal', width: MEAL_COLS.kcal, align: 'right' },
      { text: isAmharic ? 'ፕ' : 'Prot', width: MEAL_COLS.protein, align: 'right' },
      { text: isAmharic ? 'ካር' : 'Carb', width: MEAL_COLS.carbs, align: 'right' },
      { text: isAmharic ? 'ስብ' : 'Fat', width: MEAL_COLS.fat, align: 'right' },
    ], y, ROW_H, true, false, isAmharic)
    y += ROW_H

    let rowIdx = 0
    for (const slot of SLOTS) {
      const foods = dayMeals[slot] || []
      if (!foods.length) continue
      for (let fi = 0; fi < foods.length; fi++) {
        const food = foods[fi]
        y = checkPageBreak(doc, y, ROW_H)
        const slotLabel = fi === 0 ? (isAmharic ? SLOT_LABELS_AM[slot] : SLOT_LABELS[slot]) : ''
        drawTableRow(doc, [
          { text: slotLabel, width: MEAL_COLS.slot, muted: true },
          { text: pdfName(food), width: MEAL_COLS.name },
          { text: food.calories ? Math.round(food.calories) : '–', width: MEAL_COLS.kcal, align: 'right', muted: !food.calories },
          { text: food.protein ? `${food.protein}g` : '–', width: MEAL_COLS.protein, align: 'right', muted: !food.protein },
          { text: food.carbs ? `${food.carbs}g` : '–', width: MEAL_COLS.carbs, align: 'right', muted: !food.carbs },
          { text: food.fat ? `${food.fat}g` : '–', width: MEAL_COLS.fat, align: 'right', muted: !food.fat },
        ], y, ROW_H, false, rowIdx % 2 === 0, isAmharic)
        y += ROW_H; rowIdx++
      }
    }
    y += 5
  }
  addFooter(doc)
}

export async function downloadMealPlanPDF(mealPlan, name = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await buildMealPlanDoc(doc, mealPlan, name)
  doc.save(`fittrack-meal-plan-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export async function getMealPlanPDFBlob(mealPlan, name = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await buildMealPlanDoc(doc, mealPlan, name)
  return doc.output('blob')
}

// ── Shopping List PDF ─────────────────────────────────────────────────────────

const SH_COLS_PER_ROW = 3
const SH_COL_W = Math.floor(COL_W / SH_COLS_PER_ROW)

const CATEGORY_LABELS_AM = {
  'Protein Sources': 'ፕሮቲን ምንጮች',
  'Carb Sources': 'ካርቦሃይድሬት ምንጮች',
  'Healthy Fats': 'ጤናማ ስብ',
  'Fruits & Vegetables': 'ፍራፍሬ እና አትክልት',
  'Other': 'ሌላ',
}

async function buildShoppingListDoc(doc, shoppingList, name) {
  const isAmharic = i18n.language === 'am'
  if (isAmharic) {
    try { const b64 = await loadEthiopicFont(); registerEthiopicFont(doc, b64) }
    catch (e) { console.warn('Ethiopic font load failed', e) }
  } else {
    try { await loadInterFonts(); registerInterFont(doc) }
    catch (e) { console.warn('Inter font load failed', e) }
  }
  const subtitle = `${name ? name + ' · ' : ''}${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
  let y = addPageHeader(doc, isAmharic ? 'አስቤዛ' : 'Shopping List', subtitle, isAmharic)

  const categories = Object.keys(shoppingList || {}).filter(cat => (shoppingList[cat] || []).length > 0)
  if (!categories.length) {
    doc.setFont(bodyFont(isAmharic), 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED)
    doc.text(isAmharic ? 'አስቤዛ ባዶ ነው።' : 'Your shopping list is empty.', MARGIN, y + 10)
    addFooter(doc); return
  }

  for (const category of categories) {
    const items = shoppingList[category] || []
    if (!items.length) continue
    y = checkPageBreak(doc, y, 24)
    const catLabel = isAmharic ? (CATEGORY_LABELS_AM[category] || category) : category
    y = addSectionBadge(doc, catLabel, y, isAmharic)

    // Header row
    y = checkPageBreak(doc, y, ROW_H)
    doc.setFillColor(...GREEN); doc.rect(MARGIN, y, COL_W, ROW_H - 1, 'F')
    doc.setDrawColor(...BORDER_CLR); doc.setLineWidth(0.2); doc.rect(MARGIN, y, COL_W, ROW_H - 1)
    doc.setFont(headingFont(isAmharic), 'normal'); doc.setFontSize(7.5); doc.setTextColor(...LIGHT)
    doc.text(isAmharic ? 'ንጥል' : 'ITEM', MARGIN + 10, y + (ROW_H - 1) / 2 + 2.2)
    for (let c = 1; c < SH_COLS_PER_ROW; c++) {
      doc.setDrawColor(...LIGHT)
      doc.line(MARGIN + c * SH_COL_W, y, MARGIN + c * SH_COL_W, y + ROW_H - 1)
    }
    y += ROW_H - 1

    const ITEM_ROW_H = 7
    const CHECKBOX_SIZE = 3
    const CHECKBOX_PAD = 2.5
    const TEXT_OFFSET = CHECKBOX_SIZE + CHECKBOX_PAD * 2

    for (let i = 0; i < items.length; i += SH_COLS_PER_ROW) {
      y = checkPageBreak(doc, y, ITEM_ROW_H)
      const rowItems = items.slice(i, i + SH_COLS_PER_ROW)
      const isEven = (i / SH_COLS_PER_ROW) % 2 === 0
      doc.setFillColor(...(isEven ? ROW_EVEN : ROW_ODD)); doc.rect(MARGIN, y, COL_W, ITEM_ROW_H, 'F')
      doc.setDrawColor(...BORDER_CLR); doc.setLineWidth(0.2)
      doc.line(MARGIN, y + ITEM_ROW_H, MARGIN + COL_W, y + ITEM_ROW_H)
      doc.line(MARGIN, y, MARGIN, y + ITEM_ROW_H)
      doc.line(MARGIN + COL_W, y, MARGIN + COL_W, y + ITEM_ROW_H)

      for (let c = 0; c < SH_COLS_PER_ROW; c++) {
        const cellX = MARGIN + c * SH_COL_W
        if (c > 0) { doc.setDrawColor(...BORDER_CLR); doc.setLineWidth(0.2); doc.line(cellX, y, cellX, y + ITEM_ROW_H) }
        const item = rowItems[c]
        if (!item) continue
        const checkboxY = y + ITEM_ROW_H / 2 - CHECKBOX_SIZE / 2
        doc.setDrawColor(...GREEN_DARK); doc.setLineWidth(0.4)
        doc.rect(cellX + CHECKBOX_PAD, checkboxY, CHECKBOX_SIZE, CHECKBOX_SIZE)
        if (item.checked) {
          doc.setDrawColor(...GREEN); doc.setLineWidth(0.5)
          doc.line(cellX + CHECKBOX_PAD + 0.4, checkboxY + CHECKBOX_SIZE / 2, cellX + CHECKBOX_PAD + CHECKBOX_SIZE * 0.4, checkboxY + CHECKBOX_SIZE - 0.5)
          doc.line(cellX + CHECKBOX_PAD + CHECKBOX_SIZE * 0.4, checkboxY + CHECKBOX_SIZE - 0.5, cellX + CHECKBOX_PAD + CHECKBOX_SIZE - 0.3, checkboxY + 0.3)
        }
        doc.setFont(bodyFont(isAmharic), 'normal'); doc.setFontSize(8)
        doc.setTextColor(...(item.checked ? MUTED : [22, 22, 28]))
        const maxLabelW = SH_COL_W - TEXT_OFFSET - CHECKBOX_PAD - 1
        const label = doc.splitTextToSize(pdfName(item) || 'Item', maxLabelW)
        doc.text(label[0], cellX + TEXT_OFFSET, y + ITEM_ROW_H / 2 + 2.2)
      }
      y += ITEM_ROW_H
    }
    y += 4
  }

  y = checkPageBreak(doc, y, 10)
  const total = Object.values(shoppingList).flat().length
  const checked = Object.values(shoppingList).flat().filter(i => i.checked).length
  doc.setFillColor(...DARK); doc.roundedRect(MARGIN, y, COL_W, 8, 1.5, 1.5, 'F')
  doc.setFont(headingFont(isAmharic), 'normal'); doc.setFontSize(8); doc.setTextColor(...GREEN)
  doc.text(`${checked} / ${total} ${isAmharic ? 'ንጥሎች ተፈርጁ' : 'items checked'}`, MARGIN + 4, y + 5.2)
  doc.setFont(bodyFont(false), 'normal'); doc.setTextColor(...MUTED)
  doc.text('FitTrack Pro Shopping List', MARGIN + COL_W - 4, y + 5.2, { align: 'right' })
  addFooter(doc)
}

export async function downloadShoppingListPDF(shoppingList, name = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await buildShoppingListDoc(doc, shoppingList, name)
  doc.save(`fittrack-shopping-list-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export async function getShoppingListPDFBlob(shoppingList, name = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await buildShoppingListDoc(doc, shoppingList, name)
  return doc.output('blob')
}

// ── Web Share API helper ──────────────────────────────────────────────────────

/**
 * Share a PDF via the Web Share API (mobile / PWA).
 * Falls back to download if sharing is not supported.
 */
export async function sharePDF(blob, filename) {
  if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename)] })) {
    try {
      await navigator.share({
        title: 'FitTrack Pro',
        files: [new File([blob], filename, { type: 'application/pdf' })],
      })
      return true
    } catch {
      // User cancelled or share failed — fall through to download
    }
  }
  // Fallback: direct download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return false
}
