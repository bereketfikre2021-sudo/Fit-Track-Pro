-- ============================================================
--  Migration: Exercise Library (extended)
-- ============================================================

create type public.exercise_category as enum ('strength','cardio','mobility','sport','yoga','pilates','crossfit','other');
create type public.difficulty_level  as enum ('beginner','intermediate','advanced','elite');
create type public.equipment_type    as enum ('barbell','dumbbell','machine','cable','bodyweight','kettlebell','bands','trx','foam_roller','box','battle_ropes','sled','other');
create type public.muscle_group      as enum ('chest','back','shoulders','biceps','triceps','forearms','core','glutes','quads','hamstrings','calves','full_body','other');

-- ── exercises (extended from existing) ───────────────────────────────────────
-- Drop if cols missing — add new columns to existing exercises table
alter table public.exercises
  add column if not exists category        public.exercise_category default 'strength',
  add column if not exists difficulty      public.difficulty_level  default 'beginner',
  add column if not exists equipment_type  public.equipment_type    default 'bodyweight',
  add column if not exists secondary_muscles text[],
  add column if not exists instructions    text,
  add column if not exists tips            text,
  add column if not exists video_url       text,
  add column if not exists thumbnail_url   text,
  add column if not exists met_value       numeric(4,1),        -- metabolic equivalent
  add column if not exists calories_per_min numeric(5,2),
  add column if not exists is_compound     boolean not null default false,
  add column if not exists view_count      integer not null default 0,
  add column if not exists like_count      integer not null default 0,
  add column if not exists is_featured     boolean not null default false,
  add column if not exists deleted_at      timestamptz;          -- soft delete

comment on column public.exercises.deleted_at is 'Soft delete — null means active.';
create index if not exists idx_exercises_category    on public.exercises(category);
create index if not exists idx_exercises_difficulty  on public.exercises(difficulty);
create index if not exists idx_exercises_deleted_at  on public.exercises(deleted_at) where deleted_at is null;
create index if not exists idx_exercises_is_featured on public.exercises(is_featured) where is_featured = true;

-- ── exercise_tags ─────────────────────────────────────────────────────────────
create table if not exists public.exercise_tags (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  tag         text not null,
  unique (exercise_id, tag)
);
create index idx_exercise_tags_exercise_id on public.exercise_tags(exercise_id);
create index idx_exercise_tags_tag         on public.exercise_tags(tag);

alter table public.exercise_tags enable row level security;
create policy "Read all exercise tags" on public.exercise_tags for select using (true);
create policy "Users manage own exercise tags" on public.exercise_tags for all
  using (exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = auth.uid())));

-- ── exercise_likes ────────────────────────────────────────────────────────────
create table if not exists public.exercise_likes (
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
create index idx_exercise_likes_exercise on public.exercise_likes(exercise_id);

alter table public.exercise_likes enable row level security;
create policy "Users manage own likes" on public.exercise_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Anyone reads likes" on public.exercise_likes for select using (true);

-- ── workout_templates (extended) ─────────────────────────────────────────────
alter table public.workout_templates
  add column if not exists is_public    boolean not null default false,
  add column if not exists category     public.exercise_category default 'strength',
  add column if not exists difficulty   public.difficulty_level  default 'beginner',
  add column if not exists duration_min integer,
  add column if not exists view_count   integer not null default 0,
  add column if not exists fork_count   integer not null default 0,
  add column if not exists forked_from  uuid references public.workout_templates(id),
  add column if not exists tags         text[],
  add column if not exists deleted_at   timestamptz;

create index if not exists idx_templates_is_public  on public.workout_templates(is_public) where is_public = true;
create index if not exists idx_templates_deleted_at on public.workout_templates(deleted_at) where deleted_at is null;
create index if not exists idx_templates_category   on public.workout_templates(category);

-- ── View: public exercise library ────────────────────────────────────────────
create or replace view public.v_exercise_library as
select
  e.id, e.name, e.muscle_group, e.equipment, e.category, e.difficulty,
  e.phase, e.is_time_based, e.is_compound, e.is_featured,
  e.view_count, e.like_count, e.video_url, e.thumbnail_url,
  e.instructions, e.tips, e.met_value,
  (e.user_id is null) as is_global,
  array_agg(et.tag) filter (where et.tag is not null) as tags
from public.exercises e
left join public.exercise_tags et on et.exercise_id = e.id
where e.deleted_at is null
group by e.id;

comment on view public.v_exercise_library is 'All non-deleted exercises with aggregated tags.';

-- ── Function: soft-delete exercise ───────────────────────────────────────────
create or replace function public.soft_delete_exercise(p_exercise_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.exercises set deleted_at = now() where id = p_exercise_id and (user_id = auth.uid() or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));
end;
$$;
