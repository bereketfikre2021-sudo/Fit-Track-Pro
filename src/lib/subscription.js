/**
 * subscription.js
 * User-facing subscription & billing service layer.
 * Reads from Supabase as the source of truth.
 */

import { supabase } from './supabase'

// ── Fetch user's active subscription ─────────────────────────────────────────
export async function fetchMySubscription(userId) {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      id, status, provider, current_period_start, current_period_end,
      cancel_at_period_end, trial_start, trial_end, cancelled_at, paused_at,
      created_at, updated_at,
      plan:subscription_plans(id, name, tier, price_monthly_usd, price_yearly_usd, features, max_ai_calls_day, max_devices, is_active)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Fetch all active plans ────────────────────────────────────────────────────
export async function fetchPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, name, tier, price_monthly_usd, price_yearly_usd, features, max_ai_calls_day, max_devices, is_active')
    .eq('is_active', true)
    .order('price_monthly_usd')
  if (error) throw error
  return data ?? []
}

// ── Fetch active payment methods ──────────────────────────────────────────────
export async function fetchPaymentMethods() {
  const { data, error } = await supabase
    .from('app_payment_methods')
    .select('id, name, type, account_name, account_number, phone_number, instructions, logo_url, display_order')
    .eq('is_active', true)
    .order('display_order')
  if (error) throw error
  return data ?? []
}

// ── Fetch user's latest pending payment submission ────────────────────────────
export async function fetchPendingSubmission(userId) {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`
      id, amount_etb, currency, transaction_ref, payment_date, submitted_at,
      status, rejection_reason, rejection_reason_custom, verified_at,
      plan:subscription_plans(name, tier),
      method:app_payment_methods(name, type)
    `)
    .eq('user_id', userId)
    .eq('status', 'pending_verification')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Fetch latest rejected submission (for resubmission flow) ─────────────────
export async function fetchLatestRejectedSubmission(userId) {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`
      id, amount_etb, currency, transaction_ref, payment_date, submitted_at,
      rejection_reason, rejection_reason_custom, verified_at,
      plan:subscription_plans(id, name, tier),
      method:app_payment_methods(name, type)
    `)
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .order('verified_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

// ── Fetch payment history ─────────────────────────────────────────────────────
export async function fetchPaymentHistory(userId) {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`
      id, amount_etb, currency, transaction_ref, payment_date, submitted_at,
      status, rejection_reason, rejection_reason_custom, verified_at,
      plan:subscription_plans(name, tier),
      method:app_payment_methods(name, type)
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => ({
    ...r,
    plan_name: r.plan?.name ?? '—',
    plan_tier: r.plan?.tier ?? '—',
    method_name: r.method?.name ?? '—',
  }))
}

// ── Upload proof + submit payment ─────────────────────────────────────────────
export async function submitPayment({ userId, planId, paymentMethodId, amountEtb, transactionRef, paymentDate, proofFile, note }) {
  const submissionId = crypto.randomUUID()

  // Upload proof to private bucket: payment-proofs/{userId}/{submissionId}/proof.ext
  let proofPath = null
  if (proofFile) {
    const ext = proofFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/${submissionId}/proof.${ext}`
    const { error: upErr } = await supabase.storage
      .from('payment-proofs')
      .upload(path, proofFile, { upsert: false, contentType: proofFile.type || `image/${ext}` })
    if (upErr) throw new Error(`Proof upload failed: ${upErr.message}`)
    proofPath = path
  }

  // Insert submission — status is always pending_verification, never set by client
  const { error } = await supabase.from('payment_submissions').insert({
    id: submissionId,
    user_id: userId,
    plan_id: planId,
    payment_method_id: paymentMethodId,
    amount_etb: amountEtb,
    currency: 'ETB',
    transaction_ref: transactionRef.trim(),
    payment_date: paymentDate,
    proof_path: proofPath,
    note: note?.trim() || null,
    status: 'pending_verification',
    submitted_at: new Date().toISOString(),
  })
  if (error) throw new Error(`Submission failed: ${error.message}`)
  return submissionId
}

// ── Get signed URL for proof (user's own only — enforced by RLS) ──────────────
export async function getProofSignedUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 15)
  if (error) return null
  return data.signedUrl
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getRemainingDays(endDate) {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function getStatusLabel(status) {
  const map = {
    active: 'Active', trialing: 'Trial', cancelled: 'Cancelled',
    expired: 'Expired', past_due: 'Past Due', paused: 'Paused',
    free: 'Free',
  }
  return map[status] ?? status
}

export function formatEtb(amount) {
  if (amount == null) return '—'
  return `ETB ${Number(amount).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
}
