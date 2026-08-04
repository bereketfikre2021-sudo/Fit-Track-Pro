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

// ─────────────────────────────────────────────────────────────────────────────
//  4. MEAL PLAN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replaces all meal plan rows for a given day+slot with the current app state.
 * Called whenever a meal slot is updated.
 *
 * @param {string}   userId
 * @param {string}   dayOfWeek  - e.g. 'Monday'
 * @param {string}   mealSlot   - e.g. 'breakfast'
 * @param {object[]} foods      - array of food items from state.mealPlan[day][slot]
 */
export async function syncMealSlot(userId, dayOfWeek, mealSlot, foods) {
  if (!isSupabaseReady() || !userId) return

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
    user_id:     userId,
    day_of_week: dayOfWeek,
    meal_slot:   mealSlot,
    food_name:   food.name   || 'Unnamed',
    calories:    parseFloat(food.calories) || null,
    protein_g:   parseFloat(food.protein)  || null,
    carbs_g:     parseFloat(food.carbs)    || null,
    fat_g:       parseFloat(food.fat)      || null,
    serving_size: food.servingSize || null,
    notes:       food.notes || null,
    sort_order:  i,
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
    plan[day][slot].push({
      id:          row.id,
      name:        row.food_name,
      calories:    row.calories  != null ? String(row.calories)  : '',
      protein:     row.protein_g != null ? String(row.protein_g) : '',
      carbs:       row.carbs_g   != null ? String(row.carbs_g)   : '',
      fat:         row.fat_g     != null ? String(row.fat_g)     : '',
      servingSize: row.serving_size ?? '',
      notes:       row.notes ?? '',
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

  const [profile, bodyLogs, completedSessions, mealPlan, waterLogs] = await Promise.all([
    loadUserProfile(userId),
    loadBodyLogs(userId),
    loadCompletedSessions(userId),
    loadMealPlan(userId),
    loadWaterLogs(userId),
  ])

  const patch = {}

  if (profile) {
    patch.profile = profile
    // Only mark as onboarded if the profile has been fully filled out
    // (has height + workoutDays). A Google sign-in creates a profile row
    // with just a name — that user still needs to go through onboarding.
    const isFullyOnboarded = !!(
      profile.name?.trim() &&
      profile.height &&
      profile.workoutDays?.length > 0
    )
    patch.onboarded = isFullyOnboarded
  }

  if (bodyLogs)          patch.bodyLogs         = bodyLogs
  if (completedSessions) patch.completedSessions = completedSessions
  if (mealPlan)          patch.mealPlan          = mealPlan
  if (waterLogs)         patch.waterLogs         = waterLogs

  return Object.keys(patch).length > 0 ? patch : null
}
