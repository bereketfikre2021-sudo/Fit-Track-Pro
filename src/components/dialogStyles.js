import { cn } from '@/lib/utils'

/** Near full-viewport dialog — mobile edge-to-edge, large sheet on desktop. */
export const FULLSCREEN_DIALOG_CONTENT_CLASS = cn(
  'flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0',
  '!left-0 !top-0 !translate-x-0 !translate-y-0',
  'sm:!left-[50%] sm:!top-[50%] sm:h-[min(100dvh,900px)] sm:max-h-[95dvh] sm:w-full sm:max-w-2xl',
  'sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:rounded-lg sm:border sm:shadow-lg'
)
