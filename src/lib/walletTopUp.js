/**
 * walletTopUp.js
 * Service layer for the wallet top-up (Add Money) submission flow.
 *
 * COMPATIBILITY NOTE:
 *   This module is designed to work both:
 *   a) After Phase 14.5 migrations are applied (uses purpose, topup_amount_etb, wallet_id)
 *   b) Before migrations are applied (falls back to the original payment_submissions schema)
 *
 * In fallback mode, a wallet top-up is recorded as a payment_submissions row with:
 *   - plan_id = the cheapest active paid plan (required by original schema)
 *   - note contains '[WALLET_TOPUP]' marker so admin knows the intent
 *   - amount_etb = the top-up amount
 *
 * IMPORTANT: The wallet balance is NOT touched at submission time.
 * It is only credited when an admin approves it.
 */

import { supabase } from './supabase'
import { compressImageFile } from './imageUtils'

// Minimum and maximum top-up amounts (ETB)
export const MIN_TOPUP_AMOUNT = 50
export const MAX_TOPUP_AMOUNT = 100_000

/**
 * Validates the top-up amount.
 * Returns an error string, or null if valid.
 */
export function validateTopUpAmount(amount) {
  const n = parseFloat(amount)
  if (isNaN(n) || n <= 0) return 'Please enter a valid amount'
  if (n < MIN_TOPUP_AMOUNT) return `Minimum top-up is ETB ${MIN_TOPUP_AMOUNT}`
  if (n > MAX_TOPUP_AMOUNT) return `Maximum top-up is ETB ${MAX_TOPUP_AMOUNT.toLocaleString()}`
  return null
}

/**
 * Uploads the payment proof screenshot to the payment-proofs private bucket.
 */
