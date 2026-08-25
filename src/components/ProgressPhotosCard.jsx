/**
 * ProgressPhotosCard.jsx
 * Progress photo timeline with before/after comparison mode.
 * - Photos sorted oldest → newest so the grid reads as a timeline
 * - Each card shows the date taken below the image
 * - Tap/click any photo to open the lightbox
 * - "Compare" mode: select 2 photos to view a side-by-side before/after panel
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { compressImageFile } from '../lib/imageUtils'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  Trash2,
  Loader2,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  SplitSquareHorizontal,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const BUCKET = 'progress_photos'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtDateShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
}

/** Human-readable difference between two ISO date strings, e.g. "3 months later" */
function dateDiff(fromIso, toIso) {
  const a = new Date(fromIso)
  const b = new Date(toIso)
  const days = Math.round((b - a) / 86_400_000)
  if (days === 0) return 'same day'
  const abs = Math.abs(days)
  if (abs < 7)   return `${abs} day${abs > 1 ? 's' : ''} later`
  if (abs < 30)  return `${Math.round(abs / 7)} week${Math.round(abs / 7) > 1 ? 's' : ''} later`
  if (abs < 365) return `${Math.round(abs / 30)} month${Math.round(abs / 30) > 1 ? 's' : ''} later`
  const yrs = (abs / 365).toFixed(1)
  return `${yrs} year${yrs !== '1.0' ? 's' : ''} later`
}

function isBucketNotFound(err) {
  if (!err) return false
  const msg     = (err.message ?? '').toLowerCase()
  const errCode = (err.error   ?? '').toLowerCase()
  return (
    msg.includes('bucket not found') ||
    msg.includes('no such bucket')   ||
    errCode.includes('bucket_not_found') ||
    err.statusCode === '404' ||
    err.statusCode === 404
  )
}

// ── Lightbox (single photo) ───────────────────────────────────────────────────
function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index)
  const total = photos.length

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowRight') setCur(i => (i + 1) % total)
      if (e.key === 'ArrowLeft')  setCur(i => (i - 1 + total) % total)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, total])

  return (
    <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close">
        <X className="h-5 w-5" />
      </button>

      {total > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setCur(i => (i - 1 + total) % total) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setCur(i => (i + 1) % total) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm mx-4 sm:mx-14 flex flex-col items-center gap-3">
        <img src={photos[cur].url} alt="Progress"
          className="w-full max-h-[74vh] object-contain rounded-2xl shadow-2xl" />
        <div className="text-center space-y-0.5">
          <p className="text-sm font-semibold text-white">{fmtDate(photos[cur].taken_at)}</p>
          {photos[cur].weight_kg && (
            <p className="text-xs text-white/60">{photos[cur].weight_kg} kg</p>
          )}
          <p className="text-xs text-white/40">{cur + 1} / {total}</p>
        </div>
      </div>
    </div>
  )
}

// ── Before / After comparison panel ──────────────────────────────────────────
function ComparePanel({ before, after, onClose }) {
  const diff = dateDiff(before.taken_at, after.taken_at)
  const weightDelta = before.weight_kg && after.weight_kg
    ? (after.weight_kg - before.weight_kg).toFixed(1)
    : null
  const deltaSign = weightDelta > 0 ? '+' : ''

  return (
    <div className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center p-3 gap-4" onClick={onClose}>
      {/* Close */}
      <button onClick={onClose}
        className="absolute top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close">
        <X className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="text-center space-y-0.5 pt-8 sm:pt-0" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Before &amp; After</p>
        <p className="text-sm text-white/60">{diff}</p>
      </div>

      {/* Side-by-side images */}
      <div
        className="w-full max-w-xl flex gap-2 sm:gap-3"
        onClick={e => e.stopPropagation()}
      >
        {/* Before */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="rounded-2xl overflow-hidden bg-black/40 shadow-xl">
            <img src={before.url} alt="Before"
              className="w-full max-h-[52vh] object-cover" />
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Before</span>
            <p className="text-xs font-semibold text-white leading-tight">{fmtDateShort(before.taken_at)}</p>
            {before.weight_kg && <p className="text-[11px] text-white/50">{before.weight_kg} kg</p>}
          </div>
        </div>

        {/* Divider + delta */}
        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
          <div className="w-px flex-1 bg-white/10" />
          {weightDelta !== null && (
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              Number(weightDelta) < 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : Number(weightDelta) > 0
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-white/10 text-white/60'
            )}>
              {deltaSign}{weightDelta} kg
            </span>
          )}
          <div className="w-px flex-1 bg-white/10" />
        </div>

        {/* After */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="rounded-2xl overflow-hidden bg-black/40 shadow-xl">
            <img src={after.url} alt="After"
              className="w-full max-h-[52vh] object-cover" />
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">After</span>
            <p className="text-xs font-semibold text-white leading-tight">{fmtDateShort(after.taken_at)}</p>
            {after.weight_kg && <p className="text-[11px] text-white/50">{after.weight_kg} kg</p>}
          </div>
        </div>
      </div>

      <p className="text-xs text-white/30 pb-2" onClick={e => e.stopPropagation()}>
        Tap anywhere outside to close
      </p>
    </div>
  )
}

