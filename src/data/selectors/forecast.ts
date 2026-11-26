import type { BacktestRow, ForecastFile, ForecastRow } from '../types'
import { inRange, type Filters } from '../filters'

/** Only horizons the file lists; with no forecast the list is empty. */
export function availableHorizons(f: ForecastFile | null | undefined): number[] {
  return f && f.available ? [...f.horizons].sort((a, b) => a - b) : []
}

/** The forecast covers the plants in its rows only (HZL_DEMO_01 today). */
export function forecastPlants(f: ForecastFile): string[] {
  return [...new Set(f.rows.map((r) => r.plantId))].sort()
}

type Scope = Pick<Filters, 'plant' | 'type' | 'group'>

const inScope = (r: { plantId: string; materialType: string; materialGroup: string }, s: Scope) =>
  (s.plant === 'ALL' || r.plantId === s.plant) && (!s.type || r.materialType === s.type) && (!s.group || r.materialGroup === s.group)

/** Rows of the 3 / 6 / 11-month view: horizon up to `h`, in scope. */
export function forecastRows(rows: ForecastRow[], h: number, s: Scope): ForecastRow[] {
  return rows.filter((r) => r.horizon <= h && inScope(r, s))
}

export interface MonthPoint { month: string; predicted: number }

/** Sum of predicted per month. Bounds are never summed. */
export function sumByMonth(rows: Pick<ForecastRow, 'month' | 'predicted'>[]): MonthPoint[] {
  const m = new Map<string, number>()
  for (const r of rows) m.set(r.month, (m.get(r.month) ?? 0) + r.predicted)
  return [...m.entries()].map(([month, predicted]) => ({ month, predicted })).sort((a, b) => a.month.localeCompare(b.month))
}

/** Per plant and month: from byPlantMonth when no type/group filter is set, else summed from rows. */
export function byPlantMonth(f: ForecastFile, h: number, s: Scope): { plantId: string; month: string; predicted: number }[] {
  if (!s.type && !s.group) {
    return f.byPlantMonth.filter((r) => r.horizon <= h && (s.plant === 'ALL' || r.plantId === s.plant)).map(({ plantId, month, predicted }) => ({ plantId, month, predicted }))
  }
  const m = new Map<string, { plantId: string; month: string; predicted: number }>()
  for (const r of forecastRows(f.rows, h, s)) {
    const k = `${r.plantId}|${r.month}`
    const e = m.get(k) ?? { plantId: r.plantId, month: r.month, predicted: 0 }
    e.predicted += r.predicted
    m.set(k, e)
  }
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export interface Total { key: string; predicted: number; series: number }

/** Sum of predicted over the horizon by material type or material group. */
export function totalsBy(rows: ForecastRow[], dim: 'materialType' | 'materialGroup'): Total[] {
  const m = new Map<string, Total & { ids: Set<string> }>()
  for (const r of rows) {
    const k = r[dim]
    const t = m.get(k) ?? { key: k, predicted: 0, series: 0, ids: new Set<string>() }
    t.predicted += r.predicted
    t.ids.add(r.seriesId)
    m.set(k, t)
  }
  return [...m.values()].map((t) => ({ key: t.key, predicted: t.predicted, series: t.ids.size })).sort((a, b) => b.predicted - a.predicted)
}

export interface MaterialForecast {
  seriesId: string
  materialId: string
  plantId: string
  materialGroup: string
  materialType: string
  total: number // sum of predicted over the horizon
  month: string
  predicted: number
  lower: number | null
  upper: number | null
}

/** One row per material: horizon total of predicted, plus the selected month's mean and 10-90% band. */
export function byMaterial(rows: ForecastRow[], month: string): MaterialForecast[] {
  const m = new Map<string, MaterialForecast>()
  for (const r of rows) {
    const e = m.get(r.seriesId) ?? { seriesId: r.seriesId, materialId: r.materialId, plantId: r.plantId, materialGroup: r.materialGroup, materialType: r.materialType, total: 0, month, predicted: 0, lower: null, upper: null }
    e.total += r.predicted
    if (r.month === month) {
      e.predicted = r.predicted
      e.lower = r.lower
      e.upper = r.upper
    }
    m.set(r.seriesId, e)
  }
  return [...m.values()].sort((a, b) => b.total - a.total)
}

export function monthsOf(rows: { month: string }[]): string[] {
  return [...new Set(rows.map((r) => r.month))].sort()
}

/* ---- backtest (held-out months, never called a forecast) ---- */

export interface BacktestPoint { month: string; actual: number; predicted: number }

export function filterBacktest(rows: BacktestRow[], f: Filters): BacktestRow[] {
  return rows.filter((r) => inScope(r, f) && inRange(r.month, f.from, f.to))
}

export function backtestByMonth(rows: Pick<BacktestRow, 'month' | 'actual' | 'predicted'>[]): BacktestPoint[] {
  const m = new Map<string, BacktestPoint>()
  for (const r of rows) {
    const e = m.get(r.month) ?? { month: r.month, actual: 0, predicted: 0 }
    e.actual += r.actual
    e.predicted += r.predicted
    m.set(r.month, e)
  }
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export interface BacktestError { mae: number; wape: number | null; bias: number | null; n: number }

/** MAE over series-months and WAPE = sum|error| / sum|actual| (null when actual sums to 0). */
export function backtestError(rows: Pick<BacktestRow, 'actual' | 'predicted'>[]): BacktestError {
  let abs = 0
  let act = 0
  let pred = 0
  for (const r of rows) {
    abs += Math.abs(r.actual - r.predicted)
    act += Math.abs(r.actual)
    pred += r.predicted
  }
  const n = rows.length
  return { mae: n ? abs / n : 0, wape: act === 0 ? null : abs / act, bias: act === 0 ? null : pred / act, n }
}
