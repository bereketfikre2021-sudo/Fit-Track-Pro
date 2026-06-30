import { BACKGROUND_TOP } from '../lib/backgrounds'
import { cn } from '../lib/utils'

function PageTopBanner({ src = BACKGROUND_TOP, className }) {
  return (
    <div
      className={cn(
        'relative w-full h-36 sm:h-44 md:h-52 bg-cover bg-center bg-no-repeat',
        className
      )}
      style={{ backgroundImage: `url('${src}')` }}
      role="img"
      aria-label=""
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background pointer-events-none"
        aria-hidden
      />
    </div>
  )
}

export default PageTopBanner
