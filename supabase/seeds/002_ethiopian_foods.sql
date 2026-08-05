-- ============================================================
--  Seed: Ethiopian Foods (global — user_id = NULL)
-- ============================================================

-- First insert into foods table, then link to ethiopian_foods

-- ── Insert base food nutrition data ───────────────────────────────────────────
insert into public.foods
  (id, user_id, name, name_am, source, serving_size, serving_unit,
   calories, protein_g, carbs_g, fat_g, fiber_g, is_verified, is_featured, tags)
values
  -- Injera-based dishes
  ('ef000001-0000-0000-0000-000000000001', null, 'Injera', 'እንጀራ', 'ethiopian', 100, 'g', 174, 5.7, 36.5, 0.8, 3.2, true, true, array['grain','fermented','staple']),
  ('ef000001-0000-0000-0000-000000000002', null, 'Doro Wat', 'ዶሮ ወጥ', 'ethiopian', 200, 'g', 320, 28.0, 12.0, 18.0, 2.0, true, true, array['chicken','stew','protein']),
  ('ef000001-0000-0000-0000-000000000003', null, 'Tibs (Beef)', 'ጥብስ', 'ethiopian', 150, 'g', 285, 26.0, 6.0, 17.0, 1.0, true, true, array['beef','fried','protein']),
  ('ef000001-0000-0000-0000-000000000004', null, 'Misir Wat', 'ምስር ወጥ', 'ethiopian', 200, 'g', 180, 9.5, 28.0, 4.5, 8.0, true, true, array['lentils','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000005', null, 'Shiro Wat', 'ሽሮ ወጥ', 'ethiopian', 200, 'g', 165, 8.5, 22.0, 5.0, 6.0, true, true, array['chickpea','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000006', null, 'Gomen (Collard Greens)', 'ጎመን', 'ethiopian', 150, 'g', 65, 4.0, 8.0, 2.5, 3.5, true, false, array['vegetable','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000007', null, 'Ayib (Ethiopian Cheese)', 'አይብ', 'ethiopian', 100, 'g', 170, 12.0, 4.0, 12.0, 0.0, true, false, array['dairy','protein']),
  ('ef000001-0000-0000-0000-000000000008', null, 'Kitfo (Ethiopian Tartare)', 'ክትፎ', 'ethiopian', 150, 'g', 310, 28.0, 3.0, 21.0, 0.0, true, true, array['beef','raw','protein']),
  ('ef000001-0000-0000-0000-000000000009', null, 'Ful (Fava Beans)', 'ፉል', 'ethiopian', 200, 'g', 190, 13.0, 29.0, 3.5, 9.0, true, false, array['beans','vegan','breakfast','fasting']),
  ('ef000001-0000-0000-0000-000000000010', null, 'Chechebsa', 'ጨጨብሳ', 'ethiopian', 150, 'g', 340, 8.0, 45.0, 15.0, 2.0, true, false, array['bread','breakfast']),
  ('ef000001-0000-0000-0000-000000000011', null, 'Tikel Gomen (Cabbage)', 'ጥቅል ጎመን', 'ethiopian', 150, 'g', 70, 3.0, 10.0, 2.0, 3.0, true, false, array['vegetable','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000012', null, 'Kik Alicha (Split Peas)', 'ክክ አልጫ', 'ethiopian', 200, 'g', 160, 9.0, 26.0, 3.0, 7.0, true, false, array['peas','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000013', null, 'Tej (Honey Wine)', 'ጠጅ', 'ethiopian', 200, 'ml', 145, 0.5, 18.0, 0.0, 0.0, true, false, array['beverage','alcohol']),
  ('ef000001-0000-0000-0000-000000000014', null, 'Buna (Ethiopian Coffee)', 'ቡና', 'ethiopian', 150, 'ml', 5, 0.3, 0.5, 0.0, 0.0, true, true, array['beverage','coffee']),
  ('ef000001-0000-0000-0000-000000000015', null, 'Kategna (Spiced Injera)', 'ቃጠኛ', 'ethiopian', 100, 'g', 210, 5.0, 32.0, 7.0, 2.5, true, false, array['snack','bread','spiced']),
  ('ef000001-0000-0000-0000-000000000016', null, 'Dulet (Organ Meat)', 'ዱለት', 'ethiopian', 150, 'g', 275, 24.0, 5.0, 18.0, 0.0, true, false, array['organ','offal','protein']),
  ('ef000001-0000-0000-0000-000000000017', null, 'Firfir (Torn Injera Stew)', 'ፍርፍር', 'ethiopian', 200, 'g', 220, 8.0, 35.0, 6.0, 3.0, true, false, array['bread','stew','breakfast']),
  ('ef000001-0000-0000-0000-000000000018', null, 'Kinche (Cracked Wheat)', 'ቂንጬ', 'ethiopian', 150, 'g', 195, 7.0, 38.0, 2.5, 4.0, true, false, array['grain','breakfast','healthy']),
  ('ef000001-0000-0000-0000-000000000019', null, 'Buticha (Chickpea Dip)', 'ቡቲቻ', 'ethiopian', 100, 'g', 145, 7.0, 18.0, 5.0, 5.0, true, false, array['chickpea','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000020', null, 'Mitmita Spice Blend', 'ሚጥሚጣ', 'ethiopian', 5, 'g', 15, 0.6, 2.5, 0.5, 1.0, true, false, array['spice','condiment'])
on conflict (id) do nothing;

-- ── Link to ethiopian_foods metadata ─────────────────────────────────────────
insert into public.ethiopian_foods
  (food_id, name_en, name_am, category, region, is_vegan, is_vegetarian, is_fasting_safe, description, common_ingredients)
values
  ('ef000001-0000-0000-0000-000000000001', 'Injera',            'እንጀራ',   'injera_based', 'national',    true,  true,  true,  'Spongy sourdough flatbread made from teff flour, the base of most Ethiopian meals.', array['teff flour','water','salt']),
  ('ef000001-0000-0000-0000-000000000002', 'Doro Wat',          'ዶሮ ወጥ',  'stew',         'national',    false, false, false, 'Rich spiced chicken stew cooked with berbere, niter kibbeh, and hard-boiled eggs.', array['chicken','berbere','niter kibbeh','eggs','onion']),
  ('ef000001-0000-0000-0000-000000000003', 'Tibs',              'ጥብስ',    'stew',         'national',    false, false, false, 'Sautéed beef or lamb with vegetables, spices, and butter.', array['beef','onion','tomato','jalapeño','butter']),
  ('ef000001-0000-0000-0000-000000000004', 'Misir Wat',         'ምስር ወጥ', 'stew',         'national',    true,  true,  true,  'Spiced red lentil stew cooked with berbere sauce.', array['red lentils','berbere','onion','garlic']),
  ('ef000001-0000-0000-0000-000000000005', 'Shiro Wat',         'ሽሮ ወጥ',  'stew',         'national',    true,  true,  true,  'Smooth chickpea flour stew, a fasting food staple.', array['chickpea flour','berbere','garlic','onion']),
  ('ef000001-0000-0000-0000-000000000006', 'Gomen',             'ጎመን',    'vegetable',    'national',    true,  true,  true,  'Braised collard greens with garlic and ginger.', array['collard greens','garlic','ginger','onion']),
  ('ef000001-0000-0000-0000-000000000007', 'Ayib',              'አይብ',    'dairy',        'national',    false, true,  false, 'Fresh Ethiopian cottage cheese, often served alongside spicy dishes.', array['milk','lemon juice','salt']),
  ('ef000001-0000-0000-0000-000000000008', 'Kitfo',             'ክትፎ',    'meat',         'national',    false, false, false, 'Ethiopian beef tartare seasoned with mitmita and niter kibbeh.', array['ground beef','mitmita','niter kibbeh']),
  ('ef000001-0000-0000-0000-000000000009', 'Ful',               'ፉል',     'legume',       'national',    true,  true,  true,  'Spiced fava bean stew, popular as a breakfast dish.', array['fava beans','tomato','onion','jalapeño','lemon']),
  ('ef000001-0000-0000-0000-000000000010', 'Chechebsa',         'ጨጨብሳ',  'bread',        'addis_ababa', false, true,  false, 'Torn flatbread fried with butter and berbere spice.', array['flatbread','butter','berbere','honey']),
  ('ef000001-0000-0000-0000-000000000011', 'Tikel Gomen',       'ጥቅል ጎመን','vegetable',   'national',    true,  true,  true,  'Stir-fried cabbage and carrot with turmeric and garlic.', array['cabbage','carrot','turmeric','garlic']),
  ('ef000001-0000-0000-0000-000000000012', 'Kik Alicha',        'ክክ አልጫ', 'legume',       'national',    true,  true,  true,  'Mild yellow split pea stew with turmeric.', array['split peas','turmeric','onion','garlic']),
  ('ef000001-0000-0000-0000-000000000013', 'Tej',               'ጠጅ',     'beverage',     'national',    true,  true,  false, 'Traditional Ethiopian honey wine with gesho hops.', array['honey','gesho','water','yeast']),
  ('ef000001-0000-0000-0000-000000000014', 'Buna',              'ቡና',     'beverage',     'national',    true,  true,  true,  'Ethiopian coffee ceremony coffee, served strong and black.', array['coffee beans','cardamom']),
  ('ef000001-0000-0000-0000-000000000015', 'Kategna',           'ቃጠኛ',   'snack',        'addis_ababa', false, true,  false, 'Toasted injera strips seasoned with berbere and niter kibbeh.', array['injera','berbere','niter kibbeh']),
  ('ef000001-0000-0000-0000-000000000016', 'Dulet',             'ዱለት',    'meat',         'national',    false, false, false, 'Minced organ meat (tripe, liver, beef) sautéed with spices.', array['tripe','liver','beef','onion','jalapeño']),
  ('ef000001-0000-0000-0000-000000000017', 'Firfir',            'ፍርፍር',  'injera_based', 'national',    false, true,  false, 'Torn injera pieces cooked in spiced butter sauce.', array['injera','niter kibbeh','berbere']),
  ('ef000001-0000-0000-0000-000000000018', 'Kinche',            'ቂንጬ',   'grain',        'national',    false, true,  false, 'Cracked wheat cooked in milk and butter, a hearty breakfast.', array['cracked wheat','milk','butter','salt']),
  ('ef000001-0000-0000-0000-000000000019', 'Buticha',           'ቡቲቻ',   'legume',       'national',    true,  true,  true,  'Ground chickpea salad with lemon, jalapeño, and green onion.', array['chickpeas','lemon','jalapeño','green onion']),
  ('ef000001-0000-0000-0000-000000000020', 'Mitmita',           'ሚጥሚጣ',  'spice',        'national',    true,  true,  true,  'Fiery Ethiopian spice blend of bird''s eye chili, cardamom, and clove.', array['bird eye chili','cardamom','clove','salt'])
on conflict (food_id) do nothing;
