import { useMemo } from 'react'
import { seriesColors } from '../app/theme'
import type { Filters } from '../data/filters'
import { formatDecimal, formatMonth, formatQty } from '../data/format'
import { backtestByMonth, backtestError, filterBacktest } from '../data/selectors/forecast'
import type { ForecastHoldoutFile } from '../data/types'
import { Chart } from './ui/Chart'
import { Badge } from './ui/Delta'
import { Notice, Panel } from './ui/Panel'
import { EmptyState } from './ui/States'

/** Backtest: actual vs predicted on held-out months. Always labelled as a backtest, never as a forecast. */
export function BacktestPanel({ data, f }: { data: ForecastHoldoutFile; f: Filters }) {
  const rows = useMemo(() => filterBacktest(data.series, f), [data, f])
  const points = useMemo(() => backtestByMonth(rows), [rows])
  const err = useMemo(() => backtestError(rows), [rows])
  const option = useMemo(() => {
    const c = seriesColors()
    return {
      color: [c[0], c[2]],
      xAxis: { type: 'category', data: points.map((p) => p.month), axisLabel: { formatter: (m: string) => formatMonth(m) } },
      yAxis: { type: 'value', name: 'net consumption qty' },
      tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => formatQty(v as number, 'qty', 0) },
      series: [
        { name: 'Backtest: actual', type: 'line', data: points.map((p) => p.actual), lineStyle: { width: 2.5 }, symbolSize: 6 },
        { name: 'Backtest: predicted', type: 'line', data: points.map((p) => p.predicted), lineStyle: { width: 2.5, type: 'dashed' }, symbolSize: 6 },
      ],
    }
  }, [points])
  const unfiltered = !f.type && !f.group && f.plant === 'ALL' && !f.from && !f.to
  return (
    <Panel
      title={<span className="flex flex-wrap items-center gap-2">Backtest: actual vs predicted <Badge tone="warn">Backtest · not a forecast</Badge></span>}
      subtitle={`Held-out months ${formatMonth(data.series[0]?.month)} to ${formatMonth(data.series.at(-1)?.month)} that the model did not see. Plant HZL_DEMO_01.`}
    >
      {rows.length === 0 ? (
        <EmptyState title="No backtest rows for this selection">The backtest covers plant HZL_DEMO_01 and the months Feb to Dec 2025. Adjust the plant, type, group or month range.</EmptyState>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div><dt className="text-xs text-muted">MAE (series-months)</dt><dd className="text-lg font-semibold">{formatDecimal(unfiltered ? data.error.mae : err.mae, 4)}</dd></div>
            <div><dt className="text-xs text-muted">WAPE</dt><dd className={`text-lg font-semibold ${(unfiltered ? data.error.wape : err.wape ?? 0) > 1 ? 'text-danger' : ''}`}>{formatDecimal(unfiltered ? data.error.wape : err.wape, 4)}</dd></div>
            <div><dt className="text-xs text-muted">Predicted ÷ actual</dt><dd className="text-lg font-semibold">{err.bias === null ? '–' : `${formatDecimal(err.bias, 2)}×`}</dd></div>
            <div><dt className="text-xs text-muted">Series-months</dt><dd className="text-lg font-semibold">{err.n.toLocaleString('en-IN')}</dd></div>
          </dl>
          {(unfiltered ? data.error.wape : err.wape ?? 0) > 1 && (
            <Notice tone="warning">WAPE above 1: on these held-out months the predictions were no better than predicting zero. The sums of predicted quantity sit well under the actuals.</Notice>
          )}
          <Chart option={option} label="Backtest of actual versus predicted net consumption by month" />
          <p className="text-xs text-muted">{data.note} Sums of series values; no band is shown on summed values.</p>
        </div>
      )}
    </Panel>
  )
}
