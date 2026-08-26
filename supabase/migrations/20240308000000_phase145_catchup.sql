-- ============================================================
--  Migration: Phase 14.5 Catch-Up
--  Applies all missing Phase 14.5 columns to existing tables.
--
--  SAFE TO RUN MULTIPLE TIMES — every statement uses IF NOT EXISTS
--  or DO $$ BEGIN ... EXCEPTION WHEN duplicate_column THEN NULL; END $$
--  so this is fully idempotent.
--
--  Covers:
--    1. submission_purpose enum
--    2. payment_submissions new columns
--    3. wallet_transaction_type / wallet_transaction_status enums
--    4. wallets table
--    5. wallet_ledger table
--    6. subscription_duration enum
--    7. subscription_purchase_options table
--    8. user_subscriptions new columns
--    9. ensure_wallet() function
--   10. get_wallet_balance() function
--   11. update_auto_renew() function
--   12. Grants
-- ============================================================

-- ── 1. submission_purpose enum ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.submission_purpose AS ENUM (
    'subscription_purchase',
    'wallet_topup'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. payment_submissions new columns ───────────────────────────────────────

-- purpose
DO $$ BEGIN
  ALTER TABLE public.payment_submissions
    ADD COLUMN purpose public.submission_purpose NOT NULL DEFAULT 'subscription_purchase';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Make plan_id nullable (wallet top-ups don't need a plan)
ALTER TABLE public.payment_submissions
  ALTER COLUMN plan_id DROP NOT NULL;

-- topup_amount_etb
DO $$ BEGIN
  ALTER TABLE public.payment_submissions
    ADD COLUMN topup_amount_etb numeric(12,2)
      CHECK (topup_amount_etb IS NULL OR topup_amount_etb > 0);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- wallet_id FK (added after wallets table is created below — deferred via DO block)
-- We add this after creating the wallets table.

-- purchase_option_id (added after subscription_purchase_options is created below)

-- ── 3. wallet_transaction_type enum ──────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.wallet_transaction_type AS ENUM (
    'TOP_UP',
    'SUBSCRIPTION_PURCHASE',
    'SUBSCRIPTION_RENEWAL',
    'REFUND',
    'ADJUSTMENT',
    'REVERSAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. wallet_transaction_status enum ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.wallet_transaction_status AS ENUM (
    'COMPLETED',
    'PENDING',
    'FAILED',
    'REVERSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. wallets table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance     numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  currency    char(3)       NOT NULL DEFAULT 'ETB',
  status      text          NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'frozen', 'closed')),
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own wallet"
    ON public.wallets FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins read all wallets"
    ON public.wallets FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins update wallet status"
    ON public.wallets FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT ON public.wallets TO authenticated;

-- ── 6. wallet_ledger table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id               uuid          NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  user_id                 uuid          NOT NULL REFERENCES auth.users(id)  ON DELETE RESTRICT,
  type                    public.wallet_transaction_type   NOT NULL,
  status                  public.wallet_transaction_status NOT NULL DEFAULT 'COMPLETED',
  amount                  numeric(14,2) NOT NULL CHECK (amount != 0),
  currency                char(3)       NOT NULL DEFAULT 'ETB',
  balance_before          numeric(14,2) NOT NULL CHECK (balance_before >= 0),
  balance_after           numeric(14,2) NOT NULL CHECK (balance_after  >= 0),
  reference               text,
  related_payment_id      uuid          REFERENCES public.payments(id)           ON DELETE SET NULL,
  related_submission_id   uuid          REFERENCES public.payment_submissions(id) ON DELETE SET NULL,
  related_subscription_id uuid          REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  reversed_by             uuid          REFERENCES public.wallet_ledger(id)      ON DELETE SET NULL,
  reverses                uuid          REFERENCES public.wallet_ledger(id)      ON DELETE SET NULL,
  description             text,
  idempotency_key         text          UNIQUE,
  initiated_by            text          NOT NULL DEFAULT 'system',
  created_at              timestamptz   NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX idx_wallet_ledger_wallet_id  ON public.wallet_ledger(wallet_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX idx_wallet_ledger_user_id    ON public.wallet_ledger(user_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX idx_wallet_ledger_created_at ON public.wallet_ledger(created_at DESC);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Immutability trigger function
CREATE OR REPLACE FUNCTION public.prevent_wallet_ledger_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Allow only reversal-tracking column changes
  IF (
    OLD.wallet_id      = NEW.wallet_id AND
    OLD.user_id        = NEW.user_id AND
    OLD.type           = NEW.type AND
    OLD.amount         = NEW.amount AND
    OLD.currency       = NEW.currency AND
    OLD.balance_before = NEW.balance_before AND
    OLD.balance_after  = NEW.balance_after AND
    OLD.created_at     = NEW.created_at
  ) THEN
    RETURN NEW; -- only reversal-tracking columns changed: allow
  END IF;
  RAISE EXCEPTION 'wallet_ledger rows are immutable — use REVERSAL or ADJUSTMENT transactions';
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_wallet_ledger_immutable_update
    BEFORE UPDATE ON public.wallet_ledger
    FOR EACH ROW EXECUTE PROCEDURE public.prevent_wallet_ledger_modification();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_wallet_ledger_immutable_delete
    BEFORE DELETE ON public.wallet_ledger
    FOR EACH ROW EXECUTE PROCEDURE public.prevent_wallet_ledger_modification();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own wallet ledger"
    ON public.wallet_ledger FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins read all wallet ledger"
    ON public.wallet_ledger FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT ON public.wallet_ledger TO authenticated;

-- ── 7. Now add wallet_id FK to payment_submissions ───────────────────────────
DO $$ BEGIN
  ALTER TABLE public.payment_submissions
    ADD COLUMN wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 8. subscription_duration enum ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.subscription_duration AS ENUM (
    '1_month',
    '3_months',
    '6_months',
    '12_months'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 9. subscription_purchase_options table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_purchase_options (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          uuid          NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  duration         public.subscription_duration NOT NULL,
  duration_months  integer       NOT NULL CHECK (duration_months IN (1,3,6,12)),
  price_etb        numeric(12,2) NOT NULL CHECK (price_etb >= 0),
  currency         char(3)       NOT NULL DEFAULT 'ETB',
  discount_pct     integer       CHECK (discount_pct BETWEEN 0 AND 99),
  is_active        boolean       NOT NULL DEFAULT true,
  display_order    integer       NOT NULL DEFAULT 0,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (plan_id, duration)
);

DO $$ BEGIN
  CREATE TRIGGER trg_spo_updated_at
    BEFORE UPDATE ON public.subscription_purchase_options
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.subscription_purchase_options ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone reads active purchase options"
    ON public.subscription_purchase_options FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage purchase options"
    ON public.subscription_purchase_options FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT ON public.subscription_purchase_options TO anon, authenticated;

-- Seed purchase options from existing plans (skip if already seeded)
INSERT INTO public.subscription_purchase_options
  (plan_id, duration, duration_months, price_etb, currency, discount_pct, is_active, display_order)
SELECT
  sp.id,
  d.duration,
  d.months,
  ROUND(sp.price_monthly_usd * d.months * (1 - d.discount::numeric / 100), 2),
  'ETB',
  d.discount,
  true,
  d.disp_order
FROM public.subscription_plans sp
CROSS JOIN (
  VALUES
    ('1_month'::public.subscription_duration,  1,  0, 1),
    ('3_months'::public.subscription_duration, 3,  5, 2),
    ('6_months'::public.subscription_duration, 6, 10, 3),
    ('12_months'::public.subscription_duration,12,15, 4)
) AS d(duration, months, discount, disp_order)
WHERE sp.tier != 'free'
ON CONFLICT (plan_id, duration) DO NOTHING;

-- ── 10. purchase_option_id on payment_submissions ─────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.payment_submissions
    ADD COLUMN purchase_option_id uuid
      REFERENCES public.subscription_purchase_options(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 11. user_subscriptions new columns ───────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.user_subscriptions
    ADD COLUMN duration_months integer DEFAULT 1 CHECK (duration_months IN (1,3,6,12));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_subscriptions
    ADD COLUMN purchase_option_id uuid
      REFERENCES public.subscription_purchase_options(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_subscriptions
    ADD COLUMN price_paid_etb numeric(12,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_subscriptions
    ADD COLUMN auto_renew boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 12. Constraint: top-up must have amount, sub-purchase must have plan ─────
-- Add safely — drop first if exists with different definition
ALTER TABLE public.payment_submissions
  DROP CONSTRAINT IF EXISTS chk_submission_purpose_fields;

ALTER TABLE public.payment_submissions
  ADD CONSTRAINT chk_submission_purpose_fields CHECK (
    (purpose = 'wallet_topup'          AND topup_amount_etb IS NOT NULL) OR
    (purpose = 'subscription_purchase' AND plan_id IS NOT NULL) OR
    -- Allow rows that were inserted before purpose column existed (plan_id present)
    (purpose = 'subscription_purchase' AND plan_id IS NULL AND topup_amount_etb IS NULL)
  );

-- ── 13. ensure_wallet() function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_wallet(p_user_id uuid)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet public.wallets;
BEGIN
  INSERT INTO public.wallets (user_id, balance, currency, status)
  VALUES (p_user_id, 0.00, 'ETB', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  RETURN v_wallet;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_wallet(uuid) TO authenticated, service_role;

-- ── 14. get_wallet_balance() function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet record;
BEGIN
  IF auth.uid() != p_user_id AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exists',   false,
      'balance',  0,
      'currency', 'ETB',
      'status',   'active'
    );
  END IF;

  RETURN jsonb_build_object(
    'exists',    true,
    'wallet_id', v_wallet.id,
    'balance',   v_wallet.balance,
    'currency',  v_wallet.currency,
    'status',    v_wallet.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO authenticated;

-- ── 15. update_auto_renew() function ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_auto_renew(p_user_id uuid, p_auto_renew boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.user_subscriptions
  SET auto_renew = p_auto_renew,
      updated_at = now()
  WHERE user_id = p_user_id
    AND status IN ('active','trialing');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_auto_renew(uuid, boolean) TO authenticated;

-- ── 16. v_subscription_purchase_options view ─────────────────────────────────
CREATE OR REPLACE VIEW public.v_subscription_purchase_options AS
SELECT
  spo.id,
  spo.plan_id,
  sp.name            AS plan_name,
  sp.tier            AS plan_tier,
  sp.features        AS plan_features,
  sp.max_ai_calls_day,
  sp.max_devices,
  spo.duration,
  spo.duration_months,
  spo.price_etb,
  spo.currency,
  spo.discount_pct,
  ROUND(spo.price_etb / spo.duration_months, 2) AS effective_monthly_etb,
  spo.is_active,
  spo.display_order,
  spo.created_at,
  spo.updated_at
FROM public.subscription_purchase_options spo
JOIN public.subscription_plans sp ON sp.id = spo.plan_id
WHERE spo.is_active = true
  AND sp.is_active  = true
ORDER BY sp.price_monthly_usd, spo.display_order;

GRANT SELECT ON public.v_subscription_purchase_options TO anon, authenticated;

-- ── 17. v_wallet_topup_requests view ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_wallet_topup_requests AS
SELECT
  ps.id                   AS submission_id,
  ps.user_id,
  ps.wallet_id,
  ps.topup_amount_etb     AS amount_etb,
  ps.currency,
  ps.payment_method_id,
  apm.name                AS payment_method_name,
  apm.type                AS payment_method_type,
  ps.transaction_ref,
  ps.payment_date,
  ps.proof_path,
  ps.note,
  ps.status,
  ps.submitted_at,
  ps.verified_by,
  ps.verified_at,
  ps.verification_note,
  ps.rejection_reason,
  ps.rejection_reason_custom,
  ps.is_duplicate_suspect,
  ps.created_at,
  ps.updated_at
FROM public.payment_submissions ps
JOIN public.app_payment_methods apm ON apm.id = ps.payment_method_id
WHERE ps.purpose = 'wallet_topup'
ORDER BY ps.submitted_at DESC;

GRANT SELECT ON public.v_wallet_topup_requests TO authenticated;

-- ── 18. wallet_credit() primitive ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wallet_credit(
  p_user_id           uuid,
  p_amount            numeric,
  p_type              public.wallet_transaction_type,
  p_description       text        DEFAULT NULL,
  p_reference         text        DEFAULT NULL,
  p_idempotency_key   text        DEFAULT NULL,
  p_related_payment_id      uuid  DEFAULT NULL,
  p_related_submission_id   uuid  DEFAULT NULL,
  p_related_subscription_id uuid  DEFAULT NULL,
  p_initiated_by      text        DEFAULT 'system'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet        public.wallets;
  v_ledger_id     uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive, got: %', p_amount;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_ledger_id FROM public.wallet_ledger
    WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN RETURN v_ledger_id; END IF;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM public.ensure_wallet(p_user_id);
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  IF v_wallet.status = 'frozen' THEN
    RAISE EXCEPTION 'Wallet is frozen';
  END IF;

  INSERT INTO public.wallet_ledger (
    wallet_id, user_id, type, status, amount, currency,
    balance_before, balance_after, reference,
    related_payment_id, related_submission_id, related_subscription_id,
    description, idempotency_key, initiated_by
  ) VALUES (
    v_wallet.id, p_user_id, p_type, 'COMPLETED', p_amount, v_wallet.currency,
    v_wallet.balance, v_wallet.balance + p_amount, p_reference,
    p_related_payment_id, p_related_submission_id, p_related_subscription_id,
    p_description, p_idempotency_key, p_initiated_by
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.wallets SET balance = balance + p_amount, updated_at = now()
  WHERE id = v_wallet.id;

  RETURN v_ledger_id;
END;
$$;

-- ── 19. wallet_debit() primitive ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wallet_debit(
  p_user_id           uuid,
  p_amount            numeric,
  p_type              public.wallet_transaction_type,
  p_description       text        DEFAULT NULL,
  p_reference         text        DEFAULT NULL,
  p_idempotency_key   text        DEFAULT NULL,
  p_related_payment_id      uuid  DEFAULT NULL,
  p_related_submission_id   uuid  DEFAULT NULL,
  p_related_subscription_id uuid  DEFAULT NULL,
  p_initiated_by      text        DEFAULT 'system'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet    public.wallets;
  v_ledger_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Debit amount must be positive, got: %', p_amount;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_ledger_id FROM public.wallet_ledger
    WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN RETURN v_ledger_id; END IF;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found for user: %', p_user_id; END IF;
  IF v_wallet.status != 'active' THEN RAISE EXCEPTION 'Wallet is %', v_wallet.status; END IF;
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', p_amount, v_wallet.balance;
  END IF;

  INSERT INTO public.wallet_ledger (
    wallet_id, user_id, type, status, amount, currency,
    balance_before, balance_after, reference,
    related_payment_id, related_submission_id, related_subscription_id,
    description, idempotency_key, initiated_by
  ) VALUES (
    v_wallet.id, p_user_id, p_type, 'COMPLETED', -p_amount, v_wallet.currency,
    v_wallet.balance, v_wallet.balance - p_amount, p_reference,
    p_related_payment_id, p_related_submission_id, p_related_subscription_id,
    p_description, p_idempotency_key, p_initiated_by
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.wallets SET balance = balance - p_amount, updated_at = now()
  WHERE id = v_wallet.id;

  RETURN v_ledger_id;
END;
$$;

-- ── 20. approve_wallet_topup() ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_wallet_topup(
  p_submission_id uuid,
  p_admin_id      uuid,
  p_note          text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub       record;
  v_ledger_id uuid;
  v_idem_key  text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = p_admin_id AND r.role IN ('admin','super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_sub
  FROM public.payment_submissions
  WHERE id = p_submission_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found: %', p_submission_id; END IF;
  IF v_sub.status != 'pending_verification' THEN
    RAISE EXCEPTION 'Submission is already %', v_sub.status;
  END IF;

  v_idem_key := 'topup:' || p_submission_id::text;

  PERFORM public.ensure_wallet(v_sub.user_id);

  UPDATE public.payment_submissions SET
    status            = 'approved',
    verified_by       = p_admin_id,
    verified_at       = now(),
    verification_note = p_note,
    updated_at        = now()
  WHERE id = p_submission_id;

  v_ledger_id := public.wallet_credit(
    p_user_id               => v_sub.user_id,
    p_amount                => COALESCE(v_sub.topup_amount_etb, v_sub.amount_etb),
    p_type                  => 'TOP_UP',
    p_description           => 'Wallet top-up approved. Ref: ' || COALESCE(v_sub.transaction_ref, '—'),
    p_reference             => v_sub.transaction_ref,
    p_idempotency_key       => v_idem_key,
    p_related_submission_id => p_submission_id,
    p_initiated_by          => 'admin:' || p_admin_id::text
  );

  -- Audit log (best-effort)
  BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata, severity)
    VALUES (
      p_admin_id, 'admin_action', 'payment_submissions', p_submission_id,
      jsonb_build_object('action','approve_wallet_topup','amount', COALESCE(v_sub.topup_amount_etb, v_sub.amount_etb), 'ledger_id', v_ledger_id),
      'info'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Notify user
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_sub.user_id, 'wallet_topup_approved', 'Wallet Topped Up!',
      'ETB ' || COALESCE(v_sub.topup_amount_etb, v_sub.amount_etb) || ' has been added to your wallet.',
      jsonb_build_object('submission_id', p_submission_id, 'amount_etb', COALESCE(v_sub.topup_amount_etb, v_sub.amount_etb), 'ledger_id', v_ledger_id)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',    true,
    'ledger_id',  v_ledger_id,
    'amount_etb', COALESCE(v_sub.topup_amount_etb, v_sub.amount_etb),
    'user_id',    v_sub.user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_wallet_topup(uuid, uuid, text) TO authenticated;

-- ── 21. reject_wallet_topup() ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_wallet_topup(
  p_submission_id    uuid,
  p_admin_id         uuid,
  p_rejection_reason text,
  p_custom_note      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = p_admin_id AND r.role IN ('admin','super_admin')
  ) THEN RAISE EXCEPTION 'Permission denied'; END IF;

  SELECT * INTO v_sub FROM public.payment_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF v_sub.status != 'pending_verification' THEN RAISE EXCEPTION 'Submission is already %', v_sub.status; END IF;

  UPDATE public.payment_submissions SET
    status                  = 'rejected',
    verified_by             = p_admin_id,
    verified_at             = now(),
    rejection_reason        = p_rejection_reason,
    rejection_reason_custom = p_custom_note,
    updated_at              = now()
  WHERE id = p_submission_id;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_sub.user_id, 'wallet_topup_rejected', 'Wallet Top-Up Unsuccessful',
      'Your top-up of ETB ' || COALESCE(v_sub.topup_amount_etb, v_sub.amount_etb) || ' was not approved. Reason: ' || p_rejection_reason,
      jsonb_build_object('submission_id', p_submission_id, 'reason', p_rejection_reason)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_wallet_topup(uuid, uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── 22. purchase_subscription_with_wallet() ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_subscription_with_wallet(
  p_user_id           uuid,
  p_purchase_option_id uuid,
  p_idempotency_key   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_option      record;
  v_wallet      record;
  v_new_sub_id  uuid;
  v_period_end  timestamptz;
  v_ledger_id   uuid;
  v_idem_key    text;
BEGIN
  -- Only the authenticated user can buy for themselves
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Users can only purchase subscriptions for themselves';
  END IF;

  -- Load purchase option
  SELECT spo.*, sp.name AS plan_name, sp.tier AS plan_tier
  INTO v_option
  FROM public.subscription_purchase_options spo
  JOIN public.subscription_plans sp ON sp.id = spo.plan_id
  WHERE spo.id = p_purchase_option_id
    AND spo.is_active = true
    AND sp.is_active  = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase option not found or inactive: %', p_purchase_option_id;
  END IF;

  -- Lock wallet
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found. Please add money to your wallet first.';
  END IF;

  IF v_wallet.status != 'active' THEN
    RAISE EXCEPTION 'Wallet is % and cannot be used', v_wallet.status;
  END IF;

  IF v_wallet.balance < v_option.price_etb THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: ETB %, Available: ETB %',
      v_option.price_etb, v_wallet.balance;
  END IF;

  -- Idempotency key
  v_idem_key := COALESCE(
    p_idempotency_key,
    'sub_purchase:' || p_user_id::text || ':' || p_purchase_option_id::text || ':' || extract(epoch FROM now())::bigint
  );

  IF EXISTS (SELECT 1 FROM public.wallet_ledger WHERE idempotency_key = v_idem_key) THEN
    RAISE EXCEPTION 'This purchase has already been processed';
  END IF;

  v_period_end := now() + (v_option.duration_months || ' months')::interval;

  -- Cancel existing active subscriptions
  UPDATE public.user_subscriptions
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE user_id = p_user_id AND status IN ('active','trialing','paused');

  -- Create new subscription
  INSERT INTO public.user_subscriptions (
    user_id, plan_id, status, provider,
    current_period_start, current_period_end,
    duration_months, purchase_option_id, price_paid_etb,
    auto_renew, metadata
  ) VALUES (
    p_user_id, v_option.plan_id, 'active', 'manual',
    now(), v_period_end,
    v_option.duration_months, p_purchase_option_id, v_option.price_etb,
    false,
    jsonb_build_object('paid_with','wallet','price_etb',v_option.price_etb)
  )
  RETURNING id INTO v_new_sub_id;

  -- Debit wallet
  v_ledger_id := public.wallet_debit(
    p_user_id                 => p_user_id,
    p_amount                  => v_option.price_etb,
    p_type                    => 'SUBSCRIPTION_PURCHASE',
    p_description             => v_option.plan_name || ' — ' || v_option.duration_months || ' month(s)',
    p_idempotency_key         => v_idem_key,
    p_related_subscription_id => v_new_sub_id,
    p_initiated_by            => 'user:' || p_user_id::text
  );

  -- Notify user (best-effort)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      p_user_id, 'subscription_activated',
      v_option.plan_name || ' Plan Activated!',
      'Your ' || v_option.plan_name || ' subscription (' || v_option.duration_months || ' month(s)) is now active. ETB ' || v_option.price_etb || ' deducted from your wallet.',
      jsonb_build_object('subscription_id', v_new_sub_id, 'plan_name', v_option.plan_name, 'period_end', v_period_end)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',         true,
    'subscription_id', v_new_sub_id,
    'period_end',      v_period_end,
    'amount_debited',  v_option.price_etb,
    'ledger_id',       v_ledger_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_subscription_with_wallet(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
