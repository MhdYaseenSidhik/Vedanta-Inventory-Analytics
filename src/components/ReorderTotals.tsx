import type { PriorityTotal, ReorderTotals as Totals } from '../data/selectors/reorder'
import { formatInr, formatInrFull, formatInt, formatQty } from '../data/format'
import { Badge } from './ui/Delta'

function Stat({ k, v, sub, title }: { k: string; v: string; sub?: string; title?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-line/10 bg-surface p-4 shadow-1">
      <dt className="text-sm text-muted">{k}</dt>
      <dd className="mt-1 text-xl font-semibold" title={title}>{v}</dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  )
}

const TONE: Record<string, 'bad' | 'warn' | 'neutral'> = { HIGH: 'bad', MEDIUM: 'warn', LOW: 'neutral' }

/** Totals of the selection, and a priority split that ignores the priority choice itself. */
export function ReorderTotals({ total, byPriority }: { total: Totals; byPriority: PriorityTotal[] }) {
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat k="Recommendations" v={formatInt(total.count)} sub={`${formatInt(total.shutdown)} shutdown-linked`} />
        <Stat k="Recommended quantity" v={formatQty(total.qty)} />
        <Stat k="Estimated value" v={formatInr(total.valueInr)} title={formatInrFull(total.valueInr)} />
        <Stat k="Shutdown-linked" v={formatInt(total.shutdown)} sub="recommendations tied to a planned shutdown" />
      </dl>
      <ul aria-label="Totals by priority" className="flex flex-wrap gap-2 text-sm">
        {byPriority.map((p) => (
          <li key={p.priority} className="flex items-center gap-2 rounded-md border border-line/10 bg-surface px-3 py-1.5">
            <Badge tone={TONE[p.priority] ?? 'neutral'}>{p.priority}</Badge>
            <span>{formatInt(p.count)} · <span title={formatInrFull(p.valueInr)}>{formatInr(p.valueInr)}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
