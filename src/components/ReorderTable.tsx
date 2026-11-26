import type { ReorderRow } from '../data/types'
import { formatDate, formatInr, formatInrFull, formatQty, humanize } from '../data/format'
import { PRIORITY_ORDER } from '../data/selectors/reorder'
import { Badge } from './ui/Delta'
import { DataTable, type Col } from './ui/DataTable'

const TONE: Record<string, 'bad' | 'warn' | 'neutral'> = { HIGH: 'bad', MEDIUM: 'warn', LOW: 'neutral' }

const cols: Col<ReorderRow>[] = [
  { id: 'priority', header: 'Priority', width: 100, value: (r) => PRIORITY_ORDER[r.priority] ?? 9, cell: (r) => <Badge tone={TONE[r.priority] ?? 'neutral'}>{r.priority}</Badge> },
  { id: 'material', header: 'Material', width: 120, value: (r) => r.materialId },
  { id: 'plant', header: 'Plant', width: 80, value: (r) => r.plantId, cell: (r) => r.plantId.replace('HZL_', '') },
  { id: 'type', header: 'Type', width: 80, value: (r) => r.materialType },
  { id: 'crit', header: 'Criticality', width: 110, value: (r) => r.criticality, cell: (r) => humanize(r.criticality) },
  { id: 'date', header: 'PR date', width: 120, value: (r) => r.recommendedPrDate, cell: (r) => formatDate(r.recommendedPrDate) },
  { id: 'qty', header: 'Qty', width: 90, num: true, value: (r) => r.recommendedQty, cell: (r) => formatQty(r.recommendedQty) },
  { id: 'value', header: 'Value', width: 120, num: true, value: (r) => r.estimatedValueInr, cell: (r) => formatInr(r.estimatedValueInr), title: (r) => formatInrFull(r.estimatedValueInr) },
  { id: 'shutdown', header: 'Shutdown', width: 110, value: (r) => r.shutdownId ?? '', cell: (r) => (r.shutdownId ? <Badge tone="info">{r.shutdownId}</Badge> : <span className="text-subtle">–</span>) },
  { id: 'reason', header: 'Reason', width: 420, value: (r) => r.reason, title: (r) => r.reason },
]

export function ReorderTable({ rows, empty }: { rows: ReorderRow[]; empty: React.ReactNode }) {
  return <DataTable rows={rows} cols={cols} rowKey={(r) => r.recommendationId} label="Reorder recommendations" empty={empty} height="32rem" />
}
