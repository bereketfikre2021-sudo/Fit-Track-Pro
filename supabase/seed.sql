-- ============================================================
--  FitTrack Pro — Master Seed File (ALL-IN-ONE)
--  Paste this entire file into Supabase SQL Editor → Run
--  Safe to run multiple times (all statements are idempotent)
--
--  NOTE: File 005 (dev users) is intentionally excluded here.
--  Create test accounts via Supabase Auth dashboard first,
--  then run seeds/005_dev_users.sql separately with real UUIDs.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
--  1. SUBSCRIPTION PLANS
-- ══════════════════════════════════════════════════════════════

insert into public.subscription_plans
  (id, name, tier, price_monthly_usd, price_yearly_usd, max_ai_calls_day, max_devices, features, is_active)
values
  ('a1000000-0000-0000-0000-000000000001','Free', 'free', 0.00,0.00,5,1,
   '{"ads":true,"ai":false,"export":false,"pdf":false,"offline":true,"history_days":30}',true),
  ('a1000000-0000-0000-0000-000000000002','Pro','pro',4.99,49.99,50,3,
   '{"ads":false,"ai":true,"export":true,"pdf":true,"offline":true,"history_days":365}',true),
  ('a1000000-0000-0000-0000-000000000003','Elite','elite',9.99,99.99,200,5,
   '{"ads":false,"ai":true,"export":true,"pdf":true,"offline":true,"history_days":999,"priority_support":true}',true),
  ('a1000000-0000-0000-0000-000000000004','Team','team',29.99,299.99,1000,20,
   '{"ads":false,"ai":true,"export":true,"pdf":true,"offline":true,"history_days":999,"team":true}',true)
on conflict (tier) do update
  set name=excluded.name, price_monthly_usd=excluded.price_monthly_usd,
      price_yearly_usd=excluded.price_yearly_usd, max_ai_calls_day=excluded.max_ai_calls_day,
      max_devices=excluded.max_devices, features=excluded.features, updated_at=now();


-- ══════════════════════════════════════════════════════════════
--  2. PRESET EXERCISES (original 35)
-- ══════════════════════════════════════════════════════════════

insert into public.exercises (id, user_id, name, muscle_group, equipment, phase, is_time_based)
values
  (gen_random_uuid(),null,'Jump Rope','Cardio','Jump Rope','warmup',true),
  (gen_random_uuid(),null,'Jumping Jacks','Cardio','Bodyweight','warmup',true),
  (gen_random_uuid(),null,'Dynamic Stretching','Full Body','Bodyweight','warmup',true),
  (gen_random_uuid(),null,'Arm Circles','Shoulders','Bodyweight','warmup',true),
  (gen_random_uuid(),null,'Hip Circles','Hips','Bodyweight','warmup',true),
  (gen_random_uuid(),null,'Bench Press','Chest','Barbell','main',false),
  (gen_random_uuid(),null,'Incline Bench Press','Chest','Barbell','main',false),
  (gen_random_uuid(),null,'Dumbbell Fly','Chest','Dumbbell','main',false),
  (gen_random_uuid(),null,'Push-Up','Chest','Bodyweight','main',false),
  (gen_random_uuid(),null,'Overhead Press','Shoulders','Barbell','main',false),
  (gen_random_uuid(),null,'Dumbbell Lateral Raise','Shoulders','Dumbbell','main',false),
  (gen_random_uuid(),null,'Tricep Pushdown','Triceps','Cable','main',false),
  (gen_random_uuid(),null,'Skull Crusher','Triceps','Barbell','main',false),
  (gen_random_uuid(),null,'Deadlift','Back','Barbell','main',false),
  (gen_random_uuid(),null,'Pull-Up','Back','Bodyweight','main',false),
  (gen_random_uuid(),null,'Barbell Row','Back','Barbell','main',false),
  (gen_random_uuid(),null,'Seated Cable Row','Back','Cable','main',false),
  (gen_random_uuid(),null,'Lat Pulldown','Back','Machine','main',false),
  (gen_random_uuid(),null,'Barbell Curl','Biceps','Barbell','main',false),
  (gen_random_uuid(),null,'Dumbbell Hammer Curl','Biceps','Dumbbell','main',false),
  (gen_random_uuid(),null,'Squat','Quadriceps','Barbell','main',false),
  (gen_random_uuid(),null,'Leg Press','Quadriceps','Machine','main',false),
  (gen_random_uuid(),null,'Romanian Deadlift','Hamstrings','Barbell','main',false),
  (gen_random_uuid(),null,'Leg Curl','Hamstrings','Machine','main',false),
  (gen_random_uuid(),null,'Calf Raise','Calves','Machine','main',false),
  (gen_random_uuid(),null,'Lunge','Quadriceps','Dumbbell','main',false),
  (gen_random_uuid(),null,'Glute Bridge','Glutes','Bodyweight','main',false),
  (gen_random_uuid(),null,'Plank','Core','Bodyweight','main',true),
  (gen_random_uuid(),null,'Crunch','Core','Bodyweight','main',false),
  (gen_random_uuid(),null,'Leg Raise','Core','Bodyweight','main',false),
  (gen_random_uuid(),null,'Russian Twist','Core','Bodyweight','main',false),
  (gen_random_uuid(),null,'Cable Crunch','Core','Cable','main',false),
  (gen_random_uuid(),null,'Static Stretching','Full Body','Bodyweight','cooldown',true),
  (gen_random_uuid(),null,'Foam Rolling','Full Body','Foam Roller','cooldown',true),
  (gen_random_uuid(),null,'Child''s Pose','Back','Bodyweight','cooldown',true),
  (gen_random_uuid(),null,'Pigeon Pose','Hips','Bodyweight','cooldown',true)
