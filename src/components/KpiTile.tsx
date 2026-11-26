import { Info } from 'lucide-react'
import type { KpiSummary } from '../data/selectors/kpi'
import { formatKpi, formatKpiFull, formatMonth, uomLabel } from '../data/format'
import { Delta } from './ui/Delta'
import { Sparkline } from './ui/Sparkline'

/** One KPI: value, unit, definition, as-of month, change vs prior month (and year), trend. */
export function KpiTile({ s, asOf, compact = false }: { s: KpiSummary; asOf: string; compact?: boolean }) {
  const { entry } = s
  const title = `${entry.definition} Unit: ${uomLabel(entry.uom)}. As of ${asOf}.${s.value !== null ? ` Full value: ${formatKpiFull(s.value, entry.uom)}.` : ''}`
  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-md border border-line/10 bg-surface p-4 shadow-1" aria-label={entry.label}>
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-muted">{entry.label}</h3>
        <span title={title} className="shrink-0 text-subtle" tabIndex={0} role="img" aria-label={`Definition: ${entry.definition}`}>
          <Info aria-hidden className="h-4 w-4" />
        </span>
      </header>
      <p className="text-xl font-semibold text-ink" title={formatKpiFull(s.value, entry.uom)}>
        {s.value === null ? <span className="text-subtle">No data</span> : formatKpi(s.value, entry.uom)}
      </p>
      {!compact && <p className="line-clamp-2 min-h-[2.5rem] text-xs text-muted">{entry.definition}</p>}
      <div className="flex flex-col gap-0.5">
        <Delta pct={s.momPct} tone={s.momTone} label="vs prior month" />
        {!compact && <Delta pct={s.yoyPct} tone={s.yoyTone} label="vs same month last year" />}
      </div>
      <Sparkline points={s.trend.map((t) => t.value)} tone={s.momTone} />
      <footer className="text-xs text-subtle">
        {uomLabel(entry.uom)} · {formatMonth(s.month)}
      </footer>
    </article>
  )
}