// ── Bucket setup banner ───────────────────────────────────────────────────────
function BucketMissingBanner() {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-400">Storage bucket not set up</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The <code className="bg-muted px-1 rounded text-xs">progress_photos</code> bucket
            doesn't exist in your Supabase project. Run the migration SQL in your Supabase
            dashboard → SQL Editor.
          </p>
          <button
            className="text-xs text-primary hover:underline mt-1"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? 'Hide SQL ▲' : 'Show SQL ▼'}
          </button>
          {expanded && (
            <pre className="mt-2 text-[11px] bg-muted rounded-lg p-2.5 overflow-x-auto whitespace-pre text-foreground/80 leading-relaxed">
{`insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress_photos', 'progress_photos', false, 10485760,
  array['image/jpeg','image/jpg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

drop policy if exists "Users upload own progress photos" on storage.objects;
drop policy if exists "Users read own progress photos"   on storage.objects;
drop policy if exists "Users delete own progress photos" on storage.objects;

create policy "Users upload own progress photos" on storage.objects for insert
  with check (bucket_id='progress_photos' and auth.uid() is not null
    and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users read own progress photos" on storage.objects for select
  using (bucket_id='progress_photos' and auth.uid() is not null
    and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users delete own progress photos" on storage.objects for delete
  using (bucket_id='progress_photos' and auth.uid() is not null
    and (storage.foldername(name))[1]=auth.uid()::text);`}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProgressPhotosCard() {
  const { t } = useTranslation()

  const [photos, setPhotos]               = useState([])   // sorted oldest → newest
  const [loading, setLoading]             = useState(true)
  const [uploading, setUploading]         = useState(false)
  const [userId, setUserId]               = useState(null)
  const [lightbox, setLightbox]           = useState(null) // photo index for single view
  const [deleting, setDeleting]           = useState(null) // photo id being deleted
  const [bucketMissing, setBucketMissing] = useState(false)

  // Compare mode
  const [compareMode, setCompareMode]     = useState(false)
  const [selected, setSelected]           = useState([])   // up to 2 photo ids
  const [comparePanel, setComparePanel]   = useState(false)

  const fileRef = useRef(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (uid) => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('id, storage_path, taken_at, note, weight_kg')
        .eq('user_id', uid)
        .order('taken_at', { ascending: true })  // oldest first = timeline order
        .limit(100)
      if (error) throw error

      const withUrls = await Promise.all((data ?? []).map(async (p) => {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(p.storage_path, 60 * 60)
        return { ...p, url: signed?.signedUrl ?? null }
      }))
      setPhotos(withUrls.filter(p => p.url))
    } catch (e) {
      console.error('[ProgressPhotos] load error:', e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      load(uid)
    })
  }, [load])

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return

    setBucketMissing(false)
    setUploading(true)
    try {
      const dataUrl = await compressImageFile(file, { maxWidth: 1080, maxHeight: 1920, quality: 0.85 })
      const res     = await fetch(dataUrl)
      const blob    = await res.blob()
      const ext     = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path    = `${userId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type || `image/${ext}`, upsert: false })

      if (upErr) {
        if (isBucketNotFound(upErr)) {
          setBucketMissing(true)
          throw new Error('Storage bucket not found — see setup instructions below.')
        }
        throw new Error(`Upload failed: ${upErr.message}`)
      }

      const { error: insErr } = await supabase.from('progress_photos').insert({
        user_id:      userId,
        storage_path: path,
        taken_at:     new Date().toISOString().slice(0, 10),
      })
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
        throw new Error(`Save failed: ${insErr.message}`)
      }

      toast.success('Progress photo saved!')
      load(userId)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setUploading(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (photo) => {
    if (!confirm(`Delete photo from ${fmtDate(photo.taken_at)}?`)) return
    setDeleting(photo.id)
    try {
      await supabase.storage.from(BUCKET).remove([photo.storage_path])
      await supabase.from('progress_photos').delete().eq('id', photo.id)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      setSelected(prev => prev.filter(id => id !== photo.id))
      toast.success('Photo deleted')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeleting(null)
    }
  }

  // ── Compare selection ────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id] // slide window: drop oldest selection
      return [...prev, id]
    })
  }

  const startCompare = () => {
    if (selected.length === 2) setComparePanel(true)
  }

  const exitCompare = () => {
    setCompareMode(false)
    setSelected([])
    setComparePanel(false)
  }

  // Derive the two photos for comparison (in chronological order)
  const comparePair = selected.length === 2
    ? [
        photos.find(p => p.id === selected[0]),
        photos.find(p => p.id === selected[1]),
      ].filter(Boolean).sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at))
    : []

  const canCompare = photos.length >= 2

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold">
            {t('profile.progressPhotos', { defaultValue: 'Progress Photos' })}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('profile.progressPhotosDesc', {
              defaultValue: 'Tap a photo to view · Compare two photos side by side',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Compare toggle */}
          {canCompare && !compareMode && (
            <button
              onClick={() => setCompareMode(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <SplitSquareHorizontal className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Compare</span>
            </button>
          )}
          {compareMode && (
            <button
              onClick={exitCompare}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          )}

          {/* Add photo */}
          {!compareMode && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !userId}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {uploading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Camera className="h-4 w-4" />}
              <span>{uploading ? 'Uploading…' : 'Add Photo'}</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Compare mode hint */}
      {compareMode && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
          <p className="text-xs text-primary font-medium">
            {selected.length === 0 && 'Select the "Before" photo'}
            {selected.length === 1 && 'Now select the "After" photo'}
            {selected.length === 2 && '2 photos selected — ready to compare'}
          </p>
          {selected.length === 2 && (
            <button
              onClick={startCompare}
              className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
              View
            </button>
          )}
        </div>
      )}

      {/* Bucket missing */}
      {bucketMissing && <BucketMissingBanner />}

      {/* ── Photo grid / empty state / loader ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 rounded-xl border border-dashed border-border">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <ImageIcon className="h-7 w-7 text-muted-foreground opacity-40" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-[200px]">
            No progress photos yet. Add your first to start tracking.
          </p>
          {userId && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Camera className="h-4 w-4" />
              Add your first photo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((p, i) => {
            const isSelected = selected.includes(p.id)
            const selIdx     = selected.indexOf(p.id) // 0 = before, 1 = after

            return (
              <div
                key={p.id}
                className={cn(
                  'relative flex flex-col rounded-xl overflow-hidden bg-muted cursor-pointer',
                  'ring-2 transition-all duration-150',
                  compareMode && isSelected && selIdx === 0 && 'ring-blue-500 shadow-lg shadow-blue-500/20',
                  compareMode && isSelected && selIdx === 1 && 'ring-emerald-500 shadow-lg shadow-emerald-500/20',
                  compareMode && !isSelected && 'ring-transparent opacity-70 hover:opacity-100',
                  !compareMode && 'ring-transparent hover:ring-primary/40'
                )}
                onClick={() => {
                  if (compareMode) {
                    toggleSelect(p.id)
                  } else {
                    setLightbox(i)
                  }
                }}
              >
                {/* Photo */}
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={p.url}
                    alt={`Progress ${fmtDate(p.taken_at)}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Date label — always visible below image */}
                <div className="px-2 py-1.5 bg-background/90 backdrop-blur-sm flex items-center justify-between gap-1 min-h-[2rem]">
                  <p className="text-[11px] font-medium text-foreground truncate leading-tight">
                    {fmtDateShort(p.taken_at)}
                  </p>
                  {p.weight_kg && (
                    <p className="text-[10px] text-muted-foreground shrink-0">{p.weight_kg} kg</p>
                  )}
                </div>

                {/* Compare selection indicator */}
                {compareMode && (
                  <div className="absolute top-1.5 left-1.5">
                    {isSelected ? (
                      <span className={cn(
                        'flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full',
                        selIdx === 0
                          ? 'bg-blue-500 text-white'
                          : 'bg-emerald-500 text-white'
                      )}>
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {selIdx === 0 ? 'Before' : 'After'}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-black/40 border border-white/30">
                        <Circle className="h-3 w-3 text-white/60" />
                      </span>
                    )}
                  </div>
                )}

                {/* Delete button — only in non-compare mode, visible on hover/focus */}
                {!compareMode && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(p) }}
                    disabled={deleting === p.id}
                    className="absolute top-1.5 right-1.5 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-destructive transition-all touch-manipulation"
                    aria-label="Delete photo"
                  >
                    {deleting === p.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                )}

                {/* First / Last badges for timeline context */}
                {!compareMode && (i === 0 || i === photos.length - 1) && (
                  <span className="absolute bottom-9 left-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/80 text-primary-foreground">
                    {i === 0 ? 'Start' : 'Latest'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Photo count + compare prompt */}
      {photos.length >= 2 && !compareMode && (
        <p className="text-xs text-muted-foreground text-center">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} ·{' '}
          <button onClick={() => setCompareMode(true)} className="text-primary hover:underline">
            Compare before &amp; after
          </button>
        </p>
      )}

      {/* Single-photo lightbox */}
      {lightbox !== null && (
        <Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} />
      )}

      {/* Before / After comparison panel */}
      {comparePanel && comparePair.length === 2 && (
        <ComparePanel
          before={comparePair[0]}
          after={comparePair[1]}
          onClose={() => setComparePanel(false)}
        />
      )}
    </div>
  )
}
