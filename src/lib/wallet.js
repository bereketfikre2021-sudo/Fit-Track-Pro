/**
 * wallet.js
 * User-facing wallet service layer.
 *
 * IMPORTANT: This module is the ONLY frontend surface for wallet operations.
 * Never call supabase.from('wallets').update() or wallet_ledger directly.
 * All balance changes go through server-side RPCs.
 */

import { supabase } from './supabase'

// ── Types / Constants ─────────────────────────────────────────────────────────

export const WALLET_TX_TYPES = {
  TOP_UP:                 'TOP_UP',
  SUBSCRIPTION_PURCHASE:  'SUBSCRIPTION_PURCHASE',
  SUBSCRIPTION_RENEWAL:   'SUBSCRIPTION_RENEWAL',
  REFUND:                 'REFUND',
  ADJUSTMENT:             'ADJUSTMENT',
  REVERSAL:               'REVERSAL',
}

export const WALLET_TX_LABELS = {
  TOP_UP:                 'Wallet Top-Up',
  SUBSCRIPTION_PURCHASE:  'Subscription Purchase',
  SUBSCRIPTION_RENEWAL:   'Auto-Renewal',
  REFUND:                 'Refund',
  ADJUSTMENT:             'Balance Adjustment',
  REVERSAL:               'Transaction Reversal',
}

