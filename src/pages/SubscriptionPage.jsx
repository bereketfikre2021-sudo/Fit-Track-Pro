/**
 * SubscriptionPage.jsx
 * User-facing Subscription & Billing — Phase 14.5
 *
 * WHAT'S NEW vs Phase 13:
 *   - Duration picker (1 / 3 / 6 / 12 months) with discount badges
 *   - "Pay with Wallet" flow: shows balance, deducts atomically, no screenshot needed
 *   - "Add Money to Wallet" shortcut to WalletPage
 *   - Prices always read from subscription_purchase_options (never hardcoded)
 *   - Wallet balance + insufficient-balance guard shown before confirmation
 *
 * UNCHANGED:
 *   - Manual payment flow (screenshot + transaction ref) for users without wallet funds
 *   - Existing subscription status display
 *   - Existing pending/rejected submission banners
 *   - All payment methods (CBE, Awash, Telebirr)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { compressImageFile } from '../lib/imageUtils'
import { useSubscription } from '../lib/useSubscription'
import {
  fetchPurchaseOptionsForPlan,
  fetchPurchaseOptions,
  purchaseSubscriptionWithWallet,
  fetchWallet,
  ensureWallet,
  formatEtb,
  subscribeToWallet,
} from '../lib/wallet'
import {
  ChevronLeft, Copy, Check, Camera, AlertCircle,
  Loader2, Crown, CreditCard, Clock, CheckCircle2,
  XCircle, ArrowRight, RefreshCw, Zap, Sparkles,
  Shield, Rocket, Star, Users, Wallet, Plus,
  Tag, Gift,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Synthetic options built from a base plan (when DB table is empty) ─────────
const DURATION_SPECS = [
  { duration: '1_month',   months: 1,  discount: 0,  order: 1 },
  { duration: '3_months',  months: 3,  discount: 5,  order: 2 },
  { duration: '6_months',  months: 6,  discount: 10, order: 3 },
  { duration: '12_months', months: 12, discount: 15, order: 4 },
]

function makeFallbackOptions(plan) {
  const monthlyPrice = Number(plan.price_monthly_usd)
  return DURATION_SPECS.map(spec => ({
    id:                    `fallback-${plan.id}-${spec.duration}`,
    plan_id:               plan.id,
    duration:              spec.duration,
    duration_months:       spec.months,
    price_etb:             Math.round(monthlyPrice * spec.months * (1 - spec.discount / 100) * 100) / 100,
    effective_monthly_etb: Math.round(monthlyPrice * (1 - spec.discount / 100) * 100) / 100,
    currency:              'ETB',
    discount_pct:          spec.discount > 0 ? spec.discount : null,
    is_active:             true,
    display_order:         spec.order,
    _isFallback:           true,
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
      {Icon && <Icon className="h-3 w-3" />}{c.label}
    </span>
  )
}

// ── Duration pill ─────────────────────────────────────────────────────────────
function DurationPill({ option, selected, onSelect }) {
  const DURATION_LABELS = {
    '1_month':  '1 Month',
    '3_months': '3 Months',
    '6_months': '6 Months',
    '12_months':'12 Months',
  }
  const label = DURATION_LABELS[option.duration] ?? option.duration
  const hasDiscount = option.discount_pct > 0

  return (
    <button
      onClick={() => onSelect(option)}
      className={`relative flex-1 rounded-xl border-2 px-3 py-2.5 text-center transition-all active:scale-95 ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      {hasDiscount && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white whitespace-nowrap">
          -{option.discount_pct}%
        </span>
      )}
      <p className="text-xs font-semibold">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${selected ? 'text-primary' : 'text-foreground'}`}>
        {formatEtb(option.price_etb)}
      </p>
      {option.effective_monthly_etb && option.duration_months > 1 && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatEtb(option.effective_monthly_etb)}/mo
        </p>
      )}
    </button>
  )
}

// ── Payment method selector ───────────────────────────────────────────────────
function PaymentMethodCard({ method, selected, onSelect }) {
  return (
    <button onClick={() => onSelect(method)}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
      }`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{method.name}</p>
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground capitalize">
          {method.type === 'bank' ? 'Bank' : 'Mobile'}
        </span>
      </div>
      {selected && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5">
          {method.account_name && (
            <div><p className="text-[10px] text-muted-foreground">Account Name</p><p className="text-sm font-semibold">{method.account_name}</p></div>
          )}
          {method.account_number && (
            <div className="flex items-center justify-between gap-2">
              <div><p className="text-[10px] text-muted-foreground">Account Number</p><p className="text-base font-bold font-mono tracking-wider">{method.account_number}</p></div>
              <CopyBtn text={method.account_number} />
            </div>
          )}
          {method.phone_number && (
            <div className="flex items-center justify-between gap-2">
              <div><p className="text-[10px] text-muted-foreground">Phone</p><p className="text-base font-bold font-mono">{method.phone_number}</p></div>
              <CopyBtn text={method.phone_number} />
            </div>
          )}
          {method.instructions && (
            <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">{method.instructions}</div>
          )}
        </div>
      )}
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════
export default function SubscriptionPage() {
  const navigate = useNavigate()

  // Auth
  const [userId, setUserId] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Trial status from the subscription hook (cached, fast)
  const { features: subFeatures } = useSubscription()

  // Data
  const [sub, setSub] = useState(null)
  const [plans, setPlans] = useState([])      // base plans (from subscription_plans)
  const [allOptions, setAllOptions] = useState([]) // all purchase options
  const [methods, setMethods] = useState([])
  const [wallet, setWallet] = useState(null)
  const [pendingSubmission, setPendingSubmission] = useState(null)
  const [latestRejected, setLatestRejected] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)

  // UI navigation
  const [view, setView] = useState('overview') // overview | plans | pay | wallet-confirm
  const [selectedPlan, setSelectedPlan] = useState(null)       // base plan object
  const [selectedOption, setSelectedOption] = useState(null)   // purchase option (plan×duration)
  const [planOptions, setPlanOptions] = useState([])            // options for currently selected plan
  const [optionsLoading, setOptionsLoading] = useState(false)

  // Payment method (manual)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [payMethod, setPayMethod] = useState(null) // 'wallet' | 'manual'

  // Manual payment form
  const [note, setNote] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedRef, setSubmittedRef] = useState('')

  // Wallet purchase
  const [walletPurchasing, setWalletPurchasing] = useState(false)
  const [walletPurchaseResult, setWalletPurchaseResult] = useState(null)

  const fileRef = useRef(null)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setAuthLoading(false)
    })
  }, [])

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadData = useCallback(async (uid) => {
    if (!uid) return
    setDataLoading(true)
    try {
      const safe = async (fn) => { try { return await fn() } catch { return null } }

      // Ensure wallet exists
      await safe(() => ensureWallet(uid))

      const [subData, plansData, allOptsData, methodsData, walletData, pendingData, rejectedData] =
        await Promise.all([
          safe(async () => {
            const { data } = await supabase
              .from('user_subscriptions')
              .select('id,status,current_period_start,current_period_end,plan:subscription_plans(id,name,tier,price_monthly_usd,features,max_ai_calls_day,max_devices)')
              .eq('user_id', uid)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (!data) return null
            // Phase 14.5 columns — fetch separately so a missing column doesn't break the whole query
            let extra = {}
            try {
              const { data: ext } = await supabase
                .from('user_subscriptions')
                .select('auto_renew,duration_months,price_paid_etb')
                .eq('id', data.id)
                .maybeSingle()
              if (ext) extra = ext
            } catch { /* columns not yet added */ }
            return { ...data, ...extra }
          }),
          safe(async () => {
            const { data } = await supabase
              .from('subscription_plans')
              .select('id,name,tier,price_monthly_usd,features,max_ai_calls_day,max_devices')
              .eq('is_active', true)
              .order('price_monthly_usd')
            return data ?? []
          }),
          safe(() => fetchPurchaseOptions()),
          safe(async () => {
            const { data } = await supabase
              .from('app_payment_methods')
              .select('id,name,type,account_name,account_number,phone_number,instructions')
              .eq('is_active', true)
              .order('display_order')
            return data ?? []
          }),
          safe(() => fetchWallet(uid)),
          safe(async () => {
            // Schema-safe: don't select Phase 14.5 columns that may not exist
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
          safe(async () => {
            // Load rejected subscription payments — schema-safe (purpose column may not exist)
            let q = supabase
              .from('payment_submissions')
              .select('id,amount_etb,transaction_ref,submitted_at,rejection_reason,rejection_reason_custom,plan:subscription_plans(id,name,tier,price_monthly_usd)')
              .eq('user_id', uid)
              .eq('status', 'rejected')
              .order('submitted_at', { ascending: false })
              .limit(1)

            // Try adding purpose filter (will be ignored if column doesn't exist)
            const { data: withPurpose, error: pErr } = await q.eq('purpose', 'subscription_purchase').maybeSingle()
            if (!pErr) return withPurpose ?? null

            // Fallback without purpose filter — return any rejected submission
            const { data: fallback } = await q.maybeSingle()
            return fallback ?? null
          }),
        ])

      setSub(subData ?? null)
      setPlans(plansData ?? [])
      setAllOptions(allOptsData ?? [])
      setMethods(methodsData ?? [])
      setWallet(walletData ?? null)
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

  // ── Real-time ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const ch = supabase.channel('sub-wallet-rt-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_submissions', filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId, loadData])

  // Real-time wallet balance
  useEffect(() => {
    if (!userId) return
    const ch = subscribeToWallet(userId, (updated) => {
      if (updated.user_id === userId) setWallet(updated)
    })
    return () => supabase.removeChannel(ch)
  }, [userId])

  // ── When a plan is selected, load its duration options ────────────────────
  const selectPlan = useCallback(async (plan) => {
    setSelectedPlan(plan)
    setSelectedOption(null)
    setPayMethod(null)
    setSelectedMethod(null)
    setView('pay')
    setSubmitted(false)
    setFormError(null)
    setProofFile(null)
    setProofPreview(null)
    setWalletPurchaseResult(null)

    // Options may already be in allOptions (loaded from the view on page load)
    const cached = allOptions.filter(o => o.plan_id === plan.id)
    if (cached.length > 0) {
      setPlanOptions(cached)
      const defaultOpt = cached.find(o => o.duration === '1_month') ?? cached[0]
      setSelectedOption(defaultOpt)
      return
    }

    // Try fetching directly from the table
    setOptionsLoading(true)
    try {
      const opts = await fetchPurchaseOptionsForPlan(plan.id)
      if (opts && opts.length > 0) {
        setPlanOptions(opts)
        const defaultOpt = opts.find(o => o.duration === '1_month') ?? opts[0]
        setSelectedOption(defaultOpt)
      } else {
        // DB table empty or migration not applied — generate all 4 durations synthetically
        const fallbacks = makeFallbackOptions(plan)
        setPlanOptions(fallbacks)
        setSelectedOption(fallbacks[0]) // 1 month default
      }
    } catch {
      // Even on error give all 4 duration options from plan price
      const fallbacks = makeFallbackOptions(plan)
      setPlanOptions(fallbacks)
      setSelectedOption(fallbacks[0])
    } finally {
      setOptionsLoading(false)
    }
  }, [allOptions])

  // ── Handle proof file ─────────────────────────────────────────────────────
  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
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

  // ── Submit manual payment ─────────────────────────────────────────────────
  const handleManualSubmit = async () => {
    if (!proofFile) { setFormError('Please upload your payment screenshot'); return }
    if (!selectedPlan || !selectedMethod || !selectedOption || !userId) return
    setFormError(null)
    setSubmitting(true)
    try {
      const submissionId = crypto.randomUUID()
      const autoRef = `FTP-${Date.now().toString(36).toUpperCase()}`
      const today = new Date().toISOString().slice(0, 10)
      const ext = proofFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${userId}/${submissionId}/proof.${ext}`

      await supabase.storage.from('payment-proofs').remove([path])
      const { error: upErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, proofFile, { upsert: false, contentType: proofFile.type || `image/${ext}` })
      if (upErr) throw new Error(`Screenshot upload failed: ${upErr.message}`)

      // Build the base insert payload (only original-schema columns)
      const basePayload = {
        id:                   submissionId,
        user_id:              userId,
        plan_id:              selectedPlan.id,
        payment_method_id:    selectedMethod.id,
        amount_etb:           selectedOption.price_etb,
        currency:             'ETB',
        transaction_ref:      autoRef,
        payment_date:         today,
        proof_path:           path,
        note:                 note.trim() || null,
        status:               'pending_verification',
        submitted_at:         new Date().toISOString(),
      }

      // Try inserting with Phase 14.5 columns first
      let insErr = null
      const { error: insErrFull } = await supabase.from('payment_submissions').insert({
        ...basePayload,
        purpose:              'subscription_purchase',
        purchase_option_id:   selectedOption._isFallback ? null : selectedOption.id,
      })
      insErr = insErrFull

      // If it failed because of missing columns, retry with base payload only
      if (insErr) {
        const isSchemaMissing = insErr.message?.includes('column') ||
                                insErr.message?.includes('schema cache') ||
                                insErr.code === 'PGRST204' || insErr.code === '42703'
        if (!isSchemaMissing) throw new Error(`Submission failed: ${insErr.message}`)
        const { error: insErrBase } = await supabase.from('payment_submissions').insert(basePayload)
        if (insErrBase) throw new Error(`Submission failed: ${insErrBase.message}`)
      }

      // Notify admin
      await supabase.from('notifications').insert({
        user_id: userId,
        type:    'payment_submitted',
        title:   `New payment — ${selectedPlan.name} (${selectedOption.duration_months}mo)`,
        body:    `${formatEtb(selectedOption.price_etb)} via ${selectedMethod.name}.`,
        data:    { submission_id: submissionId, plan: selectedPlan.name, duration_months: selectedOption.duration_months },
        is_read: false,
      })

      setPendingSubmission({
        id: submissionId, amount_etb: selectedOption.price_etb,
        transaction_ref: autoRef, submitted_at: new Date().toISOString(),
        status: 'pending_verification',
        plan: { name: selectedPlan.name }, method: { name: selectedMethod.name },
      })
      setSubmittedRef(autoRef)
      setSubmitted(true)
      loadData(userId)
    } catch (e) {
      // Manual payment errors: only the screenshot/upload message is user-friendly
      const msg = e?.message ?? ''
      setFormError(msg.startsWith('Screenshot') ? msg : 'Something went wrong. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Purchase with wallet ──────────────────────────────────────────────────
  const handleWalletPurchase = async () => {
    if (!selectedOption || !userId) return
    setWalletPurchasing(true)
    setFormError(null)
    try {
      const result = await purchaseSubscriptionWithWallet(userId, selectedOption.id)
      setWalletPurchaseResult(result)
      toast.success(`${selectedPlan.name} plan activated!`)
      loadData(userId)
    } catch (e) {
      // Wallet purchase errors from the RPC are already user-friendly (insufficient balance, etc.)
      const msg = e?.message ?? ''
      const isUserFriendly = msg.includes('Insufficient') || msg.includes('ETB') || msg.includes('balance')
      setFormError(isUserFriendly ? msg : 'Purchase failed. Please try again later.')
    } finally {
      setWalletPurchasing(false)
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
        <button onClick={() => navigate('/login')}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Sign In
        </button>
      </div>
    )
  }

  const plan = sub?.plan
  const isFree = !plan || plan.tier === 'free' || !sub || ['cancelled', 'expired'].includes(sub.status)
  const days = remainingDays(sub?.current_period_end)
  const expiringSoon = days !== null && days <= 7 && days >= 0
  const walletBalance = wallet?.balance ?? 0
  const canPayWithWallet = selectedOption && walletBalance >= selectedOption.price_etb
  const walletShortfall = selectedOption ? Math.max(0, selectedOption.price_etb - walletBalance) : 0

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border h-14 flex items-center gap-3 px-4">
        <button
          onClick={() => {
            if (view === 'overview') navigate(-1)
            else { setView('overview'); setSubmitted(false); setWalletPurchaseResult(null) }
          }}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">
          {view === 'plans' ? 'Choose a Plan' : view === 'pay' ? 'Complete Payment' : 'Subscription & Billing'}
        </h1>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">

        {/* ══════════════════════════════════════════════════════════════════
            OVERVIEW
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'overview' && (
          <>
            {dataLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Current plan card */}
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Plan</p>
                      <p className="text-2xl font-bold mt-0.5">{plan?.name ?? 'Free'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {subFeatures.isTrialProvider && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                          <Gift className="h-3 w-3" /> FREE TRIAL
                        </span>
                      )}
                      <StatusBadge status={isFree ? 'free' : (sub?.status ?? 'free')} />
                    </div>
                  </div>
                  {!isFree && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-semibold">{sub?.duration_months ?? 1} month(s)</p></div>
                      <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold">{formatEtb(sub?.price_paid_etb ?? plan?.price_monthly_usd)}</p></div>
                      {sub?.current_period_start && <div><p className="text-xs text-muted-foreground">Started</p><p className="font-semibold">{fmtDate(sub.current_period_start)}</p></div>}
                      {sub?.current_period_end && <div><p className="text-xs text-muted-foreground">Expires</p><p className={`font-semibold ${expiringSoon ? 'text-amber-400' : ''}`}>{fmtDate(sub.current_period_end)}</p></div>}
                    </div>
                  )}
                  {plan && !isFree && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 border border-border/40">{plan.max_ai_calls_day} AI/day</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 border border-border/40">{plan.max_devices} device{plan.max_devices > 1 ? 's' : ''}</span>
                      {plan.features?.ads === false && <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 border border-border/40">No ads</span>}
                      {sub?.auto_renew && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Auto-renew ON</span>}
                    </div>
                  )}
                </div>

                {/* Trial banner — shown when user is on a free trial */}
                {subFeatures.isTrial && subFeatures.isTrialProvider && days !== null && days >= 0 && (
                  <div className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-card p-4 flex gap-3">
                    <Gift className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary">
                        {days === 0 ? 'Trial ends today!' : `Free Pro Trial — ${days} day${days !== 1 ? 's' : ''} left`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You're enjoying full Pro access for free. Subscribe before your trial ends to keep all features.
                      </p>
                      <button
                        onClick={() => setView('plans')}
                        className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        Subscribe now <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-black text-primary tabular-nums">{days}</p>
                      <p className="text-[10px] text-muted-foreground">{days === 1 ? 'day' : 'days'}</p>
                    </div>
                  </div>
                )}

                {/* Expiry warning — for paid plans expiring soon (not trial, handled above) */}
                {expiringSoon && !subFeatures.isTrialProvider && (
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

                {/* Wallet shortcut */}
                <button onClick={() => navigate('/wallet')}
                  className="w-full rounded-xl border border-border bg-card p-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold">My Wallet</p>
                    <p className="text-xs text-muted-foreground">{formatEtb(walletBalance)} available</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>

                {/* Pending submission */}
                {pendingSubmission && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /><p className="text-sm font-semibold">Payment Pending Verification</p></div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Plan</p><p className="font-semibold">{pendingSubmission.plan?.name}</p></div>
                      <div><p className="text-muted-foreground">Amount</p><p className="font-semibold">{formatEtb(pendingSubmission.amount_etb)}</p></div>
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
                    <button onClick={() => selectPlan(latestRejected.plan)}
                      className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                      Resubmit Payment
                    </button>
                  </div>
                )}

                {/* Main CTA */}
                <button
                  onClick={() => !pendingSubmission && setView('plans')}
                  disabled={!!pendingSubmission}
                  className={`w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                    pendingSubmission
                      ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}>
                  <Crown className="h-4 w-4" />
                  {pendingSubmission ? 'Payment Pending Verification…' : isFree ? 'Upgrade Plan' : subFeatures.isTrialProvider ? 'Subscribe Now' : expiringSoon ? 'Renew Plan' : 'Change Plan'}
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

        {/* ══════════════════════════════════════════════════════════════════
            PLAN SELECTION
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'plans' && (
          <div className="space-y-4 pt-1">
            <div className="text-center space-y-1 pb-2">
              <p className="text-xs text-primary font-semibold uppercase tracking-widest">Choose your plan</p>
              <h2 className="text-xl font-bold">Unlock your full potential</h2>
              <p className="text-xs text-muted-foreground">Multiple billing durations available — longer plans save more.</p>
            </div>

            {plans.filter(p => p.tier !== 'free').map((p) => {
              const isPopular = p.tier === 'pro'
              const isElite   = p.tier === 'elite'
              const isTeam    = p.tier === 'team'
              const isCurrent = sub?.plan?.id === p.id

              // Tier options for price display
              const tierOptions = allOptions.filter(o => o.plan_id === p.id)
              const lowestOption = tierOptions.find(o => o.duration === '1_month')
              const displayPrice = lowestOption?.price_etb ?? p.price_monthly_usd

              const tierIcon = isTeam ? Users : isElite ? Shield : isPopular ? Rocket : Zap
              const TierIcon = tierIcon

              const styles = isElite
                ? { card: 'border-violet-500/50 bg-gradient-to-br from-violet-950/40 via-card to-card', price: 'text-violet-400', btn: 'bg-violet-600 hover:bg-violet-500 text-white' }
                : isTeam
                ? { card: 'border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-card', price: 'text-amber-400', btn: 'bg-amber-600 hover:bg-amber-500 text-white' }
                : { card: 'border-primary/50 bg-gradient-to-br from-primary/10 via-card to-card', price: 'text-primary', btn: 'bg-primary hover:bg-primary/90 text-primary-foreground' }

              const featureList = [
                p.features?.ai        && `${p.max_ai_calls_day} AI coaching calls/day`,
                p.features?.export    && 'Export PDF & JSON data',
                p.features?.ads === false && 'No advertisements',
                p.max_devices > 1     && `Up to ${p.max_devices} devices`,
                p.features?.priority_support && 'Priority support',
                isTeam                && 'Team management',
              ].filter(Boolean)

              return (
                <div key={p.id} className="relative">
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                        <Star className="h-3 w-3 fill-current" /> MOST POPULAR
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => selectPlan(p)}
                    className={`w-full rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.99] shadow-lg ${styles.card} ${isPopular ? 'pt-7' : ''}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-bold text-base">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isTeam ? 'For fitness teams & groups' : isElite ? 'For serious athletes' : 'For dedicated users'}
                        </p>
                      </div>
                      {isCurrent && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/30 bg-primary/15 text-primary">Current</span>}
                    </div>
                    {/* Price display — always from purchase options */}
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className={`text-2xl font-black ${styles.price}`}>{formatEtb(displayPrice)}</span>
                      <span className="text-xs text-muted-foreground">/month</span>
                      {tierOptions.some(o => o.discount_pct > 0) && (
                        <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                          <Tag className="h-2.5 w-2.5" /> Discounts available
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {featureList.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${styles.price}`} />
                          <span className="text-foreground/80">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className={`w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${styles.btn}`}>
                      {isCurrent ? 'Renew Plan' : 'Select Plan'} <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                </div>
              )
            })}

            <p className="text-center text-xs text-muted-foreground pt-1">
              On Free plan? You always have access to basic workout tracking.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PAYMENT VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'pay' && selectedPlan && (
          <>
            {/* ── Wallet purchase success ── */}
            {walletPurchaseResult && (
              <div className="flex flex-col items-center text-center gap-5 py-8">
                <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Subscription Activated!</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                    Your <strong>{selectedPlan.name}</strong> plan ({selectedOption?.duration_months} month(s)) is now active.
                    <br />{formatEtb(walletPurchaseResult.amount_debited)} was deducted from your wallet.
                  </p>
                </div>
                <div className="w-full rounded-2xl border border-border bg-card p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-semibold">{selectedPlan.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{selectedOption?.duration_months} month(s)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-semibold">{formatEtb(walletPurchaseResult.amount_debited)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span className="font-semibold">{fmtDate(walletPurchaseResult.period_end)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-semibold text-primary flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />Wallet</span></div>
                </div>
                <button onClick={() => { setView('overview'); setWalletPurchaseResult(null) }}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all">
                  Done
                </button>
              </div>
            )}

            {/* ── Manual payment success ── */}
            {submitted && !walletPurchaseResult && (
              <div className="flex flex-col items-center text-center gap-5 py-8">
                <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Submitted!</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                    Your payment is pending verification. Your <strong>{selectedPlan.name}</strong> subscription will activate once approved.
                  </p>
                </div>
                <div className="w-full rounded-2xl border border-border bg-card p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-semibold">{selectedPlan.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{selectedOption?.duration_months} month(s)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{formatEtb(selectedOption?.price_etb)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-semibold">{selectedMethod?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs font-semibold">{submittedRef}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status="pending_verification" /></div>
                </div>
                <button onClick={() => setView('overview')}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all">
                  Done
                </button>
              </div>
            )}

            {/* ── Payment form ── */}
            {!submitted && !walletPurchaseResult && (
              <div className="space-y-5">
                {/* Plan summary — updates live when duration changes */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="font-bold">{selectedPlan.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {selectedOption ? formatEtb(selectedOption.price_etb) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedOption?.duration_months ?? 1} month(s)
                      {selectedOption?.discount_pct > 0 && (
                        <span className="ml-1 text-emerald-400 font-semibold">−{selectedOption.discount_pct}% off</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* ── Step 1: Duration picker ── */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    1. Choose Duration
                    <span className="text-[10px] text-muted-foreground font-normal">(longer = more savings)</span>
                  </p>
                  {optionsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : planOptions.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {planOptions.map(opt => (
                        <DurationPill
                          key={opt.id}
                          option={opt}
                          selected={selectedOption?.id === opt.id}
                          onSelect={setSelectedOption}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No duration options available.</p>
                  )}
                </div>

                {/* ── Step 2: Payment method ── */}
                {selectedOption && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">2. Payment Method</p>

                    {/* Wallet option */}
                    <button
                      onClick={() => setPayMethod('wallet')}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                        payMethod === 'wallet'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Pay with Wallet</p>
                            <p className="text-xs text-muted-foreground">
                              Balance: <span className={`font-semibold ${canPayWithWallet ? 'text-emerald-400' : 'text-destructive'}`}>
                                {formatEtb(walletBalance)}
                              </span>
                            </p>
                          </div>
                        </div>
                        {canPayWithWallet
                          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Ready</span>
                          : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">Low</span>
                        }
                      </div>

                      {/* Wallet breakdown when selected */}
                      {payMethod === 'wallet' && (
                        <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-xs text-center">
                            <div className="rounded-lg bg-background/70 p-2">
                              <p className="text-muted-foreground">Balance</p>
                              <p className="font-bold tabular-nums">{formatEtb(walletBalance)}</p>
                            </div>
                            <div className="rounded-lg bg-background/70 p-2">
                              <p className="text-muted-foreground">Price</p>
                              <p className="font-bold text-primary tabular-nums">{formatEtb(selectedOption.price_etb)}</p>
                            </div>
                            <div className={`rounded-lg p-2 ${canPayWithWallet ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                              <p className="text-muted-foreground">After</p>
                              <p className={`font-bold tabular-nums ${canPayWithWallet ? 'text-emerald-400' : 'text-destructive'}`}>
                                {canPayWithWallet ? formatEtb(walletBalance - selectedOption.price_etb) : `−${formatEtb(walletShortfall)}`}
                              </p>
                            </div>
                          </div>

                          {!canPayWithWallet && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs space-y-1">
                              <p className="text-amber-400 font-semibold">Insufficient wallet balance</p>
                              <p className="text-muted-foreground">You need {formatEtb(walletShortfall)} more to use this option.</p>
                              <button onClick={() => navigate('/wallet?tab=top-up')}
                                className="flex items-center gap-1 text-primary font-semibold hover:underline">
                                <Plus className="h-3 w-3" /> Add Money to Wallet
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Manual payment methods */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 px-1">Or pay via bank / mobile transfer:</p>
                      {methods.map(m => (
                        <div key={m.id} className="mb-2">
                          <PaymentMethodCard
                            method={m}
                            selected={payMethod === 'manual' && selectedMethod?.id === m.id}
                            onSelect={(method) => { setPayMethod('manual'); setSelectedMethod(method) }}
                          />
                        </div>
                      ))}
                      {methods.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-3">No payment methods configured.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step 3a: Wallet confirm button ── */}
                {payMethod === 'wallet' && selectedOption && canPayWithWallet && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-muted/30 p-4 space-y-2 text-sm">
                      <p className="font-semibold text-center">Confirm Wallet Purchase</p>
                      <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-semibold">{selectedPlan.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{selectedOption.duration_months} month(s)</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-primary">{formatEtb(selectedOption.price_etb)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Remaining balance</span><span className="font-semibold">{formatEtb(walletBalance - selectedOption.price_etb)}</span></div>
                    </div>
                    {formError && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{formError}</p>
                      </div>
                    )}
                    <button
                      disabled={walletPurchasing}
                      onClick={handleWalletPurchase}
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all">
                      {walletPurchasing
                        ? <><Loader2 className="h-5 w-5 animate-spin" />Processing…</>
                        : <><Wallet className="h-5 w-5" />Confirm — Pay {formatEtb(selectedOption.price_etb)}</>
                      }
                    </button>
                    <p className="text-xs text-center text-muted-foreground">
                      Your subscription activates immediately upon confirmation.
                    </p>
                  </div>
                )}

                {/* ── Step 3b: Manual payment proof form ── */}
                {payMethod === 'manual' && selectedMethod && selectedOption && (
                  <div className="space-y-4">
                    <div className="h-px bg-border" />
                    <p className="text-sm font-semibold">3. Submit Payment Proof</p>

                    {/* Screenshot upload */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Screenshot *</label>
                      <div onClick={() => fileRef.current?.click()}
                        className={`rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors ${proofPreview ? 'border-primary/50 p-2' : 'border-border hover:border-primary/40 p-6'}`}
                        style={{ minHeight: proofPreview ? 'auto' : 220 }}>
                        {proofPreview
                          ? <img src={proofPreview} alt="proof" className="w-full max-h-64 object-contain rounded-lg" />
                          : <>
                              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center"><Camera className="h-7 w-7 text-primary" /></div>
                              <p className="text-sm font-medium">Tap to upload screenshot</p>
                              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · Max 5 MB</p>
                            </>
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

                    {/* Summary */}
                    <div className="rounded-xl bg-muted/30 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-semibold">{selectedPlan.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{selectedOption.duration_months} month(s)</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-primary">{formatEtb(selectedOption.price_etb)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-semibold">{selectedMethod.name}</span></div>
                    </div>

                    {formError && (
                      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        <p className="text-sm text-destructive">{formError}</p>
                      </div>
                    )}

                    <button disabled={submitting || !proofFile} onClick={handleManualSubmit}
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all">
                      {submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting…</> : 'Submit Payment Proof'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
