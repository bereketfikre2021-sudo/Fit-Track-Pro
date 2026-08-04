-- ============================================================
--  Migration 011 — auto-create user profile on sign-up
--  Fires after Supabase creates a row in auth.users.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- runs as DB owner so it can write to public.users
set search_path = public  -- prevents search-path hijacking
as $$
begin
  insert into public.users (id, name, registration_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    current_date
  )
  on conflict (id) do nothing;   -- safe to re-run

  return new;
end;
$$;

-- Drop first so this migration is idempotent (re-runnable)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
