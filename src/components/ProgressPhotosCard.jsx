/**
 * ProgressPhotosCard.jsx
 * Upload, view, and delete progress photos stored in Supabase Storage.
 * Route: shown on HistoryPage / ProfilePage
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { compressImageFile } from '../lib/imageUtils'
import { useTranslation } from 'react-i18next'
import { Camera, Trash2, Loader2, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const BUCKET = 'progress_photos'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
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

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
        <X className="h-5 w-5" />
      </button>
      {total > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setCur(i => (i - 1 + total) % total) }}
            className="absolute left-4 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={e => { e.stopPropagation(); setCur(i => (i + 1) % total) }}
            className="absolute right-16 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <div onClick={e => e.stopPropagation()} className="max-w-2xl w-full mx-8">
        <img src={photos[cur].url} alt="Progress" className="w-full max-h-[80vh] object-contain rounded-xl" />
        <p className="text-center text-sm text-white/60 mt-2">{fmtDate(photos[cur].taken_at)} · {cur + 1}/{total}</p>
        {photos[cur].note && <p className="text-center text-sm text-white/80 mt-1">{photos[cur].note}</p>}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProgressPhotosCard() {
  const { t } = useTranslation()
  const [photos, setPhotos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId]       = useState(null)
  const [lightbox, setLightbox]   = useState(null)  // index
  const [deleting, setDeleting]   = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async (uid) => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('id, storage_path, taken_at, note, weight_kg')
        .eq('user_id', uid)
        .order('taken_at', { ascending: false })
        .limit(50)
      if (error) throw error

      // Generate signed URLs for all photos in parallel
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

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return

    setUploading(true)
    try {
      // Compress image
      const dataUrl = await compressImageFile(file, { maxWidth: 1080, maxHeight: 1920, quality: 0.85 })
      const res     = await fetch(dataUrl)
      const blob    = await res.blob()
      const ext     = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path    = `${userId}/${Date.now()}.${ext}`

      // Upload to Supabase Storage
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type || `image/${ext}`, upsert: false })
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

      // Insert metadata row
      const { error: insErr } = await supabase.from('progress_photos').insert({
        user_id:      userId,
        storage_path: path,
        taken_at:     new Date().toISOString(),
      })
      if (insErr) throw new Error(`Save failed: ${insErr.message}`)

      toast.success('Progress photo saved!')
      load(userId)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photo) => {
    if (!confirm(`Delete this photo from ${fmtDate(photo.taken_at)}?`)) return
    setDeleting(photo.id)
    try {
      await supabase.storage.from(BUCKET).remove([photo.storage_path])
      await supabase.from('progress_photos').delete().eq('id', photo.id)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      toast.success('Photo deleted')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">{t('profile.progressPhotos', { defaultValue: 'Progress Photos' })}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('profile.progressPhotosDesc', { defaultValue: 'Track your physical progress over time' })}
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !userId}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {uploading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Camera className="h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Add Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 rounded-xl border border-dashed border-border">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <ImageIcon className="h-7 w-7 text-muted-foreground opacity-40" />
          </div>
          <p className="text-sm text-muted-foreground">No progress photos yet</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm text-primary hover:underline"
          >
            Add your first photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-[3/4] bg-muted">
              <img
                src={p.url}
                alt={`Progress ${fmtDate(p.taken_at)}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(i)}
                loading="lazy"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col justify-between p-1.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleDelete(p)}
                  disabled={deleting === p.id}
                  className="self-end h-7 w-7 flex items-center justify-center rounded-full bg-destructive/80 text-white hover:bg-destructive transition-colors"
                >
                  {deleting === p.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
                <p className="text-[10px] text-white/80 font-medium">{fmtDate(p.taken_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}
