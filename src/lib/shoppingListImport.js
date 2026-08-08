export const SHOPPING_LIST_VERSION = 1

export const DEFAULT_SHOPPING_CATEGORIES = [
  'Protein Sources',
  'Carb Sources',
  'Healthy Fats',
  'Fruits & Vegetables',
  'Other',
]

const METADATA_KEYS = new Set(['version', 'description', 'exportedAt', 'items'])

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function getShoppingListTemplate() {
  const template = {}
  DEFAULT_SHOPPING_CATEGORIES.forEach((c) => {
    template[c] = []
  })
  template['Protein Sources'] = [
    { name: 'Eggs', checked: false },
    { name: 'Chicken', checked: false },
  ]

  return {
    version: SHOPPING_LIST_VERSION,
    description: 'FitTrack Pro shopping list import template.',
    shoppingList: template,
  }
}

export function downloadShoppingListTemplate() {
  downloadJsonFile(getShoppingListTemplate(), 'fittrack-shopping-list-template.json')
}

export function buildShoppingListExportPayload(state) {
  const shoppingList = canonicalizeShoppingListCategories(state?.shoppingList || {})
  return {
    version: SHOPPING_LIST_VERSION,
    exportedAt: new Date().toISOString(),
    description: 'FitTrack Pro shopping list export.',
    shoppingList,
  }
}

export function downloadShoppingListExport(state) {
  const payload = buildShoppingListExportPayload(state)
  const date = new Date().toISOString().slice(0, 10)
  downloadJsonFile(payload, `fittrack-shopping-list-${date}.json`)
  return payload
}

function normalizeItem(raw, baseTime, idx) {
  if (typeof raw === 'string') {
    const name = raw.trim()
    if (!name) return null
    const createdAt = baseTime + idx
    return {
      id: `import-shop-${createdAt}-${idx}`,
      name,
      checked: false,
      createdAt,
    }
  }

  const name = String(raw?.name || raw?.name_en || '').trim()
  if (!name) return null
  const checked = Boolean(raw?.checked)
  const createdAt = typeof raw?.createdAt === 'number' ? raw.createdAt : baseTime + idx
  const id = raw?.id ? String(raw.id) : `import-shop-${createdAt}-${idx}`
  const item = {
    id,
    name,
    checked,
    createdAt,
    ...(typeof raw?.updatedAt === 'number' ? { updatedAt: raw.updatedAt } : {}),
  }
  // Preserve bilingual fields from AI-generated content
  if (raw?.name_en) item.name_en = String(raw.name_en).trim()
  if (raw?.name_am) item.name_am = String(raw.name_am).trim()
  // Preserve image URL
  if (raw?.imageUrl) item.imageUrl = String(raw.imageUrl)
  if (raw?.image_url) item.imageUrl = String(raw.image_url)
  return item
}

function normalizeCategoryItems(items, baseTime, startIndex) {
  const list = Array.isArray(items) ? items : []
  let counter = startIndex
  return list
    .map((it) => {
      const out = normalizeItem(it, baseTime, counter)
      counter += 1
      return out
    })
    .filter(Boolean)
}

/** Fold legacy Fruits / Vegetables buckets into Fruits & Vegetables. */
export function canonicalizeShoppingListCategories(raw) {
  const source = raw && typeof raw === 'object' ? { ...raw } : {}
  const canonical = {}

  DEFAULT_SHOPPING_CATEGORIES.forEach((cat) => {
    canonical[cat] = Array.isArray(source[cat]) ? [...source[cat]] : []
  })

  const legacyProduce = [
    ...(Array.isArray(source.Fruits) ? source.Fruits : []),
    ...(Array.isArray(source.Vegetables) ? source.Vegetables : []),
  ]
  if (legacyProduce.length) {
    canonical['Fruits & Vegetables'] = [
      ...canonical['Fruits & Vegetables'],
      ...legacyProduce,
    ]
  }

  Object.entries(source).forEach(([category, items]) => {
    if (
      DEFAULT_SHOPPING_CATEGORIES.includes(category) ||
      category === 'Fruits' ||
      category === 'Vegetables' ||
      METADATA_KEYS.has(category)
    ) {
      return
    }
    if (!Array.isArray(items) || items.length === 0) return
    canonical.Other = [...canonical.Other, ...items]
  })

  return canonical
}

function extractShoppingListRaw(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid file: expected a JSON object')
  }

  if (Array.isArray(parsed.items)) {
    const grouped = {}
    parsed.items.forEach((item) => {
      const category =
        typeof item?.category === 'string' && item.category.trim()
          ? item.category.trim()
          : 'Other'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    })
    return grouped
  }

  if (parsed.shoppingList && typeof parsed.shoppingList === 'object') {
    return parsed.shoppingList
  }

  const hasCategoryArrays = Object.entries(parsed).some(
    ([key, value]) =>
      !METADATA_KEYS.has(key) && Array.isArray(value) && typeof key === 'string'
  )
  if (hasCategoryArrays) return parsed

  throw new Error('No shopping list categories found in file')
}

export function normalizeShoppingListImportPayload(parsed) {
  const raw = extractShoppingListRaw(parsed)
  const baseTime = Date.now()
  let counter = 0
  const normalized = {}

  Object.entries(raw || {}).forEach(([category, items]) => {
    if (!category || typeof category !== 'string' || METADATA_KEYS.has(category)) return
    const normalizedItems = normalizeCategoryItems(items, baseTime, counter)
    counter += normalizedItems.length
    if (normalizedItems.length > 0) {
      normalized[category] = normalizedItems
    }
  })

  if (Object.keys(normalized).length === 0) {
    throw new Error('No shopping list items found in file')
  }

  return canonicalizeShoppingListCategories(normalized)
}

export function applyShoppingListImport(state, parsed, { replace = true } = {}) {
  const imported = normalizeShoppingListImportPayload(parsed)
  const existing = canonicalizeShoppingListCategories(state?.shoppingList || {})
  const shoppingList = {}

  DEFAULT_SHOPPING_CATEGORIES.forEach((cat) => {
    const importedItems = imported[cat] || []
    const existingItems = existing[cat] || []
    shoppingList[cat] = replace
      ? [...importedItems]
      : [...existingItems, ...importedItems]
  })

  const itemsImported = DEFAULT_SHOPPING_CATEGORIES.reduce(
    (sum, cat) => sum + (imported[cat]?.length || 0),
    0
  )

  return {
    shoppingList,
    summary: {
      categoriesImported: DEFAULT_SHOPPING_CATEGORIES.filter(
        (cat) => (imported[cat] || []).length > 0
      ).length,
      itemsImported,
      replace,
    },
  }
}
