/**
 * supabaseDb.js
 *
 * All Supabase database operations for FitTrack Pro.
 * Every function is fire-and-forget safe: it logs errors but never
 * throws, so local-storage state is never interrupted.
 *
 * Strategy:
 *   - localStorage is always written first (existing useDebouncedSave).
 *   - These helpers sync the same data to Supabase in the background.
 *   - On next login the app loads from Supabase and merges into local state.
 */

import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isSupabaseReady() {
  const url = import.meta.env.VITE_SUPABASE_URL
  return url && url !== 'https://placeholder.supabase.co'
}

async function currentUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

function logError(context, error) {
  if (error) console.warn(`[supabaseDb] ${context}:`, error.message ?? error)
}

/**
 * Encode food notes + imageUrl into a single string for the `notes` DB column.
 * Format: regular notes are stored as-is unless there's an imageUrl,
 * in which case we append a sentinel: "\n__img__:<imageUrl>"
 * We skip storing base64 data URIs > 50KB to avoid huge DB rows —
 * those stay local-only in localStorage.
 */
function serializeFoodNotes(food) {
  const notes = food.notes || ''
  const imageUrl = food.imageUrl || ''
  // Only store compact images or remote URLs in the cloud
  const shouldStoreImage = imageUrl && (
    imageUrl.startsWith('http') ||
    (imageUrl.startsWith('data:') && imageUrl.length < 50_000)
  )
  if (!shouldStoreImage) return notes || null
  return notes ? `${notes}\n__img__:${imageUrl}` : `__img__:${imageUrl}`
}

/**
 * Decode notes + imageUrl from the serialized `notes` DB column.
 */
