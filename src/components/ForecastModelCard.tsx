import { useCore } from '../app/DataContext'
import { formatDate, formatDecimal, formatMonth } from '../data/format'
import { Notice, Panel } from './ui/Panel'

function Item({ k, v, title }: { k: string; v: React.ReactNode; title?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="truncate text-sm font-medium" title={title}>{v}</dd>
    </div>
  )
}

/** Model, its metric and the backtest error from manifest.json, with the visible WAPE-above-1 note. */
export function ForecastModelCard() {
  const { manifest } = useCore()
  const m = manifest.forecast
  if (!m) return null
  const poor = m.backtestError.wape > 1
  return (
    <div className="space-y-3">
      {poor && (
        <Notice tone="warning" title={`Backtest WAPE is ${formatDecimal(m.backtestError.wape, 4)}, above 1`}>
          A WAPE above 1 means the model did no better than predicting zero on the held-out months, and it under-forecast: the summed backtest prediction is about 0.52× the summed actual. Treat the forecast below as indicative only, not as a basis for ordering.
        </Notice>
      )}
      <Panel title="Model" subtitle="From manifest.json. Trained on plant HZL_DEMO_01 only (ZSPR and ZSPN, 5,960 material series).">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Item k="Best model" v={m.bestModel} />
          <Item k={`Validation ${m.metric.name} (internal)`} v={formatDecimal(m.metric.value, 3)} title="Context Flow's internal validation metric; the held-out backtest is far worse." />
          <Item k="Backtest MAE" v={formatDecimal(m.backtestError.mae, 4)} />
          <Item k="Backtest WAPE" v={<span className={poor ? 'text-danger' : ''}>{formatDecimal(m.backtestError.wape, 4)}</span>} />
          <Item k="Forecast months" v={`${formatMonth(m.forecastFrom)} to ${formatMonth(m.forecastTo)}`} />
          <Item k="Prediction length" v={`${m.predictionLength} months`} />
          <Item k="Experiment" v={m.experimentId} title={m.experimentId} />
          <Item k="Trained" v={formatDate(m.experimentCreatedAt.slice(0, 10))} />
        </dl>
        <details className="mt-3 text-sm">
          <summary className="flex min-h-control cursor-pointer items-center rounded-sm text-accent transition-colors hover:text-ink">Model quality notes (generalization verdict: {m.verdict.split(' ')[0]})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {m.verdictReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      </Panel>
    </div>
  )
}
