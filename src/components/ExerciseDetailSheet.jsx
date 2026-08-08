import { useEffect, useState } from 'react'
import {
  X, Dumbbell, Clock, BarChart2, Target, Zap,
  BookOpen, Lightbulb, Trophy, ChevronRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { formatExerciseTarget } from '@/lib/exerciseFormat'
import {
  getExercisePhaseBadgeClass,
  getExercisePhaseLabel,
  inferExercisePhase,
} from '@/lib/exercisePhase'
import { useLocalizedName } from '@/lib/localizedField'

/* ─── GIF / image fetching ────────────────────────────────────────────────── *
 * We try two completely free, no-key APIs in order:
 *
 * 1. exercisedb-api.vercel.app  — open-source ExerciseDB mirror, free, returns
 *    animated GIFs for ~1300 exercises.
 *    Docs: https://github.com/yuhonas/free-exercise-db
 *
 * 2. wger.de REST API           — open-source fitness tracker, free, returns
 *    static PNGs for ~200 exercises (good fallback).
 *
 * Results are cached in memory for the session so reopening the same exercise
 * is instant and causes zero extra network requests.
 * ─────────────────────────────────────────────────────────────────────────── */

const GIF_CACHE = {}

/** Normalise an exercise name to a slug the free ExerciseDB API understands. */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchFromExerciseDB(name) {
  const slug = encodeURIComponent(toSlug(name))
  const res = await fetch(
    `https://exercisedb-api.vercel.app/api/v1/exercises?name=${slug}&limit=1`
  )
  if (!res.ok) throw new Error('exercisedb failed')
  const data = await res.json()
  // Response shape: { exercises: [{ gifUrl, ... }] }
  return data?.exercises?.[0]?.gifUrl || data?.[0]?.gifUrl || null
}

async function fetchFromWger(name) {
  const query = encodeURIComponent(name)
  const searchRes = await fetch(
    `https://wger.de/api/v2/exercise/search/?term=${query}&language=english&format=json`
  )
  if (!searchRes.ok) throw new Error('wger search failed')
  const searchData = await searchRes.json()
  const exerciseId = searchData?.suggestions?.[0]?.data?.id
  if (!exerciseId) return null

  const infoRes = await fetch(
    `https://wger.de/api/v2/exerciseinfo/${exerciseId}/?format=json`
  )
  if (!infoRes.ok) return null
  const info = await infoRes.json()
  const imgPath = info?.images?.[0]?.image
  return imgPath ? `https://wger.de${imgPath}` : null
}

/** Returns a GIF/image URL for the exercise name, or null if none found. */
export async function resolveExerciseMedia(name) {
  if (!name) return null
  const key = name.toLowerCase()
  if (GIF_CACHE[key] !== undefined) return GIF_CACHE[key]

  let url = null
  try { url = await fetchFromExerciseDB(name) } catch { /* fall through */ }
  if (!url) {
    try { url = await fetchFromWger(name) } catch { /* fall through */ }
  }

  GIF_CACHE[key] = url
  return url
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

/* ─── Main sheet ──────────────────────────────────────────────────────────── */

export default function ExerciseDetailSheet({ exercise, open, onClose, personalRecord }) {
  const { t } = useTranslation()
  const getLocalizedName = useLocalizedName()
  const [mediaUrl, setMediaUrl] = useState(null)
  const [mediaLoading, setMediaLoading] = useState(false)

  const phase = exercise ? inferExercisePhase(exercise) : 'main'

  useEffect(() => {
    if (!open || !exercise) return

    // Always prefer the user-uploaded image/gif — no API fetch needed
    if (exercise.imageUrl) {
      setMediaUrl(exercise.imageUrl)
      setMediaLoading(false)
      return
    }

    // No local image — try free APIs
    setMediaLoading(true)
    setMediaUrl(null)

    resolveExerciseMedia(exercise.name).then((url) => {
      setMediaUrl(url)
      setMediaLoading(false)
    })
  }, [open, exercise?.name, exercise?.imageUrl])

  if (!exercise) return null

  const target = formatExerciseTarget(exercise)

  const muscles = exercise.muscleGroups?.length
    ? exercise.muscleGroups
    : exercise.muscleGroup?.length
      ? exercise.muscleGroup
      : []

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'duration-200'
          )}
        />

        {/* Sheet — slides up on mobile, centred modal on desktop */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            // Mobile: full-width bottom sheet
            'fixed bottom-0 left-0 right-0 z-50 max-h-[92dvh] flex flex-col',
            'rounded-t-2xl border-t border-x border-border bg-background shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'duration-300 ease-out',
            // Desktop: centred dialog
            'md:bottom-auto md:left-1/2 md:top-1/2 md:right-auto',
            'md:-translate-x-1/2 md:-translate-y-1/2',
            'md:w-full md:max-w-2xl md:rounded-2xl',
            'md:data-[state=open]:slide-in-from-bottom-0',
            'md:data-[state=closed]:slide-out-to-bottom-0',
          )}
        >
          {/* Drag handle (mobile only) */}
          <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border/60 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold leading-tight">{getLocalizedName(exercise)}</h2>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0',
                  getExercisePhaseBadgeClass(phase)
                )}>
                  {getExercisePhaseLabel(phase)}
                </span>
              </div>
              {target && <p className="text-sm text-muted-foreground mt-0.5">{target}</p>}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="shrink-0 -mr-1">
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

            {/* Media — animated GIF or static image */}
            <div className="relative w-full rounded-xl overflow-hidden bg-muted border border-border/40"
              style={{ aspectRatio: '16/9' }}>
              {mediaLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-xs">Loading animation…</p>
                </div>
              )}
              {!mediaLoading && mediaUrl && (
                <img
                  src={mediaUrl}
                  alt={`${getLocalizedName(exercise)} demonstration`}
                  className={cn(
                    'w-full h-full',
                    // GIFs (remote URL or base64 data URL) and API-fetched animations:
                    // use contain to show full motion without cropping
                    mediaUrl.includes('.gif') ||
                    mediaUrl.startsWith('data:image/gif') ||
                    mediaUrl.includes('exercisedb') ||
                    mediaUrl.includes('wger')
                      ? 'object-contain'
                      : 'object-cover'
                  )}
                  loading="lazy"
                />
              )}
              {!mediaLoading && !mediaUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Dumbbell className="h-12 w-12 opacity-20" />
                  <p className="text-xs opacity-60">No animation available</p>
                </div>
              )}
            </div>

            {/* Key stats */}
            {[
              { label: t('custom.sets', { defaultValue: 'Sets' }), value: exercise.sets },
              { label: t('custom.reps', { defaultValue: 'Reps' }), value: exercise.reps },
              { label: 'Rest', value: exercise.restTime ? `${exercise.restTime}s` : null },
              { label: 'Difficulty', value: exercise.difficulty },
            ].filter(s => s.value).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t('custom.sets', { defaultValue: 'Sets' }), value: exercise.sets },
                  { label: t('custom.reps', { defaultValue: 'Reps' }), value: exercise.reps },
                  { label: 'Rest', value: exercise.restTime ? `${exercise.restTime}s` : null },
                  { label: 'Difficulty', value: exercise.difficulty },
                ].filter(s => s.value).map(stat => (
                  <div key={stat.label}
                    className="rounded-xl bg-muted/50 border border-border/60 px-3 py-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-base font-bold mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Personal record */}
            {personalRecord && (
              <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3">
                <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs text-amber-500 font-semibold uppercase tracking-wide">Personal Record</p>
                  <p className="text-sm font-semibold mt-0.5">{personalRecord}</p>
                </div>
              </div>
            )}

            {/* Muscles */}
            {muscles.length > 0 && (
              <Section title="Muscles Targeted" icon={Target}>
                <div className="flex flex-wrap gap-2">
                  {muscles.map(m => (
                    <span key={m}
                      className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                      {m}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Details grid */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <InfoRow icon={Dumbbell} label="Equipment" value={exercise.equipment} />
              <InfoRow icon={BarChart2} label="Category" value={exercise.category} />
              {exercise.isTimeBased && exercise.duration && (
                <InfoRow icon={Clock} label="Duration"
                  value={`${exercise.duration} ${exercise.durationUnit || 'seconds'}`} />
              )}
              <InfoRow icon={Zap} label="Difficulty" value={exercise.difficulty} />
            </div>

            {/* Description */}
            {exercise.description && (
              <Section title="Description" icon={BookOpen}>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-xl px-4 py-3 border border-border/60">
                  {exercise.description}
                </p>
              </Section>
            )}

            {/* Instructions — split into numbered steps */}
            {exercise.instructions && (
              <Section title="How To Do It" icon={ChevronRight}>
                <div className="bg-muted/30 rounded-xl px-4 py-3 border border-border/60 space-y-0">
                  {exercise.instructions
                    .split(/\n|\.(?=\s[A-Z])/)
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map((step, i) => (
                      <div key={i} className="flex gap-3 py-2 border-b border-border/40 last:border-0">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {/* Tips */}
            {exercise.tips && (
              <Section title="Tips" icon={Lightbulb}>
                <div className="bg-primary/5 rounded-xl px-4 py-3 border border-primary/20 space-y-0">
                  {exercise.tips
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map((tip, i) => (
                      <div key={i} className="flex gap-2 py-1.5 border-b border-primary/10 last:border-0">
                        <span className="text-primary shrink-0">•</span>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            <div className="h-4" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
