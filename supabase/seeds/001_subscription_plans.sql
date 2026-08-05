-- ============================================================
--  Seed: Subscription Plans (idempotent)
-- ============================================================

insert into public.subscription_plans
  (id, name, tier, price_monthly_usd, price_yearly_usd, max_ai_calls_day, max_devices, features, is_active)
values
  (
    'a1000000-0000-0000-0000-000000000001',
    'Free',
    'free',
    0.00, 0.00,
    5, 1,
    '{"ads":true,"ai":false,"export":false,"pdf":false,"offline":true,"history_days":30}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Pro',
    'pro',
    4.99, 49.99,
    50, 3,
    '{"ads":false,"ai":true,"export":true,"pdf":true,"offline":true,"history_days":365,"priority_support":false}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'Elite',
    'elite',
    9.99, 99.99,
    200, 5,
    '{"ads":false,"ai":true,"export":true,"pdf":true,"offline":true,"history_days":999,"priority_support":true,"custom_themes":true}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'Team',
    'team',
    29.99, 299.99,
    1000, 20,
    '{"ads":false,"ai":true,"export":true,"pdf":true,"offline":true,"history_days":999,"priority_support":true,"team":true,"admin_dashboard":true}',
    true
  )
on conflict (tier) do update
  set
    name              = excluded.name,
    price_monthly_usd = excluded.price_monthly_usd,
    price_yearly_usd  = excluded.price_yearly_usd,
    max_ai_calls_day  = excluded.max_ai_calls_day,
    max_devices       = excluded.max_devices,
    features          = excluded.features,
    updated_at        = now();
