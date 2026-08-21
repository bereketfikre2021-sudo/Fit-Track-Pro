/**
 * PaymentHistoryPage.jsx
 * User's own payment submission history.
 * RLS enforced server-side — users can only see their own records.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchPaymentHistory, getProofSignedUrl, formatEtb } from '../lib/subscription'
import {
  ChevronLeft, Clock, CheckCircle2, XCircle, Ban,
  ChevronDown, ChevronUp, ExternalLink, Loader2, AlertCircle,
  CreditCard,
} from 'lucide-react'

const STATUS_CFG = {
  pending_verification: { label: 'Pending',  icon: Clock,         cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  approved:             { label: 'Approved', icon: CheckCircle2,  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  rejected:             { label: 'Rejected', icon: XCircle,       cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  cancelled:            { label: 'Cancelled',icon: Ban,           cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  expired:              { label: 'Expired',  icon: Clock,         cls: 'bg-muted text-muted-foreground border-border' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-muted text-muted-foreground border-border' }
  const Icon = cfg.icon ?? Clock
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function SubmissionCard({ sub }) {
  const [expanded, setExpanded] = useState(false)
  const [proofUrl, setProofUrl] = useState(null)
  const [loadingProof, setLoadingProof] = useState(false)

  const loadProof = async () => {
    if (!sub.proof_path || proofUrl) return
    setLoadingProof(true)
    const url = await getProofSignedUrl(sub.proof_path)
    setProofUrl(url)
    setLoadingProof(false)
  }

  const toggle = () => {
    if (!expanded) loadProof()
    setExpanded(v => !v)
  }

  const cfg = STATUS_CFG[sub.status] ?? STATUS_CFG.cancelled

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 flex items-center justify-center rounded-full ${cfg.cls.split(' ').filter(c => c.startsWith('bg-')).join(' ')}`}>
            <cfg.icon className={`h-5 w-5 ${cfg.cls.split(' ').filter(c => c.startsWith('text-')).join(' ')}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{sub.plan_name}</p>
            <p className="text-xs text-muted-foreground">{sub.method_name} · {formatDate(sub.submitted_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground tabular-nums">{formatEtb(sub.amount_etb)}</p>
            <StatusBadge status={sub.status} />
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-4 space-y-4 bg-muted/10">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Plan</p><p className="font-semibold capitalize">{sub.plan_name}</p></div>
            <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold">{formatEtb(sub.amount_etb)}</p></div>
            <div><p className="text-xs text-muted-foreground">Currency</p><p className="font-semibold">{sub.currency ?? 'ETB'}</p></div>
            <div><p className="text-xs text-muted-foreground">Method</p><p className="font-semibold">{sub.method_name}</p></div>
            <div><p className="text-xs text-muted-foreground">Reference #</p><p className="font-semibold font-mono text-xs">{sub.transaction_ref}</p></div>
            <div><p className="text-xs text-muted-foreground">Payment Date</p><p className="font-semibold">{formatDate(sub.payment_date)}</p></div>
            <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-semibold">{formatDate(sub.submitted_at)}</p></div>
            {sub.verified_at && <div><p className="text-xs text-muted-foreground">Verified</p><p className="font-semibold">{formatDate(sub.verified_at)}</p></div>}
          </div>

          {sub.status === 'rejected' && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 space-y-1">
              <p className="text-xs font-semibold text-red-400">Rejection Reason</p>
              <p className="text-xs text-muted-foreground">{sub.rejection_reason ?? 'No reason provided'}</p>
              {sub.rejection_reason_custom && <p className="text-xs text-muted-foreground italic">{sub.rejection_reason_custom}</p>}
            </div>
          )}

          {sub.proof_path && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Payment Screenshot</p>
              {loadingProof ? (
                <div className="h-24 flex items-center justify-center rounded-xl border border-border">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : proofUrl ? (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={proofUrl} alt="Payment proof" className="w-full max-h-56 object-contain" />
                  <a href={proofUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 justify-center py-2 text-xs text-primary hover:underline border-t border-border/50">
                    <ExternalLink className="h-3.5 w-3.5" /> Open full size
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Could not load screenshot.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PaymentHistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const data = await fetchPaymentHistory(user.id)
      setHistory(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate('/profile')}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Payment History</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-3">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading payment history…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={load} className="text-sm text-primary hover:underline">Try again</button>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <CreditCard className="h-10 w-10 text-muted-foreground opacity-40" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">No payment history</p>
              <p className="text-sm text-muted-foreground mt-1">Your payment submissions will appear here.</p>
            </div>
            <button onClick={() => navigate('/subscription')}
              className="h-11 px-6 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Subscribe Now
            </button>
          </div>
        ) : (
          history.map(sub => <SubmissionCard key={sub.id} sub={sub} />)
        )}
      </div>
    </div>
  )
}
