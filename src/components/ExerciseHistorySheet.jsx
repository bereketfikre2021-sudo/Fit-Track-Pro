import { useMemo } from 'react'
import { X, TrendingUp, Trophy, Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import { collectSetsForLibraryExercise, formatBestSet, getPersonalRecord } from '@/lib/personalRecords'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

function getBestSetForEntry(sets) {
  let best = null
  ;(sets || []).forEach((s) => {
    const w = parseFloat(s.weightKg) || 0
    const r = parseInt(s.reps, 10) || 0
    if (!best) { best = s; return }
    const bw = parseFloat(best.weightKg) || 0
    const br = parseInt(best.reps, 10) || 0
    if (w > bw || (w === bw && r > br)) best = s
  })
  return best
}

export default function ExerciseHistorySheet({ exercise, completedExercises, onClose }) {
  const libraryId = exercise?.id

  const history = useMemo(() => {
    if (!libraryId) return []

    // Group entries by date, pick best set per date
    const byDate = {}
    Object.values(completedExercises || {}).forEach((entry) => {
      if (entry.libraryExerciseId !== libraryId) return
      if (!entry.completedAt || entry.skipped) return
      const best = getBestSetForEntry(entry.sets)
      if (!best) return
      const w = parseFloat(best.weightKg) || 0
      const r = parseInt(best.reps, 10) || 0
      if (w === 0 && r === 0) return

      if (!byDate[entry.date] || w > (byDate[entry.date].weight)) {
        byDate[entry.date] = {
          date: entry.date,
          weight: w,
          reps: r,
          volume: w * r,
          label: formatBestSet(best),
        }
      }
    })

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-20)
  }, [libraryId, completedExercises])

  const pr = getPersonalRecord(completedExercises, libraryId)

  const hasWeight = history.some((h) => h.weight > 0)
  const chartData = useMemo(() => {
    if (history.length === 0) return null
    const labels = history.map((h) => {
      const [, m, d] = h.date.split('-')
      return `${parseInt(m)}/${parseInt(d)}`
    })
    const values = history.map((h) => hasWeight ? h.weight : h.reps)

    return {
      labels,
      datasets: [
        {
          data: values,
          fill: true,
          tension: 0.35,
          borderColor: 'hsl(var(--primary))',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx
            const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height)
            gradient.addColorStop(0, 'rgba(132, 204, 22, 0.25)')
            gradient.addColorStop(1, 'rgba(132, 204, 22, 0.02)')
            return gradient
          },
          borderColor: 'rgba(132, 204, 22, 0.9)',
          pointBackgroundColor: 'rgba(132, 204, 22, 1)',
          pointBorderColor: 'rgba(132, 204, 22, 1)',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [history, hasWeight])

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(0,0,0,0.75)',
      titleColor: '#fff',
      bodyColor: '#ccc',
      callbacks: {
        label: (ctx) => hasWeight ? `${ctx.raw} kg` : `${ctx.raw} reps`,
      },
    }},
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: 'rgba(150,150,150,0.8)' },
      },
      y: {
        grid: { color: 'rgba(150,150,150,0.15)' },
        ticks: {
          font: { size: 10 },
          color: 'rgba(150,150,150,0.8)',
          callback: (v) => hasWeight ? `${v}kg` : `${v}r`,
        },
      },
    },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/60 px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              {exercise?.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Exercise history — last 20 sessions</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* PR card */}
          {pr && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Personal Record</p>
                  <p className="text-sm font-bold">{pr.label}</p>
                  {pr.date && <p className="text-[10px] text-muted-foreground">{pr.date}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {history.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium mb-1">No history yet</p>
                <p className="text-xs text-muted-foreground text-center">
                  Complete this exercise with set logging enabled to start tracking progress.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Chart */}
              {chartData && history.length > 1 && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm">
                      {hasWeight ? 'Best weight per session' : 'Reps per session'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <Line data={chartData} options={chartOptions} height={140} />
                  </CardContent>
                </Card>
              )}

              {/* History list */}
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm">Session log</CardTitle>
                  <CardDescription className="text-xs">{history.length} sessions recorded</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-1.5">
                    {[...history].reverse().map((h, i) => {
                      const isPrEntry = pr?.label === h.label && pr?.date === h.date
                      return (
                        <div
                          key={h.date}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm',
                            i === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
                          )}
                        >
                          <span className="text-xs text-muted-foreground w-20 shrink-0">{h.date}</span>
                          <span className="flex-1 text-xs font-medium">{h.label || '—'}</span>
                          {isPrEntry && (
                            <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shrink-0">
                              PR
                            </Badge>
                          )}
                          {i === 0 && !isPrEntry && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                              Latest
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