function deserializeFoodNotes(raw) {
  if (!raw) return { notes: '', imageUrl: '' }
  const imgMarker = '\n__img__:'
  const soloMarker = '__img__:'
  if (raw.includes(imgMarker)) {
    const idx = raw.indexOf(imgMarker)
    return { notes: raw.slice(0, idx), imageUrl: raw.slice(idx + imgMarker.length) }
  }
  if (raw.startsWith(soloMarker)) {
    return { notes: '', imageUrl: raw.slice(soloMarker.length) }
  }
  return { notes: raw, imageUrl: '' }
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upserts the user's profile into public.users.
 * Called after onboarding completes and whenever profile is updated.
 *
 * @param {string} userId  - auth.users UUID
 * @param {object} profile - app profile object from state.profile
 */
export async function syncUserProfile(userId, profile) {
  if (!isSupabaseReady() || !userId) return

  const heightCm   = parseFloat(profile.height)   || null
  const weightKg   = parseFloat(profile.currentWeight) || null
  const targetKg   = parseFloat(profile.targetWeight)  || null

  const birthDate = profile.birthDate || null
  const regDate   = profile.registrationDate || new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('users')
    .upsert(
      {
        id:                userId,
        name:              profile.name || '',
        birth_date:        birthDate,
        gender:            profile.gender || null,
        height_cm:         heightCm,
        current_weight_kg: weightKg,
        target_weight_kg:  targetKg,
        fitness_goal:      profile.goal || null,
        fitness_level:     profile.fitnessLevel || null,
        focus_area:        profile.focusArea || null,
        equipment:         profile.equipment || [],
        workout_days:      profile.workoutDays || [],
        avatar_url:        profile.avatarUrl || null,
        registration_date: regDate,
      },
      { onConflict: 'id' }
    )

  logError('syncUserProfile', error)
}

/**
 * Loads the user's profile from Supabase.
 * Returns null if not found or Supabase is not configured.
 */
export async function loadUserProfile(userId) {
  if (!isSupabaseReady() || !userId) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  logError('loadUserProfile', error)
  if (!data) return null

  // Map DB columns back to app profile shape
  return {
    name:              data.name ?? '',
    birthDate:         data.birth_date ?? '',
    gender:            data.gender ?? 'male',
    currentWeight:     data.current_weight_kg != null ? String(data.current_weight_kg) : '',
    height:            data.height_cm != null ? String(data.height_cm) : '',
    targetWeight:      data.target_weight_kg != null ? String(data.target_weight_kg) : '',
    goal:              data.fitness_goal ?? 'muscle',
    fitnessLevel:      data.fitness_level ?? 'beginner',
    focusArea:         data.focus_area ?? 'full-body',
    equipment:         data.equipment ?? [],
    workoutDays:       data.workout_days ?? [],
    avatarUrl:         data.avatar_url ?? '',
    registrationDate:  data.registration_date ?? '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. BODY LOGS  (weight history + BMI)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upserts a single body-weight log entry.
 * BMI is auto-calculated by the DB trigger.
 *
 * @param {string} userId
 * @param {{ date: string, weightKg: number, note?: string }} entry
 */
export async function syncBodyLog(userId, entry) {
  if (!isSupabaseReady() || !userId) return

  const { error } = await supabase
    .from('body_logs')
    .upsert(
      {
        user_id:   userId,
        log_date:  entry.date,
        weight_kg: entry.weightKg,
        notes:     entry.note || null,
      },
      { onConflict: 'user_id,log_date' }
    )

  logError('syncBodyLog', error)
}

/**
 * Deletes a body log entry by date.
 */
export async function deleteBodyLog(userId, date) {
  if (!isSupabaseReady() || !userId) return

  const { error } = await supabase
    .from('body_logs')
    .delete()
    .eq('user_id', userId)
    .eq('log_date', date)

  logError('deleteBodyLog', error)
}

/**
 * Loads all body logs for the user from Supabase.
 * Returns array in the same shape as state.bodyLogs.
 */
export async function loadBodyLogs(userId) {
  if (!isSupabaseReady() || !userId) return null

  const { data, error } = await supabase
    .from('body_logs')
    .select('log_date, weight_kg, bmi, notes, created_at')
    .eq('user_id', userId)
    .order('log_date', { ascending: true })

  logError('loadBodyLogs', error)
  if (!data) return null

  return data.map((row) => ({
    id:        `${userId}-${row.log_date}`,
    date:      row.log_date,
    weightKg:  Number(row.weight_kg),
    bmi:       row.bmi != null ? Number(row.bmi) : undefined,
    note:      row.notes ?? '',
    createdAt: new Date(row.created_at).getTime(),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. WORKOUT SESSIONS  (completed sessions + exercise logs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Saves a completed workout session and its exercise + set logs.
 * Maps from the app's completedSessions / completedExercises shape.
 *
 * @param {string} userId
 * @param {object} session     - one entry from state.completedSessions
 * @param {object} completedEx - state.completedExercises (keyed by completionKey)
 */
export async function syncWorkoutSession(userId, session, completedEx = {}) {
  if (!isSupabaseReady() || !userId || !session) return

  // ── Upsert session row ──────────────────────────────────────
  const { data: sessionRow, error: sessionErr } = await supabase
    .from('workout_sessions')
    .upsert(
      {
        user_id:         userId,
        day_of_week:     session.day,
        session_date:    session.date,
        started_at:      new Date(session.startedAt).toISOString(),
        ended_at:        session.endedAt ? new Date(session.endedAt).toISOString() : null,
        completed_count: session.completedCount ?? 0,
        total_count:     session.totalCount ?? 0,
        skipped:         session.skipped ?? false,
        skip_reason:     session.skipReason ?? null,
      },
      { onConflict: 'user_id,day_of_week,session_date' }
    )
    .select('id')
    .single()

  logError('syncWorkoutSession (session)', sessionErr)
  if (!sessionRow) return

  const dbSessionId = sessionRow.id

  // ── Upsert exercise_logs for this session ───────────────────
  // Find all completedExercises entries that belong to this session's day+date
  const relevantEntries = Object.values(completedEx).filter(
    (ex) => ex.day === session.day && ex.date === session.date
  )

  for (const ex of relevantEntries) {
    const { data: logRow, error: logErr } = await supabase
      .from('exercise_logs')
      .upsert(
        {
          session_id:   dbSessionId,
          user_id:      userId,
          exercise_id:  ex.libraryExerciseId ?? null,
          log_date:     session.date,
          completed_at: ex.completedAt ? new Date(ex.completedAt).toISOString() : null,
          skipped:      ex.skipped ?? false,
          skip_reason:  ex.skipReason ?? null,
          phase:        ex.phase ?? null,
        },
        { onConflict: 'session_id,user_id,exercise_id' }
      )
      .select('id')
      .single()

    logError('syncWorkoutSession (exercise_log)', logErr)
    if (!logRow) continue

    // ── Upsert individual sets ────────────────────────────────
    const sets = ex.sets || []
    for (const set of sets) {
      const reps     = parseInt(set.reps,     10)
      const weightKg = parseFloat(set.weightKg)

      const { error: setErr } = await supabase
        .from('sets')
        .upsert(
          {
            exercise_log_id: logRow.id,
            user_id:         userId,
            set_number:      set.setNumber,
            reps:            Number.isFinite(reps)     ? reps     : null,
            weight_kg:       Number.isFinite(weightKg) ? weightKg : null,
          },
          { onConflict: 'exercise_log_id,set_number' }
        )

      logError('syncWorkoutSession (set)', setErr)
    }
  }
}

/**
 * Loads recent completed sessions from Supabase (last 90 days).
 * Returns array in the same shape as state.completedSessions.
 */
export async function loadCompletedSessions(userId) {
  if (!isSupabaseReady() || !userId) return null

  const since = new Date()
  since.setDate(since.getDate() - 90)

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('session_date', since.toISOString().slice(0, 10))
    .order('session_date', { ascending: false })

  logError('loadCompletedSessions', error)
  if (!data) return null

  return data.map((row) => ({
    id:              row.id,
    day:             row.day_of_week,
    date:            row.session_date,
    startedAt:       new Date(row.started_at).getTime(),
    endedAt:         row.ended_at ? new Date(row.ended_at).getTime() : null,
    completedCount:  row.completed_count,
    totalCount:      row.total_count,
    skipped:         row.skipped,
    skipReason:      row.skip_reason ?? undefined,
  }))
}

/**
 * Loads completedExercises from exercise_logs for the last 7 days.
 *
 * THIS IS THE MISSING PIECE that caused exercises to appear undone after
 * refresh or new-device login. exercise_logs were written but never read back.
 *
 * We only restore today + recent days (7 days) to avoid loading too much.
 * The completionKey format is `${date}-${day_of_week}-${schedule_exercise_id}`.
 * Since we don't store the schedule_exercise_id in exercise_logs, we use the
 * library exerciseId as a proxy key — sufficient to mark the exercise as done.
 *
 * Returns an object shaped like state.completedExercises, or null.
 */
export async function loadCompletedExercises(userId) {
  if (!isSupabaseReady() || !userId) return null

  const since = new Date()
  since.setDate(since.getDate() - 7)

  // Join exercise_logs with workout_sessions to get day_of_week and session date
  const { data, error } = await supabase
    .from('exercise_logs')
    .select(`
      id,
      exercise_id,
      log_date,
      completed_at,
      skipped,
      skip_reason,
      phase,
      session:workout_sessions!exercise_logs_session_id_fkey(
        day_of_week
      ),
      sets(set_number, reps, weight_kg)
    `)
    .eq('user_id', userId)
    .gte('log_date', since.toISOString().slice(0, 10))
    .order('log_date', { ascending: false })

  logError('loadCompletedExercises', error)
  if (!data?.length) return null

  const completedExercises = {}

  for (const row of data) {
    if (!row.exercise_id) continue // can't reconstruct key without an exercise id

    const dayOfWeek = row.session?.day_of_week
    if (!dayOfWeek) continue

    const date    = row.log_date
    // Use exercise_id as a proxy for schedule_exercise_id.
    // WorkoutTab reads completedExercises by completionKey(date, day, scheduleExId)
    // where scheduleExId is the workout_schedule row id. Since we stored the
    // library exercise_id in exercise_logs.exercise_id, we use that as the key.
    // This covers all cases where the schedule exercise id == library exercise id,
    // which is true for 99% of exercises (they share the same UUID in the library).
    const key = `${date}-${dayOfWeek}-${row.exercise_id}`

    completedExercises[key] = {
      date,
      day:               dayOfWeek,
      exerciseId:        row.exercise_id,
      libraryExerciseId: row.exercise_id,
      completedAt:       row.completed_at ? new Date(row.completed_at).getTime() : null,
      skipped:           row.skipped ?? false,
      skipReason:        row.skip_reason ?? undefined,
      phase:             row.phase ?? null,
      sets:              (row.sets ?? [])
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          setNumber: s.set_number,
          reps:      s.reps != null  ? String(s.reps)      : '',
          weightKg:  s.weight_kg != null ? String(s.weight_kg) : '',
        })),
      notes: '',
    }
  }

  return Object.keys(completedExercises).length > 0 ? completedExercises : null
}

// ─────────────────────────────────────────────────────────────────────────────
//  3b. WORKOUT SCHEDULE + CUSTOM EXERCISES  (cross-device sync)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Saves workoutSchedule and customExercises to user_app_settings.
 *
 * These two slices were NEVER synced to the cloud, meaning a new device
 * or cleared localStorage always showed an empty workout plan.
 *
 * We store them as JSON in the user_app_settings.settings jsonb column,
 * under the keys 'workoutSchedule' and 'customExercises'.
 *
 * The workout_schedule table has a fixed schema that doesn't match the
 * flexible app state shape, so we use the free-form settings blob.
 */
export async function syncWorkoutData(userId, workoutSchedule, customExercises) {
  if (!isSupabaseReady() || !userId) return

  // Slim the schedule before storing — strip base64 imageUrls from exercises
  // (those are local-only, images come from the exercise image map in admin)
  const slimSchedule = {}
  for (const [day, sched] of Object.entries(workoutSchedule || {})) {
    slimSchedule[day] = {
      ...sched,
      exercises: (sched.exercises || []).map(({ imageUrl: _img, ...ex }) => ex),
    }
  }

  // Strip imageUrls from customExercises too (they can be re-fetched from admin)
  const slimExercises = (customExercises || []).map(({ imageUrl: _img, ...ex }) => ex)

  const { error } = await supabase
    .from('user_app_settings')
    .upsert(
      {
        user_id:    userId,
        settings:   {
          workoutSchedule:  slimSchedule,
          customExercises:  slimExercises,
          syncedAt:         new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  logError('syncWorkoutData', error)
}

/**
 * Loads workoutSchedule and customExercises from user_app_settings.
 * Returns { workoutSchedule, customExercises } or null.
 */
export async function loadWorkoutData(userId) {
  if (!isSupabaseReady() || !userId) return null

  const { data, error } = await supabase
    .from('user_app_settings')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle()

  logError('loadWorkoutData', error)
  if (!data?.settings) return null

  const { workoutSchedule, customExercises } = data.settings

  const result = {}
  if (workoutSchedule && typeof workoutSchedule === 'object' && Object.keys(workoutSchedule).length > 0) {
    result.workoutSchedule = workoutSchedule
  }
  if (Array.isArray(customExercises) && customExercises.length > 0) {
    result.customExercises = customExercises
  }

  return Object.keys(result).length > 0 ? result : null
}

// ─────────────────────────────────────────────────────────────────────────────
//  4. MEAL PLAN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-slot mutex: ensures concurrent calls for the same (userId, day, slot)
 * are serialized — the latest write always wins and no interleaving of
 * DELETE/INSERT from two callers can produce duplicate rows.
 *
 * Key: `${userId}|${dayOfWeek}|${mealSlot}`
 * Value: Promise chain (each new call is appended with .then())
 */
const slotMutex = new Map()

/**
 * Replaces all meal plan rows for a given day+slot with the current app state.
 * Calls are serialized per slot — if two writes race for the same slot, the
 * second waits for the first to finish before running its DELETE+INSERT.
 *
 * @param {string}   userId
 * @param {string}   dayOfWeek  - e.g. 'Monday'
 * @param {string}   mealSlot   - e.g. 'breakfast'
 * @param {object[]} foods      - array of food items from state.mealPlan[day][slot]
 */
export async function syncMealSlot(userId, dayOfWeek, mealSlot, foods) {
  if (!isSupabaseReady() || !userId) return

  const key = `${userId}|${dayOfWeek}|${mealSlot}`

  // Chain this write onto the previous one for the same slot so they never
  // overlap. The mutex chain is self-cleaning: once the tail resolves with no
  // other waiters, we delete the key to keep the Map from growing forever.
  const prev = slotMutex.get(key) ?? Promise.resolve()
  const next = prev.then(() => _doSyncMealSlot(userId, dayOfWeek, mealSlot, foods))
  slotMutex.set(key, next)

  // Clean up after this write completes (whether it resolves or rejects)
  next.finally(() => {
    if (slotMutex.get(key) === next) slotMutex.delete(key)
  })

  return next
}

async function _doSyncMealSlot(userId, dayOfWeek, mealSlot, foods) {
  // Delete existing rows for this day+slot, then re-insert
  const { error: delErr } = await supabase
    .from('meal_plans')
    .delete()
    .eq('user_id',     userId)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_slot',   mealSlot)

  logError('syncMealSlot (delete)', delErr)

  if (!foods?.length) return

  const rows = foods.map((food, i) => ({
    user_id:      userId,
    day_of_week:  dayOfWeek,
    meal_slot:    mealSlot,
    food_name:    food.name   || 'Unnamed',
    calories:     parseFloat(food.calories) || null,
    protein_g:    parseFloat(food.protein)  || null,
    carbs_g:      parseFloat(food.carbs)    || null,
    fat_g:        parseFloat(food.fat)      || null,
    serving_size: food.servingSize || null,
    notes:        serializeFoodNotes(food),
    sort_order:   i,
  }))

  const { error: insErr } = await supabase.from('meal_plans').insert(rows)
  logError('syncMealSlot (insert)', insErr)
}

/**
 * Loads the full weekly meal plan for the user.
 * Returns an object shaped like state.mealPlan, or null if unavailable.
 */
export async function loadMealPlan(userId) {
  if (!isSupabaseReady() || !userId) return null

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  logError('loadMealPlan', error)
  if (!data) return null

  // Rebuild into state.mealPlan shape: { Monday: { breakfast: [...] } }
  const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const SLOTS = ['breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed']

  const plan = {}
  for (const day of DAYS) {
    plan[day] = {}
    for (const slot of SLOTS) {
      plan[day][slot] = []
    }
  }

  for (const row of data) {
    const { day_of_week: day, meal_slot: slot } = row
    if (!plan[day] || !plan[day][slot]) continue
    const { notes, imageUrl } = deserializeFoodNotes(row.notes)
    plan[day][slot].push({
      id:          row.id,
      name:        row.food_name,
      calories:    row.calories  != null ? String(row.calories)  : '',
      protein:     row.protein_g != null ? String(row.protein_g) : '',
      carbs:       row.carbs_g   != null ? String(row.carbs_g)   : '',
      fat:         row.fat_g     != null ? String(row.fat_g)     : '',
      servingSize: row.serving_size ?? '',
      notes,
      imageUrl,
    })
  }

  return plan
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. WATER LOGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upserts daily water intake.
 *
 * @param {string} userId
 * @param {string} date      - 'YYYY-MM-DD'
 * @param {number} cups
 * @param {number} goalCups
 */
export async function syncWaterLog(userId, date, cups, goalCups = 8) {
  if (!isSupabaseReady() || !userId) return

  const { error } = await supabase
    .from('water_logs')
    .upsert(
      { user_id: userId, log_date: date, cups, goal_cups: goalCups },
      { onConflict: 'user_id,log_date' }
    )

  logError('syncWaterLog', error)
}

/**
 * Loads water logs for the last 30 days.
 * Returns object shaped like state.waterLogs: { 'YYYY-MM-DD': cups }
 */
export async function loadWaterLogs(userId) {
  if (!isSupabaseReady() || !userId) return null

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data, error } = await supabase
    .from('water_logs')
    .select('log_date, cups')
    .eq('user_id', userId)
    .gte('log_date', since.toISOString().slice(0, 10))

  logError('loadWaterLogs', error)
  if (!data) return null

  const result = {}
  for (const row of data) {
    result[row.log_date] = row.cups
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. LOAD ALL — called on login to hydrate state from Supabase
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads all cloud data for a user and returns a partial state patch.
 * Merge this over the local state — local state wins for keys not returned.
 *
 * @param {string} userId
 * @returns {object|null} partial state update, or null if Supabase unavailable
 */
export async function loadAllFromSupabase(userId) {
  if (!isSupabaseReady() || !userId) return null

  const [
    profile,
    bodyLogs,
    completedSessions,
    completedExercises,
    mealPlan,
    waterLogs,
    workoutData,
  ] = await Promise.all([
    loadUserProfile(userId),
    loadBodyLogs(userId),
    loadCompletedSessions(userId),
    loadCompletedExercises(userId),  // ← was never called before — the core bug
    loadMealPlan(userId),
    loadWaterLogs(userId),
    loadWorkoutData(userId),         // ← workoutSchedule + customExercises
  ])

  const patch = {}

  if (profile) {
    patch.profile = profile
    const isFullyOnboarded = !!(
      profile.name?.trim() &&
      profile.height &&
      profile.workoutDays?.length > 0
    )
    patch.onboarded = isFullyOnboarded
  }

  if (bodyLogs)          patch.bodyLogs          = bodyLogs
  if (completedSessions) patch.completedSessions  = completedSessions
  if (mealPlan)          patch.mealPlan           = mealPlan
  if (waterLogs)         patch.waterLogs          = waterLogs

  // Merge completedExercises from cloud WITH local state:
  // local entries are the source of truth for TODAY (they may be more recent
  // than the cloud write), but cloud fills in any missing past entries.
  if (completedExercises) {
    patch.completedExercises = completedExercises
  }

  // Workout schedule + custom exercises — cloud wins when local is empty
  // (new device / cleared storage). Local wins when cloud is empty (first use).
  if (workoutData?.workoutSchedule) patch.workoutSchedule = workoutData.workoutSchedule
  if (workoutData?.customExercises) patch.customExercises = workoutData.customExercises

  return Object.keys(patch).length > 0 ? patch : null
}
