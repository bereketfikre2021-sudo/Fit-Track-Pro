import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'
import { getWeeklyCompletedExerciseCount } from '@/lib/stats'
import { getNavTabs, isTabActive } from './navTabs'

function DesktopNav({ currentPath, state }) {
  const { t } = useTranslation()
  const location = useLocation()
  const path = currentPath || location.pathname
  const weeklyCompleted = getWeeklyCompletedExerciseCount(state)

  const tabs = getNavTabs(t).map((tab) =>
    tab.id === 'report' ? { ...tab, badge: weeklyCompleted } : tab
  )

  return (
    <nav
      className="hidden md:flex items-center gap-1 border-b border-border/60 bg-background/80 backdrop-blur px-4 py-2"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const Icon   = tab.icon
        const active = isTabActive(tab, path)

        return (
          <Link
            key={tab.id}
            to={tab.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon
              className="h-4 w-4 shrink-0"
              strokeWidth={active ? 2.5 : 2}
            />
            <span>{tab.label}</span>
            {tab.badge > 0 && !active && (
              <Badge
                variant="secondary"
                className="ml-0.5 h-5 min-w-[1.25rem] px-1 text-[10px] font-bold"
              >
                {tab.badge > 99 ? '99+' : tab.badge}
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export default DesktopNav
