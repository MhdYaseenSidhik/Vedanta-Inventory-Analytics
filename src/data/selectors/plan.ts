import type { PlanActualRow } from '../types'
import { ALL } from '../types'
import { inRange, type Filters } from '../filters'

export function filterPlan(rows: PlanActualRow[], f: Filters): PlanActualRow[] {
  return rows.filter(
    (r) =>
      (f.plant === ALL || r.plantId === f.plant) &&
      (!f.type || r.materialType === f.type) &&
      (!f.group || r.materialGroup === f.group) &&
      inRange(r.month, f.from, f.to),
  )
}

export interface PlanTotals { key: string; planValueInr: number; actualPoValueInr: number; actualGrValueInr: number; varianceInr: number; variancePct: number | null }

/** variancePct is null when plan is 0 (never shown as 0). */
export function withPct(t: Omit<PlanTotals, 'variancePct'>): PlanTotals {
  return { ...t, variancePct: t.planValueInr === 0 ? null : (t.varianceInr / t.planValueInr) * 100 }
}

export type PlanDim = 'month' | 'plantId' | 'materialGroup' | 'materialType'

export function groupPlan(rows: PlanActualRow[], dim: PlanDim): PlanTotals[] {
  const m = new Map<string, Omit<PlanTotals, 'variancePct'>>()
  for (const r of rows) {
    const k = r[dim]
    const t = m.get(k) ?? { key: k, planValueInr: 0, actualPoValueInr: 0, actualGrValueInr: 0, varianceInr: 0 }
    t.planValueInr += r.planValueInr
    t.actualPoValueInr += r.actualPoValueInr
    t.actualGrValueInr += r.actualGrValueInr
    t.varianceInr += r.varianceInr
    m.set(k, t)
  }
  const out = [...m.values()].map(withPct)
  return dim === 'month' ? out.sort((a, b) => a.key.localeCompare(b.key)) : out.sort((a, b) => b.planValueInr - a.planValueInr)
}

export function totalPlan(rows: PlanActualRow[]): PlanTotals {
  const t = rows.reduce(
    (s, r) => ({ key: 'total', planValueInr: s.planValueInr + r.planValueInr, actualPoValueInr: s.actualPoValueInr + r.actualPoValueInr, actualGrValueInr: s.actualGrValueInr + r.actualGrValueInr, varianceInr: s.varianceInr + r.varianceInr }),
    { key: 'total', planValueInr: 0, actualPoValueInr: 0, actualGrValueInr: 0, varianceInr: 0 },
  )
  return withPct(t)
}
