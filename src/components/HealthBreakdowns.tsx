import type { Filters } from '../data/filters'
import type { InventorySummaryRow } from '../data/types'
import { filterSummary, groupSummary } from '../data/selectors/inventory'
import { formatInr, formatInrFull, formatInt } from '../data/format'
import { BreakdownChart } from './BreakdownChart'
import { EmptyState } from './ui/States'

/** Value and counts by material type, movement class, inventory status, criticality and ABC class. */
export function HealthBreakdowns({ rows, f }: { rows: InventorySummaryRow[]; f: Filters }) {
  const sel = filterSummary(rows, f)
  if (sel.length === 0) return <div className="rounded-md border border-line/10 bg-surface"><EmptyState title="No inventory matches these filters">Widen the plant, material type, group or criticality filter.</EmptyState></div>
  const total = sel.reduce((t, r) => ({ v: t.v + r.valueInr, m: t.m + r.materials }), { v: 0, m: 0 })
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Selection holds <strong className="text-ink" title={formatInrFull(total.v)}>{formatInr(total.v)}</strong> across <strong className="text-ink">{formatInt(total.m)}</strong> material × plant rows.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownChart title="Material type" buckets={groupSummary(sel, 'materialType')} raw />
        <BreakdownChart title="Movement class" buckets={groupSummary(sel, 'movementClass')} />
        <BreakdownChart title="Inventory status" buckets={groupSummary(sel, 'inventoryStatus')} />
        <BreakdownChart title="Criticality" buckets={groupSummary(sel, 'criticality')} />
        <BreakdownChart title="ABC class" buckets={groupSummary(sel, 'abcClass')} raw />
      </div>
    </div>
  )
}