export async function uploadTopUpProof(userId, submissionId, file) {
  let uploadFile = file
  if (file.type !== 'image/gif') {
    try {
      const dataUrl = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1600, quality: 0.85 })
      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      uploadFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' })
    } catch { uploadFile = file }
  }
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${submissionId}/proof.${ext}`
  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type || `image/${ext}` })
  if (error) throw new Error('UPLOAD_FAILED')
  return path
}

/**
 * Detects which columns exist on payment_submissions to choose the right insert strategy.
 * Returns 'extended' (Phase 14.5 columns present) or 'legacy' (original schema only).
 */
async function detectSubmissionsSchema() {
  // Try inserting with 'purpose' column using a dry-run: just check if we get a schema error.
  // We probe by doing a select with a filter on 'purpose' — if column doesn't exist PostgREST
  // returns a 400 with "column does not exist".
  const { error } = await supabase
    .from('payment_submissions')
    .select('purpose')
    .limit(1)
  if (error && (error.message?.includes('purpose') || error.code === '42703')) {
    return 'legacy'
  }
  return 'extended'
}

/**
 * Submits a wallet top-up request.
 *
 * Automatically detects whether Phase 14.5 columns exist and adjusts the insert.
 * Never throws technical database errors to the caller — throws user-friendly messages only.
 *
 * @param {Object} params
 * @param {string}  params.userId
 * @param {number}  params.amountEtb
 * @param {string}  params.paymentMethodId
 * @param {string}  params.paymentDate
 * @param {File}    [params.proofFile]
 * @param {string}  [params.note]
 * @returns {string} submissionId
 */
export async function submitWalletTopUp({
  userId,
  amountEtb,
  paymentMethodId,
  paymentDate,
  proofFile,
  note,
}) {
  const amountError = validateTopUpAmount(amountEtb)
  if (amountError) throw new Error(amountError)

  const autoRef = `FTP-${Date.now().toString(36).toUpperCase()}`

  // ── Upload screenshot (if provided) ────────────────────────────────────────
  const submissionId = crypto.randomUUID()
  let proofPath = null
  if (proofFile) {
    try {
      proofPath = await uploadTopUpProof(userId, submissionId, proofFile)
    } catch {
      throw new Error('Screenshot upload failed. Please check your connection and try again.')
    }
  }

  // ── Try to get a free plan_id for legacy fallback ─────────────────────────
  // We use the FREE plan so that if this submission is accidentally approved
  // via the standard subscription flow, it activates the free tier (no change)
  // rather than upgrading to a paid plan.
  // The note marker [WALLET_TOPUP] tells the admin this is NOT a subscription payment.
  let fallbackPlanId = null
  try {
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('tier', 'free')
      .eq('is_active', true)
      .limit(1)
    fallbackPlanId = plans?.[0]?.id ?? null
  } catch { /* ignore */ }

  // If no free plan found, try any plan (last resort)
  if (!fallbackPlanId) {
    try {
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('is_active', true)
        .order('price_monthly_usd', { ascending: true })
        .limit(1)
      fallbackPlanId = plans?.[0]?.id ?? null
    } catch { /* ignore */ }
  }

  // ── Detect schema and try extended insert first ─────────────────────────────
  let insertError = null

  // Attempt 1: full Phase 14.5 payload
  const extendedPayload = {
    id:               submissionId,
    user_id:          userId,
    purpose:          'wallet_topup',
    plan_id:          null,
    payment_method_id: paymentMethodId,
    amount_etb:       amountEtb,
    topup_amount_etb: amountEtb,
    currency:         'ETB',
    transaction_ref:  autoRef,
    payment_date:     paymentDate,
    proof_path:       proofPath,
    note:             note?.trim() || null,
    status:           'pending_verification',
    submitted_at:     new Date().toISOString(),
  }

  const { error: err1 } = await supabase.from('payment_submissions').insert(extendedPayload)

  if (!err1) {
    // Extended insert succeeded — notify and return
    _notifyAdmin(userId, submissionId, amountEtb)
    return submissionId
  }

  // If the error is about schema columns not existing, try the legacy payload
  const isSchemaError = err1.message?.includes('column') ||
                        err1.message?.includes('schema cache') ||
                        err1.code === 'PGRST204' ||
                        err1.code === '42703'

  if (!isSchemaError) {
    // A real insert error (e.g. FK violation, RLS) — return friendly message
    console.error('[submitWalletTopUp] Insert error:', err1.message)
    throw new Error('Submission failed. Please try again later.')
  }

  // Attempt 2: legacy payload (original schema — requires plan_id)
  if (!fallbackPlanId) {
    throw new Error('Service temporarily unavailable. Please try again later.')
  }

  const legacyPayload = {
    id:               submissionId,
    user_id:          userId,
    plan_id:          fallbackPlanId,  // required by original schema
    payment_method_id: paymentMethodId,
    amount_etb:       amountEtb,
    currency:         'ETB',
    transaction_ref:  autoRef,
    payment_date:     paymentDate,
    proof_path:       proofPath,
    // Store wallet top-up flag in the note field so admin knows
    note:             `[WALLET_TOPUP] Amount: ETB ${amountEtb}${note?.trim() ? ` — ${note.trim()}` : ''}`,
    status:           'pending_verification',
    submitted_at:     new Date().toISOString(),
  }

  const { error: err2 } = await supabase.from('payment_submissions').insert(legacyPayload)
  if (err2) {
    console.error('[submitWalletTopUp] Legacy insert error:', err2.message)
    throw new Error('Submission failed. Please try again later.')
  }

  _notifyAdmin(userId, submissionId, amountEtb)
  return submissionId
}

/** Fire-and-forget admin notification */
async function _notifyAdmin(userId, submissionId, amountEtb) {
  try {
    await supabase.from('notifications').insert({
      user_id:  userId,
      type:     'wallet_topup_submitted',
      title:    'Wallet Top-Up Submitted',
      body:     `ETB ${amountEtb} top-up submitted for verification.`,
      data:     { submission_id: submissionId, amount_etb: amountEtb },
      is_read:  false,
    })
  } catch { /* non-critical */ }
}

/**
 * Fetches signed URL for a proof screenshot (user's own files only).
 */
export async function getProofSignedUrl(path) {
  if (!path) return null
  try {
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(path, 60 * 15)
    if (error) return null
    return data.signedUrl
  } catch { return null }
}

/**
 * Fetches all active payment methods to display to the user.
 * Sorted alphabetically by name (A→Z).
 */
export async function fetchActivePaymentMethods() {
  const { data, error } = await supabase
    .from('app_payment_methods')
    .select('id, name, type, account_name, account_number, phone_number, instructions, logo_url')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}
