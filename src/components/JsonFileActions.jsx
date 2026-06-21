import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

/**
 * Template, export, and import controls for JSON data — kept on one row.
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
  const { t } = useTranslation()
  const importInputRef = useRef(null)
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
    <div
      className={cn(
        'inline-flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto',
        className
      )}
      role="group"
      aria-label={t('common.jsonFileActions')}
    >
      {showTemplate && onTemplate && (
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={onTemplate}
          className="shrink-0"
          title={templateText}
        >
          <Download className="h-4 w-4 shrink-0 sm:mr-1" />
          <span className="whitespace-nowrap">{templateText}</span>
        </Button>
      )}
      {showExport && onExport && (
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={onExport}
          className="shrink-0"
          title={exportText}
        >
          <Download className="h-4 w-4 shrink-0 sm:mr-1" />
          <span className="whitespace-nowrap">{exportText}</span>
        </Button>
      )}
      {onImportFileSelected && (
        <>
          <Button
            type="button"
            variant="outline"
            size={size}
            onClick={handleImportClick}
            className="shrink-0"
            title={importText}
          >
            <Upload className="h-4 w-4 shrink-0 sm:mr-1" />
            <span className="whitespace-nowrap">{importText}</span>
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept={accept}
            onChange={handleImportChange}
            className="hidden"
            tabIndex={-1}
            aria-hidden
          />
        </>
      )}
    </div>
  )
}

export default JsonFileActions
