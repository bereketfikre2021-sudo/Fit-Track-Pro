import { useState } from 'react'
import { Award, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { cn } from '@/lib/utils'
import { getAchievements } from '@/lib/achievements'

function AchievementsCard({ state }) {
  const { t } = useTranslation()
  const [showLocked, setShowLocked] = useState(false)

  const achievements = getAchievements(state)
  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)
  const unlockedCount = unlocked.length

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          {t('report.achievements')}
        </CardTitle>
        <CardDescription>
          {t('achievements.unlocked', { unlocked: unlockedCount, total: achievements.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Unlocked achievements */}
        {unlocked.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
            No achievements unlocked yet. Keep working out!
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {unlocked.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3"
              >
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-primary/15 text-primary">
                  <Award className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Locked toggle */}
        {locked.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowLocked((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-md hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={showLocked}
            >
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                {showLocked
                  ? `Hide locked (${locked.length})`
                  : `Show locked (${locked.length})`}
              </span>
              {showLocked
                ? <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
            </button>

            {showLocked && (
              <div className="grid gap-2 sm:grid-cols-2">
                {locked.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 opacity-60 p-3"
                  >
                    <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default AchievementsCard
