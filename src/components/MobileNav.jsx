import { Dumbbell, BarChart3, UtensilsCrossed, User, ListChecks } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getWeeklyCompletedExerciseCount } from '@/lib/stats'

function MobileNav({ currentPath, state }) {
  const { t } = useTranslation()
  const location = useLocation()
  const path = currentPath || location.pathname
  const weeklyCompleted = getWeeklyCompletedExerciseCount(state)

  const tabs = [
    { id: 'workout', label: t('nav.workout'), icon: Dumbbell, path: '/workout' },
    { id: 'report', label: t('nav.report'), icon: BarChart3, path: '/report', badge: weeklyCompleted },
    { id: 'exercises', label: t('nav.exercises'), icon: ListChecks, path: '/exercises' },
    { id: 'meal', label: t('nav.meals'), icon: UtensilsCrossed, path: '/meal-plan' },
    { id: 'profile', label: t('nav.profile'), icon: User, path: '/profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = path === tab.path || (tab.path === '/profile' && path.startsWith('/profile'))
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 active:scale-95 flex-1 max-w-[72px]"
              )}
            >
              <div className="relative">
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-primary/15 text-primary" 
                    : "text-muted-foreground"
                )}>
                  <Icon 
                    className={cn(
                      "h-5 w-5 transition-all duration-200"
                    )} 
                    strokeWidth={isActive ? 3 : 2.5}
                  />
                </div>
                
                {tab.badge > 0 && !isActive && (
                  <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                    {tab.badge > 9 ? t('nav.badge9') : tab.badge}
                  </div>
                )}
              </div>
              
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
