import { useMemo, useState } from 'react'
import type { KpiCatalogEntry, KpiRow, Plant } from '../data/types'
import { ALL_PLANTS_ID } from '../data/types'
import { formatKpi, formatKpiFull, formatMonth } from '../data/format'
import { kpiMonths, kpiSeries } from '../data/selectors/kpi'
import { seriesColors } from '../app/theme'
import { Chart } from './ui/Chart'
import { Panel } from './ui/Panel'
import { Select } from './ui/Select'

/** One KPI, monthly, one line per plant plus the All plants (portfolio) line. */
export function KpiPlantTrend({ rows, catalog, plants, from, to }: { rows: KpiRow[]; catalog: KpiCatalogEntry[]; plants: Plant[]; from: string; to: string }) {
  const trended = catalog.filter((c) => new Set(rows.filter((r) => r.kpiCode === c.code).map((r) => r.month)).size > 1)
  const [code, setCode] = useState(trended[0]?.code ?? '')
  const entry = catalog.find((c) => c.code === code)
  const option = useMemo(() => {
    if (!entry) return {}
    const months = kpiMonths(rows).filter((m) => (!from || m >= from) && (!to || m <= to))
    const ids = [ALL_PLANTS_ID, ...plants.map((p) => p.plantId)]
    return {
      color: seriesColors(),
      xAxis: { type: 'category', data: months, axisLabel: { formatter: (m: string) => formatMonth(m), hideOverlap: true } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatKpi(v, entry.uom) } },
      tooltip: {
        trigger: 'axis',
        formatter: (ps: { axisValue: string; marker: string; seriesName: string; value: number | null }[]) =>
          `${formatMonth(ps[0].axisValue)}<br/>` + ps.map((p) => `${p.marker} ${p.seriesName}: <b>${formatKpiFull(p.value, entry.uom)}</b>`).join('<br/>'),
      },
      series: ids.map((id) => {
        const s = kpiSeries(rows, entry.code, id)
        return { name: id === ALL_PLANTS_ID ? 'All plants' : id.replace('HZL_', ''), type: 'line', showSymbol: false, lineStyle: { width: id === ALL_PLANTS_ID ? 3 : 1.5 }, data: months.map((m) => s.get(m) ?? null) }
      }),
    }
  }, [entry, rows, plants, from, to])
  return (
    <Panel
      title="Trend by plant"
      subtitle={entry ? `${entry.definition} Direction: ${entry.direction.replace(/_/g, ' ')}.` : undefined}
      actions={<Select label="KPI" value={code} onChange={setCode} options={trended.map((c) => ({ value: c.code, label: c.label }))} className="w-64 max-w-full" />}
    >
      {entry ? <Chart option={option} label={`Monthly ${entry.label} by plant`} /> : null}
    </Panel>
  )
}
