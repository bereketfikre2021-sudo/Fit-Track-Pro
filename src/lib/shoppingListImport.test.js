import { describe, it, expect } from 'vitest'
import {
  applyShoppingListImport,
  getShoppingListTemplate,
  normalizeShoppingListImportPayload,
} from './shoppingListImport'

describe('shoppingListImport', () => {
  it('imports wrapped template payload', () => {
    const template = getShoppingListTemplate()
    const result = normalizeShoppingListImportPayload(template)
    expect(result['Protein Sources']).toHaveLength(2)
    expect(result['Protein Sources'][0].name).toBe('Eggs')
    expect(result['Protein Sources'][0].id).toBeTruthy()
  })

  it('imports string items and legacy produce categories', () => {
    const result = normalizeShoppingListImportPayload({
      shoppingList: {
        'Protein Sources': ['Eggs'],
        Fruits: [{ name: 'Banana', checked: false }],
        Vegetables: ['Tomato'],
      },
    })
    expect(result['Protein Sources'][0].name).toBe('Eggs')
    expect(result['Fruits & Vegetables']).toHaveLength(2)
  })

  it('imports flat category arrays without shoppingList wrapper', () => {
    const result = normalizeShoppingListImportPayload({
      'Protein Sources': [{ name: 'Chicken', checked: false }],
    })
    expect(result['Protein Sources'][0].name).toBe('Chicken')
  })

  it('imports items array with categories', () => {
    const result = normalizeShoppingListImportPayload({
      items: [
        { name: 'Rice', category: 'Carb Sources' },
        { name: 'Oil', category: 'Healthy Fats' },
      ],
    })
    expect(result['Carb Sources'][0].name).toBe('Rice')
    expect(result['Healthy Fats'][0].name).toBe('Oil')
  })

  it('applyShoppingListImport maps items into canonical UI categories', () => {
    const state = {
      shoppingList: {
        'Protein Sources': [],
        'Carb Sources': [],
        'Healthy Fats': [],
        Fruits: [],
        Vegetables: [],
        Other: [],
      },
    }
    const result = applyShoppingListImport(state, getShoppingListTemplate(), { replace: true })
    expect(result.shoppingList['Protein Sources']).toHaveLength(2)
    expect(result.shoppingList['Fruits & Vegetables']).toEqual([])
    expect(result.summary.itemsImported).toBe(2)
  })
})
