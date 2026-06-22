import { useState } from 'react'
import { Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { getSessionHistory } from '@/lib/sessionHistory'
import { translateWeekday } from '@/lib/i18nHelpers'

const PREVIEW_COUNT = 3

function SessionHistoryCard({ state }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const allSessions = getSessionHistory(state.completedSessions, { limit: 20 })
  const visible = expanded ? allSessions : allSessions.slice(0, PREVIEW_COUNT)
  const hasMore = allSessions.length > PREVIEW_COUNT

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {t('report.sessionHistory')}
        </CardTitle>
        <CardDescription>{t('report.sessionHistoryDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {allSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
            {t('report.noSessions')}
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {visible.map((session) => (
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

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs text-muted-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    Show {allSessions.length - PREVIEW_COUNT} more
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default SessionHistoryCard
