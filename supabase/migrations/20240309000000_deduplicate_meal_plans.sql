-- ============================================================
--  Migration: Deduplicate meal_plans rows and add unique constraint
--  Safe to re-run — all statements are idempotent.
--
--  Root cause being fixed:
--    Concurrent DELETE+INSERT calls on the same (user_id, day_of_week,
--    meal_slot) slot could race and produce duplicate rows in the DB.
--    The app-side mutex (supabaseDb.js slotMutex) prevents this going
--    forward, but existing rows need to be cleaned up first.
-- ============================================================

-- ── Step 1: Remove duplicate rows, keeping the one with the lowest sort_order
--            per (user_id, day_of_week, meal_slot, food_name, calories).
--            Uses a CTE to identify duplicates without touching unique rows.
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.meal_plans
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by
          user_id,
          day_of_week,
          meal_slot,
          food_name,
          coalesce(calories::text, '')
        order by sort_order asc, created_at asc
      ) as rn
    from public.meal_plans
  ) ranked
  where rn > 1
);

-- ── Step 2: Add a unique constraint on (user_id, day_of_week, meal_slot,
--            sort_order) so the DB itself rejects any future duplicates at
--            the same position within a slot.
--            We use IF NOT EXISTS via a DO block for idempotency.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1
    from   pg_constraint
    where  conname = 'meal_plans_user_day_slot_order_key'
  ) then
    alter table public.meal_plans
      add constraint meal_plans_user_day_slot_order_key
      unique (user_id, day_of_week, meal_slot, sort_order);
  end if;
end $$;

-- ── Step 3: Index to speed up the per-slot DELETE that syncMealSlot runs
--            before every re-insert (already exists in some deployments,
--            so we use IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_meal_plans_user_day_slot
  on public.meal_plans (user_id, day_of_week, meal_slot);

notify pgrst, 'reload schema';
