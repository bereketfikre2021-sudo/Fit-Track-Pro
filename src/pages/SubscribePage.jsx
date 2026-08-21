/**
 * SubscribePage.jsx
 * User subscription purchase flow:
 * Step 1 → Select plan
 * Step 2 → Select payment method + see account info
 * Step 3 → Submit payment proof
 * Step 4 → Confirmation (pending verification)
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAppState } from '../lib/appState'
import {
  fetchActivePaymentMethods,
  fetchSubscriptionPlans,
  submitPaymentProof,
} from '../lib/paymentSubmission'
import { compressImageFile } from '../lib/imageUtils'
import {
  CheckCircle2, CreditCard, Upload, ArrowLeft, ArrowRight,
  Clock, AlertCircle, Camera, Loader2, ChevronRight,
} from 'lucide-react'

const STEPS = ['Select Plan', 'Payment Method', 'Submit Proof', 'Confirmation']

const STATUS_COLORS = {
  pending_verification: 'text-amber-500',
  approved: 'text-emerald-500',
  rejected: 'text-red-500',
  cancelled: 'text-muted-foreground',
}

export default function SubscribePage({ onClose }) {
  const { t } = useTranslation()
  const { state } = useAppState()
  const userId = state?.profile?.id ?? supabase.auth.getUser()?.data?.user?.id

  const [step, setStep] = useState(0)
  const [plans, setPlans] = useState([])
  const [methods, setMethods] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [form, setForm] = useState({ transactionRef: '', paymentDate: new Date().toISOString().slice(0, 10), note: '' })
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    fetchSubscriptionPlans().then(setPlans).catch(console.error)
    fetchActivePaymentMethods().then(setMethods).catch(console.error)
  }, [])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setError('Only JPG, PNG, WEBP accepted'); return }
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB'); return }
    setError(null)
    setProofFile(file)
    try {
      const url = await compressImageFile(file, { maxWidth: 800, maxHeight: 1200, quality: 0.85 })
      setProofPreview(url)
    } catch { setProofPreview(URL.createObjectURL(file)) }
  }

  const handleSubmit = async () => {
    if (!proofFile) { setError('Please upload a payment screenshot'); return }
    if (!form.transactionRef.trim()) { setError('Transaction reference is required'); return }
    setError(null)
    setSubmitting(true)
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not signed in')
      const id = await submitPaymentProof({
        userId: user.id,
        planId: selectedPlan.id,
        paymentMethodId: selectedMethod.id,
        amountEtb: selectedPlan.price_monthly_usd, // price stored; ETB conversion shown in UI
        transactionRef: form.transactionRef,
        paymentDate: form.paymentDate,
        proofFile,
        note: form.note,
      })
      setSubmittedId(id)
      setStep(3)
    } catch (e) { setError(e.message) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <button onClick={step > 0 && step < 3 ? () => setStep(s => s - 1) : onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {step === 0 || step === 3 ? 'Back' : 'Previous'}
        </button>
        <h1 className="text-base font-semibold">Subscribe to FitTrack Pro</h1>
        <div className="w-16 text-right text-xs text-muted-foreground">{step + 1} / {STEPS.length}</div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-card border-b border-border">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
              i < step ? 'bg-primary text-primary-foreground' :
              i === step ? 'bg-primary/20 text-primary border border-primary' :
              'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full space-y-4">

        {/* STEP 0: Select Plan */}
        {step === 0 && (
          <>
            <h2 className="text-lg font-semibold">Choose a Plan</h2>
            <div className="space-y-3">
              {plans.filter(p => p.tier !== 'free').map(plan => (
                <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    selectedPlan?.id === plan.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{plan.name}</div>
                      <div className="text-sm text-muted-foreground capitalize">{plan.tier}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        ETB {(plan.price_monthly_usd * 55).toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">/ month</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{plan.max_ai_calls_day} AI calls/day</span>
                    <span>·</span>
                    <span>{plan.max_devices} device{plan.max_devices > 1 ? 's' : ''}</span>
                    {plan.features?.ads === false && <><span>·</span><span>No ads</span></>}
                  </div>
                  {selectedPlan?.id === plan.id && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button disabled={!selectedPlan} onClick={() => setStep(1)}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors hover:bg-primary/90">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* STEP 1: Select payment method */}
        {step === 1 && selectedPlan && (
          <>
            <h2 className="text-lg font-semibold">Select Payment Method</h2>
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-primary">ETB {(selectedPlan.price_monthly_usd * 55).toFixed(0)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {methods.map(m => (
                <button key={m.id} onClick={() => setSelectedMethod(m)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    selectedMethod?.id === m.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{m.name}</div>
                    <div className={`text-xs px-2 py-0.5 rounded-full border ${
                      m.type === 'bank' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                    }`}>{m.type === 'bank' ? 'Bank' : 'Mobile'}</div>
                  </div>
                  {selectedMethod?.id === m.id && (
                    <div className="mt-3 space-y-1.5 text-sm border-t border-border pt-3">
                      {m.account_name && <div className="flex justify-between"><span className="text-muted-foreground">Account Name</span><span className="font-medium">{m.account_name}</span></div>}
                      {m.account_number && <div className="flex justify-between"><span className="text-muted-foreground">Account Number</span><span className="font-medium font-mono">{m.account_number}</span></div>}
                      {m.phone_number && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{m.phone_number}</span></div>}
                      {m.instructions && <div className="mt-2 text-xs text-muted-foreground rounded-lg bg-muted/30 p-2">{m.instructions}</div>}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {selectedMethod && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                <p className="font-medium text-amber-400 mb-1">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                  <li>Make the payment using the account details above</li>
                  <li>Take a screenshot of your payment confirmation</li>
                  <li>Come back and submit the screenshot as proof</li>
                </ol>
              </div>
            )}

            <button disabled={!selectedMethod} onClick={() => setStep(2)}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors">
              I've Made the Payment <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* STEP 2: Submit proof */}
        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold">Submit Payment Proof</h2>
            <p className="text-sm text-muted-foreground">
              Upload a screenshot of your payment confirmation. Your subscription will be activated after manual review (usually within a few hours).
            </p>

            {/* Proof upload */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Payment Screenshot *</label>
              <div onClick={() => fileRef.current?.click()}
                className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center p-6 gap-3 ${
                  proofPreview ? 'border-primary/50' : 'border-border hover:border-primary/50'
                }`}>
                {proofPreview ? (
                  <img src={proofPreview} alt="Proof" className="max-h-48 object-contain rounded-lg" />
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm text-center">
                      <p className="font-medium">Tap to upload screenshot</p>
                      <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP · Max 5 MB</p>
                    </div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
              {proofPreview && (
                <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                  className="mt-2 text-xs text-muted-foreground hover:text-destructive transition-colors">
                  Remove photo
                </button>
              )}
            </div>

            {/* Transaction ref */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Transaction / Reference Number *</label>
              <input type="text" value={form.transactionRef}
                onChange={e => setForm(f => ({ ...f, transactionRef: e.target.value }))}
                placeholder="e.g. FT2024-123456"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            {/* Payment date */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Payment Date *</label>
              <input type="date" value={form.paymentDate}
                onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                max={new Date().toISOString().slice(0, 10)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            {/* Note */}
            <div>
              <label className="text-sm font-medium block mb-1.5">Note (optional)</label>
              <textarea rows={2} value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Any additional information…"
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <button disabled={submitting || !proofFile || !form.transactionRef} onClick={handleSubmit}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <><Upload className="h-4 w-4" /> Submit Payment Proof</>}
            </button>
          </>
        )}

        {/* STEP 3: Confirmation */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20">
              <Clock className="h-10 w-10 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Proof Submitted!</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                Your payment is under review. We'll activate your subscription within a few hours after verifying your payment.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 w-full text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submission ID</span>
                <span className="font-mono text-xs">{submittedId?.slice(0, 12)}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{selectedPlan?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-amber-400 font-medium">Pending Verification</span>
              </div>
            </div>
            <button onClick={onClose}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
