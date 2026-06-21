import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Calendar, Dumbbell, TrendingUp, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { formatExerciseTarget } from '@/lib/exerciseFormat'
import { formatSetsSummary } from '@/lib/setLogging'
import { isAlignedWorkoutCompletion } from '@/lib/calendarDay'
import { resolveCompletedExercise } from '@/lib/workoutInsights'
import { Badge } from './ui/badge'
import WorkoutInsightsReport from './WorkoutInsightsReport'
import SessionHistoryCard from './SessionHistoryCard'
import AchievementsCard from './AchievementsCard'
import { translateWeekday } from '@/lib/i18nHelpers'

function HistoryTab({ state }) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState(30)
  const [expandedDates, setExpandedDates] = useState(() => new Set())

  const toggleDateExpanded = (date) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const completedExercises = state.completedExercises || {}
  const customExercises = state.customExercises || []
  const workoutSchedule = state.workoutSchedule || {}
  const workoutDays = state.profile?.workoutDays || []

  // Convert completed exercises to array with details
  const completedHistory = Object.entries(completedExercises).map(([key, data]) => {
    const resolved = resolveCompletedExercise(data, customExercises, workoutSchedule)
    return {
      ...data,
      key,
      exerciseName: resolved.name,
      exerciseDetails: resolved.details,
    }
  }).sort((a, b) => b.completedAt - a.completedAt)

  // Filter by period; skip off-schedule days (e.g. Tuesday plan on a rest-day Wednesday)
  const cutoff = period ? new Date(Date.now() - period * 86400000) : null
  const filteredHistory = completedHistory
    .filter((h) => isAlignedWorkoutCompletion(h, workoutDays))
    .filter((h) => {
      if (!cutoff) return true
      const [y, m, d] = h.date.split('-').map(Number)
      return new Date(y, m - 1, d) >= cutoff
    })

  // Group by date
  const groupedByDate = filteredHistory.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = []
    }
    acc[item.date].push(item)
    return acc
  }, {})

  // Calculate stats
  const totalWorkouts = Object.keys(groupedByDate).length
  const totalExercises = filteredHistory.length
  const uniqueExercises = new Set(filteredHistory.map(h => h.exerciseId)).size

  // Get most active days
  const dayCount = filteredHistory.reduce((acc, item) => {
    acc[item.day] = (acc[item.day] || 0) + 1
    return acc
  }, {})
  const mostActiveDay = Object.keys(dayCount).length > 0 
    ? Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0][0]
    : null

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('report.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('report.subtitle')}
        </p>
      </div>

      <WorkoutInsightsReport state={state} />

      <SessionHistoryCard state={state} />

      <AchievementsCard state={state} />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">{t('report.workoutDays')}</p>
            </div>
            <p className="text-2xl font-bold">{totalWorkouts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">{t('report.exercisesDone')}</p>
            </div>
            <p className="text-2xl font-bold">{totalExercises}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">{t('report.uniqueExercises')}</p>
            </div>
            <p className="text-2xl font-bold">{uniqueExercises}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">{t('report.mostActive')}</p>
            </div>
            <p className="text-lg font-bold">
              {mostActiveDay ? translateWeekday(mostActiveDay) : t('common.na')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Filter */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('report.activityLog')}</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value))}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="7">{t('report.period7')}</option>
          <option value="30">{t('report.period30')}</option>
          <option value="90">{t('report.period90')}</option>
          <option value="365">{t('report.periodYear')}</option>
          <option value="0">{t('report.periodAll')}</option>
        </select>
      </div>

      {/* History List */}
      {Object.keys(groupedByDate).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('report.noActivity')}</p>
            <p className="text-sm text-muted-foreground text-center">
              {t('report.noActivityDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedByDate)
            .sort((a, b) => b.localeCompare(a))
            .map((date) => {
            const exercises = groupedByDate[date]
            const isExpanded = expandedDates.has(date)
            const [y, m, d] = date.split('-').map(Number)
            const dateObj = new Date(y, m - 1, d)
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })

            return (
              <Card key={date}>
                <button
                  type="button"
                  onClick={() => toggleDateExpanded(date)}
                  aria-expanded={isExpanded}
                  className="w-full text-left rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">{formattedDate}</CardTitle>
                        <CardDescription className="text-xs">
                          {t('report.completedOnDate', { count: exercises.length })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {translateWeekday(exercises[0].day)}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>
                {isExpanded && (
                <CardContent className="pt-0 border-t border-border/60">
                  <div className="space-y-2 pt-3">
                    {exercises.map((item) => {
                      const exercise = item.exerciseDetails
                      const completedTime = new Date(item.completedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })

                      return (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.exerciseName}</p>
                              {exercise && (
                                <p className="text-xs text-muted-foreground">
                                  {formatExerciseTarget(exercise)}
                                  {!exercise.isTimeBased &&
                                    exercise.restTime &&
                                    ` • ${exercise.restTime}s rest`}
                                </p>
                              )}
                              {(item.sets?.length > 0 || item.weightUsed || item.notes) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatSetsSummary(item.sets) ||
                                    (item.weightUsed ? `${item.weightUsed} kg` : '')}
                                  {(formatSetsSummary(item.sets) || item.weightUsed) && item.notes
                                    ? ' · '
                                    : ''}
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {completedTime}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HistoryTab
