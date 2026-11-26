import { useMemo } from 'react'
import { seriesColors } from '../app/theme'
import { formatInr, formatInrFull, formatMonth, humanize } from '../data/format'
import type { PlanTotals } from '../data/selectors/plan'
import { Chart } from './ui/Chart'
import { Panel } from './ui/Panel'

/** Plan, PO and GR value by month (INR). */
export function PlanByMonthChart({ rows }: { rows: PlanTotals[] }) {
  const option = useMemo(() => {
    const c = seriesColors()
    return {
      color: [c[7], c[0], c[1]],
      xAxis: { type: 'category', data: rows.map((r) => r.key), axisLabel: { formatter: (m: string) => formatMonth(m), hideOverlap: true } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatInr(v) } },
      tooltip: {
        trigger: 'axis',
        formatter: (ps: { axisValue: string; marker: string; seriesName: string; value: number }[]) =>
          `${formatMonth(ps[0].axisValue)}<br/>` + ps.map((p) => `${p.marker} ${p.seriesName}: <b>${formatInrFull(p.value)}</b>`).join('<br/>'),
      },
      series: [
        { name: 'Plan', type: 'bar', data: rows.map((r) => r.planValueInr), barMaxWidth: 14 },
        { name: 'PO value', type: 'line', showSymbol: false, lineStyle: { width: 2 }, data: rows.map((r) => r.actualPoValueInr) },
        { name: 'GR value', type: 'line', showSymbol: false, lineStyle: { width: 2 }, data: rows.map((r) => r.actualGrValueInr) },
      ],
    }
  }, [rows])
  return (
    <Panel title="Plan, PO and GR value by month" subtitle="Business plan value against actual purchase-order and goods-receipt value (INR).">
      <Chart option={option} label="Plan, PO and GR value by month" />
    </Panel>
  )
}

/** Variance (plan minus PO) by month; a positive variance is under plan. */
export function VarianceChart({ rows }: { rows: PlanTotals[] }) {
  const option = useMemo(
    () => ({
      color: seriesColors(),
      xAxis: { type: 'category', data: rows.map((r) => r.key), axisLabel: { formatter: (m: string) => formatMonth(m), hideOverlap: true } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatInr(v) } },
      tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => formatInrFull(v as number) },
      legend: { show: false },
      series: [{ name: 'Variance', type: 'bar', barMaxWidth: 14, data: rows.map((r) => r.varianceInr) }],
    }),
    [rows],
  )
  return (
    <Panel title="Variance by month" subtitle="Variance as published in the data (plan minus actual PO value). Positive means PO spend is below plan; negative means above plan.">
      <Chart option={option} height="var(--chart-h-sm)" label="Variance by month" />
    </Panel>
  )
}

export { humanize }
