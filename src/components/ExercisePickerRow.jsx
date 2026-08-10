import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'

export default function ExercisePickerRow({
  title,
  subtitle,
  badges = [],
  selected = false,
  disabled = false,
  onClick,
  trailing,
  imageUrl = null,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        disabled && 'opacity-50 cursor-not-allowed',
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary/25'
          : 'border-border/60 bg-background hover:bg-muted/40'
      )}
    >
      {/* Admin-uploaded thumbnail — shown when available */}
      {imageUrl ? (
        <img src={imageUrl} alt={title}
          className="w-8 h-8 rounded-md object-cover shrink-0 border border-border/40" />
      ) : (
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
          )}
          aria-hidden
        >
          {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight truncate">{title}</p>
        {subtitle ? (
          <p className="text-[10px] leading-snug text-muted-foreground truncate mt-0.5">{subtitle}</p>
        ) : null}
      </div>

      {badges.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {badges.map((badge) => (
            <Badge
              key={badge}
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground"
            >
              {badge}
            </Badge>
          ))}
        </div>
      )}

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </button>
  )
}
