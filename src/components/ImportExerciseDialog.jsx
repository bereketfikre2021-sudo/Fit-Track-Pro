import { FileUp, AlertTriangle } from 'lucide-react'
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
import { IMPORT_MODE } from '@/lib/exerciseImport'

function ImportExerciseDialog({ open, onOpenChange, file, onConfirm }) {
  const { t } = useTranslation()

  const handleConfirm = () => {
    if (!file) return
    // Always replace — no mode picker needed
    onConfirm(file, IMPORT_MODE.REPLACE_LIBRARY)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogs.importExercises.title')}</DialogTitle>
          {file && (
            <DialogDescription>
              <span className="font-medium text-foreground">{file.name}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Warning banner */}
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-400 leading-snug">
            <p className="font-semibold">This will replace your entire exercise library.</p>
            <p className="text-amber-400/80 mt-0.5 text-xs">
              All current exercises and schedule assignments will be removed and replaced with the ones in the file. This cannot be undone.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={!file}>
            <FileUp className="h-4 w-4 mr-2" />
            Replace &amp; Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportExerciseDialog
