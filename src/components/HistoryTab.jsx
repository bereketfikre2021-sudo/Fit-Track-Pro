import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Calendar, Dumbbell, TrendingUp, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { formatExerciseTarget } from '@/lib/exerciseFormat'
import { formatSetsSummary } from '@/lib/setLogging'
import { isAlignedWorkoutCompletion } from '@/lib/calendarDay'
import { resolveCompletedExercise } from '@/lib/workoutInsights'
import { Badge } from './ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import WorkoutInsightsReport from './WorkoutInsightsReport'
import AchievementsCard from './AchievementsCard'
import { translateWeekday } from '@/lib/i18nHelpers'
import { getSessionHistory } from '@/lib/sessionHistory'

const ACTIVITY_PREVIEW_COUNT = 3

function HistoryTab({ state }) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState(30)
  const [expandedDates, setExpandedDates] = useState(() => new Set())
  const [showAllDates, setShowAllDates] = useState(false)

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

  // --- Session History ---
  const [showAllSessions, setShowAllSessions] = useState(false)
  const allSessions = getSessionHistory(state.completedSessions, { limit: 20 })
  const sessions = showAllSessions ? allSessions : allSessions.slice(0, 3)

  // --- Activity Log ---
  const completedHistory = Object.entries(completedExercises).map(([key, data]) => {
    const resolved = resolveCompletedExercise(data, customExercises, workoutSchedule)
    return { ...data, key, exerciseName: resolved.name, exerciseDetails: resolved.details }
  }).sort((a, b) => b.completedAt - a.completedAt)

  const cutoff = period ? new Date(Date.now() - period * 86400000) : null
  const filteredHistory = completedHistory
    .filter((h) => isAlignedWorkoutCompletion(h, workoutDays))
    .filter((h) => {
      if (!cutoff) return true
      const [y, m, d] = h.date.split('-').map(Number)
      return new Date(y, m - 1, d) >= cutoff
    })

  const groupedByDate = filteredHistory.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item)
    return acc
  }, {})

  // --- Stats ---
  const totalWorkouts = Object.keys(groupedByDate).length
  const totalExercises = filteredHistory.length
  const uniqueExercises = new Set(filteredHistory.map(h => h.exerciseId)).size
  const dayCount = filteredHistory.reduce((acc, item) => {
    acc[item.day] = (acc[item.day] || 0) + 1
    return acc
  }, {})
  const mostActiveDay = Object.keys(dayCount).length > 0
    ? Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0][0]
    : null

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))
  const visibleDates = showAllDates ? sortedDates : sortedDates.slice(0, ACTIVITY_PREVIEW_COUNT)

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('report.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('report.subtitle')}</p>
      </div>

      <WorkoutInsightsReport state={state} />

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

      {/* Combined Session History + Activity Log */}
      <Card>
        <Tabs defaultValue="activity">
          <CardHeader className="pb-0">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="activity">
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('report.activityLog')}
              </TabsTrigger>
              <TabsTrigger value="sessions">
                <Clock className="h-4 w-4 mr-2" />
                {t('report.sessionHistory')}
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          {/* Activity Log tab */}
          <TabsContent value="activity" className="m-0">
            <CardHeader className="pt-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardDescription>{t('report.subtitle')}</CardDescription>
                <select
                  value={period}
                  onChange={(e) => { setPeriod(parseInt(e.target.value)); setShowAllDates(false) }}
                  className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                >
                  <option value="7">{t('report.period7')}</option>
                  <option value="30">{t('report.period30')}</option>
                  <option value="90">{t('report.period90')}</option>
                  <option value="365">{t('report.periodYear')}</option>
                  <option value="0">{t('report.periodAll')}</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {sortedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Calendar className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-sm font-medium mb-1">{t('report.noActivity')}</p>
                  <p className="text-xs text-muted-foreground text-center">{t('report.noActivityDesc')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {visibleDates.map((date) => {
                      const exercises = groupedByDate[date]
                      const isExpanded = expandedDates.has(date)
                      const [y, m, d] = date.split('-').map(Number)
                      const dateObj = new Date(y, m - 1, d)
                      const formattedDate = dateObj.toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      })

                      return (
                        <div key={date} className="rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleDateExpanded(date)}
                            aria-expanded={isExpanded}
                            className="w-full text-left p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate">{formattedDate}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t('report.completedOnDate', { count: exercises.length })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="text-xs">
                                  {translateWeekday(exercises[0].day)}
                                </Badge>
                                {isExpanded
                                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border/60 p-3 space-y-2">
                              {exercises.map((item) => {
                                const exercise = item.exerciseDetails
                                const completedTime = new Date(item.completedAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit', minute: '2-digit'
                                })
                                return (
                                  <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <CheckCircle className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{item.exerciseName}</p>
                                        {exercise && (
                                          <p className="text-xs text-muted-foreground">
                                            {formatExerciseTarget(exercise)}
                                            {!exercise.isTimeBased && exercise.restTime && ` • ${exercise.restTime}s rest`}
                                          </p>
                                        )}
                                        {(item.sets?.length > 0 || item.weightUsed || item.notes) && (
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatSetsSummary(item.sets) || (item.weightUsed ? `${item.weightUsed} kg` : '')}
                                            {(formatSetsSummary(item.sets) || item.weightUsed) && item.notes ? ' · ' : ''}
                                            {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-2">
                                      <Clock className="h-3 w-3" />
                                      {completedTime}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {sortedDates.length > ACTIVITY_PREVIEW_COUNT && (
                    <button
                      type="button"
                      onClick={() => setShowAllDates((v) => !v)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-dashed"
                    >
                      {showAllDates ? (
                        <><ChevronUp className="h-4 w-4" /> Show less</>
                      ) : (
                        <><ChevronDown className="h-4 w-4" /> Show {sortedDates.length - ACTIVITY_PREVIEW_COUNT} more days</>
                      )}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </TabsContent>

          {/* Session History tab */}
          <TabsContent value="sessions" className="m-0">
            <CardHeader className="pt-3 pb-3">
              <CardDescription>{t('report.sessionHistoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-sm font-medium mb-1">{t('report.noSessions')}</p>
                </div>
              ) : (
                <>
                  <ul className="space-y-2">
                    {sessions.map((session) => (
                      <li
                        key={session.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{translateWeekday(session.day)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {session.date}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="secondary" className="text-xs mb-1">
                            {session.durationLabel}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{session.completionLabel}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {allSessions.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSessions((v) => !v)}
                      className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-dashed"
                    >
                      {showAllSessions ? (
                        <><ChevronUp className="h-4 w-4" /> Show less</>
                      ) : (
                        <><ChevronDown className="h-4 w-4" /> Show {allSessions.length - 3} more</>
                      )}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

export default HistoryTab
