/**
 * ProgressPhotosCard.jsx
 * Progress photo timeline.
 * - Upload multiple photos at once — each gets the current date as its tag automatically
 * - Photos appear immediately (optimistic local preview) while Supabase upload runs in background
 * - Sorted oldest → newest so the grid reads as a timeline
 * - Each card shows the upload/taken date below the image
 * - Tap any photo to open the full-screen lightbox
 * - Compare button lets you pick two photos for a side-by-side before/after view
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { compressImageFile } from '../lib/imageUtils'
import { useTranslation } from 'react-i18next'
import {
  ImagePlus,
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
  CalendarDays,
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
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: '2-digit',
  })
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function dateDiff(fromIso, toIso) {
  const a = new Date(fromIso)
  const b = new Date(toIso)
  const days = Math.round((b - a) / 86_400_000)
  if (days === 0) return 'same day'
  const abs = Math.abs(days)
  if (abs < 7)   return `${abs} day${abs > 1 ? 's' : ''} later`
  if (abs < 30)  return `${Math.round(abs / 7)} week${Math.round(abs / 7) > 1 ? 's' : ''} later`
  if (abs < 365) return `${Math.round(abs / 30)} month${Math.round(abs / 30) > 1 ? 's' : ''} later`
  return `${(abs / 365).toFixed(1)} years later`
}

function isBucketNotFound(err) {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  const code = (err.error ?? '').toLowerCase()
  return (
    msg.includes('bucket not found') ||
    msg.includes('no such bucket') ||
    code.includes('bucket_not_found') ||
    err.statusCode === '404' ||
    err.statusCode === 404
  )
}

/**
 * Reads EXIF DateTimeOriginal (tag 0x9003) from a JPEG/HEIC file without any
 * external library. Scans only the first 64 KB so it's fast even for large photos.
 *
 * Returns an ISO date string 'YYYY-MM-DD' when found, or null on failure.
 *
 * EXIF date format: "YYYY:MM:DD HH:MM:SS"
 */
async function readExifDate(file) {
  try {
    // Only attempt JPEG / HEIC — PNG and WebP don't embed EXIF this way
    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg'
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name)
    if (!isJpeg && !isHeic) return null

    const buf  = await file.slice(0, 65536).arrayBuffer()
    const view = new DataView(buf)
    const len  = view.byteLength

    // JPEG SOI marker must be 0xFFD8
    if (isJpeg && view.getUint16(0) !== 0xFFD8) return null

    // Walk through JPEG APP1 (0xFFE1) segments to find Exif IFD
    let offset = 2
    while (offset < len - 4) {
      const marker = view.getUint16(offset)
      const segLen = view.getUint16(offset + 2)

      if (marker === 0xFFE1) {
        // Check for "Exif\0\0" header at offset+4
        const exifHeader = String.fromCharCode(
          view.getUint8(offset + 4), view.getUint8(offset + 5),
          view.getUint8(offset + 6), view.getUint8(offset + 7)
        )
        if (exifHeader === 'Exif') {
          const tiffStart = offset + 10
          // Determine byte order
          const byteOrder = view.getUint16(tiffStart)
          const littleEndian = byteOrder === 0x4949

          const read16 = (o) => view.getUint16(tiffStart + o, littleEndian)
          const read32 = (o) => view.getUint32(tiffStart + o, littleEndian)

          // IFD0 offset
          const ifd0Offset = read32(4)
          const ifd0Count  = read16(ifd0Offset)

          // Walk IFD0 looking for ExifIFD pointer (tag 0x8769)
          let exifIfdOffset = null
          for (let i = 0; i < ifd0Count; i++) {
            const entryOffset = ifd0Offset + 2 + i * 12
            if (entryOffset + 12 > len - tiffStart) break
            const tag = read16(entryOffset)
            if (tag === 0x8769) {
              exifIfdOffset = read32(entryOffset + 8)
              break
            }
          }

          // Walk ExifIFD looking for DateTimeOriginal (0x9003)
          if (exifIfdOffset !== null) {
            const exifCount = read16(exifIfdOffset)
            for (let i = 0; i < exifCount; i++) {
              const entryOffset = exifIfdOffset + 2 + i * 12
              if (entryOffset + 12 > len - tiffStart) break
              const tag = read16(entryOffset)
              if (tag === 0x9003) {
                const valueOffset = read32(entryOffset + 8)
                // Read 20-char ASCII date string "YYYY:MM:DD HH:MM:SS\0"
                let dateStr = ''
                for (let c = 0; c < 19; c++) {
                  const charCode = view.getUint8(tiffStart + valueOffset + c)
                  if (charCode === 0) break
                  dateStr += String.fromCharCode(charCode)
                }
                // "YYYY:MM:DD HH:MM:SS" → "YYYY-MM-DD"
                const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})/)
                if (match) return `${match[1]}-${match[2]}-${match[3]}`
              }
            }
          }
        }
      }

      // Advance past this segment (segment length includes the 2-byte length field)
      if (segLen < 2) break
      offset += 2 + segLen
    }
  } catch {
    // Silent — fall back to today
  }
  return null
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
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

  const photo = photos[cur]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/93 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev / Next */}
      {total > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setCur(i => (i - 1 + total) % total) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setCur(i => (i + 1) % total) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm mx-4 sm:mx-14 flex flex-col items-center gap-3"
      >
        <img
          src={photo.url}
          alt="Progress"
          className="w-full max-h-[74vh] object-contain rounded-2xl shadow-2xl"
        />
        <div className="text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1.5 text-white/80">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <p className="text-sm font-semibold">{fmtDate(photo.taken_at)}</p>
          </div>
          {photo.weight_kg && (
            <p className="text-xs text-white/50">{photo.weight_kg} kg</p>
          )}
          {photo.notes && (
            <p className="text-xs text-white/60 italic max-w-[260px]">{photo.notes}</p>
          )}
          <p className="text-xs text-white/30">{cur + 1} / {total}</p>
        </div>
      </div>
    </div>
  )
}