;
-- (no ON CONFLICT needed for gen_random_uuid rows — IDs are always unique)


-- ══════════════════════════════════════════════════════════════
--  3. EXTENDED EXERCISES (20 additional with metadata)
-- ══════════════════════════════════════════════════════════════

insert into public.exercises
  (id,user_id,name,muscle_group,equipment,phase,is_time_based,category,difficulty,is_compound,met_value,instructions,tips,is_featured)
values
  ('e0000001-0000-0000-0000-000000000001',null,'Romanian Deadlift','Hamstrings','Barbell','main',false,'strength','intermediate',true,5.5,'Hinge at the hips with a soft knee bend. Lower bar along legs.','Keep bar close to shins.',false),
  ('e0000001-0000-0000-0000-000000000002',null,'Bulgarian Split Squat','Quadriceps','Dumbbell','main',false,'strength','intermediate',false,5.0,'Rear foot elevated on bench. Lower front knee toward floor.','Keep front knee tracking over toes.',false),
  ('e0000001-0000-0000-0000-000000000003',null,'Hip Thrust','Glutes','Barbell','main',false,'strength','beginner',false,4.5,'Shoulders on bench, bar across hips. Drive hips up.','Use a pad for comfort.',true),
  ('e0000001-0000-0000-0000-000000000004',null,'Nordic Hamstring Curl','Hamstrings','Bodyweight','main',false,'strength','advanced',false,5.0,'Kneel with feet anchored. Lower body forward slowly.','Best exercise for hamstring injury prevention.',false),
  ('e0000001-0000-0000-0000-000000000005',null,'Incline Dumbbell Press','Chest','Dumbbell','main',false,'strength','intermediate',true,5.0,'Set bench to 30-45°. Press dumbbells up and slightly inward.','Don''t let elbows flare excessively.',false),
  ('e0000001-0000-0000-0000-000000000006',null,'Cable Fly','Chest','Cable','main',false,'strength','beginner',false,4.0,'Stand between cables. Bring handles together in front of chest.','Slight bend in elbows throughout.',false),
  ('e0000001-0000-0000-0000-000000000007',null,'Face Pull','Shoulders','Cable','main',false,'strength','beginner',false,3.5,'Pull rope to face level with elbows high.','Great for shoulder health and posture.',true),
  ('e0000001-0000-0000-0000-000000000008',null,'Meadows Row','Back','Barbell','main',false,'strength','intermediate',false,5.0,'Straddle a landmine, grip end of bar, row to hip.','Allows deep stretch and strong contraction.',false),
  ('e0000001-0000-0000-0000-000000000009',null,'Chest Supported Row','Back','Dumbbell','main',false,'strength','beginner',false,4.5,'Lie prone on incline bench, row dumbbells to hips.','Removes lower back stress.',false),
  ('e0000001-0000-0000-0000-000000000010',null,'Tricep Dips','Triceps','Bodyweight','main',false,'strength','intermediate',false,4.5,'Support on parallel bars, lower until elbows at 90°.','Lean forward for more chest activation.',false),
  ('e0000001-0000-0000-0000-000000000011',null,'Treadmill Run','Cardio','Machine','main',true,'cardio','beginner',false,9.5,'Maintain comfortable pace. Land midfoot, keep torso upright.','Start with walk/run intervals if new.',false),
  ('e0000001-0000-0000-0000-000000000012',null,'Box Jump','Quadriceps','Box','main',false,'cardio','intermediate',true,8.0,'Squat slightly and explode up landing softly on box.','Always step down — never jump down.',false),
  ('e0000001-0000-0000-0000-000000000013',null,'Battle Ropes','Full Body','Battle Ropes','main',true,'cardio','intermediate',true,10.0,'Alternate arm waves for time. Keep core tight.','Great metabolic conditioning tool.',false),
  ('e0000001-0000-0000-0000-000000000014',null,'Assault Bike','Cardio','Machine','main',true,'cardio','beginner',true,12.0,'Pedal and push/pull handles simultaneously.','One of the highest calorie-burning machines.',false),
  ('e0000001-0000-0000-0000-000000000015',null,'Sled Push','Full Body','Sled','main',false,'cardio','intermediate',true,9.0,'Low body position, drive through legs to push sled.','Excellent for quad development.',false),
  ('e0000001-0000-0000-0000-000000000016',null,'World''s Greatest Stretch','Full Body','Bodyweight','warmup',true,'mobility','beginner',false,2.5,'Step into lunge, rotate arm toward sky, hold, repeat.','Warms up hips, thoracic spine, and shoulders.',true),
  ('e0000001-0000-0000-0000-000000000017',null,'Hip 90/90 Stretch','Hips','Bodyweight','cooldown',true,'mobility','beginner',false,1.5,'Sit with both legs at 90°. Lean over front shin. Hold.','Excellent for hip flexibility.',false),
  ('e0000001-0000-0000-0000-000000000018',null,'Band Pull Apart','Shoulders','Bands','warmup',false,'mobility','beginner',false,2.0,'Hold band at shoulder width. Pull apart to chest level.','Essential shoulder warm-up.',false),
  ('e0000001-0000-0000-0000-000000000019',null,'Cat-Cow Stretch','Core','Bodyweight','warmup',true,'mobility','beginner',false,1.5,'On hands and knees, alternate arching and rounding spine.','Breathe in on cow, out on cat.',false),
  ('e0000001-0000-0000-0000-000000000020',null,'Couch Stretch','Quadriceps','Bodyweight','cooldown',true,'mobility','beginner',false,1.5,'Rear knee on floor, rear foot against wall. Drive hips forward.','Addresses quad tightness from sitting.',false)