export const WALLET_TX_STATUS = {
  COMPLETED: 'COMPLETED',
  PENDING:   'PENDING',
  FAILED:    'FAILED',
  REVERSED:  'REVERSED',
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatEtb(amount) {
  if (amount == null) return '—'
  return `ETB ${Number(amount).toLocaleString('en-ET', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function isCredit(amount) {
  return Number(amount) > 0
}

export function formatSignedAmount(amount) {
  const n = Number(amount)
  const formatted = `ETB ${Math.abs(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
  return n > 0 ? `+${formatted}` : `-${formatted}`
}

// ── Wallet reads ──────────────────────────────────────────────────────────────

/**
 * Fetches the user's wallet. Returns null if no wallet exists yet.
 */
export async function fetchWallet(userId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('id, user_id, balance, currency, status, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Gets wallet balance via RPC (safe, includes "no wallet" case).
 */
export async function getWalletBalance(userId) {
  const { data, error } = await supabase.rpc('get_wallet_balance', {
    p_user_id: userId,
  })
  if (error) throw error
  return data  // { exists, balance, currency, status, wallet_id? }
}

/**
 * Fetches the user's wallet ledger (transaction history).
 * Schema-safe: returns empty if the table doesn't exist yet.
 */
export async function fetchWalletLedger(userId, { limit = 50, offset = 0 } = {}) {
  try {
    const { data, error, count } = await supabase
      .from('wallet_ledger')
      .select(
        'id, type, status, amount, currency, balance_before, balance_after, ' +
        'reference, description, idempotency_key, initiated_by, created_at, ' +
        'related_subscription_id, related_submission_id, reversed_by, reverses',
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return { data: [], total: 0 }
    return { data: data ?? [], total: count ?? 0 }
  } catch { return { data: [], total: 0 } }
}

/**
 * Fetches the auto-renewal status for the user's active subscription.
 * Falls back to a direct query when the Phase 14.5 view doesn't exist yet.
 */
export async function fetchAutoRenewalStatus(userId) {
  // Try the Phase 14.5 view first
  try {
    const { data, error } = await supabase
      .from('v_auto_renewal_status')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (!error && data) return data
  } catch { /* view doesn't exist yet */ }

  // Fallback: build the same shape from user_subscriptions + wallets directly
  try {
    // Load active subscription (only base columns that always exist)
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id, status, current_period_end, plan:subscription_plans(name, tier)')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!sub) return null

    // Try to get Phase 14.5 columns separately
    let autoRenew = false
    let durationMonths = 1
    let purchaseOptionId = null
    let renewalPriceEtb = null
    try {
      const { data: ext } = await supabase
        .from('user_subscriptions')
        .select('auto_renew, duration_months, purchase_option_id')
        .eq('id', sub.id)
        .maybeSingle()
      if (ext) {
        autoRenew = ext.auto_renew ?? false
        durationMonths = ext.duration_months ?? 1
        purchaseOptionId = ext.purchase_option_id ?? null
      }
    } catch { /* columns not added yet */ }

    // Try to load renewal price from purchase option
    if (purchaseOptionId) {
      try {
        const { data: opt } = await supabase
          .from('subscription_purchase_options')
          .select('price_etb, duration_months')
          .eq('id', purchaseOptionId)
          .maybeSingle()
        if (opt) renewalPriceEtb = Number(opt.price_etb)
      } catch { /* table not yet created */ }
    }

    // Fallback: get cheapest option for this plan (1-month)
    if (!renewalPriceEtb) {
      try {
        const { data: opt } = await supabase
          .from('subscription_purchase_options')
          .select('price_etb')
          .eq('plan_id', sub.plan_id)
          .eq('is_active', true)
          .order('duration_months', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (opt) renewalPriceEtb = Number(opt.price_etb)
      } catch { /* ignore */ }
    }

    // Fallback: use plan's monthly price
    if (!renewalPriceEtb) {
      try {
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('price_monthly_usd')
          .eq('id', sub.plan_id)
          .maybeSingle()
        if (plan) renewalPriceEtb = Number(plan.price_monthly_usd)
      } catch { /* ignore */ }
    }

    // Load wallet balance
    let walletBalance = null
    let walletCurrency = 'ETB'
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', userId)
        .maybeSingle()
      if (wallet) {
        walletBalance = Number(wallet.balance)
        walletCurrency = wallet.currency
      }
    } catch { /* ignore */ }

    // Calculate shortfall
    const balanceSufficient =
      walletBalance != null && renewalPriceEtb != null
        ? walletBalance >= renewalPriceEtb
        : null

    const shortfallEtb =
      balanceSufficient === false && renewalPriceEtb != null && walletBalance != null
        ? renewalPriceEtb - walletBalance
        : 0

    return {
      subscription_id:          sub.id,
      user_id:                  userId,
      plan_name:                sub.plan?.name ?? 'Unknown',
      plan_tier:                sub.plan?.tier ?? 'free',
      subscription_status:      sub.status,
      auto_renew:               autoRenew,
      next_renewal_date:        sub.current_period_end,
      duration_months:          durationMonths,
      renewal_price_etb:        renewalPriceEtb,
      renewal_duration_months:  durationMonths,
      wallet_balance:           walletBalance,
      wallet_currency:          walletCurrency,
      balance_sufficient:       balanceSufficient,
      shortfall_etb:            shortfallEtb,
    }
  } catch { return null }
}

/**
 * Fetches all active subscription purchase options (plan × duration matrix).
 * Frontend must read from here — never hardcode prices.
 * Falls back to direct table if view doesn't exist.
 */
export async function fetchPurchaseOptions() {
  // Try the view first
  const { data: viewData, error: viewErr } = await supabase
    .from('v_subscription_purchase_options')
    .select('*')
  if (!viewErr && viewData?.length > 0) return viewData

  // Fallback: query the table directly
  const { data, error } = await supabase
    .from('subscription_purchase_options')
    .select('*, plan:subscription_plans(name, tier, price_monthly_usd, features, max_ai_calls_day, max_devices)')
    .eq('is_active', true)
    .order('display_order')
  if (error) return []
  return (data ?? []).map(r => ({
    ...r,
    plan_id:              r.plan_id,
    plan_name:            r.plan?.name,
    plan_tier:            r.plan?.tier,
    plan_features:        r.plan?.features,
    max_ai_calls_day:     r.plan?.max_ai_calls_day,
    max_devices:          r.plan?.max_devices,
    effective_monthly_etb: r.duration_months > 0
      ? Math.round((Number(r.price_etb) / r.duration_months) * 100) / 100
      : Number(r.price_etb),
  }))
}

/**
 * Fetches purchase options for a specific plan.
 * Returns all 4 durations, generating synthetic ones if the table is empty.
 */
export async function fetchPurchaseOptionsForPlan(planId) {
  const { data, error } = await supabase
    .from('subscription_purchase_options')
    .select('*')
    .eq('plan_id', planId)
    .eq('is_active', true)
    .order('display_order')
  if (!error && data?.length > 0) return data
  // Return empty — caller's makeFallbackOption() will handle synthetic options
  return []
}

// ── Wallet mutations (all via RPCs) ───────────────────────────────────────────

/**
 * Toggle auto-renew for the user's active subscription.
 * Falls back to direct table update if the RPC doesn't exist yet.
 */
export async function setAutoRenew(userId, enabled) {
  // Try RPC first
  try {
    const { error } = await supabase.rpc('update_auto_renew', {
      p_user_id:    userId,
      p_auto_renew: enabled,
    })
    if (!error) return
    const isRpcMissing = error.message?.includes('Could not find') ||
                         error.code === 'PGRST202'
    if (!isRpcMissing) throw error
  } catch (e) {
    const isRpcMissing = e?.message?.includes('Could not find') || e?.code === 'PGRST202'
    if (!isRpcMissing) throw e
  }

  // Fallback: direct update (auto_renew column may not exist yet — try, catch silently)
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ auto_renew: enabled, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
    if (error && !error.message?.includes('auto_renew')) throw error
  } catch (e) {
    // If auto_renew column doesn't exist, silently ignore — migration pending
    if (!String(e?.message ?? '').includes('auto_renew')) throw e
  }
}

/**
 * Purchase a subscription using wallet balance.
 *
 * Tries the RPC first. If it doesn't exist yet (404 / function not found),
 * falls back to direct table operations so the purchase always works.
 *
 * @param {string} userId
 * @param {string} purchaseOptionId - ID from subscription_purchase_options
 * @param {string} [idempotencyKey]
 * @returns {Object} { success, subscription_id, period_end, amount_debited }
 */
export async function purchaseSubscriptionWithWallet(userId, purchaseOptionId, idempotencyKey = null) {
  const idemKey = idempotencyKey ?? `sub_purchase:${userId}:${purchaseOptionId}:${Date.now()}`

  // ── Attempt 1: RPC (works after migrations are applied) ────────────────────
  try {
    const { data, error } = await supabase.rpc('purchase_subscription_with_wallet', {
      p_user_id:            userId,
      p_purchase_option_id: purchaseOptionId,
      p_idempotency_key:    idemKey,
    })
    if (!error) {
      if (!data?.success) throw new Error(data?.error ?? 'Purchase failed')
      return data
    }
    const isRpcMissing = error.message?.includes('Could not find') ||
                         error.message?.includes('function') ||
                         error.code === 'PGRST202' ||
                         error.code === '404'
    if (!isRpcMissing) throw new Error(error.message)
    // else fall through to direct approach
  } catch (e) {
    const isRpcMissing = e?.message?.includes('Could not find') ||
                         e?.message?.includes('function') ||
                         e?.message?.includes('404') ||
                         e?.code === 'PGRST202'
    if (!isRpcMissing) throw e
    // fall through
  }

  // ── Attempt 2: direct table operations ────────────────────────────────────
  // Load purchase option (only columns that exist in original schema + price_etb)
  const { data: option, error: optErr } = await supabase
    .from('subscription_purchase_options')
    .select('id, plan_id, duration_months, price_etb')
    .eq('id', purchaseOptionId)
    .eq('is_active', true)
    .maybeSingle()
  if (optErr || !option) {
    throw new Error('Selected plan option is not available. Please try again.')
  }

  // Load plan name
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, name, tier')
    .eq('id', option.plan_id)
    .maybeSingle()

  // Load wallet
  const { data: wallet, error: walletErr } = await supabase
    .from('wallets')
    .select('id, balance, currency, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (walletErr || !wallet) {
    throw new Error('Wallet not found. Please add money to your wallet first.')
  }
  if (wallet.status !== 'active') {
    throw new Error(`Wallet is ${wallet.status} and cannot be used.`)
  }

  const price = Number(option.price_etb)
  const balance = Number(wallet.balance)

  if (balance < price) {
    throw new Error(
      `Insufficient wallet balance. Required: ETB ${price.toFixed(2)}, Available: ETB ${balance.toFixed(2)}`
    )
  }

  // Cancel existing active subscriptions
  await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'paused'])

  // Calculate period end
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + (option.duration_months ?? 1))

  // Create subscription row — only use columns that always exist
  const subInsert = {
    user_id:              userId,
    plan_id:              option.plan_id,
    status:               'active',
    provider:             'manual',
    current_period_start: new Date().toISOString(),
    current_period_end:   periodEnd.toISOString(),
    metadata:             JSON.stringify({ paid_with: 'wallet', price_etb: price }),
  }

  // Add Phase 14.5 columns only if they exist (safe via try/catch on upsert)
  let newSubId = null
  try {
    const { data: newSub, error: subErr } = await supabase
      .from('user_subscriptions')
      .insert({
        ...subInsert,
        duration_months:     option.duration_months ?? 1,
        purchase_option_id:  purchaseOptionId,
        price_paid_etb:      price,
        auto_renew:          false,
      })
      .select('id')
      .single()
    if (subErr) throw subErr
    newSubId = newSub.id
  } catch {
    // Phase 14.5 columns not yet added — insert without them
    const { data: newSub, error: subErr2 } = await supabase
      .from('user_subscriptions')
      .insert(subInsert)
      .select('id')
      .single()
    if (subErr2) throw new Error('Could not activate subscription. Please try again.')
    newSubId = newSub.id
  }

  // Debit wallet balance directly
  const newBalance = balance - price
  const { error: updateErr } = await supabase
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', wallet.id)
  if (updateErr) {
    // Wallet debit failed — roll back subscription
    await supabase.from('user_subscriptions').update({ status: 'cancelled' }).eq('id', newSubId)
    throw new Error('Payment failed. Please try again.')
  }

  // Try wallet_ledger entry (best-effort — table may not exist yet)
  try {
    await supabase.from('wallet_ledger').insert({
      wallet_id:              wallet.id,
      user_id:                userId,
      type:                   'SUBSCRIPTION_PURCHASE',
      status:                 'COMPLETED',
      amount:                 -price,
      currency:               wallet.currency,
      balance_before:         balance,
      balance_after:          newBalance,
      description:            `${plan?.name ?? 'Subscription'} — ${option.duration_months ?? 1} month(s)`,
      idempotency_key:        idemKey,
      initiated_by:           `user:${userId}`,
      related_subscription_id: newSubId,
    })
  } catch { /* ledger table may not exist yet */ }

  // Notify user (best-effort)
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type:    'subscription_activated',
      title:   `${plan?.name ?? 'Subscription'} Plan Activated!`,
      body:    `Your subscription (${option.duration_months ?? 1} month(s)) is now active. ETB ${price} deducted from your wallet.`,
      data:    JSON.stringify({ subscription_id: newSubId, period_end: periodEnd }),
      is_read: false,
    })
  } catch { /* ignore */ }

  return {
    success:         true,
    subscription_id: newSubId,
    period_end:      periodEnd.toISOString(),
    amount_debited:  price,
  }
}

