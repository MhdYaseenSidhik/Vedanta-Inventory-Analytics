import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { token, useThemeVersion } from '../../app/theme'

/** ECharts wrapper that reads colours from the design tokens and re-reads them on theme change. */
// Options are built by small per-chart objects; the wrapper takes them loosely and hands ECharts the typed result.
export type ChartOption = Record<string, unknown>

export function Chart({ option, height = 'var(--chart-h)', label }: { option: ChartOption; height?: string; label: string }) {
  const v = useThemeVersion()
  const themed = useMemo<EChartsOption>(() => {
    const opt = option as EChartsOption
    const text = token('muted')
    const grid = token('line', 0.12)
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-sans') || 'sans-serif', color: text },
      animationDuration: 180,
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: token('raised'),
        borderColor: token('line', 0.2),
        textStyle: { color: token('ink'), fontSize: 12 },
      },
      legend: { top: 0, textStyle: { color: text, fontSize: 12 }, itemWidth: 12, itemHeight: 8, type: 'scroll' },
      ...opt,
      // axis colouring applied on top of the caller's axes
      xAxis: tint(opt.xAxis, text, grid),
      yAxis: tint(opt.yAxis, text, grid),
    } as EChartsOption
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option, v])
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full min-w-0">
      <ReactECharts key={v} option={themed} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate opts={{ renderer: 'canvas' }} />
    </div>
  )
}

function tint(axis: unknown, text: string, grid: string): unknown {
  const one = (a: Record<string, unknown>) => ({
    ...a,
    axisLabel: { color: text, fontSize: 12, ...((a.axisLabel as object) ?? {}) },
    axisLine: { lineStyle: { color: grid } },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: grid } },
    nameTextStyle: { color: text },
  })
  if (!axis) return axis
  return Array.isArray(axis) ? axis.map(one) : one(axis as Record<string, unknown>)
}
