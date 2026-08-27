-- ============================================================
--  Migration: Admin Read Policies — User Data Tables
--  Ensures admins can read all user-owned tables for support
--  and analytics. Idempotent (DROP IF EXISTS before CREATE).
--
--  Tables covered that were missing from the original loop:
--    meal_plans, nutrition_logs, workout_sessions (explicit),
--    exercise_logs, sets, body_logs, ai_usage_logs, meal_logs
-- ============================================================

-- ── is_admin() helper (re-create idempotently) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','super_admin','moderator')
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- ── meal_plans ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all meal_plans" ON public.meal_plans;
CREATE POLICY "Admins read all meal_plans"
  ON public.meal_plans FOR SELECT
  USING (public.is_admin());

-- ── nutrition_logs ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.nutrition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users all own nutrition_logs" ON public.nutrition_logs;
CREATE POLICY "Users all own nutrition_logs"
  ON public.nutrition_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all nutrition_logs" ON public.nutrition_logs;
CREATE POLICY "Admins read all nutrition_logs"
  ON public.nutrition_logs FOR SELECT
  USING (public.is_admin());

-- ── workout_sessions ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all workout_sessions" ON public.workout_sessions;
CREATE POLICY "Admins read all workout_sessions"
  ON public.workout_sessions FOR SELECT
  USING (public.is_admin());

-- ── exercise_logs ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all exercise_logs" ON public.exercise_logs;
CREATE POLICY "Admins read all exercise_logs"
  ON public.exercise_logs FOR SELECT
  USING (public.is_admin());

-- ── body_logs ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all body_logs" ON public.body_logs;
CREATE POLICY "Admins read all body_logs"
  ON public.body_logs FOR SELECT
  USING (public.is_admin());

-- ── ai_usage_logs ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "Admins read all ai_usage_logs"
  ON public.ai_usage_logs FOR SELECT
  USING (public.is_admin());

-- ── water_logs ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all water_logs" ON public.water_logs;
CREATE POLICY "Admins read all water_logs"
  ON public.water_logs FOR SELECT
  USING (public.is_admin());

-- ── progress_photos ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all progress_photos" ON public.progress_photos;
CREATE POLICY "Admins read all progress_photos"
  ON public.progress_photos FOR SELECT
  USING (public.is_admin());

-- ── personal_records ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all personal_records" ON public.personal_records;
CREATE POLICY "Admins read all personal_records"
  ON public.personal_records FOR SELECT
  USING (public.is_admin());

-- ── notifications ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all notifications" ON public.notifications;
CREATE POLICY "Admins read all notifications"
  ON public.notifications FOR SELECT
  USING (public.is_admin());

-- ── audit_logs ────────────────────────────────────────────────────────────────
-- Admins already have insert via security-definer RPCs.
-- Allow admins to read all audit logs for investigation.
DROP POLICY IF EXISTS "Admins read all audit_logs" ON public.audit_logs;
CREATE POLICY "Admins read all audit_logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- ── payments ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all payments" ON public.payments;
CREATE POLICY "Admins read all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin());

-- ── payment_submissions ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all payment_submissions" ON public.payment_submissions;
CREATE POLICY "Admins read all payment_submissions"
  ON public.payment_submissions FOR SELECT
  USING (public.is_admin());

-- ── user_subscriptions ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins read all user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins read all user_subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (public.is_admin());

NOTIFY pgrst, 'reload schema';
