import { useMemo } from 'react'
import type { Bucket } from '../data/selectors/inventory'
import { formatInr, formatInrFull, formatInt, humanize } from '../data/format'
import { seriesColors } from '../app/theme'
import { Chart } from './ui/Chart'
import { Panel } from './ui/Panel'

/** Horizontal bars of inventory value by one dimension; the tooltip carries the full INR value and material count. */
export function BreakdownChart({ title, buckets, raw = false }: { title: string; buckets: Bucket[]; raw?: boolean }) {
  const option = useMemo(() => {
    const data = [...buckets].reverse()
    return {
      color: seriesColors(),
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (ps: { name: string; value: number; dataIndex: number }[]) => {
          const b = data[ps[0].dataIndex]
          return `${raw ? b.key : humanize(b.key)}<br/>Value: <b>${formatInrFull(b.valueInr)}</b><br/>Materials: <b>${formatInt(b.materials)}</b>`
        },
      },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatInr(v) } },
      yAxis: { type: 'category', data: data.map((b) => (raw ? b.key : humanize(b.key))), axisLabel: { width: 130, overflow: 'truncate' } },
      series: [{ type: 'bar', data: data.map((b) => b.valueInr), barMaxWidth: 18, itemStyle: { borderRadius: [0, 4, 4, 0] } }],
    }
  }, [buckets, raw])
  return (
    <Panel title={title} subtitle="Inventory value (INR); hover for count and full value.">
      <Chart option={option} height="var(--chart-h-sm)" label={`Inventory value by ${title}`} />
    </Panel>
  )
}
