import { useMemo, useState } from 'react'
import { Trophy, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { getPersonalRecord } from '@/lib/personalRecords'
import { localizedName } from '@/lib/localizedField'

function PersonalRecordsCard({ state }) {
  const [expanded, setExpanded] = useState(false)
  const PREVIEW = 5

  const customExercises = state.customExercises || []
  const completedExercises = state.completedExercises || {}

  // Build PR list — only exercises that have at least one logged set
  const records = useMemo(() => {
    return customExercises
      .map((ex) => {
        const pr = getPersonalRecord(completedExercises, ex.id)
        if (!pr) return null
        return { id: ex.id, name: localizedName(ex), label: pr.label, date: pr.date, muscleGroups: ex.muscleGroups || [] }
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [customExercises, completedExercises])

  const visible = expanded ? records : records.slice(0, PREVIEW)
  const hasMore = records.length > PREVIEW

  if (records.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Personal Records
        </CardTitle>
        <CardDescription>{records.length} exercise{records.length !== 1 ? 's' : ''} with logged PRs</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {visible.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Dumbbell className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{rec.name}</p>
                  {rec.muscleGroups.length > 0 && (
                    <p className="text-[10px] text-muted-foreground truncate">{rec.muscleGroups.slice(0, 3).join(' · ')}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="secondary" className="text-xs font-semibold">{rec.label}</Badge>
                {rec.date && <p className="text-[10px] text-muted-foreground mt-0.5">{rec.date}</p>}
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-dashed"
          >
            {expanded ? (
              <><ChevronUp className="h-4 w-4" /> Show less</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> Show {records.length - PREVIEW} more</>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  )
}

export default PersonalRecordsCard
