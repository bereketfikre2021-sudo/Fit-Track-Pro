-- ============================================================
--  Migration: Complete RLS audit — ensure every table is locked
-- ============================================================

-- ── Helper: is_admin() function ───────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'super_admin')
      and (expires_at is null or expires_at > now())
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'super_admin'
      and (expires_at is null or expires_at > now())
  );
$$;

create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role::text from public.user_roles
  where user_id = auth.uid()
  order by case role when 'super_admin' then 4 when 'admin' then 3 when 'moderator' then 2 else 1 end desc
  limit 1;
$$;

-- ── Ensure RLS is ON for every table we've created ───────────────────────────

-- Already handled in individual migrations but re-assert for safety:
alter table public.users                  enable row level security;
alter table public.exercises              enable row level security;
alter table public.workout_schedule       enable row level security;
alter table public.workout_sessions       enable row level security;
alter table public.exercise_logs          enable row level security;
alter table public.sets                   enable row level security;
alter table public.meal_plans             enable row level security;
alter table public.nutrition_logs         enable row level security;
alter table public.body_logs              enable row level security;
alter table public.water_logs             enable row level security;
alter table public.workout_templates      enable row level security;
alter table public.notification_preferences enable row level security;

-- New tables from this migration set:
alter table public.user_roles             enable row level security;
alter table public.subscription_plans     enable row level security;
alter table public.user_subscriptions     enable row level security;
alter table public.payments               enable row level security;
alter table public.subscription_events    enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.foods                  enable row level security;
alter table public.ethiopian_foods        enable row level security;
alter table public.meal_logs              enable row level security;
alter table public.shopping_list_items    enable row level security;
alter table public.bmi_programs           enable row level security;
alter table public.user_bmi_programs      enable row level security;
alter table public.progress_photos        enable row level security;
alter table public.body_measurements      enable row level security;
alter table public.personal_records       enable row level security;
alter table public.ai_usage_logs          enable row level security;
alter table public.app_settings           enable row level security;
alter table public.user_app_settings      enable row level security;
alter table public.reports                enable row level security;
alter table public.storage_metadata       enable row level security;
alter table public.notifications          enable row level security;
alter table public.exercise_tags          enable row level security;
alter table public.exercise_likes         enable row level security;

-- ── Admin bypass policies on user-owned tables ────────────────────────────────
-- Admins can read all data for support and analytics.
-- They cannot write to user data (read-only admin access by default).

do $$
declare
  t text;
  tables text[] := array[
    'workout_sessions','exercise_logs','sets','meal_plans','nutrition_logs',
    'body_logs','water_logs','workout_templates','body_measurements',
    'personal_records','progress_photos','meal_logs','shopping_list_items',
    'user_bmi_programs','ai_usage_logs','reports','storage_metadata',
    'notification_preferences','user_app_settings'
  ];
begin
  foreach t in array tables loop
    execute format(
      'drop policy if exists "Admins read all %I" on public.%I; '
      'create policy "Admins read all %I" on public.%I for select using (public.is_admin());',
      t, t, t, t
    );
  end loop;
end;
$$;

-- ── Session security: block anonymous / unverified access to sensitive tables ─
-- These tables require a confirmed email (email_confirmed_at is not null).
-- OAuth users bypass this automatically (confirmed_at is set by Google).

create or replace function public.is_verified_user()
returns boolean language sql security definer stable as $$
  select (
    select email_confirmed_at is not null
    from auth.users where id = auth.uid()
  );
$$;

-- ── Revoke access to sensitive tables if email unverified ─────────────────────
-- payments and subscriptions require verified email
drop policy if exists "Verified users read own payments" on public.payments;
create policy "Verified users read own payments"
  on public.payments for select
  using (auth.uid() = user_id and public.is_verified_user());

drop policy if exists "Verified users read own subscriptions" on public.user_subscriptions;
create policy "Verified users read own subscriptions"
  on public.user_subscriptions for select
  using (auth.uid() = user_id and public.is_verified_user());

-- ── Rate limiting via RLS on ai_usage_logs inserts ───────────────────────────
-- Prevents client-side abuse — server Edge Function should do quota check too.
drop policy if exists "Users can insert own AI logs within quota" on public.ai_usage_logs;
create policy "Users can insert own AI logs within quota"
  on public.ai_usage_logs for insert
  with check (
    auth.uid() = user_id
    and public.is_verified_user()
    and public.check_ai_quota(auth.uid(), feature)
  );

-- ── Immutability: prevent updates/deletes on audit_logs ──────────────────────
-- audit_logs is append-only — no updates or deletes allowed for anyone.
drop policy if exists "No updates on audit_logs" on public.audit_logs;
create policy "No updates on audit_logs"
  on public.audit_logs for update using (false);

drop policy if exists "No deletes on audit_logs" on public.audit_logs;
create policy "No deletes on audit_logs"
  on public.audit_logs for delete using (false);

-- Same for subscription_events:
drop policy if exists "No updates on sub events" on public.subscription_events;
create policy "No updates on sub events"
  on public.subscription_events for update using (false);

drop policy if exists "No deletes on sub events" on public.subscription_events;
create policy "No deletes on sub events"
  on public.subscription_events for delete using (false);

-- ── Prevent users from granting themselves admin ─────────────────────────────
drop policy if exists "Users cannot self-grant roles" on public.user_roles;
create policy "Users cannot self-grant roles"
  on public.user_roles for insert
  with check (public.is_admin());

drop policy if exists "Only admins can delete roles" on public.user_roles;
create policy "Only admins can delete roles"
  on public.user_roles for delete
  using (public.is_admin());

-- ── Global preset data: admins only can modify ────────────────────────────────
drop policy if exists "Admins manage bmi programs" on public.bmi_programs;
create policy "Admins manage bmi programs"
  on public.bmi_programs for all
  using (public.is_admin());

drop policy if exists "Admins manage app settings" on public.app_settings;
create policy "Admins manage app settings"
  on public.app_settings for all
  using (public.is_admin());
