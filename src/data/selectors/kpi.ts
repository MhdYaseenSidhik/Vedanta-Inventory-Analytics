import { ALL, ALL_PLANTS_ID, type Direction, type KpiCatalogEntry, type KpiRow } from '../types'
import { shiftMonth } from '../filters'

/** The All plants view uses the ALL_PLANTS rows of the source; plants are never summed for a KPI. */
export function kpiPlantId(plant: string): string {
  return plant === ALL ? ALL_PLANTS_ID : plant
}

export type Tone = 'good' | 'bad' | 'neutral'

/** Colour a change against the catalog direction. neutral is never good or bad; no change is neutral. */
export function toneFor(direction: Direction, change: number | null | undefined): Tone {
  if (change === null || change === undefined || change === 0 || direction === 'neutral') return 'neutral'
  if (direction === 'lower_is_better') return change < 0 ? 'good' : 'bad'
  return change > 0 ? 'good' : 'bad'
}

export type MonthMap = Map<string, number>

/** month -> value for one KPI and one plant id (ALL_PLANTS for the portfolio). */
export function kpiSeries(rows: KpiRow[], code: string, plantId: string): MonthMap {
  const m: MonthMap = new Map()
  for (const r of rows) if (r.kpiCode === code && r.plantId === plantId) m.set(r.month, r.value)
  return m
}

export function kpiMonths(rows: KpiRow[]): string[] {
  return [...new Set(rows.map((r) => r.month))].sort()
}

export interface KpiSummary {
  code: string
  entry: KpiCatalogEntry
  month: string | null // month the latest value belongs to
  value: number | null
  prior: number | null
  yearAgo: number | null
  momChange: number | null // absolute change vs prior month
  momPct: number | null
  yoyChange: number | null
  yoyPct: number | null
  momTone: Tone
  yoyTone: Tone
  trend: { month: string; value: number }[]
}

const pct = (cur: number, base: number | null): number | null => (base === null || base === 0 ? null : ((cur - base) / Math.abs(base)) * 100)

/**
 * Latest value, change versus the prior month and versus the same month last year.
 * `upTo` caps the latest month (month-range filter); `from` trims the trend only.
 */
export function summarizeKpi(rows: KpiRow[], entry: KpiCatalogEntry, plant: string, upTo = '', from = ''): KpiSummary {
  const series = kpiSeries(rows, entry.code, kpiPlantId(plant))
  const months = [...series.keys()].filter((m) => !upTo || m <= upTo).sort()
  const month = months.length ? months[months.length - 1] : null
  const value = month ? series.get(month) ?? null : null
  const prior = month ? series.get(shiftMonth(month, -1)) ?? null : null
  const yearAgo = month ? series.get(shiftMonth(month, -12)) ?? null : null
  const mom = value !== null && prior !== null ? value - prior : null
  const yoy = value !== null && yearAgo !== null ? value - yearAgo : null
  return {
    code: entry.code,
    entry,
    month,
    value,
    prior,
    yearAgo,
    momChange: mom,
    momPct: value !== null ? pct(value, prior) : null,
    yoyChange: yoy,
    yoyPct: value !== null ? pct(value, yearAgo) : null,
    momTone: toneFor(entry.direction, mom),
    yoyTone: toneFor(entry.direction, yoy),
    trend: months.filter((m) => !from || m >= from).map((m) => ({ month: m, value: series.get(m) as number })),
  }
}

export function summarizeAll(rows: KpiRow[], catalog: KpiCatalogEntry[], plant: string, upTo = '', from = ''): KpiSummary[] {
  return catalog.map((c) => summarizeKpi(rows, c, plant, upTo, from))
}

/** KPI codes shown as Overview tiles, in display order. */
export const OVERVIEW_KPIS = [
  'GROSS_INVENTORY_VALUE_INR',
  'NON_MOVING_VALUE_INR',
  'SLOW_MOVING_VALUE_INR',
  'OBSOLETE_VALUE_INR',
  'EXCESS_INVENTORY_VALUE_INR',
  'DAYS_ON_HAND',
  'INVENTORY_TURNOVER_RATIO',
  'CRITICAL_SPARE_AVAILABILITY_PCT',
  'STOCKOUT_MATERIAL_COUNT',
  'UNDERSTOCK_MATERIAL_COUNT',
  'POTENTIAL_INVENTORY_REDUCTION_INR',
  'WORKING_CAPITAL_OPPORTUNITY_INR',
] as const
