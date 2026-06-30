import { toast } from 'sonner'

/** Show import warnings in the UI (not only console). */
export function showImportWarnings(warnings, { title = 'Import notes' } = {}) {
  if (!warnings?.length) return

  const preview = warnings.slice(0, 4).join('\n')
  const more = warnings.length > 4 ? `\n…and ${warnings.length - 4} more` : ''

  toast.warning(title, {
    description: preview + more,
    duration: 10000,
  })
}
