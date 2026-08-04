import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getWeeklyCompletedExerciseCount } from '@/lib/stats'
import { getNavTabs, isTabActive } from './navTabs'

function MobileNav({ currentPath, state }) {
  const { t } = useTranslation()
  const location = useLocation()
  const path = currentPath || location.pathname
  const weeklyCompleted = getWeeklyCompletedExerciseCount(state)

  const tabs = getNavTabs(t).map((tab) =>
    tab.id === 'report' ? { ...tab, badge: weeklyCompleted } : tab
  )

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/40 bg-background/90 backdrop-blur-xl"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-1 pb-safe">
        {tabs.map((tab) => {
          const Icon   = tab.icon
          const active = isTabActive(tab, path)

          return (
            <Link
              key={tab.id}
              to={tab.path}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 active:scale-90 flex-1 min-w-0"
            >
              <div className="relative">
                <div className={cn(
                  'p-2 rounded-xl transition-all duration-200',
                  active ? 'bg-primary/15' : ''
                )}>
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-all duration-200',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>

                {tab.badge > 0 && !active && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold leading-none">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>

              <span className={cn(
                'text-[10px] font-medium leading-none transition-colors duration-200 truncate w-full text-center',
                active ? 'text-primary' : 'text-muted-foreground'
              )}>
                {tab.label}
              </span>

              {active && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
