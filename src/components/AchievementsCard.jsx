import { Award, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { cn } from '@/lib/utils'
import { getAchievements } from '@/lib/achievements'

function AchievementsCard({ state }) {
  const { t } = useTranslation()
  const achievements = getAchievements(state)
  const unlockedCount = achievements.filter((a) => a.unlocked).length

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
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {achievements.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3',
                item.unlocked
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-muted/20 opacity-75'
              )}
            >
              <div
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                  item.unlocked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {item.unlocked ? (
                  <Award className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default AchievementsCard
