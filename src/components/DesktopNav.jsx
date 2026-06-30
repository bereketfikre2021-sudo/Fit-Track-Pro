import { Dumbbell, BarChart3, Settings, User, UtensilsCrossed, ListChecks } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'
import { getWeeklyCompletedExerciseCount } from '@/lib/stats'

function DesktopNav({ currentPath, state }) {
  const { t } = useTranslation()
  const location = useLocation()
  const path = currentPath || location.pathname
  const weeklyCompleted = getWeeklyCompletedExerciseCount(state)

  const tabs = [
    { id: 'workout', label: t('nav.workout'), icon: Dumbbell, path: '/workout' },
    { id: 'report', label: t('nav.report'), icon: BarChart3, path: '/report', badge: weeklyCompleted },
    { id: 'exercises', label: t('nav.exercises'), icon: ListChecks, path: '/exercises' },
    { id: 'meal', label: t('nav.mealPlan'), icon: UtensilsCrossed, path: '/meal-plan' },
    { id: 'profile', label: t('nav.profile'), icon: User, path: '/profile' },
    { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/profile/settings' },
  ]

  return (
    <nav className="hidden md:flex items-center gap-2 border-b border-border bg-card/50 backdrop-blur-xl px-6 py-3">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = path === tab.path || (tab.path === '/profile' && path.startsWith('/profile'))
        return (
          <Link
            key={tab.id}
            to={tab.path}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              "hover:scale-105 active:scale-95",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className={cn(
              "h-4 w-4 transition-all",
              isActive && "scale-110"
            )} 
            strokeWidth={isActive ? 2.5 : 2}
            />
            {tab.label}
            {tab.badge > 0 && !isActive && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {tab.badge > 99 ? t('nav.badge99') : tab.badge}
              </Badge>
            )}
            {isActive && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export default DesktopNav
