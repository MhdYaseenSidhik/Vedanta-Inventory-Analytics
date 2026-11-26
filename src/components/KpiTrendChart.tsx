import { useMemo } from 'react'
import type { KpiRow } from '../data/types'
import { kpiSeries, kpiMonths, kpiPlantId } from '../data/selectors/kpi'
import { formatInr, formatInrFull, formatMonth } from '../data/format'
import { seriesColors } from '../app/theme'
import { Chart } from './ui/Chart'

/** Monthly lines for a set of INR KPIs for one plant (or the ALL_PLANTS portfolio rows). */
export function KpiTrendChart({ rows, codes, labels, plant, from, to }: { rows: KpiRow[]; codes: string[]; labels: string[]; plant: string; from: string; to: string }) {
  const option = useMemo(() => {
    const months = kpiMonths(rows).filter((m) => (!from || m >= from) && (!to || m <= to))
    const colors = seriesColors()
    return {
      color: colors,
      xAxis: { type: 'category', data: months, axisLabel: { formatter: (m: string) => formatMonth(m), hideOverlap: true } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatInr(v) } },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: unknown) => formatInrFull(v as number),
        formatter: (ps: { axisValue: string; marker: string; seriesName: string; value: number }[]) =>
          `${formatMonth(ps[0].axisValue)}<br/>` + ps.map((p) => `${p.marker} ${p.seriesName}: <b>${formatInrFull(p.value)}</b>`).join('<br/>'),
      },
      series: codes.map((code, i) => {
        const s = kpiSeries(rows, code, kpiPlantId(plant))
        return { name: labels[i], type: 'line', showSymbol: false, smooth: false, lineStyle: { width: 2 }, data: months.map((m) => s.get(m) ?? null) }
      }),
    }
  }, [rows, codes, labels, plant, from, to])
  return <Chart option={option} label={`Monthly trend of ${labels.join(', ')}`} />
}
