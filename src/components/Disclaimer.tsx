import { Info } from 'lucide-react'
import { useCore } from '../app/DataContext'
import { formatDate } from '../data/format'

/** Shown on every screen: manifest disclaimer and the as-of date. */
export function Disclaimer() {
  const { manifest } = useCore()
  return (
    <aside aria-label="Disclaimer" className="mt-8 flex items-start gap-2 rounded-md border border-line/10 bg-sunken px-4 py-3 text-xs text-muted">
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {manifest.disclaimer} <span className="whitespace-nowrap">Data as of {formatDate(manifest.asOf)}</span>
        {manifest.backcastIncluded ? ' · 2023 is a simulated backcast year.' : ''}
      </p>
    </aside>
  )
}

/** Says plainly that KPI values are per plant and ignore the material filters. */
export function KpiFilterNote({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p role="note" className="mb-4 rounded-md border border-info/30 bg-info-soft px-4 py-2 text-sm text-ink">
      KPI values come from the source per plant and are not filtered by material type, group or criticality. They follow the plant and month filters only.
    </p>
  )
}
