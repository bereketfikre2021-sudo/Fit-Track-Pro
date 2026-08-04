/**
 * Built-in meal plan presets — one for weight gain, one for weight loss.
 * Foods are drawn from the Ethiopian foods database (ethiopianFoods.js).
 * Each day has the 6 standard slots: breakfast, morningSnack, lunch,
 * afternoonSnack, dinner, beforeBed.
 */

// ─── Weight Gain (Muscle / Bulk) ────────────────────────────────────────────
// Target ~3000–3400 kcal/day, high protein (≥160 g), high carbs, moderate fat.

const WEIGHT_GAIN_DAYS = {
  Monday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Eggs (2 large, boiled)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Groundnuts / peanuts (1/4 cup)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Doro Wat (chicken stew, 1 piece + sauce)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Misir Wat (red lentil stew, 1 cup)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Tibs (beef sauteed, 150g)', calories: 320, protein: 30, carbs: 4, fat: 20 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
  Tuesday: {
    breakfast: [
      { name: 'Ambasha (1 slice)', calories: 210, protein: 6, carbs: 40, fat: 3 },
      { name: 'Egg (1 large)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Ayib (Ethiopian cheese, 50g)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Avocado juice (1 glass)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    morningSnack: [
      { name: 'Mango (1 cup, sliced)', calories: 99, protein: 1, carbs: 25, fat: 1 },
      { name: 'Peanut butter (2 tbsp)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Shiro Wat (1 cup)', calories: 210, protein: 12, carbs: 28, fat: 6 },
      { name: 'Tibs (beef sauteed, 150g)', calories: 320, protein: 30, carbs: 4, fat: 20 },
    ],
    afternoonSnack: [
      { name: 'Chechebsa (1 serving)', calories: 380, protein: 8, carbs: 48, fat: 18 },
    ],
    dinner: [
      { name: 'Pasta (cooked, 1 cup)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [
      { name: 'Milk, whole (1 cup)', calories: 149, protein: 8, carbs: 12, fat: 8 },
      { name: 'Peanut butter (2 tbsp)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
  },
  Wednesday: {
    breakfast: [
      { name: 'Teff flour (1 cup)', calories: 450, protein: 16, carbs: 88, fat: 5 },
      { name: 'Eggs (2 large, boiled)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Butter / Niter kibbeh (1 tbsp)', calories: 102, protein: 0, carbs: 0, fat: 12 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Groundnuts / peanuts (1/4 cup)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Kitfo (100g)', calories: 250, protein: 22, carbs: 0, fat: 18 },
      { name: 'Ayib (Ethiopian cheese, 50g)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Beef (lean, grilled, 100g)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Chickpeas (cooked, 1 cup)', calories: 269, protein: 15, carbs: 45, fat: 4 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
    ],
  },
  Thursday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Egg (1 large)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Milk, whole (1 cup)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Sambusa (1 piece)', calories: 200, protein: 7, carbs: 22, fat: 10 },
      { name: 'Mango (1 cup, sliced)', calories: 99, protein: 1, carbs: 25, fat: 1 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Ater Kik (yellow split pea, 1 cup)', calories: 220, protein: 14, carbs: 34, fat: 3 },
      { name: 'Chicken breast (grilled, 100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Dabo kolo (1/4 cup)', calories: 160, protein: 4, carbs: 28, fat: 4 },
      { name: 'Avocado (1/2 medium)', calories: 120, protein: 1, carbs: 6, fat: 11 },
    ],
    dinner: [
      { name: 'Macaroni (cooked, 1 cup)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Ground beef (cooked, 100g)', calories: 254, protein: 26, carbs: 0, fat: 16 },
      { name: 'Fosolia (green beans, cooked, 1 cup)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
  Friday: {
    breakfast: [
      { name: 'Firfir (1 cup)', calories: 260, protein: 8, carbs: 42, fat: 7 },
      { name: 'Eggs (2 large, boiled)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Peanut butter (2 tbsp)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Asa (Nile tilapia, grilled, 100g)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Misir Wat (red lentil stew, 1 cup)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Doro Wat (chicken stew, 1 piece + sauce)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [
      { name: 'Milk, whole (1 cup)', calories: 149, protein: 8, carbs: 12, fat: 8 },
      { name: 'Groundnuts / peanuts (1/4 cup)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
  },
  Saturday: {
    breakfast: [
      { name: 'Ambasha (1 slice)', calories: 210, protein: 6, carbs: 40, fat: 3 },
      { name: 'Eggs (2 large, boiled)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Ayib (Ethiopian cheese, 50g)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Fresh juice (mixed, 1 glass)', calories: 130, protein: 1, carbs: 30, fat: 1 },
    ],
    morningSnack: [
      { name: 'Guava (1 cup)', calories: 112, protein: 4, carbs: 24, fat: 2 },
      { name: 'Groundnuts / peanuts (1/4 cup)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Lamb (cooked, 100g)', calories: 258, protein: 25, carbs: 0, fat: 17 },
      { name: 'Shiro Wat (1 cup)', calories: 210, protein: 12, carbs: 28, fat: 6 },
    ],
    afternoonSnack: [
      { name: 'Chechebsa (1 serving)', calories: 380, protein: 8, carbs: 48, fat: 18 },
    ],
    dinner: [
      { name: 'Pasta (cooked, 1 cup)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Beef (lean, grilled, 100g)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Spinach (cooked, 1 cup)', calories: 41, protein: 5, carbs: 7, fat: 0 },
      { name: 'Butter / Niter kibbeh (1 tbsp)', calories: 102, protein: 0, carbs: 0, fat: 12 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
    ],
  },
  Sunday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Eggs (2 large, boiled)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Papaya (1 cup, cubed)', calories: 62, protein: 1, carbs: 16, fat: 0 },
      { name: 'Peanut butter (2 tbsp)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Kitfo (100g)', calories: 250, protein: 22, carbs: 0, fat: 18 },
      { name: 'Ayib (Ethiopian cheese, 50g)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Tibs (beef sauteed, 150g)', calories: 320, protein: 30, carbs: 4, fat: 20 },
      { name: 'Misir Wat (red lentil stew, 1 cup)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
}

// ─── Weight Loss (Fat Burn / Cut) ────────────────────────────────────────────
// Target ~1600–1900 kcal/day, high protein (≥120 g), low-to-moderate carbs, low fat.

const WEIGHT_LOSS_DAYS = {
  Monday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Tomato (1 medium)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [
      { name: 'Apple (1 medium)', calories: 95, protein: 0, carbs: 25, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Misir Wat (red lentil stew, 1 cup)', calories: 230, protein: 16, carbs: 35, fat: 4 },
      { name: 'Spinach (cooked, 1 cup)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    afternoonSnack: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', calories: 145, protein: 9, carbs: 11, fat: 8 },
    ],
    dinner: [
      { name: 'Asa (Nile tilapia, grilled, 100g)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', calories: 80, protein: 2, carbs: 16, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [
      { name: 'Water (1 glass)', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ],
  },
  Tuesday: {
    breakfast: [
      { name: 'Egg (1 large)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Ayib (Ethiopian cheese, 50g)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Tomato (1 medium)', calories: 22, protein: 1, carbs: 5, fat: 0 },
      { name: 'Carrot (1 medium)', calories: 25, protein: 1, carbs: 6, fat: 0 },
    ],
    morningSnack: [
      { name: 'Orange (1 medium)', calories: 62, protein: 1, carbs: 15, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Shiro Wat (1 cup)', calories: 210, protein: 12, carbs: 28, fat: 6 },
      { name: 'Fosolia (green beans, cooked, 1 cup)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    afternoonSnack: [
      { name: 'Watermelon (1 cup)', calories: 46, protein: 1, carbs: 11, fat: 0 },
    ],
    dinner: [
      { name: 'Goat (cooked, 100g)', calories: 143, protein: 27, carbs: 0, fat: 3 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Potato (boiled, 1 medium)', calories: 130, protein: 3, carbs: 30, fat: 0 },
    ],
    beforeBed: [
      { name: 'Milk, low-fat (1 cup)', calories: 102, protein: 8, carbs: 12, fat: 2 },
    ],
  },
  Wednesday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Spinach (cooked, 1 cup)', calories: 41, protein: 5, carbs: 7, fat: 0 },
      { name: 'Tomato (1 medium)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [
      { name: 'Apple (1 medium)', calories: 95, protein: 0, carbs: 25, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Asa (Nile tilapia, grilled, 100g)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Ater Kik (yellow split pea, 1 cup)', calories: 220, protein: 14, carbs: 34, fat: 3 },
    ],
    afternoonSnack: [
      { name: 'Yogurt, plain (1 cup)', calories: 149, protein: 9, carbs: 11, fat: 8 },
    ],
    dinner: [
      { name: 'Chicken breast (grilled, 100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Beetroot (cooked, 1 cup)', calories: 75, protein: 3, carbs: 17, fat: 0 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [
      { name: 'Water (1 glass)', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ],
  },
  Thursday: {
    breakfast: [
      { name: 'Fava beans (ful, 1 cup)', calories: 187, protein: 13, carbs: 33, fat: 1 },
      { name: 'Tomato (1 medium)', calories: 22, protein: 1, carbs: 5, fat: 0 },
      { name: 'Onion (1 medium)', calories: 44, protein: 1, carbs: 10, fat: 0 },
    ],
    morningSnack: [
      { name: 'Papaya (1 cup, cubed)', calories: 62, protein: 1, carbs: 16, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Doro Wat (chicken stew, 1 piece + sauce)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Tuna (canned in water, 100g)', calories: 116, protein: 26, carbs: 0, fat: 1 },
      { name: 'Carrot (1 medium)', calories: 25, protein: 1, carbs: 6, fat: 0 },
    ],
    dinner: [
      { name: 'Beef (lean, grilled, 100g)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Sweet potato (boiled, 1 medium)', calories: 130, protein: 2, carbs: 30, fat: 0 },
      { name: 'Spinach (cooked, 1 cup)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    beforeBed: [
      { name: 'Milk, low-fat (1 cup)', calories: 102, protein: 8, carbs: 12, fat: 2 },
    ],
  },
  Friday: {
    breakfast: [
      { name: 'Egg (1 large)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Messer (green lentils, cooked, 1 cup)', calories: 230, protein: 18, carbs: 40, fat: 1 },
    ],
    morningSnack: [
      { name: 'Orange (1 medium)', calories: 62, protein: 1, carbs: 15, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Asa (Nile tilapia, grilled, 100g)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Fosolia (green beans, cooked, 1 cup)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    afternoonSnack: [
      { name: 'Watermelon (1 cup)', calories: 46, protein: 1, carbs: 11, fat: 0 },
    ],
    dinner: [
      { name: 'Chicken breast (grilled, 100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', calories: 80, protein: 2, carbs: 16, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', calories: 145, protein: 9, carbs: 11, fat: 8 },
    ],
  },
  Saturday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Tomato (1 medium)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [
      { name: 'Guava (1 cup)', calories: 112, protein: 4, carbs: 24, fat: 2 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Goat (cooked, 100g)', calories: 143, protein: 27, carbs: 0, fat: 3 },
      { name: 'Shiro Wat (1 cup)', calories: 210, protein: 12, carbs: 28, fat: 6 },
    ],
    afternoonSnack: [
      { name: 'Yogurt, plain (1 cup)', calories: 149, protein: 9, carbs: 11, fat: 8 },
    ],
    dinner: [
      { name: 'Tuna (canned in water, 100g)', calories: 116, protein: 26, carbs: 0, fat: 1 },
      { name: 'Sweet potato (boiled, 1 medium)', calories: 130, protein: 2, carbs: 30, fat: 0 },
      { name: 'Spinach (cooked, 1 cup)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    beforeBed: [
      { name: 'Water (1 glass)', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ],
  },
  Sunday: {
    breakfast: [
      { name: 'Fava beans (ful, 1 cup)', calories: 187, protein: 13, carbs: 33, fat: 1 },
      { name: 'Egg (1 large)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Tomato (1 medium)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [
      { name: 'Apple (1 medium)', calories: 95, protein: 0, carbs: 25, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Ater Kik (yellow split pea, 1 cup)', calories: 220, protein: 14, carbs: 34, fat: 3 },
    ],
    afternoonSnack: [
      { name: 'Watermelon (1 cup)', calories: 46, protein: 1, carbs: 11, fat: 0 },
    ],
    dinner: [
      { name: 'Asa (Nile tilapia, grilled, 100g)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [
      { name: 'Milk, low-fat (1 cup)', calories: 102, protein: 8, carbs: 12, fat: 2 },
    ],
  },
}


// ─── Helper: stamp IDs onto every food item ──────────────────────────────────
function stampIds(days, baseTime = Date.now()) {
  let counter = 0
  const result = {}
  for (const [day, slots] of Object.entries(days)) {
    result[day] = {}
    for (const [slot, foods] of Object.entries(slots)) {
      result[day][slot] = foods.map((f) => ({
        ...f,
        id: `preset-${baseTime}-${counter++}`,
        createdAt: baseTime,
      }))
    }
  }
  return result
}

/**
 * The two built-in meal plan presets.
 * `goal` values mirror `resolveEffectiveTrainingGoal` outputs:
 *   'muscle' → weight gain plan is the target
 *   'fat'    → weight loss plan is the target
 *   underweight → weight gain
 *   overweight/obese → weight loss
 */
export const PRESET_MEAL_PLANS = [
  {
    id: 'weight-gain',
    name: 'Weight Gain Plan',
    description:
      'High-calorie (~3 200 kcal/day), protein-rich Ethiopian meals designed to support muscle building and healthy weight gain.',
    tags: ['Weight Gain', 'High Protein', '~3 200 kcal'],
    targetGoals: ['muscle', 'strength'], // profile goals this plan suits
    targetBmiCategories: ['underweight'],  // BMI categories that make this the "recommended" plan
    days: WEIGHT_GAIN_DAYS,
  },
  {
    id: 'weight-loss',
    name: 'Weight Loss Plan',
    description:
      'Calorie-controlled (~1 700 kcal/day), high-protein Ethiopian meals designed to support fat loss while preserving muscle.',
    tags: ['Weight Loss', 'High Protein', '~1 700 kcal'],
    targetGoals: ['fat'],
    targetBmiCategories: ['overweight', 'obese'],
    days: WEIGHT_LOSS_DAYS,
  },
]

/**
 * Return a fresh copy of a preset's days with newly-generated IDs.
 * Safe to call multiple times — each call gets unique IDs.
 */
export function buildPresetMealPlanDays(preset) {
  return stampIds(preset.days)
}

/**
 * Detect which preset is recommended for the user based on their
 * BMI category and/or profile goal.
 *
 * @param {string|null} bmiCategory  'underweight'|'normal'|'overweight'|'obese'|null
 * @param {string|null} profileGoal  'muscle'|'fat'|'strength'|'endurance'|null
 * @returns {string|null}  preset id ('weight-gain' | 'weight-loss' | null)
 */
/**
 * Return only the meal plan presets relevant for this user.
 */
export function getRelevantMealPlans(bmiCategory, profileGoal) {
  if (bmiCategory === 'underweight') {
    return PRESET_MEAL_PLANS.filter((p) => p.targetGoals.includes('muscle') || p.targetGoals.includes('strength'))
  }
  if (bmiCategory === 'overweight' || bmiCategory === 'obese') {
    return PRESET_MEAL_PLANS.filter((p) => p.targetGoals.includes('fat'))
  }
  // Normal BMI — filter by goal
  if (profileGoal === 'fat' || profileGoal === 'endurance') {
    return PRESET_MEAL_PLANS.filter((p) => p.targetGoals.includes('fat'))
  }
  return PRESET_MEAL_PLANS.filter((p) => !p.targetGoals.includes('fat'))
}

export function getRecommendedMealPlanId(bmiCategory, profileGoal) {
  for (const plan of PRESET_MEAL_PLANS) {
    if (bmiCategory && plan.targetBmiCategories.includes(bmiCategory)) return plan.id
  }
  for (const plan of PRESET_MEAL_PLANS) {
    if (profileGoal && plan.targetGoals.includes(profileGoal)) return plan.id
  }
  return null
}
