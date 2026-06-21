import {
  Activity,
  Dumbbell,
  Flame,
  HeartPulse,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FLOATING_ITEMS = [
  { Icon: Dumbbell, wrap: 'top-[30%] left-[10%]', icon: 'h-12 w-12 rotate-12', delay: '0s' },
  { Icon: Timer, wrap: 'top-[48%] right-[12%]', icon: 'h-9 w-9 -rotate-6', delay: '1.2s' },
  { Icon: Trophy, wrap: 'top-[62%] left-[22%]', icon: 'h-10 w-10 -rotate-12', delay: '2.4s' },
  { Icon: Activity, wrap: 'top-[38%] right-[28%]', icon: 'h-8 w-8 rotate-6', delay: '0.8s' },
  { Icon: Flame, wrap: 'top-[72%] right-[20%]', icon: 'h-11 w-11 rotate-3', delay: '1.8s' },
  { Icon: HeartPulse, wrap: 'top-[55%] left-[6%]', icon: 'h-8 w-8 -rotate-3', delay: '3s' },
  { Icon: Zap, wrap: 'top-[78%] left-[38%]', icon: 'h-9 w-9 -rotate-[8deg]', delay: '2s' },
  { Icon: Dumbbell, wrap: 'top-[42%] left-[42%]', icon: 'h-7 w-7 rotate-45 opacity-60', delay: '1.5s' },
  { Icon: Timer, wrap: 'top-[68%] right-[38%]', icon: 'h-7 w-7 -rotate-12 opacity-60', delay: '2.8s' },
]

function GymFloatingPattern({ className }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden select-none',
        className
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.14) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)',
        }}
      />
      {FLOATING_ITEMS.map(({ Icon, wrap, icon, delay }, index) => (
        <div
          key={index}
          className={cn('absolute animate-gym-float', wrap)}
          style={{ animationDelay: delay }}
        >
          <Icon className={cn('text-primary/20', icon)} />
        </div>
      ))}
    </div>
  )
}

export default GymFloatingPattern
