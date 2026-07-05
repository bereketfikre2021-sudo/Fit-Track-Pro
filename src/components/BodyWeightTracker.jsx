import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Scale, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'sonner'
import {
  addBodyLog,
  getRecentBodyLogs,
  removeBodyLog,
} from '@/lib/bodyLogs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function BodyWeightTracker({ state, updateState }) {
  const { t } = useTranslation()
  const bodyLogs = state.bodyLogs || []
  const targetWeight = state.profile?.targetWeight

  const [date, setDate] = useState(todayStr())
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')

  const recentLogs = useMemo(() => getRecentBodyLogs(bodyLogs, 30), [bodyLogs])

  const chartData = useMemo(() => {
    const labels = recentLogs.map((log) => {
      const d = new Date(log.date)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    })
    const values = recentLogs.map((log) => log.weightKg)

    return {
      labels,
      datasets: [
        {
          label: t('bodyWeight.chartWeight'),
          data: values,
          borderColor: 'hsl(84 81% 44%)',
          backgroundColor: 'hsla(84, 81%, 44%, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        ...(targetWeight
          ? [
              {
                label: t('bodyWeight.chartTarget'),
                data: labels.map(() => parseFloat(targetWeight)),
                borderColor: 'hsla(0, 0%, 100%, 0.25)',
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
              },
            ]
          : []),
      ],
    }
  }, [recentLogs, targetWeight, t])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: !!targetWeight },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: {
          grid: { color: 'hsla(0, 0%, 100%, 0.06)' },
          ticks: { color: 'hsla(0, 0%, 100%, 0.5)', maxTicksLimit: 8 },
        },
        y: {
          grid: { color: 'hsla(0, 0%, 100%, 0.06)' },
          ticks: { color: 'hsla(0, 0%, 100%, 0.5)' },
        },
      },
    }),
    [targetWeight]
  )

  const handleAdd = (e) => {
    e.preventDefault()
    const next = addBodyLog(bodyLogs, { date, weightKg: weight, note })
    if (!next) {
      toast.error(t('bodyWeight.toastInvalid'))
      return
    }

    updateState({
      bodyLogs: next,
      profile: {
        ...state.profile,
        currentWeight: String(parseFloat(weight)),
      },
    })
    setWeight('')
    setNote('')
    toast.success(t('bodyWeight.toastLogged'))
  }

  const handleDelete = (id) => {
    toast(t('bodyWeight.confirmDelete'), {
      action: {
        label: t('common.delete'),
        onClick: () => {
          updateState({ bodyLogs: removeBodyLog(bodyLogs, id) })
          toast.success(t('bodyWeight.toastRemoved'))
        },
      },
      cancel: {
        label: t('common.cancel'),
        onClick: () => {},
      },
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('bodyWeight.date')}</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('bodyWeight.weightKg')}</label>
            <Input
              type="number"
              step="0.1"
              min="1"
              placeholder="e.g. 75"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-xs text-muted-foreground mb-1 block">{t('bodyWeight.note')}</label>
            <Input
              placeholder="Morning weigh-in"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t('bodyWeight.logWeight')}
            </Button>
          </div>
        </form>

        {recentLogs.length > 0 ? (
          <>
            <div className="h-48 sm:h-56 w-full">
              <Line data={chartData} options={chartOptions} />
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('bodyWeight.recent')}
              </p>
              {[...recentLogs].reverse().slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{log.weightKg} kg</span>
                    <span className="text-muted-foreground ml-2">{log.date}</span>
                    {log.note && (
                      <span className="text-muted-foreground ml-2 truncate">· {log.note}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleDelete(log.id)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('bodyWeight.noEntries')}
          </p>
        )}
    </div>
  )
}

export default BodyWeightTracker
