import { cn } from '../lib/utils'

function PageBackground({
  src,
  overlayClassName = 'bg-background/75',
  imageClassName,
}) {
  if (!src) return null

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none',
          imageClassName
        )}
        style={{ backgroundImage: `url('${src}')` }}
        aria-hidden
      />
      <div
        className={cn('fixed inset-0 z-0 pointer-events-none', overlayClassName)}
        aria-hidden
      />
    </>
  )
}

export default PageBackground