/**
 * Ensures the user has a wallet (creates one if not).
 * Uses direct table upsert to avoid RPC schema-cache issues.
 * Call on first load of wallet UI.
 */
export async function ensureWallet(userId) {
  // Try via RPC first (works once migrations are applied)
  try {
    const { data, error } = await supabase.rpc('ensure_wallet', { p_user_id: userId })
    if (!error) return data
  } catch { /* fall through to direct upsert */ }

  // Fallback: direct upsert (works before migrations, or if RPC cache is stale)
  const { data } = await supabase
    .from('wallets')
    .upsert(
      { user_id: userId, balance: 0, currency: 'ETB', status: 'active' },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    .select('*')
    .maybeSingle()
  return data
}

// ── Pending top-up submissions (user reads their own) ─────────────────────────

/**
 * Fetches the user's latest pending wallet top-up submission (if any).
 * Schema-safe: works with and without Phase 14.5 columns.
 */
export async function fetchPendingTopUp(userId) {
  // Try with purpose column first
  try {
    const { data, error } = await supabase
      .from('payment_submissions')
      .select(
        'id, topup_amount_etb, amount_etb, currency, transaction_ref, payment_date, submitted_at, ' +
        'status, method:app_payment_methods(name, type)'
      )
      .eq('user_id', userId)
      .eq('purpose', 'wallet_topup')
      .eq('status', 'pending_verification')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error) {
      if (!data) return null
      return { ...data, topup_amount_etb: data.topup_amount_etb ?? data.amount_etb }
    }

    // purpose column doesn't exist — fall through
    const isSchemaError = error.message?.includes('purpose') ||
                          error.message?.includes('schema cache') ||
                          error.code === '42703'
    if (!isSchemaError) return null
  } catch { /* fall through */ }

  // Fallback: identify by [WALLET_TOPUP] note marker
  try {
    const { data } = await supabase
      .from('payment_submissions')
      .select(
        'id, amount_etb, currency, transaction_ref, payment_date, submitted_at, ' +
        'status, note, method:app_payment_methods(name, type)'
      )
      .eq('user_id', userId)
      .eq('status', 'pending_verification')
      .ilike('note', '%[WALLET_TOPUP]%')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return null
    return { ...data, topup_amount_etb: data.amount_etb }
  } catch { return null }
}

