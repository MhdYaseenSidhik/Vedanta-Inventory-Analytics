import { X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useDataset } from '../app/DataContext'
import { seriesColors } from '../app/theme'
import { formatDate, formatInr, formatInrFull, formatMonth, formatQty, formatDecimal, humanize } from '../data/format'
import type { MaterialRow } from '../data/types'
import { Chart } from './ui/Chart'
import { Badge } from './ui/Delta'
import { Notice } from './ui/Panel'
import { Skeleton } from './ui/States'

function Field({ k, v, title }: { k: string; v: React.ReactNode; title?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="truncate text-sm font-medium" title={title}>{v}</dd>
    </div>
  )
}

/** Material detail dialog: stock, classification, reorder recommendation, backtest series and forecast when present. */
export function MaterialDetail({ m, onClose }: { m: MaterialRow; onClose: () => void }) {
  const reorder = useDataset('reorder')
  const holdout = useDataset('forecast_holdout')
  const forecast = useDataset('forecast')
  const ref = useRef<HTMLDivElement>(null)
  const seriesId = `${m.materialId}|${m.plantId}`

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      prev?.focus()
    }
  }, [onClose])

  const rec = reorder.status === 'ready' ? reorder.data.rows.find((r) => r.materialId === m.materialId && r.plantId === m.plantId) : undefined
  const bt = useMemo(() => (holdout.status === 'ready' ? holdout.data.series.filter((r) => r.seriesId === seriesId) : []), [holdout, seriesId])
  const fc = useMemo(() => (forecast.status === 'ready' && forecast.data.available ? forecast.data.rows.filter((r) => r.seriesId === seriesId) : []), [forecast, seriesId])
  const loading = reorder.status === 'loading' || holdout.status === 'loading' || forecast.status === 'loading'

  const option = useMemo(() => {
    const months = [...new Set([...bt.map((r) => r.month), ...fc.map((r) => r.month)])].sort()
    const c = seriesColors()
    const at = <T extends { month: string }>(rows: T[], pick: (r: T) => number | null) => months.map((mo) => { const r = rows.find((x) => x.month === mo); return r ? pick(r) : null })
    return {
      color: c,
      xAxis: { type: 'category', data: months, axisLabel: { formatter: (v: string) => formatMonth(v), hideOverlap: true } },
      yAxis: { type: 'value', name: 'net consumption qty' },
      series: [
        { name: 'Backtest: actual', type: 'line', data: at(bt, (r) => r.actual), showSymbol: true, lineStyle: { width: 2 } },
        { name: 'Backtest: predicted', type: 'line', data: at(bt, (r) => r.predicted), showSymbol: false, lineStyle: { type: 'dashed', width: 2 } },
        { name: 'Forecast: mean', type: 'line', data: at(fc, (r) => r.predicted), showSymbol: true, lineStyle: { width: 2 } },
        { name: 'Forecast: 10% lower', type: 'line', data: at(fc, (r) => r.lower), showSymbol: false, lineStyle: { width: 1, type: 'dotted' } },
        { name: 'Forecast: 90% upper', type: 'line', data: at(fc, (r) => r.upper), showSymbol: false, lineStyle: { width: 1, type: 'dotted' } },
      ],
    }
  }, [bt, fc])

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/40" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Material ${m.materialId}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-line/15 bg-surface p-4 shadow-3 sm:p-6"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg">{m.materialId} · {m.plantId.replace('HZL_', '')}</h2>
            <p className="text-sm text-muted">{m.description}</p>
          </div>
          <button type="button" className="btn shrink-0" onClick={onClose} aria-label="Close material detail"><X aria-hidden className="h-4 w-4" /></button>
        </header>

        <section className="mt-4" aria-label="Classification">
          <h3 className="mb-2 text-sm text-muted">Classification</h3>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{m.materialType}</Badge>
            <Badge tone={m.criticality === 'VITAL' ? 'bad' : m.criticality === 'ESSENTIAL' ? 'warn' : 'neutral'}>{humanize(m.criticality)}</Badge>
            <Badge>ABC {m.abcClass}</Badge>
            <Badge>XYZ {m.xyzClass}</Badge>
            <Badge>{humanize(m.movementClass)}</Badge>
            <Badge tone={['STOCKOUT', 'CRITICAL_SHORTAGE'].includes(m.inventoryStatus) ? 'bad' : 'info'}>{humanize(m.inventoryStatus)}</Badge>
            <Badge>{humanize(m.materialGroup)}</Badge>
          </div>
        </section>

        <section className="mt-4" aria-label="Stock">
          <h3 className="mb-2 text-sm text-muted">Stock</h3>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field k="Available" v={formatQty(m.availableQty, 'qty', 1)} />
            <Field k="Value" v={formatInr(m.valueInr)} title={formatInrFull(m.valueInr)} />
            <Field k="Days on hand" v={m.daysOnHand >= 9999 ? '9999+ (no consumption)' : formatDecimal(m.daysOnHand, 0)} />
            <Field k="Days since last consumption" v={formatDecimal(m.daysSinceLastConsumption, 0)} />
            <Field k="Safety stock" v={formatQty(m.safetyStockQty, 'qty', 1)} />
            <Field k="Reorder point" v={formatQty(m.reorderPointQty, 'qty', 1)} />
            <Field k="Max stock" v={formatQty(m.maxStockQty, 'qty', 1)} />
            <Field k="Trailing 12m demand" v={formatQty(m.trailing12mDemandQty, 'qty', 0)} />
          </dl>
        </section>

        <section className="mt-4" aria-label="Reorder recommendation">
          <h3 className="mb-2 text-sm text-muted">Reorder recommendation</h3>
          {reorder.status === 'loading' ? <Skeleton className="h-20" /> : rec ? (
            <div className="space-y-2 rounded-md border border-line/10 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={rec.priority === 'HIGH' ? 'bad' : rec.priority === 'MEDIUM' ? 'warn' : 'neutral'}>{rec.priority}</Badge>
                <span className="text-sm">Raise PR by <strong>{formatDate(rec.recommendedPrDate)}</strong> for <strong>{formatQty(rec.recommendedQty)}</strong> ({formatInr(rec.estimatedValueInr)})</span>
                {rec.shutdownId && <Badge tone="info">Shutdown {rec.shutdownId}</Badge>}
              </div>
              <p className="text-xs text-muted">{rec.reason}</p>
            </div>
          ) : <p className="text-sm text-muted">No reorder recommendation for this material and plant.</p>}
        </section>

        <section className="mt-4" aria-label="Backtest and forecast">
          <h3 className="mb-2 text-sm text-muted">Backtest (Feb–Dec 2025) and forecast (Jan–Nov 2026)</h3>
          {loading ? <Skeleton className="h-[var(--chart-h-sm)]" /> : bt.length === 0 && fc.length === 0 ? (
            <Notice>No backtest or forecast for this material: the model covers plant HZL_DEMO_01 only.</Notice>
          ) : (
            <>
              <Chart option={option} height="var(--chart-h-sm)" label={`Backtest and forecast of ${m.materialId}`} />
              <p className="mt-2 text-xs text-muted">The dashed and solid backtest lines are held-out months the model did not see; they are a backtest, not a forecast. The forecast shows its mean and 10–90% band.</p>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
