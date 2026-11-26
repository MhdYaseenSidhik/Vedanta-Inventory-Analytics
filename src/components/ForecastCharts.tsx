import { useMemo } from 'react'
import { seriesColors } from '../app/theme'
import { formatMonth, formatQty, humanize } from '../data/format'
import type { Total } from '../data/selectors/forecast'
import { Chart } from './ui/Chart'
import { Panel } from './ui/Panel'

export interface PlantMonth { plantId: string; month: string; predicted: number }

/** Forecast by plant and month (byPlantMonth). It is a mean; there is no band because quantiles cannot be summed. */
export function ForecastByMonthChart({ rows, horizon }: { rows: PlantMonth[]; horizon: number }) {
  const option = useMemo(() => {
    const months = [...new Set(rows.map((r) => r.month))].sort()
    const plants = [...new Set(rows.map((r) => r.plantId))].sort()
    return {
      color: seriesColors(),
      xAxis: { type: 'category', data: months, axisLabel: { formatter: (m: string) => formatMonth(m) } },
      yAxis: { type: 'value', name: 'net consumption qty', axisLabel: { formatter: (v: number) => formatQty(v, '').trim() } },
      tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => formatQty(v as number, 'qty', 0) },
      series: plants.map((p) => ({
        name: p.replace('HZL_', ''),
        type: 'bar',
        barMaxWidth: 36,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: months.map((m) => rows.find((r) => r.plantId === p && r.month === m)?.predicted ?? null),
      })),
    }
  }, [rows])
  return (
    <Panel title={`Forecast by plant and month (next ${horizon} months)`} subtitle="Predicted net consumption quantity (issues 261 minus reversals 262), mean of the forecast. No band here: lower and upper bounds cannot be summed.">
      <Chart option={option} label={`Forecast by plant and month for the next ${horizon} months`} />
    </Panel>
  )
}

/** Sum of predicted over the horizon by material type or group. */
export function ForecastTotalsChart({ title, totals, raw = false }: { title: string; totals: Total[]; raw?: boolean }) {
  const option = useMemo(() => {
    const data = [...totals].reverse()
    const name = (k: string) => (raw ? k : humanize(k))
    return {
      color: seriesColors(),
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (ps: { dataIndex: number }[]) => {
          const t = data[ps[0].dataIndex]
          return `${name(t.key)}<br/>Predicted: <b>${formatQty(t.predicted, 'qty', 0)}</b><br/>Series: <b>${t.series.toLocaleString('en-IN')}</b>`
        },
      },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatQty(v, '').trim() } },
      yAxis: { type: 'category', data: data.map((t) => name(t.key)), axisLabel: { width: 130, overflow: 'truncate' } },
      series: [{ type: 'bar', data: data.map((t) => t.predicted), barMaxWidth: 18, itemStyle: { borderRadius: [0, 4, 4, 0] } }],
    }
  }, [totals, raw])
  return (
    <Panel title={title} subtitle="Summed predicted quantity over the selected horizon (means only).">
      <Chart option={option} height="var(--chart-h-sm)" label={title} />
    </Panel>
  )
}
