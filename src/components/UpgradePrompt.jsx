/**
 * UpgradePrompt.jsx
 * Inline banner shown when a feature is blocked by the user's subscription tier.
 * Links to /subscription for upgrading.
 *
 * Usage:
 *   <UpgradePrompt feature="AI coaching" />
 *   <UpgradePrompt feature="PDF export" compact />
 */

import { Lock, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * @param {{
 *   feature?: string,
 *   description?: string,
 *   compact?: boolean,
 *   className?: string,
 * }} props
 */
function UpgradePrompt({ feature, description, compact = false, className }) {
  const title = feature ? `${feature} requires a Pro plan` : 'Upgrade to unlock this feature'
  const desc = description ?? 'This feature is not included in your current plan.'

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs', className)}>
        <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-muted-foreground">{title}.</span>
        <Link to="/subscription" className="text-primary font-semibold hover:underline ml-auto shrink-0">Upgrade</Link>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3', className)}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Lock className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </div>
      <Link
        to="/subscription"
        className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
      >
        <Zap className="h-4 w-4" />
        Upgrade Plan
      </Link>
    </div>
  )
}

export default UpgradePrompt