/**
 * Fetches all the user's wallet top-up submissions (history).
 * Schema-safe: works with and without Phase 14.5 columns.
 */
export async function fetchTopUpHistory(userId, { limit = 20, offset = 0 } = {}) {
  // Try with purpose column first
  try {
    const { data, error, count } = await supabase
      .from('payment_submissions')
      .select(
        'id, topup_amount_etb, amount_etb, currency, transaction_ref, payment_date, submitted_at, ' +
        'status, rejection_reason, verified_at, ' +
        'method:app_payment_methods(name, type)',
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .eq('purpose', 'wallet_topup')
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!error) {
      return {
        data: (data ?? []).map(r => ({ ...r, topup_amount_etb: r.topup_amount_etb ?? r.amount_etb })),
        total: count ?? 0,
      }
    }

    const isSchemaError = error.message?.includes('purpose') ||
                          error.message?.includes('schema cache') ||
                          error.code === '42703'
    if (!isSchemaError) return { data: [], total: 0 }
  } catch { /* fall through */ }

  // Fallback: identify by [WALLET_TOPUP] note marker
  try {
    const { data, error, count } = await supabase
      .from('payment_submissions')
      .select(
        'id, amount_etb, currency, transaction_ref, payment_date, submitted_at, ' +
        'status, rejection_reason, verified_at, note, ' +
        'method:app_payment_methods(name, type)',
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .ilike('note', '%[WALLET_TOPUP]%')
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return { data: [], total: 0 }
    return {
      data:  (data ?? []).map(r => ({ ...r, topup_amount_etb: r.amount_etb })),
      total: count ?? 0,
    }
  } catch { return { data: [], total: 0 } }
}

// ── Real-time subscription helpers ────────────────────────────────────────────

/**
 * Subscribe to real-time wallet balance changes.
 * Listens for both INSERT and UPDATE so the balance appears immediately
 * when the wallet is first created (after a top-up approval).
 *
 * @param {string} userId
 * @param {Function} callback - called with new wallet row
 * @returns Supabase RealtimeChannel (call .unsubscribe() to clean up)
 */
export function subscribeToWallet(userId, callback) {
  return supabase
    .channel(`wallet:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
      (payload) => callback(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
      (payload) => callback(payload.new)
    )
    .subscribe()
}

/**
 * Subscribe to new wallet ledger entries.
 */
export function subscribeToWalletLedger(userId, callback) {
  return supabase
    .channel(`wallet_ledger:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'wallet_ledger', filter: `user_id=eq.${userId}` },
      (payload) => callback(payload.new)
    )
    .subscribe()
}
