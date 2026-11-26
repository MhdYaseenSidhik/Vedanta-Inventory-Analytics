import { AlertOctagon } from 'lucide-react'
import { useDataset } from '../app/DataContext'
import { useRoute } from '../app/url'
import type { Filters } from '../data/filters'
import { formatDate, formatInr, formatInrFull, formatInt } from '../data/format'
import { filterReorder, topAlerts, reorderTotals } from '../data/selectors/reorder'
import { filterSummary } from '../data/selectors/inventory'
import { Badge } from './ui/Delta'
import { Panel } from './ui/Panel'
import { EmptyState, Gate } from './ui/States'

const SHORT = new Set(['STOCKOUT', 'CRITICAL_SHORTAGE'])

/** Top alerts: VITAL stockouts / critical shortages (inventory_summary) and HIGH-priority reorders of VITAL spares (reorder). */
export function AlertsPanel({ f }: { f: Filters }) {
  const summary = useDataset('inventory_summary')
  const reorder = useDataset('reorder')
  const [, go] = useRoute()
  return (
    <Panel title="Top alerts" subtitle="VITAL spares with stockouts and the earliest high-priority reorders. Follows the plant, type and group filters.">
      <Gate state={summary}>
        {(s) => (
          <Gate state={reorder}>
            {(r) => {
              const vitalFilter = { ...f, crit: 'VITAL' }
              const vital = filterSummary(s.rows, vitalFilter)
              const stockout = vital.filter((x) => x.inventoryStatus === 'STOCKOUT').reduce((a, x) => a + x.materials, 0)
              const shortage = vital.filter((x) => x.inventoryStatus === 'CRITICAL_SHORTAGE').reduce((a, x) => a + x.materials, 0)
              const high = filterReorder(r.rows, { ...f, crit: 'VITAL' }, { priority: 'HIGH', shutdownOnly: false })
              const alerts = topAlerts(filterReorder(r.rows, f, { priority: '', shutdownOnly: false }))
              const tot = reorderTotals(high)
              const shortCount = vital.filter((x) => SHORT.has(x.inventoryStatus)).reduce((a, x) => a + x.materials, 0)
              if (f.crit && f.crit !== 'VITAL') return <EmptyState title="Alerts cover VITAL spares">The criticality filter is set to another class, so there are no VITAL alerts in this view.</EmptyState>
              if (shortCount === 0 && alerts.length === 0) return <EmptyState title="No VITAL alerts for this selection">No VITAL stockouts and no high-priority reorders match the filters.</EmptyState>
              return (
                <div className="space-y-4">
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-md bg-danger-soft p-3">
                      <dt className="text-xs text-muted">VITAL stockouts</dt>
                      <dd className="text-lg font-semibold text-danger">{formatInt(stockout)}</dd>
                      <dd className="text-xs text-muted">material × plant rows</dd>
                    </div>
                    <div className="rounded-md bg-warning-soft p-3">
                      <dt className="text-xs text-muted">VITAL critical shortages</dt>
                      <dd className="text-lg font-semibold text-warning">{formatInt(shortage)}</dd>
                      <dd className="text-xs text-muted">material × plant rows</dd>
                    </div>
                    <div className="rounded-md bg-sunken p-3">
                      <dt className="text-xs text-muted">HIGH-priority VITAL reorders</dt>
                      <dd className="text-lg font-semibold" title={formatInrFull(tot.valueInr)}>{formatInt(tot.count)}</dd>
                      <dd className="text-xs text-muted">worth {formatInr(tot.valueInr)}</dd>
                    </div>
                  </dl>
                  <ul className="divide-y divide-line/10 rounded-md border border-line/10">
                    {alerts.map((a) => (
                      <li key={a.recommendationId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                        <AlertOctagon aria-hidden className="h-4 w-4 shrink-0 text-danger" />
                        <span className="font-medium">{a.materialId}</span>
                        <span className="text-muted">{a.plantId.replace('HZL_', '')}</span>
                        <Badge tone="bad">HIGH · VITAL</Badge>
                        <span className="text-muted">PR by {formatDate(a.recommendedPrDate)}</span>
                        <span className="ml-auto num" title={formatInrFull(a.estimatedValueInr)}>{formatInr(a.estimatedValueInr)}</span>
                      </li>
                    ))}
                    {alerts.length === 0 && <li className="px-3 py-2 text-muted">No HIGH-priority reorders of VITAL spares for this selection.</li>}
                  </ul>
                  <button type="button" className="btn" onClick={() => go('replenishment')}>
                    Open replenishment
                  </button>
                </div>
              )
            }}
          </Gate>
        )}
      </Gate>
    </Panel>
  )
}
