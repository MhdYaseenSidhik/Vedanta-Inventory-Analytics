import { formatInr, formatInrFull, formatSignedPct, humanize } from '../data/format'
import type { PlanTotals } from '../data/selectors/plan'
import { DataTable, type Col } from './ui/DataTable'
import { Panel } from './ui/Panel'

const cols = (label: string, name: (k: string) => string): Col<PlanTotals>[] => [
  { id: 'key', header: label, width: 200, value: (r) => name(r.key) },
  { id: 'plan', header: 'Plan', width: 120, num: true, value: (r) => r.planValueInr, cell: (r) => formatInr(r.planValueInr), title: (r) => formatInrFull(r.planValueInr) },
  { id: 'po', header: 'PO', width: 120, num: true, value: (r) => r.actualPoValueInr, cell: (r) => formatInr(r.actualPoValueInr), title: (r) => formatInrFull(r.actualPoValueInr) },
  { id: 'gr', header: 'GR', width: 120, num: true, value: (r) => r.actualGrValueInr, cell: (r) => formatInr(r.actualGrValueInr), title: (r) => formatInrFull(r.actualGrValueInr) },
  { id: 'var', header: 'Variance', width: 120, num: true, value: (r) => r.varianceInr, cell: (r) => <span className={r.varianceInr < 0 ? 'text-danger' : 'text-success'}>{formatInr(r.varianceInr)}</span>, title: (r) => formatInrFull(r.varianceInr) },
  { id: 'pct', header: 'Variance %', width: 120, num: true, value: (r) => r.variancePct, cell: (r) => (r.variancePct === null ? <span title="Plan is 0: no percentage">–</span> : formatSignedPct(r.variancePct)) },
]

export function PlanTable({ title, rows, label, nameOf = (k) => k, initialSort }: { title: string; rows: PlanTotals[]; label: string; nameOf?: (k: string) => string; initialSort?: { id: string; desc: boolean }[] }) {
  return (
    <Panel title={title}>
      <DataTable rows={rows} cols={cols(label, nameOf)} rowKey={(r) => r.key} label={title} height="20rem" initialSort={initialSort} />
    </Panel>
  )
}

export { humanize }
