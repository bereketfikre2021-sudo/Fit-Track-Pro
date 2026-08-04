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

// ── Brand colours ─────────────────────────────────────────────────────────────
const GREEN  = [100, 200, 50]   // primary lime-green approximation
const DARK   = [15,  15,  20]   // near-black background
const LIGHT  = [240, 240, 240]  // light text / lines
const MUTED  = [140, 140, 150]

const PAGE_W = 210  // A4 mm
const PAGE_H = 297
const MARGIN = 14
const COL_W  = PAGE_W - MARGIN * 2

// ── Helpers ───────────────────────────────────────────────────────────────────

function addHeader(doc, title, subtitle) {
  // Dark header bar
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PAGE_W, 28, 'F')

  // App name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GREEN)
  doc.text('FITTRACK PRO', MARGIN, 10)

  // Document title
  doc.setFontSize(16)
  doc.setTextColor(...LIGHT)
  doc.text(title, MARGIN, 20)

  // Subtitle / date
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(subtitle, PAGE_W - MARGIN, 20, { align: 'right' })
  }

  return 34  // y position after header
}

function addSectionTitle(doc, text, y) {
  doc.setFillColor(...GREEN)
  doc.rect(MARGIN, y, 3, 5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text(text, MARGIN + 6, y + 4)
  return y + 10
}

function addFooter(doc) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(
      `FitTrack Pro · Generated ${new Date().toLocaleDateString()}  ·  Page ${i} of ${pageCount}`,
      PAGE_W / 2, PAGE_H - 6,
      { align: 'center' }
    )
  }
}