on conflict (id) do nothing;

insert into public.exercise_tags (exercise_id, tag) values
  ('e0000001-0000-0000-0000-000000000003','glute'),
  ('e0000001-0000-0000-0000-000000000003','beginner_friendly'),
  ('e0000001-0000-0000-0000-000000000007','shoulder_health'),
  ('e0000001-0000-0000-0000-000000000007','posture'),
  ('e0000001-0000-0000-0000-000000000016','full_body_warmup'),
  ('e0000001-0000-0000-0000-000000000016','mobility')
on conflict (exercise_id, tag) do nothing;


-- ══════════════════════════════════════════════════════════════
--  4. ETHIOPIAN FOODS
-- ══════════════════════════════════════════════════════════════

insert into public.foods
  (id,user_id,name,name_am,source,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g,fiber_g,is_verified,is_featured,tags)
values
  ('ef000001-0000-0000-0000-000000000001',null,'Injera','እንጀራ','ethiopian',100,'g',174,5.7,36.5,0.8,3.2,true,true,array['grain','fermented','staple']),
  ('ef000001-0000-0000-0000-000000000002',null,'Doro Wat','ዶሮ ወጥ','ethiopian',200,'g',320,28.0,12.0,18.0,2.0,true,true,array['chicken','stew','protein']),
  ('ef000001-0000-0000-0000-000000000003',null,'Tibs (Beef)','ጥብስ','ethiopian',150,'g',285,26.0,6.0,17.0,1.0,true,true,array['beef','fried','protein']),
  ('ef000001-0000-0000-0000-000000000004',null,'Misir Wat','ምስር ወጥ','ethiopian',200,'g',180,9.5,28.0,4.5,8.0,true,true,array['lentils','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000005',null,'Shiro Wat','ሽሮ ወጥ','ethiopian',200,'g',165,8.5,22.0,5.0,6.0,true,true,array['chickpea','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000006',null,'Gomen (Collard Greens)','ጎመን','ethiopian',150,'g',65,4.0,8.0,2.5,3.5,true,false,array['vegetable','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000007',null,'Ayib (Ethiopian Cheese)','አይብ','ethiopian',100,'g',170,12.0,4.0,12.0,0.0,true,false,array['dairy','protein']),
  ('ef000001-0000-0000-0000-000000000008',null,'Kitfo (Ethiopian Tartare)','ክትፎ','ethiopian',150,'g',310,28.0,3.0,21.0,0.0,true,true,array['beef','raw','protein']),
  ('ef000001-0000-0000-0000-000000000009',null,'Ful (Fava Beans)','ፉል','ethiopian',200,'g',190,13.0,29.0,3.5,9.0,true,false,array['beans','vegan','breakfast','fasting']),
  ('ef000001-0000-0000-0000-000000000010',null,'Chechebsa','ጨጨብሳ','ethiopian',150,'g',340,8.0,45.0,15.0,2.0,true,false,array['bread','breakfast']),
  ('ef000001-0000-0000-0000-000000000011',null,'Tikel Gomen (Cabbage)','ጥቅል ጎመን','ethiopian',150,'g',70,3.0,10.0,2.0,3.0,true,false,array['vegetable','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000012',null,'Kik Alicha (Split Peas)','ክክ አልጫ','ethiopian',200,'g',160,9.0,26.0,3.0,7.0,true,false,array['peas','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000013',null,'Tej (Honey Wine)','ጠጅ','ethiopian',200,'ml',145,0.5,18.0,0.0,0.0,true,false,array['beverage','alcohol']),
  ('ef000001-0000-0000-0000-000000000014',null,'Buna (Ethiopian Coffee)','ቡና','ethiopian',150,'ml',5,0.3,0.5,0.0,0.0,true,true,array['beverage','coffee']),
  ('ef000001-0000-0000-0000-000000000015',null,'Kategna (Spiced Injera)','ቃጠኛ','ethiopian',100,'g',210,5.0,32.0,7.0,2.5,true,false,array['snack','bread','spiced']),
  ('ef000001-0000-0000-0000-000000000016',null,'Dulet (Organ Meat)','ዱለት','ethiopian',150,'g',275,24.0,5.0,18.0,0.0,true,false,array['organ','offal','protein']),
  ('ef000001-0000-0000-0000-000000000017',null,'Firfir (Torn Injera Stew)','ፍርፍር','ethiopian',200,'g',220,8.0,35.0,6.0,3.0,true,false,array['bread','stew','breakfast']),
  ('ef000001-0000-0000-0000-000000000018',null,'Kinche (Cracked Wheat)','ቂንጬ','ethiopian',150,'g',195,7.0,38.0,2.5,4.0,true,false,array['grain','breakfast','healthy']),
  ('ef000001-0000-0000-0000-000000000019',null,'Buticha (Chickpea Dip)','ቡቲቻ','ethiopian',100,'g',145,7.0,18.0,5.0,5.0,true,false,array['chickpea','vegan','fasting']),
  ('ef000001-0000-0000-0000-000000000020',null,'Mitmita Spice Blend','ሚጥሚጣ','ethiopian',5,'g',15,0.6,2.5,0.5,1.0,true,false,array['spice','condiment'])
on conflict (id) do nothing;

insert into public.ethiopian_foods (food_id,name_en,name_am,category,region,is_vegan,is_vegetarian,is_fasting_safe,description,common_ingredients)
values
  ('ef000001-0000-0000-0000-000000000001','Injera','እንጀራ','injera_based','national',true,true,true,'Spongy sourdough flatbread made from teff flour.',array['teff flour','water','salt']),
  ('ef000001-0000-0000-0000-000000000002','Doro Wat','ዶሮ ወጥ','stew','national',false,false,false,'Rich spiced chicken stew with berbere and niter kibbeh.',array['chicken','berbere','niter kibbeh','eggs','onion']),
  ('ef000001-0000-0000-0000-000000000003','Tibs','ጥብስ','stew','national',false,false,false,'Sautéed beef with vegetables and spices.',array['beef','onion','tomato','jalapeño','butter']),
  ('ef000001-0000-0000-0000-000000000004','Misir Wat','ምስር ወጥ','stew','national',true,true,true,'Spiced red lentil stew.',array['red lentils','berbere','onion','garlic']),
  ('ef000001-0000-0000-0000-000000000005','Shiro Wat','ሽሮ ወጥ','stew','national',true,true,true,'Smooth chickpea flour stew.',array['chickpea flour','berbere','garlic','onion']),
  ('ef000001-0000-0000-0000-000000000006','Gomen','ጎመን','vegetable','national',true,true,true,'Braised collard greens with garlic and ginger.',array['collard greens','garlic','ginger','onion']),
  ('ef000001-0000-0000-0000-000000000007','Ayib','አይብ','dairy','national',false,true,false,'Fresh Ethiopian cottage cheese.',array['milk','lemon juice','salt']),
  ('ef000001-0000-0000-0000-000000000008','Kitfo','ክትፎ','stew','national',false,false,false,'Ethiopian beef tartare with mitmita.',array['ground beef','mitmita','niter kibbeh']),
  ('ef000001-0000-0000-0000-000000000009','Ful','ፉል','stew','national',true,true,true,'Spiced fava bean stew.',array['fava beans','tomato','onion','jalapeño','lemon']),
  ('ef000001-0000-0000-0000-000000000010','Chechebsa','ጨጨብሳ','bread','addis_ababa',false,true,false,'Torn flatbread fried with butter and berbere.',array['flatbread','butter','berbere','honey']),
  ('ef000001-0000-0000-0000-000000000011','Tikel Gomen','ጥቅል ጎመን','vegetable','national',true,true,true,'Stir-fried cabbage and carrot.',array['cabbage','carrot','turmeric','garlic']),
  ('ef000001-0000-0000-0000-000000000012','Kik Alicha','ክክ አልጫ','legume','national',true,true,true,'Mild yellow split pea stew.',array['split peas','turmeric','onion','garlic']),
  ('ef000001-0000-0000-0000-000000000013','Tej','ጠጅ','beverage','national',true,true,false,'Traditional Ethiopian honey wine.',array['honey','gesho','water','yeast']),
  ('ef000001-0000-0000-0000-000000000014','Buna','ቡና','beverage','national',true,true,true,'Ethiopian coffee ceremony coffee.',array['coffee beans','cardamom']),
  ('ef000001-0000-0000-0000-000000000015','Kategna','ቃጠኛ','snack','addis_ababa',false,true,false,'Toasted injera strips with berbere.',array['injera','berbere','niter kibbeh']),
  ('ef000001-0000-0000-0000-000000000016','Dulet','ዱለት','stew','national',false,false,false,'Minced organ meat with spices.',array['tripe','liver','beef','onion','jalapeño']),
  ('ef000001-0000-0000-0000-000000000017','Firfir','ፍርፍር','injera_based','national',false,true,false,'Torn injera in spiced butter sauce.',array['injera','niter kibbeh','berbere']),
  ('ef000001-0000-0000-0000-000000000018','Kinche','ቂንጬ','grain','national',false,true,false,'Cracked wheat in milk and butter.',array['cracked wheat','milk','butter','salt']),
  ('ef000001-0000-0000-0000-000000000019','Buticha','ቡቲቻ','legume','national',true,true,true,'Ground chickpea salad.',array['chickpeas','lemon','jalapeño','green onion']),
  ('ef000001-0000-0000-0000-000000000020','Mitmita','ሚጥሚጣ','spice','national',true,true,true,'Fiery Ethiopian spice blend.',array['bird eye chili','cardamom','clove','salt'])
on conflict (id) do nothing;  -- food_id is FK, conflict on primary key (id)


-- ══════════════════════════════════════════════════════════════
--  5. WORKOUT TEMPLATES
-- ══════════════════════════════════════════════════════════════

insert into public.workout_templates
  (id,user_id,name,description,exercises)
values
  ('a1000001-0000-0000-0000-000000000001',null,'Push Day — Hypertrophy','Chest, shoulders, and triceps hypertrophy session.',
   '[{"name":"Bench Press","sets":4,"reps":"8-10","restSeconds":90,"phase":"main"},{"name":"Incline Dumbbell Press","sets":3,"reps":"10-12","restSeconds":75,"phase":"main"},{"name":"Cable Fly","sets":3,"reps":"12-15","restSeconds":60,"phase":"main"},{"name":"Overhead Press","sets":4,"reps":"8-10","restSeconds":90,"phase":"main"},{"name":"Dumbbell Lateral Raise","sets":3,"reps":"15-20","restSeconds":60,"phase":"main"},{"name":"Tricep Pushdown","sets":3,"reps":"12-15","restSeconds":60,"phase":"main"},{"name":"Skull Crusher","sets":3,"reps":"10-12","restSeconds":60,"phase":"main"}]'::jsonb),
  ('a1000001-0000-0000-0000-000000000002',null,'Pull Day — Strength','Back and biceps strength session.',
   '[{"name":"Deadlift","sets":4,"reps":"5","restSeconds":180,"phase":"main"},{"name":"Barbell Row","sets":4,"reps":"6-8","restSeconds":120,"phase":"main"},{"name":"Pull-Up","sets":3,"reps":"8-10","restSeconds":90,"phase":"main"},{"name":"Seated Cable Row","sets":3,"reps":"10-12","restSeconds":75,"phase":"main"},{"name":"Face Pull","sets":3,"reps":"15","restSeconds":60,"phase":"main"},{"name":"Barbell Curl","sets":3,"reps":"10-12","restSeconds":60,"phase":"main"}]'::jsonb),
  ('a1000001-0000-0000-0000-000000000003',null,'Leg Day — Volume','Full leg development.',
   '[{"name":"Squat","sets":4,"reps":"10","restSeconds":120,"phase":"main"},{"name":"Romanian Deadlift","sets":3,"reps":"10-12","restSeconds":90,"phase":"main"},{"name":"Leg Press","sets":3,"reps":"12-15","restSeconds":90,"phase":"main"},{"name":"Hip Thrust","sets":3,"reps":"12-15","restSeconds":75,"phase":"main"},{"name":"Leg Curl","sets":3,"reps":"12","restSeconds":60,"phase":"main"},{"name":"Calf Raise","sets":4,"reps":"15-20","restSeconds":45,"phase":"main"}]'::jsonb),
  ('a1000001-0000-0000-0000-000000000004',null,'Full Body Beginner','Three-day full body routine for beginners.',
   '[{"name":"Squat","sets":3,"reps":"10","restSeconds":90,"phase":"main"},{"name":"Bench Press","sets":3,"reps":"10","restSeconds":90,"phase":"main"},{"name":"Barbell Row","sets":3,"reps":"10","restSeconds":90,"phase":"main"},{"name":"Overhead Press","sets":3,"reps":"10","restSeconds":90,"phase":"main"},{"name":"Deadlift","sets":2,"reps":"8","restSeconds":120,"phase":"main"},{"name":"Plank","sets":2,"reps":"30","isTimeBased":true,"restSeconds":60,"phase":"cooldown"}]'::jsonb),
  ('a1000001-0000-0000-0000-000000000005',null,'HIIT Cardio Circuit','30-minute high intensity interval training.',
   '[{"name":"Jumping Jacks","sets":3,"reps":"30","isTimeBased":true,"restSeconds":15,"phase":"warmup"},{"name":"Push-Up","sets":4,"reps":"15","restSeconds":30,"phase":"main"},{"name":"Plank","sets":4,"reps":"45","isTimeBased":true,"restSeconds":30,"phase":"main"},{"name":"Crunch","sets":4,"reps":"20","restSeconds":30,"phase":"main"},{"name":"Glute Bridge","sets":3,"reps":"20","restSeconds":30,"phase":"main"}]'::jsonb),
  ('a1000001-0000-0000-0000-000000000006',null,'Mobility & Recovery','45-minute active recovery session.',
   '[{"name":"Cat-Cow Stretch","sets":2,"reps":"60","isTimeBased":true,"phase":"warmup"},{"name":"World''s Greatest Stretch","sets":2,"reps":"90","isTimeBased":true,"phase":"main"},{"name":"Hip 90/90 Stretch","sets":2,"reps":"120","isTimeBased":true,"phase":"main"},{"name":"Pigeon Pose","sets":2,"reps":"120","isTimeBased":true,"phase":"main"},{"name":"Foam Rolling","sets":1,"reps":"300","isTimeBased":true,"phase":"cooldown"}]'::jsonb)
on conflict (id) do nothing;

-- Update extended columns (added by migration 001)
update public.workout_templates set is_public=true, category='strength',  difficulty='intermediate', duration_min=60, tags=array['push','chest','shoulders','triceps'], is_featured=true  where id='a1000001-0000-0000-0000-000000000001';
update public.workout_templates set is_public=true, category='strength',  difficulty='intermediate', duration_min=65, tags=array['pull','back','biceps','strength'],   is_featured=true  where id='a1000001-0000-0000-0000-000000000002';
update public.workout_templates set is_public=true, category='strength',  difficulty='intermediate', duration_min=70, tags=array['legs','quads','hamstrings','glutes'], is_featured=true  where id='a1000001-0000-0000-0000-000000000003';
update public.workout_templates set is_public=true, category='strength',  difficulty='beginner',     duration_min=45, tags=array['full_body','beginner','compound'],    is_featured=true  where id='a1000001-0000-0000-0000-000000000004';
update public.workout_templates set is_public=true, category='cardio',    difficulty='intermediate', duration_min=30, tags=array['hiit','bodyweight','no_equipment'],   is_featured=false where id='a1000001-0000-0000-0000-000000000005';
update public.workout_templates set is_public=true, category='mobility',  difficulty='beginner',     duration_min=45, tags=array['recovery','mobility','stretching'],   is_featured=false where id='a1000001-0000-0000-0000-000000000006';


-- ══════════════════════════════════════════════════════════════
--  6. APP SETTINGS & BMI PROGRAMS
-- ══════════════════════════════════════════════════════════════

insert into public.app_settings (key,value,description,is_public) values
  ('app_version','"1.0.0"','Current app version',true),
  ('maintenance_mode','false','Disable app access during maintenance',false),
  ('min_app_version','"1.0.0"','Minimum client version required',true),
  ('feature_flags','{"ai":true,"ads":true,"pdf":true,"offline":true,"ethiopian_foods":true}','Feature flags',true),
  ('ai_default_model','"gemini-1.5-flash"','Default AI model',false),
  ('ai_fallback_model','"gemini-1.0-pro"','Fallback AI model',false),
  ('max_file_upload_mb','10','Max upload size in MB',true),
  ('support_email','"support@fittrackpro.app"','Customer support email',true),
  ('terms_version','"2024-01-01"','Current terms version',true),
  ('privacy_version','"2024-01-01"','Current privacy policy version',true),
  ('trial_days','14','Pro trial length in days',true),
  ('max_workout_days','7','Maximum workout days per week',true),
  ('max_custom_exercises','{"free":10,"pro":100,"elite":1000}','Custom exercise limits',false),
  ('storage_limits_mb','{"free":50,"pro":500,"elite":2000,"team":10000}','Storage limits per tier in MB',false)
on conflict (key) do update set value=excluded.value, updated_at=now();

insert into public.bmi_programs
  (id,name,description,program_type,target_bmi_min,target_bmi_max,target_bmi_category,duration_weeks,weekly_workouts,difficulty,features,workout_template_id,is_active,is_featured)
values
  ('b1000001-0000-0000-0000-000000000001','Lean & Strong','For normal BMI users wanting to build muscle.','muscle_gain',18.5,24.9,'normal',12,4,'intermediate','{"required_tier":"free"}','a1000001-0000-0000-0000-000000000001',true,true),
  ('b1000001-0000-0000-0000-000000000002','Fat Loss Accelerator','For overweight users. Calorie deficit + high volume.','weight_loss',25.0,34.9,'overweight',16,5,'beginner','{"required_tier":"free"}','a1000001-0000-0000-0000-000000000005',true,true),
  ('b1000001-0000-0000-0000-000000000003','Healthy Start','For underweight users. Focus on healthy weight gain.','muscle_gain',null,18.4,'underweight',12,3,'beginner','{"required_tier":"free"}','a1000001-0000-0000-0000-000000000004',true,false),
  ('b1000001-0000-0000-0000-000000000004','Elite Strength Builder','Advanced powerlifting program for optimal BMI.','strength',18.5,27.0,null,20,4,'advanced','{"required_tier":"pro"}','a1000001-0000-0000-0000-000000000002',true,false),
  ('b1000001-0000-0000-0000-000000000005','Mobility & Endurance','For any BMI — cardio health and functional fitness.','endurance',null,null,null,8,5,'beginner','{"required_tier":"free"}','a1000001-0000-0000-0000-000000000006',true,false)
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════
--  DONE — all seed data loaded.
--  To load dev test users, run seeds/005_dev_users.sql separately
--  after creating accounts in the Supabase Auth dashboard.
-- ══════════════════════════════════════════════════════════════
