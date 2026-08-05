import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Calendar,
  Dumbbell,
  Download,
  Share2,
  Printer,
  Target,
  TrendingUp,
  BarChart2,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

import { Badge } from './ui/badge'

import { Button } from './ui/button'

import { cn } from '@/lib/utils'

import { compareWeekOverWeek, getWeeklyVolume } from '@/lib/workoutInsights'
import { getWeeklyConsistency } from '@/lib/consistencyScore'

import {

  downloadWeeklyReport,

  printWeeklyReport,

  shareWeeklyReport,

} from '@/lib/exportReport'

import { toast } from 'sonner'
import { translateWeekday, translateWeekdayAbbrev } from '@/lib/i18nHelpers'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip)



function WorkoutInsightsReport({ state, className, stats = null }) {
  const { t } = useTranslation()

  const [exporting, setExporting] = useState(false)

  const comparison = useMemo(

    () => compareWeekOverWeek(state),

    [

      state.completedExercises,

      state.customExercises,

      state.workoutSchedule,

      state.profile?.workoutDays,

    ]

  )

  const { current: report, muscleChanges } = comparison

  const consistency = useMemo(
    () => getWeeklyConsistency(state, 0),
    [
      state.completedExercises,
      state.profile?.workoutDays,
      state.workoutSchedule,
    ]
  )

  const volume = useMemo(
    () => getWeeklyVolume(state, 0),
    [state.completedExercises]
  )

  const volumePrev = useMemo(
    () => getWeeklyVolume(state, -1),
    [state.completedExercises]
  )

  // 8-week volume trend (week -7 to current)
  const weeklyVolumeTrend = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const offset = i - 7
      const v = getWeeklyVolume(state, offset)
      // Build a short "Mon DD" label for the week start
      const d = new Date()
      const day = d.getDay()
      const mondayOffset = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + mondayOffset + offset * 7)
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return { label, volume: v.totalVolumeKg, sets: v.totalSets }
    })
  }, [state.completedExercises])



  const handleShare = async () => {

    setExporting(true)

    try {

      const result = await shareWeeklyReport(state)

      if (result === 'shared') toast.success(t('workoutInsights.shared'))

      else toast.success(t('workoutInsights.downloaded'))

    } catch (err) {

      if (err?.name !== 'AbortError') toast.error(t('workoutInsights.shareFail'))

    } finally {

      setExporting(false)

    }

  }



  const handlePrint = () => {

    const ok = printWeeklyReport(state)

    if (ok) toast.success(t('workoutInsights.printOpened'))

    else {

      downloadWeeklyReport(state)

      toast.info(t('workoutInsights.popupBlocked'))

    }

  }



  return (

    <Card className={cn('mb-6', className)}>

      <CardHeader className="pb-3">

        <div className="flex items-start justify-between gap-3">

          <div>

            <CardTitle className="text-lg flex items-center gap-2">

              <Calendar className="h-5 w-5 text-primary" />

              {t('report.weekReport')}

            </CardTitle>

            <CardDescription>{report.weekRangeLabel}</CardDescription>

          </div>

          <div className="flex gap-1 shrink-0">

            <Button

              type="button"

              variant="ghost"

              size="icon"

              className="h-8 w-8"

              onClick={() => {

                downloadWeeklyReport(state)

                toast.success(t('workoutInsights.downloaded'))

              }}

              title={t('report.downloadReport')}

              aria-label={t('report.downloadReport')}

            >

              <Download className="h-4 w-4" />

            </Button>

            <Button

              type="button"

              variant="ghost"

              size="icon"

              className="h-8 w-8"

              onClick={handleShare}

              disabled={exporting}

              title={t('report.shareReport')}

              aria-label={t('report.shareReport')}

            >

              <Share2 className="h-4 w-4" />

            </Button>

            <Button

              type="button"

              variant="ghost"

              size="icon"

              className="h-8 w-8"

              onClick={handlePrint}

              title={t('report.printReport')}

              aria-label={t('report.printReport')}

            >

              <Printer className="h-4 w-4" />

            </Button>

          </div>

        </div>

      </CardHeader>

      <CardContent className="space-y-6">
        {consistency != null && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {t('report.consistency')}
              </p>
              <p className="text-2xl font-bold text-primary">{consistency.percent}%</p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${consistency.percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('workoutInsights.consistencyThisWeek', { label: consistency.label })}
            </p>
          </div>
        )}

        {/* Stats mini-cards — shown when passed from HistoryTab */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {t('report.workoutDays')}
              </p>
              <p className="text-xl font-bold">{stats.totalWorkouts}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <Dumbbell className="h-3.5 w-3.5 text-primary" />
                {t('report.exercisesDone')}
              </p>
              <p className="text-xl font-bold">{stats.totalExercises}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <Dumbbell className="h-3.5 w-3.5 text-primary" />
                {t('report.uniqueExercises')}
              </p>
              <p className="text-xl font-bold">{stats.uniqueExercises}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                {t('report.mostActive')}
              </p>
              <p className="text-base font-bold">
                {stats.mostActiveDay ? translateWeekday(stats.mostActiveDay) : t('common.na')}
              </p>
            </div>
          </div>
        )}

        {/* Weekly volume */}
        {(volume.totalSets > 0 || volume.totalVolumeKg > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                  {t('report.weeklyVolume')}
                </p>
              </div>
              <p className="text-xl font-bold">
                {volume.totalVolumeKg > 0
                  ? `${volume.totalVolumeKg.toLocaleString()} kg`
                  : '—'}
              </p>
              {volumePrev.totalVolumeKg > 0 && volume.totalVolumeKg > 0 && (
                <p className={cn(
                  'text-xs mt-0.5 font-medium',
                  volume.totalVolumeKg >= volumePrev.totalVolumeKg
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                )}>
                  {volume.totalVolumeKg >= volumePrev.totalVolumeKg ? '▲' : '▼'}{' '}
                  {Math.abs(volume.totalVolumeKg - volumePrev.totalVolumeKg).toLocaleString()} kg {t('report.vsLastWeek')}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart2 className="h-3.5 w-3.5 text-primary" />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                  {t('report.setsCompleted')}
                </p>
              </div>
              <p className="text-xl font-bold">{volume.totalSets}</p>
              {volumePrev.totalSets > 0 && volume.totalSets > 0 && (
                <p className={cn(
                  'text-xs mt-0.5 font-medium',
                  volume.totalSets >= volumePrev.totalSets
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                )}>
                  {volume.totalSets >= volumePrev.totalSets ? '▲' : '▼'}{' '}
                  {Math.abs(volume.totalSets - volumePrev.totalSets)} {t('report.vsLastWeek')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">

          <p className="text-sm font-medium">{t('report.daysWorked')}</p>          <div className="grid grid-cols-7 gap-1.5">

            {report.daysThisWeek.map((day) => (

              <div

                key={day.label}

                className={cn(

                  'flex flex-col items-center rounded-lg border p-2 text-center transition-colors',

                  day.worked

                    ? 'border-primary bg-primary/15 text-primary'

                    : 'border-border bg-muted/20 text-muted-foreground'

                )}

              >

                <span className="text-[10px] font-medium uppercase">

                  {translateWeekdayAbbrev(day.label)}

                </span>

                <span className="text-[10px] mt-1 opacity-80">

                  {parseInt(day.dateStr.slice(8), 10)}

                </span>

              </div>

            ))}

          </div>

          {report.planDaysWorked.length > 0 ? (

            <p className="text-xs text-muted-foreground">

              {t('report.planDaysCompleted')}:{' '}

              <span className="text-foreground font-medium">

                {report.planDaysWorked.map(translateWeekday).join(', ')}

              </span>

            </p>

          ) : (

            <p className="text-xs text-muted-foreground">

              {t('report.completeOnWorkout')}

            </p>

          )}

        </div>



        <div className="space-y-3">

          <p className="text-sm font-medium flex items-center gap-2">

            <Dumbbell className="h-4 w-4 text-primary" />

            {t('report.musclesTargeted')}

          </p>

          {report.targetMuscles.length === 0 ? (

            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">

              {t('report.noMuscles')}

            </p>

          ) : (

            <div className="flex flex-wrap gap-2">

              {report.targetMuscles.map(({ muscle, count }) => {

                const change = muscleChanges.find((m) => m.muscle === muscle)

                return (

                  <Badge

                    key={muscle}

                    variant="secondary"

                    className="text-xs px-2.5 py-1 bg-primary/10 text-primary border-primary/20"

                  >

                    {muscle}

                    <span className="ml-1.5 opacity-70">×{count}</span>

                    {change?.delta ? (

                      <span

                        className={cn(

                          'ml-1',

                          change.delta > 0 ? 'text-emerald-600' : 'text-amber-600'

                        )}

                      >

                        ({change.delta > 0 ? '+' : ''}

                        {change.delta})

                      </span>

                    ) : null}

                  </Badge>

                )

              })}

            </div>

          )}

        </div>

        {/* 8-week volume trend — HIDDEN for now, code kept for future use */}
        {false && weeklyVolumeTrend.some((w) => w.volume > 0 || w.sets > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              8-week volume trend
            </p>
            <div className="rounded-lg border border-border bg-muted/10 p-3">
              <Bar
                height={110}
                data={{
                  labels: weeklyVolumeTrend.map((w) => w.label),
                  datasets: [
                    {
                      label: 'Volume (kg)',
                      data: weeklyVolumeTrend.map((w) => w.volume),
                      backgroundColor: weeklyVolumeTrend.map((_, i) =>
                        i === 7 ? 'rgba(132,204,22,0.85)' : 'rgba(132,204,22,0.3)'
                      ),
                      borderRadius: 4,
                      borderSkipped: false,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(10,17,40,0.92)',
                      titleColor: 'hsl(213,31%,91%)',
                      bodyColor: 'hsl(215,20%,65%)',
                      callbacks: {
                        label: (ctx) => `${ctx.raw.toLocaleString()} kg`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 9 }, color: 'hsl(215,20%,55%)' },
                    },
                    y: {
                      grid: { color: 'rgba(71,108,182,0.1)' },
                      ticks: {
                        font: { size: 9 },
                        color: 'hsl(215,20%,55%)',
                        callback: (v) => v === 0 ? '' : `${v}kg`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

      </CardContent>

    </Card>

  )

}



export default WorkoutInsightsReport

