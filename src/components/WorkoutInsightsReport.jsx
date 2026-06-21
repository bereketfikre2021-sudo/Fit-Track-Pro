import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Calendar,
  Dumbbell,
  Download,
  Share2,
  Printer,
  Target,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

import { Badge } from './ui/badge'

import { Button } from './ui/button'

import { cn } from '@/lib/utils'

import { compareWeekOverWeek } from '@/lib/workoutInsights'
import { getWeeklyConsistency } from '@/lib/consistencyScore'

import {

  downloadWeeklyReport,

  printWeeklyReport,

  shareWeeklyReport,

} from '@/lib/exportReport'

import { toast } from 'sonner'
import { translateWeekday, translateWeekdayAbbrev } from '@/lib/i18nHelpers'



function WorkoutInsightsReport({ state, className }) {
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

        <div className="space-y-3">

          <p className="text-sm font-medium">{t('report.daysWorked')}</p>

          <div className="grid grid-cols-7 gap-1.5">

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

      </CardContent>

    </Card>

  )

}



export default WorkoutInsightsReport

