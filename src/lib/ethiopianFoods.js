/**
 * Local nutrition database — common Ethiopian foods with approximate macros.
 * All values are per typical serving size listed.
 * Sources: Ethiopian Food Composition Table (EHNRI), USDA FoodData Central,
 * and common recipe estimates. Values are rounded for practical use.
 *
 * Fields: name, serving, calories, protein (g), carbs (g), fat (g), category
 */

export const ETHIOPIAN_FOODS = [
  // ── Staples & Breads ─────────────────────────────────────────────────────
  { name: 'Injera (1 piece)', serving: '100g', calories: 124, protein: 4, carbs: 25, fat: 1, category: 'Staples' },
  { name: 'Injera (2 pieces)', serving: '200g', calories: 248, protein: 8, carbs: 50, fat: 2, category: 'Staples' },
  { name: 'Teff flour (1 cup)', serving: '130g', calories: 450, protein: 16, carbs: 88, fat: 5, category: 'Staples' },
  { name: 'White rice (cooked, 1 cup)', serving: '186g', calories: 242, protein: 4, carbs: 53, fat: 0, category: 'Staples' },
  { name: 'Bread, white (2 slices)', serving: '60g', calories: 160, protein: 5, carbs: 30, fat: 2, category: 'Staples' },
  { name: 'Ambasha (1 slice)', serving: '80g', calories: 210, protein: 6, carbs: 40, fat: 3, category: 'Staples' },
  { name: 'Genfo (1 bowl)', serving: '250g', calories: 320, protein: 10, carbs: 60, fat: 8, category: 'Staples' },
  { name: 'Kocho (1 piece)', serving: '100g', calories: 195, protein: 2, carbs: 46, fat: 1, category: 'Staples' },
  { name: 'Pasta (cooked, 1 cup)', serving: '140g', calories: 220, protein: 8, carbs: 43, fat: 1, category: 'Staples' },
  { name: 'Macaroni (cooked, 1 cup)', serving: '140g', calories: 220, protein: 8, carbs: 43, fat: 1, category: 'Staples' },

  // ── Legumes & Pulses ──────────────────────────────────────────────────────
  { name: 'Misir Wat (red lentil stew, 1 cup)', serving: '240ml', calories: 230, protein: 16, carbs: 35, fat: 4, category: 'Legumes' },
  { name: 'Shiro Wat (1 cup)', serving: '240ml', calories: 210, protein: 12, carbs: 28, fat: 6, category: 'Legumes' },
  { name: 'Ater Kik (yellow split pea, 1 cup)', serving: '240ml', calories: 220, protein: 14, carbs: 34, fat: 3, category: 'Legumes' },
  { name: 'Messer (green lentils, cooked, 1 cup)', serving: '200g', calories: 230, protein: 18, carbs: 40, fat: 1, category: 'Legumes' },
  { name: 'Chickpeas (cooked, 1 cup)', serving: '164g', calories: 269, protein: 15, carbs: 45, fat: 4, category: 'Legumes' },
  { name: 'Fava beans (ful, 1 cup)', serving: '170g', calories: 187, protein: 13, carbs: 33, fat: 1, category: 'Legumes' },
  { name: 'Black-eyed peas (cooked, 1 cup)', serving: '165g', calories: 198, protein: 13, carbs: 36, fat: 1, category: 'Legumes' },
  { name: 'Shiro powder (2 tbsp)', serving: '20g', calories: 70, protein: 5, carbs: 9, fat: 2, category: 'Legumes' },

  // ── Meat & Poultry ────────────────────────────────────────────────────────
  { name: 'Doro Wat (chicken stew, 1 piece + sauce)', serving: '200g', calories: 310, protein: 28, carbs: 8, fat: 18, category: 'Meat' },
  { name: 'Chicken breast (grilled, 100g)', serving: '100g', calories: 165, protein: 31, carbs: 0, fat: 4, category: 'Meat' },
  { name: 'Chicken thigh (cooked, 100g)', serving: '100g', calories: 209, protein: 26, carbs: 0, fat: 11, category: 'Meat' },
  { name: 'Beef (lean, grilled, 100g)', serving: '100g', calories: 215, protein: 26, carbs: 0, fat: 12, category: 'Meat' },
  { name: 'Kitfo (100g)', serving: '100g', calories: 250, protein: 22, carbs: 0, fat: 18, category: 'Meat' },
  { name: 'Tibs (beef sauteed, 150g)', serving: '150g', calories: 320, protein: 30, carbs: 4, fat: 20, category: 'Meat' },
  { name: 'Lamb (cooked, 100g)', serving: '100g', calories: 258, protein: 25, carbs: 0, fat: 17, category: 'Meat' },
  { name: 'Goat (cooked, 100g)', serving: '100g', calories: 143, protein: 27, carbs: 0, fat: 3, category: 'Meat' },
  { name: 'Dulet (tripe, 100g)', serving: '100g', calories: 180, protein: 20, carbs: 2, fat: 10, category: 'Meat' },
  { name: 'Ground beef (cooked, 100g)', serving: '100g', calories: 254, protein: 26, carbs: 0, fat: 16, category: 'Meat' },

  // ── Fish ──────────────────────────────────────────────────────────────────
  { name: 'Asa (Nile tilapia, grilled, 100g)', serving: '100g', calories: 128, protein: 26, carbs: 0, fat: 3, category: 'Fish' },
  { name: 'Tuna (canned in water, 100g)', serving: '100g', calories: 116, protein: 26, carbs: 0, fat: 1, category: 'Fish' },
  { name: 'Sardines (canned, 100g)', serving: '100g', calories: 208, protein: 25, carbs: 0, fat: 11, category: 'Fish' },

  // ── Eggs & Dairy ──────────────────────────────────────────────────────────
  { name: 'Eggs (2 large, boiled)', serving: '100g', calories: 155, protein: 13, carbs: 1, fat: 11, category: 'Dairy & Eggs' },
  { name: 'Egg (1 large)', serving: '50g', calories: 78, protein: 6, carbs: 1, fat: 5, category: 'Dairy & Eggs' },
  { name: 'Ayib (Ethiopian cheese, 50g)', serving: '50g', calories: 90, protein: 8, carbs: 1, fat: 6, category: 'Dairy & Eggs' },
  { name: 'Milk, whole (1 cup)', serving: '244ml', calories: 149, protein: 8, carbs: 12, fat: 8, category: 'Dairy & Eggs' },
  { name: 'Milk, low-fat (1 cup)', serving: '244ml', calories: 102, protein: 8, carbs: 12, fat: 2, category: 'Dairy & Eggs' },
  { name: 'Yogurt, plain (1 cup)', serving: '245g', calories: 149, protein: 9, carbs: 11, fat: 8, category: 'Dairy & Eggs' },
  { name: 'Ergo (Ethiopian yogurt, 1 cup)', serving: '245g', calories: 145, protein: 9, carbs: 11, fat: 8, category: 'Dairy & Eggs' },
  { name: 'Butter / Niter kibbeh (1 tbsp)', serving: '14g', calories: 102, protein: 0, carbs: 0, fat: 12, category: 'Dairy & Eggs' },

  // ── Vegetables ────────────────────────────────────────────────────────────
  { name: 'Gomen (collard greens, cooked, 1 cup)', serving: '190g', calories: 63, protein: 5, carbs: 11, fat: 1, category: 'Vegetables' },
  { name: 'Fosolia (green beans, cooked, 1 cup)', serving: '125g', calories: 44, protein: 2, carbs: 10, fat: 0, category: 'Vegetables' },
  { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', serving: '200g', calories: 80, protein: 2, carbs: 16, fat: 1, category: 'Vegetables' },
  { name: 'Potato (boiled, 1 medium)', serving: '150g', calories: 130, protein: 3, carbs: 30, fat: 0, category: 'Vegetables' },
  { name: 'Sweet potato (boiled, 1 medium)', serving: '150g', calories: 130, protein: 2, carbs: 30, fat: 0, category: 'Vegetables' },
  { name: 'Tomato (1 medium)', serving: '120g', calories: 22, protein: 1, carbs: 5, fat: 0, category: 'Vegetables' },
  { name: 'Onion (1 medium)', serving: '110g', calories: 44, protein: 1, carbs: 10, fat: 0, category: 'Vegetables' },
  { name: 'Carrot (1 medium)', serving: '61g', calories: 25, protein: 1, carbs: 6, fat: 0, category: 'Vegetables' },
  { name: 'Spinach (cooked, 1 cup)', serving: '180g', calories: 41, protein: 5, carbs: 7, fat: 0, category: 'Vegetables' },
  { name: 'Beetroot (cooked, 1 cup)', serving: '170g', calories: 75, protein: 3, carbs: 17, fat: 0, category: 'Vegetables' },
  { name: 'Avocado (1/2 medium)', serving: '75g', calories: 120, protein: 1, carbs: 6, fat: 11, category: 'Vegetables' },

  // ── Fruits ────────────────────────────────────────────────────────────────
  { name: 'Banana (1 medium)', serving: '118g', calories: 105, protein: 1, carbs: 27, fat: 0, category: 'Fruits' },
  { name: 'Mango (1 cup, sliced)', serving: '165g', calories: 99, protein: 1, carbs: 25, fat: 1, category: 'Fruits' },
  { name: 'Papaya (1 cup, cubed)', serving: '145g', calories: 62, protein: 1, carbs: 16, fat: 0, category: 'Fruits' },
  { name: 'Orange (1 medium)', serving: '131g', calories: 62, protein: 1, carbs: 15, fat: 0, category: 'Fruits' },
  { name: 'Apple (1 medium)', serving: '182g', calories: 95, protein: 0, carbs: 25, fat: 0, category: 'Fruits' },
  { name: 'Guava (1 cup)', serving: '165g', calories: 112, protein: 4, carbs: 24, fat: 2, category: 'Fruits' },
  { name: 'Watermelon (1 cup)', serving: '154g', calories: 46, protein: 1, carbs: 11, fat: 0, category: 'Fruits' },
  { name: 'Avocado juice (1 glass)', serving: '300ml', calories: 280, protein: 3, carbs: 20, fat: 20, category: 'Fruits' },

  // ── Nuts & Seeds ──────────────────────────────────────────────────────────
  { name: 'Groundnuts / peanuts (1/4 cup)', serving: '36g', calories: 207, protein: 9, carbs: 6, fat: 18, category: 'Nuts & Seeds' },
  { name: 'Sunflower seeds (1/4 cup)', serving: '35g', calories: 204, protein: 7, carbs: 7, fat: 18, category: 'Nuts & Seeds' },
  { name: 'Sesame seeds (2 tbsp)', serving: '18g', calories: 103, protein: 3, carbs: 4, fat: 9, category: 'Nuts & Seeds' },
  { name: 'Peanut butter (2 tbsp)', serving: '32g', calories: 190, protein: 8, carbs: 7, fat: 16, category: 'Nuts & Seeds' },

  // ── Beverages ─────────────────────────────────────────────────────────────
  { name: 'Ethiopian coffee (macchiato)', serving: '100ml', calories: 30, protein: 1, carbs: 4, fat: 1, category: 'Beverages' },
  { name: 'Tej (honey wine, 1 glass)', serving: '200ml', calories: 140, protein: 0, carbs: 20, fat: 0, category: 'Beverages' },
  { name: 'Tella (local beer, 1 glass)', serving: '300ml', calories: 120, protein: 1, carbs: 15, fat: 0, category: 'Beverages' },
  { name: 'Fresh juice (mixed, 1 glass)', serving: '250ml', calories: 130, protein: 1, carbs: 30, fat: 1, category: 'Beverages' },
  { name: 'Water (1 glass)', serving: '250ml', calories: 0, protein: 0, carbs: 0, fat: 0, category: 'Beverages' },

  // ── Snacks & Other ────────────────────────────────────────────────────────
  { name: 'Dabo kolo (1/4 cup)', serving: '40g', calories: 160, protein: 4, carbs: 28, fat: 4, category: 'Snacks' },
  { name: 'Chechebsa (1 serving)', serving: '150g', calories: 380, protein: 8, carbs: 48, fat: 18, category: 'Snacks' },
  { name: 'Firfir (1 cup)', serving: '200g', calories: 260, protein: 8, carbs: 42, fat: 7, category: 'Snacks' },
  { name: 'Sambusa (1 piece)', serving: '80g', calories: 200, protein: 7, carbs: 22, fat: 10, category: 'Snacks' },
  { name: 'Honey (1 tbsp)', serving: '21g', calories: 64, protein: 0, carbs: 17, fat: 0, category: 'Snacks' },
  { name: 'Sugar (1 tsp)', serving: '4g', calories: 16, protein: 0, carbs: 4, fat: 0, category: 'Snacks' },
  { name: 'Vegetable oil (1 tbsp)', serving: '14g', calories: 124, protein: 0, carbs: 0, fat: 14, category: 'Snacks' },
]

/**
 * Search the food database.
 * Returns items whose name or category contains the query (case-insensitive).
 */
export function searchFoods(query) {
  if (!query || !query.trim()) return []
  const q = query.trim().toLowerCase()
  return ETHIOPIAN_FOODS.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
  ).slice(0, 8)
}
