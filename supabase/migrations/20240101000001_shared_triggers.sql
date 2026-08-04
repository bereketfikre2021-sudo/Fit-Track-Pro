-- ============================================================
--  Migration 002 — Shared trigger function: updated_at
--  Used by multiple tables — must exist before they are created.
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
