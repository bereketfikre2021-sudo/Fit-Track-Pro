/**
 * paymentSubmission.js
 * Frontend service for the manual payment verification flow.
 */

import { supabase } from './supabase'
import { compressImageFile } from './imageUtils'

// ── Fetch active payment methods (public) ────────────────────────────────────
export async function fetchActivePaymentMethods() {
  const { data, error } = await supabase
    .from('app_payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  if (error) throw error
  return data ?? []
}

// ── Fetch subscription plans ──────────────────────────────────────────────────
export async function fetchSubscriptionPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, name, tier, price_monthly_usd, features, max_ai_calls_day, max_devices')
    .eq('is_active', true)
    .order('price_monthly_usd')
  if (error) throw error
  return data ?? []
}

// ── Upload proof image to private bucket ─────────────────────────────────────
export async function uploadPaymentProof(userId, submissionId, file) {
  // Compress before upload (preserve readability, max 1200px)
  let uploadFile = file
  if (file.type !== 'image/gif') {
    try {
      const dataUrl = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1600, quality: 0.85 })
      // Convert data URL back to File
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      uploadFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' })
    } catch {
      uploadFile = file // fall back to original
    }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${submissionId}/proof.${ext}`

  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type || `image/${ext}` })
  if (error) throw error
  return path
}

// ── Submit payment proof ──────────────────────────────────────────────────────
export async function submitPaymentProof({
  userId,
  planId,
  paymentMethodId,
  amountEtb,
  transactionRef,
  paymentDate,
  proofFile,
  note,
}) {
  // 1. Create submission record first to get the ID
  const submissionId = crypto.randomUUID()

  // 2. Upload proof image
  let proofPath = null
  if (proofFile) {
    proofPath = await uploadPaymentProof(userId, submissionId, proofFile)
  }

  // 3. Insert submission
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
  if (error) throw error
  return submissionId
}

// ── Fetch user's own payment history ─────────────────────────────────────────
export async function fetchMyPaymentHistory(userId) {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`
      *,
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

// ── Get signed URL for own proof image ───────────────────────────────────────
export async function getMyProofSignedUrl(path) {
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 15) // 15 min
  if (error) return null
  return data.signedUrl
}
