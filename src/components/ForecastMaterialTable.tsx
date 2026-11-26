import { useState } from 'react'
import type { MaterialForecast } from '../data/selectors/forecast'
import { formatDecimal, formatMonth, formatQty } from '../data/format'
import { DataTable, type Col } from './ui/DataTable'
import { Panel } from './ui/Panel'
import { Select } from './ui/Select'
import { EmptyState } from './ui/States'

/** Forecast by material: horizon total, plus the mean and the 10-90% band of one chosen month. */
export function ForecastMaterialTable({ build, months, onOpen }: { build: (month: string) => MaterialForecast[]; months: string[]; onOpen: (id: string, plantId: string) => void }) {
  const [month, setMonth] = useState('')
  const m = months.includes(month) ? month : months[months.length - 1] ?? ''
  const rows = m ? build(m) : []
  const cols: Col<MaterialForecast>[] = [
    { id: 'material', header: 'Material', width: 120, value: (r) => r.materialId },
    { id: 'plant', header: 'Plant', width: 80, value: (r) => r.plantId, cell: (r) => r.plantId.replace('HZL_', '') },
    { id: 'type', header: 'Type', width: 80, value: (r) => r.materialType },
    { id: 'group', header: 'Group', width: 200, value: (r) => r.materialGroup },
    { id: 'total', header: 'Horizon total', width: 130, num: true, value: (r) => r.total, cell: (r) => formatQty(r.total, 'qty', 1) },
    { id: 'pred', header: `Mean ${formatMonth(m)}`, width: 140, num: true, value: (r) => r.predicted, cell: (r) => formatDecimal(r.predicted, 2) },
    { id: 'lower', header: '10% lower', width: 110, num: true, value: (r) => r.lower, cell: (r) => formatDecimal(r.lower, 2) },
    { id: 'upper', header: '90% upper', width: 110, num: true, value: (r) => r.upper, cell: (r) => formatDecimal(r.upper, 2) },
  ]
  return (
    <Panel
      title="Forecast by material"
      subtitle="Mean with its 10–90% band for the month you pick; the horizon total sums the means only. Select a row for the material detail."
      actions={<Select label="Band for month" value={m} onChange={setMonth} options={months.map((x) => ({ value: x, label: formatMonth(x) }))} className="w-40" />}
    >
      <DataTable
        rows={rows}
        cols={cols}
        rowKey={(r) => r.seriesId}
        label="Forecast by material"
        onRowClick={(r) => onOpen(r.materialId, r.plantId)}
        initialSort={[{ id: 'total', desc: true }]}
        empty={<EmptyState title="No materials in this forecast view">Change the material type or group filter.</EmptyState>}
      />
    </Panel>
  )
}
