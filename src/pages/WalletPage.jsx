/**
 * WalletPage.jsx
 * FitTrack Pro — User Wallet
 *
 * Sections (tab-driven):
 *   overview    → balance + quick actions + pending top-up banner + low-balance warning
 *   top-up      → Add Money flow (enter amount → pick method → upload proof → submit)
 *   history     → Wallet ledger (all transactions)
 *   auto-renew  → Toggle + renewal details + low-balance warning
 *
 * Security:
 *   - Balance is read-only from the user's perspective.
 *   - All balance changes happen server-side via RPCs.
 *   - The "Add Money" form only creates a pending submission — no balance change.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { compressImageFile } from '../lib/imageUtils'
import { toast } from 'sonner'
import {
  ChevronLeft, Wallet, Plus, History, RefreshCw, Loader2,
  AlertCircle, CheckCircle2, XCircle, Clock, ArrowUpRight,
  ArrowDownLeft, Camera, Copy, Check, ToggleLeft, ToggleRight,
  Info, TrendingUp, TrendingDown, Shield, ChevronRight,
} from 'lucide-react'
import {
  fetchWallet, fetchWalletLedger, fetchAutoRenewalStatus,
  setAutoRenew, formatEtb, formatSignedAmount, isCredit,
  WALLET_TX_LABELS, ensureWallet, subscribeToWallet,
} from '../lib/wallet'
import {
  submitWalletTopUp, fetchActivePaymentMethods,
  validateTopUpAmount, MIN_TOPUP_AMOUNT,
} from '../lib/walletTopUp'
import {
  fetchPendingTopUp,
} from '../lib/wallet'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ET', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ET', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function remainingDays(end) {
  if (!end) return null
  return Math.max(0, Math.ceil((new Date(end) - Date.now()) / 86400000))
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Could not copy') }
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors active:scale-95">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Transaction type icon / color ────────────────────────────────────────────
function TxIcon({ type, amount }) {
  const credit = isCredit(amount)
  const base = 'h-9 w-9 flex items-center justify-center rounded-full shrink-0'
  if (credit) {
    return (
      <div className={`${base} bg-emerald-500/15`}>
        <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
      </div>
    )
  }
  return (
    <div className={`${base} bg-primary/15`}>
      <ArrowUpRight className="h-4 w-4 text-primary" />
    </div>
  )
}

// ── Transaction row ───────────────────────────────────────────────────────────
function TxRow({ tx }) {
  const credit = isCredit(tx.amount)
  const label = WALLET_TX_LABELS[tx.type] ?? tx.type
  const statusCls = tx.status === 'REVERSED'
    ? 'line-through text-muted-foreground'
    : credit ? 'text-emerald-400' : 'text-foreground'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
      <TxIcon type={tx.type} amount={tx.amount} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {tx.description ?? (tx.reference ? `Ref: ${tx.reference}` : fmtDateTime(tx.created_at))}
        </p>
        <p className="text-[10px] text-muted-foreground/60">{fmtDateTime(tx.created_at)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${statusCls}`}>
          {formatSignedAmount(tx.amount)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Bal: {formatEtb(tx.balance_after)}
        </p>
        {tx.status === 'REVERSED' && (
          <span className="text-[10px] text-muted-foreground">Reversed</span>
        )}
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending_verification: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    approved:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected:   'bg-red-500/15 text-red-400 border-red-500/30',
    cancelled:  'bg-muted text-muted-foreground border-border',
  }
  const labels = {
    pending_verification: 'Pending',
    approved:   'Approved',
    rejected:   'Rejected',
    cancelled:  'Cancelled',
  }
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? map.cancelled}`}>
      {labels[status] ?? status}
    </span>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════

export default function WalletPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Auth
  const [userId, setUserId] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Tab: overview | top-up | history | auto-renew
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'overview')

  // Wallet data
  const [wallet, setWallet] = useState(null)
  const [renewal, setRenewal] = useState(null)
  const [pendingTopUp, setPendingTopUp] = useState(null)
  const [ledger, setLedger] = useState([])
  const [ledgerTotal, setLedgerTotal] = useState(0)
  const [ledgerOffset, setLedgerOffset] = useState(0)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)

  // Top-up form state
  const [methods, setMethods] = useState([])
  const [topupAmount, setTopupAmount] = useState('')
  const [topupAmountError, setTopupAmountError] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [topupNote, setTopupNote] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [topupSubmitting, setTopupSubmitting] = useState(false)
  const [topupError, setTopupError] = useState(null)
  const [topupSuccess, setTopupSuccess] = useState(false)
  const [topupStage, setTopupStage] = useState('amount') // amount | method | proof | done

  // Auto-renew toggle
  const [autoRenewToggling, setAutoRenewToggling] = useState(false)

  const fileRef = useRef(null)
  const LEDGER_PAGE = 20

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setAuthLoading(false)
    })
  }, [])

  // ── Load wallet data ──────────────────────────────────────────────────────
  const loadData = useCallback(async (uid) => {
    if (!uid) return
    setDataLoading(true)
    try {
      // Ensure wallet exists (creates if missing)
      await ensureWallet(uid).catch(() => {})

      const [walletData, renewalData, pendingData, methodsData] = await Promise.all([
        fetchWallet(uid).catch(() => null),
        fetchAutoRenewalStatus(uid).catch(() => null),
        fetchPendingTopUp(uid).catch(() => null),
        // Fetch payment methods — never swallow errors silently
        fetchActivePaymentMethods().catch(async () => {
          // Retry once in case of a transient network issue
          try { return await fetchActivePaymentMethods() } catch { return [] }
        }),
      ])
      setWallet(walletData)
      setRenewal(renewalData)
      setPendingTopUp(pendingData)
      // Always set — even empty array updates the UI correctly
      setMethods(Array.isArray(methodsData) ? methodsData : [])
    } catch (e) {
      console.error('Wallet load error:', e)
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userId) loadData(userId)
  }, [userId, loadData])

  // ── Load ledger (paginated) ───────────────────────────────────────────────
  const loadLedger = useCallback(async (uid, offset = 0) => {
    if (!uid) return
    setLedgerLoading(true)
    try {
      const { data, total } = await fetchWalletLedger(uid, { limit: LEDGER_PAGE, offset })
      setLedger(offset === 0 ? data : prev => [...prev, ...data])
      setLedgerTotal(total)
    } catch (e) {
      console.error('Ledger load error:', e)
    } finally {
      setLedgerLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userId && tab === 'history') {
      setLedgerOffset(0)
      loadLedger(userId, 0)
    }
  }, [userId, tab, loadLedger])

  // ── Real-time balance updates ─────────────────────────────────────────────
  // Subscribe to INSERT and UPDATE on the wallets table.
  // When an admin credits the wallet, an UPDATE fires and we refresh the balance.
  // When the wallet is created for the first time (INSERT), we also refresh.
  useEffect(() => {
    if (!userId) return
    const ch = subscribeToWallet(userId, (updated) => {
      // updated contains the full new row — use it directly
      setWallet(prev => {
        // Only update if the user_id matches (filter should guarantee this)
        if (updated.user_id === userId) return updated
        return prev
      })
    })
    return () => supabase.removeChannel(ch)
  }, [userId])

  // ── Re-fetch when submission status changes (admin approved top-up) ───────
  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel(`submission-status:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'payment_submissions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // When a submission moves to 'approved', re-load wallet data
          if (payload.new?.status === 'approved') {
            loadData(userId)
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId, loadData])

  // ── Handle proof file ─────────────────────────────────────────────────────
  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setTopupError('Only JPG, PNG, WEBP accepted'); return }
    if (file.size > 5 * 1024 * 1024) { setTopupError('Max file size is 5 MB'); return }
    setTopupError(null)
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

  // ── Submit top-up ─────────────────────────────────────────────────────────
  const handleTopupSubmit = async () => {
    if (!selectedMethod || !userId) return
    const amountErr = validateTopUpAmount(topupAmount)
    if (amountErr) { setTopupError(amountErr); return }
    if (!proofFile) { setTopupError('Please upload your payment screenshot'); return }

    setTopupError(null)
    setTopupSubmitting(true)
    try {
      await submitWalletTopUp({
        userId,
        amountEtb:        parseFloat(topupAmount),
        paymentMethodId:  selectedMethod.id,
        paymentDate,
        proofFile,
        note:             topupNote,
      })
      setTopupSuccess(true)
      setTopupStage('done')
      await loadData(userId)
      toast.success('Top-up submitted! Awaiting admin verification.')
    } catch (e) {
      // Only show the error message if it's a user-friendly one (from our own validation).
      // Raw DB / network errors are replaced with a generic message.
      const msg = e?.message ?? ''
      const isUserFriendly = msg.startsWith('Minimum') ||
                             msg.startsWith('Maximum') ||
                             msg.startsWith('Please') ||
                             msg.startsWith('Screenshot upload') ||
                             msg.startsWith('Submission failed')  // already friendly from lib
      setTopupError(isUserFriendly ? msg : 'Something went wrong. Please try again later.')
    } finally {
      setTopupSubmitting(false)
    }
  }

  // ── Reset top-up form ─────────────────────────────────────────────────────
  const resetTopup = () => {
    setTopupAmount('')
    setTopupAmountError(null)
    setSelectedMethod(null)
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setTopupNote('')
    setProofFile(null)
    setProofPreview(null)
    setTopupError(null)
    setTopupSuccess(false)
    setTopupStage('amount')
  }

  // ── Auto-renew toggle ─────────────────────────────────────────────────────
  const handleAutoRenewToggle = async () => {
    if (!userId || !renewal) return
    const newVal = !renewal.auto_renew
    setAutoRenewToggling(true)
    try {
      await setAutoRenew(userId, newVal)
      setRenewal(r => r ? { ...r, auto_renew: newVal } : r)
      toast.success(newVal ? 'Auto-renew enabled' : 'Auto-renew disabled')
    } catch {
      toast.error('Could not update auto-renew. Please try again.')
    } finally {
      setAutoRenewToggling(false)
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
        <p className="font-semibold">Sign in required</p>
        <button onClick={() => navigate('/login')}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Sign In
        </button>
      </div>
    )
  }

  const balance = wallet?.balance ?? 0
  const currency = wallet?.currency ?? 'ETB'
  const renewalDays = remainingDays(renewal?.next_renewal_date)
  const lowBalance = renewal?.auto_renew && renewal?.balance_sufficient === false

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background pb-24">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border h-14 flex items-center gap-3 px-4">
        <button onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold flex-1">My Wallet</h1>
        <button onClick={() => loadData(userId)} disabled={dataLoading}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${dataLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Balance hero card ─────────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-card border border-primary/30 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Wallet Balance</p>
            {dataLoading ? (
              <div className="h-8 w-32 bg-muted/40 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-black tabular-nums text-foreground">
                {formatEtb(balance)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{currency} · FitTrack Pro Wallet</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
        </div>
      </div>

      {/* ── Tab navigation ───────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          {[
            { id: 'overview',   label: 'Overview' },
            { id: 'top-up',     label: 'Add Money' },
            { id: 'history',    label: 'History' },
            { id: 'auto-renew', label: 'Auto-Renew' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">

        {/* ══════════════════════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            {/* Low balance warning */}
            {lowBalance && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-sm font-semibold text-amber-400">Low Wallet Balance</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your wallet balance may not be enough for your next auto-renewal.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="bg-background/60 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">Balance</p>
                    <p className="font-bold">{formatEtb(renewal.wallet_balance)}</p>
                  </div>
                  <div className="bg-background/60 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">Renewal</p>
                    <p className="font-bold">{formatEtb(renewal.renewal_price_etb)}</p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-2 text-center border border-destructive/20">
                    <p className="text-muted-foreground">Shortfall</p>
                    <p className="font-bold text-destructive">{formatEtb(renewal.shortfall_etb)}</p>
                  </div>
                </div>
                <button onClick={() => setTab('top-up')}
                  className="w-full h-9 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-400 transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Money Now
                </button>
              </div>
            )}

            {/* Pending top-up */}
            {pendingTopUp && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-sm font-semibold">Top-Up Pending Verification</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Amount</p><p className="font-semibold">{formatEtb(pendingTopUp.topup_amount_etb)}</p></div>
                  <div><p className="text-muted-foreground">Method</p><p className="font-semibold">{pendingTopUp.method?.name ?? '—'}</p></div>
                  <div><p className="text-muted-foreground">Reference</p><p className="font-semibold font-mono">{pendingTopUp.transaction_ref}</p></div>
                  <div><p className="text-muted-foreground">Submitted</p><p className="font-semibold">{fmtDate(pendingTopUp.submitted_at)}</p></div>
                </div>
                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Awaiting admin review — your balance will update on approval
                </p>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { resetTopup(); setTab('top-up') }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors active:scale-95">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Add Money</span>
              </button>

              <button onClick={() => setTab('history')}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors active:scale-95">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <History className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-semibold">Wallet History</span>
              </button>
            </div>

            {/* Auto-renew teaser */}
            <button onClick={() => setTab('auto-renew')}
              className="w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Auto-Renew Settings</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {renewal?.auto_renew
                    ? `Enabled · Next: ${fmtDate(renewal?.next_renewal_date)}`
                    : 'Disabled · Turn on to renew automatically'}
                </p>
              </div>
              <div className="shrink-0">
                {renewal?.auto_renew
                  ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">ON</span>
                  : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">OFF</span>
                }
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-1 inline" />
              </div>
            </button>

            {/* Subscription shortcut */}
            <button onClick={() => navigate('/subscription')}
              className="w-full h-11 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-muted/30 transition-colors">
              Pay with Wallet for Subscription
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ADD MONEY TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'top-up' && (
          <>
            {/* Done screen */}
            {topupStage === 'done' && (
              <div className="flex flex-col items-center text-center gap-5 py-8">
                <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Submitted!</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                    Your top-up of <strong>{formatEtb(parseFloat(topupAmount))}</strong> is awaiting admin verification.
                    Your wallet balance will update once approved.
                  </p>
                </div>
                <div className="w-full rounded-2xl border border-border bg-card p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{formatEtb(parseFloat(topupAmount))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-semibold">{selectedMethod?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status="pending_verification" /></div>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setTab('overview')}
                    className="flex-1 h-11 rounded-2xl border border-border text-sm font-semibold hover:bg-muted/30 transition-colors">
                    Back to Wallet
                  </button>
                  <button onClick={() => { resetTopup(); setTab('top-up') }}
                    className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Add More
                  </button>
                </div>
              </div>
            )}

            {topupStage !== 'done' && (
              <>
                {/* Active pending top-up warning */}
                {pendingTopUp && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">
                      You already have a pending top-up of {formatEtb(pendingTopUp.topup_amount_etb)}. You can submit another one while this is being reviewed.
                    </p>
                  </div>
                )}

                {/* Step 1: Amount */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-semibold">1. Enter Amount</p>
                  <div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">ETB</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={MIN_TOPUP_AMOUNT}
                        step="1"
                        value={topupAmount}
                        onChange={e => {
                          setTopupAmount(e.target.value)
                          setTopupAmountError(validateTopUpAmount(e.target.value))
                        }}
                        placeholder="0.00"
                        className="flex h-14 w-full rounded-xl border border-input bg-background pl-14 pr-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    {topupAmountError && (
                      <p className="text-xs text-destructive mt-1">{topupAmountError}</p>
                    )}
                  </div>
                  {/* Quick amount buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {[100, 200, 500, 1000, 2000, 5000].map(a => (
                      <button key={a} onClick={() => { setTopupAmount(String(a)); setTopupAmountError(null) }}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted hover:border-primary/40 transition-colors">
                        +{a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Payment method */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-semibold">2. Choose Payment Method</p>
                  <div className="space-y-2">
                    {dataLoading ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                        ))}
                      </div>
                    ) : methods.length > 0 ? (
                      methods.map(m => (
                        <button key={m.id} onClick={() => setSelectedMethod(m)}
                          className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                            selectedMethod?.id === m.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-background hover:border-primary/40'
                          }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{m.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                              {m.type === 'bank' ? 'Bank' : 'Mobile'}
                            </span>
                          </div>

                          {selectedMethod?.id === m.id && (
                            <div className="mt-3 pt-3 border-t border-border/40 space-y-2.5">
                              {m.account_name && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Account Name</p>
                                  <p className="text-sm font-semibold">{m.account_name}</p>
                                </div>
                              )}
                              {m.account_number && (
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Account Number</p>
                                    <p className="text-base font-bold font-mono tracking-wider">{m.account_number}</p>
                                  </div>
                                  <CopyBtn text={m.account_number} />
                                </div>
                              )}
                              {m.phone_number && (
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Phone Number</p>
                                    <p className="text-base font-bold font-mono">{m.phone_number}</p>
                                  </div>
                                  <CopyBtn text={m.phone_number} />
                                </div>
                              )}
                              {m.instructions && (
                                <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground leading-relaxed">
                                  {m.instructions}
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 space-y-2">
                        <p className="text-sm text-muted-foreground">No payment methods available yet.</p>
                        <button onClick={() => loadData(userId)}
                          className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
                          <RefreshCw className="h-3 w-3" /> Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Proof & details */}
                {selectedMethod && !topupAmountError && parseFloat(topupAmount) > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                    <p className="text-sm font-semibold">3. Submit Payment Proof</p>

                    {/* Screenshot upload */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Screenshot *</label>
                      <div
                        onClick={() => fileRef.current?.click()}
                        className={`rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors ${
                          proofPreview ? 'border-primary/50 p-2' : 'border-border hover:border-primary/40 p-8'
                        }`}
                        style={{ minHeight: proofPreview ? 'auto' : 200 }}>
                        {proofPreview ? (
                          <img src={proofPreview} alt="proof" className="w-full max-h-64 object-contain rounded-lg" />
                        ) : (
                          <>
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <Camera className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-sm font-medium">Tap to upload screenshot</p>
                            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · Max 5 MB</p>
                          </>
                        )}
                      </div>
                      {proofPreview && (
                        <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                          className="mt-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                          Remove photo
                        </button>
                      )}
                      <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden" onChange={handleFile} />
                    </div>

                    {/* Payment date */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Date *</label>
                      <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Note (optional)</label>
                      <textarea rows={2} value={topupNote} onChange={e => setTopupNote(e.target.value)}
                        placeholder="Any additional info…"
                        className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl bg-muted/30 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Top-up amount</span><span className="font-bold text-primary">{formatEtb(parseFloat(topupAmount))}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-semibold">{selectedMethod.name}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">After approval, new balance</span><span className="font-semibold">{formatEtb(balance + parseFloat(topupAmount))}</span></div>
                    </div>

                    {topupError && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{topupError}</p>
                      </div>
                    )}

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                      <Shield className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Your wallet balance will <strong>not</strong> change until an admin verifies your payment.
                      </p>
                    </div>

                    <button
                      disabled={topupSubmitting || !proofFile}
                      onClick={handleTopupSubmit}
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all">
                      {topupSubmitting
                        ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting…</>
                        : 'Submit Top-Up Request'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            HISTORY TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'history' && (
          <>
            {ledgerLoading && ledger.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : ledger.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <History className="h-10 w-10 text-muted-foreground opacity-40" />
                </div>
                <div>
                  <p className="font-semibold">No transactions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Top up your wallet to get started.</p>
                </div>
                <button onClick={() => setTab('top-up')}
                  className="h-11 px-6 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold">
                  Add Money
                </button>
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Credit (+)</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Debit (−)</span>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  {ledger.map(tx => <TxRow key={tx.id} tx={tx} />)}
                </div>

                {/* Load more */}
                {ledger.length < ledgerTotal && (
                  <button
                    disabled={ledgerLoading}
                    onClick={() => {
                      const next = ledgerOffset + LEDGER_PAGE
                      setLedgerOffset(next)
                      loadLedger(userId, next)
                    }}
                    className="w-full h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
                    {ledgerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Load more ({ledgerTotal - ledger.length} remaining)
                  </button>
                )}

                <p className="text-xs text-center text-muted-foreground pb-2">
                  Showing {ledger.length} of {ledgerTotal} transactions
                </p>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            AUTO-RENEW TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'auto-renew' && (
          <>
            {!renewal ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <RefreshCw className="h-10 w-10 text-muted-foreground opacity-40" />
                <div>
                  <p className="font-semibold">No active subscription</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Subscribe to a plan to use auto-renewal.
                  </p>
                </div>
                <button onClick={() => navigate('/subscription')}
                  className="h-11 px-6 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold">
                  Subscribe Now
                </button>
              </div>
            ) : (
              <>
                {/* Toggle card */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Auto-renew from wallet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {renewal.auto_renew ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <button
                      disabled={autoRenewToggling}
                      onClick={handleAutoRenewToggle}
                      className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-50">
                      {autoRenewToggling
                        ? <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        : renewal.auto_renew
                          ? <ToggleRight className="h-8 w-8 text-primary" />
                          : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                      }
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed rounded-xl bg-muted/30 p-3">
                    When enabled, your subscription will automatically renew using your available wallet balance when it is due. If the balance is insufficient, the subscription will <strong>not</strong> be renewed and you will be notified.
                  </p>

                  {/* Renewal details grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-semibold mt-0.5">{renewal.plan_name}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-semibold mt-0.5">
                        {renewal.renewal_duration_months ?? renewal.duration_months ?? 1} month(s)
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Next Renewal Date</p>
                      <p className={`font-semibold mt-0.5 ${renewalDays !== null && renewalDays <= 7 ? 'text-amber-400' : ''}`}>
                        {fmtDate(renewal.next_renewal_date)}
                        {renewalDays !== null && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({renewalDays === 0 ? 'today' : `${renewalDays}d`})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Renewal Amount</p>
                      <p className="font-semibold mt-0.5 text-primary">
                        {renewal.renewal_price_etb ? formatEtb(renewal.renewal_price_etb) : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Balance status card */}
                <div className={`rounded-2xl border p-4 space-y-3 ${
                  renewal.balance_sufficient === false
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-emerald-500/30 bg-emerald-500/5'
                }`}>
                  <div className="flex items-center gap-2">
                    {renewal.balance_sufficient === false
                      ? <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    }
                    <p className="text-sm font-semibold">
                      {renewal.balance_sufficient === false ? 'Insufficient Balance' : 'Balance Ready'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Wallet Balance</p>
                      <p className="font-bold tabular-nums">{formatEtb(renewal.wallet_balance ?? balance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Renewal Amount</p>
                      <p className="font-bold tabular-nums text-primary">{formatEtb(renewal.renewal_price_etb)}</p>
                    </div>
                    {renewal.balance_sufficient === false && renewal.shortfall_etb > 0 && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Shortfall</p>
                        <p className="font-bold tabular-nums text-destructive">{formatEtb(renewal.shortfall_etb)}</p>
                      </div>
                    )}
                  </div>

                  {renewal.balance_sufficient === false && (
                    <button onClick={() => setTab('top-up')}
                      className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" /> Add Money
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
