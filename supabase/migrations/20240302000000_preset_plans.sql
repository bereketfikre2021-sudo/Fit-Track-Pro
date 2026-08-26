-- ─────────────────────────────────────────────────────────────────────────────
-- preset_plans table
--
-- Stores admin-editable versions of the built-in preset meal plans,
-- shopping lists, and exercise sets. The frontend falls back to the
-- hardcoded JS constants when this table has no matching row.
--
-- Primary key is a human-readable id like 'weight-gain' or 'weight-loss'
-- combined with the type, making it easy to look up from the frontend.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.preset_plans (
  id                    TEXT         PRIMARY KEY,           -- e.g. 'weight-gain', 'weight-loss', 'exercise-weight-gain'
  type                  TEXT         NOT NULL               -- 'meal' | 'shopping' | 'exercise'
                                     CHECK (type IN ('meal', 'shopping', 'exercise')),
  name                  TEXT         NOT NULL,
  name_am               TEXT,
  description           TEXT,
  description_am        TEXT,
  tags                  TEXT[],
  tags_am               TEXT[],
  target_goals          TEXT[]       NOT NULL DEFAULT '{}',
  target_bmi_categories TEXT[]       NOT NULL DEFAULT '{}',
  image_url             TEXT,
  data                  JSONB        NOT NULL DEFAULT '{}',  -- days / categories / exercises
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for type-based lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS preset_plans_type_idx ON public.preset_plans (type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_preset_plans()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS preset_plans_updated_at ON public.preset_plans;
CREATE TRIGGER preset_plans_updated_at
  BEFORE UPDATE ON public.preset_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_preset_plans();

-- RLS: public read (frontend needs it), authenticated write (admin only)
ALTER TABLE public.preset_plans ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies cleanly
DROP POLICY IF EXISTS "Anyone can read preset_plans"                ON public.preset_plans;
DROP POLICY IF EXISTS "Authenticated users can write preset_plans"  ON public.preset_plans;
DROP POLICY IF EXISTS "Authenticated users can insert preset_plans" ON public.preset_plans;
DROP POLICY IF EXISTS "Authenticated users can update preset_plans" ON public.preset_plans;
DROP POLICY IF EXISTS "Authenticated users can delete preset_plans" ON public.preset_plans;
DROP POLICY IF EXISTS "preset_plans_select"                         ON public.preset_plans;
DROP POLICY IF EXISTS "preset_plans_insert"                         ON public.preset_plans;
DROP POLICY IF EXISTS "preset_plans_update"                         ON public.preset_plans;
DROP POLICY IF EXISTS "preset_plans_delete"                         ON public.preset_plans;

-- Public read
CREATE POLICY "preset_plans_select"
  ON public.preset_plans FOR SELECT
  USING (true);

-- Write policies use auth.uid() IS NOT NULL (checks JWT, works with anon-key client)
-- No TO authenticated — that checks Postgres role which is always 'anon' with anon-key clients
CREATE POLICY "preset_plans_insert"
  ON public.preset_plans FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "preset_plans_update"
  ON public.preset_plans FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "preset_plans_delete"
  ON public.preset_plans FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Ensure grants are in place
GRANT SELECT ON public.preset_plans TO anon;
GRANT ALL    ON public.preset_plans TO authenticated;

-- Enable Realtime so frontend can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.preset_plans;