function checkPageBreak(doc, y, needed = 12) {
  if (y + needed > PAGE_H - 16) {
    doc.addPage()
    return 16
  }
  return y
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

/**
 * Generate and download a Weekly Meal Plan PDF.
 * @param {object} mealPlan  state.mealPlan
 * @param {string} [name]    user's name for the header
 */
export function downloadMealPlanPDF(mealPlan, name = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const subtitle = `${name ? name + ' · ' : ''}${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
  let y = addHeader(doc, 'Weekly Meal Plan', subtitle)

  for (const day of DAYS) {
    const dayMeals = mealPlan?.[day] || {}
    const hasFood = SLOTS.some((s) => (dayMeals[s] || []).length > 0)

    y = checkPageBreak(doc, y, 20)
    y = addSectionTitle(doc, day, y)

    if (!hasFood) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text('No meals planned', MARGIN + 6, y)
      y += 7
      continue
    }

    for (const slot of SLOTS) {
      const foods = dayMeals[slot] || []
      if (!foods.length) continue

      y = checkPageBreak(doc, y, 8)

      // Slot label
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text(SLOT_LABELS[slot], MARGIN + 6, y)
      y += 5

      for (const food of foods) {
        y = checkPageBreak(doc, y, 6)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(30, 30, 35)

        // Food name
        const nameText = doc.splitTextToSize(`• ${food.name || 'Unnamed'}`, COL_W - 40)
        doc.text(nameText, MARGIN + 8, y)

        // Macros on the right
        const macros = [
          food.calories ? `${Math.round(food.calories)} kcal` : '',
          food.protein  ? `${food.protein}g P` : '',
          food.carbs    ? `${food.carbs}g C` : '',
          food.fat      ? `${food.fat}g F` : '',
        ].filter(Boolean).join('  ·  ')

        if (macros) {
          doc.setFontSize(7)
          doc.setTextColor(...MUTED)
          doc.text(macros, PAGE_W - MARGIN, y, { align: 'right' })
        }

        y += nameText.length > 1 ? nameText.length * 4.5 : 5
      }
      y += 2
    }
    y += 4
  }

  addFooter(doc)
  doc.save(`fittrack-meal-plan-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Shopping List PDF ─────────────────────────────────────────────────────────

/**
 * Generate and download a Shopping List PDF.
 * @param {object} shoppingList  state.shoppingList
 * @param {string} [name]        user's name
 */
export function downloadShoppingListPDF(shoppingList, name = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const subtitle = `${name ? name + ' · ' : ''}${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
  let y = addHeader(doc, 'Shopping List', subtitle)

  const categories = Object.keys(shoppingList || {})

  if (!categories.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    doc.text('Your shopping list is empty.', MARGIN, y + 10)
    addFooter(doc)
    doc.save(`fittrack-shopping-list-${new Date().toISOString().slice(0, 10)}.pdf`)
    return
  }

  for (const category of categories) {
    const items = shoppingList[category] || []
    if (!items.length) continue

    y = checkPageBreak(doc, y, 20)
    y = addSectionTitle(doc, category, y)

    // Two-column layout for shopping items
    const colA = MARGIN + 6
    const colB = PAGE_W / 2 + 4
    let col = 0

    for (const item of items) {
      if (col === 0) y = checkPageBreak(doc, y, 6)

      const x = col === 0 ? colA : colB

      // Checkbox
      doc.setDrawColor(...MUTED)
      doc.setLineWidth(0.3)
      doc.rect(x, y - 3.5, 3.5, 3.5)

      // Item name
      doc.setFont('helvetica', item.checked ? 'normal' : 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(item.checked ? 160 : 30, item.checked ? 160 : 30, item.checked ? 165 : 35)
      const label = doc.splitTextToSize(item.name || 'Item', (PAGE_W / 2) - MARGIN - 10)
      doc.text(label, x + 5, y)

      col = col === 0 ? 1 : 0
      if (col === 0) y += label.length > 1 ? label.length * 4.5 + 1 : 6
    }

    if (col === 1) y += 6  // close last row
    y += 4
  }

  // Summary
  y = checkPageBreak(doc, y, 16)
  doc.setDrawColor(...MUTED)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 5
  const total = Object.values(shoppingList).flat().length
  const checked = Object.values(shoppingList).flat().filter((i) => i.checked).length
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  doc.text(`${checked} of ${total} items checked`, MARGIN, y)

  addFooter(doc)
  doc.save(`fittrack-shopping-list-${new Date().toISOString().slice(0, 10)}.pdf`)
}

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

/**
 * Generate a meal plan PDF as a Blob (for sharing).
 */
export function getMealPlanPDFBlob(mealPlan, name = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const subtitle = `${name ? name + ' · ' : ''}${new Date().toLocaleDateString()}`
  let y = addHeader(doc, 'Weekly Meal Plan', subtitle)
  // (same generation logic — reuse by calling the helper inline)
  for (const day of DAYS) {
    const dayMeals = mealPlan?.[day] || {}
    const hasFood = SLOTS.some((s) => (dayMeals[s] || []).length > 0)
    y = checkPageBreak(doc, y, 20)
    y = addSectionTitle(doc, day, y)
    if (!hasFood) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...MUTED)
      doc.text('No meals planned', MARGIN + 6, y); y += 7; continue
    }
    for (const slot of SLOTS) {
      const foods = dayMeals[slot] || []
      if (!foods.length) continue
      y = checkPageBreak(doc, y, 8)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED)
      doc.text(SLOT_LABELS[slot], MARGIN + 6, y); y += 5
      for (const food of foods) {
        y = checkPageBreak(doc, y, 6)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 35)
        const nameText = doc.splitTextToSize(`• ${food.name || 'Unnamed'}`, COL_W - 40)
        doc.text(nameText, MARGIN + 8, y)
        const macros = [food.calories ? `${Math.round(food.calories)} kcal` : '', food.protein ? `${food.protein}g P` : ''].filter(Boolean).join(' · ')
        if (macros) { doc.setFontSize(7); doc.setTextColor(...MUTED); doc.text(macros, PAGE_W - MARGIN, y, { align: 'right' }) }
        y += nameText.length > 1 ? nameText.length * 4.5 : 5
      }
      y += 2
    }
    y += 4
  }
  addFooter(doc)
  return doc.output('blob')
}

/**
 * Generate a shopping list PDF as a Blob (for sharing).
 */
export function getShoppingListPDFBlob(shoppingList, name = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const subtitle = `${name ? name + ' · ' : ''}${new Date().toLocaleDateString()}`
  let y = addHeader(doc, 'Shopping List', subtitle)
  const categories = Object.keys(shoppingList || {})
  for (const category of categories) {
    const items = shoppingList[category] || []
    if (!items.length) continue
    y = checkPageBreak(doc, y, 20)
    y = addSectionTitle(doc, category, y)
    const colA = MARGIN + 6; const colB = PAGE_W / 2 + 4; let col = 0
    for (const item of items) {
      if (col === 0) y = checkPageBreak(doc, y, 6)
      const x = col === 0 ? colA : colB
      doc.setDrawColor(...MUTED); doc.setLineWidth(0.3); doc.rect(x, y - 3.5, 3.5, 3.5)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 35)
      const label = doc.splitTextToSize(item.name || 'Item', (PAGE_W / 2) - MARGIN - 10)
      doc.text(label, x + 5, y)
      col = col === 0 ? 1 : 0
      if (col === 0) y += label.length > 1 ? label.length * 4.5 + 1 : 6
    }
    if (col === 1) y += 6; y += 4
  }
  addFooter(doc)
  return doc.output('blob')
}