// ── Before / After comparison panel ──────────────────────────────────────────
function ComparePanel({ before, after, onClose }) {
  const diff = dateDiff(before.taken_at, after.taken_at)
  const weightDelta =
    before.weight_kg && after.weight_kg
      ? (after.weight_kg - before.weight_kg).toFixed(1)
      : null
  const deltaSign = Number(weightDelta) > 0 ? '+' : ''

  return (
    <div
      className="fixed inset-0 z-50 bg-black/93 flex flex-col items-center justify-center p-3 gap-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="text-center space-y-0.5 pt-8 sm:pt-0" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Before &amp; After</p>
        <p className="text-sm text-white/60">{diff}</p>
      </div>

      <div className="w-full max-w-xl flex gap-2 sm:gap-3" onClick={e => e.stopPropagation()}>
        {/* Before */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="rounded-2xl overflow-hidden bg-black/40 shadow-xl">
            <img src={before.url} alt="Before" className="w-full max-h-[52vh] object-cover" />
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Before</span>
            <p className="text-xs font-semibold text-white leading-tight">{fmtDateShort(before.taken_at)}</p>
            {before.weight_kg && <p className="text-[11px] text-white/50">{before.weight_kg} kg</p>}
          </div>
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
          <div className="w-px flex-1 bg-white/10" />
          {weightDelta !== null && (
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              Number(weightDelta) < 0 ? 'bg-emerald-500/20 text-emerald-400'
                : Number(weightDelta) > 0 ? 'bg-amber-500/20 text-amber-400'
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
            <img src={after.url} alt="After" className="w-full max-h-[52vh] object-cover" />
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
            doesn't exist in your Supabase project. Run this SQL in your Supabase dashboard → SQL Editor.
          </p>
          <button className="text-xs text-primary hover:underline mt-1" onClick={() => setExpanded(v => !v)}>
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

  const [photos, setPhotos]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [uploadingIds, setUploadingIds]   = useState(new Set()) // per-photo pending set
  const [userId, setUserId]               = useState(null)
  const [lightbox, setLightbox]           = useState(null)
  const [deleting, setDeleting]           = useState(null)
  const [bucketMissing, setBucketMissing] = useState(false)

  // Compare mode
  const [compareMode, setCompareMode]   = useState(false)
  const [selected, setSelected]         = useState([])
  const [comparePanel, setComparePanel] = useState(false)

  const fileRef = useRef(null)

  // ── Load from Supabase ────────────────────────────────────────────────────
  const load = useCallback(async (uid) => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('id, storage_path, taken_at, notes, weight_kg')
        .eq('user_id', uid)
        .order('taken_at', { ascending: true })
        .limit(200)
      if (error) throw error

      const withUrls = await Promise.all((data ?? []).map(async (p) => {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(p.storage_path, 60 * 60)
        return { ...p, url: signed?.signedUrl ?? null }
      }))
      // Replace only confirmed (non-pending) photos with fresh data from DB.
      // Keep any pending optimistic entries so they don't flash away.
      setPhotos(prev => {
        const pending = prev.filter(p => p._pending)
        const confirmed = withUrls.filter(p => p.url)
        // Merge: confirmed first (oldest → newest), then pending at the end
        return [...confirmed, ...pending]
      })
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

  // ── Upload (supports multiple files) ────────────────────────────────────
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !userId) return

    setBucketMissing(false)

    // For each file: show an optimistic placeholder immediately, then upload
    await Promise.all(files.map(async (file) => {
      // Read EXIF date first — this is fast (only reads first 64 KB)
      const exifDate = await readExifDate(file)
      const takenAt  = exifDate ?? todayIso()  // use photo's own date, fall back to today

      // Create a temporary local object URL so the photo appears instantly
      const tempId   = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const localUrl = URL.createObjectURL(file)

      const optimistic = {
        id:           tempId,
        taken_at:     takenAt,
        url:          localUrl,
        storage_path: null,
        weight_kg:    null,
        notes:        null,
        _pending:     true,
      }

      // Insert the optimistic entry and mark it as uploading
      setPhotos(prev => {
        // Insert in chronological position (today = end since sorted oldest→newest)
        return [...prev, optimistic]
      })
      setUploadingIds(prev => new Set([...prev, tempId]))

      try {
        const dataUrl = await compressImageFile(file, { maxWidth: 1080, maxHeight: 1920, quality: 0.85 })
        const res     = await fetch(dataUrl)
        const blob    = await res.blob()
        const ext     = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path    = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: blob.type || `image/${ext}`, upsert: false })

        if (upErr) {
          if (isBucketNotFound(upErr)) setBucketMissing(true)
          throw new Error(isBucketNotFound(upErr)
            ? 'Storage bucket not found — see setup instructions below.'
            : `Upload failed: ${upErr.message}`)
        }

        const { data: insData, error: insErr } = await supabase
          .from('progress_photos')
          .insert({ user_id: userId, storage_path: path, taken_at: takenAt })
          .select('id, storage_path, taken_at, notes, weight_kg')
          .single()

        if (insErr) {
          await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
          throw new Error(`Save failed: ${insErr.message}`)
        }

        // Get a proper signed URL for the newly saved photo
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60)

        const confirmed = {
          ...insData,
          url: signed?.signedUrl ?? localUrl, // fall back to local blob if signing fails
          _pending: false,
        }

        // Swap the optimistic entry with the real one
        setPhotos(prev =>
          prev.map(p => p.id === tempId ? confirmed : p)
        )
        URL.revokeObjectURL(localUrl)
        toast.success(`Photo saved — ${fmtDate(takenAt)}${exifDate ? '' : ' (today)'}`)
      } catch (err) {
        // Remove the optimistic entry on failure
        setPhotos(prev => prev.filter(p => p.id !== tempId))
        URL.revokeObjectURL(localUrl)
        toast.error(err.message)
      } finally {
        setUploadingIds(prev => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })
      }
    }))
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (photo) => {
    if (photo._pending) return // can't delete while uploading
    if (!confirm(`Delete photo from ${fmtDate(photo.taken_at)}?`)) return
    setDeleting(photo.id)
    try {
      if (photo.storage_path) {
        await supabase.storage.from(BUCKET).remove([photo.storage_path])
      }
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

  // ── Compare ───────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2)  return [prev[1], id]
      return [...prev, id]
    })
  }

  const exitCompare = () => {
    setCompareMode(false)
    setSelected([])
    setComparePanel(false)
  }

  const comparePair = selected.length === 2
    ? [photos.find(p => p.id === selected[0]), photos.find(p => p.id === selected[1])]
        .filter(Boolean)
        .sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at))
    : []

  const canCompare      = photos.filter(p => !p._pending).length >= 2
  const uploadingCount  = uploadingIds.size

  // ── Render ─────────────────────────────────────────────────────────────────
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
              defaultValue: 'Upload photos to track your progress — date is read from the photo automatically',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Compare toggle — only shown when ≥2 confirmed photos exist */}
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
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          )}

          {/* Add photos button — supports multiple selection */}
          {!compareMode && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!userId}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {uploadingCount > 0
                ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading {uploadingCount}…</span></>
                : <><ImagePlus className="h-4 w-4" /><span>Add Photos</span></>}
            </button>
          )}
        </div>

        {/* multiple: select as many files as you like */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      {/* Compare mode instruction */}
      {compareMode && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
          <p className="text-xs text-primary font-medium">
            {selected.length === 0 && 'Select the "Before" photo'}
            {selected.length === 1 && 'Now select the "After" photo'}
            {selected.length === 2 && '2 photos selected — ready to compare'}
          </p>
          {selected.length === 2 && (
            <button
              onClick={() => setComparePanel(true)}
              className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
              View
            </button>
          )}
        </div>
      )}

      {/* Bucket missing banner */}
      {bucketMissing && <BucketMissingBanner />}

      {/* ── Photo grid ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 rounded-xl border border-dashed border-border">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <ImageIcon className="h-7 w-7 text-muted-foreground opacity-40" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-[220px]">
            No progress photos yet. Tap <strong>Add Photos</strong> to upload your first.
          </p>
          {userId && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ImagePlus className="h-4 w-4" />
              Add your first photo
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((p, i) => {
              const isPending  = !!p._pending
              const isUploading = uploadingIds.has(p.id)
              const isSelected = selected.includes(p.id)
              const selIdx     = selected.indexOf(p.id)

              return (
                <div
                  key={p.id}
                  className={cn(
                    'group relative flex flex-col rounded-xl overflow-hidden bg-muted',
                    'ring-2 transition-all duration-150',
                    // Compare selection rings
                    compareMode && isSelected && selIdx === 0 && 'ring-blue-500 shadow-lg shadow-blue-500/20',
                    compareMode && isSelected && selIdx === 1 && 'ring-emerald-500 shadow-lg shadow-emerald-500/20',
                    compareMode && !isSelected && !isPending && 'ring-transparent opacity-70 hover:opacity-100 cursor-pointer',
                    compareMode && isPending && 'ring-transparent opacity-40 pointer-events-none',
                    !compareMode && !isPending && 'ring-transparent hover:ring-primary/40 cursor-pointer',
                    !compareMode && isPending && 'ring-transparent cursor-default'
                  )}
                  onClick={() => {
                    if (isPending || isUploading) return
                    if (compareMode) toggleSelect(p.id)
                    else setLightbox(i)
                  }}
                >
                  {/* Photo */}
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img
                      src={p.url}
                      alt={`Progress ${fmtDate(p.taken_at)}`}
                      className={cn('w-full h-full object-cover', isPending && 'opacity-60')}
                      loading="lazy"
                    />
                    {/* Uploading spinner overlay */}
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-7 w-7 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Date label — always visible */}
                  <div className="px-2 py-1.5 bg-background/90 backdrop-blur-sm flex items-center justify-between gap-1 min-h-[2rem]">
                    <div className="flex items-center gap-1 min-w-0">
                      <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-[11px] font-medium text-foreground truncate leading-tight">
                        {fmtDateShort(p.taken_at)}
                      </p>
                    </div>
                    {p.weight_kg && (
                      <p className="text-[10px] text-muted-foreground shrink-0">{p.weight_kg} kg</p>
                    )}
                  </div>

                  {/* Compare selection badge */}
                  {compareMode && !isPending && (
                    <div className="absolute top-1.5 left-1.5">
                      {isSelected ? (
                        <span className={cn(
                          'flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full',
                          selIdx === 0 ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
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

                  {/* Delete button — non-compare mode, shown on hover */}
                  {!compareMode && !isPending && (
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

                  {/* Start / Latest badge */}
                  {!compareMode && !isPending && (i === 0 || i === photos.filter(x => !x._pending).length - 1) && (
                    <span className="absolute bottom-9 left-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/80 text-primary-foreground pointer-events-none">
                      {i === 0 ? 'Start' : 'Latest'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer: count + compare shortcut */}
          {!compareMode && (
            <p className="text-xs text-muted-foreground text-center">
              {photos.filter(p => !p._pending).length} photo{photos.filter(p => !p._pending).length !== 1 ? 's' : ''}
              {canCompare && (
                <> ·{' '}
                  <button onClick={() => setCompareMode(true)} className="text-primary hover:underline">
                    Compare before &amp; after
                  </button>
                </>
              )}
            </p>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox
          photos={photos.filter(p => !p._pending)}
          index={Math.min(lightbox, photos.filter(p => !p._pending).length - 1)}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Compare panel */}
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
