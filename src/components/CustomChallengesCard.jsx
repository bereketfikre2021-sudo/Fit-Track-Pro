import { useState } from 'react'
import { Target, Plus, Trash2, CheckCircle, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  CHALLENGE_TYPES,
  CHALLENGE_PERIODS,
  evaluateChallenge,
} from '@/lib/customChallenges'

function NewChallengeDialog({ onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('sessions')
  const [target, setTarget] = useState('10')
  const [period, setPeriod] = useState('allTime')

  const typeInfo = CHALLENGE_TYPES.find((t) => t.value === type)

  const handleSave = () => {
    if (!title.trim()) { toast.error('Enter a challenge name'); return }
    const t = parseInt(target, 10)
    if (!t || t <= 0) { toast.error('Enter a valid target number'); return }
    onSave({ title: title.trim(), type, target: t, period })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Challenge</DialogTitle>
          <DialogDescription>Set a personal goal to work toward.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Challenge name</label>
            <Input
              placeholder="e.g. Squat 100 kg, 20 sessions this month"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CHALLENGE_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target ({typeInfo?.unit})</label>
              <Input
                type="number"
                min="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CHALLENGE_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4 mr-1.5" />Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              <Plus className="h-4 w-4 mr-1.5" />Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChallengeRow({ challenge, state, onDelete }) {
  const { current, progress, completed } = evaluateChallenge(challenge, state)
  const typeInfo = CHALLENGE_TYPES.find((t) => t.value === challenge.type)
  const periodInfo = CHALLENGE_PERIODS.find((p) => p.value === challenge.period)

  return (
    <div className={cn(
      'rounded-lg border p-3 space-y-2',
      completed ? 'border-primary/40 bg-primary/5' : 'border-border'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {completed && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
            <p className="text-sm font-medium truncate">{challenge.title}</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {typeInfo?.label} · {periodInfo?.label}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={completed ? 'default' : 'secondary'} className="text-xs">
            {current} / {challenge.target} {typeInfo?.unit}
          </Badge>
          <button
            type="button"
            onClick={onDelete}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Delete challenge"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', completed ? 'bg-primary' : 'bg-primary/60')}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-right text-muted-foreground">{progress}%</p>
    </div>
  )
}

function CustomChallengesCard({ state, updateState }) {
  const [adding, setAdding] = useState(false)
  const challenges = state.customChallenges || []

  const handleAdd = (data) => {
    const newChallenge = { ...data, id: Date.now().toString(), createdAt: Date.now(), completedAt: null }
    updateState({ customChallenges: [...challenges, newChallenge] })
    toast.success(`Challenge "${data.title}" created!`)
    setAdding(false)
  }

  const handleDelete = (id) => {
    updateState({ customChallenges: challenges.filter((c) => c.id !== id) })
    toast.success('Challenge removed')
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Custom Challenges
              </CardTitle>
              <CardDescription>Set your own goals and track progress.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Target className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium mb-1">No challenges yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Create a custom goal like "Squat 100 kg" or "Complete 20 sessions this month".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <ChallengeRow
                  key={c.id}
                  challenge={c}
                  state={state}
                  onDelete={() => handleDelete(c.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {adding && (
        <NewChallengeDialog
          onClose={() => setAdding(false)}
          onSave={handleAdd}
        />
      )}
    </>
  )
}

export default CustomChallengesCard
