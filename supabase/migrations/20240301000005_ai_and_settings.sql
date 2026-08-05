-- ============================================================
--  Migration: AI Usage Logs, App Settings, Notifications, Reports
-- ============================================================

-- ── ai_usage_logs ─────────────────────────────────────────────────────────────
create type public.ai_feature as enum ('exercise_recommendation','meal_recommendation','shopping_recommendation','chat','analysis','form_check','other');
create type public.ai_provider as enum ('gemini','openai','anthropic','local','other');

create table if not exists public.ai_usage_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  feature         public.ai_feature not null,
  provider        public.ai_provider not null default 'gemini',
  model           text,
  prompt_tokens   integer,
  completion_tokens integer,
  total_tokens    integer,
  latency_ms      integer,
  success         boolean not null default true,
  error_message   text,
  request_hash    text,          -- hash of prompt to detect duplicates
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

comment on table public.ai_usage_logs is 'Tracks all AI API calls for quota enforcement and analytics.';
create index idx_ai_usage_user_id    on public.ai_usage_logs(user_id);
create index idx_ai_usage_created_at on public.ai_usage_logs(created_at desc);
create index idx_ai_usage_feature    on public.ai_usage_logs(feature);
create index idx_ai_usage_date_user  on public.ai_usage_logs(user_id, created_at desc);

alter table public.ai_usage_logs enable row level security;
create policy "Users read own AI logs"   on public.ai_usage_logs for select using (auth.uid() = user_id);
create policy "System inserts AI logs"   on public.ai_usage_logs for insert with check (true);
create policy "Admins read all AI logs"  on public.ai_usage_logs for select using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── Function: check AI quota ──────────────────────────────────────────────────
create or replace function public.check_ai_quota(p_user_id uuid, p_feature public.ai_feature)
returns boolean language plpgsql security definer as $$
declare
  v_calls_today  integer;
  v_max_calls    integer;
begin
  -- Get user's plan limit
  select coalesce(sp.max_ai_calls_day, 5) into v_max_calls
  from public.user_subscriptions us
  join public.subscription_plans sp on sp.id = us.plan_id
  where us.user_id = p_user_id and us.status in ('active','trialing')
  order by sp.max_ai_calls_day desc
  limit 1;

  if v_max_calls is null then v_max_calls := 5; end if;

  -- Count today's calls
  select count(*) into v_calls_today
  from public.ai_usage_logs
  where user_id = p_user_id and success = true and date_trunc('day', created_at) = date_trunc('day', now());

  return v_calls_today < v_max_calls;
end;
$$;

-- ── app_settings ──────────────────────────────────────────────────────────────
create table if not exists public.app_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  description text,
  is_public   boolean not null default false,  -- visible to all users if true
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

comment on table public.app_settings is 'Global application settings managed by admins.';
-- Seed defaults
insert into public.app_settings (key, value, description, is_public) values
  ('maintenance_mode',   'false',                  'Disable app access for maintenance', false),
  ('min_app_version',    '"1.0.0"',                'Minimum required app version',       true),
  ('feature_flags',      '{"ai":true,"ads":true}', 'Feature flag overrides',             true),
  ('ai_default_model',   '"gemini-1.5-flash"',     'Default Gemini model',               false),
  ('max_file_upload_mb', '10',                     'Max file size for uploads',          true)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
create policy "Public settings readable by all"   on public.app_settings for select using (is_public = true);
create policy "Admins read all settings"          on public.app_settings for select using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));
create policy "Admins modify settings"            on public.app_settings for all using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── user_app_settings ─────────────────────────────────────────────────────────
create table if not exists public.user_app_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  settings    jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

comment on table public.user_app_settings is 'Per-user app settings stored server-side for cross-device sync.';
drop trigger if exists trg_user_app_settings_updated_at on public.user_app_settings;
create trigger trg_user_app_settings_updated_at before update on public.user_app_settings for each row execute procedure public.set_updated_at();

alter table public.user_app_settings enable row level security;
create policy "Users manage own app settings" on public.user_app_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── reports ───────────────────────────────────────────────────────────────────
create type public.report_type   as enum ('weekly_summary','monthly_summary','pr_history','nutrition_analysis','body_composition','ai_insights','custom');
create type public.report_format as enum ('json','pdf','csv');

create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  report_type     public.report_type not null,
  format          public.report_format not null default 'json',
  period_start    date,
  period_end      date,
  title           text,
  data            jsonb,                 -- cached report data
  storage_path    text,                  -- if exported to Storage
  generated_at    timestamptz not null default now(),
  expires_at      timestamptz default (now() + interval '30 days')
);

comment on table public.reports is 'Generated user reports, optionally cached in Storage.';
create index idx_reports_user_id      on public.reports(user_id);
create index idx_reports_type         on public.reports(report_type);
create index idx_reports_generated_at on public.reports(generated_at desc);
create index idx_reports_expires_at   on public.reports(expires_at) where expires_at is not null;

alter table public.reports enable row level security;
create policy "Users manage own reports" on public.reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read all reports"  on public.reports for select using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));
