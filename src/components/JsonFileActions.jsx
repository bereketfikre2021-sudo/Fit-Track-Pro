import { useRef, useState, useEffect } from 'react'
import { Download, Upload, FileJson, ChevronDown, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { useSubscription } from '@/lib/useSubscription'

/**
 * Template, export, and import controls collapsed under a single "JSON" toggle button.
 * Export and import require `features.export` — free-tier users see a lock and upgrade prompt.
 */
function JsonFileActions({
  onTemplate,
  onExport,
  onImportFileSelected,
  showTemplate = true,
  showExport = true,
  templateLabel,
  exportLabel,
  importLabel,
  accept = '.json,application/json',
  className,
  size = 'sm',
}) {
  const { features } = useSubscription()
  const { t } = useTranslation()
  const importInputRef = useRef(null)
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const canExport = features.export

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const templateText = templateLabel ?? t('common.jsonTemplate')
  const exportText = exportLabel ?? t('common.jsonExport')
  const importText = importLabel ?? t('common.jsonImport')

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportChange = (e) => {
    onImportFileSelected?.(e)
    e.target.value = ''
  }

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      {/* Toggle button */}
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="JSON file actions"
        className="gap-1.5"
      >
        <FileJson className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">JSON</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </Button>

      {/* Expanded actions */}
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1.5 flex flex-col gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-lg min-w-[130px]">
          {showTemplate && onTemplate && (
            <Button
              type="button"
              variant="ghost"
              size={size}
              onClick={() => { onTemplate(); setOpen(false) }}
              className="justify-start gap-2 w-full"
              title={templateText}
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{templateText}</span>
            </Button>
          )}
          {showExport && onExport && (
            <Button
              type="button"
              variant="ghost"
              size={size}
              onClick={() => {
                if (!canExport) {
                  toast.error('Export requires a Pro subscription or higher. Upgrade in Settings → Subscription.')
                  setOpen(false)
                  return
                }
                onExport(); setOpen(false)
              }}
              className={cn('justify-start gap-2 w-full', !canExport && 'opacity-70')}
              title={!canExport ? 'Upgrade to Pro to export' : exportText}
            >
              {!canExport ? <Lock className="h-4 w-4 shrink-0" /> : <Download className="h-4 w-4 shrink-0" />}
              <span className="whitespace-nowrap">{exportText}</span>
            </Button>
          )}
          {onImportFileSelected && (
            <Button
              type="button"
              variant="ghost"
              size={size}
              onClick={() => {
                if (!canExport) {
                  toast.error('Import requires a Pro subscription or higher. Upgrade in Settings → Subscription.')
                  setOpen(false)
                  return
                }
                handleImportClick(); setOpen(false)
              }}
              className={cn('justify-start gap-2 w-full', !canExport && 'opacity-70')}
              title={!canExport ? 'Upgrade to Pro to import' : importText}
            >
              {!canExport ? <Lock className="h-4 w-4 shrink-0" /> : <Upload className="h-4 w-4 shrink-0" />}
              <span className="whitespace-nowrap">{importText}</span>
            </Button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      {onImportFileSelected && (
        <input
          ref={importInputRef}
          type="file"
          accept={accept}
          onChange={handleImportChange}
          className="hidden"
          tabIndex={-1}
          aria-hidden
        />
      )}
    </div>
  )
}

export default JsonFileActions
