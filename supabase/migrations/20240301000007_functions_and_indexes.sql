-- ============================================================
--  Migration: Final Functions, Composite Indexes, Admin Views
-- ============================================================

-- ── Composite indexes for common query patterns ───────────────────────────────
create index if not exists idx_body_logs_user_date_composite
  on public.body_logs(user_id, log_date desc);

create index if not exists idx_workout_sessions_user_date_composite
  on public.workout_sessions(user_id, session_date desc);

create index if not exists idx_meal_plans_user_day_slot
  on public.meal_plans(user_id, day_of_week, meal_slot);

create index if not exists idx_exercise_logs_user_date_composite
  on public.exercise_logs(user_id, log_date desc);

-- ── Function: get user dashboard stats ───────────────────────────────────────
create or replace function public.get_user_dashboard_stats(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_sessions',      (select count(*) from public.workout_sessions where user_id = p_user_id and not skipped),
    'sessions_this_week',  (select count(*) from public.workout_sessions where user_id = p_user_id and not skipped and session_date >= date_trunc('week', current_date)),
    'current_weight',      (select weight_kg from public.body_logs where user_id = p_user_id order by log_date desc limit 1),
    'total_prs',           (select count(*) from public.personal_records where user_id = p_user_id),
    'ai_calls_today',      (select count(*) from public.ai_usage_logs where user_id = p_user_id and success and created_at::date = current_date),
    'subscription_tier',   (select sp.tier from public.user_subscriptions us join public.subscription_plans sp on sp.id = us.plan_id where us.user_id = p_user_id and us.status in ('active','trialing') order by sp.max_ai_calls_day desc limit 1),
    'unread_notifications', (select count(*) from public.notifications where user_id = p_user_id and not is_read)
  ) into v_result;
  return v_result;
end;
$$;

-- ── Function: full text search on exercises ────────────────────────────────────
create index if not exists idx_exercises_fts
  on public.exercises using gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(muscle_group,'') || ' ' || coalesce(equipment,'')));

create or replace function public.search_exercises(p_query text, p_limit integer default 20)
returns setof public.exercises language sql security definer as $$
  select * from public.exercises
  where deleted_at is null
    and to_tsvector('english', coalesce(name,'') || ' ' || coalesce(muscle_group,'') || ' ' || coalesce(equipment,''))
        @@ plainto_tsquery('english', p_query)
  order by is_featured desc, like_count desc
  limit p_limit;
$$;

-- ── Function: delete expired reports ─────────────────────────────────────────
create or replace function public.cleanup_expired_reports()
returns integer language plpgsql security definer as $$
declare v_count integer;
begin
  delete from public.reports where expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Admin view: user overview ─────────────────────────────────────────────────
create or replace view public.v_admin_user_overview as
select
  u.id                                     as user_id,
  u.email,
  u.created_at                             as registered_at,
  u.last_sign_in_at,
  ur.role,
  sp.tier                                  as subscription_tier,
  us.status                                as subscription_status,
  (select count(*) from public.workout_sessions ws where ws.user_id = u.id) as total_sessions,
  (select count(*) from public.ai_usage_logs al where al.user_id = u.id)    as total_ai_calls
from auth.users u
left join public.user_roles ur on ur.user_id = u.id
left join public.user_subscriptions us on us.user_id = u.id and us.status in ('active','trialing')
left join public.subscription_plans sp on sp.id = us.plan_id;

-- This view is admin-only — accessed via service role key in Edge Functions.

-- ── Admin view: revenue summary ───────────────────────────────────────────────
create or replace view public.v_admin_revenue as
select
  date_trunc('month', created_at)::date as month,
  provider,
  status,
  count(*)                              as payment_count,
  sum(amount_usd)                       as total_usd,
  sum(refunded_amount)                  as total_refunded_usd
from public.payments
group by month, provider, status
order by month desc;

-- ── Trigger: auto audit on user_subscriptions ────────────────────────────────
create or replace function public.audit_subscription_change()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_logs(user_id, action, table_name, record_id, old_values, new_values)
  values (
    coalesce(new.user_id, old.user_id),
    case tg_op when 'INSERT' then 'insert' when 'UPDATE' then 'update' else 'delete' end::public.audit_action,
    'user_subscriptions',
    coalesce(new.id, old.id),
    case when tg_op != 'INSERT' then to_jsonb(old) end,
    case when tg_op != 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_subscriptions on public.user_subscriptions;
create trigger trg_audit_subscriptions
  after insert or update or delete on public.user_subscriptions
  for each row execute procedure public.audit_subscription_change();

-- ── Trigger: auto audit on payments ──────────────────────────────────────────
drop trigger if exists trg_audit_payments on public.payments;
create trigger trg_audit_payments
  after insert or update or delete on public.payments
  for each row execute procedure public.audit_subscription_change();

-- ── Grant execute on functions to authenticated users ────────────────────────
grant execute on function public.get_user_dashboard_stats(uuid)         to authenticated;
grant execute on function public.search_exercises(text, integer)        to authenticated;
grant execute on function public.check_ai_quota(uuid, public.ai_feature) to authenticated;
grant execute on function public.mark_notification_read(uuid)           to authenticated;
grant execute on function public.mark_all_notifications_read()          to authenticated;
grant execute on function public.upsert_personal_record(uuid,uuid,text,numeric,text,uuid,uuid) to authenticated;
grant execute on function public.soft_delete_exercise(uuid)             to authenticated;
