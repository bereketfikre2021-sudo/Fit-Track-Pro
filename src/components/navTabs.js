/**
 * navTabs.js
 *
 * Single source of truth for navigation tabs used by both
 * MobileNav and DesktopNav. Both render the same items in the
 * same order for full consistency across screen sizes.
 *
 * Tab order: Home · Workout · Library · Meals · Progress
 * Profile is accessible via the header avatar on all screen sizes.
 */

import { Home, Dumbbell, ListChecks, UtensilsCrossed, BarChart3 } from 'lucide-react'

export function getNavTabs(t) {
  return [
    {
      id:    'home',
      label: t('nav.home') || 'Home',
      icon:  Home,
      path:  '/',
      exact: true,
    },
    {
      id:    'workout',
      label: t('nav.workout') || 'Workout',
      icon:  Dumbbell,
      path:  '/workout',
    },
    {
      id:    'exercises',
      label: t('nav.exercises') || 'Library',
      icon:  ListChecks,
      path:  '/exercises',
    },
    {
      id:    'meals',
      label: t('nav.meals') || 'Meals',
      icon:  UtensilsCrossed,
      path:  '/meal-plan',
    },
    {
      id:    'report',
      label: t('nav.report') || 'Progress',
      icon:  BarChart3,
      path:  '/report',
    },
  ]
}

export function isTabActive(tab, path) {
  if (tab.exact) return path === tab.path
  if (tab.path === '/exercises') return path === '/exercises' || path === '/custom'
  if (tab.path === '/report') return path === '/report' || path === '/history'
  return path === tab.path
}
