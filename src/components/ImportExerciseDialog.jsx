import { useState } from 'react'
import { FileUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { IMPORT_MODE } from '@/lib/exerciseImport'

const IMPORT_MODE_KEYS = {
  [IMPORT_MODE.APPEND]: 'append',
  [IMPORT_MODE.REPLACE_SCHEDULE]: 'replaceSchedule',
  [IMPORT_MODE.REPLACE_LIBRARY]: 'replaceLibrary',
}

function ImportExerciseDialog({ open, onOpenChange, file, onConfirm }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState(IMPORT_MODE.APPEND)

  const importModeOptions = Object.entries(IMPORT_MODE_KEYS).map(([value, key]) => ({
    value,
    label: t(`importModes.${key}.label`),
    description: t(`importModes.${key}.description`),
  }))

  const handleOpenChange = (next) => {
    if (!next) setMode(IMPORT_MODE.APPEND)
    onOpenChange(next)
  }

  const handleConfirm = () => {
    if (!file) return
    onConfirm(file, mode)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogs.importExercises.title')}</DialogTitle>
          <DialogDescription>
            {file ? (
              <>
                <span className="font-medium text-foreground">{file.name}</span>
                <span className="block mt-1">{t('dialogs.importExercises.chooseMerge')}</span>
              </>
            ) : (
              t('dialogs.importExercises.selectFile')
            )}
          </DialogDescription>
        </DialogHeader>

        {file && (
          <div className="space-y-2">
            {importModeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition-colors',
                  mode === option.value
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={!file}>
            <FileUp className="h-4 w-4 mr-2" />
            {t('dialogs.importExercises.import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportExerciseDialog
