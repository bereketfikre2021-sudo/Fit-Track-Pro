import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Dumbbell, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import { getProgressiveOverloadData } from '@/lib/progressiveOverload'

// ─── Trend indicator ──────────────────────────────────────────────────────────

function TrendBadge({ trend }) {
  if (!trend) return null
  if (trend === 'up') return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
      <TrendingUp className="h-3 w-3" />
      PR
    </span>
  )
  if (trend === 'down') return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
      <TrendingDown className="h-3 w-3" />
      Drop
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" />
      Same
    </span>
  )
}

// ─── Mini bar chart for volume/e1rm trend ─────────────────────────────────────

function MiniChart({ sessions, field }) {
  const values = sessions.map((s) => s[field] || 0)
  const max = Math.max(...values, 1)
  const last = values[values.length - 1]

  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => {
        const isLast = i === values.length - 1
        const height = Math.max(4, Math.round((v / max) * 32))
        const isUp = i > 0 && v > values[i - 1]
        const isDown = i > 0 && v < values[i - 1]
        return (
          <div
            key={i}
            title={`${sessions[i].date}: ${field === 'e1rm' ? `~${v} kg 1RM` : `${v} kg vol`}`}
            style={{ height }}
            className={cn(
              'w-3 rounded-sm transition-all',
              isLast
                ? isUp
                  ? 'bg-emerald-500'
                  : isDown
                    ? 'bg-amber-500'
                    : 'bg-primary'
                : 'bg-muted-foreground/30'
            )}
          />
        )
      })}
    </div>
  )
}

// ─── Single exercise row ──────────────────────────────────────────────────────

function ExerciseOverloadRow({ row }) {
  const [expanded, setExpanded] = useState(false)
  const { name, trend, lastSession, prevSession, sessions } = row

  if (!lastSession) return null

  // Change vs previous session
  const e1rmDelta = prevSession
    ? Math.round((lastSession.e1rm - prevSession.e1rm) * 10) / 10
    : null
  const volDelta = prevSession
    ? Math.round(lastSession.volume - prevSession.volume)
    : null

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        {/* Exercise name + trend */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{name}</span>
            <TrendBadge trend={trend} />
          </div>
          {/* Last session summary */}
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {lastSession.setsLabel}
          </p>
        </div>

        {/* Mini trend chart + expand toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {sessions.length >= 2 && (
            <MiniChart sessions={sessions} field="e1rm" />
          )}
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded: metrics + session history */}
      {expanded && (
        <div className="border-t border-border/60 bg-muted/10 px-3 py-3 space-y-3">
          {/* Key metrics row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                Est. 1RM
              </p>
              <p className="text-base font-bold">
                {lastSession.e1rm > 0 ? `${lastSession.e1rm} kg` : '—'}
              </p>
              {e1rmDelta !== null && e1rmDelta !== 0 && (
                <p className={cn(
                  'text-[10px] font-medium mt-0.5',
                  e1rmDelta > 0 ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {e1rmDelta > 0 ? '+' : ''}{e1rmDelta} kg vs last
                </p>
              )}
            </div>

            <div className="rounded-md border border-border bg-background px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                Volume
              </p>
              <p className="text-base font-bold">
                {lastSession.volume > 0 ? `${lastSession.volume} kg` : '—'}
              </p>
              {volDelta !== null && volDelta !== 0 && (
                <p className={cn(
                  'text-[10px] font-medium mt-0.5',
                  volDelta > 0 ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {volDelta > 0 ? '+' : ''}{volDelta} kg vs last
                </p>
              )}
            </div>
          </div>

          {/* Session history table */}
          {sessions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Session history ({sessions.length} logged)
              </p>
              <div className="space-y-1">
                {[...sessions].reverse().map((s, i) => (
                  <div
                    key={s.date + i}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs',
                      i === 0
                        ? 'bg-primary/8 border border-primary/20 font-medium'
                        : 'bg-muted/20 border border-border/40'
                    )}
                  >
                    <span className="text-muted-foreground shrink-0">{s.date}</span>
                    <span className="flex-1 text-center truncate">{s.setsLabel}</span>
                    {s.e1rm > 0 && (
                      <span className="text-muted-foreground shrink-0">~{s.e1rm}kg 1RM</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

export default function ProgressiveOverloadCard({ state }) {
  const rows = useMemo(
    () => getProgressiveOverloadData(state, { maxSessions: 5 }),
    [
      state.completedExercises,
      state.customExercises,
      state.workoutSchedule,
      state.profile?.workoutDays,
    ]
  )

  const [showAll, setShowAll] = useState(false)
  const PREVIEW = 4
  const visible = showAll ? rows : rows.slice(0, PREVIEW)

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Progressive Overload
        </CardTitle>
        <CardDescription className="flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          Track weight and reps over time. Add a starting kg when scheduling an exercise, then update each session to see your progress trend.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed text-center px-4">
            <Dumbbell className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm font-medium mb-1">No weight data yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              When adding an exercise to a workout day, set a starting kg. After logging sessions with weights, your progress will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 pb-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                PR — estimated 1RM increased
              </span>
              <span className="flex items-center gap-1">
                <Minus className="h-3 w-3" />
                Same — no change
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-amber-500" />
                Drop — lower than last session
              </span>
            </div>

            <div className="space-y-2">
              {visible.map((row) => (
                <ExerciseOverloadRow key={row.id} row={row} />
              ))}
            </div>

            {rows.length > PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-dashed"
              >
                {showAll ? (
                  <><ChevronUp className="h-4 w-4" /> Show less</>
                ) : (
                  <><ChevronDown className="h-4 w-4" /> Show {rows.length - PREVIEW} more</>
                )}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
