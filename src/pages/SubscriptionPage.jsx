/**
 * SubscriptionPage.jsx
 * User-facing Subscription & Billing — fully functional.
 * Fetches payment methods from admin backend.
 * Sends admin notification on submission.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { compressImageFile } from '../lib/imageUtils'
import {
  ChevronLeft, Copy, Check, Camera, AlertCircle,
  Loader2, Crown, CreditCard, Clock, CheckCircle2,
  XCircle, ArrowRight, RefreshCw, Zap, Sparkles,
  Shield, Rocket, Star, Users,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtEtb(n) {
  if (!n && n !== 0) return '—'
  return `ETB ${Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

function remainingDays(end) {
  if (!end) return null
  return Math.max(0, Math.ceil((new Date(end) - Date.now()) / 86400000))
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { toast.error('Could not copy') }
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors active:scale-95 shrink-0">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:               { label: 'Active',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    trialing:             { label: 'Trial',     cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Clock },
    pending_verification: { label: 'Pending',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
    approved:             { label: 'Approved',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    rejected:             { label: 'Rejected',  cls: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
    cancelled:            { label: 'Cancelled', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: XCircle },
    expired:              { label: 'Expired',   cls: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
    free:                 { label: 'Free',      cls: 'bg-muted text-muted-foreground border-border', icon: null },
  }
  const c = map[status] ?? map.free
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${c.cls}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {c.label}
    </span>
  )
}

// ── Main page (single scrollable view with sections) ─────────────────────────
export default function SubscriptionPage() {
  const navigate = useNavigate()

  // Auth
  const [userId, setUserId] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Data
  const [sub, setSub] = useState(null)
  const [plans, setPlans] = useState([])
  const [methods, setMethods] = useState([])
  const [pendingSubmission, setPendingSubmission] = useState(null)
  const [latestRejected, setLatestRejected] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)

  // UI state
  const [view, setView] = useState('overview') // overview | plans | pay
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState(null)

  // Payment form
  const [transactionRef, setTransactionRef] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const fileRef = useRef(null)

  // ── Get session (fast — no hanging) ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setAuthLoading(false)
    })
  }, [])

  // ── Load all data once userId is known ─────────────────────────────────────
  const loadData = useCallback(async (uid) => {
    if (!uid) return
    setDataLoading(true)
    try {
      // Run all queries independently so one failure doesn't block others
      const safeQuery = async (fn) => { try { return await fn() } catch { return null } }

      const [subData, plansData, methodsData, pendingData, rejectedData] = await Promise.all([
        safeQuery(async () => {
          const { data } = await supabase
            .from('user_subscriptions')
            .select('id,status,current_period_start,current_period_end,plan:subscription_plans(id,name,tier,price_monthly_usd,features,max_ai_calls_day,max_devices)')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          return data
        }),
        safeQuery(async () => {
          const { data } = await supabase
            .from('subscription_plans')
            .select('id,name,tier,price_monthly_usd,features,max_ai_calls_day,max_devices')
            .eq('is_active', true)
            .order('price_monthly_usd')
          return data ?? []
        }),
        safeQuery(async () => {
          const { data } = await supabase
            .from('app_payment_methods')
            .select('id,name,type,account_name,account_number,phone_number,instructions')
            .eq('is_active', true)
            .order('display_order')
          return data ?? []
        }),
        safeQuery(async () => {
          const { data } = await supabase
            .from('payment_submissions')
            .select('id,amount_etb,transaction_ref,submitted_at,status,plan:subscription_plans(name),method:app_payment_methods(name)')
            .eq('user_id', uid)
            .eq('status', 'pending_verification')
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          return data
        }),
        safeQuery(async () => {
          const { data } = await supabase
            .from('payment_submissions')
            .select('id,amount_etb,transaction_ref,submitted_at,rejection_reason,rejection_reason_custom,plan:subscription_plans(id,name,price_monthly_usd)')
            .eq('user_id', uid)
            .eq('status', 'rejected')
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          return data
        }),
      ])

      setSub(subData ?? null)
      setPlans(plansData ?? [])
      setMethods(methodsData ?? [])
      setPendingSubmission(pendingData ?? null)
      setLatestRejected(rejectedData ?? null)
    } catch (e) {
      console.error('Subscription load error:', e)
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userId) loadData(userId)
  }, [userId, loadData])

  // Realtime updates
  useEffect(() => {
    if (!userId) return
    const ch = supabase.channel('sub-rt-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_submissions', filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId, loadData])

  // ── Handle proof file ───────────────────────────────────────────────────────
  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)) {
      setFormError('Only JPG, PNG, WEBP accepted'); return
    }
    if (file.size > 5 * 1024 * 1024) { setFormError('Max file size is 5 MB'); return }
    setFormError(null)
    try {
      const url = await compressImageFile(file, { maxWidth: 1000, maxHeight: 1400, quality: 0.85 })
      setProofPreview(url)
      const res = await fetch(url)
      const blob = await res.blob()
      setProofFile(new File([blob], file.name, { type: blob.type || 'image/jpeg' }))
    } catch {
      setProofFile(file)
      setProofPreview(URL.createObjectURL(file))
    }
  }, [])

  // ── Submit payment ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!proofFile) { setFormError('Please upload your payment screenshot'); return }
    if (!selectedPlan || !selectedMethod || !userId) return
    setFormError(null)
    setSubmitting(true)
    try {
      const submissionId = crypto.randomUUID()
      // Auto-generate a reference if not provided
      const autoRef = `FTP-${Date.now().toString(36).toUpperCase()}`
      const today = new Date().toISOString().slice(0, 10)

      // Upload proof — delete old path first to avoid needing UPDATE policy
      const ext = proofFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${userId}/${submissionId}/proof.${ext}`
      await supabase.storage.from('payment-proofs').remove([path])
      const { error: upErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, proofFile, { upsert: false, contentType: proofFile.type || `image/${ext}` })
      if (upErr) throw new Error(`Screenshot upload failed: ${upErr.message}`)

      // Insert submission — status always pending_verification
      const { error: insErr } = await supabase.from('payment_submissions').insert({
        id: submissionId,
        user_id: userId,
        plan_id: selectedPlan.id,
        payment_method_id: selectedMethod.id,
        amount_etb: selectedPlan.price_monthly_usd,
        currency: 'ETB',
        transaction_ref: autoRef,
        payment_date: today,
        proof_path: path,
        note: note.trim() || null,
        status: 'pending_verification',
        submitted_at: new Date().toISOString(),
      })
      if (insErr) throw new Error(`Submission failed: ${insErr.message}`)

      // Notify admin
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'payment_submitted',
        title: `New payment submitted — ${selectedPlan.name}`,
        body: `${fmtEtb(selectedPlan.price_monthly_usd)} via ${selectedMethod.name}.`,
        data: { submission_id: submissionId, plan: selectedPlan.name, method: selectedMethod.name },
        is_read: false,
      })

      // Show pending immediately without waiting for reload
      setPendingSubmission({
        id: submissionId,
        amount_etb: selectedPlan.price_monthly_usd,
        transaction_ref: autoRef,
        submitted_at: new Date().toISOString(),
        status: 'pending_verification',
        plan: { name: selectedPlan.name },
        method: { name: selectedMethod.name },
      })
      setSubmitted(true)
      loadData(userId)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-semibold">Sign in required</p>
        <p className="text-sm text-muted-foreground">Please sign in to manage your subscription.</p>
        <button onClick={() => navigate('/login')}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Sign In
        </button>
      </div>
    )
  }

  const plan = sub?.plan
  const isFree = !plan || plan.tier === 'free' || !sub || ['cancelled','expired'].includes(sub.status)
  const days = remainingDays(sub?.current_period_end)
  const expiringSoon = days !== null && days <= 7 && days >= 0

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border h-14 flex items-center gap-3 px-4">
        <button onClick={() => view !== 'overview' ? setView('overview') : navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">
          {view === 'plans' ? 'Choose a Plan' : view === 'pay' ? 'Complete Payment' : 'Subscription & Billing'}
        </h1>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">

        {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
        {view === 'overview' && (
          <>
            {dataLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Current plan card */}
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Plan</p>
                      <p className="text-2xl font-bold mt-0.5">{plan?.name ?? 'Free'}</p>
                    </div>
                    <StatusBadge status={isFree ? 'free' : (sub?.status ?? 'free')} />
                  </div>

                  {!isFree && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Price</p><p className="font-semibold">{fmtEtb(plan?.price_monthly_usd)}<span className="text-xs text-muted-foreground">/mo</span></p></div>
                      {sub?.current_period_start && <div><p className="text-xs text-muted-foreground">Started</p><p className="font-semibold">{fmtDate(sub.current_period_start)}</p></div>}
                      {sub?.current_period_end && <div><p className="text-xs text-muted-foreground">Expires</p><p className={`font-semibold ${expiringSoon ? 'text-amber-400' : ''}`}>{fmtDate(sub.current_period_end)}</p></div>}
                      {days !== null && <div><p className="text-xs text-muted-foreground">Remaining</p><p className={`font-semibold ${expiringSoon ? 'text-amber-400' : ''}`}>{days === 0 ? 'Today' : `${days}d`}</p></div>}
                    </div>
                  )}

                  {plan && !isFree && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 border border-border/40">{plan.max_ai_calls_day} AI/day</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 border border-border/40">{plan.max_devices} device{plan.max_devices > 1 ? 's' : ''}</span>
                      {plan.features?.ads === false && <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 border border-border/40">No ads</span>}
                    </div>
                  )}
                </div>

                {/* Expiry warning */}
                {expiringSoon && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-400">Expires in {days} day{days !== 1 ? 's' : ''}</p>
                      <button onClick={() => setView('plans')} className="text-sm text-primary hover:underline mt-1 flex items-center gap-1">
                        Renew now <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Pending payment */}
                {pendingSubmission && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /><p className="text-sm font-semibold">Payment Pending Verification</p></div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Plan</p><p className="font-semibold">{pendingSubmission.plan?.name}</p></div>
                      <div><p className="text-muted-foreground">Amount</p><p className="font-semibold">{fmtEtb(pendingSubmission.amount_etb)}</p></div>
                      <div><p className="text-muted-foreground">Method</p><p className="font-semibold">{pendingSubmission.method?.name}</p></div>
                      <div><p className="text-muted-foreground">Reference</p><p className="font-semibold font-mono">{pendingSubmission.transaction_ref}</p></div>
                    </div>
                    <p className="text-xs text-amber-400 flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Awaiting admin review</p>
                  </div>
                )}

                {/* Rejected payment */}
                {latestRejected && !pendingSubmission && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-400" /><p className="text-sm font-semibold">Payment Rejected</p></div>
                    <p className="text-xs text-muted-foreground"><span className="font-medium text-red-400">Reason: </span>{latestRejected.rejection_reason ?? 'No reason given'}</p>
                    {latestRejected.rejection_reason_custom && <p className="text-xs text-muted-foreground">{latestRejected.rejection_reason_custom}</p>}
                    <button onClick={() => { setSelectedPlan(latestRejected.plan ? { ...latestRejected.plan } : null); setView('plans') }}
                      className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
                      Resubmit Payment
                    </button>
                  </div>
                )}

                {/* Upgrade/Renew/Change CTA — disabled when payment is pending */}
                <button
                  onClick={() => !pendingSubmission && setView('plans')}
                  disabled={!!pendingSubmission}
                  className={`w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                    pendingSubmission
                      ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  <Crown className="h-4 w-4" />
                  {pendingSubmission
                    ? 'Payment Pending Verification…'
                    : isFree
                      ? 'Upgrade Plan'
                      : expiringSoon
                        ? 'Renew Plan'
                        : 'Change Plan'}
                </button>

                <button onClick={() => navigate('/payment-history')}
                  className="w-full h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" /> View Payment History
                </button>

                <button onClick={() => loadData(userId)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-2 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </>
            )}
          </>
        )}

        {/* ── PLAN SELECTION ──────────────────────────────────────────────── */}
        {view === 'plans' && (
          <div className="space-y-4 pt-1">
            {/* Header */}
            <div className="text-center space-y-1 pb-2">
              <p className="text-xs text-primary font-semibold uppercase tracking-widest">Choose your plan</p>
              <h2 className="text-xl font-bold">Unlock your full potential</h2>
              <p className="text-xs text-muted-foreground">All plans include a 30-day subscription. Cancel anytime.</p>
            </div>

            {plans.filter(p => p.tier !== 'free').map((p, idx) => {
              const isPopular = p.tier === 'pro'
              const isElite   = p.tier === 'elite'
              const isTeam    = p.tier === 'team'
              const isCurrent = sub?.plan?.id === p.id

              const tierIcon = isTeam ? Users : isElite ? Shield : isPopular ? Rocket : Zap
              const TierIcon = tierIcon

              // Features list per tier
              const featureList = [
                p.features?.ai        && `${p.max_ai_calls_day} AI coaching calls/day`,
                p.features?.export    && 'Export PDF & JSON data',
                p.features?.ads === false && 'No advertisements',
                p.max_devices > 1     && `Up to ${p.max_devices} devices`,
                p.features?.priority_support && 'Priority support',
                isTeam                && 'Team management',
              ].filter(Boolean)

              // Visual style per tier
              const styles = isElite
                ? {
                    card:   'border-violet-500/50 bg-gradient-to-br from-violet-950/40 via-card to-card',
                    badge:  'bg-violet-500/15 text-violet-400 border-violet-500/30',
                    icon:   'bg-violet-500/15 text-violet-400',
                    price:  'text-violet-400',
                    btn:    'bg-violet-600 hover:bg-violet-500 text-white',
                    glow:   'shadow-violet-500/10',
                  }
                : isTeam
                ? {
                    card:   'border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-card',
                    badge:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
                    icon:   'bg-amber-500/15 text-amber-400',
                    price:  'text-amber-400',
                    btn:    'bg-amber-600 hover:bg-amber-500 text-white',
                    glow:   'shadow-amber-500/10',
                  }
                : {
                    card:   'border-primary/50 bg-gradient-to-br from-primary/10 via-card to-card',
                    badge:  'bg-primary/15 text-primary border-primary/30',
                    icon:   'bg-primary/15 text-primary',
                    price:  'text-primary',
                    btn:    'bg-primary hover:bg-primary/90 text-primary-foreground',
                    glow:   'shadow-primary/10',
                  }

              return (
                <div key={p.id} className="relative">
                  {/* Popular badge — floats above card */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                        <Star className="h-3 w-3 fill-current" /> MOST POPULAR
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedPlan(p)
                      setSelectedMethod(null)
                      setView('pay')
                      setSubmitted(false)
                      setTransactionRef('')
                      setNote('')
                      setProofFile(null)
                      setProofPreview(null)
                    }}
                    className={`w-full rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.99] shadow-lg ${styles.card} ${styles.glow} ${isPopular ? 'pt-7' : ''}`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
                          <TierIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-base leading-tight">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isTeam ? 'For fitness teams & groups' : isElite ? 'For serious athletes' : 'For dedicated users'}
                          </p>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${styles.badge}`}>
                          Current
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-end gap-1 mb-4">
                      <span className={`text-3xl font-black tracking-tight ${styles.price}`}>
                        {fmtEtb(p.price_monthly_usd)}
                      </span>
                      <span className="text-xs text-muted-foreground mb-1">/month</span>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-2 mb-5">
                      {featureList.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${styles.price}`} />
                          <span className="text-foreground/80">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA button */}
                    <div className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${styles.btn}`}>
                      {isCurrent ? 'Renew Plan' : 'Select Plan'}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                </div>
              )
            })}

            {/* Free plan reminder */}
            <p className="text-center text-xs text-muted-foreground pt-1">
              On Free plan? You always have access to basic workout tracking.
            </p>
          </div>
        )}

        {/* ── PAYMENT FLOW ─────────────────────────────────────────────────── */}
        {view === 'pay' && selectedPlan && !submitted && (
          <div className="space-y-5">
            {/* Plan + amount summary */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex justify-between items-center">
              <div><p className="text-xs text-muted-foreground">Plan</p><p className="font-bold">{selectedPlan.name}</p></div>
              <p className="text-2xl font-bold text-primary">{fmtEtb(selectedPlan.price_monthly_usd)}</p>
            </div>

            {/* Step 1: Choose payment method */}
            <div>
              <p className="text-sm font-semibold mb-2">1. Choose Payment Method</p>
              <div className="space-y-2">
                {methods.map(m => (
                  <button key={m.id} onClick={() => setSelectedMethod(m)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${selectedMethod?.id === m.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{m.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground capitalize">{m.type === 'bank' ? 'Bank' : 'Mobile'}</span>
                    </div>

                    {/* Show account details when selected */}
                    {selectedMethod?.id === m.id && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5">
                        {m.account_name && (
                          <div className="flex items-center justify-between">
                            <div><p className="text-[10px] text-muted-foreground">Account Name</p><p className="text-sm font-semibold">{m.account_name}</p></div>
                          </div>
                        )}
                        {m.account_number && (
                          <div className="flex items-center justify-between gap-2">
                            <div><p className="text-[10px] text-muted-foreground">Account Number</p><p className="text-base font-bold font-mono tracking-wider">{m.account_number}</p></div>
                            <CopyBtn text={m.account_number} />
                          </div>
                        )}
                        {m.phone_number && (
                          <div className="flex items-center justify-between gap-2">
                            <div><p className="text-[10px] text-muted-foreground">Phone Number</p><p className="text-base font-bold font-mono">{m.phone_number}</p></div>
                            <CopyBtn text={m.phone_number} />
                          </div>
                        )}
                        {m.instructions && (
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <p className="text-xs text-muted-foreground">{m.instructions}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
                {methods.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No payment methods configured by admin yet.</p>}
              </div>
            </div>

            {/* Step 2: Proof submission form */}
            {selectedMethod && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-4">
                  <p className="text-sm font-semibold">2. Submit Payment Proof</p>

                  {/* Screenshot upload — portrait for mobile screenshots */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Screenshot *</label>
                    <div onClick={() => fileRef.current?.click()}
                      className={`rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors ${proofPreview ? 'border-primary/50 p-2' : 'border-border hover:border-primary/40 p-6'}`}
                      style={{ minHeight: proofPreview ? 'auto' : '280px', aspectRatio: proofPreview ? 'auto' : '9/16', maxHeight: '480px' }}>
                      {proofPreview
                        ? <img src={proofPreview} alt="proof" className="w-full object-contain rounded-lg" style={{ maxHeight: '460px' }} />
                        : (
                          <>
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <Camera className="h-7 w-7 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-center">Tap to upload screenshot</p>
                            <p className="text-xs text-muted-foreground text-center">Take a screenshot of your payment confirmation</p>
                            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · Max 5 MB</p>
                          </>
                        )
                      }
                    </div>
                    {proofPreview && (
                      <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                        className="mt-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
                        Remove photo
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFile} />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Note (optional)</label>
                    <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Any additional info…"
                      className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-sm text-destructive">{formError}</p>
                    </div>
                  )}

                  <button disabled={submitting || !proofFile} onClick={handleSubmit}
                    className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all">
                    {submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting…</> : 'Submit Payment Proof'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────────────────── */}
        {view === 'pay' && submitted && (
          <div className="flex flex-col items-center text-center gap-5 py-8">
            <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Submitted!</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                Your payment is pending manual verification. Your <strong>{selectedPlan?.name}</strong> subscription will activate once approved.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-border bg-card p-5 text-left space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-semibold">{selectedPlan?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{fmtEtb(selectedPlan?.price_monthly_usd)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-semibold">{selectedMethod?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-semibold font-mono">{transactionRef}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status="pending_verification" /></div>
            </div>
            <button onClick={() => setView('overview')}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all">
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
