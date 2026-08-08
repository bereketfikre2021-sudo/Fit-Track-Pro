/**
 * Built-in meal plan presets — weight gain and weight loss.
 * Each food item carries name_en + name_am for bilingual display.
 * Use localizedName(food) from localizedField.js to render the right language.
 */

// ─── Weight Gain ─────────────────────────────────────────────────────────────
const WEIGHT_GAIN_DAYS = {
  Monday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', name_en: 'Genfo (1 bowl)', name_am: 'ገንፎ (1 ጎድጓዳ)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Eggs (2 large, boiled)', name_en: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ., የተቀቀለ)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', name_en: 'Milk, whole (1 cup)', name_am: 'ወተት, ሙሉ ስብ (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', name_en: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Groundnuts / peanuts (1/4 cup)', name_en: 'Groundnuts / peanuts (1/4 cup)', name_am: 'ኦቾሎኒ (1/4 ኩባያ)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_en: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Doro Wat (chicken stew, 1 piece + sauce)', name_en: 'Doro Wat (chicken stew, 1 piece + sauce)', name_am: 'ዶሮ ወጥ (1 ቁ. + ወጥ)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Misir Wat (red lentil stew, 1 cup)', name_en: 'Misir Wat (red lentil stew, 1 cup)', name_am: 'ምስር ወጥ (1 ኩባያ)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', name_en: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', name_en: 'White rice (cooked, 1 cup)', name_am: 'ነጭ ሩዝ (የተቀቀለ, 1 ኩባያ)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Tibs (beef sauteed, 150g)', name_en: 'Tibs (beef sauteed, 150g)', name_am: 'ጥብስ (150 ግ.)', calories: 320, protein: 30, carbs: 4, fat: 20 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', name_en: 'Gomen (collard greens, cooked, 1 cup)', name_am: 'ጎመን (የተቀቀለ, 1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', name_en: 'Ergo (Ethiopian yogurt, 1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', name_en: 'Honey (1 tbsp)', name_am: 'ማር (1 ማንኪያ)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
  Tuesday: {
    breakfast: [
      { name: 'Ambasha (1 slice)', name_en: 'Ambasha (1 slice)', name_am: 'አምባሻ (1 ቁራጭ)', calories: 210, protein: 6, carbs: 40, fat: 3 },
      { name: 'Egg (1 large)', name_en: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Ayib (Ethiopian cheese, 50g)', name_en: 'Ayib (Ethiopian cheese, 50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Avocado juice (1 glass)', name_en: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    morningSnack: [
      { name: 'Mango (1 cup, sliced)', name_en: 'Mango (1 cup, sliced)', name_am: 'ማንጎ (1 ኩባያ)', calories: 99, protein: 1, carbs: 25, fat: 1 },
      { name: 'Peanut butter (2 tbsp)', name_en: 'Peanut butter (2 tbsp)', name_am: 'የኦቾሎኒ ቅቤ (2 ማንኪያ)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_en: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Shiro Wat (1 cup)', name_en: 'Shiro Wat (1 cup)', name_am: 'ሽሮ ወጥ (1 ኩባያ)', calories: 210, protein: 12, carbs: 28, fat: 6 },
      { name: 'Tibs (beef sauteed, 150g)', name_en: 'Tibs (beef sauteed, 150g)', name_am: 'ጥብስ (150 ግ.)', calories: 320, protein: 30, carbs: 4, fat: 20 },
    ],
    afternoonSnack: [
      { name: 'Chechebsa (1 serving)', name_en: 'Chechebsa (1 serving)', name_am: 'ጨጨብሳ (1 ድርሻ)', calories: 380, protein: 8, carbs: 48, fat: 18 },
    ],
    dinner: [
      { name: 'Pasta (cooked, 1 cup)', name_en: 'Pasta (cooked, 1 cup)', name_am: 'ፓስታ (የተቀቀለ, 1 ኩባያ)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', name_en: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (የተጠበሰ, 100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_en: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [
      { name: 'Milk, whole (1 cup)', name_en: 'Milk, whole (1 cup)', name_am: 'ወተት, ሙሉ ስብ (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
      { name: 'Peanut butter (2 tbsp)', name_en: 'Peanut butter (2 tbsp)', name_am: 'የኦቾሎኒ ቅቤ (2 ማንኪያ)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
  },
  Wednesday: {
    breakfast: [
      { name: 'Teff flour (1 cup)', name_en: 'Teff flour (1 cup)', name_am: 'የጤፍ ዱቄት (1 ኩባያ)', calories: 450, protein: 16, carbs: 88, fat: 5 },
      { name: 'Eggs (2 large, boiled)', name_en: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ., የተቀቀለ)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Butter / Niter kibbeh (1 tbsp)', name_en: 'Butter / Niter kibbeh (1 tbsp)', name_am: 'ቅቤ / ንጥር ቅቤ (1 ማንኪያ)', calories: 102, protein: 0, carbs: 0, fat: 12 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', name_en: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Groundnuts / peanuts (1/4 cup)', name_en: 'Groundnuts / peanuts (1/4 cup)', name_am: 'ኦቾሎኒ (1/4 ኩባያ)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_en: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Kitfo (100g)', name_en: 'Kitfo (100g)', name_am: 'ክትፎ (100 ግ.)', calories: 250, protein: 22, carbs: 0, fat: 18 },
      { name: 'Ayib (Ethiopian cheese, 50g)', name_en: 'Ayib (Ethiopian cheese, 50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', name_en: 'Gomen (collard greens, cooked, 1 cup)', name_am: 'ጎመን (የተቀቀለ, 1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', name_en: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', name_en: 'White rice (cooked, 1 cup)', name_am: 'ነጭ ሩዝ (የተቀቀለ, 1 ኩባያ)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Beef (lean, grilled, 100g)', name_en: 'Beef (lean, grilled, 100g)', name_am: 'የበሬ ሥጋ (ቀጭን, የተጠበሰ, 100 ግ.)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Chickpeas (cooked, 1 cup)', name_en: 'Chickpeas (cooked, 1 cup)', name_am: 'ሽምብራ (የተቀቀለ, 1 ኩባያ)', calories: 269, protein: 15, carbs: 45, fat: 4 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', name_en: 'Ergo (Ethiopian yogurt, 1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Banana (1 medium)', name_en: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
    ],
  },
  Thursday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', name_en: 'Genfo (1 bowl)', name_am: 'ገንፎ (1 ጎድጓዳ)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Egg (1 large)', name_en: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Milk, whole (1 cup)', name_en: 'Milk, whole (1 cup)', name_am: 'ወተት, ሙሉ ስብ (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Sambusa (1 piece)', name_en: 'Sambusa (1 piece)', name_am: 'ሳምቡሳ (1 ቁ.)', calories: 200, protein: 7, carbs: 22, fat: 10 },
      { name: 'Mango (1 cup, sliced)', name_en: 'Mango (1 cup, sliced)', name_am: 'ማንጎ (1 ኩባያ)', calories: 99, protein: 1, carbs: 25, fat: 1 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_en: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Ater Kik (yellow split pea, 1 cup)', name_en: 'Ater Kik (yellow split pea, 1 cup)', name_am: 'አተር ክክ (1 ኩባያ)', calories: 220, protein: 14, carbs: 34, fat: 3 },
      { name: 'Chicken breast (grilled, 100g)', name_en: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (የተጠበሰ, 100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Dabo kolo (1/4 cup)', name_en: 'Dabo kolo (1/4 cup)', name_am: 'ዳቦ ቆሎ (1/4 ኩባያ)', calories: 160, protein: 4, carbs: 28, fat: 4 },
      { name: 'Avocado (1/2 medium)', name_en: 'Avocado (1/2 medium)', name_am: 'አቮካዶ (1/2 ቁ.)', calories: 120, protein: 1, carbs: 6, fat: 11 },
    ],
    dinner: [
      { name: 'Macaroni (cooked, 1 cup)', name_en: 'Macaroni (cooked, 1 cup)', name_am: 'ማካሮኒ (የተቀቀለ, 1 ኩባያ)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Ground beef (cooked, 100g)', name_en: 'Ground beef (cooked, 100g)', name_am: 'የበሬ ስጋ (የተፈጨ, 100 ግ.)', calories: 254, protein: 26, carbs: 0, fat: 16 },
      { name: 'Fosolia (green beans, cooked, 1 cup)', name_en: 'Fosolia (green beans, cooked, 1 cup)', name_am: 'ፎሶሊያ (የተቀቀለ, 1 ኩባያ)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', name_en: 'Ergo (Ethiopian yogurt, 1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', name_en: 'Honey (1 tbsp)', name_am: 'ማር (1 ማንኪያ)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
  Friday: {
    breakfast: [
      { name: 'Firfir (1 cup)', name_en: 'Firfir (1 cup)', name_am: 'ፍርፍር (1 ኩባያ)', calories: 260, protein: 8, carbs: 42, fat: 7 },
      { name: 'Eggs (2 large, boiled)', name_en: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ., የተቀቀለ)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', name_en: 'Milk, whole (1 cup)', name_am: 'ወተት, ሙሉ ስብ (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Banana (1 medium)', name_en: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: 'Peanut butter (2 tbsp)', name_en: 'Peanut butter (2 tbsp)', name_am: 'የኦቾሎኒ ቅቤ (2 ማንኪያ)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_en: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Asa (Nile tilapia, grilled, 100g)', name_en: 'Asa (Nile tilapia, grilled, 100g)', name_am: 'ዓሣ (100 ግ., የተጠበሰ)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Misir Wat (red lentil stew, 1 cup)', name_en: 'Misir Wat (red lentil stew, 1 cup)', name_am: 'ምስር ወጥ (1 ኩባያ)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', name_en: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', name_en: 'White rice (cooked, 1 cup)', name_am: 'ነጭ ሩዝ (የተቀቀለ, 1 ኩባያ)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Doro Wat (chicken stew, 1 piece + sauce)', name_en: 'Doro Wat (chicken stew, 1 piece + sauce)', name_am: 'ዶሮ ወጥ (1 ቁ. + ወጥ)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_en: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [
      { name: 'Milk, whole (1 cup)', name_en: 'Milk, whole (1 cup)', name_am: 'ወተት, ሙሉ ስብ (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
      { name: 'Groundnuts / peanuts (1/4 cup)', name_en: 'Groundnuts / peanuts (1/4 cup)', name_am: 'ኦቾሎኒ (1/4 ኩባያ)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
  },
  Saturday: {
    breakfast: [
      { name: 'Ambasha (1 slice)', name_en: 'Ambasha (1 slice)', name_am: 'አምባሻ (1 ቁራጭ)', calories: 210, protein: 6, carbs: 40, fat: 3 },
      { name: 'Eggs (2 large, boiled)', name_en: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ., የተቀቀለ)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Ayib (Ethiopian cheese, 50g)', name_en: 'Ayib (Ethiopian cheese, 50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Fresh juice (mixed, 1 glass)', name_en: 'Fresh juice (mixed, 1 glass)', name_am: 'ትኩስ ጁስ (የተቀላቀለ, 1 ብርጭቆ)', calories: 130, protein: 1, carbs: 30, fat: 1 },
    ],
    morningSnack: [
      { name: 'Guava (1 cup)', name_en: 'Guava (1 cup)', name_am: 'ዘይቱን / ዛፍ ፍሬ (1 ኩባያ)', calories: 112, protein: 4, carbs: 24, fat: 2 },
      { name: 'Groundnuts / peanuts (1/4 cup)', name_en: 'Groundnuts / peanuts (1/4 cup)', name_am: 'ኦቾሎኒ (1/4 ኩባያ)', calories: 207, protein: 9, carbs: 6, fat: 18 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_en: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Lamb (cooked, 100g)', name_en: 'Lamb (cooked, 100g)', name_am: 'የበግ ሥጋ (የተቀቀለ, 100 ግ.)', calories: 258, protein: 25, carbs: 0, fat: 17 },
      { name: 'Shiro Wat (1 cup)', name_en: 'Shiro Wat (1 cup)', name_am: 'ሽሮ ወጥ (1 ኩባያ)', calories: 210, protein: 12, carbs: 28, fat: 6 },
    ],
    afternoonSnack: [
      { name: 'Chechebsa (1 serving)', name_en: 'Chechebsa (1 serving)', name_am: 'ጨጨብሳ (1 ድርሻ)', calories: 380, protein: 8, carbs: 48, fat: 18 },
    ],
    dinner: [
      { name: 'Pasta (cooked, 1 cup)', name_en: 'Pasta (cooked, 1 cup)', name_am: 'ፓስታ (የተቀቀለ, 1 ኩባያ)', calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: 'Beef (lean, grilled, 100g)', name_en: 'Beef (lean, grilled, 100g)', name_am: 'የበሬ ሥጋ (ቀጭን, የተጠበሰ, 100 ግ.)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Spinach (cooked, 1 cup)', name_en: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (የተቀቀለ, 1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
      { name: 'Butter / Niter kibbeh (1 tbsp)', name_en: 'Butter / Niter kibbeh (1 tbsp)', name_am: 'ቅቤ / ንጥር ቅቤ (1 ማንኪያ)', calories: 102, protein: 0, carbs: 0, fat: 12 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', name_en: 'Ergo (Ethiopian yogurt, 1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Banana (1 medium)', name_en: 'Banana (1 medium)', name_am: 'ሙዝ (1 መካከለኛ)', calories: 105, protein: 1, carbs: 27, fat: 0 },
    ],
  },
  Sunday: {
    breakfast: [
      { name: 'Genfo (1 bowl)', name_en: 'Genfo (1 bowl)', name_am: 'ገንፎ (1 ጎድጓዳ)', calories: 320, protein: 10, carbs: 60, fat: 8 },
      { name: 'Eggs (2 large, boiled)', name_en: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ., የተቀቀለ)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Milk, whole (1 cup)', name_en: 'Milk, whole (1 cup)', name_am: 'ወተት, ሙሉ ስብ (1 ኩባያ)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    ],
    morningSnack: [
      { name: 'Papaya (1 cup, cubed)', name_en: 'Papaya (1 cup, cubed)', name_am: 'ፓፓያ (1 ኩባያ)', calories: 62, protein: 1, carbs: 16, fat: 0 },
      { name: 'Peanut butter (2 tbsp)', name_en: 'Peanut butter (2 tbsp)', name_am: 'የኦቾሎኒ ቅቤ (2 ማንኪያ)', calories: 190, protein: 8, carbs: 7, fat: 16 },
    ],
    lunch: [
      { name: 'Injera (2 pieces)', name_en: 'Injera (2 pieces)', name_am: 'እንጀራ (2 ቁ.)', calories: 248, protein: 8, carbs: 50, fat: 2 },
      { name: 'Kitfo (100g)', name_en: 'Kitfo (100g)', name_am: 'ክትፎ (100 ግ.)', calories: 250, protein: 22, carbs: 0, fat: 18 },
      { name: 'Ayib (Ethiopian cheese, 50g)', name_en: 'Ayib (Ethiopian cheese, 50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', name_en: 'Gomen (collard greens, cooked, 1 cup)', name_am: 'ጎመን (የተቀቀለ, 1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Avocado juice (1 glass)', name_en: 'Avocado juice (1 glass)', name_am: 'አቮካዶ ጁስ (1 ብርጭቆ)', calories: 280, protein: 3, carbs: 20, fat: 20 },
    ],
    dinner: [
      { name: 'White rice (cooked, 1 cup)', name_en: 'White rice (cooked, 1 cup)', name_am: 'ነጭ ሩዝ (የተቀቀለ, 1 ኩባያ)', calories: 242, protein: 4, carbs: 53, fat: 0 },
      { name: 'Tibs (beef sauteed, 150g)', name_en: 'Tibs (beef sauteed, 150g)', name_am: 'ጥብስ (150 ግ.)', calories: 320, protein: 30, carbs: 4, fat: 20 },
      { name: 'Misir Wat (red lentil stew, 1 cup)', name_en: 'Misir Wat (red lentil stew, 1 cup)', name_am: 'ምስር ወጥ (1 ኩባያ)', calories: 230, protein: 16, carbs: 35, fat: 4 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', name_en: 'Ergo (Ethiopian yogurt, 1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
      { name: 'Honey (1 tbsp)', name_en: 'Honey (1 tbsp)', name_am: 'ማር (1 ማንኪያ)', calories: 64, protein: 0, carbs: 17, fat: 0 },
    ],
  },
}

// ─── Weight Loss ──────────────────────────────────────────────────────────────
const WEIGHT_LOSS_DAYS = {
  Monday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', name_en: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ., የተቀቀለ)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', name_en: 'Gomen (collard greens, cooked, 1 cup)', name_am: 'ጎመን (የተቀቀለ, 1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Tomato (1 medium)', name_en: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [
      { name: 'Apple (1 medium)', name_en: 'Apple (1 medium)', name_am: 'ፖም (1 ቁ.)', calories: 95, protein: 0, carbs: 25, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', name_en: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', name_en: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (የተጠበሰ, 100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Misir Wat (red lentil stew, 1 cup)', name_en: 'Misir Wat (red lentil stew, 1 cup)', name_am: 'ምስር ወጥ (1 ኩባያ)', calories: 230, protein: 16, carbs: 35, fat: 4 },
      { name: 'Spinach (cooked, 1 cup)', name_en: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (የተቀቀለ, 1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    afternoonSnack: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', name_en: 'Ergo (Ethiopian yogurt, 1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
    ],
    dinner: [
      { name: 'Asa (Nile tilapia, grilled, 100g)', name_en: 'Asa (Nile tilapia, grilled, 100g)', name_am: 'ዓሣ (100 ግ., የተጠበሰ)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_en: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', name_en: 'Beetroot (cooked, 1 cup)', name_am: 'ቀይ ሥር (የተቀቀለ, 1 ኩባያ)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [
      { name: 'Water (1 glass)', name_en: 'Water (1 glass)', name_am: 'ውሃ (1 ብርጭቆ)', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ],
  },
  Tuesday: {
    breakfast: [
      { name: 'Egg (1 large)', name_en: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Ayib (Ethiopian cheese, 50g)', name_en: 'Ayib (Ethiopian cheese, 50g)', name_am: 'አይብ (50 ግ.)', calories: 90, protein: 8, carbs: 1, fat: 6 },
      { name: 'Tomato (1 medium)', name_en: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
      { name: 'Carrot (1 medium)', name_en: 'Carrot (1 medium)', name_am: 'ካሮት (1 ቁ.)', calories: 25, protein: 1, carbs: 6, fat: 0 },
    ],
    morningSnack: [
      { name: 'Orange (1 medium)', name_en: 'Orange (1 medium)', name_am: 'ብርቱካን (1 ቁ.)', calories: 62, protein: 1, carbs: 15, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', name_en: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Shiro Wat (1 cup)', name_en: 'Shiro Wat (1 cup)', name_am: 'ሽሮ ወጥ (1 ኩባያ)', calories: 210, protein: 12, carbs: 28, fat: 6 },
      { name: 'Fosolia (green beans, cooked, 1 cup)', name_en: 'Fosolia (green beans, cooked, 1 cup)', name_am: 'ፎሶሊያ (የተቀቀለ, 1 ኩባያ)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    afternoonSnack: [
      { name: 'Watermelon (1 cup)', name_en: 'Watermelon (1 cup)', name_am: 'ሐብሐብ (1 ኩባያ)', calories: 46, protein: 1, carbs: 11, fat: 0 },
    ],
    dinner: [
      { name: 'Goat (cooked, 100g)', name_en: 'Goat (cooked, 100g)', name_am: 'የፍየል ሥጋ (100 ግ.)', calories: 143, protein: 27, carbs: 0, fat: 3 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', name_en: 'Gomen (collard greens, cooked, 1 cup)', name_am: 'ጎመን (የተቀቀለ, 1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Potato (boiled, 1 medium)', name_en: 'Potato (boiled, 1 medium)', name_am: 'ድንች (የተቀቀለ, 1 ቁ.)', calories: 130, protein: 3, carbs: 30, fat: 0 },
    ],
    beforeBed: [
      { name: 'Milk, low-fat (1 cup)', name_en: 'Milk, low-fat (1 cup)', name_am: 'ወተት, ቀጭን (1 ኩባያ)', calories: 102, protein: 8, carbs: 12, fat: 2 },
    ],
  },
  Wednesday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', name_en: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ., የተቀቀለ)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Spinach (cooked, 1 cup)', name_en: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (የተቀቀለ, 1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
      { name: 'Tomato (1 medium)', name_en: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [
      { name: 'Apple (1 medium)', name_en: 'Apple (1 medium)', name_am: 'ፖም (1 ቁ.)', calories: 95, protein: 0, carbs: 25, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', name_en: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Asa (Nile tilapia, grilled, 100g)', name_en: 'Asa (Nile tilapia, grilled, 100g)', name_am: 'ዓሣ (100 ግ., የተጠበሰ)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Ater Kik (yellow split pea, 1 cup)', name_en: 'Ater Kik (yellow split pea, 1 cup)', name_am: 'አተር ክክ (1 ኩባያ)', calories: 220, protein: 14, carbs: 34, fat: 3 },
    ],
    afternoonSnack: [
      { name: 'Yogurt, plain (1 cup)', name_en: 'Yogurt, plain (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 149, protein: 9, carbs: 11, fat: 8 },
    ],
    dinner: [
      { name: 'Chicken breast (grilled, 100g)', name_en: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (የተጠበሰ, 100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Beetroot (cooked, 1 cup)', name_en: 'Beetroot (cooked, 1 cup)', name_am: 'ቀይ ሥር (የተቀቀለ, 1 ኩባያ)', calories: 75, protein: 3, carbs: 17, fat: 0 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_en: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
    ],
    beforeBed: [
      { name: 'Water (1 glass)', name_en: 'Water (1 glass)', name_am: 'ውሃ (1 ብርጭቆ)', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ],
  },
  Thursday: {
    breakfast: [
      { name: 'Fava beans (ful, 1 cup)', name_en: 'Fava beans (ful, 1 cup)', name_am: 'ፉል (1 ኩባያ)', calories: 187, protein: 13, carbs: 33, fat: 1 },
      { name: 'Tomato (1 medium)', name_en: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
      { name: 'Onion (1 medium)', name_en: 'Onion (1 medium)', name_am: 'ቀይ ሽንኩርት (1 ቁ.)', calories: 44, protein: 1, carbs: 10, fat: 0 },
    ],
    morningSnack: [
      { name: 'Papaya (1 cup, cubed)', name_en: 'Papaya (1 cup, cubed)', name_am: 'ፓፓያ (1 ኩባያ)', calories: 62, protein: 1, carbs: 16, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', name_en: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Doro Wat (chicken stew, 1 piece + sauce)', name_en: 'Doro Wat (chicken stew, 1 piece + sauce)', name_am: 'ዶሮ ወጥ (1 ቁ. + ወጥ)', calories: 310, protein: 28, carbs: 8, fat: 18 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', name_en: 'Gomen (collard greens, cooked, 1 cup)', name_am: 'ጎመን (የተቀቀለ, 1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
    ],
    afternoonSnack: [
      { name: 'Tuna (canned in water, 100g)', name_en: 'Tuna (canned in water, 100g)', name_am: 'ቱና (100 ግ.)', calories: 116, protein: 26, carbs: 0, fat: 1 },
      { name: 'Carrot (1 medium)', name_en: 'Carrot (1 medium)', name_am: 'ካሮት (1 ቁ.)', calories: 25, protein: 1, carbs: 6, fat: 0 },
    ],
    dinner: [
      { name: 'Beef (lean, grilled, 100g)', name_en: 'Beef (lean, grilled, 100g)', name_am: 'የበሬ ሥጋ (ቀጭን, የተጠበሰ, 100 ግ.)', calories: 215, protein: 26, carbs: 0, fat: 12 },
      { name: 'Sweet potato (boiled, 1 medium)', name_en: 'Sweet potato (boiled, 1 medium)', name_am: 'ስኳር ድንች (የተቀቀለ, 1 ቁ.)', calories: 130, protein: 2, carbs: 30, fat: 0 },
      { name: 'Spinach (cooked, 1 cup)', name_en: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (የተቀቀለ, 1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    beforeBed: [
      { name: 'Milk, low-fat (1 cup)', name_en: 'Milk, low-fat (1 cup)', name_am: 'ወተት, ቀጭን (1 ኩባያ)', calories: 102, protein: 8, carbs: 12, fat: 2 },
    ],
  },
  Friday: {
    breakfast: [
      { name: 'Egg (1 large)', name_en: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Messer (green lentils, cooked, 1 cup)', name_en: 'Messer (green lentils, cooked, 1 cup)', name_am: 'ምሥር (አረንጓዴ፣ 1 ኩባያ)', calories: 230, protein: 18, carbs: 40, fat: 1 },
    ],
    morningSnack: [
      { name: 'Orange (1 medium)', name_en: 'Orange (1 medium)', name_am: 'ብርቱካን (1 ቁ.)', calories: 62, protein: 1, carbs: 15, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', name_en: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Asa (Nile tilapia, grilled, 100g)', name_en: 'Asa (Nile tilapia, grilled, 100g)', name_am: 'ዓሣ (100 ግ., የተጠበሰ)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Fosolia (green beans, cooked, 1 cup)', name_en: 'Fosolia (green beans, cooked, 1 cup)', name_am: 'ፎሶሊያ (የተቀቀለ, 1 ኩባያ)', calories: 44, protein: 2, carbs: 10, fat: 0 },
    ],
    afternoonSnack: [
      { name: 'Watermelon (1 cup)', name_en: 'Watermelon (1 cup)', name_am: 'ሐብሐብ (1 ኩባያ)', calories: 46, protein: 1, carbs: 11, fat: 0 },
    ],
    dinner: [
      { name: 'Chicken breast (grilled, 100g)', name_en: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (የተጠበሰ, 100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_en: 'Tikel Gomen (cabbage & carrot, 1 cup)', name_am: 'ጥቅል ጎመን (1 ኩባያ)', calories: 80, protein: 2, carbs: 16, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', name_en: 'Beetroot (cooked, 1 cup)', name_am: 'ቀይ ሥር (የተቀቀለ, 1 ኩባያ)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [
      { name: 'Ergo (Ethiopian yogurt, 1 cup)', name_en: 'Ergo (Ethiopian yogurt, 1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 145, protein: 9, carbs: 11, fat: 8 },
    ],
  },
  Saturday: {
    breakfast: [
      { name: 'Eggs (2 large, boiled)', name_en: 'Eggs (2 large, boiled)', name_am: 'እንቁላል (2 ቁ., የተቀቀለ)', calories: 155, protein: 13, carbs: 1, fat: 11 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', name_en: 'Gomen (collard greens, cooked, 1 cup)', name_am: 'ጎመን (የተቀቀለ, 1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Tomato (1 medium)', name_en: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [
      { name: 'Guava (1 cup)', name_en: 'Guava (1 cup)', name_am: 'ዘይቱን / ዛፍ ፍሬ (1 ኩባያ)', calories: 112, protein: 4, carbs: 24, fat: 2 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', name_en: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Goat (cooked, 100g)', name_en: 'Goat (cooked, 100g)', name_am: 'የፍየል ሥጋ (100 ግ.)', calories: 143, protein: 27, carbs: 0, fat: 3 },
      { name: 'Shiro Wat (1 cup)', name_en: 'Shiro Wat (1 cup)', name_am: 'ሽሮ ወጥ (1 ኩባያ)', calories: 210, protein: 12, carbs: 28, fat: 6 },
    ],
    afternoonSnack: [
      { name: 'Yogurt, plain (1 cup)', name_en: 'Yogurt, plain (1 cup)', name_am: 'እርጎ (1 ኩባያ)', calories: 149, protein: 9, carbs: 11, fat: 8 },
    ],
    dinner: [
      { name: 'Tuna (canned in water, 100g)', name_en: 'Tuna (canned in water, 100g)', name_am: 'ቱና (100 ግ.)', calories: 116, protein: 26, carbs: 0, fat: 1 },
      { name: 'Sweet potato (boiled, 1 medium)', name_en: 'Sweet potato (boiled, 1 medium)', name_am: 'ስኳር ድንች (የተቀቀለ, 1 ቁ.)', calories: 130, protein: 2, carbs: 30, fat: 0 },
      { name: 'Spinach (cooked, 1 cup)', name_en: 'Spinach (cooked, 1 cup)', name_am: 'ስፒናች (የተቀቀለ, 1 ኩባያ)', calories: 41, protein: 5, carbs: 7, fat: 0 },
    ],
    beforeBed: [
      { name: 'Water (1 glass)', name_en: 'Water (1 glass)', name_am: 'ውሃ (1 ብርጭቆ)', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ],
  },
  Sunday: {
    breakfast: [
      { name: 'Fava beans (ful, 1 cup)', name_en: 'Fava beans (ful, 1 cup)', name_am: 'ፉል (1 ኩባያ)', calories: 187, protein: 13, carbs: 33, fat: 1 },
      { name: 'Egg (1 large)', name_en: 'Egg (1 large)', name_am: 'እንቁላል (1 ቁ.)', calories: 78, protein: 6, carbs: 1, fat: 5 },
      { name: 'Tomato (1 medium)', name_en: 'Tomato (1 medium)', name_am: 'ቲማቲም (1 ቁ.)', calories: 22, protein: 1, carbs: 5, fat: 0 },
    ],
    morningSnack: [
      { name: 'Apple (1 medium)', name_en: 'Apple (1 medium)', name_am: 'ፖም (1 ቁ.)', calories: 95, protein: 0, carbs: 25, fat: 0 },
    ],
    lunch: [
      { name: 'Injera (1 piece)', name_en: 'Injera (1 piece)', name_am: 'እንጀራ (1 ቁ.)', calories: 124, protein: 4, carbs: 25, fat: 1 },
      { name: 'Chicken breast (grilled, 100g)', name_en: 'Chicken breast (grilled, 100g)', name_am: 'የዶሮ ደረት (የተጠበሰ, 100 ግ.)', calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: 'Ater Kik (yellow split pea, 1 cup)', name_en: 'Ater Kik (yellow split pea, 1 cup)', name_am: 'አተር ክክ (1 ኩባያ)', calories: 220, protein: 14, carbs: 34, fat: 3 },
    ],
    afternoonSnack: [
      { name: 'Watermelon (1 cup)', name_en: 'Watermelon (1 cup)', name_am: 'ሐብሐብ (1 ኩባያ)', calories: 46, protein: 1, carbs: 11, fat: 0 },
    ],
    dinner: [
      { name: 'Asa (Nile tilapia, grilled, 100g)', name_en: 'Asa (Nile tilapia, grilled, 100g)', name_am: 'ዓሣ (100 ግ., የተጠበሰ)', calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: 'Gomen (collard greens, cooked, 1 cup)', name_en: 'Gomen (collard greens, cooked, 1 cup)', name_am: 'ጎመን (የተቀቀለ, 1 ኩባያ)', calories: 63, protein: 5, carbs: 11, fat: 1 },
      { name: 'Beetroot (cooked, 1 cup)', name_en: 'Beetroot (cooked, 1 cup)', name_am: 'ቀይ ሥር (የተቀቀለ, 1 ኩባያ)', calories: 75, protein: 3, carbs: 17, fat: 0 },
    ],
    beforeBed: [
      { name: 'Milk, low-fat (1 cup)', name_en: 'Milk, low-fat (1 cup)', name_am: 'ወተት, ቀጭን (1 ኩባያ)', calories: 102, protein: 8, carbs: 12, fat: 2 },
    ],
  },
}

// ─── Stamp IDs ────────────────────────────────────────────────────────────────
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

// ─── Preset metadata ──────────────────────────────────────────────────────────
export const PRESET_MEAL_PLANS = [
  {
    id: 'weight-gain',
    name: 'Weight Gain Plan',
    name_am: 'የክብደት መጨመር እቅድ',
    description: 'High-calorie (~3 200 kcal/day), protein-rich Ethiopian meals designed to support muscle building and healthy weight gain.',
    description_am: 'ከፍተኛ ካሎሪ (~3,200 ኪ.ካ./ቀን) — ጡንቻ ለመገንባት እና ጤናማ ክብደት ለመጨመር የተዘጋጁ የኢትዮጵያ ምግቦች።',
    tags: ['Weight Gain', 'High Protein', '~3 200 kcal'],
    tags_am: ['ክብደት መጨመር', 'ከፍተኛ ፕሮቲን', '~3,200 ኪ.ካ.'],
    targetGoals: ['muscle', 'strength'],
    targetBmiCategories: ['underweight'],
    days: WEIGHT_GAIN_DAYS,
  },
  {
    id: 'weight-loss',
    name: 'Weight Loss Plan',
    name_am: 'የክብደት መቀነስ እቅድ',
    description: 'Calorie-controlled (~1 700 kcal/day), high-protein Ethiopian meals designed to support fat loss while preserving muscle.',
    description_am: 'ቁጥጥር የተደረገበት ካሎሪ (~1,700 ኪ.ካ./ቀን) — ስብ ለመቀነስ ጡንቻ እያቆዩ የሚረዱ የኢትዮጵያ ምግቦች።',
    tags: ['Weight Loss', 'High Protein', '~1 700 kcal'],
    tags_am: ['ክብደት መቀነስ', 'ከፍተኛ ፕሮቲን', '~1,700 ኪ.ካ.'],
    targetGoals: ['fat'],
    targetBmiCategories: ['overweight', 'obese'],
    days: WEIGHT_LOSS_DAYS,
  },
]

export function buildPresetMealPlanDays(preset) {
  return stampIds(preset.days)
}

export function getRelevantMealPlans(bmiCategory, profileGoal) {
  if (bmiCategory === 'underweight') {
    return PRESET_MEAL_PLANS.filter((p) => p.targetGoals.includes('muscle') || p.targetGoals.includes('strength'))
  }
  if (bmiCategory === 'overweight' || bmiCategory === 'obese') {
    return PRESET_MEAL_PLANS.filter((p) => p.targetGoals.includes('fat'))
  }
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

/**
 * Return the localized name/description/tags for a preset based on locale.
 * Falls back to English if Amharic fields are missing.
 */
export function localizedPreset(preset, locale) {
  if (locale === 'am') {
    return {
      name: preset.name_am || preset.name,
      description: preset.description_am || preset.description,
      tags: preset.tags_am || preset.tags,
    }
  }
  return { name: preset.name, description: preset.description, tags: preset.tags }
}
